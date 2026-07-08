async function association(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    const cameraWrapper = canvas.parentElement;
    const allElements = canvas.querySelectorAll(".element");

    // 创建或获取 SVG 线层
    let svgLayer = canvas.querySelector("svg.line-layer");
    if (!svgLayer) {
        svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgLayer.setAttribute("class", "line-layer");
        svgLayer.style.position = "absolute";
        svgLayer.style.top = "0";
        svgLayer.style.left = "0";
        svgLayer.style.width = "100%";
        svgLayer.style.height = "100%";
        svgLayer.style.pointerEvents = "none";
        svgLayer.style.zIndex = "9999";
        canvas.appendChild(svgLayer);
    }

    // 清理旧动画遗留
    svgLayer.innerHTML = "";

    // 获取 datagraphic 元素的中心位置（使用 element offset）
    function getElementCenter(groupElements) {
        const dataGraphic = groupElements.find(e => e.dataset.type === "data_graphic");
        if (dataGraphic) {
            const left = dataGraphic.offsetLeft;
            const top = dataGraphic.offsetTop;
            const width = dataGraphic.offsetWidth;
            const height = dataGraphic.offsetHeight;
            return {
                x: left + width / 2,
                y: top + height / 2,
                dg: dataGraphic
            };
        }
        return null;
    }

    let lastPos = null;
    const appearedElements = new Set();

    // 重置 canvas 位置
    gsap.set(canvas, { x: 0, y: 0 });

    for (let i = 0; i < groupIds.length; i++) {
        const groupId = groupIds[i];
        const groupElements = Array.from(allElements).filter(e => e.dataset.group === groupId);

        // 获取当前组中心
        const currentPos = getElementCenter(groupElements);
        if (!currentPos) continue;

        const { x: centerX, y: centerY, dg: dataGraphic } = currentPos;

        console.log(`Group ${groupId}: center=(${centerX}, ${centerY})`);

        // 创建连线（从上一组中心到当前组中心）- 手写效果
        if (lastPos) {
            console.log(`Drawing line from (${lastPos.x}, ${lastPos.y}) to (${centerX}, ${centerY})`);

            // 生成带 jitter 的手写线段
            const segments = 15;
            const jitter = 10;
            let pathD = "";
            for (let s = 0; s <= segments; s++) {
                const t = s / segments;
                const x = lastPos.x + (centerX - lastPos.x) * t + (Math.random() - 0.5) * jitter;
                const y = lastPos.y + (centerY - lastPos.y) * t + (Math.random() - 0.5) * jitter;
                pathD += (s === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
            }

            // 添加滤镜定义
            if (!svgLayer.querySelector("defs")) {
                const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
                filter.setAttribute("id", "glow");
                filter.setAttribute("x", "-50%");
                filter.setAttribute("y", "-50%");
                filter.setAttribute("width", "200%");
                filter.setAttribute("height", "200%");
                const feGaussian = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
                feGaussian.setAttribute("stdDeviation", "4");
                feGaussian.setAttribute("result", "coloredBlur");
                const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
                const feMergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
                feMergeNode1.setAttribute("in", "coloredBlur");
                const feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
                feMergeNode2.setAttribute("in", "SourceGraphic");
                feMerge.appendChild(feMergeNode1);
                feMerge.appendChild(feMergeNode2);
                filter.appendChild(feGaussian);
                filter.appendChild(feMerge);
                defs.appendChild(filter);
                svgLayer.appendChild(defs);
            }

            // 创建手写线
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathD);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", "#ffcc00");
            path.setAttribute("stroke-width", "4");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            path.setAttribute("stroke-dasharray", "8 4");
            path.setAttribute("filter", "url(#glow)");
            svgLayer.appendChild(path);

            // 获取路径总长度
            const pathLength = path.getTotalLength();
            // 虚线一点点画出来：stroke-dashoffset 从 pathLength 变到 0
            // 初始隐藏
            gsap.set(path, { strokeDashoffset: pathLength });

            // 动画：从 pathLength 到 0（虚线从起点画到终点）
            gsap.to(path, {
                strokeDashoffset: 0,
                duration: 1,
                ease: "power1.inOut"
            });
        }

        // 计算镜头移动目标（将当前组中心移到 cameraWrapper 中心）
        const wrapperCenterX = cameraWrapper.clientWidth / 2;
        const wrapperCenterY = cameraWrapper.clientHeight / 2;
        const targetX = wrapperCenterX - centerX;
        const targetY = wrapperCenterY - centerY;

        console.log(`Moving camera to: (${targetX}, ${targetY})`);

        // 镜头移动
        gsap.to(canvas, {
            x: targetX,
            y: targetY,
            duration: 1,
            ease: "power2.inOut"
        });

        // 等待镜头移动完成
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 显示当前组元素
        groupElements.forEach(el => {
            const img = el.querySelector("img");
            if (!img) return;
            gsap.set(img, { opacity: 0 });
            gsap.to(img, { opacity: 1, duration: 0.5, ease: "power2.out" });
            appearedElements.add(el);
        });

        lastPos = { x: centerX, y: centerY };
    }

    // 动画完成后恢复初始状态
    gsap.delayedCall(0.5, () => {
        gsap.to(canvas, { x: 0, y: 0, duration: 1, ease: "power2.inOut" });
        setTimeout(() => {
            allElements.forEach(el => {
                const img = el.querySelector("img");
                if (img) {
                    img.style.opacity = "";
                    img.style.transform = "";
                }
            });
            canvas.querySelectorAll("svg.line-layer").forEach(el => el.remove());
        }, 1500);
    });
}


window.association = association;
