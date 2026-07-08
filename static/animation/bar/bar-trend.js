/* ==========================================================================
   Helper Functions (辅助工具函数)
   ========================================================================== */

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
 * 判断柱子是横向还是纵向
 * @returns {'horizontal' | 'vertical'}
 */
function getBarDirection(barEl) {
    const w = barEl.offsetWidth;
    const h = barEl.offsetHeight;
    return w > h ? 'horizontal' : 'vertical';
}

/**
 * 创建全局手绘大箭头 SVG
 * @param {number} x1 起点X
 * @param {number} y1 起点Y
 * @param {number} x2 终点X
 * @param {number} y2 终点Y
 * @param {string} color 颜色
 */
function createBigTrendArrow(x1, y1, x2, y2, color = "#ff0000") {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    
    // 设置全屏 SVG，pointerEvents: none 确保不阻挡鼠标交互
    Object.assign(svg.style, {
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        pointerEvents: "none", overflow: "visible"
    });

    const path = document.createElementNS(svgNS, "path");
    
    // --- 1. 计算贝塞尔曲线控制点 (制造手绘弧度) ---
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    
    // 弯曲程度: 距离越远弯曲越明显，系数 0.08 控制弯曲幅度
    const offset = dist * 0.08; 
    
    // 简单的偏移逻辑：根据方向决定往哪边拱
    const isHorizontalTrend = Math.abs(x2 - x1) > Math.abs(y2 - y1);
    // 如果是横向跨度大，往上拱(y减小)；如果是纵向跨度大，往右拱(x增加)
    const cx = midX + (isHorizontalTrend ? 0 : offset);
    const cy = midY - (isHorizontalTrend ? offset : 0);

    // --- 2. 绘制主路径 ---
    const dMain = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

    // --- 3. 绘制箭头头部 ---
    // 计算终点处的切线角度，让箭头头对准线条方向
    const angle = Math.atan2(y2 - cy, x2 - cx);
    const headLen = 20; // 箭头头长度
    const arrowLeftX = x2 - headLen * Math.cos(angle - Math.PI / 7);
    const arrowLeftY = y2 - headLen * Math.sin(angle - Math.PI / 7);
    const arrowRightX = x2 - headLen * Math.cos(angle + Math.PI / 7);
    const arrowRightY = y2 - headLen * Math.sin(angle + Math.PI / 7);

    const dHead = `M ${x2} ${y2} L ${arrowLeftX} ${arrowLeftY} M ${x2} ${y2} L ${arrowRightX} ${arrowRightY}`;
    
    path.setAttribute("d", dMain + " " + dHead);
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "4"); 
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("fill", "none");
    
    svg.appendChild(path);
    return { svg, path };
}


/* ==========================================================================
   Animation Functions (核心动画函数)
   ========================================================================== */

/**
 * 【动画 1】 Trend1: 基础阶梯生长
 * 逻辑: 仅对传入的 groupIds 进行 [柱子生长 -> 数值滑入] 的交错动画
 */
async function trend1(canvasId = "canvas", groupIds = [], options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (window.waitImagesLoaded) await window.waitImagesLoaded(canvas);

    // 如果未传入组，则不执行，或者您可以选择在这里 fallback 获取所有组
    if (!groupIds || !groupIds.length) return console.warn("Trend1: 未传入 groupIds");

    // 参数配置
    const { 
        barDuration = 0.8, 
        textDelay = 0.5, 
        staggerTime = 0.15 
    } = options;
    
    const tl = gsap.timeline();

    groupIds.forEach((gid, index) => {
        const groupEls = Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"]`));
        const bar = groupEls.find(el => el.dataset.type === "data_graphic");
        const textVal = groupEls.find(el => el.dataset.type === "text");
        
        // 组开始时间
        const startTime = index * staggerTime;

        // A. 柱子生长
        if (bar) {
            const dir = getBarDirection(bar);
            const fromVars = { autoAlpha: 1 };
            const toVars = { duration: barDuration, ease: "power2.out" };
            
            if (dir === 'horizontal') {
                fromVars.scaleX = 0; fromVars.transformOrigin = "left center"; toVars.scaleX = 1;
            } else {
                fromVars.scaleY = 0; fromVars.transformOrigin = "bottom center"; toVars.scaleY = 1;
            }
            tl.fromTo(bar, fromVars, toVars, startTime);
        }

        // B. 数值滑入
        if (textVal) {
            tl.fromTo(textVal,
                { autoAlpha: 0, x: -15, scale: 0.9 },
                { autoAlpha: 1, x: 0, scale: 1, duration: 0.5, ease: "back.out(1.2)" },
                startTime + textDelay
            );
        }
    });

    tl.repeat(2);
    window._currentMasterTimeline = tl;
    return tl;
}

