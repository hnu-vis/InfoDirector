function value1(canvasId = "canvas", groupIds = [], xGroupIds = [], zoomScale = 1.1) {
  console.log('=== value1 called ===');
  console.log('groupIds:', groupIds);
  console.log('xGroupIds:', xGroupIds);

  // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
  let canvas;
  if (canvasId === "animation-canvas") {
      canvas = document.querySelector("#animation-canvas .canvas");
  } else {
      canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn("Canvas not found, canvasId=" + canvasId);

  // 确保 groupIds 是数组
  const lineGroupIds = Array.isArray(groupIds) ? groupIds : [groupIds];
  console.log('lineGroupIds after check:', lineGroupIds);

  const targetGroups = lineGroupIds.map(gid =>
    Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"][data-segmentation]`))
  ).flat();
  console.log('targetGroups found:', targetGroups.length);
  if (targetGroups.length === 0) return console.warn("未找到目标 line 组");

  const xGroupIdsArr = Array.isArray(xGroupIds) ? xGroupIds : (xGroupIds ? Array.from(xGroupIds) : []);
  console.log('xGroupIdsArr:', xGroupIdsArr);

  let xElements = xGroupIdsArr.length > 0
    ? xGroupIdsArr.map(xid =>
        Array.from(canvas.querySelectorAll(`.element[data-group="${xid}"]`))
      ).flat()
    : [];

  console.log('xElements found before auto-search:', xElements.length);

  // 如果没有找到 X 轴元素，自动查找 X 开头的元素
  if (xElements.length === 0) {
    xElements = Array.from(canvas.querySelectorAll('.element[data-group^="X"]'));
    console.log('xElements found after auto-search:', xElements.length);
  }
  if (xElements.length === 0) return console.warn("未找到 X 轴元素");

  let svgLayer = canvas.querySelector("svg.linechart-anim-layer");
  if (!svgLayer) {
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

  xElements.forEach((xEl, i) => {
    // 用 offsetLeft/offsetWidth 直接计算，相对 canvas 的坐标
    const xCenter = xEl.offsetLeft + xEl.offsetWidth / 2;
    const xTop = xEl.offsetTop;
    const scanFrom = xTop - 15;

    console.log('value1 xCenter:', xCenter, 'xTop:', xTop, 'scanFrom:', scanFrom);

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
    console.log('value1 hitY:', hitY);
    if (!hitY) return;

    const timeline = gsap.timeline({ delay: i * 0.15 });

    // 记录 transformOrigin
    const originX = xCenter;
    const originY = xTop + xEl.offsetHeight / 2;

    // 1️⃣ zoom-in
    timeline.to(canvas, {
      scale: zoomScale,
      transformOrigin: `${originX}px ${originY}px`,
      duration: 0.6,
      ease: "power2.inOut"
    });

    // 2️⃣ 画竖线
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

    timeline.to(line, {
      attr: { y2: hitY },
      duration: 1.2,
      ease: "power2.out"
    }, ">");

    // 3️⃣ 小圆点
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", xCenter);
    dot.setAttribute("cy", hitY);
    dot.setAttribute("r", 0);
    dot.setAttribute("fill", "#ffd200");
    svgLayer.appendChild(dot);

    timeline.to(dot, { attr: { r: 6 }, duration: 0.3, ease: "back.out(1.7)" }, ">");

    // 4️⃣ visual 弹出
    const visualEl = Array.from(canvas.querySelectorAll(`.element[data-group="${lineGroupIds[0]}"][data-type="visual"]`))[0];
    let origLeft = "", origTop = "", origPos = "", origZIndex = "", origDisplay = "";
    if (visualEl) {
      // 保存原始样式
      origLeft = visualEl.style.left;
      origTop = visualEl.style.top;
      origPos = visualEl.style.position;
      origZIndex = visualEl.style.zIndex;
      origDisplay = visualEl.style.display;

      visualEl.style.opacity = 0;
      visualEl.style.position = "absolute";
      visualEl.style.left = `${xCenter - visualEl.offsetWidth / 2}px`;
      visualEl.style.top = `${hitY - visualEl.offsetHeight - 10}px`;
      visualEl.style.zIndex = 10000;
      visualEl.style.display = "block";

      timeline.to(visualEl, { opacity: 1, y: -10, duration: 0.5, ease: "power2.out" }, ">");
    }

    // 5️⃣ zoom-out 回到原来的 origin
    timeline.to(canvas, {
      scale: 1,
      transformOrigin: `${originX}px ${originY}px`,
      duration: 0.6,
      ease: "power2.inOut"
    }, ">");

    // 6️⃣ 清理
    timeline.call(() => {
      svgLayer.remove();
      canvas.style.transform = "";
      if (visualEl) {
        visualEl.style.opacity = "";
        visualEl.style.left = origLeft;
        visualEl.style.top = origTop;
        visualEl.style.position = origPos;
        visualEl.style.zIndex = origZIndex;
        visualEl.style.display = origDisplay;
      }
    });

    timeline.play();

    // 第2次动画（等第一次动画结束后约 3.5 秒）
    gsap.delayedCall(3.5, () => {
      runV1Once();
      // 第3次动画（等第二次结束后再 3.5 秒）
      gsap.delayedCall(3.5, () => runV1Once());
    });

    function runV1Once() {
      // 重建 SVG 层
      let svgL = canvas.querySelector("svg.linechart-anim-layer");
      if (svgL) svgL.remove();
      svgL = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      Object.assign(svgL.style, { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", zIndex: 9999, pointerEvents: "none", overflow: "visible" });
      svgL.classList.add("linechart-anim-layer");
      canvas.appendChild(svgL);

      const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
      ln.setAttribute("x1", xCenter); ln.setAttribute("x2", xCenter);
      ln.setAttribute("y1", scanFrom); ln.setAttribute("y2", scanFrom);
      ln.setAttribute("stroke", "#ffd200"); ln.setAttribute("stroke-width", "4");
      ln.setAttribute("stroke-dasharray", "10 6"); ln.setAttribute("opacity", "0.9");
      svgL.appendChild(ln);

      const dt = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dt.setAttribute("cx", xCenter); dt.setAttribute("cy", hitY);
      dt.setAttribute("r", 0); dt.setAttribute("fill", "#ffd200");
      svgL.appendChild(dt);

      // 重新查询 visualEl 并保存原始样式
      const visualElNow = canvas.querySelector(`.element[data-group="${lineGroupIds[0]}"][data-type="visual"]`);
      let oL = "", oT = "", oP = "", oZI = "", oD = "";
      if (visualElNow) {
        oL = visualElNow.style.left;
        oT = visualElNow.style.top;
        oP = visualElNow.style.position;
        oZI = visualElNow.style.zIndex;
        oD = visualElNow.style.display;

        visualElNow.style.opacity = 0; visualElNow.style.position = "absolute";
        visualElNow.style.left = `${xCenter - visualElNow.offsetWidth / 2}px`;
        visualElNow.style.top = `${hitY - visualElNow.offsetHeight - 10}px`;
        visualElNow.style.zIndex = 10000; visualElNow.style.display = "block";
      }

      const tl = gsap.timeline();
      tl.to(canvas, { scale: zoomScale, transformOrigin: `${originX}px ${originY}px`, duration: 0.6, ease: "power2.inOut" });
      tl.to(ln, { attr: { y2: hitY }, duration: 1.2, ease: "power2.out" }, ">");
      tl.to(dt, { attr: { r: 6 }, duration: 0.3, ease: "back.out(1.7)" }, ">");
      if (visualElNow) tl.to(visualElNow, { opacity: 1, y: -10, duration: 0.5, ease: "power2.out" }, ">");
      tl.to(canvas, { scale: 1, transformOrigin: `${originX}px ${originY}px`, duration: 0.6, ease: "power2.inOut" });
      tl.call(() => {
        svgL.remove(); canvas.style.transform = "";
        if (visualElNow) {
          visualElNow.style.opacity = "";
          visualElNow.style.left = oL;
          visualElNow.style.top = oT;
          visualElNow.style.position = oP;
          visualElNow.style.zIndex = oZI;
          visualElNow.style.display = oD;
        }
      });
      tl.play();
    }
  });
}

function value2(canvasId = "canvas", groupIds = [], xGroupIds = [], zoomScale = 1.2) {
  console.log('=== value2 called ===');
  console.log('groupIds:', groupIds);
  console.log('xGroupIds:', xGroupIds);

  // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
  let canvas;
  if (canvasId === "animation-canvas") {
      canvas = document.querySelector("#animation-canvas .canvas");
  } else {
      canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn("Canvas not found, canvasId=" + canvasId);

  // 确保 groupIds 是数组，取第一个
  const lineGroupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;

  const canvasRect = {
    width: canvas.offsetWidth,
    height: canvas.offsetHeight,
    left: 0,
    top: 0
  };

  // 目标 polygon - 获取所有相关的 line 组（和 value1 一样用 querySelectorAll）
  const targetGroups = Array.isArray(lineGroupId)
    ? lineGroupId.map(gid => Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"][data-segmentation]`))).flat()
    : Array.from(canvas.querySelectorAll(`.element[data-group="${lineGroupId}"][data-segmentation]`));

  if (!targetGroups.length) return console.warn("未找到目标 line 组");

  // X 元素
  const xGroupIdsArr = Array.isArray(xGroupIds) ? xGroupIds : (xGroupIds ? Array.from(xGroupIds) : []);
  let xElements = xGroupIdsArr.length > 0
    ? xGroupIdsArr.map(xid =>
        Array.from(canvas.querySelectorAll(`.element[data-group="${xid}"]`))
      ).flat()
    : [];

  // 如果没有找到 X 轴元素，自动查找 X 开头的元素
  if (xElements.length === 0) {
    xElements = Array.from(canvas.querySelectorAll('.element[data-group^="X"]'));
  }
  if (xElements.length === 0) return console.warn("未找到 X 轴元素");

  // SVG 层
  let svgLayer = canvas.querySelector("svg.circle-anim-layer");
  if (!svgLayer) {
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
    svgLayer.classList.add("circle-anim-layer");
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

  xElements.forEach((xEl, i) => {
    // 用 offsetLeft/offsetWidth 直接计算，相对 canvas 的坐标
    const xCenter = xEl.offsetLeft + xEl.offsetWidth / 2;
    const xTop = xEl.offsetTop;
    const scanFrom = xTop - 15;

    console.log('value2 xCenter:', xCenter, 'xTop:', xTop, 'scanFrom:', scanFrom);

    // 找交点 - 和 value1 一样，用 pointInPolygon 扫描
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

    // =========================
    // 1️⃣ 镜头 zoom-in
    // =========================
    const canvasCenterX = canvasRect.width / 2;
    const canvasCenterY = canvasRect.height / 2;
    const offsetX = canvasCenterX - xCenter;
    const offsetY = canvasCenterY - hitY;

    console.log('value2 canvasCenterX:', canvasCenterX, 'canvasCenterY:', canvasCenterY, 'offsetX:', offsetX, 'offsetY:', offsetY);

    const timeline = gsap.timeline();

    // 1️⃣ zoom-in
    timeline.to(canvas, {
      scale: zoomScale,
      x: offsetX * zoomScale,
      y: offsetY * zoomScale,
      transformOrigin: "top left",
      duration: 0.6,
      ease: "power2.inOut"
    });

    // 2️⃣ 创建手写圆圈路径
    const r = 14;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", xCenter);
    circle.setAttribute("cy", hitY);
    circle.setAttribute("r", r);
    circle.setAttribute("stroke", "#ff4d4f");
    circle.setAttribute("stroke-width", "4");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke-dasharray", 2 * Math.PI * r);
    circle.setAttribute("stroke-dashoffset", 2 * Math.PI * r);
    svgLayer.appendChild(circle);

    // 手写绘制动画
    timeline.to(circle, {
      attr: { "stroke-dashoffset": 0 },
      duration: 0.8,
      ease: "power1.out"
    }, ">");

    // 3️⃣ visual 元素出现
    const visualEl2 = canvas.querySelector(`.element[data-group="${lineGroupId}"][data-type="visual"]`);
    let oL2 = "", oT2 = "", oP2 = "", oZI2 = "", oD2 = "";
    if (visualEl2) {
      oL2 = visualEl2.style.left;
      oT2 = visualEl2.style.top;
      oP2 = visualEl2.style.position;
      oZI2 = visualEl2.style.zIndex;
      oD2 = visualEl2.style.display;

      visualEl2.style.opacity = 0;
      visualEl2.style.position = "absolute";
      visualEl2.style.left = `${xCenter - visualEl2.offsetWidth / 2}px`;
      visualEl2.style.top = `${hitY - visualEl2.offsetHeight - 10}px`;
      visualEl2.style.zIndex = 10000;
      visualEl2.style.display = "block";

      timeline.to(visualEl2, { opacity: 1, y: -10, duration: 0.5, ease: "power2.out" }, ">");
    }

    // 4️⃣ zoom-out 回原始位置
    timeline.to(canvas, {
      scale: 1,
      x: 0,
      y: 0,
      duration: 0.6,
      ease: "power2.inOut"
    }, ">");

    // 5️⃣ 清理
    timeline.call(() => {
      circle.remove();
      canvas.style.transform = "";
      if (visualEl2) {
        visualEl2.style.opacity = "";
        visualEl2.style.left = oL2;
        visualEl2.style.top = oT2;
        visualEl2.style.position = oP2;
        visualEl2.style.zIndex = oZI2;
        visualEl2.style.display = oD2;
      }
    });

    timeline.play();

    // 第2次动画（等第一次动画结束后约 3.5 秒）
    gsap.delayedCall(3.5, () => {
      runV2Once();
      // 第3次动画（等第二次结束后再 3.5 秒）
      gsap.delayedCall(3.5, () => runV2Once());
    });

    function runV2Once() {
      let svgL = canvas.querySelector("svg.circle-anim-layer");
      if (svgL) svgL.remove();
      svgL = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      Object.assign(svgL.style, { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", zIndex: 9999, pointerEvents: "none", overflow: "visible" });
      svgL.classList.add("circle-anim-layer");
      canvas.appendChild(svgL);

      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", xCenter); c.setAttribute("cy", hitY);
      c.setAttribute("r", r); c.setAttribute("stroke", "#ff4d4f");
      c.setAttribute("stroke-width", "4"); c.setAttribute("fill", "none");
      c.setAttribute("stroke-dasharray", 2 * Math.PI * r);
      c.setAttribute("stroke-dashoffset", 2 * Math.PI * r);
      svgL.appendChild(c);

      // 重新查询 visualEl
      const vEl = canvas.querySelector(`.element[data-group="${lineGroupId}"][data-type="visual"]`);
      let veL = "", veT = "", veP = "", veZI = "", veD = "";
      if (vEl) {
        veL = vEl.style.left;
        veT = vEl.style.top;
        veP = vEl.style.position;
        veZI = vEl.style.zIndex;
        veD = vEl.style.display;

        vEl.style.opacity = 0; vEl.style.position = "absolute";
        vEl.style.left = `${xCenter - vEl.offsetWidth / 2}px`;
        vEl.style.top = `${hitY - vEl.offsetHeight - 10}px`;
        vEl.style.zIndex = 10000; vEl.style.display = "block";
      }

      const tl = gsap.timeline();
      tl.to(canvas, { scale: zoomScale, x: offsetX * zoomScale, y: offsetY * zoomScale, transformOrigin: "top left", duration: 0.6, ease: "power2.inOut" });
      tl.to(c, { attr: { "stroke-dashoffset": 0 }, duration: 0.8, ease: "power1.out" }, ">");
      if (vEl) tl.to(vEl, { opacity: 1, y: -10, duration: 0.5, ease: "power2.out" }, ">");
      tl.to(canvas, { scale: 1, x: 0, y: 0, duration: 0.6, ease: "power2.inOut" });
      tl.call(() => {
        svgL.remove(); canvas.style.transform = "";
        if (vEl) {
          vEl.style.opacity = "";
          vEl.style.left = veL;
          vEl.style.top = veT;
          vEl.style.position = veP;
          vEl.style.zIndex = veZI;
          vEl.style.display = veD;
        }
      });
      tl.play();
    }
  });
}


window.value1 = value1;
window.value2 = value2;

/**
 * 随机运行 Value 动画
 */
function runAnimation(canvasId = "canvas", groupIds = [], xGroupIds = []) {
    console.log('=== runAnimation called ===');
    console.log('groupIds:', groupIds);
    console.log('xGroupIds:', xGroupIds);

    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    // 切换前先销毁旧动画
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    const animationOptions = ["value1", "value2"];
    const animationType = animationOptions[Math.floor(Math.random() * animationOptions.length)];
    console.log(`随机选择动画类型: ${animationType}`);

    let timelinePromise;
    switch (animationType) {
        case "value1":
            timelinePromise = value1(canvasId, groupIds, xGroupIds);
            break;
        case "value2":
            timelinePromise = value2(canvasId, groupIds, xGroupIds);
            break;
    }

    if (timelinePromise) {
        timelinePromise.then(tl => { if (tl && tl.play) tl.play(); });
    }
}

window.runAnimation = runAnimation;


