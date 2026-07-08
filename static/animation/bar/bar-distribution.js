/* ==========================================================================
   Helper Functions (辅助工具)
   ========================================================================== */

/**
 * 等待图片加载
 */
function waitImagesLoaded(container) {
    const imgs = Array.from(container.querySelectorAll("img"));
    return Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => img.onload = img.onerror = resolve);
    }));
}

/**
 * 判断柱子方向
 * @returns {'horizontal' | 'vertical'}
 */
function getBarDirection(barEl) {
    const w = barEl.offsetWidth;
    const h = barEl.offsetHeight;
    return w > h ? 'horizontal' : 'vertical';
}

/**
 * 辅助：获取并排序 G 开头的组
 */
function getSortedGroupIds(canvas) {
    const allElements = Array.from(canvas.querySelectorAll(".element"));
    const groups = new Set();
    allElements.forEach(el => {
        if (el.dataset.group && el.dataset.group.startsWith('G')) {
            groups.add(el.dataset.group);
        }
    });
    return Array.from(groups).sort((a, b) => {
        return parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''));
    });
}

/* ==========================================================================
   Animation Functions (核心动画)
   ========================================================================== */

/**
 * 【动画 1】 distribution1: 笔直虚线参考线
 * 逻辑: 
 * - 纵向柱子 -> 画横线 (y = G1.top)
 * - 横向柱子 -> 画竖线 (x = G1.right)
 * - 线条笔直，从第一组延伸到最后一组
 */
async function distribution1(canvasId = "canvas", groupIds = [], options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (window.waitImagesLoaded) await window.waitImagesLoaded(canvas);

    // 1. 确定起点组和终点组
    let targetGroupIds = groupIds;
    if (!targetGroupIds || targetGroupIds.length < 2) {
        // 如果没传或少于2个，默认拿全部来画
        targetGroupIds = getSortedGroupIds(canvas);
    }
    if (targetGroupIds.length < 2) return console.warn("需要至少两组来确定线的长度");

    const firstGid = targetGroupIds[0];
    const lastGid = targetGroupIds[targetGroupIds.length - 1];

    // 获取关键元素 (以 DataGraphic 为基准)
    // 先获取.wrapper，再在内部找 data_graphic
    const getBarEl = (gid) => {
        const wrappers = canvas.querySelectorAll(`.element[data-group="${gid}"]`);
        for (const wrapper of wrappers) {
            const dg = wrapper.querySelector('[data-type="data_graphic"]');
            if (dg) return dg;
        }
        return null;
    };
    const firstBar = getBarEl(firstGid);
    const lastBar = getBarEl(lastGid);

    if (!firstBar || !lastBar) return;

    const { 
        lineColor = "#FF4500", // 橙红色
        lineWidth = 2,
        duration = 1.0 
    } = options;

    // 2. 计算坐标（使用 offsetLeft/offsetTop，相对于 canvas）
    const dir = getBarDirection(firstBar);
    let x1, y1, x2, y2;

    if (dir === 'horizontal') {
        // --- 横向条形图 (Horizontal Bar) ---
        // 逻辑：画一条竖直的虚线
        // X轴位置：固定在 G1 的右边缘 (表示 G1 的数值位置)
        // Y轴范围：从 G1 的中心 到 GLast 的中心
        const fixedX = firstBar.offsetLeft + firstBar.offsetWidth;

        x1 = fixedX;
        y1 = firstBar.offsetTop + firstBar.offsetHeight / 2;

        x2 = fixedX;
        y2 = lastBar.offsetTop + lastBar.offsetHeight / 2;
    } else {
        // --- 纵向柱状图 (Vertical Column) ---
        // 逻辑：画一条横向的虚线
        // Y轴位置：固定在 G1 的顶部边缘
        // X轴范围：从 G1 的中心 到 GLast 的中心
        const fixedY = firstBar.offsetTop;

        x1 = firstBar.offsetLeft + firstBar.offsetWidth / 2;
        y1 = fixedY;

        x2 = lastBar.offsetLeft + lastBar.offsetWidth / 2;
        y2 = fixedY;
    }

    // 3. 创建 SVG 虚线
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    Object.assign(svg.style, {
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 5
    });

    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", lineColor);
    line.setAttribute("stroke-width", lineWidth);
    line.setAttribute("stroke-dasharray", "6 4"); // 虚线样式: 6px实线 4px空白
    
    svg.appendChild(line);
    canvas.appendChild(svg);

    // 4. 动画：虚线生长
    const tl = gsap.timeline();

    tl.from(line, {
        attr: { x2: x1, y2: y1 },
        duration: duration,
        ease: "power2.inOut"
    });

    tl.repeat(2);
    window._currentMasterTimeline = tl;
    return tl;
}


/**
 * 【动画 2】 distribution2: 多组并行触发 (Icon Pop + Bar Grow)
 * 逻辑: 所有传入的组 *同时* 开始动画 (Parallel)，强调整体感
 * 内部: V(Pop) -> D(Grow)
 */
