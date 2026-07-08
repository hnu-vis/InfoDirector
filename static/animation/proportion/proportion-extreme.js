function extreme1(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const targetGroupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;

    // 清理旧动画
    canvas.querySelectorAll(".enlarge-effect, .mask-layer, .shrink-effect").forEach(el => el.remove());

    const allDataGraphics = canvas.querySelectorAll(`.element[data-type="data_graphic"]`);
    const allVisuals = canvas.querySelectorAll(`.element[data-type="visual"]`);
    const allTexts = canvas.querySelectorAll(`.element[data-type="text"]`);

    // 1️⃣ 放大目标组 data_graphic，缩小其他组
    allDataGraphics.forEach(el => {
        const groupId = el.dataset.group;
        if (groupId === targetGroupId) {
            gsap.set(el, { scale: 0.5, transformOrigin: "center center" });
            gsap.to(el, {
                scale: 1,
                duration: 1.2,
                ease: "power2.out",
            });
        } else {
            gsap.to(el, {
                scale: 0.6,
                duration: 0.6,
                ease: "power2.out",
            });
        }
    });

    // 2️⃣ 隐藏所有非目标组 text & visual
    allVisuals.forEach(el => {
        if (el.dataset.group !== targetGroupId) {
            el.style.display = "none";
        }
    });
    allTexts.forEach(el => {
        if (el.dataset.group !== targetGroupId) {
            el.style.display = "none";
        }
    });

    // 🔹 隐藏目标组 text & visual（确保初始隐藏）
    const targetVisuals = canvas.querySelectorAll(`.element[data-type="visual"][data-group="${targetGroupId}"]`);
    const targetTexts = canvas.querySelectorAll(`.element[data-type="text"][data-group="${targetGroupId}"]`);
    [...targetVisuals, ...targetTexts].forEach(el => {
        el.style.display = "none";
    });

    // 3️⃣ 延迟显示目标组 text & visual，从上方飞入
    gsap.delayedCall(1.3, () => { // data_graphic 放大完成后触发
        [...targetVisuals, ...targetTexts].forEach(el => {
            el.style.display = "block";
            el.classList.add("enlarge-effect");

            gsap.fromTo(el,
                { y: -50, scale: 0.8, opacity: 0, transformOrigin: "center center" },
                { y: 0, scale: 1, opacity: 1, duration: 0.8, ease: "power2.out" }
            );
        });
    });

    console.log(`✅ 高亮动画已开始：突出 Group ${targetGroupId} 从小放大 -> text & visual 飞入`);

    // 动画完成后恢复初始状态
    gsap.delayedCall(3, () => {
        const allDataGraphics = canvas.querySelectorAll(`.element[data-type="data_graphic"]`);
        const allVisuals = canvas.querySelectorAll(`.element[data-type="visual"]`);
        const allTexts = canvas.querySelectorAll(`.element[data-type="text"]`);

        allDataGraphics.forEach(el => {
            el.style.transform = "";
        });
        allVisuals.forEach(el => {
            el.style.display = "";
            el.style.transform = "";
            el.style.opacity = "";
        });
        allTexts.forEach(el => {
            el.style.display = "";
            el.style.transform = "";
            el.style.opacity = "";
        });
    });
}

// 调用示例
// extreme1("G2");
function extreme2(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const targetGroupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    if (!targetGroupId) return console.warn(`未提供 targetGroupId`);

    // 清理旧动画
    canvas.querySelectorAll(".enlarge-effect, .mask-layer, .shrink-effect").forEach(el => el.remove());

    const allDataGraphics = canvas.querySelectorAll(`.element[data-type="data_graphic"]`);
    const allVisuals = canvas.querySelectorAll(`.element[data-type="visual"]`);
    const allTexts = canvas.querySelectorAll(`.element[data-type="text"]`);

    // 获取 target 元素
    const targetVisuals = canvas.querySelectorAll(`.element[data-type="visual"][data-group="${targetGroupId}"]`);
    const targetGraphics = canvas.querySelectorAll(`.element[data-type="data_graphic"][data-group="${targetGroupId}"]`);
    const targetTexts = canvas.querySelectorAll(`.element[data-type="text"][data-group="${targetGroupId}"]`);

    console.log(`targetGroupId: ${targetGroupId}, targetVisuals: ${targetVisuals.length}, targetGraphics: ${targetGraphics.length}`);
    if (!targetVisuals.length) return console.warn(`未找到 targetGroupId=${targetGroupId} 的 visual`);

    // 创建 Timeline
    const tl = gsap.timeline();

    // 1️⃣ 其他组虚化/缩小
    allVisuals.forEach(el => {
        if (el.dataset.group !== targetGroupId) {
            tl.to(el, { opacity: 0.3, scale: 0.6, duration: 0.6, ease: "power2.out" }, 0);
        }
    });
    allDataGraphics.forEach(el => {
        if (el.dataset.group !== targetGroupId) {
            tl.to(el, { opacity: 0.3, scale: 0.6, duration: 0.6, ease: "power2.out" }, 0);
        }
    });
    allTexts.forEach(el => {
        if (el.dataset.group !== targetGroupId) {
            el.style.display = "none";
        }
    });

    // 2️⃣ target visual 在画布中心渐入，然后移回原位
    const canvasCenterX = canvas.offsetWidth / 2;
    const canvasCenterY = canvas.offsetHeight / 2;

    targetVisuals.forEach(el => {
        const elCenterX = el.offsetLeft + el.offsetWidth / 2;
        const elCenterY = el.offsetTop + el.offsetHeight / 2;
        const dx = canvasCenterX - elCenterX;
        const dy = canvasCenterY - elCenterY;

        // 初始状态：在中心位置，透明
        gsap.set(el, { x: dx, y: dy, scale: 1.2, opacity: 0, transformOrigin: "center center" });
        // 中心位置渐显
        tl.to(el, { opacity: 1, duration: 0.5, ease: "power2.out" });
        // 缩小并移回原位
        tl.to(el, { x: 0, y: 0, scale: 1, duration: 0.8, ease: "power2.out" });
    });

    // 3️⃣ data_graphic 渐显
    targetGraphics.forEach(el => {
        gsap.set(el, { scale: 0.5, opacity: 0, transformOrigin: "center center" });
        tl.to(el, { scale: 1, opacity: 1, duration: 1, ease: "power2.out" }, "-=0.5");
    });

    // 5️⃣ text 渐显
    targetTexts.forEach(el => {
        el.style.display = "block";
        tl.fromTo(el,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
        );
    });

    console.log(`✅ 高亮动画已开始：突出 Group ${targetGroupId} -> visual 中心闪烁 -> data_graphic 渐显 -> visual 缩回 -> text 渐显`);

    // 动画完成后恢复初始状态
    gsap.delayedCall(4, () => {
        const allDataGraphics = canvas.querySelectorAll(`.element[data-type="data_graphic"]`);
        const allVisuals = canvas.querySelectorAll(`.element[data-type="visual"]`);
        const allTexts = canvas.querySelectorAll(`.element[data-type="text"]`);

        allDataGraphics.forEach(el => {
            el.style.transform = "";
        });
        allVisuals.forEach(el => {
            el.style.display = "";
            el.style.transform = "";
            el.style.opacity = "";
        });
        allTexts.forEach(el => {
            el.style.display = "";
            el.style.transform = "";
            el.style.opacity = "";
        });
    });
}


window.extreme1 = extreme1;
window.extreme2 = extreme2;
