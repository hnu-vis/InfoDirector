function rank(canvasId = "canvas", groupIds = [], zoom = 1.8, duration = 1.2, delayBetween = 0.5) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn("Canvas not found");
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    if (groupIds.length === 0) return console.warn("请传入至少一个组");

    const canvasRect = canvas.getBoundingClientRect();
    const canvasCenterX = canvasRect.width / 2;
    const canvasCenterY = canvasRect.height / 2;

    // 收集组元素并计算每组中心
    const groupInfos = groupIds.map(groupId => {
        const els = Array.from(canvas.querySelectorAll(`.element[data-group="${groupId}"]`));
        els.forEach(el => {
            el.style.position = "absolute";
            el.style.zIndex = 9999;
        });

        // 用 getBoundingClientRect 计算组中心（视口绝对坐标）
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        els.forEach(el => {
            const rect = el.getBoundingClientRect();
            minX = Math.min(minX, rect.left);
            minY = Math.min(minY, rect.top);
            maxX = Math.max(maxX, rect.right);
            maxY = Math.max(maxY, rect.bottom);
        });
        const groupCenterX = minX + (maxX - minX) / 2;
        const groupCenterY = minY + (maxY - minY) / 2;

        return { els, groupCenterX, groupCenterY };
    });

    // 创建 timeline
    const tl = gsap.timeline();

    // 先重置 canvas 位置（清除之前的 transform）
    gsap.set(canvas, { x: 0, y: 0, scale: 1 });

    // 依次动画每组
    groupInfos.forEach((info) => {
        // 计算 canvas 中心到组中心的偏移
        const dx = canvasCenterX - info.groupCenterX;
        const dy = canvasCenterY - info.groupCenterY;

        // 平移 + 放大（以 canvas 左上角为 transformOrigin）
        tl.to(canvas, {
            x: dx,
            y: dy,
            scale: zoom,
            transformOrigin: "0 0",
            duration: duration,
            ease: "power2.inOut"
        });

        // 高亮当前组
        info.els.forEach(el => {
            tl.to(el, { boxShadow: "0px 0px 20px #ff0000", duration: 0.3, ease: "power1.inOut" }, "<");
        });

        // 等待一段时间，再清除高亮
        tl.to({}, { duration: delayBetween });
        info.els.forEach(el => {
            tl.to(el, { boxShadow: "none", duration: 0.3 }, "<");
        });
    });

    // 最后恢复画布
    tl.to(canvas, {
        x: 0,
        y: 0,
        scale: 1,
        transformOrigin: "0 0",
        duration: duration,
        ease: "power2.inOut"
    });
}

// 使用示例
window.addEventListener("load", () => {
    rank("canvas", ["G2", "G3", "G1"], 1.8, 1.2, 0.8);
});

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    rank(canvasId, groupIds, 1.8, 1.2, 0.8);
}

window.rank = rank;
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
    gsap.set(canvas, { x: 0, y: 0, scale: 1 });
};
