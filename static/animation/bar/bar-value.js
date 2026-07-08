/**
 * 等待容器中所有图片加载完成
 * @param {HTMLElement} container
 * @returns {Promise}
 */
function waitImagesLoaded(container) {
    const imgs = Array.from(container.querySelectorAll("img"));
    return Promise.all(
        imgs.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => (img.onload = img.onerror = resolve));
        })
    );
}

/**
 * 解析 segmentation 数据为 SVG 路径
 * 格式: [[[x1, y1], [x2, y2], ...]]
 * 返回相对于元素左上角的路径坐标
 */
function parseSegmentationToPath(segmentation) {
    try {
        const points = JSON.parse(segmentation);
        if (!points || !points[0]) return null;
        const coords = points[0];
        if (coords.length < 3) return null;

        const originX = coords[0][0];
        const originY = coords[0][1];

        const pathParts = [`M0 0`];
        for (let i = 1; i < coords.length; i++) {
            pathParts.push(`L${coords[i][0] - originX} ${coords[i][1] - originY}`);
        }
        pathParts.push('Z');
        return pathParts.join(' ');
    } catch (e) {
        console.warn('解析 segmentation 失败:', e);
        return null;
    }
}

/**
 * 创建 SVG 向下箭头（尖端对齐元素上边框外侧）
 * viewBox="0 0 36 30"，尖端在 y=30，SVG top 即对齐元素上边缘
 */
function createSvgArrow(color = "#ffcc00", width = 36, height = 30) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", "0 0 36 30");
    svg.style.overflow = "visible";

    // 箭头 path：尖端在底部 (18, 30)，顶边在 y=0
    const arrowPath = document.createElementNS(svgNS, "path");
    arrowPath.setAttribute("d", "M3 0 L33 0 L33 18 L18 30 L3 18 Z");
    arrowPath.setAttribute("fill", color);
    arrowPath.setAttribute("stroke", "#ffffff");
    arrowPath.setAttribute("stroke-width", 2);
    arrowPath.setAttribute("stroke-linejoin", "round");
    svg.appendChild(arrowPath);

    return svg;
}

/**
 * Value1 动画逻辑：SVG 小箭头落在 data_graphic 上边缘
 */
function Value1(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    return waitImagesLoaded(canvas).then(() => {
        const allElements = Array.from(canvas.querySelectorAll(".element"));
        if (!allElements.length) return console.warn("canvas 内未找到任何 .element 元素");

        const masterTimeline = gsap.timeline();

        groupIds.forEach(groupId => {
            const groupEls = allElements.filter(el => el.dataset.group === groupId);
            if (!groupEls.length) return;

            // 找到 data_graphic 元素
            const glyph = groupEls.find(el => el.dataset.type === "data_graphic") || groupEls[0];
            if (!glyph) return;

            const rect = glyph.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const boxCenterX = rect.left - canvasRect.left + rect.width / 2;
            const boxTop = rect.top - canvasRect.top;

            // 创建小箭头（宽36，高30），尖端对齐元素上边框外侧
            const arrow = createSvgArrow("#ffcc00", 36, 30);
            Object.assign(arrow.style, {
                position: "absolute",
                left: boxCenterX + "px",
                top: (boxTop - 30) + "px",  // 箭头顶端(boxTop-30+30)对齐元素上边缘
                transform: "translateX(-50%)",
                opacity: "0",
                pointerEvents: "none",
                zIndex: "9999",
                filter: "drop-shadow(0 0 8px #ffcc00)"
            });
            canvas.appendChild(arrow);

            const tl = gsap.timeline();

            // 箭头：渐显 → 保持 → 淡出 → 循环
            tl.to(arrow, { opacity: 1, duration: 0.4 });                                      // 渐显
            tl.to({}, { duration: 0.6 });                                                    // 保持可见
            tl.to(glyph, { scale: 1.06, duration: 0.3, ease: "power2.out" }, "<");          // 元素轻微放大
            tl.to(arrow, { opacity: 0, duration: 0.5 });                                      // 淡出
            tl.to(glyph, { scale: 1, duration: 0.3 }, "<");                                   // 元素恢复

            // 无限循环
            tl.repeat(2);

            masterTimeline.add(tl);
        });

        window._currentMasterTimeline = masterTimeline;
        return masterTimeline;
    });
}

/**
 * Value2 动画逻辑：其他组透明 + data_graphic 粗虚线轮廓 + 文本渐入
 */
