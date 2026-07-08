function difference1(canvasId = "canvas", groupIds = [], xGroupIds = []) {
  // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
  let canvas;
  if (canvasId === "animation-canvas") {
      canvas = document.querySelector("#animation-canvas .canvas");
  } else {
      canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn("Canvas not found");

  const lineGroupIds = groupIds;

  // 获取所有元素
  const allElements = Array.from(canvas.querySelectorAll(".element"));

  // 获取 lineGroup 对应元素
  const targetGroups = lineGroupIds.map(gid =>
    Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"][data-segmentation]`))
  ).flat();
  if (targetGroups.length === 0) return console.warn("未找到目标 line 组");

  // 获取 X 元素
  const xElements = xGroupIds.map(xid =>
    Array.from(canvas.querySelectorAll(`.element[data-group="${xid}"]`))
  ).flat();
  if (xElements.length === 0) return console.warn("未找到 X 轴元素");

  // 保存原始样式（用于重复时恢复）
  const origStyles = allElements.map(el => ({
    el,
    opacity: el.style.opacity,
    display: el.style.display
  }));

  // 判断点是否在多边形内
  function pointInPolygon([x, y], vs) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const [xi, yi] = vs[i], [xj, yj] = vs[j];
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // 创建 SVG 层
  let svgLayer = canvas.querySelector("svg.ripple-layer");
  if (svgLayer) svgLayer.remove();
  svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(svgLayer.style, {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    zIndex: 9999,
    pointerEvents: "none",
    overflow: "visible"
  });
  svgLayer.classList.add("ripple-layer");
  canvas.appendChild(svgLayer);

  // 隐藏其他 G 组元素，但保留 X 组
  allElements.forEach(el => {
    const gid = el.dataset.group;
    if (!lineGroupIds.includes(gid) && !gid.startsWith("X")) {
      el.style.display = "none";
      el.style.opacity = 0;
    } else if (gid.startsWith("X")) {
      el.style.display = "block";
      el.style.opacity = 1;
    }
  });

  // ========== 创建动画内容函数 ==========
  function buildDifference1Animation() {
    const timeline = gsap.timeline();

    xElements.forEach((xEl, i) => {
      const xCenter = xEl.offsetLeft + xEl.offsetWidth / 2;
      const xTop = xEl.offsetTop;
      const scanFrom = xTop - 15;

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
        } catch (err) {}
      });
      if (!hitY) return;

      const delay = i * 0.4;

      // 小圆点
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", xCenter);
      dot.setAttribute("cy", hitY);
      dot.setAttribute("r", 6);
      dot.setAttribute("fill", "rgba(0,150,255,1)");
      dot.setAttribute("stroke", "rgba(0,100,255,1)");
      dot.setAttribute("stroke-width", 2);
      svgLayer.appendChild(dot);

      // ripple 扩散
      const ripple = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      ripple.setAttribute("cx", xCenter);
      ripple.setAttribute("cy", hitY);
      ripple.setAttribute("r", 0);
      ripple.setAttribute("stroke", "rgba(0,150,255,1)");
      ripple.setAttribute("stroke-width", 3);
      ripple.setAttribute("fill", "rgba(0,150,255,0.3)");
      svgLayer.appendChild(ripple);

      timeline.to(ripple, {
        r: 25,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        onComplete: () => ripple.remove()
      }, delay + 0.1);

      // 克隆 X 元素
      const clone = xEl.cloneNode(true);
      canvas.appendChild(clone);
      clone.style.position = "absolute";
      clone.style.left = `${xCenter - xEl.offsetWidth / 2}px`;
      clone.style.top = `${hitY - xEl.offsetHeight - 10}px`;
      clone.style.opacity = 0;
      clone.style.transform = "scale(0.6)";
      clone.style.zIndex = 10000;

      timeline.to(clone, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.7)"
      }, delay + 0.2);

      xEl.style.display = "block";
      xEl.style.opacity = 1;
    });

    return timeline;
  }

  // ========== 运行一次动画 ==========
  function runOnce() {
    // 清理并重建 SVG
    if (svgLayer.parentNode) svgLayer.remove();
    svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.assign(svgLayer.style, {
      position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
      zIndex: 9999, pointerEvents: "none", overflow: "visible"
    });
    svgLayer.classList.add("ripple-layer");
    canvas.appendChild(svgLayer);

    // 恢复原始样式
    origStyles.forEach(({ el, opacity, display }) => {
      el.style.opacity = opacity;
      el.style.display = display;
    });

    const timeline = buildDifference1Animation();
    timeline.eventCallback("onComplete", () => {
      repeatCount++;
      console.log(`difference1 repeat ${repeatCount}/3`);
      if (repeatCount < 3) {
        gsap.delayedCall(REPEAT_DELAY, runOnce);
      } else {
        console.log('difference1 completed all 3 repeats');
        repeatCount = 0;
        origStyles.forEach(({ el, opacity, display }) => {
          el.style.opacity = opacity;
          el.style.display = display;
        });
      }
    });
    timeline.play();
    window._currentMasterTimeline = timeline;
  }

  // ========== 主 timeline ==========
  const REPEAT_DELAY = 2;
  let repeatCount = 0;
  runOnce();
}

