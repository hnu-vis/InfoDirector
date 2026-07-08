// ========================
// 饼状图极值动画 pieExtreme
// ========================
function extreme1(canvasId = "canvas", groupId) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    if (!groupId) return console.warn("请传入组 ID");

    const groupEls = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    if (!groupEls.length) return console.warn(`未找到 data-group="${groupId}" 的元素`);

    const dataGraphic = Array.from(groupEls).find(el => el.dataset.type === "data_graphic");
    const imageElement = Array.from(groupEls).find(el => el.dataset.type === "visual");
    const textElements = Array.from(groupEls).filter(el => el.dataset.type === "text");

    if (!dataGraphic) return console.warn(`组 "${groupId}" 缺少 data_graphic 元素`);

    const computedStyle = window.getComputedStyle(dataGraphic);
    if (computedStyle.position === "static") {
        dataGraphic.style.position = "relative";
    }

    const rect = dataGraphic.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const canvasCenterX = canvasRect.left + canvasRect.width / 2;
    const canvasCenterY = canvasRect.top + canvasRect.height / 2;
    const moveDistance = 50;
    const dx = ((centerX - canvasCenterX) / rect.width) * moveDistance;
    const dy = ((centerY - canvasCenterY) / rect.height) * moveDistance;

    const masterTl = gsap.timeline();

    // 隐藏 image 和 text
    if (imageElement) gsap.set(imageElement, { opacity: 0, x: 0, y: 0 });
    textElements.forEach(t => gsap.set(t, { opacity: 0, x: 0, y: 0 }));

    const cycleTl = gsap.timeline();

    // 弹出动画
    cycleTl.to(dataGraphic, {
        x: dx,
        y: dy,
        duration: 0.8,
        ease: "elastic.out(1.2, 0.3)",
    });

    // 图片和文字依次淡入
    if (imageElement) {
        cycleTl.to(imageElement, {
            opacity: 1,
            x: dx,
            y: dy - 25,
            duration: 0.8,
            ease: "power2.out",
        }, "-=0.4");
    }

    textElements.forEach((textEl, i) => {
        cycleTl.to(textEl, {
            opacity: 1,
            x: dx,
            y: dy - 15 - i * 5,
            duration: 0.8,
            ease: "power2.out",
        }, "-=0.4");
    });

    // 等待
    cycleTl.to({}, { duration: 0.8 }, "+=0.5");

    // 恢复
    cycleTl.to(dataGraphic, { x: 0, y: 0, duration: 0.5, ease: "power2.inOut" }, "+=0.3");
    if (imageElement) cycleTl.to(imageElement, { opacity: 0, x: 0, y: 0, duration: 0.4 }, "-=0.4");
    textElements.forEach(t => cycleTl.to(t, { opacity: 0, x: 0, y: 0, duration: 0.4 }, "-=0.4"));

    masterTl.add(cycleTl);
    masterTl.repeat(2);

    masterTl.eventCallback("onComplete", () => {
        gsap.set(dataGraphic, { x: 0, y: 0, opacity: 1 });
        if (imageElement) gsap.set(imageElement, { opacity: 1, x: 0, y: 0 });
        textElements.forEach(t => gsap.set(t, { opacity: 1, x: 0, y: 0 }));
    });

    return masterTl;
}