function Value2(canvasId = "canvas", groupIds = [], options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    return waitImagesLoaded(canvas).then(() => {
        const allElements = Array.from(canvas.querySelectorAll(".element"));
        if (!allElements.length) return console.warn("canvas 内未找到任何 .element 元素");

        const masterTimeline = gsap.timeline();
        const strokeColor = options.strokeColor || "#ffcc00";
        const textDuration = options.textDuration || 0.8;
        const flyFrom = options.flyFrom || "top";
        const distance = options.distance || 50;
        const svgNS = "http://www.w3.org/2000/svg";

        groupIds.forEach(targetGroupId => {
            const targetGroupEls = allElements.filter(el => el.dataset.group === targetGroupId);
            if (!targetGroupEls.length) return;

            // 目标组的 data_graphic
            const glyph = targetGroupEls.find(el => el.dataset.type === "data_graphic") || targetGroupEls[0];
            // 目标组的文本
            const textElement = targetGroupEls.find(el => el.dataset.type === "text") || null;
            if (!glyph) return;

            const rect = glyph.getBoundingClientRect();

            // ========== 1. 其他组变透明 ==========
            const otherEls = allElements.filter(el => el.dataset.group !== targetGroupId);
            otherEls.forEach(el => {
                gsap.to(el, { opacity: 0.2, duration: 0.6 });
            });

            // ========== 2. data_graphic 的虚线真实轮廓 ==========
            const segmentation = glyph.dataset.segmentation;
            let d = parseSegmentationToPath(segmentation);

            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("width", rect.width);
            svg.setAttribute("height", rect.height);
            Object.assign(svg.style, {
                position: "absolute",
                top: "0",
                left: "0",
                pointerEvents: "none",
                zIndex: "9999",
                overflow: "visible"
            });

            let pathEl;
            if (d) {
                pathEl = document.createElementNS(svgNS, "path");
                pathEl.setAttribute("d", d);
            } else {
                d = `M0 0 L${rect.width} 0 L${rect.width} ${rect.height} L0 ${rect.height} Z`;
                pathEl = document.createElementNS(svgNS, "path");
                pathEl.setAttribute("d", d);
            }
            pathEl.setAttribute("fill", "none");
            pathEl.setAttribute("stroke", strokeColor);
            pathEl.setAttribute("stroke-width", 6);     // 加粗轮廓
            pathEl.setAttribute("stroke-dasharray", "12 6");  // 虚线加大
            pathEl.setAttribute("stroke-linecap", "round");
            pathEl.setAttribute("stroke-linejoin", "round");
            gsap.set(pathEl, { opacity: 0 });
            svg.appendChild(pathEl);

            if (window.getComputedStyle(glyph).position === "static") glyph.style.position = "relative";
            glyph.appendChild(svg);

            // ========== 3. 虚线轮廓渐显（放慢）==========
            const tl = gsap.timeline();
            tl.to(pathEl, { opacity: 1, duration: 0.8 });  // 轮廓先出现

            // ========== 4. 文本从指定方向渐入（staggering，轮廓之后）==========
            if (textElement) {
                let fromVars = { opacity: 0 };
                if (flyFrom === "top") fromVars.y = -distance;
                else if (flyFrom === "bottom") fromVars.y = distance;
                else if (flyFrom === "left") fromVars.x = -distance;
                else if (flyFrom === "right") fromVars.x = distance;

                tl.fromTo(
                    textElement,
                    fromVars,
                    { opacity: 1, x: 0, y: 0, duration: textDuration, ease: "power2.out" },
                    "+=0.2"   // staggering：等轮廓出现后 0.2s 再开始
                );
            }

            // ========== 5. 无限循环 ==========
            tl.repeat(2);

            masterTimeline.add(tl);
        });

        window._currentMasterTimeline = masterTimeline;
        return masterTimeline;
    });
}

/**
 * 随机运行 Value 动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    // 切换前先销毁旧动画
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    const animationOptions = ["Value1", "Value2"];
    const animationType = animationOptions[Math.floor(Math.random() * animationOptions.length)];
    console.log(`随机选择动画类型: ${animationType}`);

    let timelinePromise;
    switch (animationType) {
        case "Value1":
            timelinePromise = Value1(canvasId, groupIds);
            break;
        case "Value2":
            timelinePromise = Value2(canvasId, groupIds);
            break;
    }

    if (timelinePromise) {
        timelinePromise.then(tl => { if (tl && tl.play) tl.play(); });
    }
}

// 全局挂载（函数名大写 V 匹配 xlsx 模板）
window.waitImagesLoaded = waitImagesLoaded;
window.Value1 = Value1;
window.Value2 = Value2;
window.runAnimation = runAnimation;

/**
 * 销毁当前动画（切换动画时调用）
 * 停掉当前 masterTimeline，清除动态创建的 SVG 箭头/轮廓等元素
 */
window.destroyCurrentAnimation = function(canvasId = "canvas") {
    // 杀死之前存储的 masterTimeline
    if (window._currentMasterTimeline) {
        window._currentMasterTimeline.kill();
        window._currentMasterTimeline = null;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // 停掉并杀死 canvas 上所有 GSAP tweens
    if (typeof gsap !== "undefined") {
        const allEls = canvas.querySelectorAll('.element, [data-group], svg, path, img, div');
        allEls.forEach(el => {
            gsap.getTweensOf(el).forEach(tween => tween.kill());
        });
    }

    // 移除动态创建的 SVG（箭头/虚线轮廓等）
    canvas.querySelectorAll('svg').forEach(svg => svg.remove());
};

document.addEventListener("DOMContentLoaded", () => {
    runAnimation("canvas", ["G1"]);
});
