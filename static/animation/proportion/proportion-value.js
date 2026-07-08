function value1(canvasId = "canvas", groupIds = []) {
  // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
  let canvas;
  if (canvasId === "animation-canvas") {
      canvas = document.querySelector("#animation-canvas .canvas");
  } else {
      canvas = document.getElementById(canvasId);
  }
  if (!canvas) return console.warn(`未找到 canvas, canvasId=${canvasId}`);

  // 支持单个 groupId 或数组
  const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;

  const graphics = canvas.querySelectorAll(`.element[data-type="data_graphic"][data-group="${groupId}"]`);
  const visuals = canvas.querySelectorAll(`.element[data-type="visual"][data-group="${groupId}"]`);
  const texts = canvas.querySelectorAll(`.element[data-type="text"][data-group="${groupId}"]`);

  if (!graphics.length && !visuals.length && !texts.length) {
    return console.warn(`未找到组 ${groupId} 的元素`);
  }

  // ✅ 初始全部隐藏
  [...graphics, ...visuals, ...texts].forEach(el => {
    el.style.opacity = 0;
    el.style.transform = "scale(0.7) translateY(30px)";
  });

  // ✅ 构建时间线
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  // 🔹 Step 1: 主体 data_graphic 强调弹入
  tl.addLabel("graphicsIn")
    .to(graphics, {
      opacity: 1,
      scale: 1.25, // 更大幅度的弹出
      y: 0,
      duration: 0.7,
      stagger: 0.1,
      ease: "back.out(3)" // 更强的回弹
    }, "graphicsIn")
    .to(graphics, {
      scale: 1,
      duration: 0.4,
      ease: "power2.out"
    }, "graphicsIn+=0.6");

  // 🔹 Step 2: visual 元素渐显上浮（更柔和、稍后一点）
  tl.addLabel("visualsIn", ">-0.1")
    .fromTo(visuals,
      { opacity: 0, scale: 0.8, y: 25 },
      {
        opacity: 1,
        scale: 1.05,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out"
      },
      "visualsIn"
    )
    .to(visuals, {
      scale: 1,
      duration: 0.3,
      ease: "power1.out"
    }, "visualsIn+=0.7");

  // 🔹 Step 3: text 元素轻盈渐显（末尾补充）
  tl.addLabel("textsIn", ">-0.05")
    .fromTo(texts,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.15,
        ease: "power2.out"
      },
      "textsIn"
    );

  // 🔹 Step 4: 结尾轻微整体呼吸感（强化整体完成感）
  tl.to([...graphics, ...visuals, ...texts], {
    scale: 1.02,
    duration: 0.4,
    yoyo: true,
    repeat: 1,
    ease: "sine.inOut"
  }, ">0.2");

  // 🔹 Step 5: 恢复初始状态
  tl.to([...graphics, ...visuals, ...texts], {
    opacity: 1,
    scale: 1,
    y: 0,
    duration: 0.3,
    ease: "power2.out",
    onComplete: () => {
      [...graphics, ...visuals, ...texts].forEach(el => {
        el.style.opacity = "";
        el.style.transform = "";
      });
    }
  });

  console.log(`🌟 已为组 ${groupId} 播放强化版 bounce + 渐显动画`);
}



