(function() {
/**
 * 初始化动画控制器
 */
class AnimationController {
  constructor() {
    // 注册所有动画类型
    this.animations = {
      value1: this.value1,
      value2: this.value2
    };
  }

  /**
   * 获取指定组的所有元素
   * @param {string} groupId 组编号（如G1、G2）
   * @returns {Array} 组内元素集合
   */
  getGroupElements(groupId) {
    const elements = document.querySelectorAll(`[data-group="${groupId}"]`);
    return Array.from(elements);
  }

  /**
   * 执行指定组的指定动画
   * @param {string} groupId 组编号
   * @param {string} animType 动画类型（value1、value2）
   * @param {Object} options 动画配置选项
   */
  runAnimation(groupId, animType, options = {}) {
    const groupEls = this.getGroupElements(groupId);
    if (!groupEls.length) {
      return console.warn(`未找到编号为"${groupId}"的组`);
    }

    const animation = this.animations[animType];
    if (typeof animation === 'function') {
      return animation.call(this, { ...options, groupEls });
    } else {
      console.warn(`未定义动画类型"${animType}"`);
    }
  }

  /**
   * value1 动画逻辑：在data_graphic外部绘制轮廓动画
   */
value1({
    canvasId = "canvas",
    groupEls,
    highlightColor = "red",
    duration = 2,  // 绘制时长，不再需要重复参数
    lineWidth = 4  // 线条粗细，默认4px
}) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    // 找到组内的data_graphic元素，取内层 .canvas 作为定位参照
    const canvasEl = canvas.querySelector('.canvas') || canvas;
    const graphicEl = groupEls.find(el => el.dataset.type === "data_graphic");
    if (!graphicEl) return console.warn("未找到data_graphic元素");

    // 计算相对于 Canvas 的位置
    const left   = graphicEl.offsetLeft;
    const top    = graphicEl.offsetTop;
    const width  = graphicEl.offsetWidth;
    const height = graphicEl.offsetHeight;

    // 从 data-segmentation 获取多边形顶点数据
    const segmentationStr = graphicEl.getAttribute('data-segmentation');
    let points = "";
    try {
        const segmentationData = JSON.parse(segmentationStr);
        points = segmentationData[0].map(([x, y]) => `${x - left},${y - top}`).join(" ");
    } catch (e) {
        points = `0,0 ${width},0 ${width},${height} 0,${height}`;
    }

    // 创建 SVG 容器
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    Object.assign(svg.style, {
        position: "absolute",
        left: `${left}px`, top: `${top}px`,
        width: `${width}px`, height: `${height}px`,
        zIndex: 10, pointerEvents: "none", overflow: "visible"
    });

    // 创建轮廓路径
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M${points}Z`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", highlightColor);
    path.setAttribute("stroke-width", lineWidth);
    svg.appendChild(path);
    canvasEl.appendChild(svg);

    // 获取路径长度
    let pathLength;
    try {
        pathLength = path.getTotalLength();
    } catch (e) {
        pathLength = 2000;
    }
    path.setAttribute("stroke-dasharray", pathLength);
    path.setAttribute("stroke-dashoffset", pathLength);

    // 创建动画时间线（只执行一次，不重复）
    const tl = gsap.timeline();

    // 执行一次逆时针绘制动画
    tl.to(path, {
        strokeDashoffset: 0,    // 完全显示路径
        duration: duration,
        ease: "power1.inOut",
        onComplete: () => {
            // 动画完成后延迟清理 SVG
            gsap.delayedCall(2, () => {
                svg.remove();
                // 恢复文本缩放
                textElements.forEach(text => {
                    text.style.transform = "";
                    text.style.scale = "";
                });
            });
        }
    });

    // 文本同步动画（随绘制过程执行一次）
    const textElements = groupEls.filter(el => el.dataset.type === "text");
    textElements.forEach(text => {
        tl.to(text, {
            scale: 1.1,
            duration: duration / 2,
            ease: "sine.inOut"
        }, 0)
        .to(text, {
            scale: 1,
            duration: duration / 2,
            ease: "sine.inOut"
        }, duration / 2);
    });

    return { svg, path, timeline: tl };
}



  /**
   * value2 动画逻辑：全部元素变暗，所选元素flash
   */
  value2({ canvasId = "canvas", groupEls, highlightColor = "white", repeat = 0, duration = 1 }) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);



    const allElements = document.querySelectorAll('[data-group]');
    const targetElements = groupEls;
    // 找到组内元素
    const dataGraphic = groupEls.find(el => el.dataset.type === "data_graphic");
    const textElements = groupEls.filter(el => el.dataset.type === "text");
    const visualElements = groupEls.filter(el => el.dataset.type === "visual_ele"); // 新增视觉元素处理

    if (!dataGraphic) return console.warn("未找到data_graphic元素");
    if (!textElements.length) console.warn("未找到text元素");

    // 保存原始样式用于恢复
    const originalStyles = {
      dataGraphic: {
        opacity: dataGraphic.style.opacity,
        transform: dataGraphic.style.transform
      }
    };

    textElements.forEach((text, index) => {
      originalStyles[`text${index}`] = {
        opacity: text.style.opacity,
        transform: text.style.transform
      };
    });

    // 创建动画时间线
    const tl = gsap.timeline({
      repeat: repeat,
      onComplete: () => {
        // 动画完成后恢复原始样式
        dataGraphic.style.opacity = originalStyles.dataGraphic.opacity;
        dataGraphic.style.transform = originalStyles.dataGraphic.transform;
        textElements.forEach((text, index) => {
          text.style.opacity = originalStyles[`text${index}`].opacity;
          text.style.transform = originalStyles[`text${index}`].transform;
        });

        // 延迟清理所有元素样式
        gsap.delayedCall(2, () => {
          allElements.forEach(el => {
            el.style.filter = "";
            el.style.opacity = "";
          });
        });
      }
    });


    tl.to(allElements, {
        filter: `brightness(${0.3})`,  // 整体变暗
        opacity: 0.8,
        duration: duration * 0.5,
        ease: "power1.inOut"
    }, 0);

    // 步骤2：目标组元素闪烁点亮（默认闪烁3次）
    const flashCount = 3; // 闪烁次数
    const flashDuration = duration * 0.5; // 单次闪烁时长

    // 创建闪烁动画片段
    const flashTl = gsap.timeline({ repeat: flashCount - 1 });

    // 闪烁效果：高亮→稍暗→高亮
    flashTl.to(targetElements, {
        filter: `brightness(1.3) drop-shadow(0 0 8px ${highlightColor})`, // 高亮发光
        opacity: 1,
        duration: flashDuration / 2,
        ease: "power2.inOut"
    })
    .to(targetElements, {
        filter: `brightness(1.2) drop-shadow(0 0 4px ${highlightColor})`, // 稍暗
        duration: flashDuration / 2,
        ease: "power2.inOut"
    });

    // 将闪烁动画添加到主时间线（在整体变暗后开始）
    tl.add(flashTl, duration * 0.5);

    // 步骤3：最终保持高亮状态
    tl.to(targetElements, {
        filter: `brightness(1.3) drop-shadow(0 0 6px ${highlightColor})`,
        opacity: 1,
        duration: duration * 0.3,
        ease: "power1.out"
    });

    // 文本同步动画（随闪烁同步缩放）
    textElements.forEach(text => {
        tl.to(text, {
            scale: 1.1,
            duration: duration,
            ease: "sine.inOut"
        }, duration * 0.5) // 与闪烁同时开始
        .to(text, {
            scale: 1,
            duration: duration * 0.5,
            ease: "sine.out"
        }, duration * 1.5);
    });

    // 视觉元素额外轻微放大动画
    visualElements.forEach(ele => {
        tl.to(ele, {
            scale: 1.05,
            duration: duration,
            ease: "sine.inOut"
        }, duration * 0.5)
        .to(ele, {
            scale: 1,
            duration: duration * 0.5,
            ease: "sine.out"
        }, duration * 1.5);
    });

    return { timeline: tl };
  }
}

// 创建全局实例
const animController = new AnimationController();

// 导出到 window
window.value1 = function(canvasId = "canvas", groupIds = []) {
    const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    return animController.runAnimation(groupId, "value1");
};

window.value2 = function(canvasId = "canvas", groupIds = []) {
    const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    return animController.runAnimation(groupId, "value2");
};
})();

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    const animations = [value1, value2];
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
};

