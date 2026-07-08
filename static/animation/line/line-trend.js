// ==========================
// 辅助函数：多边形点判断
// ==========================
function pointInPolygon([x, y], vs) {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const [xi, yi] = vs[i], [xj, yj] = vs[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ==========================
// 辅助函数：获取路径上指定长度的点
// ==========================
function getPointAtLength(path, lengths, target) {
  let i = 1;
  while (i < lengths.length && lengths[i] < target) i++;
  if (i >= lengths.length) return path[path.length - 1];
  const ratio = (target - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
  return {
    x: path[i - 1].x + (path[i].x - path[i - 1].x) * ratio,
    y: path[i - 1].y + (path[i].y - path[i - 1].y) * ratio
  };
}

// ==========================
// 辅助函数：平滑路径
// ==========================
function smoothPath(points, segments = 20) {
  if (points.length < 2) return points;
  const path = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1];
    const cp = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    for (let t = 0; t < 1; t += 1 / segments) {
      const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * cp.x + t * t * p1.x;
      const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * cp.y + t * t * p1.y;
      path.push({ x, y });
    }
  }
  path.push(points[points.length - 1]);
  return path;
}

// ==========================
// 1️⃣ trend1: X元素依次高亮 + G线逐渐绘制（clip-path）
// ==========================
function trend1(canvasId, lineGroupIds, xGroupIds, duration, pauseDuration) {
  canvasId = canvasId || "canvas";
  lineGroupIds = Array.isArray(lineGroupIds) ? lineGroupIds : [];
  xGroupIds = Array.isArray(xGroupIds) ? xGroupIds : [];
  duration = duration || 2;
  pauseDuration = pauseDuration || 0.3;

  const canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn("Canvas not found");

  const dataGraphicEl = lineGroupIds.map(gid =>
    canvas.querySelector(`.element[data-group="${gid}"][data-type="data_graphic"]`)
  ).filter(Boolean)[0];
  if (!dataGraphicEl) return console.warn("未找到 data_graphic 元素");

  // 获取指定范围的X元素
  const allXElements = Array.from(canvas.querySelectorAll(".element[data-type='text']"))
    .filter(el => el.dataset.group && el.dataset.group.startsWith("X"));

  if (!allXElements.length) return console.warn("未找到 X 轴元素");

  // 解析X索引范围（用第一个和最后一个作为范围端点）
  const startIdx = parseInt(xGroupIds[0].replace("X", ""));
  const endIdx = parseInt(xGroupIds[xGroupIds.length - 1].replace("X", ""));

  const selectedXElements = allXElements.filter(el => {
    const idx = parseInt(el.dataset.group.replace("X", ""));
    return idx >= startIdx && idx <= endIdx;
  });

  if (selectedXElements.length < 2) return console.warn("X轴范围元素不足, 需要至少2个");

  // 计算X位置（使用 offsetLeft，相对 canvas）
  const xPositions = selectedXElements.map(el => ({
    id: el.dataset.group,
    position: el.offsetLeft + el.offsetWidth / 2,
    element: el
  }));

  // 获取 data_graphic 的位置信息
  const dgLeft = dataGraphicEl.offsetLeft;
  const dataGraphicWidth = dataGraphicEl.offsetWidth;

  // 计算 clip 边界
  const leftBound = xPositions[0].position - dgLeft;
  const totalEndX = xPositions[xPositions.length - 1].position - dgLeft;
  const finalRightClip = dataGraphicWidth - totalEndX;

  const REPEAT_COUNT = 3;
  let currentRepeat = 0;

  function runTrend1() {
    console.log(`trend1 repeat ${currentRepeat + 1}/${REPEAT_COUNT}`);

    // 初始化 clip-path：全部隐藏
    dataGraphicEl.style.clipPath = `inset(0px ${dataGraphicWidth}px 0px 0px)`;

    const timeline = gsap.timeline();
    const segmentDuration = duration / (xPositions.length - 1);

    // 只有一个 clip-path 动画：从左边 X2 逐渐扩展到右边 X6
    timeline.to({ progress: 0 }, {
      progress: 1,
      duration: duration,
      ease: "power2.out",
      onUpdate: function() {
        const p = this.targets()[0].progress;
        const currentRight = dataGraphicWidth - (leftBound + (totalEndX - leftBound) * p);
        dataGraphicEl.style.clipPath = `inset(0px ${currentRight}px 0px ${leftBound}px)`;
      }
    }, 0);

    // X元素依次高亮
    xPositions.forEach((xPos, i) => {
      const xEl = xPos.element;
      timeline.to(xEl, {
        scale: 1.4,
        duration: 0.2,
        ease: "back.out(2)",
        onStart: () => {
          xEl.style.zIndex = 20;
          xEl.style.filter = "brightness(1.3) drop-shadow(0 0 8px rgba(255,210,0,0.8))";
        }
      }, i * segmentDuration * 0.8);

      timeline.to(xEl, {
        scale: 1,
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => {
          xEl.style.zIndex = "";
          xEl.style.filter = "";
        }
      }, i * segmentDuration * 0.8 + 0.2);
    });

    // 动画结束后保持 X2-X6 区间可见
    timeline.call(() => {
      dataGraphicEl.style.clipPath = `inset(0px ${finalRightClip}px 0px ${leftBound}px)`;
    }, [], duration);

    // 动画结束后重置并重复
    timeline.call(() => {
      currentRepeat++;
      if (currentRepeat < REPEAT_COUNT) {
        // 重置状态
        resetTrend1State();
        // 延迟后继续
        gsap.delayedCall(1.5, runTrend1);
      } else {
        // 完成，清理
        resetTrend1State();
        currentRepeat = 0;
        console.log('trend1 completed all repeats');
      }
    });
  }

  function resetTrend1State() {
    dataGraphicEl.style.clipPath = "";
    xPositions.forEach(xPos => {
      xPos.element.style.zIndex = "";
      xPos.element.style.filter = "";
      xPos.element.style.transform = "";
    });
  }

  runTrend1();
  return null;
}

// ==========================
// 2️⃣ trend2: 视觉元素沿计算路径移动 + G线逐渐绘制
// ==========================
function trend2(canvasId, lineGroupIds, xGroupIds, duration, numScanLines, zoomScale) {
  canvasId = canvasId || "canvas";
  lineGroupIds = Array.isArray(lineGroupIds) ? lineGroupIds : [];
  xGroupIds = Array.isArray(xGroupIds) ? xGroupIds : [];
  duration = duration || 2;
  numScanLines = numScanLines || 30;
  zoomScale = zoomScale || 2;

  const canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn("Canvas not found");

  // 获取 line 元素
  const lineEls = lineGroupIds.map(gid =>
    canvas.querySelector(`.element[data-group="${gid}"][data-type="data_graphic"]`)
  ).filter(Boolean);
  if (lineEls.length === 0) return console.warn("未找到 data_graphic 元素");

  // 获取 visual 元素
  const visualEl = canvas.querySelector(`.element[data-group="${lineGroupIds[0]}"][data-type="visual"]`);
  if (!visualEl) return console.warn("未找到 visual 元素");

  // 保存 visual 原始样式（在动画开始前）
  const origVisualLeft = visualEl.style.left || visualEl.offsetLeft + "px";
  const origVisualTop = visualEl.style.top || visualEl.offsetTop + "px";
  const origVisualPos = visualEl.style.position || "absolute";
  const origVisualZIndex = visualEl.style.zIndex || "10";

  console.log('Saving original visual position:', { origVisualLeft, origVisualTop, origVisualPos, origVisualZIndex });

  // 获取 X 轴元素
  const xElements = xGroupIds.map(xid =>
    canvas.querySelector(`.element[data-group="${xid}"]`)
  ).filter(Boolean);
  if (xElements.length < 2) return console.warn("trend2 需要至少 2 个 X 轴元素");

  const REPEAT_COUNT = 3;
  let currentRepeat = 0;

  function resetTrend2State() {
    console.log('resetTrend2State called, restoring visual to:', origVisualLeft, origVisualTop);
    // 清理 SVG 层
    const svgLayers = canvas.querySelectorAll('svg.linechart-anim-layer');
    svgLayers.forEach(svg => svg.remove());

    // 恢复 visual 原始位置
    visualEl.style.left = origVisualLeft;
    visualEl.style.top = origVisualTop;
    visualEl.style.position = origVisualPos;
    visualEl.style.zIndex = origVisualZIndex;
    visualEl.style.opacity = "";

    console.log('Visual restored, current position:', visualEl.style.left, visualEl.style.top);

    // 恢复 canvas transform
    canvas.style.transform = "";
    canvas.style.scale = "";
    canvas.style.x = "";
    canvas.style.y = "";

    // 恢复其他线透明度
    const allLines = canvas.querySelectorAll(".element[data-type='data_graphic']");
    gsap.to(allLines, { opacity: 1, duration: 0.3 });
  }

  function runTrend2() {
    console.log(`trend2 repeat ${currentRepeat + 1}/${REPEAT_COUNT}`);
    resetTrend2State();

    // 创建 SVG 层
    const svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.assign(svgLayer.style, {
      position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
      zIndex: 9999, pointerEvents: "none", overflow: "visible"
    });
    svgLayer.classList.add("linechart-anim-layer");
    canvas.appendChild(svgLayer);

    // 其他 G 组淡出
    const allLines = Array.from(canvas.querySelectorAll(".element[data-type='data_graphic'][data-segmentation]"));
    const fadeOthers = allLines.filter(el => !lineGroupIds.includes(el.dataset.group));
    gsap.to(fadeOthers, { opacity: 0.25, duration: 0.6, ease: "power2.out" });

    const hitPoints = [];

    // 检测 X 位置对应的线上的点
    xElements.forEach((xEl, i) => {
      const xCenter = xEl.offsetLeft + xEl.offsetWidth / 2;
      const xTop = xEl.offsetTop;
      const scanFrom = xTop + xEl.offsetHeight;
      let hitY = null;

      lineEls.forEach(g => {
        try {
          const seg = JSON.parse(g.dataset.segmentation);
          if (Array.isArray(seg) && seg.length && Array.isArray(seg[0])) {
            const polygon = seg[0];
            const polyXs = polygon.map(p => p[0]);
            const polyMinX = Math.min(...polyXs), polyMaxX = Math.max(...polyXs);

            if (xCenter < polyMinX || xCenter > polyMaxX) return;

            const polyYs = polygon.map(p => p[1]);
            const polyMinY = Math.min(...polyYs), polyMaxY = Math.max(...polyYs);
            const startY = Math.min(scanFrom, polyMaxY);
            const endY = Math.max(0, polyMinY);

            const step = 5;
            let foundY = null;
            for (let y = startY; y >= endY; y -= step) {
              if (pointInPolygon([xCenter, y], polygon)) {
                foundY = y;
                break;
              }
            }
            if (foundY !== null) {
              for (let y = foundY; y <= foundY + step && y <= startY; y += 1) {
                if (pointInPolygon([xCenter, y], polygon)) {
                  hitY = y;
                  break;
                }
              }
            }
          }
        } catch (err) {}
      });

      if (hitY) {
        let lineY = hitY;
        try {
          const seg = JSON.parse(lineEls[0].dataset.segmentation || "[]");
          if (Array.isArray(seg[0])) seg = seg[0];
          const segWidth = Math.max(...seg.map(p => p[0])) - Math.min(...seg.map(p => p[0]));
          const tolerance = segWidth / 30;
          const pointsAtX = seg.filter(p => Math.abs(p[0] - xCenter) < tolerance);
          if (pointsAtX.length) {
            lineY = pointsAtX.reduce((sum, p) => sum + p[1], 0) / pointsAtX.length;
          }
        } catch(e) {}
        hitPoints.push({ x: xCenter, y: lineY });
      }
    });

    if (hitPoints.length < 2) {
      gsap.to(fadeOthers, { opacity: 1, duration: 0.6 });
      return console.warn("检测点不足");
    }

    // 计算路径
    const minX = Math.min(...hitPoints.map(p => p.x));
    const maxX = Math.max(...hitPoints.map(p => p.x));

    let seg = JSON.parse(lineEls[0].dataset.segmentation || "[]");
    if (Array.isArray(seg[0])) seg = seg[0];

    const xs = seg.map(p => p[0]);
    const segMinX = Math.min(...xs), segMaxX = Math.max(...xs);
    const segWidth = segMaxX - segMinX;

    const midline = [];
    for (let i = 0; i <= numScanLines; i++) {
      const t = i / numScanLines;
      const scanX = segMinX + t * segWidth;
      if (scanX < minX || scanX > maxX) continue;
      const pointsOnLine = seg.filter(p => Math.abs(p[0] - scanX) < segWidth / numScanLines);
      if (pointsOnLine.length) {
        const avgY = pointsOnLine.reduce((sum, p) => sum + p[1], 0) / pointsOnLine.length;
        midline.push({ x: scanX, y: avgY });
      }
    }

    if (midline.length < 2) {
      gsap.to(fadeOthers, { opacity: 1, duration: 0.6 });
      return console.warn("路径点不足");
    }

    const pathPoints = smoothPath(midline, 10);
    const lengths = [0];
    for (let i = 1; i < pathPoints.length; i++) {
      const dx = pathPoints[i].x - pathPoints[i - 1].x;
      const dy = pathPoints[i].y - pathPoints[i - 1].y;
      lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLength = lengths[lengths.length - 1];

    // 初始化 visual 位置
    visualEl.style.position = "absolute";
    visualEl.style.zIndex = 10000;
    const startPos = pathPoints[0];
    visualEl.style.left = `${startPos.x - visualEl.offsetWidth / 2}px`;
    visualEl.style.top = `${startPos.y - visualEl.offsetHeight / 2}px`;

    // visual 沿路径移动动画
    const moveTimeline = gsap.timeline();
    moveTimeline.to({ progress: 0 }, {
      progress: totalLength,
      duration: duration,
      ease: "power2.out",
      onUpdate: function () {
        const pos = getPointAtLength(pathPoints, lengths, this.targets()[0].progress);
        visualEl.style.left = `${pos.x - visualEl.offsetWidth / 2}px`;
        visualEl.style.top = `${pos.y - visualEl.offsetHeight / 2}px`;
      },
      onComplete: () => {
        gsap.to(fadeOthers, { opacity: 1, duration: 0.6, ease: "power2.inOut" });
      }
    });

    // 动画结束后重复
    moveTimeline.call(() => {
      currentRepeat++;
      if (currentRepeat < REPEAT_COUNT) {
        gsap.delayedCall(1.5, runTrend2);
      } else {
        resetTrend2State();
        currentRepeat = 0;
        console.log('trend2 completed all repeats');
      }
    });
  }

  runTrend2();
  return null;
}

// ==========================
// 导出（使用 line 专用命名空间）
// ==========================
window.lineTrend1 = trend1;
window.lineTrend2 = trend2;
window.lineRunAnimation = runAnimation;

/**
 * 随机运行 Trend 动画
 */
function runAnimation(canvasId = "canvas", groupIds = [], xGroupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    // 切换前先销毁旧动画
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    const animationOptions = ["trend1", "trend2"];
    const animationType = animationOptions[Math.floor(Math.random() * animationOptions.length)];

    switch (animationType) {
        case "trend1":
            trend1(canvasId, groupIds, xGroupIds);
            break;
        case "trend2":
            trend2(canvasId, groupIds, xGroupIds);
            break;
    }
}

window.runAnimation = runAnimation;