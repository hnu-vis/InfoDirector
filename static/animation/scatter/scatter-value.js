function value1(canvasId = "canvas", groupId, dimBrightness = 0.7, duration = 1) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);

  // 定位X轴和Y轴
  const xAxisTexts = canvas.querySelectorAll('.element[data-group^="X"]');
  const yAxisTexts = canvas.querySelectorAll('.element[data-group^="Y"]');
  if (!xAxisTexts.length || !yAxisTexts.length) return console.warn("未找到X轴或Y轴基准元素");

  const xAxisY = Math.min(...Array.from(xAxisTexts).map(el => {
    const rect = el.getBoundingClientRect();
    return rect.top - canvas.getBoundingClientRect().top;
  }));

  const yAxisX = Math.max(...Array.from(yAxisTexts).map(el => {
    const rect = el.getBoundingClientRect();
    return rect.right - canvas.getBoundingClientRect().left;
  }));

  // 获取目标组
  const targetGroupEls = canvas.querySelectorAll(`.element[data-group='${groupId}']`);
  const visualEl = Array.from(targetGroupEls).find(el => el.dataset.type === "visual");
  if (!visualEl || !targetGroupEls.length) return console.warn(`未找到 groupId="${groupId}" 的有效元素`);

  const targetSet = new Set();
  targetGroupEls.forEach(el => {
    targetSet.add(el);
    el.querySelectorAll('*').forEach(child => targetSet.add(child));
  });

  const allElements = canvas.querySelectorAll(".element, img");
  const tl = gsap.timeline();

  // 高亮目标组（添加发光效果）
  allElements.forEach(el => {
    if (targetSet.has(el)) {
      // 目标元素：添加发光高亮
      console.log("高亮元素:", el);
      tl.fromTo(el, 
        { 
          boxShadow: "0 0 0px rgba(255, 68, 0, 0)",
          filter: "brightness(1)"
        },
        { 
          boxShadow: "0 0 20px 5px rgba(255, 68, 0, 0.8)",
          duration: duration,
          ease: "power2.inOut"
        },
        0
      );
    }
    // 非目标元素：不做任何变化
  });

  // 计算元素边界
  const visualRect = visualEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const visualLeft = visualRect.left - canvasRect.left;
  const visualBottom = visualRect.bottom - canvasRect.top;
  const visualCenterY = visualRect.top - canvasRect.top + visualRect.height / 2;
  const visualCenterX = visualLeft + visualRect.width / 2;

  let horizontalLine = null;
  let verticalLine = null;

  // 绘制辅助线
  tl.addLabel("drawLines", `+=${duration * 0.2}`)
    .call(() => {
      horizontalLine = document.createElement("div");
      horizontalLine.style.cssText = `
        position: absolute;
        z-index: 40;
        background: #ff4400;
        height: 2px;
        top: ${visualCenterY}px;
        left: ${yAxisX}px;
        width: 0;
        opacity: 0;
        pointer-events: none;
      `;

      verticalLine = document.createElement("div");
      verticalLine.style.cssText = `
        position: absolute;
        z-index: 40;
        background: #ff4400;
        width: 2px;
        left: ${visualCenterX}px;
        top: ${visualBottom}px;
        height: 0;
        opacity: 0;
        pointer-events: none;
      `;

      canvas.appendChild(horizontalLine);
      canvas.appendChild(verticalLine);

      gsap.to(horizontalLine, {
        width: visualLeft - yAxisX,
        opacity: 1,
        duration: duration,
        ease: "power2.inOut"
      });

      gsap.to(verticalLine, {
        height: xAxisY - visualBottom,
        opacity: 1,
        duration: duration,
        ease: "power2.inOut"
      });
    }, [], "drawLines");

  // 清理逻辑：删除辅助线和高亮效果
  tl.eventCallback("onComplete", () => {
    gsap.delayedCall(2, () => {
      // 1. 删除辅助线
      if (horizontalLine && horizontalLine.parentNode) horizontalLine.remove();
      if (verticalLine && verticalLine.parentNode) verticalLine.remove();
      
      // 2. 删除高亮效果
      allElements.forEach(el => {
        // 停止当前元素上的所有动画
        gsap.killTweensOf(el);
        
        // 移除高亮样式（boxShadow 和 filter）
        gsap.to(el, {
          boxShadow: "none",
          filter: "brightness(1)",
          duration: 0.3,
          ease: "power2.out",
          clearProps: "boxShadow,filter" // 动画完成后清除属性
        });
      });
    });
  });
  
  window._currentMasterTimeline = tl;
  return tl;
}

window.value1 = value1;

