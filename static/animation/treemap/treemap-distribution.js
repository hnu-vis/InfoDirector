// ==========================================
// 4. Treemap 分布动画 (distribution4) - Pop & Stagger
// 适用场景：Treemap, Heatmap, 密集矩形块
// ==========================================
function distribution1(canvasId = "canvas", groupIds = []) {
  // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
  let canvas;
  if (canvasId === "animation-canvas") {
      canvas = document.querySelector("#animation-canvas .canvas");
  } else {
      canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);

  // 1. 初始状态设置 (全部隐藏)
  // 为了保证 Pop 效果，我们需要先将所有涉及的元素缩放为0
  groupIds.forEach(groupId => {
    const els = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    els.forEach(el => {
      // DataGraphic 和 Visual 初始 scale=0
      if (el.dataset.type === "data_graphic" || el.dataset.type === "visual") {
        gsap.set(el, { scale: 0, opacity: 0, transformOrigin: "center center" });
      }
      // Text 初始下沉透明
      if (el.dataset.type === "text") {
        gsap.set(el, { y: 15, opacity: 0 });
      }
    });
  });

  const tl = gsap.timeline();

  // 2. 循环执行 Staggering(G)
  groupIds.forEach((groupId, index) => {
    // 获取组内元素
    const groupEls = Array.from(canvas.querySelectorAll(`.element[data-group="${groupId}"]`));
    if (!groupEls.length) return;

    const graphic = groupEls.find(el => el.dataset.type === "data_graphic"); // D
    const visual = groupEls.find(el => el.dataset.type === "visual");       // V
    const texts = groupEls.filter(el => el.dataset.type === "text");        // Td, Tv

    // 组间交错时间 (Staggering G)
    // 矩形块通常很多，间隔设置小一点 (0.05 - 0.1) 会有很爽快的多米诺骨牌感
    const groupDelay = index * 0.08; 

    // --- 步骤 A: 背景块 Pop (DataGraphic) ---
    if (graphic) {
      tl.to(graphic, {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: "back.out(1.7)", // 弹性弹出
      }, groupDelay);
    }

    // --- 步骤 B: 图标 Pop (Visual) ---
    // 比背景块稍微晚一点点出来
    if (visual) {
      tl.to(visual, {
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: "back.out(2.0)", // 图标可以更弹一点
      }, groupDelay + 0.15);
    }

    // --- 步骤 C: 文字滑入 (Td, Tv) ---
    // 无论有几个文字，都在最后上浮显示
    if (texts.length) {
      tl.to(texts, {
        y: 0,
        opacity: 1,
        duration: 0.4,
        ease: "power2.out",
        stagger: 0.05 // 组内文字也稍微错开 (Td -> Tv)
      }, groupDelay + 0.25);
    }
  });
}


window.distribution1 = distribution1;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    distribution1(canvasId, groupIds);
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
    canvas.querySelectorAll('.scan-line, .ripple-effect, .highlight-layer, .camera-layer').forEach(el => el.remove());
};