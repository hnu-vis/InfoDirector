function categorization1(canvasId = "canvas", groupIds = [], duration = 0.5) {
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn("Canvas not found");

    const allElements = canvas.querySelectorAll(".element[data-group]");

    // 遍历所有组，除了传入组之外全部 fade out
    allElements.forEach(el => {
        if (!groupIds.includes(el.dataset.group)) {
            gsap.to(el, {
                opacity: 0,
                duration: duration,
                ease: "power2.in"
            });
        }
    });

    // 动画完成后恢复
    gsap.delayedCall(3, () => {
        allElements.forEach(el => {
            gsap.to(el, { opacity: 1, duration: 0.3 });
        });
    });
}

function categorization2(canvasId = "canvas", groupIds = [], color = "rgba(255,200,0,0.3)", duration = 0.5, padding = 15) {
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn("Canvas not found");

    const createdPanels = [];

    groupIds.forEach(groupId => {
        const groupEls = canvas.querySelectorAll(`.element[data-group='${groupId}']`);
        if (!groupEls.length) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        groupEls.forEach(el => {
            const left = el.offsetLeft;
            const top = el.offsetTop;
            const width = el.offsetWidth;
            const height = el.offsetHeight;
            minX = Math.min(minX, left);
            minY = Math.min(minY, top);
            maxX = Math.max(maxX, left + width);
            maxY = Math.max(maxY, top + height);
        });

        const panel = document.createElement("div");
        panel.style.position = "absolute";
        panel.style.left = `${minX - padding}px`;
        panel.style.top = `${minY - padding}px`;
        panel.style.width = `${maxX - minX + 2*padding}px`;
        panel.style.height = `${maxY - minY + 2*padding}px`;
        panel.style.backgroundColor = color;
        panel.style.border = "3px solid #ffcc00";
        panel.style.borderRadius = "8px";
        panel.style.zIndex = 1;
        panel.style.opacity = 0;
        panel.style.boxShadow = "0 0 20px rgba(255,204,0,0.5)";

        canvas.appendChild(panel);
        createdPanels.push(panel);

        gsap.to(panel, { opacity: 1, duration: duration, ease: "power2.out" });
    });

    gsap.delayedCall(3, () => {
        createdPanels.forEach(panel => {
            gsap.to(panel, {
                opacity: 0,
                duration: 0.4,
                onComplete: () => panel.remove()
            });
        });
    });
}

window.categorization1 = categorization1;
window.categorization2 = categorization2;