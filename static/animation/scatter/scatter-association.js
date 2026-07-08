function association(canvasId = "canvas", groupIds = []) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn("Canvas not found");
  if (!groupIds || groupIds.length < 2) return console.warn("至少需要传入2个组");

  const svgNS = "http://www.w3.org/2000/svg";

  // 1. 初始隐身：目标组 D, V, T 全部隐藏
  groupIds.forEach(gid => {
    const els = canvas.querySelectorAll(`.element[data-group="${gid}"]`);
    const targetEls = Array.from(els).filter(el => 
      el.dataset.type === "data_graphic" || 
      el.dataset.type === "visual" || 
      el.dataset.type === "text"
    );
    // 初始状态：完全透明 + 缩小 + 灰度 (为 Pop 做准备)
    gsap.set(targetEls, { opacity: 0, scale: 0, transformOrigin: "center center", filter: "grayscale(100%)" });
  });

  // 2. 定位轴线与原点
  const xAxisTexts = canvas.querySelectorAll('.element[data-group^="X"]');
  const yAxisTexts = canvas.querySelectorAll('.element[data-group^="Y"]');
  if (!xAxisTexts.length || !yAxisTexts.length) return console.warn("未找到轴元素");

  const xAxisY = Math.min(...Array.from(xAxisTexts).map(el => el.getBoundingClientRect().top - canvas.getBoundingClientRect().top));
  const yAxisX = Math.max(...Array.from(yAxisTexts).map(el => el.getBoundingClientRect().right - canvas.getBoundingClientRect().left));
  const origin = { x: yAxisX, y: xAxisY };

  // 3. 准备 SVG 层
  let regressionLayer = canvas.querySelector('[data-regression-layer="true"]');
  if (regressionLayer) regressionLayer.remove();

  regressionLayer = document.createElementNS(svgNS, "svg");
  regressionLayer.setAttribute("data-regression-layer", "true");
  Object.assign(regressionLayer.style, {
    position: "absolute", left: "0", top: "0",
    width: `${canvas.offsetWidth}px`, height: `${canvas.offsetHeight}px`,
    pointerEvents: "none", zIndex: 999
  });
  canvas.appendChild(regressionLayer);

  // 4. 数据收集
  const getElementAbsRect = (el) => {
    const elRect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
      centerX: elRect.left - canvasRect.left + elRect.width / 2,
      centerY: elRect.top - canvasRect.top + elRect.height / 2
    };
  };

  const pointsData = [];
  const relativePoints = [];

  groupIds.forEach(groupId => {
    const targetGroupEls = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    // 这里的 Visual 通常是散点的那个点，作为坐标基准
    const visualEl = Array.from(targetGroupEls).find(el => el.dataset.type === "visual");
    if (!visualEl) return;

    const { centerX, centerY } = getElementAbsRect(visualEl);
    const rx = centerX - origin.x;
    const ry = origin.y - centerY;

    relativePoints.push({ x: rx, y: ry });
    pointsData.push({ groupId, absX: centerX, absY: centerY });
  });

  if (relativePoints.length < 2) return;

  // 5. 最小二乘法计算
  const n = relativePoints.length;
  const sumRx = relativePoints.reduce((sum, p) => sum + p.x, 0);
  const sumRy = relativePoints.reduce((sum, p) => sum + p.y, 0);
  const sumRxRy = relativePoints.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumRx2 = relativePoints.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumRxRy - sumRx * sumRy) / (n * sumRx2 - sumRx * sumRx);
  const intercept = (sumRy - slope * sumRx) / n;

  // 6. 确定回归线绘制坐标
  const xValues = pointsData.map(p => p.absX);
  const minAbsX = Math.min(...xValues) - 30; 
  const maxAbsX = Math.max(...xValues) + 30;
  const getAbsY = (absX) => origin.y - (slope * (absX - origin.x) + intercept);

  const startPoint = { x: minAbsX, y: getAbsY(minAbsX) };
  const endPoint = { x: maxAbsX, y: getAbsY(maxAbsX) };

  // 7. 创建回归线
  const mainLine = document.createElementNS(svgNS, "line");
  mainLine.setAttribute("x1", startPoint.x);
  mainLine.setAttribute("y1", startPoint.y);
  mainLine.setAttribute("x2", startPoint.x); // 初始长度0
  mainLine.setAttribute("y2", startPoint.y);
  mainLine.setAttribute("stroke", "#ff3366");
  mainLine.setAttribute("stroke-width", "3");
  mainLine.setAttribute("stroke-dasharray", "8,4");
  mainLine.setAttribute("stroke-linecap", "round");
  regressionLayer.appendChild(mainLine);

  // 8. 动画构建
  const tl = gsap.timeline();
  const totalDuration = 2.0; // 回归线总时长
  const totalDistance = endPoint.x - startPoint.x;

  // --- A. 主线生长 (Linear) ---
  tl.to(mainLine, {
      attr: { x2: endPoint.x, y2: endPoint.y },
      duration: totalDuration,
      ease: "none"
  }, 0);

  // --- B. 逐点触发 (Sequence Logic) ---
  pointsData.forEach((pt) => {
      // 计算触发时间
      const distanceToPoint = pt.absX - startPoint.x;
      const progress = Math.max(0, distanceToPoint / totalDistance);
      const triggerTime = totalDuration * progress;

      // 1. DOM 元素分类获取 (D, V, T)
      const els = canvas.querySelectorAll(`.element[data-group="${pt.groupId}"]`);
      const graphicEls = Array.from(els).filter(el => el.dataset.type === "data_graphic");
      const visualEls = Array.from(els).filter(el => el.dataset.type === "visual");
      const textEls = Array.from(els).filter(el => el.dataset.type === "text");

      // --- 2. 动画序列 (核心 Staggering - 已移除垂直线) ---
      
      // [T+0.1s] DataGraphic 弹出 (D)
      if (graphicEls.length) {
          tl.to(graphicEls, {
              opacity: 1, scale: 1, filter: "grayscale(0%)",
              duration: 0.5, ease: "back.out(1.7)"
          }, triggerTime + 0.1); 
      }

      // [T+0.2s] Visual 弹出 (V)
      if (visualEls.length) {
          tl.to(visualEls, {
              opacity: 1, scale: 1, filter: "grayscale(0%)",
              duration: 0.5, ease: "back.out(1.7)"
          }, triggerTime + 0.2); 
      }

      // [T+0.3s] Text 弹出 (T)
      if (textEls.length) {
          tl.to(textEls, {
              opacity: 1, scale: 1, filter: "grayscale(0%)",
              duration: 0.5, ease: "back.out(1.7)"
          }, triggerTime + 0.3);
      }
  });

  // 清除恢复原状
  tl.repeat(1);
  tl.eventCallback("onComplete", () => {
    gsap.delayedCall(2, () => {
      // 删除回归线
      regressionLayer.remove();
      // 恢复所有元素
      groupIds.forEach(gid => {
        const els = canvas.querySelectorAll(`.element[data-group="${gid}"]`);
        els.forEach(el => {
          gsap.to(el, {
            opacity: 1,
            scale: 1,
            filter: "grayscale(0%)",
            duration: 0.3
          });
        });
      });
    });
  });
  window._currentMasterTimeline = tl;
  return tl;
}

window.association = association;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    association(canvasId, groupIds);
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
    canvas.querySelectorAll('[data-regression-layer="true"]').forEach(el => el.remove());
};