function value2(canvasId = "canvas", groupIds = [], xGroupIds = []) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn(`未找到 canvas, canvasId=${canvasId}`);

    // 支持单个 groupId 或数组
    const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    if (!groupId) return console.warn(`未提供 groupId`);

    // 清空旧轮廓
    canvas.querySelectorAll(".sketch-outline, .text-underline").forEach(el => el.remove());

    // 重置 canvas 变换
    canvas.style.transform = "none";
    canvas.style.transformOrigin = "0 0";

    // 获取 datagraphic 元素（用 xGroupIds 或 groupIds）
    const targetGroupId = Array.isArray(xGroupIds) && xGroupIds.length > 0 ? xGroupIds[0] : groupId;
    const dataGraphics = canvas.querySelectorAll(`.element[data-type="data_graphic"][data-group="${targetGroupId}"]`);
    const visuals = canvas.querySelectorAll(`.element[data-type="visual"][data-group="${targetGroupId}"]`);
    const texts = canvas.querySelectorAll(`.element[data-type="text"][data-group="${targetGroupId}"]`);

    // 生成手写下划线路径
    function createHandwrittenUnderline(x, y, width) {
        const points = [];
        const step = 3;
        for (let px = x; px <= x + width; px += step) {
            const py = y + (Math.random() - 0.5) * 2;
            points.push([px, py]);
        }
        return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(' ');
    }

    // 获取 datagraphic 的位置来计算 zoom 目标
    const dg = dataGraphics[0];
    if (!dg) return console.warn(`未找到 datagraphic group: ${targetGroupId}`);

    const dgRect = dg.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    // 计算 canvas 内 datagraphic 的相对位置
    const targetLeft = dgRect.left - canvasRect.left;
    const targetTop = dgRect.top - canvasRect.top;
    const targetWidth = dgRect.width;
    const targetHeight = dgRect.height;

    // 计算 zoom 比例和 transformOrigin（聚焦到 datagraphic 中心）
    const zoomScale = 2;
    const originX = targetLeft + targetWidth / 2;
    const originY = targetTop + targetHeight / 2;

    const tl = gsap.timeline();

    // Zoom 动画 - 以 datagraphic 中心为原点放大
    tl.to(canvas, {
        scale: zoomScale,
        transformOrigin: `${originX}px ${originY}px`,
        duration: 1,
        ease: "power3.inOut"
    });

    // Zoom 完成后 -> Visual outline 发光
    tl.call(() => {
        visuals.forEach(el => {
            if (!el.dataset.segmentation) return;
            let points;
            try { points = JSON.parse(el.dataset.segmentation); } catch { return; }
            if (!points.length) return;

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add("sketch-outline");
            svg.setAttribute("width", canvas.offsetWidth);
            svg.setAttribute("height", canvas.offsetHeight);
            svg.style.position = "absolute";
            svg.style.left = "0px";
            svg.style.top = "0px";
            svg.style.pointerEvents = "none";
            svg.style.zIndex = 9999;

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const jitter = 1;
            const pathStr = points[0].map((p, i) => {
                const x = p[0] + (Math.random() - 0.5) * jitter;
                const y = p[1] + (Math.random() - 0.5) * jitter;
                return `${i === 0 ? "M" : "L"}${x},${y}`;
            }).join(" ") + " Z";

            path.setAttribute("d", pathStr);
            path.setAttribute("stroke", "#ffcc00");
            path.setAttribute("stroke-width", "3");
            path.setAttribute("fill", "none");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");

            // 发光滤镜
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
            filter.setAttribute("id", `glow-${targetGroupId}-${Math.random().toString(36).substr(2,5)}`);
            const feGaussian = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
            feGaussian.setAttribute("stdDeviation", "2.5");
            feGaussian.setAttribute("result", "coloredBlur");
            const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
            const feMergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
            feMergeNode1.setAttribute("in", "coloredBlur");
            const feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
            feMergeNode2.setAttribute("in", "SourceGraphic");
            feMerge.append(feMergeNode1, feMergeNode2);
            filter.append(feGaussian, feMerge);
            defs.appendChild(filter);
            path.setAttribute("filter", `url(#${filter.id})`);

            svg.append(defs, path);
            canvas.appendChild(svg);
        });
    });

    // 停顿 0.5s
    tl.to({}, { duration: 0.5 });

    // 手写下划线文本
    tl.call(() => {
        texts.forEach(el => {
            const rect = el.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const scaleX = canvas.offsetWidth / canvasRect.width;
            const scaleY = canvas.offsetHeight / canvasRect.height;

            const x = (rect.left - canvasRect.left) * scaleX;
            const y = (rect.bottom - canvasRect.top) * scaleY;
            const width = rect.width * scaleX;

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add("text-underline");
            svg.setAttribute("width", canvas.offsetWidth);
            svg.setAttribute("height", canvas.offsetHeight);
            svg.style.position = "absolute";
            svg.style.left = "0px";
            svg.style.top = "0px";
            svg.style.pointerEvents = "none";
            svg.style.zIndex = 9999;

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", createHandwrittenUnderline(x, y, width));
            path.setAttribute("stroke", "red");
            path.setAttribute("stroke-width", "2");
            path.setAttribute("fill", "none");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");

            svg.appendChild(path);
            canvas.appendChild(svg);

            // 绘制动画
            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;
            gsap.to(path.style, { strokeDashoffset: 0, duration: 1.5, ease: "power1.inOut" });
        });
    });

    // 停顿 1s
    tl.to({}, { duration: 1 });

    // 恢复初始状态
    tl.to(canvas, {
        scale: 1,
        transformOrigin: "center center",
        duration: 0.5,
        ease: "power2.out"
    });

    tl.call(() => {
        canvas.querySelectorAll(".sketch-outline, .text-underline").forEach(el => el.remove());
    });

    tl.play();

    console.log(`✅ 已处理组 ${targetGroupId}：Zoom -> glow visual -> hand-drawn underline text`);
}

