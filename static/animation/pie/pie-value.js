/* ==========================================================================
   Helper Functions (辅助工具)
   ========================================================================== */

function getGroupElements(canvasId, groupId) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const groupEls = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    if (!groupEls.length) return null;

    const els = Array.from(groupEls);
    return {
        all: els,
        graphic: els.find(el => el.dataset.type === "graphic" || el.dataset.type === "data_graphic"),
        visual: els.find(el => el.dataset.type === "visual"),
        text: els.filter(el => el.dataset.type === "text"),
        canvas: canvas
    };
}

/* ==========================================================================
   Animation 1: Jump Focus (跳跃进入 + 文字闪烁)
   ========================================================================== */
function value1(canvasId = "canvas", groupId) {
    if (!groupId) return console.warn("请传入组 ID");

    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    const targetElements = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    const targetTexts = Array.from(targetElements).filter(el => el.dataset.type === "text");

    if (!canvas || !targetElements.length) return console.warn("未找到 canvas 或目标组元素");

    // 获取 canvas 在视口中的实际位置
    const canvasViewportRect = canvas.getBoundingClientRect();
    const canvasLeft = canvasViewportRect.left;
    const canvasTop = canvasViewportRect.top;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const canvasCenterX = canvasLeft + canvasWidth / 2;
    const canvasCenterY = canvasTop + canvasHeight / 2;

    // 计算目标组包围框（在 canvas 坐标系中的位置）
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    targetElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        minX = Math.min(minX, rect.left - canvasLeft + canvas.scrollLeft);
        minY = Math.min(minY, rect.top - canvasTop + canvas.scrollTop);
        maxX = Math.max(maxX, rect.right - canvasLeft + canvas.scrollLeft);
        maxY = Math.max(maxY, rect.bottom - canvasTop + canvas.scrollTop);
    });

    const groupWidth = maxX - minX;
    const groupHeight = maxY - minY;
    const groupCenterX = (minX + maxX) / 2; // 相对于 canvas 左上角
    const groupCenterY = (minY + maxY) / 2;

    // 计算缩放比例（轻微 zoom in）
    const scaleX = canvasWidth / groupWidth;
    const scaleY = canvasHeight / groupHeight;
    const zoomScale = Math.min(scaleX, scaleY) * 0.5;

    // 设置 transformOrigin 为目标组中心（canvas 坐标系中的像素值）
    // 这样缩放会以目标组为中心
    gsap.set(canvas, { transformOrigin: `${groupCenterX}px ${groupCenterY}px` });

    // 平移量：让目标组中心对齐到 canvas 中心
    const translateX = canvasWidth / 2 - groupCenterX;
    const translateY = canvasHeight / 2 - groupCenterY;

    const tl = gsap.timeline();

    // 1. Zoom in（以目标组为中心缩放，然后平移到 canvas 中心）
    tl.to(canvas, {
        duration: 0.5,
        scale: zoomScale,
        x: translateX,
        y: translateY,
        ease: "power2.out"
    });

    // 2. 文字阴影动画
    if (targetTexts.length) {
        tl.to(targetTexts,
            { filter: "drop-shadow(0 0 20px yellow)", duration: 0.3, yoyo: true, repeat: 1 },
            "-=0.1"
        );
        tl.to(targetTexts, { filter: "none", duration: 0.3 });
    }

    // 3. 等待0.5秒
    tl.to({}, { duration: 0.5 }, "+=0.5");

    // 4. 恢复初始状态
    tl.to(canvas, {
        duration: 0.6,
        scale: 1,
        x: 0,
        y: 0,
        ease: "power2.inOut"
    }, "+=0.5");

    // 重复3次
    tl.repeat(2);

    window._currentMasterTimeline = tl;
    return tl;
}

/* ==========================================================================
   Animation 2: Fade In (灰色底 → 指定组上色 → 循环3次)
   每次循环：所有graphic变灰 → 只有目标组上色 → 等待
   ========================================================================== */
