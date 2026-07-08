// highlightWithMeasurementAnimated.js

function difference1(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    // 1. 清理旧 SVG 层
    canvas.querySelectorAll(".measurement-layer").forEach(el => el.remove());

    // 2. 创建 SVG 层
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("measurement-layer");
    svg.style.position = "absolute";
    svg.style.left = "0px";
    svg.style.top = "0px";
    svg.style.width = canvas.offsetWidth + "px";
    svg.style.height = canvas.offsetHeight + "px";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = 9999;
    canvas.appendChild(svg);

    const allElements = canvas.querySelectorAll(".element");
    const timeline = gsap.timeline();

    // 3. 处理虚化效果 (立即执行)
    allElements.forEach(el => {
        const elGroup = el.dataset.group;
        const isTarget = groupIds.includes(elGroup);
        const img = el.querySelector("img");
        
        // 目标组的 visual 和 text 先隐藏，为后面动画做准备
        if (isTarget && (el.dataset.type === "visual" || el.dataset.type === "text")) {
             gsap.set(img, { opacity: 0 }); 
        }

        if (img) {
            // 非目标组虚化，目标组 data_graphic 保持清晰
            if (!isTarget || el.dataset.type === "data_graphic") {
                gsap.to(img, {
                    duration: 0.5,
                    filter: isTarget ? "none" : "blur(2px)",
                    opacity: isTarget ? 1 : 0.4,
                    ease: "power2.out"
                });
            }
        }
    });

    // 4. 绘制虚线动画
    // 筛选出需要画线的目标组 data_graphic
    const targetGraphics = Array.from(allElements).filter(el => 
        groupIds.includes(el.dataset.group) && el.dataset.type === "data_graphic"
    );

    targetGraphics.forEach(el => {
        if (el.dataset.segmentation) {
            let points;
            try { points = JSON.parse(el.dataset.segmentation); } catch { points = []; }
            
            if (points.length) {
                // 计算位置
                const xs = points.map(p => p[0]);
                const ys = points.map(p => p[1]);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);
                const cy = (minY + maxY) / 2;

                const startX = minX;
                const endX = maxX;
                const lineY = cy;

                // 创建线条
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", startX);
                line.setAttribute("y1", lineY);
                line.setAttribute("x2", startX); // 初始 x2 = x1，长度为0
                line.setAttribute("y2", lineY);
                line.setAttribute("stroke", "#0026ffff");
                line.setAttribute("stroke-width", "2");
                line.setAttribute("stroke-dasharray", "5, 5"); // 设置虚线样式
                svg.appendChild(line);

                // 添加到时间轴：虚线生长
                timeline.to(line, {
                    attr: { x2: endX }, // 动画 x2 属性延伸线条
                    duration: 0.8,
                    ease: "power2.out"
                }, 0); // 在时间轴开始时执行
            }
        }
    });

    // 5. Visual Slide In (虚线画完后)
    const targetVisuals = Array.from(allElements).filter(el => 
        groupIds.includes(el.dataset.group) && el.dataset.type === "visual"
    ).map(el => el.querySelector("img"));

    if (targetVisuals.length > 0) {
        timeline.fromTo(targetVisuals, 
            { x: -30, opacity: 0 }, // 初始：向左偏移且透明
            { x: 0, opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.1 },
            "-=0.2" // 稍微重叠一点线条动画的时间
        );
    }

    // 6. Text Fly In (Visual 出现后)
    const targetTexts = Array.from(allElements).filter(el => 
        groupIds.includes(el.dataset.group) && el.dataset.type === "text"
    ).map(el => el.querySelector("img"));

    if (targetTexts.length > 0) {
        timeline.fromTo(targetTexts, 
            { y: 20, scale: 0.5, opacity: 0 }, // 初始：向下偏移、缩小且透明
            { y: 0, scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)", stagger: 0.1 },
            "-=0.4" // 跟随 Visual 紧接着出现
        );
    }

    console.log(`✅ 已执行 Difference1 动画: ${groupIds.join(", ")}`);
}


function difference2(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const allElements = canvas.querySelectorAll(".element");
    const shrinkScale = 0.5; // 缩小比例

    // 隐藏其他组 & text/visual 初始隐藏
    allElements.forEach(el => {
        const img = el.querySelector("img");
        if (!img) return;

        if (!groupIds.includes(el.dataset.group)) {
            gsap.to(img, { duration: 0.6, opacity: 0, ease: "power2.out" });
        } else if (el.dataset.type !== "data_graphic") {
            gsap.set(img, { opacity: 0 });
        }
    });

    // 创建 timeline
    const tl = gsap.timeline();

    // data_graphic 缩小
    groupIds.forEach(groupId => {
        const groupElements = Array.from(allElements).filter(e => e.dataset.group === groupId);
        const dataGraphic = groupElements.find(e => e.dataset.type === "data_graphic");
        if (!dataGraphic) return;

        const imgDG = dataGraphic.querySelector("img");
        if (!imgDG) return;

        // 初始状态：缩小
        gsap.set(imgDG, {
            scale: shrinkScale,
            transformOrigin: "center center",
            opacity: 1
        });

        // 缩小动画
        tl.to(imgDG, {
            scale: shrinkScale * 0.8,
            duration: 0.3,
            ease: "power2.in"
        }, 0);

        // 放大回原大小（带 pop 效果）
        tl.to(imgDG, {
            scale: 1,
            duration: 0.5,
            ease: "back.out(2)"
        });

        // text/visual pop in
        groupElements.forEach(el => {
            if (el.dataset.type === "data_graphic") return;
            const img = el.querySelector("img");
            if (!img) return;

            gsap.set(img, { scale: 0, opacity: 0, transformOrigin: "center center" });
            tl.to(img, {
                scale: 1,
                opacity: 1,
                duration: 0.5,
                ease: "back.out(2)"
            }, "-=0.2");
        });
    });

    // 动画完成后恢复初始状态
    gsap.delayedCall(4, () => {
        canvas.querySelectorAll(".measurement-layer").forEach(el => el.remove());
        const allElements = canvas.querySelectorAll(".element");
        allElements.forEach(el => {
            el.style.transform = "";
            el.style.filter = "";
            el.style.opacity = "";
        });
    });
}


window.difference1 = difference1;
window.difference2 = difference2;
