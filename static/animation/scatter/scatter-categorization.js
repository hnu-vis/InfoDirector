function categorization1(canvasId = "canvas", groupIds = []) {
  let root = document.getElementById(canvasId);
  if (!root) return console.warn("Canvas not found");

  // 如果外层还有一层 .canvas，优先用真正承载 element 的那层
  const canvas = root.querySelector(".canvas") || root;
  const svgNS = "http://www.w3.org/2000/svg";

  // 1. 清理旧高亮层
  canvas.querySelectorAll('[data-highlight-overlay="true"]').forEach(el => el.remove());

  // 2. 收集目标组元素（用于筛选非目标组）
  const targetElements = new Set();
  groupIds.forEach(groupId => {
    const elements = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    elements.forEach(el => {
      targetElements.add(el);
      el.querySelectorAll("*").forEach(child => targetElements.add(child));
    });
  });

  // 3. 非目标组 visual 元素“变淡”
  const allVisuals = canvas.querySelectorAll('.element[data-type="visual"]');
  allVisuals.forEach(el => {
    // 先重置，避免叠加
    gsap.set(el, { filter: "brightness(1) saturate(1)" });

    if (!targetElements.has(el)) {
      gsap.to(el, {
        filter: "saturate(0) brightness(1.2)",
        duration: 2,
        ease: "power2.out"
      });
    }
  });

  // 4. 解析轮廓点
  const getValidPoints = (seg) => {
    if (!seg || seg === "[]") return null;
    try {
      const parsed = JSON.parse(seg);
      const points = parsed && parsed[0];
      return points && points.length >= 3 ? points : null;
    } catch (e) {
      console.warn("轮廓数据解析失败:", e);
      return null;
    }
  };

  // 5. 高亮目标组 visual 元素
  const overlayPolygons = [];

  groupIds.forEach(groupId => {
    const elements = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    const visualEl = Array.from(elements).find(el => el.dataset.type === "visual");

    if (!visualEl) {
      console.warn(`groupId="${groupId}" 未找到 visual 类型元素`);
      return;
    }

    const seg = visualEl.dataset.segmentation;
    const validPoints = getValidPoints(seg);
    if (!validPoints) {
      console.warn(`groupId="${groupId}" 无有效轮廓数据`);
      return;
    }

    // 确保目标元素可作为绝对定位参考
    if (getComputedStyle(visualEl).position === "static") {
      visualEl.style.position = "relative";
    }

    // 创建挂在 visualEl 自身上的 SVG 覆盖层
    const elSvg = document.createElementNS(svgNS, "svg");
    elSvg.setAttribute("data-highlight-overlay", "true");
    Object.assign(elSvg.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "1000",
      overflow: "visible"
    });

    // segmentation 一般是“画布坐标”，这里转成“相对元素左上角”的局部坐标
    const offsetX = visualEl.offsetLeft;
    const offsetY = visualEl.offsetTop;

    const pointsStr = validPoints
      .map(([x, y]) => `${x - offsetX},${y - offsetY}`)
      .join(" ");

    const polygon = document.createElementNS(svgNS, "polygon");
    polygon.setAttribute("points", pointsStr);
    polygon.setAttribute("fill", "rgba(255,0,0,0.35)");
    polygon.setAttribute("stroke", "#ff0000");
    polygon.setAttribute("stroke-width", "3");
    polygon.setAttribute("stroke-linejoin", "round");
    polygon.style.opacity = 0;

    elSvg.appendChild(polygon);
    visualEl.appendChild(elSvg);
    overlayPolygons.push(polygon);
  });

  // 6. 动画时间线
  const tl = gsap.timeline();

  overlayPolygons.forEach((polygon, i) => {
    tl.to(
      polygon,
      {
        opacity: 1,
        duration: 1.2,
        ease: "power2.out"
      },
      i === 0 ? 0.2 : "<"
    );
  });

  // 停留 2 秒后清除
  tl.to({}, { duration: 2 });

  tl.eventCallback("onComplete", () => {
    canvas.querySelectorAll('[data-highlight-overlay="true"]').forEach(el => el.remove());
    allVisuals.forEach(el => {
      gsap.to(el, {
        filter: "brightness(1) saturate(1)",
        duration: 0.3
      });
    });
  });

  window._currentMasterTimeline = tl;
  return tl;
}

