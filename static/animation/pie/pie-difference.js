/* ==========================================================================
   Helper Functions (辅助工具)
   ========================================================================== */

function getGroupElements(canvasId) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return [];
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    return Array.from(canvas.querySelectorAll(".element[data-group]"));
}

/**
 * 辅助：获取 Canvas 内所有 G 开头的组ID，用于默认情况
 */
function getAllGroupIds(canvasId) {
    const els = getGroupElements(canvasId);
    const groups = new Set();
    els.forEach(el => {
        if (el.dataset.group && el.dataset.group.startsWith('G')) {
            groups.add(el.dataset.group);
        }
    });
    return Array.from(groups).sort((a, b) => {
        return parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''));
    });
}

/* ==========================================================================
   Animation 1: Difference 1 (顺序对比 - Sequential)
   ========================================================================== */
function difference1(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    if (!groupIds || !groupIds.length) return console.warn("difference1: 未传入 groupIds 数组");

    const allElements = getGroupElements(canvasId);

    // 重置所有元素状态
    allElements.forEach(el => {
        gsap.set(el, { opacity: 1, scale: 1, scaleY: 1, y: 0, x: 0, filter: "none" });
    });

    const masterTl = gsap.timeline();

    // 1. 全局虚化：非目标组变模糊
    const others = allElements.filter(el => !groupIds.includes(el.dataset.group));
    if (others.length) {
        masterTl.to(others, { filter: "blur(5px)", opacity: 0.3, duration: 0.6 }, 0);
    }

    // 2. 循环播放目标组 (依次执行)
    groupIds.forEach((groupId, index) => {
        const groupEls = allElements.filter(el => el.dataset.group === groupId);
        if (!groupEls.length) return;

        const graphics = groupEls.filter(el => el.dataset.type === "graphic" || el.dataset.type === "data_graphic");
        const texts = groupEls.filter(el => el.dataset.type === "text");
        const visuals = groupEls.filter(el => el.dataset.type === "visual");

        // Visual 保持清晰
        if (visuals.length) {
            gsap.set(visuals, { filter: "none", opacity: 1 });
        }

        const startTime = index * 0.5;

        // A. Graphic 动画
        if (index < groupIds.length - 1) {
            gsap.set(graphics, { scaleY: 0, transformOrigin: "bottom center" });
            masterTl.to(graphics, { scaleY: 1, duration: 0.8 }, startTime);
        } else {
            gsap.set(graphics, { opacity: 0 });
            masterTl.to(graphics, { opacity: 1, duration: 0.8 }, startTime);
        }

        // B. Text 动画
        if (texts.length) {
            gsap.set(texts, { opacity: 0, y: 10 });
            masterTl.to(texts, { opacity: 1, y: 0, duration: 0.5 }, startTime + 0.3);
        }
    });

    // ===== 重复阶段：先恢复原状，等待，再重复 =====
    // 恢复其他组
    if (others.length) {
        masterTl.to(others, { filter: "none", opacity: 1, duration: 0.5 }, "+=0.5");
    }
    // 重置所有元素状态
    masterTl.call(() => {
        allElements.forEach(el => {
            if (el.dataset.type === "graphic" || el.dataset.type === "data_graphic") {
                gsap.set(el, { scaleY: 1, opacity: 1, scale: 1 });
            }
            if (el.dataset.type === "text") {
                gsap.set(el, { opacity: 1, y: 0 });
            }
            if (el.dataset.type === "visual") {
                gsap.set(el, { opacity: 1 });
            }
        });
    });
    // 等待后再次执行动画（重复2次，共3次）
    masterTl.to({}, { duration: 0.8 }, "-=0.3");
    masterTl.repeat(2);

    return masterTl;
}

/* ==========================================================================
   Animation 2: Difference 2 (多组强调 - Parallel Pop)
   ========================================================================== */
