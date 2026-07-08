// ==========================
// extreme1: data_graphic 从左到右划线 + 镜头跟随绘制进度
// ==========================
function extreme1(canvasId, groupIds, xGroupIds, zoomScale, imgDuration) {
  canvasId = canvasId || "canvas";
  // 兼容 Vue Proxy 数组
  groupIds = Array.isArray(groupIds) ? Array.from(groupIds) : [groupIds];

  const canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn("Canvas not found");

  // 获取目标 data_graphic 图片元素
  const lineElements = groupIds
    .map(gid => Array.from(canvas.querySelectorAll(`.element[data-group="${gid}"][data-type="data_graphic"] img`)))
    .flat();

  if (!lineElements.length) {
    console.warn("未找到目标 data_graphic", groupIds);
    return;
  }

  // 计算第一个目标组的 TEXT 位置（镜头跟随目标）
  const firstGroup = groupIds[0];
  const textEl = canvas.querySelector(`.element[data-group="${firstGroup}"][data-type="text"]`);
  if (!textEl) return console.warn("未找到 text 元素");

  const textRect = textEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const textCenterX = textRect.left - canvasRect.left + textRect.width / 2;
  const textCenterY = textRect.top - canvasRect.top + textRect.height / 2;
  const canvasCenterX = canvasRect.width / 2;
  const canvasCenterY = canvasRect.height / 2;
  const deltaX = canvasCenterX - textCenterX;
  const deltaY = canvasCenterY - textCenterY;

  zoomScale = zoomScale || 1.3;
  imgDuration = imgDuration || 2;
  const totalDuration = imgDuration;

  function runExtreme1Once() {
    // 重置样式
    lineElements.forEach(img => {
      img.style.clipPath = "";
    });
    gsap.set(canvas, { scale: 1, x: 0, y: 0 });

    // 确保父容器 overflow hidden
    canvas.parentElement.style.overflow = "hidden";

    // 创建主 timeline
    const mainTimeline = gsap.timeline();

    // 1. 初始化 clip-path 并创建绘制动画
    lineElements.forEach((img, idx) => {
      const imgWidthPx = img.offsetWidth;
      const imgHeightPx = img.offsetHeight;

      // 初始化 clip-path：完全隐藏
      img.style.clipPath = `polygon(0px 0px, 0px 0px, 0px ${imgHeightPx}px, 0px ${imgHeightPx}px)`;

      // 从左到右划线
      mainTimeline.to({ progress: 0 }, {
        progress: 1,
        duration: totalDuration,
        delay: idx * 0.1,
        ease: "power2.inOut",
        onUpdate: function () {
          const prog = this.targets()[0].progress;
          const currentX = imgWidthPx * prog;
          img.style.clipPath = `polygon(
            0px 0px,
            ${currentX}px 0px,
            ${currentX}px ${imgHeightPx}px,
            0px ${imgHeightPx}px
          )`;
        }
      }, 0);
    });

    // 2. 镜头跟随：跟随绘制进度，从0到目标位置
    mainTimeline.to({ progress: 0 }, {
      progress: 1,
      duration: totalDuration + (lineElements.length - 1) * 0.1,
      ease: "power2.inOut",
      onUpdate: function () {
        const prog = this.targets()[0].progress;
        gsap.set(canvas, {
          scale: 1 + (zoomScale - 1) * prog,
          x: deltaX * zoomScale * prog,
          y: deltaY * zoomScale * prog,
          transformOrigin: "top left"
        });
      }
    }, 0);

    // 3. 完成后 zoom out 回原位
    mainTimeline.to(canvas, {
      scale: 1,
      x: 0,
      y: 0,
      duration: 0.5,
      ease: "power2.inOut"
    });

    mainTimeline.play();
  }

  // 执行3次
  runExtreme1Once();
  gsap.delayedCall(3.5, () => {
    runExtreme1Once();
    gsap.delayedCall(3.5, () => runExtreme1Once());
  });
}

// ==========================
// extreme2: zoom in 到 text 位置 -> text 晃动 -> zoom out
// ==========================
function extreme2(canvasId, groupIds, xGroupIds, zoomScale, zoomDuration, shakeAmplitude, shakeDuration) {
  canvasId = canvasId || "canvas";
  // 兼容 Vue Proxy 数组
  groupIds = Array.isArray(groupIds) ? Array.from(groupIds) : [groupIds];

  const canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn("Canvas not found");

  const groupId = groupIds[0];

  // 获取 text 元素
  const textEl = canvas.querySelector(`.element[data-group="${groupId}"][data-type="text"]`);
  if (!textEl) return console.warn("未找到 text 元素");

  // 计算 text 位置
  const textRect = textEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const textCenterX = textRect.left - canvasRect.left + textRect.width / 2;
  const textCenterY = textRect.top - canvasRect.top + textRect.height / 2;
  const canvasCenterX = canvasRect.width / 2;
  const canvasCenterY = canvasRect.height / 2;
  const deltaX = canvasCenterX - textCenterX;
  const deltaY = canvasCenterY - textCenterY;

  zoomScale = zoomScale || 1.5;
  zoomDuration = zoomDuration || 0.5;
  shakeAmplitude = shakeAmplitude || 20;
  shakeDuration = shakeDuration || 0.5;

  // 震动函数
  function vibrateElement(el, amplitude, duration) {
    const steps = 20;
    const tl = gsap.timeline();
    for (let i = 0; i < steps; i++) {
      const randX = (Math.random() * 2 - 1) * amplitude;
      const randY = (Math.random() * 2 - 1) * amplitude;
      tl.to(el, {
        x: randX,
        y: randY,
        duration: duration / steps,
        ease: "none"
      });
    }
    // 回原位
    tl.to(el, { x: 0, y: 0, duration: 0.1, ease: "elastic.out(1, 0.3)" });
    tl.play();
    return tl;
  }

  function runExtreme2Once() {
    // 重置样式
    gsap.set(canvas, { scale: 1, x: 0, y: 0 });

    // 确保父容器 overflow hidden
    canvas.parentElement.style.overflow = "hidden";

    const tl = gsap.timeline();

    // 1. zoom in 到 text
    tl.to(canvas, {
      scale: zoomScale,
      x: deltaX * zoomScale,
      y: deltaY * zoomScale,
      transformOrigin: "top left",
      duration: zoomDuration,
      ease: "power2.inOut"
    });

    // 2. text 晃动
    tl.call(() => {
      vibrateElement(textEl, shakeAmplitude, shakeDuration);
    });

    // 3. zoom out 回原位
    tl.to(canvas, {
      scale: 1,
      x: 0,
      y: 0,
      duration: zoomDuration,
      ease: "power2.inOut",
      delay: shakeDuration + 0.2
    });

    tl.play();
  }

  // 执行3次
  runExtreme2Once();
  gsap.delayedCall(3.5, () => {
    runExtreme2Once();
    gsap.delayedCall(3.5, () => runExtreme2Once());
  });
}

// ==========================
// 导出（使用 line 专用命名空间避免 global runAnimation 冲突）
// ==========================
window.lineExtreme1 = extreme1;
window.lineExtreme2 = extreme2;
window.lineRunAnimation = runAnimation;
window.lineRunRandom = runRandomExtreme;