function difference2(canvasId = "canvas", groupIds = [], xGroupIds = [], duration = 2, numScanLines = 30, zoomScale = 2) {
  console.log('=== difference2 called ===');
  console.log('groupIds:', groupIds);
  console.log('xGroupIds:', xGroupIds);

  let canvas;
  if (canvasId === "animation-canvas") {
    canvas = document.querySelector("#animation-canvas .canvas");
  } else {
    canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn("Canvas not found");

  const lineGroupIds = Array.isArray(groupIds) ? groupIds : [groupIds];

  // 查找 line 元素
  const lineEls = lineGroupIds.map(gid =>
    Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"][data-segmentation]`))
  ).flat();
  if (lineEls.length === 0) return console.warn("未找到目标 line 组");

  const visualEl = canvas.querySelector(`.element[data-group="${lineGroupIds[0]}"][data-type="visual"]`);
  if (!visualEl) return console.warn("未找到 visual 元素");

  const xGroupIdsArr = Array.isArray(xGroupIds) ? xGroupIds : [xGroupIds];
  const xElementsAll = xGroupIdsArr.map(xid =>
    Array.from(canvas.querySelectorAll(`.element[data-group="${xid}"]`))
  ).flat();
  if (xElementsAll.length === 0) return console.warn("未找到 X 轴元素");

  // 去重
  const seenXCenters = new Set();
  const xElements = xElementsAll.filter(xEl => {
    const xCenter = xEl.offsetLeft + xEl.offsetWidth / 2;
    if (seenXCenters.has(xCenter)) return false;
    seenXCenters.add(xCenter);
    return true;
  });

  // 🌀 所有 line 元素
  const allLines = Array.from(canvas.querySelectorAll(".element[data-segmentation]"));

  // 多边形点判断函数
  function pointInPolygon([x, y], vs) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const [xi, yi] = vs[i], [xj, yj] = vs[j];
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // 保存 visual 原始样式
  const origVisualStyles = {
    position: visualEl.style.position,
    left: visualEl.style.left,
    top: visualEl.style.top,
    zIndex: visualEl.style.zIndex,
    opacity: visualEl.style.opacity,
    display: visualEl.style.display
  };

  // 保存其他 G 组原始样式
  const fadeOthers = allLines.filter(el => !lineGroupIds.includes(el.dataset.group));
  const origFadeOthersStyles = fadeOthers.map(el => ({
    el,
    opacity: el.style.opacity,
    display: el.style.display
  }));

  // 创建 SVG 层
  let svgLayer = canvas.querySelector("svg.linechart-anim-layer");
  if (svgLayer) svgLayer.remove();
  svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(svgLayer.style, {
    position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
    zIndex: 9999, pointerEvents: "none", overflow: "visible"
  });
  svgLayer.classList.add("linechart-anim-layer");
  canvas.appendChild(svgLayer);

  // ========== 运行一次动画 ==========
  function runOnce() {
    // 清理并重建 SVG
    if (svgLayer.parentNode) svgLayer.remove();
    svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.assign(svgLayer.style, {
      position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
      zIndex: 9999, pointerEvents: "none", overflow: "visible"
    });
    svgLayer.classList.add("linechart-anim-layer");
    canvas.appendChild(svgLayer);

    // 恢复 visual 原始样式
    visualEl.style.position = origVisualStyles.position;
    visualEl.style.left = origVisualStyles.left;
    visualEl.style.top = origVisualStyles.top;
    visualEl.style.zIndex = origVisualStyles.zIndex;
    visualEl.style.opacity = origVisualStyles.opacity;
    visualEl.style.display = origVisualStyles.display;

    // 恢复其他 G 组样式
    origFadeOthersStyles.forEach(({ el, opacity, display }) => {
      el.style.opacity = opacity;
      el.style.display = display;
    });

    // 让其他 G 组淡出
    gsap.to(fadeOthers, { opacity: 0.25, duration: 0.6, ease: "power2.out" });

    // 创建新 timeline
    const timeline = gsap.timeline();
    const hitPoints = [];

    xElements.forEach((xEl, i) => {
      const xCenter = xEl.offsetLeft + xEl.offsetWidth / 2;
      const xTop = xEl.offsetTop;
      const scanFrom = xTop - 15;
      let hitY = null;

      lineEls.forEach(g => {
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
        } catch (err) {}
      });

      if (hitY) {
        hitPoints.push({ x: xCenter, y: hitY });

        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", xCenter);
        dot.setAttribute("cy", hitY);
        dot.setAttribute("r", 0);
        dot.setAttribute("fill", "#ffd200");
        dot.setAttribute("stroke", "#ff9800");
        dot.setAttribute("stroke-width", 2);
        dot.setAttribute("opacity", "0.9");
        svgLayer.appendChild(dot);

        timeline.to(dot, { attr: { r: 6 }, duration: 0.3, ease: "back.out(1.7)" }, i * 0.15);
      }
    });

    if (hitPoints.length < 2) {
      console.warn("检测点不足，需要至少2个点");
      return;
    }

    const startPoint = hitPoints[0];
    const endPoint = hitPoints[hitPoints.length - 1];
    const totalLength = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));

    visualEl.style.position = "absolute";
    visualEl.style.zIndex = 10000;
    visualEl.style.opacity = 1;
    visualEl.style.display = "block";
    visualEl.style.left = `${startPoint.x - visualEl.offsetWidth / 2}px`;
    visualEl.style.top = `${startPoint.y - visualEl.offsetHeight / 2}px`;

    timeline.to({}, { duration: 1 });

    timeline.to({ progress: 0 }, {
      progress: totalLength,
      duration: duration,
      ease: "power2.out",
      onUpdate: function () {
        const currentProgress = this.targets()[0].progress;
        const ratio = currentProgress / totalLength;
        const currentX = startPoint.x + (endPoint.x - startPoint.x) * ratio;
        const currentY = startPoint.y + (endPoint.y - startPoint.y) * ratio;
        visualEl.style.left = `${currentX - visualEl.offsetWidth / 2}px`;
        visualEl.style.top = `${currentY - visualEl.offsetHeight / 2}px`;
      },
      onComplete: () => {
        gsap.to(fadeOthers, { opacity: 1, duration: 0.6, ease: "power2.inOut" });
      }
    });

    timeline.eventCallback("onComplete", () => {
      repeatCount++;
      console.log(`difference2 repeat ${repeatCount}/3`);
      if (repeatCount < 3) {
        gsap.delayedCall(REPEAT_DELAY, runOnce);
      } else {
        console.log('difference2 completed all 3 repeats');
        repeatCount = 0;
        // 恢复原始样式
        visualEl.style.position = origVisualStyles.position;
        visualEl.style.left = origVisualStyles.left;
        visualEl.style.top = origVisualStyles.top;
        visualEl.style.zIndex = origVisualStyles.zIndex;
        visualEl.style.opacity = origVisualStyles.opacity;
        visualEl.style.display = origVisualStyles.display;
        origFadeOthersStyles.forEach(({ el, opacity, display }) => {
          el.style.opacity = opacity;
          el.style.display = display;
        });
      }
    });

    timeline.play();
    window._currentMasterTimeline = timeline;
  }

  runOnce();
}