function difference2(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    if (!groupIds || !groupIds.length) return console.warn("difference2: 未传入 groupIds 数组");

    const allElements = getGroupElements(canvasId);

    // 重置所有元素状态
    allElements.forEach(el => {
        gsap.set(el, { opacity: 1, scale: 1, y: 0, x: 0, filter: "none" });
    });

    const masterTl = gsap.timeline();

    // 1. 筛选目标和非目标
    const others = allElements.filter(el => !groupIds.includes(el.dataset.group));
    const targets = allElements.filter(el => groupIds.includes(el.dataset.group));

    // 2. 初始状态：虚化其他人，隐藏目标数据
    if (others.length) {
        masterTl.to(others, { filter: "blur(6px)", opacity: 0.2, duration: 0.5 }, 0);
    }

    // 准备目标的 Graphic 和 Text 初始隐形
    const targetData = targets.filter(el => el.dataset.type !== "visual");
    masterTl.set(targetData, { opacity: 0, scale: 0.8 }, 0);

    // 3. 处理每个目标组的 Visual Pop（直接对 visual 元素动画，不克隆）
    const visualEls = [];
    groupIds.forEach((gid) => {
        const groupEls = targets.filter(el => el.dataset.group === gid);
        const visualEl = groupEls.find(el => el.dataset.type === "visual");
        if (visualEl) {
            gsap.set(visualEl, { opacity: 0, scale: 1 });
            visualEls.push(visualEl);
        }
    });

    // --- 动画阶段 A: Visual 在原位置放大并渐显 ---
    if (visualEls.length > 0) {
        masterTl.to(visualEls, {
            opacity: 1,
            scale: 1.8,
            duration: 0.6,
            ease: "back.out(1.7)"
        }, 0);
    }

    // --- 动画阶段 B: 数据显示 ---
    masterTl.to(targetData, {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: "power2.out"
    }, 0.4);

    // --- 动画阶段 C: Visual 缩小回原位 ---
    if (visualEls.length > 0) {
        masterTl.to(visualEls, {
            scale: 1,
            duration: 0.6,
            ease: "power2.inOut"
        }, 1.2);
    }

    // ===== 重复阶段：先恢复原状，等待，再重复 =====
    // 恢复其他组
    if (others.length) {
        masterTl.to(others, { filter: "none", opacity: 1, duration: 0.5 }, "+=0.5");
    }
    // 重置所有元素状态
    masterTl.call(() => {
        others.forEach(el => {
            gsap.set(el, { filter: "none", opacity: 1, scale: 1 });
        });
        targets.forEach(el => {
            if (el.dataset.type === "graphic" || el.dataset.type === "data_graphic") {
                gsap.set(el, { scale: 1, opacity: 1 });
            }
            if (el.dataset.type === "text") {
                gsap.set(el, { opacity: 1, scale: 1 });
            }
            if (el.dataset.type === "visual") {
                gsap.set(el, { opacity: 1, scale: 1 });
            }
        });
    });
    // 等待后再次执行动画（重复2次，共3次）
    masterTl.to({}, { duration: 0.8 }, "-=0.3");
    masterTl.repeat(2);

    return masterTl;
}

/* ==========================================================================
   Main Execution (调用入口)
   ========================================================================== */

function runAnimation(canvasId = "canvas", groups = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    // 如果没有传入 groups，则获取所有组
    if (!groups || groups.length === 0) {
        groups = getAllGroupIds(canvasId);
    }

    if (groups.length === 0) return console.warn("未找到任何组");

    // 先销毁旧动画
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    // 随机选择模式
    const mode = Math.random() > 0.5 ? "difference1" : "difference2";
    console.log(`正在运行动画: ${mode}, 组: ${groups}`);

    if (mode === "difference1") {
        const tl = difference1(canvasId, groups);
        if (tl && typeof tl.play === "function") tl.play();
    } else {
        const tl = difference2(canvasId, groups);
        if (tl && typeof tl.play === "function") tl.play();
    }
}

// 挂载
window.difference1 = difference1;
window.difference2 = difference2;
window.runAnimation = runAnimation;

/**
 * 销毁当前动画
 */
window.destroyCurrentAnimation = function(canvasId = "canvas") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (typeof window._currentMasterTimeline !== "undefined" && window._currentMasterTimeline) {
        window._currentMasterTimeline.kill();
        window._currentMasterTimeline = null;
    }

    if (typeof gsap !== "undefined") {
        const allEls = canvas.querySelectorAll('.element, [data-group], svg, path, img, div');
        allEls.forEach(el => {
            gsap.getTweensOf(el).forEach(tween => tween.kill());
        });
    }

    canvas.querySelectorAll('svg').forEach(svg => svg.remove());

    gsap.set(canvas, { scale: 1, x: 0, y: 0, transformOrigin: "0 0" });

    const allElements = canvas.querySelectorAll(".element[data-group]");
    allElements.forEach(el => {
        gsap.set(el, { opacity: 1, scale: 1, scaleY: 1, y: 0, x: 0, rotation: 0, filter: "none" });
    });
};
