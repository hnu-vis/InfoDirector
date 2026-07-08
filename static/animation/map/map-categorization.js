/**
 * 等待图片加载
 */
function waitImagesLoaded(container) {
    const imgs = Array.from(container.querySelectorAll("img"));
    return Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => img.onload = img.onerror = resolve);
    }));
}

/**
 * 解析 segmentation 数据为 SVG 路径（相对于元素左上角）
 * @param {string} segmentation - JSON 字符串
 * @param {number} offsetX - 元素 offsetLeft
 * @param {number} offsetY - 元素 offsetTop
 */
function parseSegmentationToPath(segmentation, offsetX = 0, offsetY = 0) {
    try {
        const points = JSON.parse(segmentation);
        if (!points || !points[0]) return null;
        const coords = points[0];
        if (coords.length < 3) return null;
        const pathParts = [`M${coords[0][0] - offsetX} ${coords[0][1] - offsetY}`];
        for (let i = 1; i < coords.length; i++) {
            pathParts.push(`L${coords[i][0] - offsetX} ${coords[i][1] - offsetY}`);
        }
        pathParts.push("Z");
        return pathParts.join(" ");
    } catch (e) {
        return null;
    }
}

function categorization1(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn("Canvas not found");
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const svgNS = "http://www.w3.org/2000/svg";

    groupIds.forEach(groupId => {
        const elements = canvas.querySelectorAll(`.element[data-group="${groupId}"][data-type="data_graphic"]`);
        elements.forEach(el => {
            const seg = el.dataset.segmentation;
            if (!seg) return;

            // 确保元素有 relative 定位
            if (window.getComputedStyle(el).position === "static") {
                el.style.position = "relative";
            }

            // 创建 SVG 遮罩容器（追加到元素上）
            const svgMask = document.createElementNS(svgNS, "svg");
            svgMask.classList.add('highlight-mask-svg');
            Object.assign(svgMask.style, {
                position: "absolute",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: "25",
                overflow: "visible"
            });

            // 解析 segmentation 路径（相对于元素左上角）
            const d = parseSegmentationToPath(seg, el.offsetLeft, el.offsetTop);
            const maskPath = document.createElementNS(svgNS, "path");
            if (d) {
                maskPath.setAttribute("d", d);
            } else {
                const rect = el.getBoundingClientRect();
                maskPath.setAttribute("d", `M0 0 L${rect.width} 0 L${rect.width} ${rect.height} L0 ${rect.height} Z`);
            }
            maskPath.setAttribute("fill", "rgba(255, 0, 0, 0.3)");
            maskPath.setAttribute("stroke", "rgba(255, 0, 0, 0.6)");
            maskPath.setAttribute("stroke-width", "8");
            maskPath.setAttribute("stroke-linejoin", "round");
            gsap.set(maskPath, { opacity: 0 });
            svgMask.appendChild(maskPath);
            el.appendChild(svgMask);

            // 渐显动画
            gsap.to(maskPath, { opacity: 1, duration: 0.6, ease: "power2.out" });
        });
    });

    const tl = gsap.timeline();
    tl.repeat(1);
    tl.eventCallback("onComplete", () => {
        gsap.delayedCall(2, () => {
            canvas.querySelectorAll('.highlight-mask-svg').forEach(el => el.remove());
        });
    });
    window._currentMasterTimeline = tl;
    return tl;
}




function categorization2(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn("Canvas not found");
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const svgNS = "http://www.w3.org/2000/svg";

    groupIds.forEach(groupId => {
        const dataEls = canvas.querySelectorAll(`.element[data-group="${groupId}"][data-type="data_graphic"]`);
        const visualEls = canvas.querySelectorAll(`.element[data-group="${groupId}"][data-type="visual"]`);

        dataEls.forEach(el => {
            const seg = el.dataset.segmentation;
            if (!seg) return;

            // 确保元素有 relative 定位
            if (window.getComputedStyle(el).position === "static") {
                el.style.position = "relative";
            }

            // 创建 SVG 遮罩容器（追加到元素上）
            const svgMask = document.createElementNS(svgNS, "svg");
            svgMask.classList.add('highlight-mask-svg');
            Object.assign(svgMask.style, {
                position: "absolute",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: "25",
                overflow: "visible"
            });

            // 解析 segmentation 路径（相对于元素左上角）
            const d = parseSegmentationToPath(seg, el.offsetLeft, el.offsetTop);
            const maskPath = document.createElementNS(svgNS, "path");
            if (d) {
                maskPath.setAttribute("d", d);
            } else {
                const rect = el.getBoundingClientRect();
                maskPath.setAttribute("d", `M0 0 L${rect.width} 0 L${rect.width} ${rect.height} L0 ${rect.height} Z`);
            }
            maskPath.setAttribute("fill", "rgba(255, 230, 0, 0.66)");
            maskPath.setAttribute("stroke", "#ffcc00");
            maskPath.setAttribute("stroke-width", "3");
            maskPath.setAttribute("stroke-linejoin", "round");
            gsap.set(maskPath, { opacity: 0 });
            svgMask.appendChild(maskPath);
            el.appendChild(svgMask);

            // 闪烁动画（黄光持续久一点）
            gsap.fromTo(maskPath,
                { opacity: 0 },
                { opacity: 1, duration: 0.4, yoyo: true, repeat: 2 }
            );
        });

        // visual 脉冲
        visualEls.forEach(ve => {
            gsap.fromTo(ve,
                { scale: 1 },
                { scale: 1.2, duration: 0.3, yoyo: true, repeat: 1, ease: "power1.inOut" }
            );
        });
    });

    const tl = gsap.timeline();
    tl.repeat(1);
    tl.eventCallback("onComplete", () => {
        gsap.delayedCall(2, () => {
            canvas.querySelectorAll('.highlight-mask-svg').forEach(el => el.remove());
        });
    });
    window._currentMasterTimeline = tl;
    return tl;
}


// 导出
window.categorization1 = categorization1;
window.categorization2 = categorization2;
window.waitImagesLoaded = waitImagesLoaded;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    const animations = [categorization1, categorization2];
    const fn = animations[Math.floor(Math.random() * animations.length)];
    fn(canvasId, groupIds);
}

window.runAnimation = runAnimation;

/**
 * 销毁当前动画
 */
window.destroyCurrentAnimation = function(canvasId = "canvas") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (window._currentMasterTimeline) {
        window._currentMasterTimeline.kill();
        window._currentMasterTimeline = null;
    }
    canvas.querySelectorAll('.highlight-mask-svg').forEach(el => el.remove());
};