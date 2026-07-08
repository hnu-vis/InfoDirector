/**
 * 给每组元素绘制一个整体手绘大圈
 */
function waitImagesLoaded(container) {
    const imgs = Array.from(container.querySelectorAll("img"));
    return Promise.all(
        imgs.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => (img.onload = img.onerror = resolve));
        })
    );
}

/**
 * 解析 segmentation 数据为 SVG 路径（相对于元素左上角）
 */
function parseSegmentationToPath(segmentation) {
    try {
        const points = JSON.parse(segmentation);
        if (!points || !points[0]) return null;
        const coords = points[0];
        if (coords.length < 3) return null;
        const originX = coords[0][0];
        const originY = coords[0][1];
        const pathParts = [`M0 0`];
        for (let i = 1; i < coords.length; i++) {
            pathParts.push(`L${coords[i][0] - originX} ${coords[i][1] - originY}`);
        }
        pathParts.push('Z');
        return pathParts.join(' ');
    } catch (e) {
        return null;
    }
}

function categorzation1(canvasId = "canvas", groupIds = [], options = {}) {
    // 找到内部的 .canvas 容器
    const outerCanvas = document.getElementById(canvasId);
    if (!outerCanvas) return console.warn('未找到 canvas');
    const canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const {
        strokeWidth = 3,
        pulseDuration = 0.8,
        drawDuration = 1.5,
        offset = 10,
        jitter = 6,
        colors = { glyph: "#00ccffff", text: "#1100ffff", visual: "#df10faff" }
    } = options;

    const tl = gsap.timeline();

    let svg = canvas.querySelector('svg.group-highlights');
    if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('group-highlights');
        Object.assign(svg.style, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
        });
        canvas.appendChild(svg);
    }

    const allPaths = [];

    groupIds.forEach(groupId => {
        const groupEls = Array.from(canvas.querySelectorAll(`.element[data-group="${groupId}"]`));
        if (!groupEls.length) return;

        // 使用 offsetLeft/offsetTop（已经是相对于 canvas 的坐标）
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
        groupEls.forEach(el => {
            left = Math.min(left, el.offsetLeft);
            top = Math.min(top, el.offsetTop);
            right = Math.max(right, el.offsetLeft + el.offsetWidth);
            bottom = Math.max(bottom, el.offsetTop + el.offsetHeight);
        });

        left -= offset; top -= offset; right += offset; bottom += offset;

        let points = [
            [left, top],
            [right, top],
            [right, bottom],
            [left, bottom]
        ];
        points = points.map(([x, y]) => [x + (Math.random() - 0.5) * jitter, y + (Math.random() - 0.5) * jitter]);

        function smoothPath(points) {
            if (points.length < 2) return '';
            let d = `M${points[0][0]},${points[0][1]}`;
            for (let i = 0; i < points.length; i++) {
                const p0 = points[i];
                const p1 = points[(i + 1) % points.length];
                const cx = (p0[0] + p1[0]) / 2;
                const cy = (p0[1] + p1[1]) / 2;
                d += ` Q${p0[0]},${p0[1]} ${cx},${cy}`;
            }
            d += ' Z';
            return d;
        }

        const type = groupEls[0].dataset.type || "data_graphic";
        const color = colors[type] || "#ffcc00";

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", smoothPath(points));
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", strokeWidth);
        svg.appendChild(path);

        const length = path.getTotalLength();
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;

        allPaths.push(path);
    });

    // 同时绘制所有路径
    allPaths.forEach(path => {
        tl.to(path, { strokeDashoffset: 0, duration: drawDuration, ease: "power2.out" }, 0);
    });

    // 所有路径同时脉冲
    allPaths.forEach(path => {
        tl.to(path, { duration: pulseDuration, repeat: 2, yoyo: true, strokeWidth: strokeWidth * 1.5, ease: "sine.inOut" }, 0);
    });

    // 无限循环，不清理
    tl.repeat(2);

    window._currentMasterTimeline = tl;
    return tl;
}