// ==================================================
// 聚焦文字动画：zoom in → 弹三次 → 停留 → 回归
// ==================================================
function extreme2(canvasId = "canvas", groupId, zoomScale = 1.2) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    // 支持数组或字符串
    const actualGroupId = Array.isArray(groupId) ? groupId[0] : groupId;
    if (!actualGroupId) return console.warn("请传入组 ID");

    const groupEls = canvas.querySelectorAll(`.element[data-group="${actualGroupId}"]`);
    if (!groupEls.length) return console.warn(`未找到 data-group="${actualGroupId}" 的元素`);

    const textEls = Array.from(groupEls).filter(el => el.dataset.type === "text");
    if (!textEls.length) return console.warn(`组 "${actualGroupId}" 中没有文字元素`);

    const textRect = (() => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        textEls.forEach(el => {
            const rect = el.getBoundingClientRect();
            minX = Math.min(minX, rect.left);
            minY = Math.min(minY, rect.top);
            maxX = Math.max(maxX, rect.right);
            maxY = Math.max(maxY, rect.bottom);
        });
        return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
    })();

    const canvasRect = canvas.getBoundingClientRect();
    const canvasCenterX = canvasRect.left + canvasRect.width / 2;
    const canvasCenterY = canvasRect.top + canvasRect.height / 2;
    const textCenterX = textRect.left + textRect.width / 2;
    const textCenterY = textRect.top + textRect.height / 2;
    const offsetX = canvasCenterX - textCenterX;
    const offsetY = canvasCenterY - textCenterY;

    const masterTl = gsap.timeline();

    const cycleTl = gsap.timeline();

    // 镜头推进
    cycleTl.to(canvas, {
        x: offsetX * zoomScale,
        y: offsetY * zoomScale,
        scale: zoomScale,
        duration: 1.0,
        ease: "power3.inOut",
    });

    // 文本弹动三次
    textEls.forEach(t => {
        cycleTl.to(t, {
            scale: 1.8,
            color: "#ff6600",
            filter: "drop-shadow(0 0 10px rgba(255,150,0,0.8))",
            duration: 0.4,
            ease: "power2.out",
            yoyo: true,
            repeat: 2,
        }, "-=0.1");
    });

    // 停留
    cycleTl.to({}, { duration: 0.6 });

    // 回归
    cycleTl.to(canvas, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 1.0,
        ease: "power3.inOut",
    });
    cycleTl.to(textEls, {
        scale: 1,
        color: "",
        filter: "none",
        duration: 0.5,
        ease: "power2.inOut",
    }, "-=0.8");

    masterTl.add(cycleTl);
    masterTl.repeat(2);

    masterTl.eventCallback("onComplete", () => {
        gsap.set(canvas, { x: 0, y: 0, scale: 1 });
        textEls.forEach(t => gsap.set(t, { scale: 1, color: "", filter: "none" }));
    });

    return masterTl;
}

