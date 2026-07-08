//高亮显示
function extreme1(canvasId = "canvas", groupIds = [], dimBrightness = 1.5, scaleUp = 1.1) {
  // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
  let canvas;
  if (canvasId === "animation-canvas") {
      canvas = document.querySelector("#animation-canvas .canvas");
  } else {
      canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);

  const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
  const targetGroupEls = canvas.querySelectorAll(`.element[data-group='${groupId}']`);
  const targetSet = new Set();

  // 把目标组及其所有子孙元素加入集合
  targetGroupEls.forEach(el => {
    targetSet.add(el); // 最外层
    el.querySelectorAll('*').forEach(child => targetSet.add(child)); // 所有子元素
  });

  const allElements = canvas.querySelectorAll(".element, img");

  // 创建时间轴
  const tl = gsap.timeline();

  //暗化目标组
  allElements.forEach(el => {
    if (targetSet.has(el)) {
      tl.to(el, { filter: `brightness(${dimBrightness})`, duration: 1.5, ease: "power2.inOut" }, 0);
    } else {
      tl.to(el, { filter: "brightness(1)", duration: 1.5, ease: "power2.inOut" }, 0);
    }
  });

  // 动画完成后恢复初始状态
  tl.call(() => {
    gsap.delayedCall(4, () => {
      allElements.forEach(el => {
        el.style.filter = "";
        el.style.opacity = "";
      });
    });
  });
}

function extreme2(canvasId = "canvas", groupIds = [], duration = 2.0, ease = "power2.inOut") {
  let canvas;
  if (canvasId === "animation-canvas") {
    canvas = document.querySelector("#animation-canvas .canvas");
  } else {
    canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn("未找到canvas元素: " + canvasId);

  const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
  if (!groupId) return console.error("必须传入 groupId");

  const targetEls = Array.from(canvas.querySelectorAll(`.element[data-group="${groupId}"]`));
  if (targetEls.length === 0) return console.error("目标组无元素");

  // 按组归类其他元素
  const allElements = Array.from(canvas.querySelectorAll(".element"));
  const groupMap = {};
  allElements.forEach(el => {
    const g = el.dataset.group;
    if (!g || g === groupId) return;
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(el);
  });

  // 计算每组中心
  let otherGroups = Object.entries(groupMap).map(([gName, els]) => {
    const rects = els.map(el => el.getBoundingClientRect());
    const cx = rects.reduce((s, r) => s + r.left + r.width / 2, 0) / rects.length;
    const cy = rects.reduce((s, r) => s + r.top + r.height / 2, 0) / rects.length;
    return { name: gName, els, cx, cy };
  });

  // 目标组中心
  const targetRects = targetEls.map(el => el.getBoundingClientRect());
  const targetCx = targetRects.reduce((s, r) => s + r.left + r.width / 2, 0) / targetRects.length;
  const targetCy = targetRects.reduce((s, r) => s + r.top + r.height / 2, 0) / targetRects.length;

  // 按距离从远到近排序
  otherGroups.sort((a, b) => {
    const dA = Math.hypot(a.cx - targetCx, a.cy - targetCy);
    const dB = Math.hypot(b.cx - targetCx, b.cy - targetCy);
    return dB - dA;
  });

  // 容器
  const container = document.createElement('div');
  Object.assign(container.style, { position: 'absolute', left: 0, top: 0, zIndex: 2000 });
  canvas.appendChild(container);

  targetEls.forEach(el => {
    const l = el.offsetLeft, t = el.offsetTop;
    container.appendChild(el);
    el.style.position = 'absolute';
    el.style.left = l + 'px';
    el.style.top = t + 'px';
    el.style.transform = 'none';
  });

  // 画布中心
  const canvasRect = canvas.getBoundingClientRect();
  const canvasCenterX = canvasRect.left + canvasRect.width / 2;
  const canvasCenterY = canvasRect.top + canvasRect.height / 2;

  const moveX = canvasCenterX - targetCx;
  const moveY = canvasCenterY - targetCy;

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.delayedCall(3, () => {
        allElements.forEach(el => gsap.set(el, { opacity:1, scale:1 }));
        gsap.set(container, { x:0, y:0, scale:1 });
      });
    }
  });

  // 其他组依次消失
  let time = 0;
  otherGroups.forEach(group => {
    tl.to(group.els, {
      opacity: 0,
      scale: 0.5,
      duration: 0.4,
      ease: "power1.in"
    }, time);
    time += 0.2;
  });

  // 移到中心
  tl.to(container, {
    x: moveX,
    y: moveY,
    duration: 0.8,
    ease
  }, time);

  // ✅ 以画布中心为原点均匀放大，不改变位置
  // 画布中心在容器自身坐标系统中的位置
  const originInContainerX = canvas.offsetWidth / 2 - moveX;
  const originInContainerY = canvas.offsetHeight / 2 - moveY;
  tl.to(container, {
    scale: 1.2,
    duration: 0.6,
    ease: "power2.out",
    transformOrigin: `${originInContainerX}px ${originInContainerY}px`
  });

  return tl;
}
/**
 * extreme3: 镜头推进 + 手绘箭头绘制指示
 * @param {string} canvasId - 容器ID
 * @param {string} groupId - 目标组ID
 * @param {number} zoomLevel - 放大倍数
 * @param {number} duration - 动画时长
 */
