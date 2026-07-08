function association(canvasId = "canvas", groupIds = ["G1", "G2", "G3"]) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn("Canvas not found");
  const outerCanvas = canvas;
  canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

  const svgNS = "http://www.w3.org/2000/svg";

  // ✅ 创建唯一 SVG 层
  let svgLayer = canvas.querySelector("svg.association-layer");
  if (!svgLayer) {
    svgLayer = document.createElementNS(svgNS, "svg");
    svgLayer.classList.add("association-layer");
    svgLayer.setAttribute("width", "100%");
    svgLayer.setAttribute("height", "100%");
    Object.assign(svgLayer.style, {
      position: "absolute",
      left: "0",
      top: "0",
      zIndex: 9999,
      pointerEvents: "none",
    });
    canvas.appendChild(svgLayer);
  }

  // ✅ 计算每个组的中心点（使用 offsetLeft/offsetTop）
  const groupCenters = [];
  groupIds.forEach((groupId) => {
    const elements = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    if (!elements.length) return;
    let sumX = 0, sumY = 0;
    elements.forEach((el) => {
      sumX += el.offsetLeft + el.offsetWidth / 2;
      sumY += el.offsetTop + el.offsetHeight / 2;
    });
    groupCenters.push({
      groupId,
      cx: sumX / elements.length,
      cy: sumY / elements.length,
    });
  });

  const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6"];

  // ✅ 光晕滤镜
  const defs = document.createElementNS(svgNS, "defs");
  defs.innerHTML = `
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`;
  svgLayer.appendChild(defs);

  // ✅ 平滑贝塞尔路径生成函数
  function generateSmoothPath([x1, y1], [x2, y2]) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const offset = distance * 0.25;
    const randomFactor = (Math.random() - 0.5) * offset * 0.6;

    // 控制点偏移方向取垂直方向，制造弯曲感
    const cx = (x1 + x2) / 2 + randomFactor * (dy / distance);
    const cy = (y1 + y2) / 2 - randomFactor * (dx / distance);

    return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
  }

  function drawConnections() {
    // ✅ 绘制组圆点
    groupCenters.forEach(({ cx, cy }, index) => {
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", cx);
      dot.setAttribute("cy", cy);
      dot.setAttribute("r", "0");
      dot.setAttribute("fill", colors[index % colors.length]);
      dot.setAttribute("filter", "url(#glow)");
      svgLayer.appendChild(dot);
      gsap.to(dot, { r: 8, duration: 0.5, ease: "elastic.out(1, 0.3)" });
    });

    // ✅ 绘制所有组之间的连线（两两组合）
    setTimeout(() => {
      for (let i = 0; i < groupCenters.length; i++) {
        for (let j = i + 1; j < groupCenters.length; j++) {
          const { cx: x1, cy: y1 } = groupCenters[i];
          const { cx: x2, cy: y2 } = groupCenters[j];
          const color = colors[(i + j) % colors.length];

          const path = document.createElementNS(svgNS, "path");
          path.setAttribute("d", generateSmoothPath([x1, y1], [x2, y2]));
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", color);
          path.setAttribute("stroke-width", "10");
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("stroke-linejoin", "round");
          path.setAttribute("filter", "url(#glow)");
          svgLayer.appendChild(path);

          // ✅ 路径动画
          const length = path.getTotalLength?.() || 1000;
          path.style.strokeDasharray = length;
          path.style.strokeDashoffset = length;

          gsap.to(path, {
            strokeDashoffset: 0,
            duration: 1.5,
            delay: 0.2 * (i + j),
            ease: "power2.out",
          });
        }
      }
    }, 500);
  }

  drawConnections();

  const tl = gsap.timeline();
  tl.repeat(1);
  tl.eventCallback("onComplete", () => {
    gsap.delayedCall(3, () => {
      svgLayer.remove();
    });
  });
  window._currentMasterTimeline = tl;
  return tl;
}

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    association(canvasId, groupIds);
}

window.association = association;
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
    canvas.querySelectorAll('.association-layer').forEach(el => el.remove());
};

