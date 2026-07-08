
function association(canvasId = "canvas", groupIds = []) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn("Canvas not found");
    if (groupIds.length !== 2) return console.warn("请传入两个组");

    let svgLayer = canvas.querySelector("svg.intersection-layer");
    if (!svgLayer) {
        svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        Object.assign(svgLayer.style, {
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            zIndex: 1000,
            pointerEvents: "none",
            overflow: "visible"
        });
        svgLayer.classList.add("intersection-layer");
        canvas.appendChild(svgLayer);
    } else {
        svgLayer.innerHTML = "";
    }

    function pointInPolygon([x, y], polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
            const intersect = ((yi > y) != (yj > y)) &&
                              (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // 获取两组轮廓
    const polys = groupIds.map(gid => {
        const el = canvas.querySelector(`.element[data-group="${gid}"][data-type="data_graphic"]`);
        if (!el) return null;
        try {
            const seg = JSON.parse(el.dataset.segmentation);
            if (Array.isArray(seg) && seg.length && Array.isArray(seg[0])) return seg[0];
        } catch {}
        return null;
    });

    if (!polys[0] || !polys[1]) return console.warn("无法获取轮廓");

    // 粗略扫描法找交集点
    const [polyA, polyB] = polys;
    const step = 3; // 步长越小越精确
    const xs = polyA.map(p => p[0]).concat(polyB.map(p => p[0]));
    const ys = polyA.map(p => p[1]).concat(polyB.map(p => p[1]));
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const intersectionPoints = [];
    for (let x = minX; x <= maxX; x += step) {
        for (let y = minY; y <= maxY; y += step) {
            if (pointInPolygon([x, y], polyA) && pointInPolygon([x, y], polyB)) {
                intersectionPoints.push([x, y]);
            }
        }
    }

    if (!intersectionPoints.length) return console.log("轮廓没有交集");

    // 计算交集重心
    const cx = intersectionPoints.reduce((sum, p) => sum + p[0], 0) / intersectionPoints.length;
    const cy = intersectionPoints.reduce((sum, p) => sum + p[1], 0) / intersectionPoints.length;

    // 画圆圈
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", 0);
    circle.setAttribute("stroke", "red");
    circle.setAttribute("stroke-width", 3);
    circle.setAttribute("fill", "rgba(255,0,0,0.2)");
    svgLayer.appendChild(circle);

    // 用 GSAP 动画
    gsap.to(circle, {
        r: 15,
        duration: 0.8,
        ease: "power2.out",
        onComplete: () => {
            // 动画完成后恢复初始状态
            gsap.delayedCall(2, () => {
                circle.remove();
                svgLayer.remove();
            });
        }
    });
}


window.association = association;