// rank.js
function rank(canvasId = "canvas", groupIds = []) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return console.warn("Canvas not found");
  if (!groupIds || groupIds.length === 0) return console.warn("请传入至少一个组ID");

  // 1. 辅助函数：获取元素相对画布的绝对位置
  const getElementAbsRect = (el) => {
    const elRect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
      top: elRect.top - canvasRect.top,
      left: elRect.left - canvasRect.left,
      bottom: elRect.bottom - canvasRect.bottom,
      right: elRect.right - canvasRect.right,
      centerY: elRect.top - canvasRect.top + elRect.height / 2 // 用于排序的Y坐标
    };
  };

  // 2. 收集组信息并按Y坐标排序（从小到大）
  const groupInfoList = [];
  groupIds.forEach(groupId => {
    const elements = canvas.querySelectorAll(`.element[data-group="${groupId}"]`);
    if (!elements.length) {
      console.warn(`未找到groupId="${groupId}"的元素`);
      return;
    }

    // 获取组内第一个visual元素的位置（用于排序）
    const visualEl = Array.from(elements).find(el => el.dataset.type === "visual") || elements[0];
    const rect = getElementAbsRect(visualEl);

    groupInfoList.push({
      groupId,
      elements: Array.from(elements), // 组内所有元素
      centerY: rect.centerY // 排序依据：Y坐标（越小越先出现）
    });
  });

  // 按Y坐标从小到大排序
  groupInfoList.sort((a, b) => a.centerY - b.centerY);
  console.log("排序后的组顺序（按Y从小到大）：", groupInfoList.map(item => item.groupId));

  // 3. 初始隐藏所有组
  groupInfoList.forEach(info => {
    info.elements.forEach(el => {
      el.style.opacity = "0"; // 先隐藏
      el.style.transform = "scale(0)"; // 初始缩放为0
      el.style.transition = "none"; // 禁用过渡，避免初始状态动画
    });
  });

  // 4. 依次显示组，带"先放大再缩小"动画
  groupInfoList.forEach((info, index) => {
    // 每个组延迟出现（间隔300ms，可调整）
    setTimeout(() => {
      info.elements.forEach(el => {
        // 重置样式，准备动画
        el.style.transition = "all 0.6s cubic-bezier(0.18, 0.89, 0.32, 1.28)";

        // 第一步：显示并放大到1.2倍
        setTimeout(() => {
          el.style.opacity = "1";
          el.style.transform = "scale(1.2)";
        }, 50); // 微小延迟，确保过渡生效

        // 第二步：缩小到原始大小（0.3秒后执行，总动画0.6秒）
        setTimeout(() => {
          el.style.transform = "scale(1)";
        }, 350);
      });
    }, index * 800); // 按顺序延迟：第1组0ms，第2组700ms，以此类推
  });
}

window.rank = rank;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    rank(canvasId, groupIds);
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
};