function value2(canvasId = "canvas", groupId) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    if (!groupId) return console.warn("请传入组 ID");

    // 获取当前组和其他组的所有元素
    const targetGroupEls = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    const allGraphicEls = canvas.querySelectorAll(`.element[data-type="graphic"], .element[data-type="data_graphic"]`);

    // 其他所有组的所有元素（用于变灰）
    const otherGroupEls = canvas.querySelectorAll(`.element[data-group]:not([data-group="${groupId}"])`);

    const targetGroupArr = Array.from(targetGroupEls);
    const visualEl = targetGroupArr.find(el => el.dataset.type === "visual");
    const textEls = targetGroupArr.filter(el => el.dataset.type === "text");
    const graphicEls = targetGroupArr.filter(el => el.dataset.type === "graphic" || el.dataset.type === "data_graphic");

    // 外层 timeline 控制 3 次循环
    const masterTl = gsap.timeline({ repeat: 2 });

    // === 每次循环的内容 ===
    // 1. 先让其他组的所有元素变灰
    otherGroupEls.forEach(el => {
        const img = el.querySelector("img");
        gsap.set(el, { opacity: 0.3 });
        if (img) gsap.set(img, { filter: "grayscale(100%) brightness(60%)" });
    });

    // 2. 目标组 graphic 显示（不上色，保持原样）
    graphicEls.forEach(el => {
        const img = el.querySelector("img");
        gsap.set(el, { opacity: 0 });
        if (img) gsap.set(img, { filter: "grayscale(0%) brightness(100%)" });
    });

    // 3. 目标组 visual 隐藏
    if (visualEl) gsap.set(visualEl, { opacity: 0, scale: 0.2, rotation: 0, transformOrigin: "center center" });
    textEls.forEach(el => gsap.set(el, { opacity: 0, filter: "drop-shadow(0 0 0px yellow)" }));

    const cycleTl = gsap.timeline();

    // 4. 目标组 graphic 渐变出现
    cycleTl.to(graphicEls, {
        opacity: 1,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out"
    }, 0);

    // 5. visual 旋转进入
    if (visualEl) {
        cycleTl.to(visualEl, {
            opacity: 1, scale: 1, rotation: 720, duration: 1.0, ease: "back.out(1.5)",
            onComplete: () => gsap.set(visualEl, { rotation: 0 })
        }, "+=0.1");
    }

    // 6. text 发光渐入
    if (textEls.length) {
        cycleTl.to(textEls, {
            opacity: 1, filter: "drop-shadow(0 0 10px yellow)", duration: 0.8, stagger: 0.15, ease: "power2.out"
        }, "-=0.5");
    }

    // 7. 等待
    cycleTl.to({}, { duration: 0.8 }, "+=0.5");

    // 8. 目标组渐隐（为下一次循环做准备）
    cycleTl.to(graphicEls, { opacity: 0, duration: 0.4, ease: "power2.in" }, "+=0.2");
    if (visualEl) cycleTl.to(visualEl, { opacity: 0, scale: 0.2, duration: 0.3 }, "-=0.4");
    if (textEls.length) cycleTl.to(textEls, { opacity: 0, duration: 0.3 }, "-=0.3");

    masterTl.add(cycleTl);

    // 循环结束后：所有元素恢复正常（不上灰色滤镜）
    masterTl.eventCallback("onComplete", () => {
        allGraphicEls.forEach(el => {
            gsap.set(el, { opacity: 1 });
            const img = el.querySelector("img");
            if (img) gsap.set(img, { filter: "none" });
        });
        otherGroupEls.forEach(el => {
            gsap.set(el, { opacity: 1 });
            const img = el.querySelector("img");
            if (img) gsap.set(img, { filter: "none" });
        });
        if (visualEl) gsap.set(visualEl, { opacity: 1, scale: 1, rotation: 0 });
        textEls.forEach(el => gsap.set(el, { opacity: 1, filter: "none" }));
    });

    window._currentMasterTimeline = masterTl;
    return masterTl;
}

/* ==========================================================================
   Animation 3: Line Trace + Visual Float + Text Slide (划线3次)
   逻辑：对同一个组，划线3次，每次 datagraphic 透明→显示，然后完整显示
   ========================================================================== */
