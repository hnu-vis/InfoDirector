//画出隔离框
function difference1(canvasId = "canvas", groupIds = [], color = "red", borderWidth = 3, borderRadius = 4, transition = 0.5) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn(`未找到id为"${canvasId}"的canvas元素`);

    if (!groupIds || !groupIds.length) {
        return console.warn("请提供有效的组ID数组");
    }

    const outlines = [];
    let tl;

    // 精准获取元素计算后的位置和尺寸
    function getElementPosition(el) {
        const computed = window.getComputedStyle(el);
        return {
            left: parseFloat(computed.left),
            top: parseFloat(computed.top),
            width: parseFloat(computed.width),
            height: parseFloat(computed.height)
        };
    }

    function initOutlines() {
        // 清除现有轮廓
        outlines.forEach(outline => outline.remove());
        outlines.length = 0;

        // 创建时间线（仅用于淡入动画）
        tl = gsap.timeline({
            onComplete: () => {
                // 动画完成后延迟清理轮廓
                gsap.delayedCall(2, () => {
                    outlines.forEach(outline => outline.remove());
                });
            }
        });

        groupIds.forEach((groupId, index) => {
            // 找到该组的所有元素
            const groupEls = Array.from(canvas.querySelectorAll('.element'))
                .filter(el => el.dataset.group === groupId);

            if (!groupEls.length) {
                console.warn(`未找到组ID为"${groupId}"的元素`);
                return;
            }

            // 找到组内的data_graphic元素
            const dataGraphic = groupEls.find(el => el.dataset.type === "data_graphic");
            if (!dataGraphic) {
                console.warn(`组"${groupId}"中未找到data_graphic元素`);
                return;
            }

            // 创建轮廓元素
            const outline = document.createElement("div");
            outline.style.boxSizing = "border-box"; // 确保边框不溢出
            outline.style.pointerEvents = "none";
            outline.style.zIndex = "50";

            // 获取精准定位
            const { left, top, width, height } = getElementPosition(dataGraphic);

            // 设置轮廓样式
            Object.assign(outline.style, {
                position: "absolute",
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
                border: `${borderWidth}px solid ${color}`,
                borderRadius: `${borderRadius}px`,
                opacity: 0,
                transform: "scale(0.98)"
            });

            canvas.appendChild(outline);
            outlines.push(outline);

            // 添加淡入动画（无淡出，永久保留）
            tl.to(outline, {
                opacity: 1,
                transform: "scale(1)",
                duration: transition,
                ease: "power2.out"
            }, index * transition * 0.5); // 组间错开动画时间
        });
    }

    // 初始化并自动启动动画
    initOutlines();
    return {timeline: tl};
}


window.difference1 = difference1;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    difference1(canvasId, groupIds);
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
    canvas.querySelectorAll('.element').forEach(el => {
        gsap.set(el, { opacity: 1, scale: 1, filter: "" });
    });
};