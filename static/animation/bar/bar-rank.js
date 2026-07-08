/**
 * 等待容器中所有图片加载完成
 * @param {HTMLElement} container
 * @returns {Promise}
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
 * rank1 动画逻辑
 */
function rank1(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    // 创建线条元素，并修改为加粗亮黄色
    const line = document.createElement("div");
    Object.assign(line.style, {
        position: "absolute",
        background: "transparent",
        borderTop: "4px dashed #ffeb3b",  // 改为亮黄色并加粗
        pointerEvents: "none"
    });
    canvas.appendChild(line);

    const arrowSize = 8;
    const createArrow = (dir = "left") => {
        const arrow = document.createElement("div");
        Object.assign(arrow.style, {
            position: "absolute",
            width: "0",
            height: "0",
            borderTop: `${arrowSize}px solid transparent`,
            borderBottom: `${arrowSize}px solid transparent`,
            cursor: "default"
        });
        if (dir === "left") arrow.style.borderRight = `${arrowSize}px solid #ffeb3b`;  // 使用亮黄色
        else arrow.style.borderLeft = `${arrowSize}px solid #ffeb3b`;  // 使用亮黄色
        canvas.appendChild(arrow);
        return arrow;
    };

    const arrowStart = createArrow("left");
    const arrowEnd = createArrow("right");

    const masterTimeline = gsap.timeline();

    groupIds.forEach((groupId, idx) => {
        const groupEls = Array.from(canvas.querySelectorAll(`.element[data-group="${groupId}"]`));
        if (!groupEls.length) return;

        const glyph = groupEls.find(el => el.dataset.type === "data_graphic");
        if (!glyph) return;

        // 使用 getBoundingClientRect 获取相对于 canvas 的位置
        const glyphRect = glyph.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const relLeft = glyphRect.left - canvasRect.left;
        const relTop = glyphRect.top - canvasRect.top;

        const rect = {
            width: glyph.offsetWidth,
            height: glyph.offsetHeight,
            top: relTop,
            left: relLeft
        };

        const isHorizontal = rect.width > rect.height;
        const lineProps = isHorizontal
            ? {
                  width: rect.width + "px",
                  height: "4px",  // 加粗线条
                  top: rect.top + rect.height / 2 + "px",
                  left: rect.left + "px",
                  borderTop: "4px dashed #ffeb3b",  // 亮黄色
                  borderLeft: "none"
              }
            : {
                  width: "4px",  // 加粗线条
                  height: rect.height + "px",
                  top: rect.top + "px",
                  left: rect.left + rect.width / 2 + "px",
                  borderTop: "none",
                  borderLeft: "4px dashed #ffeb3b"  // 亮黄色
              };

        const lineDrawProps = { ...lineProps };
        if (isHorizontal) lineDrawProps.width = "0px";
        else lineDrawProps.height = "0px";

        if (idx === 0) gsap.set(line, lineDrawProps);

        masterTimeline.to(line, { duration: 0.8, ...lineProps, ease: "power2.inOut" });

        // 调整箭头位置，确保箭头与线对齐
        masterTimeline.set(arrowStart, {
            top: isHorizontal ? lineProps.top - arrowSize : lineProps.top,
            left: isHorizontal ? lineProps.left - arrowSize : lineProps.left - arrowSize
        });
        masterTimeline.set(arrowEnd, {
            top: isHorizontal ? lineProps.top - arrowSize : lineProps.top,
            left: isHorizontal
                ? parseFloat(lineProps.left) + parseFloat(lineProps.width)
                : lineProps.left + arrowSize
        });

        const elementsToAnimate = groupEls.filter(
            el => el.dataset.type === "visual" || el.dataset.type === "text"
        );
        elementsToAnimate.forEach(el => (el.style.transformOrigin = "center center"));

        masterTimeline.fromTo(
            elementsToAnimate,
            { scale: 0, opacity: 0 },
            { scale: 1.2, opacity: 1, duration: 0.8, ease: "back.out(1.5)" },
            "<"
        );
        masterTimeline.to(elementsToAnimate, { scale: 1, duration: 0.3, ease: "power1.out" });
    });

    // 无限循环，不清理（切换时统一销毁）
    masterTimeline.repeat(2);

    window._currentMasterTimeline = masterTimeline;
    return masterTimeline;
}

/**
 * rank2 动画逻辑
 */
