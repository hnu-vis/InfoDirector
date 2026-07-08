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
 * 判断柱状图方向
 */
function getBarDirection(barEl) {
    const w = barEl.offsetWidth;
    const h = barEl.offsetHeight;
    return w > h ? 'horizontal' : 'vertical';
}

/**
 * difference1: 分阶段引导线动画
 * 阶段1: 逐组画出虚线引导（横向=竖线，纵向=横线）
 * 阶段2: 画连接曲线到最后一个点
 * 曲线画到哪，哪组的 visual + text + bar 依次出现
 */
async function difference1(canvasId = "canvas", groupIds = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    await waitImagesLoaded(canvas);

    // 找到内部的 .canvas 容器（所有 .element 的父容器）
    const canvasContainer = canvas.querySelector('.canvas') || canvas;

    const allElements = Array.from(canvasContainer.querySelectorAll(".element"));
    if (!allElements.length) return console.warn("未找到任何 .element 元素");

    // 分组
    const groupsMap = {};
    allElements.forEach(el => {
        const gid = el.dataset.group || "default";
        if (!groupsMap[gid]) groupsMap[gid] = [];
        groupsMap[gid].push(el);
    });

    const availableGroups = Object.keys(groupsMap);
    let targetGroups;

    if (!groupIds || groupIds.length === 0) {
        const keys = availableGroups.filter(k => k.startsWith('G')).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
        targetGroups = keys.map(k => groupsMap[k]).filter(Boolean);
    } else {
        targetGroups = groupIds.map(id => groupsMap[id]).filter(Boolean);
        if (!targetGroups.length) {
            groupIds.forEach(reqId => {
                availableGroups.forEach(key => {
                    if (key.includes(reqId) || reqId.includes(key)) {
                        if (groupsMap[key] && !targetGroups.includes(groupsMap[key])) {
                            targetGroups.push(groupsMap[key]);
                        }
                    }
                });
            });
        }
        if (!targetGroups.length) {
            targetGroups = [groupsMap[availableGroups[0]], groupsMap[availableGroups[1]]].filter(Boolean);
        }
    }

    if (targetGroups.length < 2) return console.warn("difference1 需要至少两组");

    // 用第一组的 data_graphic 方向作为基准
    const firstGlyph = targetGroups[0].find(el => el.dataset.type === "data_graphic");
    if (!firstGlyph) return console.warn("未找到 data_graphic");
    const isHorizontal = getBarDirection(firstGlyph) === 'horizontal';

    // 获取 canvasContainer 相对于 canvas 的偏移
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();
    const offsetX = containerRect.left - canvasRect.left;
    const offsetY = containerRect.top - canvasRect.top;

    // 收集各组 data_graphic 的位置（使用 getBoundingClientRect 转为相对于 canvas 的坐标）
    const barInfo = targetGroups.map(groupEls => {
        const dg = groupEls.find(el => el.dataset.type === "data_graphic");
        if (!dg) return null;
        const rect = dg.getBoundingClientRect();
        return {
            left: rect.left - canvasRect.left,
            top: rect.top - canvasRect.top,
            width: rect.width,
            height: rect.height,
            groupEls
        };
    }).filter(Boolean);

    if (barInfo.length < 2) return console.warn("barInfo 不足2组");

    const tl = gsap.timeline();
    const svgNS = "http://www.w3.org/2000/svg";

    // ========== SVG 容器 ==========
    const svg = document.createElementNS(svgNS, "svg");
    Object.assign(svg.style, {
        position: "absolute", top: "0", left: "0",
        width: "100%", height: "100%",
        pointerEvents: "none", zIndex: "5", overflow: "visible"
    });
    canvas.appendChild(svg);

    // ========== 阶段1: 逐组画虚线引导 ==========
    const guideLines = [];

    barInfo.forEach((info, idx) => {
        const { left, top, width, height } = info;

        if (isHorizontal) {
            // 横向柱状图：在每组柱子右边缘画竖直虚线
            const line = document.createElementNS(svgNS, "line");
            const x = left + width;
            const y1 = top + height / 2;
            const y2 = top + height * 1.5;
            line.setAttribute("x1", x);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x);
            line.setAttribute("y2", y1);
            line.setAttribute("stroke", "#ff4d4d");
            line.setAttribute("stroke-width", "2");
            line.setAttribute("stroke-dasharray", "6 4");
            line.setAttribute("stroke-linecap", "round");
            svg.appendChild(line);
            guideLines.push({ line, x, y1, y2, isHorizontal: true });

        } else {
            // 纵向柱状图：在每组柱子顶部画水平虚线
            const line = document.createElementNS(svgNS, "line");
            const y = top;
            const x1 = left + width / 2;
            const x2 = left + width * 1.5;
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y);
            line.setAttribute("x2", x1);
            line.setAttribute("y2", y);
            line.setAttribute("stroke", "#ff4d4d");
            line.setAttribute("stroke-width", "2");
            line.setAttribute("stroke-dasharray", "6 4");
            line.setAttribute("stroke-linecap", "round");
            svg.appendChild(line);
            guideLines.push({ line, x1, x2, y, isHorizontal: false });
        }
    });

    // 阶段1动画：逐组展开虚线引导
    guideLines.forEach((g, idx) => {
        if (g.isHorizontal) {
            tl.to(g.line, { attr: { y2: g.y2 }, duration: 0.4, ease: "power2.out" }, idx * 0.25);
        } else {
            tl.to(g.line, { attr: { x2: g.x2 }, duration: 0.4, ease: "power2.out" }, idx * 0.25);
        }
    });

    // ========== 阶段2: 曲线连接所有组（带小球的曲线） ==========
    const curvePoints = barInfo.map(info => {
        if (isHorizontal) {
            return { x: info.left + info.width, y: info.top + info.height / 2 };
        } else {
            return { x: info.left + info.width / 2, y: info.top };
        }
    });

    // 创建曲线路径（手绘风格贝塞尔曲线）
    const curvePath = document.createElementNS(svgNS, "path");
    let d = `M ${curvePoints[0].x} ${curvePoints[0].y}`;
    for (let i = 1; i < curvePoints.length; i++) {
        const prev = curvePoints[i - 1];
        const curr = curvePoints[i];
        // 计算控制点偏移（让曲线有弧度）
        const dist = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
        const offset = dist * 0.2;
        const isHorizTrend = Math.abs(curr.x - prev.x) > Math.abs(curr.y - prev.y);
        const cx = (prev.x + curr.x) / 2 + (isHorizTrend ? 0 : offset);
        const cy = (prev.y + curr.y) / 2 - (isHorizTrend ? offset : 0);
        d += ` Q ${cx} ${cy} ${curr.x} ${curr.y}`;
    }

    curvePath.setAttribute("d", d);
    curvePath.setAttribute("stroke", "#ff6b6b");
    curvePath.setAttribute("stroke-width", "3");
    curvePath.setAttribute("stroke-linecap", "round");
    curvePath.setAttribute("stroke-linejoin", "round");
    curvePath.setAttribute("fill", "none");
    svg.appendChild(curvePath);

    const totalLen = curvePath.getTotalLength();
    gsap.set(curvePath, { strokeDasharray: totalLen, strokeDashoffset: totalLen });

    // 创建小球（每个曲线拐点一个）
    const dots = [];
    curvePoints.forEach((pt, idx) => {
        const dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("cx", pt.x);
        dot.setAttribute("cy", pt.y);
        dot.setAttribute("r", "6");
        dot.setAttribute("fill", "#ff6b6b");
        dot.setAttribute("stroke", "#fff");
        dot.setAttribute("stroke-width", "2");
        gsap.set(dot, { scale: 0, transformOrigin: "center center", opacity: 0 });
        svg.appendChild(dot);
        dots.push(dot);
    });

    const curveStartTime = guideLines.length * 0.25 + 0.1;

    // 曲线绘制动画
    tl.to(curvePath, {
        strokeDashoffset: 0,
        duration: 1.2,
        ease: "power1.inOut"
    }, curveStartTime);

    // 小球逐个出现
    dots.forEach((dot, idx) => {
        tl.to(dot, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" }, curveStartTime + idx * 0.2 + 0.5);
    });

    // ========== 阶段3: 曲线画到哪，哪组元素出现 ==========
    const perGroupTime = 1.2 / barInfo.length;

    barInfo.forEach((info, idx) => {
        const visual = info.groupEls.find(el => el.dataset.type === "visual");
        const textVal = info.groupEls.find(el => el.dataset.type === "text");
        const label = info.groupEls.find(el => el.dataset.type === "text1");
        const dg = info.groupEls.find(el => el.dataset.type === "data_graphic");

        const appearTime = curveStartTime + idx * perGroupTime;

        if (visual) {
            gsap.set(visual, { scale: 0, opacity: 1, transformOrigin: "center center" });
            tl.to(visual, { scale: 1, duration: 0.4, ease: "back.out(1.7)" }, appearTime + 0.1);
        }

        if (textVal) {
            gsap.set(textVal, { opacity: 0, x: -10 });
            tl.to(textVal, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, appearTime + 0.2);
        }

        if (label) {
            gsap.set(label, { opacity: 0, x: -8 });
            tl.to(label, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" }, appearTime + 0.15);
        }

        if (dg) {
            tl.to(dg, { scale: 1.08, duration: 0.25, ease: "power2.out" }, appearTime);
            tl.to(dg, { scale: 1, duration: 0.25, ease: "power2.inOut" }, appearTime + 0.25);
        }
    });

    tl.repeat(2);
    window._currentMasterTimeline = tl;
    return tl;
}

/**
 * difference2: 柱子生长 + 数值滑入，组间交错
 */
async function difference2(canvasId = "canvas", groupIds = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    await waitImagesLoaded(canvas);

    const allElements = Array.from(canvas.querySelectorAll(".element"));
    const groupsMap = {};
    allElements.forEach(el => {
        const gid = el.dataset.group || "default";
        if (!groupsMap[gid]) groupsMap[gid] = [];
        groupsMap[gid].push(el);
    });

    let targetGroups;
    const availableGroups = Object.keys(groupsMap);

    if (groupIds && groupIds.length > 0) {
        targetGroups = groupIds.map(id => groupsMap[id]).filter(Boolean);
        if (!targetGroups.length) {
            groupIds.forEach(reqId => {
                availableGroups.forEach(key => {
                    if (key.includes(reqId) || reqId.includes(key)) {
                        if (groupsMap[key] && !targetGroups.includes(groupsMap[key])) {
                            targetGroups.push(groupsMap[key]);
                        }
                    }
                });
            });
        }
        if (!targetGroups.length) {
            targetGroups = [groupsMap[availableGroups[0]], groupsMap[availableGroups[1]]].filter(Boolean);
        }
    } else {
        const keys = availableGroups.filter(k => k.startsWith('G')).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
        targetGroups = keys.map(k => groupsMap[k]);
    }

    if (!targetGroups.length) return console.warn("没有找到指定组");

    const tl = gsap.timeline();

    targetGroups.forEach((groupEls, idx) => {
        const bar = groupEls.find(el => el.dataset.type === "data_graphic");
        const textVal = groupEls.find(el => el.dataset.type === "text");
        const startTime = idx * 0.15;

        if (bar) {
            const dir = getBarDirection(bar);
            if (dir === 'horizontal') {
                gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
                tl.to(bar, { scaleX: 1, duration: 0.8, ease: "power2.out" }, startTime);
            } else {
                gsap.set(bar, { scaleY: 0, transformOrigin: "bottom center" });
                tl.to(bar, { scaleY: 1, duration: 0.8, ease: "power2.out" }, startTime);
            }
        }

        if (textVal) {
            gsap.set(textVal, { opacity: 0, x: -15 });
            tl.to(textVal, { opacity: 1, x: 0, duration: 0.5, ease: "back.out(1.5)" }, startTime + 0.4);
        }
    });

    tl.repeat(2);
    window._currentMasterTimeline = tl;
    return tl;
}

/**
 * difference3: V Pop + D Grow + T Appear，组间交错
 */
async function difference3(canvasId = "canvas", groupIds = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    await waitImagesLoaded(canvas);

    const allElements = Array.from(canvas.querySelectorAll(".element"));
    const groupsMap = {};
    allElements.forEach(el => {
        const gid = el.dataset.group || "default";
        if (!groupsMap[gid]) groupsMap[gid] = [];
        groupsMap[gid].push(el);
    });

    let targetGroups;
    const availableGroups = Object.keys(groupsMap);

    if (groupIds && groupIds.length > 0) {
        targetGroups = groupIds.map(id => groupsMap[id]).filter(Boolean);
        if (!targetGroups.length) {
            groupIds.forEach(reqId => {
                availableGroups.forEach(key => {
                    if (key.includes(reqId) || reqId.includes(key)) {
                        if (groupsMap[key] && !targetGroups.includes(groupsMap[key])) {
                            targetGroups.push(groupsMap[key]);
                        }
                    }
                });
            });
        }
        if (!targetGroups.length) {
            targetGroups = [groupsMap[availableGroups[0]], groupsMap[availableGroups[1]]].filter(Boolean);
        }
    } else {
        const keys = availableGroups.filter(k => k.startsWith('G')).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
        targetGroups = keys.map(k => groupsMap[k]);
    }

    if (!targetGroups.length) return console.warn("没有找到指定组");

    const tl = gsap.timeline();

    targetGroups.forEach((groupEls, idx) => {
        const bar = groupEls.find(el => el.dataset.type === "data_graphic");
        const visual = groupEls.find(el => el.dataset.type === "visual");
        const label = groupEls.find(el => el.dataset.type === "text1");
        const val = groupEls.find(el => el.dataset.type === "text");
        const startTime = idx * 0.2;

        // V Pop
        if (visual) {
            gsap.set(visual, { scale: 0, transformOrigin: "center center" });
            tl.to(visual, { scale: 1, duration: 0.5, ease: "back.out(1.7)" }, startTime);
        }

        if (label) {
            gsap.set(label, { opacity: 0, x: -10 });
            tl.to(label, { opacity: 1, x: 0, duration: 0.4 }, startTime);
        }

        // D Grow
        if (bar) {
            const dir = getBarDirection(bar);
            if (dir === 'horizontal') {
                gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
                tl.to(bar, { scaleX: 1, duration: 0.7, ease: "power2.out" }, startTime + 0.5);
            } else {
                gsap.set(bar, { scaleY: 0, transformOrigin: "bottom center" });
                tl.to(bar, { scaleY: 1, duration: 0.7, ease: "power2.out" }, startTime + 0.5);
            }
        }

        // T Appear
        if (val) {
            gsap.set(val, { opacity: 0 });
            tl.to(val, { opacity: 1, duration: 0.4 }, startTime + 1.0);
        }
    });

    tl.repeat(2);
    window._currentMasterTimeline = tl;
    return tl;
}

/**
 * 随机运行 difference 动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    waitImagesLoaded(canvas).then(() => {
        const animationOptions = ["difference1", "difference2", "difference3"];
        const animationType = animationOptions[Math.floor(Math.random() * animationOptions.length)];
        console.log(`随机选择动画类型: ${animationType}`);

        let timelinePromise;
        switch (animationType) {
            case "difference1": timelinePromise = difference1(canvasId, groupIds); break;
            case "difference2": timelinePromise = difference2(canvasId, groupIds); break;
            case "difference3": timelinePromise = difference3(canvasId, groupIds); break;
        }

        if (timelinePromise) {
            timelinePromise.then(tl => { if (tl && tl.play) tl.play(); });
        }
    });
}

// 全局挂载
window.waitImagesLoaded = waitImagesLoaded;
window.difference1 = difference1;
window.difference2 = difference2;
window.difference3 = difference3;
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

    if (typeof gsap !== "undefined") {
        const allEls = canvas.querySelectorAll('.element, [data-group], svg, path, img, div');
        allEls.forEach(el => {
            gsap.getTweensOf(el).forEach(tween => tween.kill());
        });
    }

    canvas.querySelectorAll('svg').forEach(svg => svg.remove());
};