function categorization2(canvasId = "canvas", groupIds = []) {
  let root = document.getElementById(canvasId);
  if (!root) return console.warn("Canvas not found");
  if (!Array.isArray(groupIds) || !groupIds.length) {
    return console.warn("groupIds 格式错误，需传入一维数组，如 ['G1', 'G2', 'G3']");
  }

  const canvas = root.querySelector(".canvas") || root;
  const svgNS = "http://www.w3.org/2000/svg";

  // 多组颜色
  const colorPalette = [
    { fill: "rgba(255, 99, 132, 0.30)", stroke: "#ff6384" },
    { fill: "rgba(54, 162, 235, 0.30)", stroke: "#36a2eb" },
    { fill: "rgba(255, 206, 86, 0.30)", stroke: "#ffce56" },
    { fill: "rgba(75, 192, 192, 0.30)", stroke: "#4bc0c0" },
    { fill: "rgba(153, 102, 255, 0.30)", stroke: "#9966ff" },
    { fill: "rgba(255, 159, 64, 0.30)", stroke: "#ff9f40" },
    { fill: "rgba(46, 204, 113, 0.30)", stroke: "#2ecc71" }
  ];

  // 清理旧高亮
  canvas.querySelectorAll('[data-highlight-overlay="true"]').forEach(el => el.remove());

  // 收集目标组元素
  const targetElements = new Set();
  groupIds.forEach(groupId => {
    const elements = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    elements.forEach(el => {
      targetElements.add(el);
      el.querySelectorAll("*").forEach(child => targetElements.add(child));
    });
  });

  // 非目标组变淡
  const allVisuals = canvas.querySelectorAll('.element[data-type="visual"]');
  allVisuals.forEach(el => {
    gsap.set(el, { filter: "brightness(1) saturate(1)" });

    if (!targetElements.has(el)) {
      gsap.to(el, {
        filter: "saturate(0) brightness(1.15)",
        duration: 0.8,
        ease: "power2.out"
      });
    }
  });

  const getValidPoints = (seg) => {
    if (!seg || seg === "[]") return null;
    try {
      const parsed = JSON.parse(seg);
      const points = parsed && parsed[0];
      return points && points.length >= 3 ? points : null;
    } catch (e) {
      console.warn("轮廓数据解析失败:", e);
      return null;
    }
  };

  const overlayPolygons = [];

  groupIds.forEach((groupId, index) => {
    const color = colorPalette[index % colorPalette.length];
    const elements = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    const visualEls = Array.from(elements).filter(el => el.dataset.type === "visual");

    if (!visualEls.length) {
      console.warn(`groupId="${groupId}" 未找到 visual 类型元素`);
      return;
    }

    visualEls.forEach(visualEl => {
      const seg = visualEl.dataset.segmentation;
      const validPoints = getValidPoints(seg);

      if (!validPoints) {
        console.warn(`groupId="${groupId}" 无有效轮廓数据`);
        return;
      }

      if (getComputedStyle(visualEl).position === "static") {
        visualEl.style.position = "relative";
      }

      const elSvg = document.createElementNS(svgNS, "svg");
      elSvg.setAttribute("data-highlight-overlay", "true");
      Object.assign(elSvg.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "1000",
        overflow: "visible"
      });

      const offsetX = visualEl.offsetLeft;
      const offsetY = visualEl.offsetTop;

      const pointsStr = validPoints
        .map(([x, y]) => `${x - offsetX},${y - offsetY}`)
        .join(" ");

      const polygon = document.createElementNS(svgNS, "polygon");
      polygon.setAttribute("points", pointsStr);
      polygon.setAttribute("fill", color.fill);
      polygon.setAttribute("stroke", color.stroke);
      polygon.setAttribute("stroke-width", "3");
      polygon.setAttribute("stroke-linejoin", "round");
      polygon.setAttribute("stroke-dasharray", "8 6"); // 更容易和 categorization1 区分
      polygon.style.opacity = 0.15;

      elSvg.appendChild(polygon);
      visualEl.appendChild(elSvg);
      overlayPolygons.push(polygon);

      gsap.to(visualEl, {
        filter: "brightness(1.1) saturate(1.2)",
        duration: 0.5,
        ease: "power2.out"
      });
    });
  });

  const tl = gsap.timeline();

  // 先整体出现
  overlayPolygons.forEach((polygon, i) => {
    tl.to(
      polygon,
      {
        opacity: 0.9,
        duration: 0.35,
        ease: "power2.out"
      },
      i === 0 ? 0 : "<"
    );
  });

  // 再做闪烁：3次
  overlayPolygons.forEach((polygon, i) => {
    tl.to(
      polygon,
      {
        opacity: 0.2,
        strokeWidth: 5,
        duration: 0.22,
        repeat: 5,
        yoyo: true,
        ease: "power1.inOut"
      },
      i === 0 ? ">" : "<"
    );
  });

  // 停留一下
  tl.to({}, { duration: 1.8 });

  // 清除恢复
  tl.eventCallback("onComplete", () => {
    canvas.querySelectorAll('[data-highlight-overlay="true"]').forEach(el => el.remove());
    allVisuals.forEach(el => {
      gsap.to(el, {
        filter: "brightness(1) saturate(1)",
        duration: 0.3
      });
    });
  });

  window._currentMasterTimeline = tl;
  return tl;
}

// 挂载到 window
window.categorization1 = categorization1;
window.categorization2 = categorization2;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    const animations = [categorization1, categorization2];
    const fn = animations[Math.floor(Math.random() * animations.length)];
    fn(canvasId, groupIds);
}

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
    canvas.querySelectorAll('.element').forEach(el => {
        gsap.set(el, { opacity: 1, scale: 1, filter: "" });
    });
    canvas.querySelectorAll('[data-highlight-overlay="true"]').forEach(el => el.remove());
};