function value2(canvasId = "canvas", groupId, dimBrightness = 0.5, duration = 0.8) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);

  // 1. 精准定位X轴和Y轴（完全复用value1逻辑）
  const xAxisTexts = canvas.querySelectorAll('.element[data-group^="X"]');
  const yAxisTexts = canvas.querySelectorAll('.element[data-group^="Y"]');
  if (!xAxisTexts.length || !yAxisTexts.length) return console.warn("未找到X轴或Y轴基准元素");

  // X轴：取所有X组文本的顶部Y坐标（相对画布）
  const xAxisY = Math.min(...Array.from(xAxisTexts).map(el => {
    const rect = el.getBoundingClientRect();
    return rect.top - canvas.getBoundingClientRect().top;
  }));

  // Y轴：取所有Y组文本的右侧X坐标（相对画布）
  const yAxisX = Math.max(...Array.from(yAxisTexts).map(el => {
    const rect = el.getBoundingClientRect();
    return rect.right - canvas.getBoundingClientRect().left;
  }));

  // 2. 获取目标组及视觉元素
  const targetGroupEls = canvas.querySelectorAll(`.element[data-group='${groupId}']`);
  const visualEl = Array.from(targetGroupEls).find(el => el.dataset.type === "visual");
  if (!visualEl || !targetGroupEls.length) return console.warn(`未找到 groupId="${groupId}" 的有效元素`);

  const targetSet = new Set();
  targetGroupEls.forEach(el => {
    targetSet.add(el);
    el.querySelectorAll('*').forEach(child => targetSet.add(child));
  });

  const allElements = canvas.querySelectorAll(".element, img");
  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

  // 3. 计算辅助线定位坐标
  const visualRect = visualEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const visualLeft = visualRect.left - canvasRect.left;
  const visualRight = visualRect.right - canvasRect.left;
  const visualTop = visualRect.top - canvasRect.top;
  const visualBottom = visualRect.bottom - canvasRect.top;
  const visualCenterY = visualRect.top - canvasRect.top + visualRect.height / 2;
  const visualCenterX = visualLeft + visualRect.width / 2;

  // 存储需要清理的元素
  const elementsToClean = [];

  // 4. 第一步：绘制水平辅助线
  tl.addLabel("drawHorizontal")
    .call(() => {
      const horizontalLine = document.createElement("div");
      horizontalLine.style.cssText = `
        position: absolute;
        z-index: 100;
        background: #2196F3;
        height: 2px;
        top: ${visualCenterY}px;
        left: ${yAxisX}px;
        width: 0;
        opacity: 0;
        pointer-events: none;
      `;
      canvas.appendChild(horizontalLine);
      elementsToClean.push(horizontalLine);
      
      gsap.to(horizontalLine, {
        width: visualLeft - yAxisX,
        opacity: 1,
        duration,
        ease: "power2.inOut"
      });
    }, [], "drawHorizontal");

  // 5. 第二步：绘制贴合轮廓（等待水平线动画完成后执行）
  tl.add(() => {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.classList.add("outline-svg");
    svg.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 99999;
      overflow: visible;
    `;

    // 使用边界值计算椭圆
    const cx = (visualLeft + visualRight) / 2;
    const cy = (visualTop + visualBottom) / 2;
    const rx = (visualRight - visualLeft) / 2;
    const ry = (visualBottom - visualTop) / 2;

    const ellipse = document.createElementNS(svgNS, "ellipse");
    ellipse.setAttribute("cx", cx);
    ellipse.setAttribute("cy", cy);
    ellipse.setAttribute("rx", rx);
    ellipse.setAttribute("ry", ry);
    ellipse.setAttribute("fill", "rgba(33, 150, 243, 0.2)");
    ellipse.setAttribute("stroke", "#2196F3");
    ellipse.setAttribute("stroke-width", "3");
    svg.appendChild(ellipse);
    canvas.appendChild(svg);
    elementsToClean.push(svg);
  }, `drawHorizontal+=${duration}`);

  // 6. 第三步：绘制垂直辅助线（等待椭圆绘制完成后执行）
  tl.add(() => {
    const verticalLine = document.createElement("div");
    verticalLine.style.cssText = `
      position: absolute;
      z-index: 100;
      background: #2196F3;
      width: 2px;
      left: ${visualCenterX}px;
      top: ${visualBottom}px;
      height: 0;
      opacity: 0;
      pointer-events: none;
    `;
    canvas.appendChild(verticalLine);
    elementsToClean.push(verticalLine);

    // 垂直线动画：到X轴顶部停止
    gsap.to(verticalLine, {
      height: xAxisY - visualBottom,
      opacity: 1,
      duration,
      ease: "power2.inOut"
    });
  }, `drawHorizontal+=${duration + 0.3}`);

  // 清理逻辑
  tl.eventCallback("onComplete", () => {
    gsap.delayedCall(2, () => {
      // 清理辅助线
      elementsToClean.forEach(el => {
        if (el && el.parentNode) el.remove();
      });

      // 恢复所有元素亮度
      allElements.forEach(el => {
        gsap.to(el, { filter: "brightness(1)", duration: 0.3 });
      });
    });
  });

  window._currentMasterTimeline = tl;
  return tl;
}

window.value2 = value2;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    const animations = [value1, value2];
    const fn = animations[Math.floor(Math.random() * animations.length)];
    const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    fn(canvasId, groupId);
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
        gsap.set(el, { opacity: 1, scale: 1, filter: "", boxShadow: "none" });
    });
    canvas.querySelectorAll('.outline-svg').forEach(el => el.remove());
};