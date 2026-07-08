function difference(canvasId = "canvas", groupIds = [], spacing = 150) {
    // 确保 spacing 是数字
    spacing = Number(spacing) || 150;
    let canvas = document.getElementById(canvasId);
    if (!canvas) return console.warn("Canvas not found");
    const outerCanvas = canvas;
    canvas = outerCanvas.querySelector('.canvas') || outerCanvas;
    if (groupIds.length < 2) return console.warn("请传入至少两个组");

    const canvasRect = canvas.getBoundingClientRect();
    console.log("🎯 difference动画开始, groupIds:", groupIds, "canvasRect:", canvasRect.width, canvasRect.height);

    // 收集每组元素和原始位置
    const groupInfos = groupIds.map(groupId => {
        const els = Array.from(canvas.querySelectorAll(`.element[data-group="${groupId}"]`));
        console.log(`📍 组 ${groupId} 找到 ${els.length} 个元素`);
        return {
            groupId,
            els,
            original: els.map(el => ({
                left: parseFloat(el.style.left) || el.offsetLeft,
                top: parseFloat(el.style.top) || el.offsetTop,
                position: el.style.position || "",
                zIndex: el.style.zIndex || ""
            }))
        };
    });

    // 隐藏原元素，虚化其他
    const allElements = canvas.querySelectorAll(".element");
    allElements.forEach(el => {
        const group = el.getAttribute("data-group");
        if (groupIds.includes(group)) {
            el.style.visibility = "visible";
            el.style.position = "absolute";
            el.style.zIndex = 9999;
        } else {
            gsap.to(el, { filter: "blur(6px)", duration: 0.5 });
        }
    });

    // 计算每组宽度
    groupInfos.forEach(info => {
        const lefts = info.els.map(el => parseFloat(el.style.left) || el.offsetLeft);
        const rights = info.els.map(el => (parseFloat(el.style.left) || el.offsetLeft) + el.offsetWidth);
        info.width = Math.max(...rights) - Math.min(...lefts);
        console.log(`📐 组 ${info.groupId} width: ${info.width}, lefts:`, lefts);
    });

    // 总宽度
    const totalWidth = groupInfos.reduce((sum, g) => sum + g.width, 0) + (groupInfos.length - 1) * spacing;
    console.log(`📏 总宽度: ${totalWidth}`);

    // 计算起始X位置（居中）
    const startX = canvasRect.width / 2 - totalWidth / 2;
    console.log(`🎯 起始X位置: ${startX}`);

    // 预先计算每组的起始X位置（不修改原值）
    let prevGroupEndX = startX;
    console.log(`🔧 startX=${startX}, spacing=${spacing}`);
    groupInfos.forEach((info, index) => {
        info.startX = prevGroupEndX;
        info.targetCx = prevGroupEndX + info.width / 2;
        prevGroupEndX = prevGroupEndX + info.width + spacing;
        console.log(`📍 组 ${info.groupId}: index=${index}, width=${info.width}, startX=${info.startX}, targetCx=${info.targetCx}, prevGroupEndX=${prevGroupEndX}`);
    });

    // 移动每组
    groupInfos.forEach((info, index) => {
        // 计算组中心
        const cx = info.els.reduce((sum, el) => sum + (parseFloat(el.style.left) || el.offsetLeft) + el.offsetWidth / 2, 0) / info.els.length;
        const cy = info.els.reduce((sum, el) => sum + (parseFloat(el.style.top) || el.offsetTop) + el.offsetHeight / 2, 0) / info.els.length;

        const targetCy = canvasRect.height / 2;
        const dx = info.targetCx - cx;
        const dy = targetCy - cy;

        console.log(`🚀 移动组 ${info.groupId}: cx=${cx}, cy=${cy} -> targetCx=${info.targetCx}, targetCy=${targetCy}, dx=${dx}, dy=${dy}`);

        // 动画移动元素
        info.els.forEach(el => {
            const currentLeft = parseFloat(el.style.left) || el.offsetLeft;
            const currentTop = parseFloat(el.style.top) || el.offsetTop;
            gsap.to(el, {
                left: currentLeft + dx + "px",
                top: currentTop + dy + "px",
                duration: 1,
                ease: "power2.inOut"
            });
        });
    });

    // 添加 VS
    for (let i = 0; i < groupInfos.length - 1; i++) {
        const vs = document.createElement("div");
        vs.innerText = "VS";
        const vsX = groupInfos[i].startX + groupInfos[i].width + spacing / 2;
        const vsY = canvasRect.height / 2;
        Object.assign(vs.style, {
            position: "absolute",
            left: vsX + "px",
            top: vsY + "px",
            transform: "translate(-50%, -50%)",
            fontSize: "80px",
            fontWeight: "bold",
            color: "#0400ffff",
            opacity: 0,
            pointerEvents: "none",
            zIndex: 9999
        });
        canvas.appendChild(vs);
        gsap.to(vs, { opacity: 1, scale: 1.2, duration: 0.5, ease: "back.out(1.7)" });
        console.log(`⚔️ VS 位置: x=${vsX}, y=${vsY}`);
        setTimeout(() => vs.remove(), 3000);
    }

    // 恢复原位
    setTimeout(() => {
        console.log("🔄 恢复原位");
        groupInfos.forEach(info => {
            info.els.forEach((el, idx) => {
                const ori = info.original[idx];
                gsap.to(el, {
                    left: ori.left + "px",
                    top: ori.top + "px",
                    duration: 0.5,
                    ease: "power2.inOut",
                    onStart: () => {
                        el.style.position = "absolute";
                    },
                    onComplete: () => {
                        el.style.position = ori.position;
                        el.style.zIndex = ori.zIndex;
                        el.style.visibility = "visible";
                    }
                });
            });
        });

        // 恢复虚化
        allElements.forEach(el => {
            if (!groupIds.includes(el.getAttribute("data-group"))) {
                gsap.to(el, { filter: "", duration: 0.5 });
            }
        });
    }, 3500);
}

window.difference = difference;
window.Difference = difference;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    difference(canvasId, groupIds);
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
    if (typeof gsap !== "undefined") {
        gsap.killTweensOf('*');
    }
};
