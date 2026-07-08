function value1(canvasId = "canvas",groupIds = []) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn("Canvas not found");
    const allElements = Array.from(canvas.querySelectorAll(".element"));

    // 保存原始样式
    const originalStyles = new Map();
    allElements.forEach(el => {
        originalStyles.set(el, {
            opacity: el.style.opacity,
            transform: el.style.transform,
            clipPath: el.style.clipPath
        });
    });

    const tlCanvas = gsap.timeline({
        onComplete: () => {
            // 动画完成后延迟恢复
            gsap.delayedCall(2, () => {
                // 恢复 canvas
                canvas.style.transform = "";
                // 恢复所有元素原始样式
                originalStyles.forEach((styles, el) => {
                    el.style.opacity = styles.opacity;
                    el.style.transform = styles.transform;
                    el.style.clipPath = styles.clipPath;
                });
            });
        }
    });

    groupIds.forEach(groupId => {
        const groupElements = allElements.filter(e => e.dataset.group === groupId);
        if (!groupElements.length) return;

        const dataGraphicEl = groupElements.find(e => e.dataset.type === "data_graphic");
        const visualEl = groupElements.find(e => e.dataset.type === "visual");
        if (!dataGraphicEl) return;

        const imgDG = dataGraphicEl.querySelector("img");
        const imgVisual = visualEl ? visualEl.querySelector("img") : null;

        const textEls = groupElements
            .filter(e => e.dataset.type === "text")
            .map(el => el.querySelector("img"))
            .filter(Boolean);

        // 1️⃣ 所有元素初始隐藏
        [imgDG, imgVisual, ...textEls].forEach(img => {
            if (img) gsap.set(img, { opacity: 0, scale: 0, transformOrigin: "50% 50%" });
        });

        // 2️⃣ 计算组中心
        const groupCenterX = groupElements.reduce((sum, el) => sum + (el.offsetLeft + el.offsetWidth / 2), 0) / groupElements.length;
        const groupCenterY = groupElements.reduce((sum, el) => sum + (el.offsetTop + el.offsetHeight / 2), 0) / groupElements.length;

        // 3️⃣ 镜头 zoom in
        const zoomScale = 2;
        const offsetX = canvas.clientWidth/2 - groupCenterX * zoomScale;
        const offsetY = canvas.clientHeight/2 - groupCenterY * zoomScale;

        tlCanvas.to(canvas, {
            duration: 0.8,
            scale: zoomScale,
            x: offsetX,
            y: offsetY,
            transformOrigin: "0 0",
            ease: "power2.inOut"
        });

        // 4️⃣ Draw datagraphic
        tlCanvas.set(imgDG, { clipPath: "inset(100% 0% 0% 0%)", opacity: 1, scale: 1 });
        tlCanvas.to(imgDG, { duration: 0.8, clipPath: "inset(0% 0% 0% 0%)", ease: "power2.out" });

        // 5️⃣ Visual 弹入
        if (imgVisual) {
            tlCanvas.set(imgVisual, { scale: 0, opacity: 0 });
            tlCanvas.to(imgVisual, { duration: 0.6, scale: 1, opacity: 1, ease: "back.out(1.7)" });
        }

        // 6️⃣ Text 顺序渐显 + 放大
        textEls.forEach(imgText => {
            tlCanvas.set(imgText, { opacity: 0, scale: 0 });
            tlCanvas.to(imgText, { duration: 0.6, opacity: 1, scale: 1, ease: "power2.out" });
        });

        // 7️⃣ 组间间隔
        tlCanvas.to({}, { duration: 0.4 });
    });

    // 8️⃣ 镜头回退
    tlCanvas.to(canvas, {
        duration: 0.8,
        scale: 1,
        x: 0,
        y: 0,
        transformOrigin: "0 0",
        ease: "power2.inOut"
    });
}


