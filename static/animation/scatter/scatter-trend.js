function trend1(canvasId = "canvas", groupIds = []) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn("Canvas not found");
  if (!groupIds || groupIds.length < 2) return console.warn("至少需要传入2个组以计算线性回归");

  const svgNS = "http://www.w3.org/2000/svg";

  // 1. 定位XY轴，确定新原点（核心：Y轴最右+X轴最上）
  const xAxisTexts = canvas.querySelectorAll('.element[data-group^="X"]');
  const yAxisTexts = canvas.querySelectorAll('.element[data-group^="Y"]');
  if (!xAxisTexts.length || !yAxisTexts.length) return console.warn("未找到X轴或Y轴基准元素");

  // X轴最上坐标（Y值）：所有X组文本的顶部Y坐标
  const xAxisY = Math.min(...Array.from(xAxisTexts).map(el => {
    const rect = el.getBoundingClientRect();
    return rect.top - canvas.getBoundingClientRect().top;
  }));

  // Y轴最右坐标（X值）：所有Y组文本的右侧X坐标
  const yAxisX = Math.max(...Array.from(yAxisTexts).map(el => {
    const rect = el.getBoundingClientRect();
    return rect.right - canvas.getBoundingClientRect().left;
  }));

  // 新原点：(originX, originY) = (Y轴最右X, X轴最上Y)
  const origin = { x: yAxisX, y: xAxisY };
  console.log(`自定义原点坐标：(${origin.x.toFixed(1)}, ${origin.y.toFixed(1)})`);

  // 2. 移除旧图层+创建新SVG层
  const existingLayer = canvas.querySelector('[data-regression-layer="true"]');
  if (existingLayer) existingLayer.remove();

  const regressionLayer = document.createElementNS(svgNS, "svg");
  regressionLayer.setAttribute("data-regression-layer", "true");
  regressionLayer.setAttribute("width", canvas.offsetWidth);
  regressionLayer.setAttribute("height", canvas.offsetHeight);
  regressionLayer.style.position = "absolute";
  regressionLayer.style.left = "0";
  regressionLayer.style.top = "0";
  regressionLayer.style.pointerEvents = "none";
  regressionLayer.style.zIndex = 999;
  canvas.appendChild(regressionLayer);

  // 3. 辅助函数：获取元素相对画布的绝对位置
  const getElementAbsRect = (el) => {
    const elRect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
      centerX: elRect.left - canvasRect.left + elRect.width / 2,
      centerY: elRect.top - canvasRect.top + elRect.height / 2
    };
  };

  // 4. 收集各组相对新原点的坐标
  const relativePoints = []; // 存储相对原点的坐标 (rx, ry)
  const absPoints = []; // 存储绝对坐标（用于绘制线条）
  const validGroupIds = []; // 存储有效的组ID
  
  groupIds.forEach(groupId => {
    const targetGroupEls = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    const visualEl = Array.from(targetGroupEls).find(el => el.dataset.type === "visual");
    if (!visualEl) {
      console.warn(`groupId="${groupId}" 未找到视觉元素，跳过`);
      return;
    }
    const { centerX, centerY } = getElementAbsRect(visualEl);

    // 计算相对原点的坐标：rx = 绝对X - 原点X；ry = 原点Y - 绝对Y（Y轴向上为正）
    const rx = centerX - origin.x;
    const ry = origin.y - centerY;

    relativePoints.push({ x: rx, y: ry });
    absPoints.push({ x: centerX, y: centerY });
    validGroupIds.push(groupId);
    console.log(`groupId=${groupId}：绝对坐标(${centerX.toFixed(1)}, ${centerY.toFixed(1)}) → 相对坐标(${rx.toFixed(1)}, ${ry.toFixed(1)})`);
  });

  if (relativePoints.length < 2) return console.warn("有效组数量不足2个，无法计算回归线");

  // 5. 基于相对坐标计算线性回归（最小二乘法）
  const n = relativePoints.length;
  const sumRx = relativePoints.reduce((sum, p) => sum + p.x, 0);
  const sumRy = relativePoints.reduce((sum, p) => sum + p.y, 0);
  const sumRxRy = relativePoints.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumRx2 = relativePoints.reduce((sum, p) => sum + p.x * p.x, 0);

  // 相对坐标下的斜率（m）和截距（b）：ry = m*rx + b
  const slope = (n * sumRxRy - sumRx * sumRy) / (n * sumRx2 - sumRx * sumRx);
  const intercept = (sumRy - slope * sumRx) / n;
  console.log(`相对坐标回归结果：斜率=${slope.toFixed(3)}, 截距=${intercept.toFixed(3)}`);

  // 6. 转换为绝对坐标的回归线方程，计算有效起点和终点（限制在XY轴内）
  // 相对方程：ry = m*rx + b
  // 转换为绝对坐标：(originY - absY) = m*(absX - originX) + b → absY = originY - [m*(absX - originX) + b]
  let start = null, end = null;

  // 计算回归线与Y轴（absX=originX）的交点（绝对坐标）
  const absYAtYAxis = origin.y - (slope * (origin.x - origin.x) + intercept);
  if (absYAtYAxis <= origin.y && absYAtYAxis >= 0) { // 在X轴下方、画布上方
    start = { x: origin.x, y: absYAtYAxis };
  }

  // 计算回归线与画布右边界的交点（确保线条延伸足够长）
  const canvasWidth = canvas.offsetWidth;
  const absYAtCanvasRight = origin.y - (slope * (canvasWidth - origin.x) + intercept);
  if (absYAtCanvasRight >= 0 && absYAtCanvasRight <= origin.y) { // 在有效范围内
    end = { x: canvasWidth, y: absYAtCanvasRight };
  }

  // 异常处理：用有效点延伸
  if (!start || !end) {
    // 筛选绝对坐标在XY轴范围内的点
    const validAbsPoints = absPoints.filter(p => p.x >= origin.x && p.y <= origin.y);
    if (validAbsPoints.length >= 2) {
      validAbsPoints.sort((a, b) => a.x - b.x);
      start = start || validAbsPoints[0];
      end = end || validAbsPoints[validAbsPoints.length - 1];
    } else {
      // 极端情况：基于相对方程延伸有效范围
      const minAbsX = Math.max(origin.x, Math.min(...absPoints.map(p => p.x)));
      const maxAbsX = Math.min(canvasWidth, Math.max(...absPoints.map(p => p.x)));
      const minAbsY = origin.y - (slope * (minAbsX - origin.x) + intercept);
      const maxAbsY = origin.y - (slope * (maxAbsX - origin.x) + intercept);
      start = { x: minAbsX, y: Math.max(0, Math.min(origin.y, minAbsY)) };
      end = { x: maxAbsX, y: Math.max(0, Math.min(origin.y, maxAbsY)) };
    }
  }

  // 7. 分别创建线条和箭头的两个边
  // 线条主体
  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", start.x);
  line.setAttribute("y1", start.y);
  line.setAttribute("x2", end.x);
  line.setAttribute("y2", end.y);
  line.setAttribute("stroke", "#2196F3");
  line.setAttribute("stroke-width", "4");
  line.style.opacity = 0;
  regressionLayer.appendChild(line);

  // 箭头左边
  const arrowLeft = document.createElementNS(svgNS, "line");
  // 计算箭头角度（弧度）
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  // 箭头长度
  const arrowLength = 15;

  // 计算箭头左边端点
  const arrowLeftX = end.x - arrowLength * Math.cos(angle - Math.PI/6);
  const arrowLeftY = end.y - arrowLength * Math.sin(angle - Math.PI/6);

  arrowLeft.setAttribute("x1", end.x);
  arrowLeft.setAttribute("y1", end.y);
  arrowLeft.setAttribute("x2", arrowLeftX);
  arrowLeft.setAttribute("y2", arrowLeftY);
  arrowLeft.setAttribute("stroke", "#2196F3");
  arrowLeft.setAttribute("stroke-width", "4");
  arrowLeft.style.opacity = 0;
  regressionLayer.appendChild(arrowLeft);

  // 箭头右边
  const arrowRight = document.createElementNS(svgNS, "line");
  // 计算箭头右边端点
  const arrowRightX = end.x - arrowLength * Math.cos(angle + Math.PI/6);
  const arrowRightY = end.y - arrowLength * Math.sin(angle + Math.PI/6);

  arrowRight.setAttribute("x1", end.x);
  arrowRight.setAttribute("y1", end.y);
  arrowRight.setAttribute("x2", arrowRightX);
  arrowRight.setAttribute("y2", arrowRightY);
  arrowRight.setAttribute("stroke", "#2196F3");
  arrowRight.setAttribute("stroke-width", "4");
  arrowRight.style.opacity = 0;
  regressionLayer.appendChild(arrowRight);
  // 8. 动画：先绘制线条主体，再依次绘制箭头两边
  const lineLength = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  line.setAttribute("stroke-dasharray", lineLength);
  line.setAttribute("stroke-dashoffset", lineLength);

  const timeline = gsap.timeline();
  
  timeline.to(line, {
    strokeDashoffset: 0,
    opacity: 1,
    duration: 1.5,
    ease: "power2.out"
  })
  .to(arrowLeft, {
    opacity: 1,
    duration: 0.5,
    ease: "power2.out"
  }, "-=0.3")
  .to(arrowRight, {
    opacity: 1,
    duration: 0.5,
    ease: "power2.out"
  }, "-=0.3");

  // 9. 添加自动清理功能（5秒后自动恢复）
  timeline.call(() => {
    console.log("回归线绘制完成，5秒后将自动清理");
    
    gsap.delayedCall(3, () => {
      // 淡出动画
      gsap.to(regressionLayer, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.in",
        onComplete: () => {
          // 移除回归线图层
          if (regressionLayer && regressionLayer.parentNode) {
            regressionLayer.remove();
          }
          console.log("回归线已清理");
        }
      });
    });
  });

  // 10. 返回清理函数，供外部调用（如果需要手动清理）
  const cleanup = () => {
    gsap.killTweensOf(regressionLayer);
    if (regressionLayer && regressionLayer.parentNode) {
      regressionLayer.remove();
    }
    console.log("手动清理回归线");
  };

  // 将清理函数附加到canvas上，方便外部调用
  canvas._cleanupTrend1 = cleanup;
  
  // 返回清理函数和timeline
  return { cleanup, timeline, regressionLayer };
}

window.trend1 = trend1;

// 使用示例
window.addEventListener("load", () => {
  setTimeout(() => {
    const result = trend1("canvas", ["G2", "G3", "G4", "G5", "G6", "G7", "G8"]);

    // 如果需要手动清理，可以这样调用：
    // setTimeout(() => {
    //   result.cleanup();
    // }, 3000);
  }, 300);
});

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    trend1(canvasId, groupIds);
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