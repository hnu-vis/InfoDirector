async function outlier(canvasId = "canvas", groupIds = []) {
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn(`未找到 id="${canvasId}" 的容器`);
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;

    const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    const cameraWrapper = canvas.parentElement;
    const groupElements = Array.from(canvas.querySelectorAll(".element"))
        .filter(e => e.dataset.group === groupId);

    if (!groupElements.length) return console.warn(`组 ${groupId} 没有元素`);

    const dataGraphic = groupElements.find(e => e.dataset.type === "data_graphic");

    const canvasRect = canvas.getBoundingClientRect();
    function getCentroid(segmentation) {
        if (!segmentation) return [canvasRect.width / 2, canvasRect.height / 2];
        const seg = JSON.parse(segmentation);
        if (!seg.length) return [canvasRect.width / 2, canvasRect.height / 2];
        let sumX = 0, sumY = 0;
        seg.forEach(([x, y]) => { sumX += x; sumY += y; });
        return [sumX / seg.length, sumY / seg.length];
    }

    const [centerX, centerY] = dataGraphic ? getCentroid(dataGraphic.dataset.segmentation)
                                           : [canvasRect.width / 2, canvasRect.height / 2];

    // 1️⃣ 聚焦镜头
    await gsap.to(canvas, {
        x: -(centerX - cameraWrapper.clientWidth / 2),
        y: -(centerY - cameraWrapper.clientHeight / 2),
        duration: 1,
        ease: "power2.inOut"
    });

    // 2️⃣ 脉冲组内元素（scale 放大缩小）
    const imgs = groupElements.map(el => el.querySelector("img")).filter(Boolean);
    gsap.to(imgs, {
        scale: 1.2,
        duration: 0.3,
        yoyo: true,
        repeat: 3,
        transformOrigin: "50% 50%",
        ease: "power1.inOut",
        onComplete: () => imgs.forEach(img => gsap.set(img, { scale: 1 }))
    });
    await new Promise(resolve => setTimeout(resolve, 0.3 * 2 * 3 * 1000));

    // 3️⃣ 创建覆盖层放在 canvas 内部最顶层
    if (dataGraphic) {
        let oldLayer = canvas.querySelector("svg.highlight-layer");
        if (oldLayer) oldLayer.remove();

        const svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgLayer.setAttribute("class", "highlight-layer");
        svgLayer.style.position = "absolute";
        svgLayer.style.top = "0";
        svgLayer.style.left = "0";
        svgLayer.style.width = "100%";
        svgLayer.style.height = "100%";
        svgLayer.style.pointerEvents = "none";
        svgLayer.style.zIndex = "9999"; // 保证最顶层
        canvas.appendChild(svgLayer);

        const seg = JSON.parse(dataGraphic.dataset.segmentation || "[]");
        if (!seg.length) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        seg.forEach(([x, y]) => {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        });
        const radius = Math.max(maxX - minX, maxY - minY) / 2 + 10;
        const [cx, cy] = [centerX, centerY];

        // mask
        const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
        const maskId = "circleMask_" + Date.now();
        mask.setAttribute("id", maskId);
        const maskCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        maskCircle.setAttribute("cx", cx);
        maskCircle.setAttribute("cy", cy);
        maskCircle.setAttribute("r", radius - 3);
        maskCircle.setAttribute("fill", "white");
        mask.appendChild(maskCircle);
        svgLayer.appendChild(mask);

        // pattern
        const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
        const patternId = "slashPattern_" + Date.now();
        pattern.setAttribute("id", patternId);
        pattern.setAttribute("patternUnits", "userSpaceOnUse");
        pattern.setAttribute("width", 10);
        pattern.setAttribute("height", 10);
        pattern.setAttribute("patternTransform", "rotate(45)");
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", 0);
        line.setAttribute("y1", 0);
        line.setAttribute("x2", 0);
        line.setAttribute("y2", 10);
        line.setAttribute("stroke", "orange");
        line.setAttribute("stroke-width", 2);
        pattern.appendChild(line);
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.appendChild(pattern);
        svgLayer.appendChild(defs);

        // patterned circle
        const patternedCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        patternedCircle.setAttribute("cx", cx);
        patternedCircle.setAttribute("cy", cy);
        patternedCircle.setAttribute("r", radius - 3);
        patternedCircle.setAttribute("fill", `url(#${patternId})`);
        patternedCircle.setAttribute("mask", `url(#${maskId})`);
        svgLayer.appendChild(patternedCircle);

        // arc
        const arc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        arc.setAttribute("cx", cx);
        arc.setAttribute("cy", cy);
        arc.setAttribute("r", radius);
        arc.setAttribute("stroke", "orange");
        arc.setAttribute("stroke-width", 6);
        arc.setAttribute("fill", "none");
        svgLayer.appendChild(arc);

        // ⚡ 轮廓和阴影保持显示（只淡入一次）
        gsap.fromTo([patternedCircle, arc],
            { opacity: 0 },
            { opacity: 1, duration: 0.5, ease: "power1.inOut" });
    }

    // 动画完成后恢复初始状态
    gsap.delayedCall(0.5, () => {
        gsap.to(canvas, { x: 0, y: 0, scale: 1, duration: 0.5 });
        canvas.querySelectorAll("svg.highlight-layer").forEach(el => el.remove());
        const imgs = canvas.querySelectorAll(".element img");
        imgs.forEach(img => {
            img.style.transform = "";
        });
    });
}


window.outlier = outlier;

