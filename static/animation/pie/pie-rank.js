function waitImagesLoaded(container) {
    const imgs = Array.from(container.querySelectorAll("img"));
    return Promise.all(
        imgs.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => (img.onload = img.onerror = resolve));
        })
    );
}

function rank1(canvasId = "canvas", groups) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    if (!groups || !groups.length) return console.warn("请传入组 ID 数组");

    const masterTl = gsap.timeline();
    const allElements = canvas.querySelectorAll(".element[data-group]");

    // 初始隐藏所有元素
    allElements.forEach(el => gsap.set(el, { opacity: 0 }));

    groups.forEach(groupId => {
        const targetGroup = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
        if (!targetGroup.length) return;

        const visualEl = Array.from(targetGroup).find(el => el.dataset.type === "visual");
        const graphicEls = Array.from(targetGroup).filter(el => el.dataset.type === "data_graphic");
        const textEls = Array.from(targetGroup).filter(el => el.dataset.type === "text");

        const groupTl = gsap.timeline();

        // graphic 依次渐显
        if (graphicEls.length) {
            graphicEls.forEach(el => gsap.set(el, { opacity: 0 }));
            groupTl.to(graphicEls, { opacity: 1, duration: 0.5, stagger: 0.2 });
        }

        // visual 缩放动画
        if (visualEl) {
            gsap.set(visualEl, { scale: 0.8, opacity: 1 });
            groupTl.to(visualEl, { scale: 1, duration: 0.6, ease: "back.out(1.7)" }, "-=0.3");
        }

        // text 渐显
        if (textEls.length) {
            textEls.forEach(el => gsap.set(el, { opacity: 0 }));
            groupTl.to(textEls, { opacity: 1, duration: 0.5, stagger: 0.2 }, "-=0.3");
        }

        masterTl.add(groupTl, "+=0.2");
    });

    // 动画结束后恢复所有元素
    masterTl.to(allElements, { opacity: 1, duration: 0.5 }, "+=1");

    // 重复3次
    masterTl.repeat(2);

    return masterTl;
}


function rank2(canvasId = "canvas", groups) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    if (!groups || !groups.length) return console.warn("请传入组 ID 数组");

    const masterTl = gsap.timeline();
    const allElements = canvas.querySelectorAll(".element[data-group]");

    // 初始隐藏所有元素
    allElements.forEach(el => gsap.set(el, { opacity: 0 }));

    groups.forEach((groupId) => {
        const targetGroup = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
        if (!targetGroup.length) return;

        const visualEl = Array.from(targetGroup).find(el => el.dataset.type === "visual");
        const graphicEls = Array.from(targetGroup).filter(el => el.dataset.type === "data_graphic");
        const textEls = Array.from(targetGroup).filter(el => el.dataset.type === "text");

        const groupTl = gsap.timeline();

        // graphic 旋转并渐显
        if (graphicEls.length) {
            graphicEls.forEach(el => gsap.set(el, { opacity: 0, rotation: -180, transformOrigin: "50% 50%" }));
            groupTl.to(graphicEls, {
                opacity: 1,
                rotation: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: "power2.out"
            });
        }

        // visual 缩放动画
        if (visualEl) {
            gsap.set(visualEl, { scale: 0.8, opacity: 1, transformOrigin: "50% 50%" });
            groupTl.to(visualEl, { scale: 1, duration: 0.6, ease: "back.out(1.7)" }, "-=0.3");
        }

        // text 渐显
        if (textEls.length) {
            textEls.forEach(el => gsap.set(el, { opacity: 0 }));
            groupTl.to(textEls, { opacity: 1, duration: 0.5, stagger: 0.2 }, "-=0.3");
        }

        masterTl.add(groupTl, "+=0.2");
    });

    // 动画结束后恢复所有元素
    masterTl.to(allElements, { opacity: 1, duration: 0.5 }, "+=1");

    // 重复3次
    masterTl.repeat(2);

    return masterTl;
}

function rank3(canvasId = "canvas", groups) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    if (!groups || !groups.length) return console.warn("请传入组 ID 数组");

    const allElements = canvas.querySelectorAll(".element[data-group]");
    const masterTl = gsap.timeline();

    // 初始状态：所有元素虚化
    allElements.forEach(el => gsap.set(el, { filter: "blur(4px)", scale: 1, opacity: 1 }));

    groups.forEach((groupId) => {
        const targetGroup = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
        if (!targetGroup.length) return;

        const visualEl = Array.from(targetGroup).find(el => el.dataset.type === "visual");
        const graphicEls = Array.from(targetGroup).filter(el => el.dataset.type === "data_graphic");
        const textEls = Array.from(targetGroup).filter(el => el.dataset.type === "text");

        const groupTl = gsap.timeline();

        if (visualEl) {
            gsap.set(visualEl, { scale: 0.8, opacity: 1, filter: "blur(4px)" });
            groupTl.to(visualEl, { scale: 1, filter: "blur(0px)", duration: 0.6, ease: "back.out(1.7)" });
        }

        // graphic 去虚化
        if (graphicEls.length) {
            groupTl.to(graphicEls, { filter: "blur(0px)", opacity: 1, duration: 0.8, stagger: 0.1 }, 0);
        }

        // text 渐显去虚化
        if (textEls.length) {
            textEls.forEach(el => gsap.set(el, { opacity: 0, filter: "blur(4px)" }));
            groupTl.to(textEls, { filter: "blur(0px)", opacity: 1, duration: 0.5, stagger: 0.2 }, "-=0.4");
        }

        masterTl.add(groupTl, "+=0.2");
    });

    // 动画结束后恢复 canvas 和元素
    masterTl.to(canvas, {
        scale: 1,
        x: 0,
        y: 0,
        duration: 0.8
    }, "+=1");
    masterTl.to(allElements, { filter: "blur(0px)", scale: 1, opacity: 1, duration: 0.5 }, "-=0.8");

    // 重复3次
    masterTl.repeat(2);

    return masterTl;
}

/* ==========================================================================
   执行入口
   ========================================================================== */
async function runAnimation(canvasId = "canvas", groups = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 canvas: ${canvasId}`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    // 如果没有传入 groups，则获取所有组
    if (!groups || groups.length === 0) {
        groups = [...new Set([...canvas.querySelectorAll(".element[data-group]")].map(el => el.dataset.group))];
    }

    if (groups.length === 0) return console.warn("未找到任何组");

    // 先销毁旧动画，清理所有状态
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    await waitImagesLoaded(canvas);

    // 随机选一个动画
    const modes = [rank1, rank2, rank3];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    console.log(`运行动画: ${mode.name}, 组: ${groups}`);

    const tl = mode(canvasId, groups);
    if (tl && typeof tl.play === "function") tl.play();
}

// 挂载
window.rank1 = rank1;
window.rank2 = rank2;
window.rank3 = rank3;
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

    // 4. 重置 canvas 自身的 transform
    gsap.set(canvas, { scale: 1, x: 0, y: 0, transformOrigin: "0 0" });

    // 5. 恢复所有元素的原始状态
    const allElements = canvas.querySelectorAll(".element[data-group]");
    allElements.forEach(el => {
        gsap.set(el, { opacity: 1, scale: 1, rotation: 0, filter: "none", x: 0, y: 0 });
    });
};
