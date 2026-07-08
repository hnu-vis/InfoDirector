// ⭐ 箭头指向 datagraphic + 轮廓闪烁
function value1(canvasId = "canvas", groupIds = []) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
  canvas = canvas.querySelector('.canvas') || canvas;

  const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
  if (!groupId) return console.warn("未提供 groupId");

  const target = canvas.querySelector(`.element[data-type="data_graphic"][data-group="${groupId}"]`);
  if (!target) return console.warn(`未找到组 ${groupId} 的 datagraphic`);

  const targetLeft = target.offsetLeft;
  const targetTop = target.offsetTop;
  const targetWidth = target.offsetWidth;
  const targetHeight = target.offsetHeight;
  const targetCenterY = targetTop + targetHeight / 2;

  // 创建 SVG 层
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.left = "0px";
  svg.style.top = "0px";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "9999";
  canvas.appendChild(svg);

  // 发光滤镜
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", "glow");
  filter.setAttribute("x", "-50%");
  filter.setAttribute("y", "-50%");
  filter.setAttribute("width", "200%");
  filter.setAttribute("height", "200%");
  const feGaussian = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
  feGaussian.setAttribute("stdDeviation", "3");
  feGaussian.setAttribute("result", "coloredBlur");
  const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
  const feMergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
  feMergeNode1.setAttribute("in", "coloredBlur");
  const feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
  feMergeNode2.setAttribute("in", "SourceGraphic");
  feMerge.appendChild(feMergeNode1);
  feMerge.appendChild(feMergeNode2);
  filter.appendChild(feGaussian);
  filter.appendChild(feMerge);
  defs.appendChild(filter);
  svg.appendChild(defs);

  // 获取 segmentation
  let points = [];
  if (target.dataset.segmentation) {
    try {
      points = JSON.parse(target.dataset.segmentation);
      if (points.length && Array.isArray(points[0])) {
        points = points[0];
      }
    } catch (e) {}
  }

  // 如果没有 segmentation，用 datagraphic 边缘
  if (points.length < 2) {
    points = [
      [targetLeft, targetTop],
      [targetLeft + targetWidth, targetTop],
      [targetLeft + targetWidth, targetTop + targetHeight],
      [targetLeft, targetTop + targetHeight]
    ];
  }

  // 手绘轮廓路径
  const jitter = 2;
  const pathStr = points.map((p, i) => {
    const x = p[0] + (Math.random() - 0.5) * jitter;
    const y = p[1] + (Math.random() - 0.5) * jitter;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ") + " Z";

  const contourPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  contourPath.setAttribute("d", pathStr);
  contourPath.setAttribute("stroke", "#ffcc00");
  contourPath.setAttribute("stroke-width", "3");
  contourPath.setAttribute("fill", "none");
  contourPath.setAttribute("stroke-linecap", "round");
  contourPath.setAttribute("stroke-linejoin", "round");
  contourPath.setAttribute("filter", "url(#glow)");
  contourPath.setAttribute("opacity", "0");
  svg.appendChild(contourPath);

  // 箭头（在 datagraphic 右侧，指向左侧）
  const arrowStartX = targetLeft + targetWidth + 20;
  const arrowY = targetCenterY;
  const arrowEndX = targetLeft + targetWidth - 5;

  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const arrowD = `M${arrowStartX},${arrowY} L${arrowEndX},${arrowY}`;
  arrowPath.setAttribute("d", arrowD);
  arrowPath.setAttribute("stroke", "#ffcc00");
  arrowPath.setAttribute("stroke-width", "4");
  arrowPath.setAttribute("fill", "none");
  arrowPath.setAttribute("stroke-linecap", "round");
  arrowPath.setAttribute("filter", "url(#glow)");
  arrowPath.setAttribute("opacity", "0");
  svg.appendChild(arrowPath);

  // 箭头头部（三角形，指向左）
  const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  const headSize = 12;
  const headPoints = `${arrowEndX},${arrowY + headSize} ${arrowEndX - 8},${arrowY} ${arrowEndX},${arrowY - headSize}`;
  arrowHead.setAttribute("points", headPoints);
  arrowHead.setAttribute("fill", "#ffcc00");
  arrowHead.setAttribute("opacity", "0");
  svg.appendChild(arrowHead);

  // 轮廓动画
  const pathLength = contourPath.getTotalLength();
  contourPath.style.strokeDasharray = pathLength;
  contourPath.style.strokeDashoffset = pathLength;

  const tl = gsap.timeline();

  // 箭头和轮廓淡入
  tl.to([arrowPath, arrowHead, contourPath], { opacity: 1, duration: 0.3 });

  // 箭头绘制
  tl.to(arrowPath, {
    strokeDashoffset: 0,
    duration: 0.5,
    ease: "power2.out"
  });

  // 轮廓闪烁动画
  tl.to(contourPath, {
    strokeDashoffset: 0,
    duration: 0.8,
    ease: "power2.out"
  });

  // 闪烁
  tl.to(contourPath, {
    opacity: 0.3,
    duration: 0.3,
    yoyo: true,
    repeat: 5,
    ease: "sine.inOut"
  });

  // 清理
  tl.call(() => {
    gsap.to(svg, { opacity: 0, duration: 0.3, onComplete: () => svg.remove() });
  });

  tl.play();
}

// ⭐ 局部放大 + 手写描边
function value2(canvasId = "canvas", groupIds = [], zoomScale = 50.5) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
  canvas = canvas.querySelector('.canvas') || canvas;

  const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
  if (!groupId) return console.warn("未提供 groupId");

  const target = canvas.querySelector(`.element[data-type="data_graphic"][data-group="${groupId}"]`);
  if (!target) return console.warn(`未找到组 ${groupId} 的 datagraphic`);

  // 获取 datagraphic 位置
  const targetLeft = target.offsetLeft;
  const targetTop = target.offsetTop;
  const targetWidth = target.offsetWidth;
  const targetHeight = target.offsetHeight;
  const targetCenterX = targetLeft + targetWidth / 2;
  const targetCenterY = targetTop + targetHeight / 2;

  // 获取 segmentation
  let points = [];
  if (target.dataset.segmentation) {
    try {
      points = JSON.parse(target.dataset.segmentation);
      if (points.length && Array.isArray(points[0])) {
        points = points[0];
      }
    } catch (e) {}
  }

  // 如果没有 segmentation，用 datagraphic 的边缘
  if (points.length < 2) {
    points = [];
    const padding = 10;
    points.push([targetLeft - padding, targetTop - padding]);
    points.push([targetLeft + targetWidth + padding, targetTop - padding]);
    points.push([targetLeft + targetWidth + padding, targetTop + targetHeight + padding]);
    points.push([targetLeft - padding, targetTop + targetHeight + padding]);
  }

  // 手绘描边路径
  const jitter = 3;
  const pathStr = points.map((p, i) => {
    const x = p[0] + (Math.random() - 0.5) * jitter;
    const y = p[1] + (Math.random() - 0.5) * jitter;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ") + " Z";

  // 创建描边 SVG
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.left = "0px";
  svg.style.top = "0px";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "9999";
  svg.style.opacity = "0";
  canvas.appendChild(svg);

  // 发光滤镜
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", "glow");
  filter.setAttribute("x", "-50%");
  filter.setAttribute("y", "-50%");
  filter.setAttribute("width", "200%");
  filter.setAttribute("height", "200%");
  const feGaussian = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
  feGaussian.setAttribute("stdDeviation", "4");
  feGaussian.setAttribute("result", "coloredBlur");
  const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
  const feMergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
  feMergeNode1.setAttribute("in", "coloredBlur");
  const feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
  feMergeNode2.setAttribute("in", "SourceGraphic");
  feMerge.appendChild(feMergeNode1);
  feMerge.appendChild(feMergeNode2);
  filter.appendChild(feGaussian);
  filter.appendChild(feMerge);
  defs.appendChild(filter);
  svg.appendChild(defs);

  // 手绘描边路径
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathStr);
  path.setAttribute("stroke", "#ffcc00");
  path.setAttribute("stroke-width", "4");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("filter", "url(#glow)");
  svg.appendChild(path);

  const pathLength = path.getTotalLength();
  path.style.strokeDasharray = pathLength;
  path.style.strokeDashoffset = pathLength;

  // 创建放大镜容器
  const magnifierSize = Math.max(targetWidth, targetHeight) * 1.5;
  const magnifier = document.createElement("div");
  magnifier.style.position = "absolute";
  magnifier.style.left = (targetCenterX - magnifierSize / 2) + "px";
  magnifier.style.top = (targetCenterY - magnifierSize / 2) + "px";
  magnifier.style.width = magnifierSize + "px";
  magnifier.style.height = magnifierSize + "px";
  magnifier.style.borderRadius = "50%";
  magnifier.style.border = "4px solid #ffcc00";
  magnifier.style.boxShadow = "0 0 30px rgba(255,204,0,0.8), inset 0 0 20px rgba(255,204,0,0.3)";
  magnifier.style.overflow = "hidden";
  magnifier.style.zIndex = "10000";
  magnifier.style.opacity = "0";
  magnifier.style.pointerEvents = "none";
  canvas.appendChild(magnifier);

  // 放大镜内层：实际显示放大的内容
  const zoomedContent = document.createElement("div");
  zoomedContent.style.position = "absolute";
  // 让目标区域的中心对齐放大镜中心
  zoomedContent.style.left = (magnifierSize / 2 - targetCenterX) + "px";
  zoomedContent.style.top = (magnifierSize / 2 - targetCenterY) + "px";
  zoomedContent.style.width = canvas.offsetWidth + "px";
  zoomedContent.style.height = canvas.offsetHeight + "px";
  magnifier.appendChild(zoomedContent);

  // 克隆目标元素及其兄弟元素到放大镜
  const elementsToClone = canvas.querySelectorAll(".element");
  elementsToClone.forEach(el => {
    const clone = el.cloneNode(true);
    // 保持绝对定位
    clone.style.position = "absolute";
    clone.style.left = el.offsetLeft + "px";
    clone.style.top = el.offsetTop + "px";
    // 找到组内所有相关元素并放大
    zoomedContent.appendChild(clone);
  });

  // 对放大镜内容进行缩放
  zoomedContent.style.transformOrigin = `${targetCenterX}px ${targetCenterY}px`;
  zoomedContent.style.transform = `scale(${zoomScale})`;

  const tl = gsap.timeline();

  // 1. 放大镜出现
  tl.to(magnifier, { opacity: 1, duration: 0.3 });

  // 2. 脉冲效果
  tl.to(magnifier, {
    boxShadow: "0 0 50px rgba(255,204,0,1), inset 0 0 30px rgba(255,204,0,0.5)",
    duration: 0.3,
    yoyo: true,
    repeat: 3,
    ease: "sine.inOut"
  });

  // 3. 描边出现
  tl.to(svg, { opacity: 1, duration: 0.3 });
  tl.to(path, {
    strokeDashoffset: 0,
    duration: 1.5,
    ease: "power1.inOut"
  });

  // 4. 清理
  tl.call(() => {
    gsap.to(magnifier, { opacity: 0, duration: 0.3, onComplete: () => magnifier.remove() });
    gsap.to(svg, { opacity: 0, duration: 0.3, onComplete: () => svg.remove() });
  });

  tl.play();
}

window.value1 = value1;
window.value2 = value2;

/**
 * 随机运行 Value 动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    // 切换前先销毁旧动画
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }

    const animationOptions = ["Value1", "Value2"];
    const animationType = animationOptions[Math.floor(Math.random() * animationOptions.length)];
    console.log(`随机选择动画类型: ${animationType}`);

    switch (animationType) {
        case "Value1":
            value1(canvasId, groupIds);
            break;
        case "Value2":
            value2(canvasId, groupIds);
            break;
    }
}

// 全局挂载
window.waitImagesLoaded = waitImagesLoaded;
window.Value1 = value1;
window.Value2 = value2;
window.runAnimation = runAnimation;

/**
 * 销毁当前动画（切换动画时调用）
 */
window.destroyCurrentAnimation = function(canvasId = "canvas") {
    if (window._currentMasterTimeline) {
        window._currentMasterTimeline.kill();
        window._currentMasterTimeline = null;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (typeof gsap !== "undefined") {
        const allEls = canvas.querySelectorAll('.element, svg, path, img, div');
        allEls.forEach(el => {
            gsap.getTweensOf(el).forEach(tween => tween.kill());
        });
    }

    canvas.querySelectorAll('svg').forEach(svg => svg.remove());
};