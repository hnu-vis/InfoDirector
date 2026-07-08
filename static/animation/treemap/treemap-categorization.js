function categorization1(canvasId = "canvas", groupIds = []) {
  // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
  let canvas;
  if (canvasId === "animation-canvas") {
      canvas = document.querySelector("#animation-canvas .canvas");
  } else {
      canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn("Canvas not found");

  const svgNS = "http://www.w3.org/2000/svg";

  // 创建高亮 SVG 层（确保层级最高）
  const highlightLayer = document.createElementNS(svgNS, "svg");
  highlightLayer.setAttribute("width", "100%");
  highlightLayer.setAttribute("height", "100%");
  highlightLayer.style.position = "absolute";
  highlightLayer.style.top = "0";
  highlightLayer.style.left = "0";
  highlightLayer.style.pointerEvents = "none";
  highlightLayer.style.zIndex = 999;

  canvas.appendChild(highlightLayer);

  // 辅助函数：为元素生成轮廓点（优先用自带 segmentation，无则生成矩形轮廓）
  // segmentation 坐标是相对于元素自身的位置，需要加上元素的 offsetLeft/offsetTop
  const getElementOutlinePoints = (el) => {
    const seg = el.dataset.segmentation;
    // 1. 优先使用自带的 segmentation 轮廓点（坐标是相对元素自身的位置）
    if (seg && seg !== "[]") {
      try {
        const points = JSON.parse(seg);
        if (points.length >= 3) {
          // points 格式为 [[x, y], [x, y], ...]，x/y 是相对于元素自身的位置
          // 需要加上元素的 offsetLeft/offsetTop 转换为相对于 canvas 的坐标
          const left = el.offsetLeft;
          const top = el.offsetTop;
          return points.map(([x, y]) => [x + left, y + top]);
        }
      } catch (e) {
        console.warn("解析自带轮廓点失败，生成矩形轮廓:", e);
      }
    }

    // 2. 自带轮廓无效，生成元素矩形轮廓（4个角点）
    const left = el.offsetLeft;
    const top = el.offsetTop;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    return [
      [left, top],          // 左上角
      [left + width, top],  // 右上角
      [left + width, top + height], // 右下角
      [left, top + height]  // 左下角
    ];
  };

  groupIds.forEach(groupId => {
    const dataGraphicEls = canvas.querySelectorAll(
      `.element[data-group="${groupId}"][data-type="data_graphic"]`
    );

    if (dataGraphicEls.length === 0) {
      console.warn(`组 ${groupId} 未找到 data_graphic 元素`);
      return;
    }

    dataGraphicEls.forEach(el => {
      // 获取轮廓点（自带或自动生成）
      const points = getElementOutlinePoints(el);
      if (points.length < 3) return;

      // 转换为 SVG polygon 所需格式
      const pointsStr = points.map(([x, y]) => `${x},${y}`).join(" ");

      // 创建高亮多边形
      const polygon = document.createElementNS(svgNS, "polygon");
      polygon.setAttribute("points", pointsStr);
      polygon.setAttribute("fill", "rgba(255,0,0,0.3)"); // 半透明红色高亮
      polygon.setAttribute("stroke", "rgba(255,0,0,0.8)");
      polygon.setAttribute("stroke-width", "3");
      polygon.style.opacity = 0;
      highlightLayer.appendChild(polygon);

      // 渐显动画
      gsap.to(polygon, {
        opacity: 1,
        duration: 0.8,
        ease: "power2.out",
        onComplete: () => {
          // 动画完成后延迟清理
          gsap.delayedCall(2, () => {
            gsap.to(polygon, {
              opacity: 0,
              duration: 0.5,
              onComplete: () => {
                // 只有当所有 polygon 都消失后才移除 SVG 层
                const remaining = highlightLayer.querySelectorAll("polygon[style='opacity: 1'], polygon:not([style*='opacity'])");
                if (remaining.length === 0 && highlightLayer.parentNode) {
                  highlightLayer.remove();
                }
              }
            });
          });
        }
      });
    });
  });
}


function categorization2(canvasId = "canvas", groupIds = []) {
  // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
  let canvas;
  if (canvasId === "animation-canvas") {
      canvas = document.querySelector("#animation-canvas .canvas");
  } else {
      canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn("Canvas not found");

  const svgNS = "http://www.w3.org/2000/svg";

  // 创建高亮 SVG 层
  const highlightLayer = document.createElementNS(svgNS, "svg");
  highlightLayer.setAttribute("width", "100%");
  highlightLayer.setAttribute("height", "100%");
  highlightLayer.style.position = "absolute";
  highlightLayer.style.left = "0";
  highlightLayer.style.top = "0";
  highlightLayer.style.pointerEvents = "none";
  highlightLayer.style.zIndex = 999; // 在 data_graphic 上方
  canvas.appendChild(highlightLayer);

  // 辅助函数：为 data_graphic 生成轮廓点（优先用自带数据，否则生成矩形）
  // segmentation 坐标是相对于元素自身的位置，需要加上元素的 offsetLeft/offsetTop
  const getElementOutlinePoints = (el) => {
    const seg = el.dataset.segmentation;
    // 1. 尝试使用自带的 segmentation 数据
    if (seg && seg !== "[]") {
      try {
        const points = JSON.parse(seg);
        if (points.length >= 3) {
          const left = el.offsetLeft;
          const top = el.offsetTop;
          return points.map(([x, y]) => [x + left, y + top]);
        }
      } catch (e) {
        console.warn("解析自带轮廓点失败，使用矩形轮廓:", e);
      }
    }

    // 2. 自动生成矩形轮廓（4个角点）
    const left = el.offsetLeft;
    const top = el.offsetTop;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    return [
      [left, top],          // 左上角
      [left + width, top],  // 右上角
      [left + width, top + height], // 右下角
      [left, top + height]  // 左下角
    ];
  };

  groupIds.forEach(groupId => {
    // 仅处理 data_graphic 类型元素
    const dataEls = canvas.querySelectorAll(`.element[data-group="${groupId}"][data-type="data_graphic"]`);
    // 保留 visual 元素的脉冲效果
    const visualEls = canvas.querySelectorAll(`.element[data-group="${groupId}"][data-type="visual_ele"]`);

    dataEls.forEach(el => {
      // 获取轮廓点（自带或自动生成）
      const points = getElementOutlinePoints(el);
      if (points.length < 3) return;

      const pointsStr = points.map(([x, y]) => `${x},${y}`).join(" ");
      const polygon = document.createElementNS(svgNS, "polygon");
      polygon.setAttribute("points", pointsStr);
      polygon.setAttribute("fill", "rgba(255, 230, 0, 0.66)"); // 黄色高亮
      polygon.style.opacity = 0;
      highlightLayer.appendChild(polygon);

      // 闪烁动画：出现 -> 消失（执行后自动移除元素）
      gsap.fromTo(polygon,
        { opacity: 0 },
        { opacity: 1, duration: 0.15, yoyo: true, repeat: 1, onComplete: () => polygon.remove() }
      );
    });

    // visual 元素脉冲动画（保留原功能）
    visualEls.forEach(ve => {
      gsap.fromTo(ve,
        { scale: 1 },
        { scale: 1.2, duration: 0.3, yoyo: true, repeat: 1, ease: "power1.inOut" }
      );
    });
  });

  // 动画完成后延迟清理
  gsap.delayedCall(3, () => {
    if (highlightLayer && highlightLayer.parentNode) {
      highlightLayer.remove();
    }
  });
}

/**
 * categorization3 - 分组独立轮廓+指向标注（保持不变）
 */
function categorization3(canvasId = "canvas", groupIds = [], targetGroupId, outlineColor = "red", borderWidth = 3, transition = 1, labelText = "重点区域", labelColor = "grey", arrowColor = "green", labelOffset = 120, arrowHeadSize = 10, arrowLineWidth = 3, labelMaxWidth = 100, arrowLabelGap = 20, arrowHeadTargetGap = 5) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn("Canvas not found");

    if (!groupIds || !groupIds.length) return console.warn("请提供有效的组ID数组");

    targetGroupId = targetGroupId || groupIds[0];
    if (!targetGroupId || !groupIds.includes(targetGroupId)) {
        targetGroupId = groupIds[0];
        console.warn(`目标组不存在，自动指向第一个组 ${targetGroupId}`);
    }

    const elements = {
        outlines: [],
        arrow: null,
        label: null,
        timeline: gsap.timeline()
    };

    // 辅助函数：获取元素相对于 canvas 的位置
    const getElementAbsRect = (el) => {
        return {
            left: el.offsetLeft,
            top: el.offsetTop,
            width: el.offsetWidth,
            height: el.offsetHeight,
            centerX: el.offsetLeft + el.offsetWidth / 2,
            centerY: el.offsetTop + el.offsetHeight / 2
        };
    };

    // 辅助函数：生成data_graphic轮廓点
    // segmentation 坐标是相对于元素自身的位置，需要加上元素的 offsetLeft/offsetTop
    const getElementOutlinePoints = (el) => {
        const seg = el.dataset.segmentation;
        if (seg && seg !== "[]") {
            try {
                const points = JSON.parse(seg);
                if (points.length >= 3) {
                    const left = el.offsetLeft;
                    const top = el.offsetTop;
                    return points.map(([x, y]) => [x + left, y + top]);
                }
            } catch (e) {}
        }
        const left = el.offsetLeft;
        const top = el.offsetTop;
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        return [[left, top], [left + width, top], [left + width, top + height], [left, top + height]];
    };

    // 计算目标组中心
    const calculateTargetCenter = (targetGroupId) => {
        const dataEls = canvas.querySelectorAll(`.element[data-group="${targetGroupId}"][data-type="data_graphic"]`);
        if (!dataEls.length) return { x: canvas.offsetWidth / 2, y: canvas.offsetHeight / 2 };

        let totalX = 0, totalY = 0;
        dataEls.forEach(el => {
            const { centerX, centerY } = getElementAbsRect(el);
            totalX += centerX;
            totalY += centerY;
        });
        return { x: totalX / dataEls.length, y: totalY / dataEls.length };
    };

    // 计算标注位置（右→左→上→下）
    const calculateAnnotationPos = (targetCenter) => {
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;

        // 1. 右侧
        let pos = {
            labelX: targetCenter.x + labelOffset,
            labelY: targetCenter.y,
            arrowStartX: targetCenter.x + labelOffset - arrowLabelGap,
            arrowStartY: targetCenter.y,
            arrowEndX: targetCenter.x - arrowHeadTargetGap,
            arrowEndY: targetCenter.y
        };

        // 右侧超出 → 左侧
        if (pos.labelX + labelMaxWidth > canvasWidth - 20) {
            pos = {
                labelX: targetCenter.x - labelOffset - labelMaxWidth,
                labelY: targetCenter.y,
                arrowStartX: targetCenter.x - labelOffset + arrowLabelGap,
                arrowStartY: targetCenter.y,
                arrowEndX: targetCenter.x + arrowHeadTargetGap,
                arrowEndY: targetCenter.y
            };

            // 左侧超出 → 上方
            if (pos.labelX < 20) {
                pos = {
                    labelX: targetCenter.x,
                    labelY: targetCenter.y - labelOffset,
                    arrowStartX: targetCenter.x,
                    arrowStartY: targetCenter.y - labelOffset + arrowLabelGap,
                    arrowEndX: targetCenter.x,
                    arrowEndY: targetCenter.y + arrowHeadTargetGap
                };

                // 上方超出 → 下方
                if (pos.labelY < 20) {
                    pos = {
                        labelX: targetCenter.x,
                        labelY: targetCenter.y + labelOffset,
                        arrowStartX: targetCenter.x,
                        arrowStartY: targetCenter.y + labelOffset - arrowLabelGap,
                        arrowEndX: targetCenter.x,
                        arrowEndY: targetCenter.y - arrowHeadTargetGap
                    };
                }
            }
        }

        return pos;
    };

    // 初始化轮廓
    const initOutlines = () => {
        groupIds.forEach((groupId, index) => {
            const dataEls = canvas.querySelectorAll(`.element[data-group="${groupId}"][data-type="data_graphic"]`);
            if (!dataEls.length) {
                console.warn(`组 ${groupId} 未找到 data_graphic 元素`);
                return;
            }

            dataEls.forEach(el => {
                const points = getElementOutlinePoints(el);
                const pointsStr = points.map(([x, y]) => `${x},${y}`).join(" ");

                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                Object.assign(svg.style, {
                    position: "absolute",
                    left: "0",
                    top: "0",
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: "100"
                });

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", `M${pointsStr} Z`);
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", outlineColor);
                path.setAttribute("stroke-width", borderWidth);
                path.setAttribute("stroke-linejoin", "round");
                path.style.opacity = 0;
                svg.appendChild(path);
                canvas.appendChild(svg);
                elements.outlines.push(svg);

                const pathLength = path.getTotalLength();
                path.style.strokeDasharray = pathLength;
                path.style.strokeDashoffset = pathLength;
                elements.timeline.to(path, {
                    opacity: 1,
                    strokeDashoffset: 0,
                    duration: transition,
                    ease: "power2.out"
                }, index * transition * 0.3);
            });
        });
    };

    // 初始化箭头和标注（简化箭头生成逻辑，确保显示）
    const initAnnotation = () => {
        const targetCenter = calculateTargetCenter(targetGroupId);
        const annotationPos = calculateAnnotationPos(targetCenter);
        const { arrowStartX, arrowStartY, arrowEndX, arrowEndY, labelX, labelY } = annotationPos;

        // 1. 创建文字框
        const label = document.createElement("div");
        Object.assign(label.style, {
            position: "absolute",
            left: `${labelX}px`,
            top: `${labelY}px`,
            width: `${labelMaxWidth}px`,
            padding: "6px 10px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            color: labelColor,
            fontSize: "14px",
            fontWeight: "bold",
            pointerEvents: "none",
            zIndex: "105",
            opacity: 0,
            transform: "translateY(-10px)",
            wordWrap: "break-word",
            textAlign: "center"
        });
        label.textContent = labelText;
        canvas.appendChild(label);
        elements.label = label;

        // 2. 创建箭头（简化版，确保显示）
        const arrowSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        Object.assign(arrowSvg.style, {
            position: "absolute",
            left: "0",
            top: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: "105",
            opacity: 0
        });

        // 计算箭头方向
        const dx = arrowEndX - arrowStartX;
        const dy = arrowEndY - arrowStartY;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // 箭头头部三角形
        const headX1 = arrowEndX - arrowHeadSize * Math.cos((angle - 30) * Math.PI / 180);
        const headY1 = arrowEndY - arrowHeadSize * Math.sin((angle - 30) * Math.PI / 180);
        const headX2 = arrowEndX - arrowHeadSize * Math.cos((angle + 30) * Math.PI / 180);
        const headY2 = arrowEndY - arrowHeadSize * Math.sin((angle + 30) * Math.PI / 180);

        // 生成箭头路径
        const arrowPathStr = `
            M ${arrowStartX} ${arrowStartY}
            L ${arrowEndX} ${arrowEndY}
            L ${headX1} ${headY1}
            L ${arrowEndX} ${arrowEndY}
            L ${headX2} ${headY2}
            Z
        `.replace(/\s+/g, " ").trim();

        const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arrowPath.setAttribute("d", arrowPathStr);
        arrowPath.setAttribute("fill", arrowColor);
        arrowPath.setAttribute("stroke", arrowColor);
        arrowPath.setAttribute("stroke-width", arrowLineWidth);
        arrowSvg.appendChild(arrowPath);
        canvas.appendChild(arrowSvg);
        elements.arrow = arrowSvg;

        // 标注动画
        elements.timeline
            .to(arrowSvg, { opacity: 1, duration: transition * 0.8, ease: "power2.out" }, "-=0.2")
            .to(label, {
                opacity: 1,
                transform: "translateY(0)",
                duration: transition * 0.8,
                ease: "power2.out"
            }, "-=0.3");
    };

    // 初始化执行
    initOutlines();
    initAnnotation();

    // 添加动画完成后的清理逻辑
    elements.timeline.call(() => {
      gsap.delayedCall(2, () => {
        // 移除所有轮廓 SVG
        elements.outlines.forEach(svg => {
          if (svg && svg.parentNode) {
            gsap.to(svg, {
              opacity: 0,
              duration: 0.5,
              onComplete: () => svg.remove()
            });
          }
        });
        // 移除箭头和标注
        if (elements.arrow && elements.arrow.parentNode) {
          gsap.to(elements.arrow, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => elements.arrow.remove()
          });
        }
        if (elements.label && elements.label.parentNode) {
          gsap.to(elements.label, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => elements.label.remove()
          });
        }
      });
    });

    return elements;
}


window.categorization1 = categorization1;
window.categorization2 = categorization2;
window.categorization3 = categorization3;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    const animations = [categorization1, categorization2];
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

