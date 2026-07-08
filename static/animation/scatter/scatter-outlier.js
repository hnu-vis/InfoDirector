/**
 * outlier1: 离群值强调动画 (Fade In 版)
 * 1. 环境压暗 (Dim Others)
 * 2. DataGraphic & Visual 强波纹 (Strong Ripple on D & V)
 * 3. 绘制标注箭头 (Draw Arrow)
 * 4. 文本淡入 (Text Fade In)
 */

/**
 * 清理动态特效节点
 */
function removeOutlierArtifacts(canvas) {
  if (!canvas) return;

  canvas
    .querySelectorAll(
      '[class*="outlier-ripple-"], [class*="outlier-arrow-"], .outlier-svg-layer'
    )
    .forEach(el => el.remove());
}

/**
 * 统一重置动画状态
 */
function resetAnimationState(canvas) {
  if (!canvas) return;

  // 杀掉主时间轴
  if (window._currentMasterTimeline) {
    window._currentMasterTimeline.kill();
    window._currentMasterTimeline = null;
  }

  // 杀掉延迟清理
  if (window._currentCleanupCall) {
    window._currentCleanupCall.kill();
    window._currentCleanupCall = null;
  }

  // 杀掉所有 element 上的 tween
  const allEls = Array.from(canvas.querySelectorAll(".element"));
  if (allEls.length) {
    gsap.killTweensOf(allEls);
  }

  // 恢复元素状态
  allEls.forEach(el => {
    gsap.set(el, {
      opacity: 1,
      scale: 1,
      filter: "grayscale(0%) blur(0px)",
      clearProps: "zIndex"
    });
  });

  removeOutlierArtifacts(canvas);
}

/**
 * 主动画
 */
function outlier1(canvasId = "canvas", groupId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
  if (!groupId) return console.warn("必须传入 groupId");

  // 关键：无论自动还是手动，先统一重置
  resetAnimationState(canvas);

  // 1. 获取元素
  const targetGroupEls = Array.from(
    canvas.querySelectorAll(`.element[data-group='${groupId}']`)
  );
  const visualEl = targetGroupEls.find(el => el.dataset.type === "visual");

  if (!visualEl || !targetGroupEls.length) {
    return console.warn(`未找到 groupId="${groupId}" 的有效元素`);
  }

  const graphicEl = targetGroupEls.find(el => el.dataset.type === "data_graphic");
  const textEls = targetGroupEls.filter(el => el.dataset.type === "text");
  const allGroupEls = Array.from(canvas.querySelectorAll(".element[data-group]"));
  const otherEls = allGroupEls.filter(el => el.dataset.group !== String(groupId));

  // 2. 动画时间轴
  const tl = gsap.timeline();

  // --- Step 1: 环境压暗 ---
  tl.to(
    otherEls,
    {
      opacity: 0.15,
      filter: "grayscale(100%) blur(2px)",
      duration: 0.8,
      ease: "power2.inOut"
    },
    0
  );

  // 目标组复原并高亮
  tl.to(
    targetGroupEls,
    {
      opacity: 1,
      filter: "grayscale(0%) blur(0px)",
      scale: 1,
      zIndex: 100,
      duration: 0.5,
      overwrite: "auto"
    },
    0
  );

  // --- Step 2: DataGraphic & Visual 强波纹 ---
  const rippleTargets = [graphicEl, visualEl].filter(Boolean);

  rippleTargets.forEach(targetEl => {
    createStrongRipple(targetEl, canvas, groupId);
    tl.to(
      targetEl,
      {
        scale: 1.15,
        duration: 0.5,
        ease: "back.out(1.7)",
        overwrite: "auto"
      },
      0
    );
  });

  // --- Step 3: 绘制二次箭头 ---
  const arrowTarget = graphicEl || visualEl;
  if (arrowTarget) {
    const arrowPath = createCurvedArrow(arrowTarget, canvas, groupId);
    const len = arrowPath.getTotalLength();

    gsap.set(arrowPath, {
      strokeDasharray: len,
      strokeDashoffset: len
    });

    tl.to(
      arrowPath,
      {
        strokeDashoffset: 0,
        duration: 1.0,
        ease: "power1.out"
      },
      0.3
    );
  }

  // --- Step 4: 文本淡入 ---
  if (textEls.length) {
    gsap.set(textEls, { opacity: 0 });

    tl.to(
      textEls,
      {
        opacity: 1,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.1,
        overwrite: "auto"
      },
      0.8
    );
  }

  // 动画结束后延迟恢复
  tl.eventCallback("onComplete", () => {
    window._currentCleanupCall = gsap.delayedCall(3, () => {
      // 停掉残余 tween
      gsap.killTweensOf([...otherEls, ...targetGroupEls]);

      // 删除特效节点
      removeOutlierArtifacts(canvas);

      // 恢复其他元素
      otherEls.forEach(el => {
        gsap.to(el, {
          opacity: 1,
          filter: "grayscale(0%) blur(0px)",
          scale: 1,
          duration: 0.3,
          overwrite: "auto",
          onComplete: () => gsap.set(el, { clearProps: "zIndex" })
        });
      });

      // 恢复目标组
      targetGroupEls.forEach(el => {
        gsap.to(el, {
          opacity: 1,
          filter: "grayscale(0%) blur(0px)",
          scale: 1,
          duration: 0.3,
          overwrite: "auto",
          onComplete: () => gsap.set(el, { clearProps: "zIndex" })
        });
      });

      window._currentCleanupCall = null;
    });
  });

  window._currentMasterTimeline = tl;
  return tl;
}