/**
 * 【动画 2】 Trend2: 全局趋势大箭头 (防遮挡版)
 * 逻辑: 在 Trend1 基础上，画一条连接 groupIds[0] 和 groupIds[last] 的大箭头
 */
async function trend2(canvasId = "canvas", groupIds = [], options = {}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (window.waitImagesLoaded) await window.waitImagesLoaded(canvas);

    // 获取可用的 groups
    const allElements = canvas.querySelectorAll('[data-group]');
    const availableGroups = [];
    allElements.forEach(el => {
        const gid = el.dataset.group;
        if (gid && !availableGroups.includes(gid)) availableGroups.push(gid);
    });
    console.log("🎯 Available groups:", availableGroups);

    // 如果传入的 groupIds 无效，使用可用的 groups
    if (!groupIds || groupIds.length < 2) {
        if (availableGroups.length >= 2) {
            groupIds = [availableGroups[0], availableGroups[availableGroups.length - 1]];
            console.log("🎯 Using first and last available groups:", groupIds);
        } else {
            return console.warn("Trend2: 需要至少两组数据");
        }
    }

    const { 
        barDuration = 0.8, 
        textDelay = 0.5, 
        staggerTime = 0.15,
        arrowColor = "#D93025", // Google Red
        arrowDrawDuration = 1.5,
        arrowGap = 50 // 【关键】箭头距离柱子的间隙，防止遮挡
    } = options;

    const tl = gsap.timeline();

    // --- Part 1: 常规柱子生长 (同 Trend1) ---
    groupIds.forEach((gid, index) => {
        const groupEls = Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"]`));
        const bar = groupEls.find(el => el.dataset.type === "data_graphic");
        const textVal = groupEls.find(el => el.dataset.type === "text");
        const startTime = index * staggerTime;

        if (bar) {
            const dir = getBarDirection(bar);
            const fromVars = { autoAlpha: 1 };
            const toVars = { duration: barDuration, ease: "power2.out" };
            
            if (dir === 'horizontal') {
                fromVars.scaleX = 0; fromVars.transformOrigin = "left center"; toVars.scaleX = 1;
            } else {
                fromVars.scaleY = 0; fromVars.transformOrigin = "bottom center"; toVars.scaleY = 1;
            }
            tl.fromTo(bar, fromVars, toVars, startTime);
        }

        if (textVal) {
            tl.fromTo(textVal, 
                { autoAlpha: 0, x: -10, scale: 0.9 },
                { autoAlpha: 1, x: 0, scale: 1, duration: 0.5 }, 
                startTime + textDelay
            );
        }
    });

    // --- Part 2: 绘制全局大箭头 ---
    // 寻找起点(传入的第一组) 和 终点(传入的最后一组)
    const firstGid = groupIds[0];
    const lastGid = groupIds[groupIds.length - 1];
    console.log("🎯 trend2: firstGid =", firstGid, "lastGid =", lastGid);

    // 找到 .canvas 容器
    const canvasContainer = canvas.querySelector('.canvas') || canvas;
    console.log("🎯 Using canvasContainer:", canvasContainer.id || canvasContainer.className);

    // 辅助: 获取柱子及其布局信息
    // 优先使用预先保存的位置信息（使用 offsetLeft/offsetTop，不受 zoom 影响）
    const getBarInfo = (gid) => {
        // 1. 优先使用 window.__barPositions
        if (window.__barPositions && window.__barPositions[gid]) {
            const pos = window.__barPositions[gid];
            const el = canvasContainer.querySelector(`[data-group="${gid}"]`);
            console.log(`📍 Using saved position for ${gid}:`, pos);
            return {
                el: el,
                l: pos.left,
                t: pos.top,
                w: pos.width,
                h: pos.height
            };
        }

        // 2. 否则使用实时获取（使用 offsetLeft/offsetTop）
        const el = canvasContainer.querySelector(`.element[data-group="${gid}"][data-type="data_graphic"]`);
        let targetEl = el;
        if (!el) {
            targetEl = canvasContainer.querySelector(`[data-group="${gid}"]`);
        }
        if (!targetEl) {
            console.warn("⚠️ 未找到元素 for gid:", gid);
            return null;
        }

        console.log(`📍 Using offset for ${gid}: l=${targetEl.offsetLeft}, t=${targetEl.offsetTop}, w=${targetEl.offsetWidth}, h=${targetEl.offsetHeight}`);

        return {
            el: targetEl,
            l: targetEl.offsetLeft,
            t: targetEl.offsetTop,
            w: targetEl.offsetWidth,
            h: targetEl.offsetHeight
        };
    };

    const firstBar = getBarInfo(firstGid);
    const lastBar = getBarInfo(lastGid);

    console.log("🎯 firstBar:", firstBar, "lastBar:", lastBar);

    if (firstBar && lastBar) {
        // 判断方向：用柱子的宽高比
        const dir = firstBar.w > firstBar.h ? 'horizontal' : 'vertical';
        console.log("🎯 Direction from w/h:", dir, "w=", firstBar.w, "h=", firstBar.h);

        let x1, y1, x2, y2;

        // 计算坐标：加上 arrowGap 让箭头飘起来
        if (dir === 'horizontal') {
            // [横向图表] 起点: FirstBar 右侧+间隙 -> 终点: LastBar 右侧+间隙
            x1 = firstBar.l + firstBar.w + arrowGap;
            y1 = firstBar.t + firstBar.h / 2;

            x2 = lastBar.l + lastBar.w + arrowGap;
            y2 = lastBar.t + lastBar.h / 2;
        } else {
            // [纵向图表] 起点: FirstBar 顶部-间隙 -> 终点: LastBar 顶部-间隙
            // firstBar.t 是柱子的 top 位置
            x1 = firstBar.l + firstBar.w / 2;
            y1 = firstBar.t - arrowGap;

            x2 = lastBar.l + lastBar.w / 2;
            y2 = lastBar.t - arrowGap;
        }

        console.log("🎯 Arrow coords: x1=", x1, "y1=", y1, "x2=", x2, "y2=", y2);
        console.log("🎯 firstBar.t=", firstBar.t, "lastBar.t=", lastBar.t, "arrowGap=", arrowGap);

        // 创建箭头
        const { svg, path } = createBigTrendArrow(x1, y1, x2, y2, arrowColor);

        // 添加到 .canvas 容器（使用 offsetLeft/offsetTop 坐标系统）
        svg.style.zIndex = "10";
        canvasContainer.appendChild(svg);

        // 设置绘制动画
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });

        // 在第3个柱子左右开始画 (0.5s)，持续 1.5s
        tl.to(path, {
            strokeDashoffset: 0,
            duration: arrowDrawDuration,
            ease: "power1.inOut"
        }, 0.5);

        // 销毁箭头和SVG元素 - 不销毁，改为循环
    }

    tl.repeat(2);
    window._currentMasterTimeline = tl;
    return tl;
}

/* ==========================================================================
   Execution (运行入口)
   ========================================================================== */

/**
 * 全局运行器
 */
async function runAnimation(canvasId = "canvas", groupIds = []) {
    // 切换前先销毁旧动画
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    // 随机选择演示
    const modes = ["trend1", "trend2"];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    
    console.log(`正在运行动画模式: ${mode}，目标组:`, groupIds);

    if (mode === "trend1") {
        trend1(canvasId, groupIds);
    } else {
        trend2(canvasId, groupIds, { 
            arrowColor: "#09010cff", 
            arrowGap:100 // 调整这个值来避开遮挡
        });
    }
}

// 挂载到 Window
window.waitImagesLoaded = waitImagesLoaded;
window.trend1 = trend1;
window.trend2 = trend2;
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