// difference3: 多个G组(D,V,T)，一个X轴
// 流程: Difference G(D,V,T) → staging → guide+fade in → ∅ → staging(G)
function difference3(canvasId = "canvas", groupIds = [], xGroupId = "", zoomScale = 1.2) {
  console.log('=== difference3 called ===');
  console.log('groupIds:', groupIds);
  console.log('xGroupId:', xGroupId);

  let canvas;
  if (canvasId === "animation-canvas") {
    canvas = document.querySelector("#animation-canvas .canvas");
  } else {
    canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn("Canvas not found");

  const lineGroupIds = Array.isArray(groupIds) ? groupIds : [groupIds];

  // difference3: 只有一个X组，多个G组
  if (lineGroupIds.length < 2) {
    return console.warn("difference3 需要多个G组，单个G组请用 difference1/difference2");
  }

  // 获取 X 元素（只支持单个 X 组）
  let xElements = [];
  if (xGroupId) {
    xElements = Array.from(canvas.querySelectorAll(`.element[data-group="${xGroupId}"]`));
  }
  if (xElements.length === 0) {
    xElements = Array.from(canvas.querySelectorAll('.element[data-group^="X"]'));
  }
  if (xElements.length === 0) return console.warn("未找到 X 轴元素");
  if (xElements.length > 1) {
    return console.warn("difference3 只支持单个X组，多个X组请用 difference1/difference2");
  }

  const xEl = xElements[0];

  // SVG 层
  let svgLayer = canvas.querySelector("svg.linechart-anim-layer");
  if (!svgLayer) {
    svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.assign(svgLayer.style, {
      position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
      zIndex: 9999, pointerEvents: "none", overflow: "visible"
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

  // 计算 X 元素坐标（用 offsetLeft，和 distribution/value 一样）
  const xCenter = xEl.offsetLeft + xEl.offsetWidth / 2;
  const xTop = xEl.offsetTop;
  const scanFrom = xTop - 15;

  // 获取所有 G 组的 line 元素
  const targetGroups = lineGroupIds.map(gid =>
    Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"][data-segmentation]`))
  ).flat();
  if (targetGroups.length === 0) return console.warn("未找到目标 line 组");

  // 找到每个 G 组与 X 轴的交点
  const hitYs = [];
  lineGroupIds.forEach(gid => {
    const els = Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"][data-segmentation]`));
    let hitY = null;
    els.forEach(el => {
      try {
        const seg = JSON.parse(el.dataset.segmentation);
        if (Array.isArray(seg) && seg.length && Array.isArray(seg[0])) {
          const polygon = seg[0];
          for (let y = scanFrom; y > 0; y -= 1) {
            if (pointInPolygon([xCenter, y], polygon)) {
              hitY = y;
              break;
            }
          }
        }
      } catch (err) {}
    });
    if (hitY !== null) hitYs.push({ gid, hitY });
  });

  if (hitYs.length === 0) return console.warn("未找到交点");

  // 按 hitY 从低到高排序（D, V, T 从下往上）
  hitYs.sort((a, b) => a.hitY - b.hitY);
  console.log('hitYs:', hitYs);

  // 保存原始样式
  const allGElements = lineGroupIds.flatMap(gid =>
    Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"]`))
  );
  const origStyles = allGElements.map(el => ({
    el,
    opacity: el.style.opacity,
    display: el.style.display
  }));

  // guide 元素
  const guideEl = Array.from(canvas.querySelectorAll(`.element[data-group="${lineGroupIds[0]}"][data-type="guide"]`))[0];
  let origGuideStyles = null;
  if (guideEl) {
    origGuideStyles = {
      opacity: guideEl.style.opacity,
      display: guideEl.style.display,
      left: guideEl.style.left,
      top: guideEl.style.top,
      position: guideEl.style.position,
      zIndex: guideEl.style.zIndex
    };
  }

  // 背景矩形中心（用于 zoom）
  const rectCenterX = xCenter;
  const rectCenterY = hitYs[Math.floor(hitYs.length / 2)].hitY;

  // ===== 创建主 timeline =====
  const masterTimeline = gsap.timeline();

  // Step 1: zoom-in
  masterTimeline.to(canvas, {
    scale: zoomScale,
    transformOrigin: `${rectCenterX}px ${rectCenterY}px`,
    duration: 0.6,
    ease: "power2.inOut"
  });

  // Step 2: Difference G(D,V,T) - 画竖线区分每条线
  hitYs.forEach((item, i) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", xCenter);
    line.setAttribute("x2", xCenter);
    line.setAttribute("y1", scanFrom);
    line.setAttribute("y2", scanFrom);
    line.setAttribute("stroke", "#ffd200");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-dasharray", "8 5");
    line.setAttribute("opacity", "0.9");
    svgLayer.appendChild(line);

    masterTimeline.to(line, {
      attr: { y2: item.hitY },
      duration: 0.8,
      ease: "power2.out"
    }, i === 0 ? ">" : ">-0.3");
  });

  // Step 3: staging - G组依次淡入（隐藏 → 显示）
  masterTimeline.call(() => {
    allGElements.forEach(el => el.style.opacity = "0");
  });

  hitYs.forEach((item, i) => {
    const gidEls = Array.from(canvas.querySelectorAll(`.element[data-group="${item.gid}"]`));
    masterTimeline.to(gidEls, {
      opacity: 1,
      duration: 0.6,
      ease: "power2.out"
    }, `>+0.4`);
  });

  // Step 4: guide + fade in
  if (guideEl) {
    guideEl.style.opacity = "0";
    guideEl.style.position = "absolute";
    guideEl.style.left = `${xCenter - guideEl.offsetWidth / 2}px`;
    guideEl.style.top = `${hitYs[0].hitY - guideEl.offsetHeight - 15}px`;
    guideEl.style.zIndex = 10000;
    guideEl.style.display = "block";

    masterTimeline.to(guideEl, {
      opacity: 1,
      duration: 0.8,
      ease: "power2.out"
    }, ">+0.3");
  }

  // Step 5: ∅ 停顿
  masterTimeline.to({}, { duration: 1.5 });

  // Step 6: staging(G) - G组淡出消失
  hitYs.forEach((item, i) => {
    const gidEls = Array.from(canvas.querySelectorAll(`.element[data-group="${item.gid}"]`));
    masterTimeline.to(gidEls, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.inOut"
    }, i === 0 ? ">" : ">-0.4");
  });

  // Step 7: zoom-out
  masterTimeline.to(canvas, {
    scale: 1,
    transformOrigin: `${rectCenterX}px ${rectCenterY}px`,
    duration: 0.6,
    ease: "power2.inOut"
  });

  // 清理
  masterTimeline.call(() => {
    svgLayer.remove();
    canvas.style.transform = "";
    origStyles.forEach(({ el, opacity, display }) => {
      el.style.opacity = opacity;
      el.style.display = display;
    });
    if (guideEl && origGuideStyles) {
      guideEl.style.opacity = origGuideStyles.opacity;
      guideEl.style.display = origGuideStyles.display;
      guideEl.style.left = origGuideStyles.left;
      guideEl.style.top = origGuideStyles.top;
      guideEl.style.position = origGuideStyles.position;
      guideEl.style.zIndex = origGuideStyles.zIndex;
    }
  });

  // 重复3次
  const REPEAT_DELAY = 2;
  let repeatCount = 0;

  masterTimeline.eventCallback("onComplete", () => {
    repeatCount++;
    console.log(`difference3 repeat ${repeatCount}/3`);
    if (repeatCount < 3) {
      gsap.delayedCall(REPEAT_DELAY, () => {
        // 重建 SVG
        svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        Object.assign(svgLayer.style, {
          position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
          zIndex: 9999, pointerEvents: "none", overflow: "visible"
        });
        svgLayer.classList.add("linechart-anim-layer");
        canvas.appendChild(svgLayer);

        const newTimeline = gsap.timeline();

        newTimeline.to(canvas, { scale: zoomScale, transformOrigin: `${rectCenterX}px ${rectCenterY}px`, duration: 0.6, ease: "power2.inOut" });

        hitYs.forEach((item, i) => {
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", xCenter); line.setAttribute("x2", xCenter);
          line.setAttribute("y1", scanFrom); line.setAttribute("y2", scanFrom);
          line.setAttribute("stroke", "#ffd200"); line.setAttribute("stroke-width", "3");
          line.setAttribute("stroke-dasharray", "8 5"); line.setAttribute("opacity", "0.9");
          svgLayer.appendChild(line);
          newTimeline.to(line, { attr: { y2: item.hitY }, duration: 0.8, ease: "power2.out" }, i === 0 ? ">" : ">-0.3");
        });

        allGElements.forEach(el => el.style.opacity = "0");
        hitYs.forEach((item, i) => {
          const gidEls = Array.from(canvas.querySelectorAll(`.element[data-group="${item.gid}"]`));
          newTimeline.to(gidEls, { opacity: 1, duration: 0.6, ease: "power2.out" }, `>+0.4`);
        });

        if (guideEl) {
          guideEl.style.opacity = "0";
          guideEl.style.position = "absolute";
          guideEl.style.left = `${xCenter - guideEl.offsetWidth / 2}px`;
          guideEl.style.top = `${hitYs[0].hitY - guideEl.offsetHeight - 15}px`;
          guideEl.style.zIndex = 10000;
          guideEl.style.display = "block";
          newTimeline.to(guideEl, { opacity: 1, duration: 0.8, ease: "power2.out" }, ">+0.3");
        }

        newTimeline.to({}, { duration: 1.5 });

        hitYs.forEach((item, i) => {
          const gidEls = Array.from(canvas.querySelectorAll(`.element[data-group="${item.gid}"]`));
          newTimeline.to(gidEls, { opacity: 0, duration: 0.5, ease: "power2.inOut" }, i === 0 ? ">" : ">-0.4");
        });

        newTimeline.to(canvas, { scale: 1, transformOrigin: `${rectCenterX}px ${rectCenterY}px`, duration: 0.6, ease: "power2.inOut" });

        newTimeline.call(() => {
          svgLayer.remove();
          canvas.style.transform = "";
          origStyles.forEach(({ el, opacity, display }) => {
            el.style.opacity = opacity;
            el.style.display = display;
          });
          if (guideEl && origGuideStyles) {
            guideEl.style.opacity = origGuideStyles.opacity;
            guideEl.style.display = origGuideStyles.display;
            guideEl.style.left = origGuideStyles.left;
            guideEl.style.top = origGuideStyles.top;
            guideEl.style.position = origGuideStyles.position;
            guideEl.style.zIndex = origGuideStyles.zIndex;
          }
        });

        newTimeline.play();
      });
    } else {
      console.log('difference3 completed all 3 repeats');
      repeatCount = 0;
    }
  });

  masterTimeline.play();
  window._currentMasterTimeline = masterTimeline;
}

// 随机运行 Difference 动画
function lineRunAnimation(canvasId = "canvas", groupIds = [], xGroupIds = []) {
  console.log('=== lineRunAnimation called ===');
  console.log('groupIds:', groupIds);
  console.log('xGroupIds:', xGroupIds);

  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

  // 切换前先销毁旧动画
  if (typeof window.destroyCurrentAnimation === "function") {
    window.destroyCurrentAnimation(canvasId);
  }

  const xGroupIdsArr = Array.isArray(xGroupIds) ? xGroupIds : [xGroupIds];
  const lineGroupIdsArr = Array.isArray(groupIds) ? groupIds : [groupIds];

  // 判断逻辑：
  // - 如果 X 组数量 > 1（多个X组）：选 difference1 或 difference2
  // - 如果 X 组数量 == 1 且 G 组数量 > 1（单个X多个G）：用 difference3
  if (xGroupIdsArr.length === 1 && lineGroupIdsArr.length > 1) {
    // 单个X组，多个G组 → difference3
    console.log('选择: difference3 (单个X组，多个G组)');
    difference3(canvasId, groupIds, xGroupIds[0]);
  } else if (xGroupIdsArr.length > 1) {
    // 多个X组 → difference1 或 difference2
    const choice = Math.random() < 0.5 ? "difference1" : "difference2";
    console.log(`选择: ${choice} (多个X组)`);
    if (choice === "difference1") {
      difference1(canvasId, groupIds, xGroupIds);
    } else {
      difference2(canvasId, groupIds, xGroupIds);
    }
  } else {
    // 单个X组，单个G组 → 默认 difference1
    console.log('选择: difference1 (默认，单个X组单个G组)');
    difference1(canvasId, groupIds, xGroupIds);
  }
}

window.difference1 = difference1;
window.difference2 = difference2;
window.difference3 = difference3;
window.lineRunAnimation = lineRunAnimation;
window.runAnimation = lineRunAnimation;