function rank2(canvasId = "canvas", groupIds = [], zoom = 1.2, duration = 1, pause = 0.8) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn(`未找到 id="${canvasId}"`);
  canvas.style.perspective = "800px";
  canvas.style.transformStyle = "preserve-3d";

  const allElements = Array.from(document.querySelectorAll(".element"));
  const masterTimeline = gsap.timeline();

  // 辅助函数：计算亮度
  function getBrightness(rgbStr) {
    const rgb = rgbStr.match(/\d+/g);
    if (!rgb) return 255; // fallback：纯白
    const [r, g, b] = rgb.map(Number);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // 自动选择高对比色
  function getContrastColor(bgColor) {
    const brightness = getBrightness(bgColor);
    return brightness > 128 ? "#000" : "#fff";
  }

  groupIds.forEach((groupId, idx) => {
    const groupEls = allElements.filter(el => el.dataset.group === groupId);
    if (!groupEls.length) return;

    const glyph = groupEls.find(el => el.dataset.type === "data_graphic");
    if (!glyph) return;

    const glyphRect = glyph.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const centerX = glyphRect.left - canvasRect.left + glyphRect.width / 2;
    const centerY = glyphRect.top - canvasRect.top + glyphRect.height / 2;
    const canvasCenterX = canvasRect.width / 2;
    const canvasCenterY = canvasRect.height / 2;

    masterTimeline.to(canvas, {
      scale: zoom,
      x: canvasCenterX - centerX,
      y: canvasCenterY - centerY,
      duration: duration,
      ease: "power2.inOut"
    });

    // 获取背景颜色
    const bgColor =
      getComputedStyle(glyph).backgroundColor ||
      getComputedStyle(canvas).backgroundColor ||
      "rgb(255,255,255)";

    const contrastColor = getContrastColor(bgColor);
    const shadowColor = contrastColor === "#fff" ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.8)";

    const relLeft = glyphRect.left - canvasRect.left;
    const relTop = glyphRect.top - canvasRect.top;

    const numberEl = document.createElement("div");
    numberEl.textContent = (idx + 1).toString();
    Object.assign(numberEl.style, {
      position: "absolute",
      fontSize: "26px",
      fontWeight: "bold",
      color: contrastColor,
      textShadow: `0 0 6px ${shadowColor}`,
      background: "rgba(0,0,0,0.25)",
      borderRadius: "50%",
      padding: "6px 12px",
      pointerEvents: "none",
      opacity: 0,
      left: relLeft + glyph.offsetWidth / 2 + "px",
      top: relTop + glyph.offsetHeight / 2 + "px",
      transform: "translate(-50%, -50%)",
      zIndex: 9999
    });
    canvas.appendChild(numberEl);

    masterTimeline.to(numberEl, { opacity: 1, duration: 0.3 });
    masterTimeline.to({}, { duration: pause });
    masterTimeline.to(numberEl, { opacity: 0, duration: 0.3 });
  });

  masterTimeline.to(canvas, {
    scale: 1,
    x: 0,
    y: 0,
    duration: duration,
    ease: "power2.inOut"
  });

  window._currentMasterTimeline = masterTimeline;
  return masterTimeline;
}


/**
 * 解析 segmentation 数据为 SVG 路径
 * 格式: [[[x1, y1], [x2, y2], ...]]
 * 返回相对于 glyph 左上角的路径坐标（减去第一个点的坐标）
 */
function parseSegmentationToPath(segmentation) {
    try {
        const points = JSON.parse(segmentation);
        if (!points || !points[0]) return null;
        const coords = points[0];
        if (coords.length < 3) return null;

        // 第一个点作为原点，所有坐标减去它使其相对化
        const originX = coords[0][0];
        const originY = coords[0][1];

        const pathParts = [`M0 0`];
        for (let i = 1; i < coords.length; i++) {
            pathParts.push(`L${coords[i][0] - originX} ${coords[i][1] - originY}`);
        }
        pathParts.push('Z');
        return pathParts.join(' ');
    } catch (e) {
        console.warn('解析 segmentation 失败:', e);
        return null;
    }
}

/**
 * rank3 动画逻辑 - D增长 -> 划线 -> 文字进入 -> 图片弹出
 * 每组顺序执行
 */
