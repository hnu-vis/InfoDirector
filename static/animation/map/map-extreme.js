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
 * extreme1: 暗化其他组 + 目标组放大
 */
async function extreme1(canvasId = "canvas", groupIds, options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    await waitImagesLoaded(canvas);

    const gid = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    const groupEls = Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"]`));
    if (!groupEls || !groupEls.length) return console.warn(`未找到 Group ${gid}`);

    const dataGraphic = groupEls.find(el => el.dataset.type === "data_graphic");
    if (!dataGraphic) return console.warn("缺少 data_graphic 元素");

    const { dimBrightness = 0.5, scaleUp = 1.1, zoomDuration = 0.8, holdDuration = 0.6 } = options;

    const tl = gsap.timeline();

    // 备份并重置画布状态
    gsap.set(canvas, { scale: 1, x: 0, y: 0 });

    // 获取所有元素
    const allElements = Array.from(canvas.querySelectorAll(".element, img"));
    const targetSet = new Set();
    groupEls.forEach(el => {
        targetSet.add(el);
        el.querySelectorAll('*').forEach(child => targetSet.add(child));
    });

    // 1️⃣ 暗化其他组（非目标组）
    allElements.forEach(el => {
        if (!targetSet.has(el)) {
            tl.to(el, { filter: `brightness(${dimBrightness})`, duration: zoomDuration * 0.5, ease: "power2.inOut" }, 0);
        }
    });

    // 2️⃣ 放大目标组
    tl.to(groupEls, {
        scale: scaleUp,
        transformOrigin: "center center",
        duration: zoomDuration,
        ease: "power2.inOut"
    }, 0);

    // 保持
    tl.to({}, { duration: holdDuration });

    // 恢复
    tl.to(canvas, { scale: 1, x: 0, y: 0, duration: zoomDuration, ease: "power2.inOut" });
    tl.to(allElements, { filter: "brightness(1)", duration: zoomDuration * 0.3, ease: "power2.out" }, "<");
    tl.to(groupEls, { scale: 1, duration: zoomDuration * 0.3, ease: "power2.out" }, "<");

    tl.repeat(1);

    window._currentMasterTimeline = tl;
    return tl;
}

/**
 * extreme2: Zoom in → 黄光高亮闪烁（放大聚焦 + boxShadow 脉冲）
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

    const { zoomScale = 1.2, zoomDuration = 0.6, blinkTimes = 3, blinkDuration = 0.3, holdDuration = 0.8 } = options;

    // 计算目标组中心和画布中心
    const groupRect = dataGraphic.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const centerX = groupRect.left - canvasRect.left + groupRect.width / 2;
    const centerY = groupRect.top - canvasRect.top + groupRect.height / 2;
    const canvasCenterX = canvasRect.width / 2;
    const canvasCenterY = canvasRect.height / 2;
    const offsetX = (canvasCenterX - centerX) * zoomScale;
    const offsetY = (canvasCenterY - centerY) * zoomScale;

    const tl = gsap.timeline();

    // 重置画布
    gsap.set(canvas, { scale: 1, x: 0, y: 0 });

    // 清理旧 overlay
    canvas.querySelectorAll(".data-fill-overlay").forEach(svg => svg.remove());

    // 1️⃣ Zoom in（先移到中心再放大，防止超出显示区域）
    tl.to(canvas, {
        x: offsetX,
        y: offsetY,
        scale: zoomScale,
        duration: zoomDuration,
        ease: "power3.inOut"
    });

    // ==============================================
    // 🔥 强化高亮闪烁（超强黄光，非常明显）
    // ==============================================
    tl.to(dataGraphic, {
        boxShadow: `0 0 30px #ffda00, 0 0 60px #ffda00, 0 0 90px #ffda00, 0 0 120px #ff0`,
        duration: blinkDuration,
        ease: "power2.out"
    });

    // 强烈反复闪烁（亮度拉满）
    tl.to(dataGraphic, {
        boxShadow: `0 0 15px #ffda00, 0 0 30px #ffda00`,
        duration: blinkDuration,
        ease: "power2.in",
        yoyo: true,
        repeat: blinkTimes * 2 - 1
    });

    // 柔和关闭高光
    tl.to(dataGraphic, {
        boxShadow: "none",
        duration: blinkDuration * 0.5
    });

    tl.to({}, { duration: holdDuration });

    // 3️⃣ Zoom out
    tl.to(canvas, { scale: 1, x: 0, y: 0, duration: zoomDuration, ease: "power3.inOut" });

    tl.repeat(1);

    window._currentMasterTimeline = tl;
    return tl;
}

// 挂到 window
window.waitImagesLoaded = waitImagesLoaded;
window.extreme1 = extreme1;
window.extreme2 = extreme2;

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

    if (typeof gsap !== "undefined") {
        const allEls = canvas.querySelectorAll('.element, [data-group], svg, path, img, div');
        allEls.forEach(el => {
            gsap.getTweensOf(el).forEach(tween => tween.kill());
        });
        gsap.set(canvas, { scale: 1, x: 0, y: 0, clearProps: "all" });
    }

    canvas.querySelectorAll('.data-fill-overlay').forEach(svg => svg.remove());
};

// 测试
window.addEventListener("load", () => {
    extreme2("canvas", ["G2"]);
});

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    const animations = [extreme1, extreme2];
    const fn = animations[Math.floor(Math.random() * animations.length)];
    fn(canvasId, groupIds);
}

window.runAnimation = runAnimation;
