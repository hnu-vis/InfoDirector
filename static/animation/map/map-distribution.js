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

// ==========================================
// 1. 扫描分布动画 (distribution1)
// ==========================================
async function distribution1(canvasId = "canvas", groupIds = [], options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    await waitImagesLoaded(canvas);

    // 清理旧扫描线和效果
    canvas.querySelectorAll(".scan-line, .ripple-effect, .highlight-layer").forEach(el => el.remove());

    const { scanDuration = 6, strokeColor = "rgba(255, 215, 0, 0.8)", rippleMaxScale = 2.0 } = options;

    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;

    // 创建扫描线
    const scanLine = document.createElement("div");
    scanLine.classList.add("scan-line");
    Object.assign(scanLine.style, {
        position: "absolute",
        top: "0px",
        left: "0px",
        width: "4px",
        height: `${canvasHeight}px`,
        background: "linear-gradient(to bottom, rgba(0,255,234,0), rgba(0,255,234,1) 50%, rgba(0,255,234,0))",
        boxShadow: "0 0 10px rgba(0,255,234,0.8)",
        zIndex: 9999,
        pointerEvents: "none",
    });
    canvas.appendChild(scanLine);

    const triggeredElements = new Set();
    const velocity = canvasWidth / scanDuration;

    // 创建 timeline
    const tl = gsap.timeline({
        onComplete: () => {
            // 清理所有效果元素
            canvas.querySelectorAll(".scan-line, .ripple-effect, .highlight-layer").forEach(el => el.remove());
        }
    });

    tl.to(scanLine.style, {
        left: canvasWidth + "px",
        duration: scanDuration,
        ease: "linear",
        onUpdate: () => {
            const lineX = parseFloat(scanLine.style.left);

            groupIds.forEach(groupId => {
                const targets = canvas.querySelectorAll(`.element[data-type="data_graphic"][data-group="${groupId}"]`);

                targets.forEach(el => {
                    if (triggeredElements.has(el)) return;

                    const elLeft = el.offsetLeft;

                    if (lineX >= elLeft) {
                        triggeredElements.add(el);
                        createProgressiveHighlight(el, canvas, velocity, strokeColor);
                        createShockwaveRipple(el, canvas, rippleMaxScale, strokeColor);
                    }
                });
            });
        }
    });

    window._currentMasterTimeline = tl;
    return tl;
}

function createProgressiveHighlight(targetEl, canvas, velocity, highlightColor) {
    const img = targetEl.querySelector("img");
    if (!img) return;

    const elLeft = targetEl.offsetLeft;
    const elTop = targetEl.offsetTop;
    const elWidth = targetEl.offsetWidth;
    const elHeight = targetEl.offsetHeight;

    const highlightClone = img.cloneNode(true);
    highlightClone.classList.add("highlight-layer");

    Object.assign(highlightClone.style, {
        position: "absolute",
        left: elLeft + "px",
        top: elTop + "px",
        width: elWidth + "px",
        height: elHeight + "px",
        zIndex: 10,
        pointerEvents: "none",
        filter: `brightness(1.5) drop-shadow(0 0 5px ${highlightColor}) sepia(0.3)`,
        clipPath: "inset(0px 100% 0px 0px)"
    });

    canvas.appendChild(highlightClone);

    const revealDuration = elWidth / velocity;

    gsap.to(highlightClone.style, {
        clipPath: "inset(0px 0% 0px 0px)",
        duration: revealDuration,
        ease: "linear",
        onComplete: () => {
            gsap.to(highlightClone, { opacity: 0, duration: 1, delay: 0.5, onComplete: () => highlightClone.remove() });
        }
    });
}

function createShockwaveRipple(targetEl, canvas, maxScale, color) {
    const elWidth = targetEl.offsetWidth;
    const elHeight = targetEl.offsetHeight;
    const elLeft = targetEl.offsetLeft;
    const elTop = targetEl.offsetTop;

    const centerX = elLeft + elWidth / 2;
    const centerY = elTop + elHeight / 2;
    const baseSize = Math.max(elWidth, elHeight) * 0.6;

    for (let i = 0; i < 2; i++) {
        const ripple = document.createElement("div");
        ripple.classList.add("ripple-effect");

        Object.assign(ripple.style, {
            position: "absolute",
            left: (centerX - baseSize / 2) + "px",
            top: (centerY - baseSize / 2) + "px",
            width: baseSize + "px",
            height: baseSize + "px",
            borderRadius: "50%",
            border: `2px solid ${color}`,
            boxShadow: `0 0 15px ${color}, inset 0 0 10px ${color}`,
            background: "transparent",
            zIndex: 9996,
            pointerEvents: "none",
            opacity: 1,
            transform: "scale(0)"
        });

        canvas.appendChild(ripple);

        gsap.to(ripple, {
            scale: maxScale,
            opacity: 0,
            repeat: -1,
            duration: 1.5,
            delay: i * 0.3,
            ease: "power2.out",
            onComplete: () => ripple.remove()
        });
    }
}

