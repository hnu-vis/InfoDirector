function categorzation1(canvasId = "canvas", groupIds = []) {
    if (!groupIds || !groupIds.length) return console.warn("请传入组 ID 数组");

    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const allElements = canvas.querySelectorAll(".element[data-group]");

    // 找到目标组元素
    const targetElements = Array.from(allElements).filter(el => groupIds.includes(el.dataset.group));
    if (!targetElements.length) return console.warn(`未找到传入组的元素`);

    // 其他组元素
    const others = Array.from(allElements).filter(el => !groupIds.includes(el.dataset.group));

    // 清除上一次动画样式
    allElements.forEach(el => {
        gsap.set(el, { filter: "none", scale: 1, opacity: 1 });
    });

    const tl = gsap.timeline({ defaults: { ease: "power1.inOut" } });

    // 1️⃣ 虚化其他组元素
    tl.to(others, { filter: "blur(6px)", opacity: 0.3, duration: 0.6 });

    // 2️⃣ 目标组闪光 + 弹跳
    tl.to(targetElements, {
        scale: 1.15,
        filter: "brightness(1.3) drop-shadow(0 0 20px rgba(255,255,255,0.3))",
        duration: 0.25,
        ease: "power1.inOut"
    }, "-=0.2");
    tl.to(targetElements, {
        scale: 1,
        filter: "none",
        duration: 0.25,
        ease: "elastic.out(1, 0.5)"
    }, "-=0.1");

    // 3️⃣ 恢复其他组
    tl.to(others, {
        filter: "none",
        opacity: 1,
        duration: 0.6
    }, "+=0.5");

    // 重复 3 次
    tl.repeat(2);
    tl.repeatDelay(0.8);

    tl.eventCallback("onComplete", () => {
        allElements.forEach(el => {
            gsap.set(el, { filter: "none", scale: 1, opacity: 1 });
        });
    });

    return tl;
}

function categorzation2(canvasId = "canvas", groupIds = []) {
    if (!groupIds || !groupIds.length) return console.warn("请传入组 ID 数组");

    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const allElements = canvas.querySelectorAll(".element[data-group]");

    // 找到目标组元素
    const targetElements = Array.from(allElements).filter(el => groupIds.includes(el.dataset.group));
    if (!targetElements.length) return console.warn(`未找到传入组的元素`);

    // 其他组元素
    const others = Array.from(allElements).filter(el => !groupIds.includes(el.dataset.group));

    // 重置样式
    allElements.forEach(el => {
        gsap.set(el, { opacity: 1, filter: "none", scale: 1 });
    });

    const tl = gsap.timeline();

    // 1️⃣ 其他组透明度降到 0.2
    tl.to(others, { opacity: 0.2, duration: 0.5 });

    // 2️⃣ 目标组高亮
    tl.to(targetElements, {
        filter: "brightness(1.3)",
        scale: 1.05,
        duration: 0.3
    }, "-=0.3");

    // 3️⃣ 恢复所有元素
    tl.to([...others, ...targetElements], {
        opacity: 1,
        filter: "none",
        scale: 1,
        duration: 0.6
    }, "+=0.5");

    // 重复 3 次
    tl.repeat(2);
    tl.repeatDelay(0.8);

    tl.eventCallback("onComplete", () => {
        allElements.forEach(el => {
            gsap.set(el, { opacity: 1, filter: "none", scale: 1 });
        });
    });

    return tl;
}

// 挂载到 window
window.categorzation1 = categorzation1;
window.categorzation2 = categorzation2;

function runAnimation(canvasId = "canvas", groups = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 canvas: ${canvasId}`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    if (!groups || groups.length === 0) {
        groups = [...new Set([...canvas.querySelectorAll(".element[data-group]")].map(el => el.dataset.group))];
    }

    if (groups.length === 0) return console.warn("未找到任何组");

    // 先销毁旧动画
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    // 随机选一个动画
    const modes = [categorzation1, categorzation2];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    console.log(`运行动画: ${mode.name}, 组: ${groups}`);

    return mode(canvasId, groups);
}

window.runAnimation = runAnimation;