function value3(canvasId = "canvas", groupId) {
    const els = getGroupElements(canvasId, groupId);
    if (!els || !els.graphic) return;

    const graphicEl = els.graphic;
    const canvasEl = els.canvas;

    // 计算相对于 Canvas 的位置
    const left = graphicEl.offsetLeft;
    const top = graphicEl.offsetTop;
    const width = graphicEl.offsetWidth;
    const height = graphicEl.offsetHeight;

    // 从 data-segmentation 获取多边形顶点数据
    const segmentationStr = graphicEl.getAttribute('data-segmentation');
    let points = "";
    try {
        const segmentationData = JSON.parse(segmentationStr);
        points = segmentationData[0].map(([x, y]) => `${x - left},${y - top}`).join(" ");
    } catch (e) {
        points = `0,0 ${width},0 ${width},${height} 0,${height}`;
    }

    // 创建 SVG 容器
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    Object.assign(svg.style, {
        position: "absolute",
        left: `${left}px`, top: `${top}px`,
        width: `${width}px`, height: `${height}px`,
        zIndex: 10, pointerEvents: "none", overflow: "visible"
    });

    // 创建不规则路径 - 亮黄色虚线
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M${points}Z`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#FFFF00");
    path.setAttribute("stroke-width", "4");
    svg.appendChild(path);
    canvasEl.appendChild(svg);

    // 获取路径长度
    let pathLength;
    try {
        pathLength = path.getTotalLength();
    } catch (e) {
        pathLength = 2000;
    }
    path.setAttribute("stroke-dasharray", pathLength);
    path.setAttribute("stroke-dashoffset", pathLength);

    // visual 和 text 初始状态（隐藏）
    if (els.visual) gsap.set(els.visual, { autoAlpha: 0, y: 30 });
    if (els.text.length) gsap.set(els.text, { autoAlpha: 0, x: -30 });
    // DataGraphic 初始就显示，不参与动画
    gsap.set(graphicEl, { opacity: 1 });

    // 外层 master timeline，repeat 2 表示循环3次
    const masterTl = gsap.timeline({ repeat: 2 });

    // === 每次循环的内容 ===
    const cycleTl = gsap.timeline();

    // 0. stroke 重置为隐藏
    path.setAttribute("stroke-dashoffset", pathLength);

    // 1. 划线动画：stroke-dashoffset 从 pathLength → 0
    cycleTl.to(path, {
        strokeDashoffset: 0,
        duration: 1.0,
        ease: "power1.inOut"
    }, 0);

    // 2. Visual 上浮
    if (els.visual) {
        cycleTl.to(els.visual, {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            ease: "back.out(1.7)"
        }, "-=0.5");
    }

    // 3. Text 滑入
    if (els.text.length) {
        cycleTl.to(els.text, {
            autoAlpha: 1,
            x: 0,
            duration: 0.4,
            stagger: 0.1,
            ease: "power2.out"
        }, "-=0.3");
    }

    // 4. 等待
    cycleTl.to({}, { duration: 0.6 }, "+=0.3");

    // 5. 隐藏 visual/text 准备下一次（graphic 保持不动）
    if (els.visual) cycleTl.to(els.visual, { autoAlpha: 0, y: 30, duration: 0.25 }, "+=0.2");
    if (els.text.length) cycleTl.to(els.text, { autoAlpha: 0, x: -30, duration: 0.25 }, "-=0.25");

    masterTl.add(cycleTl);

    // === 循环结束后：保持最终完整状态 ===
    // graphic 始终可见，stroke 完整，visual 和 text 也显示
    masterTl.eventCallback("onComplete", () => {
        path.setAttribute("stroke-dashoffset", 0);
        if (els.visual) gsap.set(els.visual, { autoAlpha: 1, y: 0 });
        if (els.text.length) gsap.set(els.text, { autoAlpha: 1, x: 0 });
    });

    window._currentMasterTimeline = masterTl;
    return masterTl;
}

/* ==========================================================================
   Execution
   ========================================================================== */

function runAnimation(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 canvas: ${canvasId}`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    // 如果没有传入 groupIds，则获取所有组
    if (!groupIds || groupIds.length === 0) {
        groupIds = [...new Set([...canvas.querySelectorAll(".element[data-group]")].map(el => el.dataset.group))];
    }

    if (groupIds.length === 0) return console.warn("未找到任何组");

    // 先销毁旧动画，清理所有状态
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    // 随机选一个动画模式
    const modes = [value1, value2, value3];
    const mode = modes[Math.floor(Math.random() * modes.length)];

    // 只对传入的 groupIds（相关组）执行动画
    groupIds.forEach((groupId) => {
        console.log(`运行动画: ${mode.name}, 组: ${groupId}`);
        mode(canvasId, groupId);
    });
}

// 挂载
window.value1 = value1;
window.value2 = value2;
window.value3 = value3;
window.runAnimation = runAnimation;

/**
 * 销毁当前动画（切换动画时调用）
 */
window.destroyCurrentAnimation = function(canvasId = "canvas") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // 1. 停掉 masterTimeline
    if (typeof window._currentMasterTimeline !== "undefined" && window._currentMasterTimeline) {
        window._currentMasterTimeline.kill();
        window._currentMasterTimeline = null;
    }

    // 2. 停掉 canvas 上所有 GSAP tweens
    if (typeof gsap !== "undefined") {
        const allEls = canvas.querySelectorAll('.element, [data-group], svg, path, img, div');
        allEls.forEach(el => {
            gsap.getTweensOf(el).forEach(tween => tween.kill());
        });
    }

    // 3. 移除动态创建的 SVG 元素
    canvas.querySelectorAll('svg').forEach(svg => svg.remove());

    // 4. 恢复所有元素的原始状态
    const allGraphics = canvas.querySelectorAll(`.element[data-type="graphic"], .element[data-type="data_graphic"]`);
    allGraphics.forEach(el => {
        gsap.set(el, { opacity: 1, clipPath: 'none' });
        const img = el.querySelector("img");
        if (img) gsap.set(img, { filter: "none" });
    });

    const allVisuals = canvas.querySelectorAll(`.element[data-type="visual"]`);
    allVisuals.forEach(el => {
        gsap.set(el, { opacity: 1, scale: 1, rotation: 0, filter: "none" });
    });

    const allTexts = canvas.querySelectorAll(`.element[data-type="text"]`);
    allTexts.forEach(el => {
        gsap.set(el, { opacity: 1, filter: "none", x: 0, y: 0 });
    });

    const allGroupEls = canvas.querySelectorAll('.element[data-group]');
    allGroupEls.forEach(el => {
        gsap.set(el, { opacity: 1, scale: 1, rotation: 0, filter: "none", x: 0, y: 0 });
    });

    // 重置 canvas 自身的 transform（value1 会修改 canvas 的 scale/x/y）
    gsap.set(canvas, { scale: 1, x: 0, y: 0, transformOrigin: "0 0" });
};
