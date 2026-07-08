function categorization1(canvasId = "canvas", groupIds = []) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);

    // 清理旧动画
    canvas.querySelectorAll(".highlight-outline").forEach(el => el.remove());

    // 创建 SVG 轮廓层
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("highlight-outline");
    svg.style.position = "absolute";
    svg.style.left = "0px";
    svg.style.top = "0px";
    svg.style.width = canvas.offsetWidth + "px";
    svg.style.height = canvas.offsetHeight + "px";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = 9999;
    canvas.appendChild(svg);

    // 创建主轮廓 path，用于流动动画
    const outlinePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    outlinePath.setAttribute("fill", "none");
    outlinePath.setAttribute("stroke", "#0059ffff");
    outlinePath.setAttribute("stroke-width", "5");
    outlinePath.setAttribute("stroke-linejoin", "round");
    outlinePath.setAttribute("stroke-linecap", "round");
    outlinePath.setAttribute("stroke-dasharray", "15 10");
    outlinePath.setAttribute("stroke-dashoffset", "0");
    outlinePath.setAttribute("opacity", "0");
    svg.appendChild(outlinePath);

    const tl = gsap.timeline();

    groupIds.forEach((groupId, index) => {
        const targetGraphics = canvas.querySelectorAll(`.element[data-type="data_graphic"][data-group="${groupId}"]`);
        if (!targetGraphics.length) return;

        const targetVisuals = canvas.querySelectorAll(`.element[data-type="visual"][data-group="${groupId}"]`);
        const targetTexts = canvas.querySelectorAll(`.element[data-type="text"][data-group="${groupId}"]`);

        // data_graphic 一直显示
        targetGraphics.forEach(g => g.style.display = "block");

        // 取第一个 data_graphic 的 segmentation
        const el = targetGraphics[0];
        if (!el.dataset.segmentation) return;

        let points;
        try { points = JSON.parse(el.dataset.segmentation); } catch { return; }
        if (!points.length) return;

        const pathStr = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z";

        // 所有组都要在 morph 完成后克隆固定路径
        const animatePath = index === 0
            ? { attr: { d: pathStr }, opacity: 1, duration: 0.6, ease: "power2.out" }
            : { attr: { d: pathStr }, duration: 1.0, ease: "power2.inOut" };

        tl.to(outlinePath, {
            ...animatePath,
            onUpdate: () => {
                const dashOffset = parseFloat(outlinePath.getAttribute("stroke-dashoffset")) || 0;
                outlinePath.setAttribute("stroke-dashoffset", dashOffset + 2); // 流动速度可调
            },
            onComplete: () => {
                // 克隆完成后的路径固定显示
                const clone = outlinePath.cloneNode();
                clone.setAttribute("opacity", "0.3"); // 半透明保留
                clone.removeAttribute("id");
                clone.setAttribute("stroke-dashoffset", "0"); // 克隆路径静止
                svg.appendChild(clone);
            }
        });

        // visual 渐显
        targetVisuals.forEach(v => {
            tl.set(v, { display: "block" });
            tl.fromTo(v, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.6");
        });

        // text 渐显
        targetTexts.forEach(t => {
            tl.set(t, { display: "block" });
            tl.fromTo(t, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.6");
        });
    });

    console.log(`✅ 多组轮廓流动动画已开始: ${groupIds.join(", ")}`);
}

function categorization2(canvasId = "canvas", groupIds = []) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);

    // 清理旧动画
    canvas.querySelectorAll(".color-fill-layer").forEach(el => el.remove());

    const allElements = canvas.querySelectorAll(".element");
    const tl = gsap.timeline();

    // 1️⃣ 其他组缩小到消失
    allElements.forEach(el => {
        if (!groupIds.includes(el.dataset.group)) {
            const img = el.querySelector("img");
            if (img) tl.to(img, { scale: 0, opacity: 0, duration: 0.5, ease: "power2.in" }, 0);
        }
    });

    // 2️⃣ 为传入组创建 color fill（使用 datagraphic 的 segmentation）
    groupIds.forEach((groupId, index) => {
        const targetGraphics = canvas.querySelectorAll(`.element[data-type="data_graphic"][data-group="${groupId}"]`);
        const targetVisuals = canvas.querySelectorAll(`.element[data-type="visual"][data-group="${groupId}"]`);
        const targetTexts = canvas.querySelectorAll(`.element[data-type="text"][data-group="${groupId}"]`);

        if (!targetGraphics.length) return;
        const el = targetGraphics[0];

        // 获取 datagraphic 的位置信息
        const dgLeft = el.offsetLeft;
        const dgTop = el.offsetTop;
        const dgWidth = el.offsetWidth;
        const dgHeight = el.offsetHeight;

        if (!el.dataset.segmentation) return;
        let points;
        try { points = JSON.parse(el.dataset.segmentation); } catch { return; }
        if (!points.length) return;

        // 取第一个多边形
        let polygon = points;
        if (Array.isArray(points[0])) {
            polygon = points[0];
        }

        console.log(`dg: left=${dgLeft}, top=${dgTop}, w=${dgWidth}, h=${dgHeight}`);
        console.log(`segmentation first point:`, polygon[0]);

        // 计算中心点，用于放大
        const centerX = dgLeft + dgWidth / 2;
        const centerY = dgTop + dgHeight / 2;
        const expandScale = 1.15; // 比 datagraphic 大 15%

        // 创建填充层 SVG（放在最底层，z-index 低于 datagraphic）
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("color-fill-layer");
        svg.style.position = "absolute";
        svg.style.left = "0px";
        svg.style.top = "0px";
        svg.style.width = canvas.offsetWidth + "px";
        svg.style.height = canvas.offsetHeight + "px";
        svg.style.pointerEvents = "none";
        svg.style.zIndex = 1; // 在底层
        canvas.insertBefore(svg, canvas.firstChild); // 插入到最前面

        // 创建放大的填充路径
        // segmentation 坐标是 canvas 绝对坐标，直接使用
        const expandPathStr = polygon.map((p, i) => {
            // 以 centerX, centerY 为中心放大
            const relX = p[0] - centerX;
            const relY = p[1] - centerY;
            const expandedX = centerX + relX * expandScale;
            const expandedY = centerY + relY * expandScale;
            return `${i === 0 ? "M" : "L"}${expandedX},${expandedY}`;
        }).join(" ") + " Z";

        // 填充 path
        const fillPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        fillPath.setAttribute("d", expandPathStr);
        fillPath.setAttribute("fill", "rgba(255, 200, 0, 0.3)"); // 黄色半透明填充
        fillPath.setAttribute("stroke", "orange");
        fillPath.setAttribute("stroke-width", "2");
        svg.appendChild(fillPath);

        // 填充动画：从透明到可见
        tl.set(fillPath, { opacity: 0 });
        tl.to(fillPath, { opacity: 1, duration: 0.5, ease: "power2.out" }, index * 0.3);

        // 显示并动画 target 元素
        targetGraphics.forEach(g => {
            const img = g.querySelector("img");
            if (img) {
                tl.fromTo(img, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)" }, index * 0.3);
            }
        });

        targetVisuals.forEach(v => {
            tl.set(v, { display: "block" });
            const img = v.querySelector("img");
            if (img) {
                tl.fromTo(img, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" }, index * 0.3 + 0.2);
            }
        });

        targetTexts.forEach(t => {
            tl.set(t, { display: "block" });
            const img = t.querySelector("img");
            if (img) {
                tl.fromTo(img, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, index * 0.3 + 0.4);
            }
        });
    });

    console.log(`✅ Color fill 动画已开始: ${groupIds.join(", ")}`);

    // 动画完成后恢复
    gsap.delayedCall(4, () => {
        canvas.querySelectorAll(".color-fill-layer").forEach(el => el.remove());
        allElements.forEach(el => {
            el.style.transform = "";
            el.style.opacity = "";
        });
    });
}

// 调用示例
// categorization2(["G1", "G2","G4","G7"], "canvas");
function categorization3(canvasId = "canvas", groupIds = []) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);

    const allElements = canvas.querySelectorAll(".element");

    allElements.forEach(el => {
        const elGroup = el.dataset.group;
        const isTarget = groupIds.includes(elGroup);

        const img = el.querySelector("img");
        if (!img) return;

        if (isTarget) {
            gsap.to(img, {
                duration: 0.5,
                filter: "none",
                ease: "power2.out"
            });
        } else {
            gsap.to(img, {
                duration: 0.5,
                filter: "grayscale(100%) brightness(50%)",
                ease: "power2.out"
            });
        }
    });

    console.log(`✅ 已对非目标组全部元素变灰: ${groupIds.join(", ")}`);

    // 动画完成后恢复初始状态
    gsap.delayedCall(4, () => {
        canvas.querySelectorAll(".highlight-outline").forEach(el => el.remove());
        const allElements = canvas.querySelectorAll(".element");
        allElements.forEach(el => {
            el.style.filter = "";
            el.style.transform = "";
        });
    });
}


window.categorization1 = categorization1;
window.categorization2 = categorization2;
window.categorization3 = categorization3;