function value2(canvasId = "canvas", groupIds = "G9" ,  numScanLines = 30, duration = 1, zoom = 1.5) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn("Canvas not found");

    // 支持数组或字符串
    const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    if (!groupId) return console.warn("未提供 groupId");

    const dataEl = canvas.querySelector(`.element[data-type='data_graphic'][data-group='${groupId}']`);
    const visualEl = canvas.querySelector(`.element[data-type='visual'][data-group='${groupId}']`);
    const textEls = canvas.querySelectorAll(`.element[data-type='text'][data-group='${groupId}']`);
    if (!dataEl || !visualEl) return;

    // 保存原始样式
    const originalStyles = {
        dataEl: { opacity: dataEl.style.opacity },
        visualEl: { opacity: visualEl.style.opacity, left: visualEl.style.left, top: visualEl.style.top },
        textEls: []
    };
    textEls.forEach(el => {
        originalStyles.textEls.push({ el, opacity: el.style.opacity });
    });

    // 初始隐藏元素
    dataEl.style.opacity = 0;
    visualEl.style.opacity = 0;
    textEls.forEach(el => el.style.opacity = 0);

    const dataRect = dataEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const centerX = dataRect.left + dataRect.width / 2 - canvasRect.left;
    const centerY = dataRect.top + dataRect.height / 2 - canvasRect.top;

    canvas.style.transformOrigin = "0 0";

    // 镜头 zoom + 聚焦
    gsap.to(canvas, {
        duration: 0.6,
        ease: "power2.inOut",
        scale: zoom,
        x: -centerX * (zoom - 1),
        y: -centerY * (zoom - 1),
        onComplete: startAnimation
    });

    function startAnimation() {
        gsap.to(dataEl, { opacity: 1, duration: 0.5, onComplete: moveVisual });
    }

    function moveVisual() {
        let seg = JSON.parse(dataEl.dataset.segmentation || "[]");
        if (seg.length && Array.isArray(seg[0][0])) seg = seg[0];
        if (seg.length < 2) return;

        const xs = seg.map(p => p[0]), ys = seg.map(p => p[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const width = maxX - minX, height = maxY - minY;
        const horizontal = width > height;

        const midline = [];
        for (let i = 0; i <= numScanLines; i++) {
            const t = i / numScanLines;
            if (horizontal) {
                const xLine = minX + t * width;
                const pointsOnLine = seg.filter(p => Math.abs(p[0] - xLine) < width / numScanLines);
                if (pointsOnLine.length) midline.push({ x: xLine, y: pointsOnLine.reduce((sum,p)=>sum+p[1],0)/pointsOnLine.length });
            } else {
                const yLine = minY + t * height;
                const pointsOnLine = seg.filter(p => Math.abs(p[1] - yLine) < height / numScanLines);
                if (pointsOnLine.length) midline.push({ x: pointsOnLine.reduce((sum,p)=>sum+p[0],0)/pointsOnLine.length, y: yLine });
            }
        }
        if (midline.length < 2) return;

        const groupNum = parseInt(groupId.replace(/\D/g, ''));
        const nextEl = canvas.querySelector(`.element[data-group='G${groupNum + 1}']`);
        let forward = true;
        if (nextEl) {
            const nextRect = nextEl.getBoundingClientRect();
            const midCx = (minX + maxX)/2, midCy = (minY + maxY)/2;
            forward = horizontal ? nextRect.left + nextRect.width/2 >= midCx
                                 : nextRect.top + nextRect.height/2 >= midCy;
        }
        if (!forward) midline.reverse();

        function getBezierPoints(points, segments = 20) {
            const bezier = [];
            for (let i = 0; i < points.length-1; i++) {
                const p0=points[i], p1=points[i+1], cp={x:(p0.x+p1.x)/2,y:(p0.y+p1.y)/2};
                for (let t=0;t<1;t+=1/segments){
                    const x=(1-t)*(1-t)*p0.x+2*(1-t)*t*cp.x+t*t*p1.x;
                    const y=(1-t)*(1-t)*p0.y+2*(1-t)*t*cp.y+t*t*p1.y;
                    bezier.push({x,y});
                }
            }
            bezier.push(points[points.length-1]);
            return bezier;
        }

        const pathPoints = getBezierPoints(midline, 10);

        function computePathLengths(points) {
            const lengths=[0];
            for(let i=1;i<points.length;i++){
                const dx=points[i].x-points[i-1].x;
                const dy=points[i].y-points[i-1].y;
                lengths.push(lengths[i-1]+Math.sqrt(dx*dx+dy*dy));
            }
            return lengths;
        }

        function getPointAtLength(points,lengths,targetLength){
            let i=1;
            while(i<lengths.length && lengths[i]<targetLength)i++;
            if(i>=lengths.length) return points[points.length-1];
            const ratio=(targetLength-lengths[i-1])/(lengths[i]-lengths[i-1]);
            return {x:points[i-1].x+(points[i].x-points[i-1].x)*ratio, y:points[i-1].y+(points[i].y-points[i-1].y)*ratio};
        }

        const pathLengths = computePathLengths(pathPoints);
        const totalLength = pathLengths[pathLengths.length-1];

        visualEl.style.opacity=1;
        visualEl.style.position="absolute";

        const targetLeft = visualEl.offsetLeft;
        const targetTop = visualEl.offsetTop;

        gsap.to({progress:0},{
            progress: totalLength,
            duration: duration,
            ease:"power1.inOut",
            onUpdate:function(){
                const pos=getPointAtLength(pathPoints,pathLengths,this.targets()[0].progress);
                visualEl.style.left=`${pos.x-visualEl.offsetWidth/2}px`;
                visualEl.style.top=`${pos.y-visualEl.offsetHeight/2}px`;
            },
            onComplete:function(){
                // 最终补帧动画
                gsap.to(visualEl,{
                    left: targetLeft,
                    top: targetTop,
                    duration:0.2,
                    ease:"power1.out",
                    onComplete:function(){
                        // 所有 text 同步渐入
                        textEls.forEach(el=>gsap.to(el,{opacity:1,duration:0.5}));

                        // 动画完成后延迟恢复
                        gsap.delayedCall(2, () => {
                            canvas.style.transform = "";
                            // 恢复原始样式
                            dataEl.style.opacity = "";
                            visualEl.style.opacity = "";
                            visualEl.style.left = "";
                            visualEl.style.top = "";
                            visualEl.style.position = "";
                            textEls.forEach(el => el.style.opacity = "");
                        });
                    }
                });
            }
        });
    }
}

// 调用示例
function value3(canvasId = "canvas", groupIds = "G9", numScanLines = 30, duration = 2, zoom = 1.5) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn("Canvas not found");

    // 支持数组或字符串
    const groupId = Array.isArray(groupIds) ? groupIds[0] : groupIds;
    if (!groupId) return console.warn("未提供 groupId");

    // 当前组元素
    const dataEl = canvas.querySelector(`.element[data-type='data_graphic'][data-group='${groupId}']`);
    const visualEl = canvas.querySelector(`.element[data-type='visual'][data-group='${groupId}']`);
    const textEls = canvas.querySelectorAll(`.element[data-type='text'][data-group='${groupId}']`);
    if (!dataEl || !visualEl) return;

    // 所有组 visual/text
    const allVisuals = canvas.querySelectorAll(".element[data-type='visual']");
    const allTexts = canvas.querySelectorAll(".element[data-type='text']");

    // 保存原始样式
    const originalStyles = {
        allVisuals: [],
        allTexts: []
    };
    allVisuals.forEach(el => {
        originalStyles.allVisuals.push({ el, filter: el.style.filter });
    });
    allTexts.forEach(el => {
        originalStyles.allTexts.push({ el, filter: el.style.filter });
    });

    // 初始化：其他组灰色
    allVisuals.forEach(el => {
        if(el !== visualEl) el.style.filter = "grayscale(100%) brightness(0.3)";
    });
    allTexts.forEach(el => {
        if(![...textEls].includes(el)) el.style.filter = "grayscale(100%) brightness(0.3)";
    });

    // 当前组初始化为灰色但稍亮
    visualEl.style.filter = "grayscale(100%) brightness(0.6)";
    textEls.forEach(el => el.style.filter = "grayscale(100%) brightness(0.6)");

    // 读取 segmentation
    let seg = JSON.parse(dataEl.dataset.segmentation || "[]");
    if (seg.length && Array.isArray(seg[0][0])) seg = seg[0];
    if (seg.length < 2) return;

    const xs = seg.map(p => p[0]), ys = seg.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const width = maxX - minX, height = maxY - minY;
    const centerX = (minX + maxX)/2, centerY = (minY + maxY)/2;

    // 镜头聚焦
    const canvasRect = canvas.getBoundingClientRect();
    const offsetX = canvasRect.width/2 - centerX*zoom;
    const offsetY = canvasRect.height/2 - centerY*zoom;

    gsap.to(canvas, {
        duration: 0.8,
        scale: zoom,
        x: offsetX,
        y: offsetY,
        transformOrigin: "0 0",
        ease: "power1.inOut",
        onComplete: startHighlight
    });

    function startHighlight() {
        const horizontal = width > height;
        const midline = [];
        for (let i = 0; i <= numScanLines; i++) {
            const t = i/numScanLines;
            if(horizontal){
                const xLine = minX + t*width;
                const pointsOnLine = seg.filter(p=>Math.abs(p[0]-xLine)<width/numScanLines);
                if(pointsOnLine.length) midline.push({x:xLine, y:pointsOnLine.reduce((s,p)=>s+p[1],0)/pointsOnLine.length});
            } else {
                const yLine = minY + t*height;
                const pointsOnLine = seg.filter(p=>Math.abs(p[1]-yLine)<height/numScanLines);
                if(pointsOnLine.length) midline.push({x:pointsOnLine.reduce((s,p)=>s+p[0],0)/pointsOnLine.length, y:yLine});
            }
        }
        if(midline.length<2) return;

        function getBezierPoints(points, segments=20){
            const bezier=[];
            for(let i=0;i<points.length-1;i++){
                const p0=points[i], p1=points[i+1];
                const cp={x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2};
                for(let t=0;t<1;t+=1/segments){
                    const x=(1-t)*(1-t)*p0.x+2*(1-t)*t*cp.x+t*t*p1.x;
                    const y=(1-t)*(1-t)*p0.y+2*(1-t)*t*cp.y+t*t*p1.y;
                    bezier.push({x,y});
                }
            }
            bezier.push(points[points.length-1]);
            return bezier;
        }

        const pathPoints=getBezierPoints(midline,10);

        // 创建黄色光点
        const light=document.createElement("div");
        light.style.position="absolute";
        light.style.width="14px";
        light.style.height="14px";
        light.style.borderRadius="50%";
        light.style.background="yellow";
        light.style.boxShadow="0 0 16px 8px rgba(255,255,0,0.9)";
        canvas.appendChild(light);

        function computePathLengths(points){
            const lengths=[0];
            for(let i=1;i<points.length;i++){
                const dx=points[i].x-points[i-1].x;
                const dy=points[i].y-points[i-1].y;
                lengths.push(lengths[i-1]+Math.sqrt(dx*dx+dy*dy));
            }
            return lengths;
        }

        function getPointAtLength(points,lengths,targetLength){
            let i=1;
            while(i<lengths.length && lengths[i]<targetLength) i++;
            if(i>=lengths.length) return points[points.length-1];
            const ratio=(targetLength-lengths[i-1])/(lengths[i]-lengths[i-1]);
            return {x:points[i-1].x+(points[i].x-points[i-1].x)*ratio, y:points[i-1].y+(points[i].y-points[i-1].y)*ratio};
        }

        const pathLengths=computePathLengths(pathPoints);
        const totalLength=pathLengths[pathLengths.length-1];

        const tl=gsap.timeline();
        tl.to({progress:0}, {
            progress: totalLength,
            duration: duration,
            ease: "linear",
            onUpdate: function(){
                const pos=getPointAtLength(pathPoints,pathLengths,this.targets()[0].progress);
                light.style.left=`${pos.x-7}px`;
                light.style.top=`${pos.y-7}px`;

                const ratio=this.targets()[0].progress/totalLength;
                visualEl.style.filter=`grayscale(${100*(1-ratio)}%) brightness(${0.6+0.4*ratio})`;
                textEls.forEach(el=>el.style.filter=`grayscale(${100*(1-ratio)}%) brightness(${0.6+0.4*ratio})`);
            },
            onComplete: function(){
                light.remove();
                visualEl.style.filter="none";
                textEls.forEach(el=>el.style.filter="none");

                // 动画完成后延迟恢复原始样式
                gsap.delayedCall(2, () => {
                    canvas.style.transform = "";
                    // 恢复所有元素原始 filter 样式
                    originalStyles.allVisuals.forEach(({ el, filter }) => {
                        el.style.filter = filter;
                    });
                    originalStyles.allTexts.forEach(({ el, filter }) => {
                        el.style.filter = filter;
                    });
                });
            }
        });
    }
}


function runAnimation(canvasId = "canvas", groupIds = []) {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);

    const animationOptions = ["value3", "value3"];
    const animationType = animationOptions[Math.floor(Math.random() * animationOptions.length)];
    console.log(`随机选择动画类型: ${animationType}`);

    let timelinePromise;
    switch (animationType) {
        case "value1":
            timelinePromise = value1(canvasId, groupIds);
            break;
        case "value2":
            timelinePromise = value2(canvasId, groupIds);
            break;
        case "value3":
            timelinePromise = value3(canvasId, groupIds);
            break;
    }

    if (timelinePromise) {
        timelinePromise.then(tl => { if (tl && tl.play) tl.play(); });
    }
}

// 挂载
window.value1 = value1;
window.value2 = value2;
window.value3 = value3;
window.runAnimation = runAnimation;

document.addEventListener("DOMContentLoaded", () => {
    runAnimation("canvas");
});