// 调用示例
// value2("G4");
function value3(canvasId = "canvas", groupIds = []) {
    // 支持单个 groupId 或数组
    const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn(`未找到 canvas, canvasId=${canvasId}`);

    // 清理旧遮罩和动画层
    canvas.querySelectorAll(".mask-layer, .enlarge-effect").forEach(el => el.remove());

    // 遍历 data_graphic 添加轮廓遮罩
    const dataGraphics = canvas.querySelectorAll(`.element[data-type="data_graphic"][data-group="${groupId}"]`);
    dataGraphics.forEach(el => {
        if (!el.dataset.segmentation) return;
        let points;
        try { points = JSON.parse(el.dataset.segmentation); } catch { return; }
        if (!points.length) return;

        // 获取 datagraphic 元素的位置
        const dgLeft = el.offsetLeft;
        const dgTop = el.offsetTop;
        const dgWidth = el.offsetWidth;
        const dgHeight = el.offsetHeight;

        console.log('datagraphic:', { dgLeft, dgTop, dgWidth, dgHeight });
        console.log('points length:', points.length, 'points[0]:', points[0]);

        // 如果 points[0] 还是数组，说明有嵌套，取第一个多边形
        let polygon = points;
        if (Array.isArray(points[0])) {
            polygon = points[0];
        }
        console.log('polygon length:', polygon.length, 'first 3:', polygon.slice(0, 3));

        // 创建 SVG 遮罩层 - 定位到 datagraphic 元素位置
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("mask-layer");
        svg.style.position = "absolute";
        svg.style.left = dgLeft + "px";
        svg.style.top = dgTop + "px";
        svg.style.width = dgWidth + "px";
        svg.style.height = dgHeight + "px";
        svg.style.pointerEvents = "none";
        svg.style.zIndex = 99999;
        svg.style.overflow = "visible";

        // 将绝对坐标转换为相对于元素的位置
        const pathStr = polygon.map((p, i) => {
            const relX = p[0] - dgLeft;
            const relY = p[1] - dgTop;
            return `${i === 0 ? "M" : "L"}${relX},${relY}`;
        }).join(" ") + " Z";
        console.log('pathStr length:', pathStr.length, 'first 100:', pathStr.substring(0, 100));

        // 遮罩填充 - 灰色不透明
        const maskFill = document.createElementNS("http://www.w3.org/2000/svg", "path");
        maskFill.setAttribute("d", pathStr);
        maskFill.setAttribute("fill", "gray");
        maskFill.setAttribute("stroke", "red");
        maskFill.setAttribute("stroke-width", "2");

        // 轮廓路径 - 使用相同的相对坐标路径
        const outline = document.createElementNS("http://www.w3.org/2000/svg", "path");
        outline.setAttribute("d", pathStr);
        outline.setAttribute("fill", "none");
        outline.setAttribute("stroke", "#ffcc00");
        outline.setAttribute("stroke-width", "3");
        outline.setAttribute("stroke-dasharray", "8 4");

        svg.appendChild(maskFill);
        svg.appendChild(outline);
        canvas.appendChild(svg);

        // 虚线动画
        gsap.fromTo(outline, { strokeDashoffset: 100 }, {
            strokeDashoffset: 0,
            duration: 1.5,
            ease: "power1.inOut",
            repeat: -1,
            yoyo: true
        });

        // 2秒后遮罩掉落
        gsap.delayedCall(2, () => {
            gsap.killTweensOf(outline);
            gsap.to(svg, {
                y: 200,
                opacity: 0,
                duration: 1,
                ease: "power2.in",
                onComplete: () => svg.remove()
            });
        });
    });

    // 掉落完成后放大 visual 和 text
    gsap.delayedCall(3, () => {
        const visuals = canvas.querySelectorAll(`.element[data-type="visual"][data-group="${groupId}"]`);
        const texts = canvas.querySelectorAll(`.element[data-type="text"][data-group="${groupId}"]`);
        const all = [...visuals, ...texts];

        all.forEach(el => {
            el.classList.add("enlarge-effect");
            gsap.fromTo(el,
                { scale: 1, transformOrigin: "center center" },
                { scale: 1.3, duration: 0.8, ease: "power2.out" }
            );
        });

        // 动画完成后恢复初始状态
        gsap.delayedCall(2, () => {
            all.forEach(el => {
                el.classList.remove("enlarge-effect");
                el.style.transform = "";
            });
        });
    });

    console.log(`✅ 动画已开始：Group ${groupId} -> 轮廓遮罩 -> 虚线动画 -> 遮罩掉落 -> visual & text 放大`);
}