function rank3(canvasId = "canvas", groupIds = []) {
    const selector = ".element";
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);

    const allElements = Array.from(canvas.querySelectorAll(selector));
    if (!allElements.length) return console.warn(`未找到任何 ${selector} 元素`);

    const groupsMap = {};
    allElements.forEach(el => {
        const groupId = el.dataset.group || "default";
        if (!groupsMap[groupId]) groupsMap[groupId] = [];
        groupsMap[groupId].push(el);
    });

    const masterTimeline = gsap.timeline();

    groupIds.forEach((groupId, idx) => {
        const groupEls = groupsMap[groupId];
        if (!groupEls) return;

        const glyph = groupEls.find(el => el.dataset.type === "data_graphic");
        const text = groupEls.find(el => el.dataset.type === "text");
        const visual = groupEls.find(el => el.dataset.type === "visual");

        const tl = gsap.timeline();

        if (glyph) {
            const rect = glyph.getBoundingClientRect();

            // 获取不规则轮廓路径
            const segmentation = glyph.dataset.segmentation;
            let svgPath = parseSegmentationToPath(segmentation);
            if (!svgPath) {
                svgPath = `M0 0 L${rect.width} 0 L${rect.width} ${rect.height} L0 ${rect.height} Z`;
            }

            const svgNS = "http://www.w3.org/2000/svg";

            // ====== 0. 初始状态：D 完全透明 ======
            glyph.style.opacity = "0";

            // ====== 1. D 从左到右增长 ======
            // 使用 clipPath 从右裁剪到不裁剪
            glyph.style.clipPath = "inset(0 100% 0 0)";

            // 确保 glyph 是相对定位
            if (window.getComputedStyle(glyph).position === "static") {
                glyph.style.position = "relative";
            }

            // D 增长动画
            tl.to(glyph, {
                opacity: 1,
                duration: 0.01
            }, 0);
            tl.to(glyph, {
                clipPath: "inset(0 0% 0 0)",
                duration: 0.8,
                ease: "power2.inOut"
            }, 0);

            // ====== 2. 轮廓划线动画 ======
            const outlineSvg = document.createElementNS(svgNS, "svg");
            outlineSvg.setAttribute("width", rect.width);
            outlineSvg.setAttribute("height", rect.height);
            outlineSvg.style.position = "absolute";
            outlineSvg.style.top = "0";
            outlineSvg.style.left = "0";
            outlineSvg.style.pointerEvents = "none";
            outlineSvg.style.overflow = "visible";

            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", svgPath);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", "#ff9800");
            path.setAttribute("stroke-width", 2.5);
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            outlineSvg.appendChild(path);
            glyph.appendChild(outlineSvg);

            // 获取路径长度并隐藏
            let pathLength;
            try {
                pathLength = path.getTotalLength();
            } catch (e) {
                pathLength = 2000;
            }
            path.style.strokeDasharray = pathLength;
            path.style.strokeDashoffset = pathLength;

            // 轮廓划线动画 - 在 D 增长完成后开始
            tl.to(path, {
                strokeDashoffset: 0,
                duration: 0.6,
                ease: "power1.inOut"
            }, 0.8);

            // ====== 3. 文字进入动画 ======
            if (text) {
                tl.fromTo(text,
                    { opacity: 0, x: -20 },
                    { opacity: 1, x: 0, duration: 0.4, ease: "back.out(1.5)" },
                    1.2
                );
            }

            // ====== 4. 图片弹出动画 ======
            if (visual) {
                visual.style.transformOrigin = "center center";
                tl.fromTo(visual,
                    { opacity: 0, scale: 0 },
                    { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" },
                    1.5
                );
            }
        }

        masterTimeline.add(tl);
    });

    // 动画结束后删除所有 SVG
    masterTimeline.eventCallback("onComplete", () => {
        const allElements = Array.from(canvas.querySelectorAll(".element"));
        allElements.forEach(el => {
            el.querySelectorAll('svg').forEach(svg => svg.remove());
        });
    });

    return masterTimeline;
}

/**
 * 随机运行动画
 * @param {string} canvasId 容器 ID
 * @param {string[]} groupIds 组 ID 数组
 */
async function runAnimation(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    // 切换前先销毁旧动画
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    await waitImagesLoaded(canvas);

    const animationOptions = ["rank1", "rank2", "rank3"];
    const animationType = animationOptions[Math.floor(Math.random() * animationOptions.length)];
    console.log(`随机选择动画类型: ${animationType}`);

    let timeline;
    switch (animationType) {
        case "rank1":
            timeline = rank1(canvasId, groupIds);
            break;
        case "rank2":
            timeline = rank2(canvasId, groupIds);
            break;
        case "rank3":
            timeline = rank3(canvasId, groupIds);
            break;
    }

    if (timeline && typeof timeline.play === "function") timeline.play();
}

// 挂到 window，全局可调用
window.waitImagesLoaded = waitImagesLoaded;
window.rank1 = rank1;
window.rank2 = rank2;
window.rank3 = rank3;
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
