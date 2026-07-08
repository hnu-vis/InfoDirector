function rank1(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn("Canvas not found");
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const allElements = Array.from(canvas.querySelectorAll(".element"));
    const allTexts = Array.from(canvas.querySelectorAll(".text")); // 假设文本元素加 class="text"

    // 1️⃣ 全局灰化
    allElements.forEach(el => {
        el.style.filter = "grayscale(100%)";
        el.style.opacity = 0.3;
    });
    allTexts.forEach(txt => txt.style.color = "#aaa");

    // 2️⃣ 使用 timeline 顺序播放
    const tl = gsap.timeline();

    groupIds.forEach(groupId => {
        const groupEls = allElements.filter(el => el.dataset.group === groupId);
        const textEls = allTexts.filter(txt => txt.dataset.group === groupId);
        if (!groupEls.length) return;

        // ⚡ 元素点亮脉冲
        tl.fromTo(groupEls,
            { opacity: 0.3, scale: 0.9, filter: "grayscale(100%)" },
            { opacity: 1, scale: 1, filter: "grayscale(0%)", duration: 0.5, ease: "power2.out" }
        );

        // 文本点亮
        textEls.forEach(txt => {
            tl.to(txt, { color: "#ff8c00", duration: 0.5 }, "<"); // "<" 表示与上一步同时开始
        });

        // 电量充能效果：在组上方绘制小闪电/光圈
        tl.add(() => {
            const chargeCircle = document.createElement("div");
            chargeCircle.className = "charge-circle";
            chargeCircle.style.position = "absolute";
            chargeCircle.style.width = "30px";
            chargeCircle.style.height = "30px";
            chargeCircle.style.borderRadius = "50%";
            chargeCircle.style.border = "2px solid orange";
            chargeCircle.style.top = groupEls[0].offsetTop - 20 + "px";
            chargeCircle.style.left = groupEls[0].offsetLeft + groupEls[0].offsetWidth / 2 - 15 + "px";
            chargeCircle.style.opacity = 0;
            canvas.appendChild(chargeCircle);

            gsap.fromTo(chargeCircle,
                { scale: 0, opacity: 1 },
                { scale: 1.5, opacity: 0, duration: 0.8, ease: "power2.out", onComplete: () => chargeCircle.remove() }
            );
        });

        // 每组延迟
        tl.to({}, { duration: 0.6 }); // 空动画延迟
    });

    // 动画完成后恢复初始状态
    gsap.delayedCall(4, () => {
        allElements.forEach(el => {
            el.style.filter = "";
            el.style.opacity = "";
        });
        allTexts.forEach(txt => {
            txt.style.color = "";
        });
    });
}

// 调用示例
// rank1(["G1", "G2", "G3"], "canvas");


// 调用示例


function rank2(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn("Canvas not found");
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const allElements = Array.from(canvas.querySelectorAll(".element"));
    const initSize = 150; // visual 缩小的目标尺寸
    const dataGraphics = [];

    // 先隐藏未传入组的元素
    allElements.forEach(el => {
        if (!groupIds.includes(el.dataset.group)) {
            const img = el.querySelector("img");
            if (img) gsap.set(img, { opacity: 0 });
        }
    });

    // 初始化每个传入组
    groupIds.forEach(groupId => {
        const groupElements = allElements.filter(e => e.dataset.group === groupId);
        const dataGraphic = groupElements.find(e => e.dataset.type === "data_graphic");
        const visual = groupElements.find(e => e.dataset.type === "visual");
        if (!dataGraphic || !visual) return;

        const imgDG = dataGraphic.querySelector("img");
        const imgVisual = visual.querySelector("img");
        if (!imgDG || !imgVisual) return;

        const rectDG = imgDG.getBoundingClientRect();
        const rectVisual = imgVisual.getBoundingClientRect();

        // datagraphic 保持原位置不动，只设置初始opacity
        gsap.set(imgDG, { opacity: 1 });

        // visual 缩小并移动到 datagraphic 中心位置
        const scaleX = initSize / rectVisual.width;
        const scaleY = initSize / rectVisual.height;
        const targetX = rectDG.left + rectDG.width / 2 - (rectVisual.left + rectVisual.width / 2);
        const targetY = rectDG.top + rectDG.height / 2 - (rectVisual.top + rectVisual.height / 2);
        gsap.set(imgVisual, {
            scaleX: scaleX,
            scaleY: scaleY,
            x: targetX,
            y: targetY,
            transformOrigin: "50% 50%",
            opacity: 1
        });

        // text 隐藏
        groupElements.forEach(el => {
            if (el.dataset.type === "text") {
                const img = el.querySelector("img");
                if (img) gsap.set(img, { opacity: 0 });
            }
        });

        dataGraphics.push({ imgDG, imgVisual, rectDG, rectVisual, groupElements });
    });

    // 使用 timeline 顺序播放动画
    const tl = gsap.timeline();

    dataGraphics.forEach(dg => {
        const { imgDG, imgVisual, rectDG, rectVisual, groupElements } = dg;

        // 波纹效果在 datagraphic 位置
        tl.add(() => {
            const ripple = document.createElement("div");
            ripple.style.position = "absolute";
            ripple.style.width = rectDG.width + "px";
            ripple.style.height = rectDG.height + "px";
            ripple.style.border = "2px solid orange";
            ripple.style.borderRadius = "50%";
            ripple.style.top = rectDG.top + "px";
            ripple.style.left = rectDG.left + "px";
            ripple.style.opacity = 0.5;
            ripple.style.pointerEvents = "none";
            canvas.appendChild(ripple);
            gsap.fromTo(ripple,
                { scale: 0.5, opacity: 0.5 },
                { scale: 1.5, opacity: 0, duration: 0.8, ease: "power1.out", repeat: 1, onComplete: () => ripple.remove() }
            );
        });

        // visual 放大回原位置
        tl.to(imgVisual, {
            duration: 0.8,
            scaleX: 1,
            scaleY: 1,
            x: 0,
            y: 0,
            ease: "power2.out"
        });

        // text 飞入
        groupElements.forEach(el => {
            if (el.dataset.type !== "text") return;
            const imgEl = el.querySelector("img");
            if (!imgEl) return;
            gsap.set(imgEl, { opacity: 0 });
            tl.to(imgEl, { duration: 0.8, opacity: 1, ease: "power2.out" }, "<");
        });

        // 每组延迟
        tl.to({}, { duration: 0.4 });
    });

    // 动画完成后恢复初始状态
    gsap.delayedCall(5, () => {
        const allElements = Array.from(canvas.querySelectorAll(".element"));
        allElements.forEach(el => {
            el.style.transform = "";
            el.style.opacity = "";
        });
    });
}


window.rank1 = rank1;
window.rank2 = rank2;
