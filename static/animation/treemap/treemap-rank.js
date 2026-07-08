/**
从大到小依次出现
**/
function rank(canvasId = "canvas", groupIds = [], duration = 0.8, delay = 0.3, ease = "power2.out") {
    // 支持两种方式：直接用 ID 或在容器内找 class="canvas" 的元素
    let canvas;
    if (canvasId === "animation-canvas") {
        canvas = document.querySelector("#animation-canvas .canvas");
    } else {
        canvas = document.getElementById(canvasId);
    }
    if (!canvas) return console.warn(`未找到 id="${canvasId}"`);
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
        return console.warn("请传入有效的组ID列表");
    }

    // 1. 获取每个组的所有元素
    const groupList = groupIds.map(groupId => {
        return Array.from(canvas.querySelectorAll(`[data-group="${groupId}"]`));
    }).filter(group => group.length > 0); // 过滤空组

    // 2. 计算每个组的尺寸并排序
    const groupWithSize = groupList.map(group => {
        // 找到组内的data_graphic元素（用它的尺寸代表组大小）
        const dataGraphic = group.find(el => el.dataset.type === "data_graphic");
        if (!dataGraphic) {
            console.warn("组内缺少data_graphic元素，将跳过该组");
            return null;
        }

        // 获取元素尺寸（面积 = 宽 * 高）
        const rect = dataGraphic.getBoundingClientRect();
        const area = rect.width * rect.height;

        return {
            group,
            dataGraphic,
            area,
            width: rect.width,
            height: rect.height
        };
    }).filter(Boolean); // 过滤无效组

    // 按面积从大到小排序（面积相同则按宽度排序）
    const sortedGroups = groupWithSize.sort((a, b) => {
        if (b.area !== a.area) {
            return b.area - a.area; // 面积大的在前
        }
        return b.width - a.width; // 面积相同则宽度大的在前
    });

    // 3. 隐藏 canvas 内所有元素（包括非传入组）
    const allElements = Array.from(canvas.querySelectorAll('[data-group]'));
    gsap.set(allElements, { opacity: 0, scale: 0.9 });

    // 4. 创建动画时间线，按排序依次显示传入组
    const masterTl = gsap.timeline({ repeat: 2 });
    const cycleTl = gsap.timeline();

    sortedGroups.forEach(({ group }, index) => {
        const startTime = index * delay;
        cycleTl.to(group, {
            opacity: 1,
            scale: 1,
            duration,
            ease
        }, startTime);
    });

    // 所有组出现后等待，再统一淡出（为下次循环做准备）
    const totalAppearTime = (sortedGroups.length - 1) * delay + duration;
    cycleTl.to(sortedGroups.flatMap(({ group }) => group), {
        opacity: 0,
        scale: 0.9,
        duration: 0.4,
        ease: "power2.in"
    }, totalAppearTime + 0.5);

    masterTl.add(cycleTl);

    // 循环结束后恢复所有元素（含非传入组）
    masterTl.eventCallback("onComplete", () => {
        gsap.set(allElements, { opacity: 1, scale: 1 });
    });

    window._currentMasterTimeline = masterTl;
    return masterTl;
}


window.rank = rank;

/**
 * 随机运行动画
 */
function runAnimation(canvasId = "canvas", groupIds = []) {
    if (typeof window.destroyCurrentAnimation === "function") {
        window.destroyCurrentAnimation(canvasId);
    }
    rank(canvasId, groupIds);
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
        gsap.set(el, { opacity: 1, scale: 1 });
    });
};