function categorzation2(canvasId = "canvas", groupIds = []) {
    const outerCanvas = document.getElementById(canvasId);
    if (!outerCanvas) return console.warn(`未找到 id="${canvasId}"`);
    const canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const allElements = Array.from(canvas.querySelectorAll(".element"));
    if (!allElements.length) return console.warn("未找到任何 .element 元素");

    // 0. 清理旧的遮罩层 (防止多次点击叠加)
    canvas.querySelectorAll('.highlight-mask, svg.highlight-mask-svg').forEach(el => el.remove());

    // 1. 分组逻辑
    const groupsMap = {};
    allElements.forEach(el => {
        const groupId = el.dataset.group || "default";
        if (!groupsMap[groupId]) groupsMap[groupId] = [];
        groupsMap[groupId].push(el);
    });

    // 2. 筛选目标组和非目标元素
    const targetGroups = groupIds.map(id => groupsMap[id]).filter(Boolean);
    if (!targetGroups.length) return console.warn("没有找到指定组");

    const targetElements = targetGroups.flat();
    const nonTargetElements = allElements.filter(el => !targetElements.includes(el));

    const tl = gsap.timeline();
    const svgNS = "http://www.w3.org/2000/svg";

    // 收集 maskPath 引用
    const maskPaths = [];

    // 3. 模糊背景
    const bgImg = canvas.querySelector("img#bg-img");
    if (bgImg) {
        tl.to(bgImg, { css: { filter: "blur(6px)" }, duration: 0.8, ease: "power1.out" }, 0);
    }

    // 4. 模糊非目标组
    if (nonTargetElements.length) {
        tl.to(nonTargetElements, { css: { filter: "blur(4px)", opacity: 0.5 }, duration: 0.6, ease: "power1.out" }, 0);
    }

    // 5. 处理目标组：创建 SVG 遮罩高亮（使用真实轮廓）
    targetGroups.forEach(groupEls => {
        const glyph = groupEls.find(el => el.dataset.type === "data_graphic");
        const others = groupEls.filter(el => el !== glyph);

        if (glyph) {
            const seg = glyph.dataset.segmentation;
            const rect = glyph.getBoundingClientRect();

            // 创建 SVG 遮罩容器（追加到 glyph 上，相对定位）
            const svgMask = document.createElementNS(svgNS, "svg");
            svgMask.classList.add('highlight-mask-svg');
            Object.assign(svgMask.style, {
                position: "absolute",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: "25",
                overflow: "visible"
            });

            // 解析 segmentation 路径
            const d = parseSegmentationToPath(seg);
            const maskPath = document.createElementNS(svgNS, "path");
            if (d) {
                maskPath.setAttribute("d", d);
            } else {
                // 如果没有 segmentation，使用矩形
                maskPath.setAttribute("d", `M0 0 L${rect.width} 0 L${rect.width} ${rect.height} L0 ${rect.height} Z`);
            }
            maskPath.setAttribute("fill", "rgba(255, 238, 2, 0.85)");
            maskPath.setAttribute("stroke", "#ffcc00");
            maskPath.setAttribute("stroke-width", "3");
            maskPath.setAttribute("stroke-linejoin", "round");
            gsap.set(maskPath, { opacity: 0 });
            svgMask.appendChild(maskPath);
            maskPaths.push({ svgMask, maskPath });

            // 追加到 glyph 上（和 bar-value.js 一样的方式）
            if (window.getComputedStyle(glyph).position === "static") {
                glyph.style.position = "relative";
            }
            glyph.appendChild(svgMask);

            // 动画：遮罩轮廓淡入
            tl.to(maskPath, { opacity: 1, duration: 0.6, ease: "power1.out" }, 0);
        }

        if (others.length) {
            others.forEach(el => { el.style.zIndex = 26; });
            tl.to(others, { css: { filter: "none", opacity: 1 }, duration: 0.6, ease: "power1.out" }, 0);
        }
    });

    // ========== 添加恢复动画（每个效果都恢复原状）==========
    // 等待 0.4 秒后再恢复
    tl.to({}, { duration: 0.4 }, "+=0.4");

    // 背景恢复
    if (bgImg) {
        tl.to(bgImg, { css: { filter: "blur(0px)" }, duration: 0.5, ease: "power2.out" }, ">");
    }

    // 非目标组恢复
    if (nonTargetElements.length) {
        tl.to(nonTargetElements, { css: { filter: "blur(0px)", opacity: 1 }, duration: 0.4, ease: "power2.out" }, "<");
    }

    // 遮罩淡出
    maskPaths.forEach(({ maskPath }) => {
        tl.to(maskPath, { opacity: 0, duration: 0.4, ease: "power2.in" }, "<");
    });

    // 循环3次（每次都是 forward+reverse 一个完整 cycle）
    tl.repeat(2);

    window._currentMasterTimeline = tl;
    return tl;
}

/**
 * 全局随机运行动画（Promise 风格）
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    // 切换前先销毁旧动画
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    waitImagesLoaded(canvas).then(() => {
        const animationOptions = ["categorzation1", "categorzation2"];
        const animationType = animationOptions[Math.floor(Math.random() * animationOptions.length)];
        console.log(`随机选择动画类型: ${animationType}`);

        let timeline;
        switch (animationType) {
            case "categorzation1":
                timeline = categorzation1(canvasId, groupIds);
                break;
            case "categorzation2":
                timeline = categorzation2(canvasId, groupIds);
                break;
        }

        if (timeline && typeof timeline.play === "function") {
            timeline.play();
        }
    });
}

// 全局挂载
window.waitImagesLoaded = waitImagesLoaded;
window.categorzation1 = categorzation1;
window.categorzation2 = categorzation2;
window.runAnimation = runAnimation;

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