// ==========================================
// 2. 镜头聚焦圆圈 (distribution2)
// ==========================================
async function distribution2(canvasId = "canvas", groupIds = [], options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn("Canvas not found");
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    await waitImagesLoaded(canvas);

    const { zoomScale = 1.8, zoomDuration = 1.2 } = options;

    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // 清理旧元素
    canvas.querySelectorAll(".scan-line, .ripple-effect, .highlight-layer, .camera-layer").forEach(el => el.remove());

    const camera = document.createElement("div");
    camera.classList.add("camera-layer");
    Object.assign(camera.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        transformOrigin: `${centerX}px ${centerY}px`
    });
    canvas.appendChild(camera);

    const allChildren = Array.from(canvas.children).filter(c => c !== camera);
    allChildren.forEach(el => camera.appendChild(el));

    gsap.set(camera, { scale: zoomScale });

    // 创建 timeline
    const tl = gsap.timeline({
        onComplete: () => {
            // 延迟清理，让圆圈显示一会儿
            setTimeout(() => {
                // 恢复：将所有元素移回 canvas
                Array.from(camera.children).forEach(el => canvas.appendChild(el));
                camera.remove();
                gsap.set(canvas, { scale: 1 });
                // 清理圆圈
                canvas.querySelectorAll(".circle-layer").forEach(el => el.remove());
            }, 3000);
        }
    });

    tl.to(camera, {
        scale: 1,
        duration: zoomDuration,
        ease: "power2.out",
        onComplete: () => {
            createCircles(camera, groupIds, centerX, centerY);
        }
    });

    window._currentMasterTimeline = tl;
    return tl;
}

function createCircles(camera, groupIds, centerX, centerY) {
    const groupAreas = [];

    groupIds.forEach(groupId => {
        const targets = camera.querySelectorAll(`.element[data-type="data_graphic"][data-group="${groupId}"]`);
        if (!targets.length) return;

        let totalArea = 0;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        targets.forEach(el => {
            const seg = el.dataset.segmentation;
            if (seg) {
                try {
                    const points = JSON.parse(seg);
                    if (points.length > 2) {
                        let area = 0;
                        for (let i = 0; i < points.length; i++) {
                            const [x1, y1] = points[i];
                            const [x2, y2] = points[(i + 1) % points.length];
                            area += x1 * y2 - x2 * y1;
                        }
                        totalArea += Math.abs(area / 2);
                    }
                } catch (e) {
                    console.warn("Segmentation parse error:", e);
                }
            }

            // 用 offsetLeft/offsetTop 保持一致
            const elLeft = el.offsetLeft;
            const elTop = el.offsetTop;
            const elWidth = el.offsetWidth;
            const elHeight = el.offsetHeight;
            minX = Math.min(minX, elLeft);
            minY = Math.min(minY, elTop);
            maxX = Math.max(maxX, elLeft + elWidth);
            maxY = Math.max(maxY, elTop + elHeight);
        });

        groupAreas.push({ groupId, totalArea, minX, minY, maxX, maxY, targets });
    });

    if (!groupAreas.length) return;

    const areas = groupAreas.map(g => g.totalArea);
    const minArea = Math.min(...areas);
    const maxArea = Math.max(...areas);
    const minRadius = 30;
    const maxRadius = 80;

    groupAreas.forEach(({ totalArea, minX, minY, maxX, maxY, targets }) => {
        const circleX = (minX + maxX) / 2 || centerX;
        const circleY = (minY + maxY) / 2 || centerY;

        let radius = minRadius;
        if (maxArea > minArea) {
            radius = minRadius + (totalArea - minArea) / (maxArea - minArea) * (maxRadius - minRadius);
        }

        const circle = document.createElement("div");
        circle.classList.add("circle-layer");
        Object.assign(circle.style, {
            position: "absolute",
            left: `${circleX - radius}px`,
            top: `${circleY - radius}px`,
            width: `${2 * radius}px`,
            height: `${2 * radius}px`,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, rgba(255,0,0,0.6), rgba(200,0,0,0.3))",
            boxShadow: "0 0 15px rgba(255,0,0,0.7), 0 0 30px rgba(255,0,0,0.5)",
            pointerEvents: "none",
            zIndex: 9999
        });

        camera.appendChild(circle);

        gsap.from(circle, { scale: 0, opacity: 0, duration: 0.6, ease: "back.out(1.7)" });

        targets.forEach((el, idx) => {
            gsap.from(el, {
                scale: 0,
                opacity: 0,
                duration: 0.5,
                delay: 0.2 + idx * 0.15,
                ease: "back.out(1.7)"
            });
        });
    });
}