async function distribution2(canvasId = "canvas", groupIds = [], options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (window.waitImagesLoaded) await window.waitImagesLoaded(canvas);

    const targetGroupIds = (groupIds && groupIds.length) ? groupIds : getSortedGroupIds(canvas);
    
    const { 
        duration = 0.8, 
        popEase = "elastic.out(1, 0.5)" 
    } = options;

    const tl = gsap.timeline();

    targetGroupIds.forEach(gid => {
        const groupEls = Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"]`));
        const bar = groupEls.find(el => el.dataset.type === "data_graphic"); // D
        const visual = groupEls.find(el => el.dataset.type === "visual"); // V

        // --- 动作是并行的，所以 startTime 都是 0 ---
        
        // 1. 图标 Pop
        if (visual) {
            tl.fromTo(visual, 
                { scale: 0, autoAlpha: 1, transformOrigin: "center center" },
                { scale: 1, duration: 0.6, ease: popEase },
                0 // 绝对时间 0
            );
        }

        // 2. 柱子 Grow
        if (bar) {
            const dir = getBarDirection(bar);
            const fromVars = { autoAlpha: 1 };
            const toVars = { duration: duration, ease: "power2.out" };

            if (dir === 'horizontal') {
                fromVars.scaleX = 0; fromVars.transformOrigin = "left center"; toVars.scaleX = 1;
            } else {
                fromVars.scaleY = 0; fromVars.transformOrigin = "bottom center"; toVars.scaleY = 1;
            }
            // 稍微晚一点点(0.1s)开始长，让 Pop 先展示一下，但整体是并发的
            tl.fromTo(bar, fromVars, toVars, 0.1);
        }
    });

    tl.repeat(2);
    window._currentMasterTimeline = tl;
    return tl;
}


/**
 * 【动画 3】 distribution3: 多组并行触发 (Bar Grow + Text Slide)
 * 逻辑: 所有传入的组 *同时* 开始动画 (Parallel)
 * 内部: D(Grow) -> T(Slide In)
 */
async function distribution3(canvasId = "canvas", groupIds = [], options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (window.waitImagesLoaded) await window.waitImagesLoaded(canvas);

    const targetGroupIds = (groupIds && groupIds.length) ? groupIds : getSortedGroupIds(canvas);

    const { duration = 0.8 } = options;
    const tl = gsap.timeline();

    targetGroupIds.forEach((gid, idx) => {
        const groupEls = Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"]`));
        const bar = groupEls.find(el => el.dataset.type === "data_graphic"); // D
        const textEls = groupEls.filter(el => el.dataset.type === "text"); // 所有文本元素

        // 计算组间的交错延迟时间
        const groupStartTime = idx * 0.2; // 每个组之间有 0.2 秒的间隔

        // 1. 柱子 Grow (组间交错)
        if (bar) {
            const dir = getBarDirection(bar);
            const fromVars = { autoAlpha: 1 };
            const toVars = { duration: duration, ease: "power2.out" };

            if (dir === 'horizontal') {
                fromVars.scaleX = 0; fromVars.transformOrigin = "left center"; toVars.scaleX = 1;
            } else {
                fromVars.scaleY = 0; fromVars.transformOrigin = "bottom center"; toVars.scaleY = 1;
            }
            tl.fromTo(bar, fromVars, toVars, groupStartTime);
        }

        // 2. 所有文本 Slide In (组内同时滑入，组间交错)
        textEls.forEach((textEl) => {
            tl.fromTo(textEl, 
                { autoAlpha: 0, x: -20 },
                { autoAlpha: 1, x: 0, duration: 0.5, ease: "power2.out" },
                groupStartTime + 0.4 // 文本在柱子长到一半时同时滑入，组间交错
            );
        });
    });

    tl.repeat(2);
    window._currentMasterTimeline = tl;
    return tl;
}

/* ==========================================================================
   Execution (运行)
   ========================================================================== */

async function runAnimation(canvasId = "canvas", groupIds = []) {
    // 切换前先销毁旧动画
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    // 示例：传入 G1 - G5
    const groups = [
        "G1", "G2", "G3", "G4", "G5",
        "G6", "G7", "G8", "G9", "G10", "G11"
    ];
    
    const modes = ["distribution1", "distribution2", "distribution3"];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    // const mode = "distribution1"; // 强制测试某一个

    console.log(`运行 Distribution 动画: ${mode}`);

    if (mode === "distribution1") {
        // 画线需要配合柱子本身出现，为了效果好，我们先让柱子简单长出来，再画线
        await distribution3(canvasId, groups, { duration: 0.1 }); // 快速显示柱子
        distribution1(canvasId, groups);
    } 
    else if (mode === "distribution2") {
        distribution2(canvasId, groups);
    } 
    else {
        distribution3(canvasId, groups);
    }
}

// 挂载
window.distribution1 = distribution1;
window.distribution2 = distribution2;
window.distribution3 = distribution3;
window.runAnimation = runAnimation;

document.addEventListener("DOMContentLoaded", () => {
    runAnimation("canvas");
});

/**
 * 销毁当前动画（切换动画时调用）
 * 停掉 masterTimeline，清除所有动态创建的元素
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
};
