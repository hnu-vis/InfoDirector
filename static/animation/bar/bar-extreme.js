/**
 * 等待容器中所有图片加载完成
 */
function waitImagesLoaded(container) {
    const imgs = Array.from(container.querySelectorAll("img"));
    return Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => img.onload = img.onerror = resolve);
    }));
}

/**
 * extreme1: Zoom in → text bounce（放大聚焦 + 文字弹跳）
 */
async function extreme1(canvasId = "canvas", groupIds, options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    await waitImagesLoaded(canvas);

    const gid = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    const groupEls = Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"]`));
    if (!groupEls || !groupEls.length) return console.warn(`未找到 Group ${gid}`);

    const dataGraphic = groupEls.find(el => el.dataset.type === "data_graphic");
    const textElement = groupEls.find(el => el.dataset.type === "text");
    if (!dataGraphic) return console.warn("缺少 data_graphic 元素");

    const { zoomLevel = 1.4, zoomDuration = 0.6, bounceDuration = 0.35, holdDuration = 0.6 } = options;

    const tl = gsap.timeline();

    // 备份原始状态
    gsap.set(canvas, { scale: 1, x: 0, y: 0 });
    if (textElement) gsap.set(textElement, { scale: 1, opacity: 1 });

    // Zoom in 聚焦
    tl.to(canvas, { scale: zoomLevel, duration: zoomDuration, ease: "power2.inOut" });

    // Text bounce 出现
    if (textElement) {
        tl.fromTo(textElement,
            { scale: 0, opacity: 0 },
            { scale: 1.2, opacity: 1, duration: bounceDuration, ease: "back.out(2)" }
        );
        tl.to(textElement, { scale: 1, duration: bounceDuration * 0.7, ease: "power2.out" });
        tl.to(textElement, { scale: 1.15, duration: bounceDuration * 0.7, ease: "sine.inOut" });
        tl.to(textElement, { scale: 1, duration: bounceDuration * 0.7, ease: "sine.out" });
    }

    // 保持
    tl.to({}, { duration: holdDuration });

    // 恢复消失
    if (textElement) {
        tl.to(textElement, { scale: 0, opacity: 0, duration: 0.3, ease: "power2.in" });
    }
    tl.to(canvas, { scale: 1, x: 0, y: 0, duration: zoomDuration, ease: "power2.inOut" });

    tl.repeat(2);

    window._currentMasterTimeline = tl;
    return tl;
}

/**
 * extreme2: 皇冠 icon 出现在 data_graphic 上边缘，表达极值
 * 皇冠从上方落下 + bounce，data_graphic 轻微放大
 */
async function extreme2(canvasId = "canvas", groupIds, options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    await waitImagesLoaded(canvas);

    const gid = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    const groupEls = Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"]`));
    if (!groupEls || !groupEls.length) return console.warn(`未找到 Group ${gid}`);

    const dataGraphic = groupEls.find(el => el.dataset.type === "data_graphic");
    if (!dataGraphic) return console.warn("缺少 data_graphic 元素");

    const { crownScale = 1.15, crownDuration = 0.5, holdDuration = 0.8 } = options;

    // 皇冠 SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const crownSvg = document.createElementNS(svgNS, "svg");
    crownSvg.setAttribute("width", "48");
    crownSvg.setAttribute("height", "38");
    crownSvg.setAttribute("viewBox", "0 0 48 38");
    Object.assign(crownSvg.style, {
        position: "absolute",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: "9999",
        opacity: "0"
    });

    // 皇冠主体
    const crownPath = document.createElementNS(svgNS, "path");
    crownPath.setAttribute("d", "M4 32 L4 16 L14 23 L24 4 L34 23 L44 16 L44 32 Z");
    crownPath.setAttribute("fill", "#FFD700");
    crownPath.setAttribute("stroke", "#FFA500");
    crownPath.setAttribute("stroke-width", "2");
    crownPath.setAttribute("stroke-linejoin", "round");

    // 皇冠珠子
    [6, 24, 42].forEach(cx => {
        const c = document.createElementNS(svgNS, "circle");
        c.setAttribute("cx", cx);
        c.setAttribute("cy", "12");
        c.setAttribute("r", "3.5");
        c.setAttribute("fill", "#FFD700");
        c.setAttribute("stroke", "#FFA500");
        c.setAttribute("stroke-width", "1.5");
        crownSvg.appendChild(c);
    });

    crownSvg.appendChild(crownPath);

    // 定位皇冠在 data_graphic 上边缘外侧
    const dgRect = dataGraphic.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const crownCenterX = dgRect.left - canvasRect.left + dgRect.width / 2;
    const crownTop = dgRect.top - canvasRect.top - 38; // 皇冠在元素上方

    Object.assign(crownSvg.style, {
        left: crownCenterX + "px",
        top: crownTop + "px",
        transform: "translateX(-50%)"
    });

    canvas.appendChild(crownSvg);

    const tl = gsap.timeline();

    // 皇冠落下 + bounce
    gsap.set(crownSvg, { y: -30, opacity: 0 });
    tl.to(crownSvg, { y: 0, opacity: 1, duration: crownDuration, ease: "back.out(2)" });

    // data_graphic 轻微放大
    tl.to(dataGraphic, { scale: crownScale, duration: crownDuration, ease: "back.out(2)" }, "<");

    // 保持
    tl.to({}, { duration: holdDuration });

    // 恢复并消失
    tl.to(crownSvg, { y: -20, opacity: 0, duration: 0.4, ease: "power2.in" });
    tl.to(dataGraphic, { scale: 1, duration: 0.4, ease: "power2.out" }, "<");

    tl.repeat(2);

    window._currentMasterTimeline = tl;
    return tl;
}

/**
 * 全局随机运行动画
 */
async function runAnimation(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    await waitImagesLoaded(canvas);
    if (!groupIds.length) return console.warn("groupIds 为空");

    const animationOptions = ["extreme1", "extreme2"];
    const animationType = animationOptions[Math.floor(Math.random() * animationOptions.length)];
    const groupId = groupIds[0];
    console.log(`随机选择动画类型: ${animationType}，组ID: ${groupId}`);

    switch (animationType) {
        case "extreme1": extreme1(canvasId, groupId); break;
        case "extreme2": extreme2(canvasId, groupId); break;
    }
}

// 挂到 window
window.waitImagesLoaded = waitImagesLoaded;
window.extreme1 = extreme1;
window.extreme2 = extreme2;
window.runAnimation = runAnimation;

/**
 * 销毁当前动画（切换动画时调用）
 */
window.destroyCurrentAnimation = function(canvasId = "canvas") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (window._currentMasterTimeline) {
        window._currentMasterTimeline.kill();
        window._currentMasterTimeline = null;
    }

    if (typeof gsap !== "undefined") {
        const allEls = canvas.querySelectorAll('.element, [data-group], svg, path, img, div');
        allEls.forEach(el => {
            gsap.getTweensOf(el).forEach(tween => tween.kill());
        });
        gsap.set(canvas, { scale: 1, x: 0, y: 0, clearProps: "all" });
    }

    canvas.querySelectorAll('svg').forEach(svg => svg.remove());
};