// ==================================================
// 其他组缩小变灰 + 目标组 pop 出现 + 震屏
// ==================================================
function extreme3(canvasId = "canvas", groupId, zoomScale = 1.5) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    // 支持数组或字符串
    const actualGroupId = Array.isArray(groupId) ? groupId[0] : groupId;
    if (!actualGroupId) return console.warn("请传入组 ID");

    const allElements = canvas.querySelectorAll(".element[data-group]");
    const targetGroup = canvas.querySelectorAll(`.element[data-group="${actualGroupId}"]`);
    if (!targetGroup.length) return console.warn(`未找到 data-group="${actualGroupId}" 的元素`);

    const others = Array.from(allElements).filter(el => el.dataset.group !== actualGroupId);
    const textEls = Array.from(targetGroup).filter(el => el.dataset.type === "text");
    const graphicEls = Array.from(targetGroup).filter(el => el.dataset.type === "graphic" || el.dataset.type === "data_graphic");
    const visualEls = Array.from(targetGroup).filter(el => el.dataset.type === "visual");

    // 先重置 canvas 到初始状态
    gsap.set(canvas, { x: 0, y: 0, rotation: 0, scale: 1 });

    // 重置目标组的所有元素
    targetGroup.forEach(el => {
        const img = el.querySelector("img");
        gsap.set(el, { opacity: 1, scale: 1, y: 0, x: 0, rotation: 0, filter: "none" });
        if (img) {
            gsap.set(img, { opacity: 1, scale: 1, y: 0, x: 0, rotation: 0, filter: "none" });
        }
    });

    const masterTl = gsap.timeline();

    // === 每次循环 ===
    const cycleTl = gsap.timeline();

    // 1. 其他组：缩小（不变暗，保持原色彩）
    others.forEach(el => {
        gsap.set(el, { scale: 0.85 });
    });

    // 2. Data Graphic 从上到下 pop 出现
    if (graphicEls.length) {
        graphicEls.forEach(el => {
            const img = el.querySelector("img");
            if (img) {
                gsap.set(el, { scale: 1 });
                cycleTl.fromTo(img,
                    { opacity: 0, y: -200, scale: 0.4 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.5)" }
                );
            }
        });
    }

    // 3. visual 砸下出现
    if (visualEls.length) {
        visualEls.forEach(el => {
            const img = el.querySelector("img");
            if (img) {
                gsap.set(el, { scale: 1 });
                cycleTl.fromTo(img,
                    { opacity: 0, y: -200, scale: 0.4 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.5)" }
                );
            }
        });
    }

    // 4. 文字印章砸下 + 震屏
    if (textEls.length) {
        // 所有文字同时印章砸下
        textEls.forEach(textEl => {
            const img = textEl.querySelector("img");
            if (img) {
                cycleTl.fromTo(img,
                    { opacity: 0, scale: 4 },
                    { opacity: 1, scale: 1, duration: 0.2, ease: "power4.in" }
                );
            } else {
                cycleTl.fromTo(textEl,
                    { opacity: 0, scale: 4 },
                    { opacity: 1, scale: 1, duration: 0.2, ease: "power4.in" }
                );
            }
        });

        // 震屏特效
        cycleTl.fromTo(canvas,
            { x: -8, y: 6, rotation: -1 },
            { x: 0, y: 0, rotation: 0, duration: 0.05, yoyo: true, repeat: 4 }
        );
    }

    // 5. 停留
    cycleTl.to({}, { duration: 0.8 }, "+=0.3");

    // 6. 恢复其他组（只恢复 scale）
    cycleTl.to(others, {
        scale: 1,
        duration: 0.5,
        ease: "power2.inOut"
    });

    masterTl.add(cycleTl);
    masterTl.repeat(2);

    masterTl.eventCallback("onComplete", () => {
        gsap.set(canvas, { x: 0, y: 0, rotation: 0, scale: 1 });
        // 重置其他组
        others.forEach(el => {
            gsap.set(el, { scale: 1 });
        });
        // 重置目标组（完全显示）
        targetGroup.forEach(el => {
            const img = el.querySelector("img");
            gsap.set(el, { scale: 1, y: 0, x: 0, rotation: 0, filter: "none" });
            if (img) {
                gsap.set(img, { opacity: 1, scale: 1, y: 0, x: 0, rotation: 0, filter: "none" });
            } else {
                gsap.set(el, { opacity: 1 });
            }
        });
    });

    return masterTl;
}

/* ==========================================================================
   执行入口
   ========================================================================== */
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
    const modes = [extreme1, extreme2, extreme3];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    console.log(`运行动画: ${mode.name}, 组: ${groups}`);

    const tl = mode(canvasId, groups[0]);
    if (tl && typeof tl.play === "function") tl.play();
}

window.extreme1 = extreme1;
window.extreme2 = extreme2;
window.extreme3 = extreme3;
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
        allEls.forEach(el => gsap.getTweensOf(el).forEach(tween => tween.kill()));
    }

    canvas.querySelectorAll('svg').forEach(svg => svg.remove());

    // 移除爆点元素
    canvas.querySelectorAll('div[style*="radial-gradient"]').forEach(el => el.remove());

    gsap.set(canvas, { scale: 1, x: 0, y: 0, transformOrigin: "0 0" });

    const allElements = canvas.querySelectorAll(".element[data-group]");
    allElements.forEach(el => {
        gsap.set(el, { opacity: 1, scale: 1, rotation: 0, filter: "none", x: 0, y: 0 });
        const img = el.querySelector("img");
        if (img) gsap.set(img, { filter: "none" });
    });
};