window.outlier1 = outlier1;

/**
 * 辅助：创建增强型持续波纹 (双圈 + 发光)
 */
function createStrongRipple(targetEl, canvas, idSuffix) {
  const rect = targetEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  const centerX = rect.left - canvasRect.left + rect.width / 2;
  const centerY = rect.top - canvasRect.top + rect.height / 2;
  const size = Math.max(rect.width, rect.height);

  for (let i = 0; i < 2; i++) {
    const ripple = document.createElement("div");
    ripple.classList.add(`outlier-ripple-${idSuffix}`);

    Object.assign(ripple.style, {
      position: "absolute",
      left: `${centerX}px`,
      top: `${centerY}px`,
      width: "0px",
      height: "0px",
      transform: "translate(-50%, -50%)",
      borderRadius: "50%",
      border: "3px solid #ff3366",
      backgroundColor: "rgba(255, 51, 102, 0.3)",
      boxShadow: "0 0 20px rgba(255, 51, 102, 0.8)",
      zIndex: 90,
      pointerEvents: "none"
    });

    canvas.insertBefore(ripple, canvas.firstChild);

    gsap.to(ripple, {
      width: size * 2.8,
      height: size * 2.8,
      opacity: 0,
      duration: 2.0,
      ease: "power1.out",
      repeat: -1,
      delay: i * 0.6
    });
  }
}

/**
 * 辅助：创建弯曲箭头 SVG
 */
function createCurvedArrow(targetEl, canvas, idSuffix) {
  const svgNS = "http://www.w3.org/2000/svg";
  const rect = targetEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  // 目标点：元素右上边缘
  const targetX = rect.left - canvasRect.left + rect.width;
  const targetY = rect.top - canvasRect.top;
  const startX = targetX + 60;
  const startY = targetY - 60;

  let svgLayer = canvas.querySelector(".outlier-svg-layer");
  if (!svgLayer) {
    svgLayer = document.createElementNS(svgNS, "svg");
    svgLayer.classList.add("outlier-svg-layer");

    Object.assign(svgLayer.style, {
      position: "absolute",
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 999
    });

    canvas.appendChild(svgLayer);
  }

  const path = document.createElementNS(svgNS, "path");
  path.classList.add(`outlier-arrow-${idSuffix}`);

  const controlX = startX;
  const controlY = targetY;

  const dLine = `M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
  const headSize = 12;
  const dHead = `M ${targetX} ${targetY} l ${headSize} -${headSize} M ${targetX} ${targetY} l ${headSize} ${headSize / 2}`;

  path.setAttribute("d", `${dLine} ${dHead}`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#ff3366");
  path.setAttribute("stroke-width", "3");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svgLayer.appendChild(path);
  return path;
}

/**
 * 自动执行入口
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
  const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
  return outlier1(canvasId, groupId);
}

window.runAnimation = runAnimation;

/**
 * 销毁当前动画
 */
window.destroyCurrentAnimation = function(canvasId = "canvas") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  resetAnimationState(canvas);
};