function extreme3(canvasId = "canvas", groupIds = [], zoomLevel = 1.2, duration = 1.5) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);

    const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    if (!groupId) return console.warn("必须传入 groupId");

    // 1. 获取所有带组号的元素
    const allGroupEls = Array.from(canvas.querySelectorAll(".element[data-group]"));
    
    // 筛选目标组和非目标组
    const targetEls = allGroupEls.filter(el => el.dataset.group === groupId);
    const otherEls = allGroupEls.filter(el => el.dataset.group !== groupId);

    if (targetEls.length === 0) return console.warn(`组 ${groupId} 为空`);

    // 2. 清理旧箭头
    const oldArrow = document.getElementById(`arrow-${groupId}`);
    if (oldArrow) oldArrow.remove();

    // 3. 计算目标组的中心点和边界 (用于镜头聚焦和箭头定位)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    targetEls.forEach(el => {
        const x = el.offsetLeft;
        const y = el.offsetTop;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
    });

    const targetCenterX = minX + (maxX - minX) / 2;
    const targetCenterY = minY + (maxY - minY) / 2;

    // 4. 创建手绘箭头 SVG
    // 设定箭头位置：指向目标组的右上角
    const arrowEndX = maxX;       // 箭头尖端 X (接触目标右侧)
    const arrowEndY = minY;       // 箭头尖端 Y (接触目标顶部)
    const arrowStartX = maxX + 60; // 箭头尾部 X (向右偏 60px)
    const arrowStartY = minY - 60; // 箭头尾部 Y (向上偏 60px)

    const svgNS = "http://www.w3.org/2000/svg";
    const arrowSvg = document.createElementNS(svgNS, "svg");
    arrowSvg.id = `arrow-${groupId}`;
    Object.assign(arrowSvg.style, {
        position: "absolute",
        left: "0", top: "0", width: "100%", height: "100%", // 全屏覆盖以便画任意位置
        zIndex: 3000, pointerEvents: "none", overflow: "visible"
    });

    // 创建路径 (带弧度的贝塞尔曲线)
    const path = document.createElementNS(svgNS, "path");
    // 控制点：让线条弯曲一点
    const controlX = arrowStartX; 
    const controlY = arrowEndY; 
    
    // 路径：主线 + 箭头头
    // 主线: M Start Q Control End
    const dMain = `M ${arrowStartX} ${arrowStartY} Q ${controlX} ${controlY} ${arrowEndX} ${arrowEndY}`;
    
    // 箭头头: 在 End 点画两笔
    // 简单的计算：向右上方偏一点
    const headLen = 15;
    const dHead = `M ${arrowEndX} ${arrowEndY} l ${headLen} -5 M ${arrowEndX} ${arrowEndY} l 5 -15`;

    path.setAttribute("d", dMain + " " + dHead);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#ff0000"); // 红色箭头
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    arrowSvg.appendChild(path);

    // 5. 动画时间轴
    const tl = gsap.timeline({
        onComplete: () => {
            // 动画完成后恢复初始状态
            gsap.delayedCall(4, () => {
                targetEls.forEach(el => {
                    el.style.filter = "";
                });
                otherEls.forEach(el => {
                    el.style.filter = "";
                    el.style.opacity = "";
                });
                gsap.set(canvas, { scale: 1 });
                arrowSvg.remove();
            });
        }
    });

    // --- Step A: 暗化目标组 ---
    tl.to(targetEls, {
        filter: "brightness(0.5)",
        duration: 1.5,
        ease: "power2.inOut"
    }, 0);

    // --- Step B: 镜头推进 ---
    // 先设置缩放原点
    gsap.set(canvas, { transformOrigin: `${targetCenterX}px ${targetCenterY}px` });

    tl.to(canvas, {
        scale: zoomLevel,
        duration: duration,
        ease: "power2.inOut"
    }, 0);

    // --- Step C: 箭头绘制 (Draw Animation) ---
    // 必须先把 SVG 加入 DOM 才能获取 path 长度
    canvas.appendChild(arrowSvg);
    const len = path.getTotalLength();
    // 初始隐藏
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });

    // 镜头推进到一半时开始画
    tl.to(path, {
        strokeDashoffset: 0,
        duration: 0.8,
        ease: "power1.out"
    }, duration * 0.4);

    return tl;
}


window.extreme1 = extreme1;
window.extreme2 = extreme2;
window.extreme3 = extreme3;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    const animations = [extreme1, extreme2, extreme3];
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
