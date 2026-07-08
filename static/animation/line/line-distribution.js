function distribution1(canvasId = "canvas", groupIds = [], xGroupIds = [], zoomScale = 1.2) {
  console.log('=== distribution1 called ===');
  console.log('groupIds:', groupIds);
  console.log('xGroupIds:', xGroupIds);

  // 支持两种方式获取 canvas
  let canvas;
  if (canvasId === "animation-canvas") {
    canvas = document.querySelector("#animation-canvas .canvas");
  } else {
    canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn("Canvas not found, canvasId=" + canvasId);

  // 确保 groupIds 是数组
  const lineGroupIds = Array.isArray(groupIds) ? Array.from(groupIds) : [groupIds];

  const targetGroups = lineGroupIds.map(gid =>
    Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"][data-segmentation]`))
  ).flat();
  if (targetGroups.length === 0) return console.warn("未找到目标 line 组");

  const xGroupIdsArr = Array.isArray(xGroupIds) ? Array.from(xGroupIds) : (xGroupIds ? Array.from(xGroupIds) : []);

  let xElements = xGroupIdsArr.length > 0
    ? xGroupIdsArr.map(xid =>
        Array.from(canvas.querySelectorAll(`.element[data-group="${xid}"]`))
      ).flat()
    : [];

  // 如果没有找到 X 轴元素，自动查找 X 开头的元素
  if (xElements.length === 0) {
    xElements = Array.from(canvas.querySelectorAll('.element[data-group^="X"]'));
  }

  // 如果传入了 X2, X6 这样的范围，自动填充中间的 X3, X4, X5
  if (xGroupIdsArr.length >= 2) {
    const allXInCanvas = Array.from(canvas.querySelectorAll('.element[data-group^="X"]'));
    const indices = xGroupIdsArr.map(x => {
      const match = x.match(/X(\d+)/);
      return match ? parseInt(match[1]) : null;
    }).filter(i => i !== null).sort((a, b) => a - b);

    if (indices.length >= 2) {
      const minIdx = indices[0];
      const maxIdx = indices[indices.length - 1];
      xElements = allXInCanvas.filter(el => {
        const match = el.dataset.group.match(/X(\d+)/);
        if (!match) return false;
        const idx = parseInt(match[1]);
        return idx >= minIdx && idx <= maxIdx;
      }).sort((a, b) => {
        const aIdx = parseInt(a.dataset.group.match(/X(\d+)/)[1]);
        const bIdx = parseInt(b.dataset.group.match(/X(\d+)/)[1]);
        return aIdx - bIdx;
      });
    }
  }

  if (xElements.length === 0) return console.warn("未找到 X 轴元素");

  // ✅ 只取左右端点
  const leftXEl = xElements[0];
  const rightXEl = xElements[xElements.length - 1];
  const endpointXElements = [leftXEl, rightXEl];
  console.log('Using endpoints:', leftXEl.dataset.group, rightXEl.dataset.group);

  let svgLayer = canvas.querySelector("svg.linechart-anim-layer");
  if (!svgLayer) {
    svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.assign(svgLayer.style, {
      position: "absolute",
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      zIndex: 1,
      pointerEvents: "none",
      overflow: "visible"
    });
    svgLayer.classList.add("linechart-anim-layer");
    canvas.appendChild(svgLayer);
  } else {
    svgLayer.innerHTML = "";
  }

  function pointInPolygon([x, y], vs) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const [xi, yi] = vs[i], [xj, yj] = vs[j];
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // 收集左右端点的数据 - 完全按照 value.js 逻辑
  const fillPoints = [];
  const scanFromList = [];

  endpointXElements.forEach((xEl, i) => {
    const xCenter = xEl.offsetLeft + xEl.offsetWidth / 2;
    const xTop = xEl.offsetTop;
    const scanFrom = xTop - 15;

    console.log(`Endpoint ${i}: xCenter=${xCenter}, xTop=${xTop}, scanFrom=${scanFrom}`);

    let hitY = null;
    targetGroups.forEach(g => {
      try {
        const seg = JSON.parse(g.dataset.segmentation);
        if (Array.isArray(seg) && seg.length && Array.isArray(seg[0])) {
          const polygon = seg[0];
          for (let y = scanFrom; y > 0; y -= 1) {
            if (pointInPolygon([xCenter, y], polygon)) {
              hitY = y;
              break;
            }
          }
        }
      } catch (err) {
        console.warn("Segmentation parse error:", err);
      }
    });
    console.log(`  hitY: ${hitY}`);
    if (!hitY) return;

    fillPoints.push([xCenter, hitY]);
    scanFromList.push([xCenter, scanFrom]);
  });

  if (fillPoints.length < 2) return console.warn("左右端点都未找到交点");

  // ✅ 绘制 polygon（用 fillPoints 和 scanFromList）
  // 顶部：从左到右的交点
  const topLinePoints = fillPoints.map(p => p.join(","));
  // 底部：从右到左的扫描起点
  const bottomLinePoints = scanFromList.slice().reverse().map(p => p.join(","));
  const polygonPoints = [...topLinePoints, ...bottomLinePoints].join(" ");
  console.log('polygonPoints:', polygonPoints);

  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute("points", polygonPoints);
  polygon.setAttribute("fill", "rgba(255,210,0,0.3)");
  polygon.setAttribute("opacity", 0);
  svgLayer.appendChild(polygon);

  // 计算填充区域中心
  const topY = Math.min(...fillPoints.map(p => p[1]));
  const bottomY = Math.max(...scanFromList.map(p => p[1]));
  const fillCenterX = fillPoints.reduce((sum, p) => sum + p[0], 0) / fillPoints.length;
  const fillCenterY = topY + (bottomY - topY) * 0.6;

  // visual 元素
  const visualEl = Array.from(canvas.querySelectorAll(`.element[data-group="${lineGroupIds[0]}"][data-type="visual"]`))[0];
  let origVisualLeft = "", origVisualTop = "", origVisualPos = "", origVisualZIndex = "", origVisualDisplay = "";
  if (visualEl) {
    origVisualLeft = visualEl.style.left;
    origVisualTop = visualEl.style.top;
    origVisualPos = visualEl.style.position;
    origVisualZIndex = visualEl.style.zIndex;
    origVisualDisplay = visualEl.style.display;
  }

  // 创建主 timeline
  const masterTimeline = gsap.timeline();

  // === 阶段1: 画竖线 ===
  endpointXElements.forEach((xEl, i) => {
    const xCenter = xEl.offsetLeft + xEl.offsetWidth / 2;
    const xTop = xEl.offsetTop;
    const scanFrom = scanFromList[i][1];
    const hitY = fillPoints[i][1];
    const originX = xCenter;
    const originY = xTop + xEl.offsetHeight / 2;

    // zoom-in
    masterTimeline.to(canvas, {
      scale: zoomScale,
      transformOrigin: `${originX}px ${originY}px`,
      duration: 0.6,
      ease: "power2.inOut"
    }, i * 0.1);

    // 画竖线
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", xCenter);
    line.setAttribute("x2", xCenter);
    line.setAttribute("y1", scanFrom);
    line.setAttribute("y2", scanFrom);
    line.setAttribute("stroke", "#ffd200");
    line.setAttribute("stroke-width", "4");
    line.setAttribute("stroke-dasharray", "10 6");
    line.setAttribute("opacity", "0.9");
    svgLayer.appendChild(line);

    masterTimeline.to(line, { attr: { y2: hitY }, duration: 1.2, ease: "power2.out" }, ">");

    // 小圆点
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", xCenter);
    dot.setAttribute("cy", hitY);
    dot.setAttribute("r", 0);
    dot.setAttribute("fill", "#ffd200");
    svgLayer.appendChild(dot);

    masterTimeline.to(dot, { attr: { r: 6 }, duration: 0.3, ease: "back.out(1.7)" }, ">");

    // zoom-out
    masterTimeline.to(canvas, {
      scale: 1,
      transformOrigin: `${originX}px ${originY}px`,
      duration: 0.6,
      ease: "power2.inOut"
    }, ">");
  });

  // === 阶段2: polygon 渐显 ===
  masterTimeline.to(polygon, { opacity: 1, duration: 1.2, ease: "power2.out" }, "-=0.3");

  // === 阶段3: visual 移动到中心 ===
  if (visualEl) {
    const canvasCenterX = canvas.offsetWidth / 2;
    const canvasCenterY = canvas.offsetHeight / 2;

    visualEl.style.opacity = 0;
    visualEl.style.position = "absolute";
    visualEl.style.left = `${canvasCenterX - visualEl.offsetWidth / 2}px`;
    visualEl.style.top = `${canvasCenterY - visualEl.offsetHeight / 2}px`;
    visualEl.style.zIndex = 10000;
    visualEl.style.display = "block";
    visualEl.style.transform = "scale(0)";

    masterTimeline.to(visualEl, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" });
    masterTimeline.to(visualEl, {
      left: fillCenterX - visualEl.offsetWidth / 2,
      top: fillCenterY - visualEl.offsetHeight / 2,
      duration: 0.8,
      ease: "power2.inOut"
    });
  }

  // === 恢复所有状态 ===
  masterTimeline.call(() => {
    svgLayer.remove();
    canvas.style.transform = "";
    if (visualEl) {
      visualEl.style.opacity = "";
      visualEl.style.left = origVisualLeft;
      visualEl.style.top = origVisualTop;
      visualEl.style.position = origVisualPos;
      visualEl.style.zIndex = origVisualZIndex;
      visualEl.style.display = origVisualDisplay;
      visualEl.style.transform = "";
    }
  });

  // 重复3次
  const REPEAT_DELAY = 2;
  let repeatCount = 0;

  masterTimeline.eventCallback("onComplete", () => {
    repeatCount++;
    console.log(`distribution1 repeat ${repeatCount}/3`);
    if (repeatCount < 3) {
      gsap.delayedCall(REPEAT_DELAY, () => {
        // 重新创建 SVG
        svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        Object.assign(svgLayer.style, {
          position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
          zIndex: 1, pointerEvents: "none", overflow: "visible"
        });
        svgLayer.classList.add("linechart-anim-layer");
        canvas.appendChild(svgLayer);

        const newPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        newPolygon.setAttribute("points", polygonPoints);
        newPolygon.setAttribute("fill", "rgba(255,210,0,0.3)");
        newPolygon.setAttribute("opacity", 0);
        svgLayer.appendChild(newPolygon);

        const newTimeline = gsap.timeline();

        endpointXElements.forEach((xEl, i) => {
          const xCenter = xEl.offsetLeft + xEl.offsetWidth / 2;
          const xTop = xEl.offsetTop;
          const scanFrom = scanFromList[i][1];
          const hitY = fillPoints[i][1];
          const originX = xCenter;
          const originY = xTop + xEl.offsetHeight / 2;

          newTimeline.to(canvas, { scale: zoomScale, transformOrigin: `${originX}px ${originY}px`, duration: 0.6, ease: "power2.inOut" }, i * 0.1);

          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", xCenter); line.setAttribute("x2", xCenter);
          line.setAttribute("y1", scanFrom); line.setAttribute("y2", scanFrom);
          line.setAttribute("stroke", "#ffd200"); line.setAttribute("stroke-width", "4");
          line.setAttribute("stroke-dasharray", "10 6"); line.setAttribute("opacity", "0.9");
          svgLayer.appendChild(line);
          newTimeline.to(line, { attr: { y2: hitY }, duration: 1.2, ease: "power2.out" }, ">");

          const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("cx", xCenter); dot.setAttribute("cy", hitY);
          dot.setAttribute("r", 0); dot.setAttribute("fill", "#ffd200");
          svgLayer.appendChild(dot);
          newTimeline.to(dot, { attr: { r: 6 }, duration: 0.3, ease: "back.out(1.7)" }, ">");

          newTimeline.to(canvas, { scale: 1, transformOrigin: `${originX}px ${originY}px`, duration: 0.6, ease: "power2.inOut" }, ">");
        });

        newTimeline.to(newPolygon, { opacity: 1, duration: 1.2, ease: "power2.out" }, "-=0.3");

        if (visualEl) {
          const canvasCenterX = canvas.offsetWidth / 2;
          const canvasCenterY = canvas.offsetHeight / 2;
          visualEl.style.opacity = 0;
          visualEl.style.position = "absolute";
          visualEl.style.left = `${canvasCenterX - visualEl.offsetWidth / 2}px`;
          visualEl.style.top = `${canvasCenterY - visualEl.offsetHeight / 2}px`;
          visualEl.style.zIndex = 10000;
          visualEl.style.display = "block";
          visualEl.style.transform = "scale(0)";

          newTimeline.to(visualEl, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" });
          newTimeline.to(visualEl, { left: fillCenterX - visualEl.offsetWidth / 2, top: fillCenterY - visualEl.offsetHeight / 2, duration: 0.8, ease: "power2.inOut" });
        }

        newTimeline.call(() => {
          svgLayer.remove();
          canvas.style.transform = "";
          if (visualEl) {
            visualEl.style.opacity = "";
            visualEl.style.left = origVisualLeft;
            visualEl.style.top = origVisualTop;
            visualEl.style.position = origVisualPos;
            visualEl.style.zIndex = origVisualZIndex;
            visualEl.style.display = origVisualDisplay;
            visualEl.style.transform = "";
          }
        });

        newTimeline.play();
      });
    } else {
      console.log('distribution1 completed all 3 repeats');
      repeatCount = 0;
    }
  });

  masterTimeline.play();
  window._currentMasterTimeline = masterTimeline;
}

// distribution2: 背景矩形效果（不画线），左右端点 X 轴元素确定范围
function distribution2(canvasId = "canvas", groupIds = [], xGroupIds = [], zoomScale = 1.2) {
  console.log('=== distribution2 called ===');
  console.log('groupIds:', groupIds);
  console.log('xGroupIds:', xGroupIds);

  // 支持两种方式获取 canvas
  let canvas;
  if (canvasId === "animation-canvas") {
    canvas = document.querySelector("#animation-canvas .canvas");
  } else {
    canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn("Canvas not found, canvasId=" + canvasId);

  const lineGroupIds = Array.isArray(groupIds) ? Array.from(groupIds) : [groupIds];

  const targetGroups = lineGroupIds.map(gid =>
    Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"][data-segmentation]`))
  ).flat();
  if (targetGroups.length === 0) return console.warn("未找到目标 line 组");

  const xGroupIdsArr = Array.isArray(xGroupIds) ? Array.from(xGroupIds) : (xGroupIds ? Array.from(xGroupIds) : []);

  let xElements = xGroupIdsArr.length > 0
    ? xGroupIdsArr.map(xid =>
        Array.from(canvas.querySelectorAll(`.element[data-group="${xid}"]`))
      ).flat()
    : [];

  if (xElements.length === 0) {
    xElements = Array.from(canvas.querySelectorAll('.element[data-group^="X"]'));
  }

  // 如果传入了范围，自动填充中间的 X 元素
  if (xGroupIdsArr.length >= 2) {
    const allXInCanvas = Array.from(canvas.querySelectorAll('.element[data-group^="X"]'));
    const indices = xGroupIdsArr.map(x => {
      const match = x.match(/X(\d+)/);
      return match ? parseInt(match[1]) : null;
    }).filter(i => i !== null).sort((a, b) => a - b);

    if (indices.length >= 2) {
      const minIdx = indices[0];
      const maxIdx = indices[indices.length - 1];
      xElements = allXInCanvas.filter(el => {
        const match = el.dataset.group.match(/X(\d+)/);
        if (!match) return false;
        const idx = parseInt(match[1]);
        return idx >= minIdx && idx <= maxIdx;
      }).sort((a, b) => {
        const aIdx = parseInt(a.dataset.group.match(/X(\d+)/)[1]);
        const bIdx = parseInt(b.dataset.group.match(/X(\d+)/)[1]);
        return aIdx - bIdx;
      });
    }
  }

  if (xElements.length === 0) return console.warn("未找到 X 轴元素");

  // ✅ 只取左右端点
  const leftXEl = xElements[0];
  const rightXEl = xElements[xElements.length - 1];
  console.log('Using endpoints:', leftXEl.dataset.group, rightXEl.dataset.group);

  let svgLayer = canvas.querySelector("svg.linechart-anim-layer");
  if (!svgLayer) {
    svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.assign(svgLayer.style, {
      position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
      zIndex: 1, pointerEvents: "none", overflow: "visible"
    });
    svgLayer.classList.add("linechart-anim-layer");
    canvas.appendChild(svgLayer);
  } else {
    svgLayer.innerHTML = "";
  }

  function pointInPolygon([x, y], vs) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const [xi, yi] = vs[i], [xj, yj] = vs[j];
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // 计算左右端点的背景矩形范围
  const leftXCenter = leftXEl.offsetLeft + leftXEl.offsetWidth / 2;
  const rightXCenter = rightXEl.offsetLeft + rightXEl.offsetWidth / 2;
  const leftXTop = leftXEl.offsetTop;
  const rightXTop = rightXEl.offsetTop;
  const scanFromLeft = leftXTop - 15;
  const scanFromRight = rightXTop - 15;

  let hitYLeft = null, hitYRight = null;

  targetGroups.forEach(g => {
    try {
      const seg = JSON.parse(g.dataset.segmentation);
      if (Array.isArray(seg) && seg.length && Array.isArray(seg[0])) {
        const polygon = seg[0];
        for (let y = scanFromLeft; y > 0; y -= 1) {
          if (pointInPolygon([leftXCenter, y], polygon)) {
            hitYLeft = y;
            break;
          }
        }
        for (let y = scanFromRight; y > 0; y -= 1) {
          if (pointInPolygon([rightXCenter, y], polygon)) {
            hitYRight = y;
            break;
          }
        }
      }
    } catch (err) {
      console.warn("Segmentation parse error:", err);
    }
  });

  console.log('hitYLeft:', hitYLeft, 'hitYRight:', hitYRight);
  if (!hitYLeft || !hitYRight) return console.warn("左右端点未找到交点");

  // 计算背景矩形参数
  const minX = Math.min(leftXCenter, rightXCenter);
  const maxX = Math.max(leftXCenter, rightXCenter);
  const minY = Math.min(hitYLeft, hitYRight) - 10;
  const maxY = Math.max(hitYLeft, hitYRight) + 10;
  const rectWidth = maxX - minX;
  const rectHeight = maxY - minY;

  // 创建背景矩形
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", minX);
  rect.setAttribute("y", minY);
  rect.setAttribute("width", rectWidth);
  rect.setAttribute("height", rectHeight);
  rect.setAttribute("fill", "rgba(255,210,0,0.3)");
  rect.setAttribute("rx", 8);
  rect.setAttribute("opacity", 0);
  svgLayer.appendChild(rect);

  // visual 元素
  const visualEl = Array.from(canvas.querySelectorAll(`.element[data-group="${lineGroupIds[0]}"][data-type="visual"]`))[0];
  let origVisualLeft = "", origVisualTop = "", origVisualPos = "", origVisualZIndex = "", origVisualDisplay = "";
  if (visualEl) {
    origVisualLeft = visualEl.style.left;
    origVisualTop = visualEl.style.top;
    origVisualPos = visualEl.style.position;
    origVisualZIndex = visualEl.style.zIndex;
    origVisualDisplay = visualEl.style.display;
  }

  // 背景矩形中心
  const rectCenterX = minX + rectWidth / 2;
  const rectCenterY = minY + rectHeight / 2;

  // 创建主 timeline
  const masterTimeline = gsap.timeline();

  // === 阶段1: zoom-in ===
  const originX = rectCenterX;
  const originY = rectCenterY;
  masterTimeline.to(canvas, {
    scale: zoomScale,
    transformOrigin: `${originX}px ${originY}px`,
    duration: 0.6,
    ease: "power2.inOut"
  });

  // === 阶段2: 背景矩形渐显 ===
  masterTimeline.to(rect, { opacity: 1, duration: 1.2, ease: "power2.out" }, "-=0.3");

  // === 阶段3: visual 移动到矩形中心 ===
  if (visualEl) {
    const canvasCenterX = canvas.offsetWidth / 2;
    const canvasCenterY = canvas.offsetHeight / 2;

    visualEl.style.opacity = 0;
    visualEl.style.position = "absolute";
    visualEl.style.left = `${canvasCenterX - visualEl.offsetWidth / 2}px`;
    visualEl.style.top = `${canvasCenterY - visualEl.offsetHeight / 2}px`;
    visualEl.style.zIndex = 10000;
    visualEl.style.display = "block";
    visualEl.style.transform = "scale(0)";

    masterTimeline.to(visualEl, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" });
    masterTimeline.to(visualEl, {
      left: rectCenterX - visualEl.offsetWidth / 2,
      top: rectCenterY - visualEl.offsetHeight / 2,
      duration: 0.8,
      ease: "power2.inOut"
    });
  }

  // === 阶段4: zoom-out ===
  masterTimeline.to(canvas, {
    scale: 1,
    transformOrigin: `${originX}px ${originY}px`,
    duration: 0.6,
    ease: "power2.inOut"
  }, "+=0.5");

  // === 恢复所有状态 ===
  masterTimeline.call(() => {
    svgLayer.remove();
    canvas.style.transform = "";
    if (visualEl) {
      visualEl.style.opacity = "";
      visualEl.style.left = origVisualLeft;
      visualEl.style.top = origVisualTop;
      visualEl.style.position = origVisualPos;
      visualEl.style.zIndex = origVisualZIndex;
      visualEl.style.display = origVisualDisplay;
      visualEl.style.transform = "";
    }
  });

  // 重复3次
  const REPEAT_DELAY = 2;
  let repeatCount = 0;

  masterTimeline.eventCallback("onComplete", () => {
    repeatCount++;
    console.log(`distribution2 repeat ${repeatCount}/3`);
    if (repeatCount < 3) {
      gsap.delayedCall(REPEAT_DELAY, () => {
        // 重新创建 SVG
        svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        Object.assign(svgLayer.style, {
          position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
          zIndex: 1, pointerEvents: "none", overflow: "visible"
        });
        svgLayer.classList.add("linechart-anim-layer");
        canvas.appendChild(svgLayer);

        const newRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        newRect.setAttribute("x", minX);
        newRect.setAttribute("y", minY);
        newRect.setAttribute("width", rectWidth);
        newRect.setAttribute("height", rectHeight);
        newRect.setAttribute("fill", "rgba(255,210,0,0.3)");
        newRect.setAttribute("rx", 8);
        newRect.setAttribute("opacity", 0);
        svgLayer.appendChild(newRect);

        const newTimeline = gsap.timeline();

        newTimeline.to(canvas, { scale: zoomScale, transformOrigin: `${originX}px ${originY}px`, duration: 0.6, ease: "power2.inOut" });
        newTimeline.to(newRect, { opacity: 1, duration: 1.2, ease: "power2.out" }, "-=0.3");

        if (visualEl) {
          const canvasCenterX = canvas.offsetWidth / 2;
          const canvasCenterY = canvas.offsetHeight / 2;
          visualEl.style.opacity = 0;
          visualEl.style.position = "absolute";
          visualEl.style.left = `${canvasCenterX - visualEl.offsetWidth / 2}px`;
          visualEl.style.top = `${canvasCenterY - visualEl.offsetHeight / 2}px`;
          visualEl.style.zIndex = 10000;
          visualEl.style.display = "block";
          visualEl.style.transform = "scale(0)";

          newTimeline.to(visualEl, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" });
          newTimeline.to(visualEl, {
            left: rectCenterX - visualEl.offsetWidth / 2,
            top: rectCenterY - visualEl.offsetHeight / 2,
            duration: 0.8,
            ease: "power2.inOut"
          });
        }

        newTimeline.to(canvas, { scale: 1, transformOrigin: `${originX}px ${originY}px`, duration: 0.6, ease: "power2.inOut" }, "+=0.5");

        newTimeline.call(() => {
          svgLayer.remove();
          canvas.style.transform = "";
          if (visualEl) {
            visualEl.style.opacity = "";
            visualEl.style.left = origVisualLeft;
            visualEl.style.top = origVisualTop;
            visualEl.style.position = origVisualPos;
            visualEl.style.zIndex = origVisualZIndex;
            visualEl.style.display = origVisualDisplay;
            visualEl.style.transform = "";
          }
        });

        newTimeline.play();
      });
    } else {
      console.log('distribution2 completed all 3 repeats');
      repeatCount = 0;
    }
  });

  masterTimeline.play();
  window._currentMasterTimeline = masterTimeline;
}

window.distribution1 = distribution1;
window.distribution2 = distribution2;

function lineRunAnimation(canvasId = "canvas", groupIds = [], xGroupIds = []) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

  if (typeof window.destroyCurrentAnimation === "function") {
    window.destroyCurrentAnimation(canvasId);
  }

  const animationOptions = ["distribution1", "distribution2"];
  const animationType = animationOptions[Math.floor(Math.random() * animationOptions.length)];
  console.log('Selected animation:', animationType);

  switch (animationType) {
    case "distribution1":
      distribution1(canvasId, groupIds, xGroupIds);
      break;
    case "distribution2":
      distribution2(canvasId, groupIds, xGroupIds);
      break;
  }
}


window.lineRunAnimation = lineRunAnimation;