// 调用示例
// value3("G3");




function value4(canvasId = "canvas", groupIds = []) {
    // 支持单个 groupId 或数组
    const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn(`未找到 canvas, canvasId=${canvasId}`);

    // 清理旧动画层
    canvas.querySelectorAll(".enlarge-effect, .flip-effect").forEach(el => el.remove());

    // 先隐藏 visual 和 text
    const visuals = canvas.querySelectorAll(`.element[data-type="visual"][data-group="${groupId}"]`);
    const texts = canvas.querySelectorAll(`.element[data-type="text"][data-group="${groupId}"]`);
    const allContent = [...visuals, ...texts];
    allContent.forEach(el => el.style.visibility = "hidden");

    // 遍历 data_graphic 添加旋转动画
    const dataGraphics = canvas.querySelectorAll(`.element[data-type="data_graphic"][data-group="${groupId}"]`);
    dataGraphics.forEach(el => {
        el.classList.add("flip-effect");
        gsap.fromTo(el,
            { rotationY: 0, transformOrigin: "50% 50%", perspective: 600 },
            {
                rotationY: 360,
                duration: 1.2,
                ease: "power2.inOut",
                onComplete: () => {
                    // 翻牌完成后显示并放大 text 和 visual
                    allContent.forEach(el => {
                        el.style.visibility = "visible";
                        el.classList.add("enlarge-effect");
                        gsap.fromTo(el,
                            { scale: 1, transformOrigin: "center center" },
                            { scale: 1.3, duration: 0.8, ease: "power2.out" }
                        );
                    });

                    // 动画完成后恢复初始状态
                    gsap.delayedCall(2, () => {
                        el.classList.remove("flip-effect");
                        el.style.transform = "";
                        allContent.forEach(contentEl => {
                            contentEl.classList.remove("enlarge-effect");
                            contentEl.style.visibility = "";
                            contentEl.style.transform = "";
                        });
                    });
                }
            }
        );
    });

    console.log(`✅ 动画已开始：Group ${groupId} -> datagraphic 翻牌 -> visual & text 放大`);
}



window.value1 = value1;
window.value2 = value2;
window.value3 = value3;
window.value4 = value4;