// ==========================================
// 3. 图标分发 (distribution3)
// ==========================================
async function distribution3(canvasId = "canvas", groupIds = [], options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn("Canvas not found");
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    await waitImagesLoaded(canvas);

    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // 清理旧元素
    canvas.querySelectorAll(".scan-line, .ripple-effect, .highlight-layer, .camera-layer").forEach(el => el.remove());

    const camera = document.createElement("div");
    camera.classList.add("camera-layer");
    Object.assign(camera.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        transformOrigin: `${centerX}px ${centerY}px`
    });
    canvas.appendChild(camera);

    const allChildren = Array.from(canvas.children).filter(c => c !== camera);
    allChildren.forEach(el => camera.appendChild(el));

    gsap.set(camera, { filter: "blur(8px)" });

    // 创建 timeline
    const tl = gsap.timeline({
        onComplete: () => {
            // 延迟清理，让图标显示一会儿
            setTimeout(() => {
                // 恢复：将所有元素移回 canvas
                Array.from(camera.children).forEach(el => canvas.appendChild(el));
                camera.remove();
                gsap.set(canvas, { scale: 1, filter: "none" });
                // 清理图标
                canvas.querySelectorAll(".icon-layer").forEach(el => el.remove());
            }, 3000);
        }
    });

    // 初始图标
    const icon = document.createElement("img");
    icon.classList.add("icon-layer");
    icon.src = "../icon/reddot.png";
    Object.assign(icon.style, {
        position: "absolute",
        left: `${centerX - 100}px`,
        top: `${centerY - 100}px`,
        width: "200px",
        height: "200px",
        zIndex: 10000,
        pointerEvents: "none"
    });
    camera.appendChild(icon);

    tl.from(icon, { scale: 1.5, opacity: 0, duration: 1, ease: "back.out(1.7)", onComplete: moveIconToFirstGroup });

    function moveIconToFirstGroup() {
        if (!groupIds.length) return;

        const firstGroupEl = camera.querySelector(`.element[data-group="${groupIds[0]}"]`);
        if (!firstGroupEl) return;

        const elLeft = firstGroupEl.offsetLeft;
        const elTop = firstGroupEl.offsetTop;
        const elWidth = firstGroupEl.offsetWidth;
        const elHeight = firstGroupEl.offsetHeight;
        const targetX = elLeft + elWidth / 2 - 25;
        const targetY = elTop + elHeight / 2 - 25;

        gsap.to(camera, { filter: "blur(0px)", duration: 1, ease: "power2.out" });
        gsap.to(icon, {
            width: 50,
            height: 50,
            left: targetX,
            top: targetY,
            duration: 1.2,
            ease: "power2.inOut",
            onComplete: () => {
                groupIds.slice(1).forEach((groupId, idx) => {
                    const groupEl = camera.querySelector(`.element[data-group="${groupId}"]`);
                    if (!groupEl) return;

                    const clone = icon.cloneNode();
                    clone.classList.add("icon-layer");
                    clone.style.position = "absolute";
                    clone.style.width = "50px";
                    clone.style.height = "50px";
                    clone.style.left = `${groupEl.offsetLeft + groupEl.offsetWidth / 2 - 25}px`;
                    clone.style.top = `${groupEl.offsetTop + groupEl.offsetHeight / 2 - 25}px`;
                    clone.style.opacity = 0;
                    clone.style.pointerEvents = "none";
                    camera.appendChild(clone);

                    gsap.to(clone, {
                        opacity: 1,
                        scale: 1,
                        duration: 0.6,
                        delay: idx * 0.15,
                        ease: "back.out(1.7)"
                    });
                });
            }
        });
    }

    window._currentMasterTimeline = tl;
    return tl;
}

// 挂载
window.distribution1 = distribution1;
window.distribution2 = distribution2;
window.distribution3 = distribution3;
window.waitImagesLoaded = waitImagesLoaded;

// 测试
window.addEventListener("load", () => {
    distribution1("canvas", ["G1", "G2", "G3"]);
});

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    const animations = [distribution1, distribution2, distribution3];
    const fn = animations[Math.floor(Math.random() * animations.length)];
    fn(canvasId, groupIds);
}

window.runAnimation = runAnimation;
