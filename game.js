const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 设置画布实际尺寸
canvas.width = 1000;
canvas.height = 600;

// 游戏状态
let gameState = {
    isRunning: false,
    isPaused: false,
    level: 1,
    score: 0,
    targetScore: 500,
    timeLeft: 60,
    hookAngle: 0,
    hookDirection: 1,
    hookSpeed: 1.5,
    hookLength: 50,
    hookExtending: false,
    hookRetracting: false,
    hookMaxExtension: 550,
    caughtItem: null,
    isGameOver: false
};

// 矿工位置
const miner = {
    x: canvas.width / 2,
    y: 100,
    width: 60,
    height: 80
};

// 钩子
const hook = {
    x: miner.x,
    y: miner.y + miner.height / 2,
    width: 24,
    height: 24,
    speed: 3,
    currentLength: gameState.hookLength
};

// 游戏物品
let items = [];

// 特效粒子
let particles = [];

// 分数弹出动画
let scorePopups = [];

// 抓取特效
let catchEffects = [];

// 获取随关卡递增的物品价值
function getItemValue(baseValue, itemType) {
    const levelMultiplier = 1 + (gameState.level - 1) * 0.05; // 每关价值增加5%
    return Math.floor(baseValue * levelMultiplier);
}

// 获取物品尺寸（前几关黄金更大）
function getItemSize(baseSize, itemType) {
    if (gameState.level <= 2 && itemType.includes('gold')) {
        // 前两关黄金尺寸增加50%
        return Math.floor(baseSize * 1.5);
    } else if (gameState.level === 3 && itemType.includes('gold')) {
        // 第3关黄金尺寸增加30%
        return Math.floor(baseSize * 1.3);
    }
    return baseSize;
}

// 物品类型（基础价值）
const baseItemTypes = {
    gold_small: { value: 50, size: 30, color: '#FFD700', weight: 0.6 },
    gold_medium: { value: 100, size: 45, color: '#FFA500', weight: 0.9 },
    gold_large: { value: 200, size: 60, color: '#FF8C00', weight: 1.2 },
    diamond: { value: 300, size: 25, color: '#00FFFF', weight: 0.5 },
    rock: { value: 20, size: 50, color: '#808080', weight: 2.5 }
};

// 初始化游戏物品
function initItems() {
    items = [];
    let itemCount;
    
    // 前几关物品数量更少
    if (gameState.level <= 2) {
        itemCount = 5; // 1-2关只有5个物品
    } else if (gameState.level <= 5) {
        itemCount = 6; // 3-5关6个物品
    } else {
        itemCount = 6 + Math.floor((gameState.level - 5) * 0.3); // 6关开始缓慢增加
    }
    
    // 确保物品总价值不低于目标分数
    let totalValue = 0;
    const targetValue = gameState.targetScore;
    
    for (let i = 0; i < itemCount; i++) {
        let type;
        
        // 前面关卡物品类型限制，大幅增加黄金比例
        if (gameState.level === 1) {
            // 第1关90%小金块，10%石头
            type = Math.random() < 0.9 ? 'gold_small' : 'rock';
        } else if (gameState.level === 2) {
            // 第2关85%金块，15%石头
            const goldTypes = ['gold_small', 'gold_medium'];
            if (Math.random() < 0.85) {
                type = goldTypes[Math.floor(Math.random() * goldTypes.length)];
            } else {
                type = 'rock';
            }
        } else if (gameState.level === 3) {
            // 第3关80%金块，20%石头
            const goldTypes = ['gold_small', 'gold_medium', 'gold_large'];
            if (Math.random() < 0.8) {
                type = goldTypes[Math.floor(Math.random() * goldTypes.length)];
            } else {
                type = 'rock';
            }
        } else if (gameState.level === 4) {
            // 第4关70%金块，30%其他
            const goldTypes = ['gold_small', 'gold_medium', 'gold_large'];
            if (Math.random() < 0.7) {
                type = goldTypes[Math.floor(Math.random() * goldTypes.length)];
            } else {
                type = 'rock';
            }
        } else {
            // 5关及以后可能出现钻石
            const types = Object.keys(baseItemTypes);
            type = types[Math.floor(Math.random() * types.length)];
            
            // 钻石概率随关卡递增，但起始概率更低
            if (type === 'diamond') {
                const diamondChance = 0.02 + (gameState.level - 5) * 0.02; // 5关2%，之后每关增加2%
                if (Math.random() > diamondChance) {
                    // 重新选择非钻石物品，优先黄金
                    const nonDiamondTypes = types.filter(t => t !== 'diamond');
                    if (Math.random() < 0.8) {
                        // 80%概率选择黄金
                        const goldTypes = nonDiamondTypes.filter(t => t.includes('gold'));
                        type = goldTypes[Math.floor(Math.random() * goldTypes.length)];
                    } else {
                        type = nonDiamondTypes[Math.floor(Math.random() * nonDiamondTypes.length)];
                    }
                }
            }
        }
        
        const itemData = baseItemTypes[type];
        const actualValue = getItemValue(itemData.value, type);
        const actualSize = getItemSize(itemData.size, type);
        
        items.push({
            type: type,
            x: Math.random() * (canvas.width - actualSize * 2) + actualSize,
            y: Math.random() * (canvas.height - 300) + 250,
            size: actualSize,
            color: itemData.color,
            value: actualValue,
            weight: itemData.weight,
            caught: false
        });
        
        totalValue += actualValue;
    }
    
    // 如果物品总价值低于目标分数，增加一些高价值物品
    while (totalValue < targetValue * 1.2) { // 确保总价值至少是目标的1.2倍
        let type;
        if (gameState.level <= 2) {
            type = 'gold_medium'; // 前两关添加中金块
        } else if (gameState.level <= 4) {
            const goldTypes = ['gold_medium', 'gold_large'];
            type = goldTypes[Math.floor(Math.random() * goldTypes.length)];
        } else {
            const types = ['gold_medium', 'gold_large', 'diamond'];
            type = types[Math.floor(Math.random() * types.length)];
        }
        
        const itemData = baseItemTypes[type];
        const actualValue = getItemValue(itemData.value, type);
        const actualSize = getItemSize(itemData.size, type);
        
        items.push({
            type: type,
            x: Math.random() * (canvas.width - actualSize * 2) + actualSize,
            y: Math.random() * (canvas.height - 300) + 250,
            size: actualSize,
            color: itemData.color,
            value: actualValue,
            weight: itemData.weight,
            caught: false
        });
        
        totalValue += actualValue;
    }
}

// 绘制矿工
function drawMiner() {
    ctx.save();
    
    // 矿工身体（更精细的设计）
    ctx.fillStyle = '#4169E1'; // 深蓝色工作服
    ctx.fillRect(miner.x - miner.width/2, miner.y - miner.height/2 + 10, miner.width, miner.height - 10);
    
    // 工作服细节
    ctx.fillStyle = '#2C5282'; // 深色条纹
    ctx.fillRect(miner.x - miner.width/2 + 5, miner.y - miner.height/2 + 15, 5, miner.height - 20);
    ctx.fillRect(miner.x + miner.width/2 - 10, miner.y - miner.height/2 + 15, 5, miner.height - 20);
    
    // 工作服口袋
    ctx.fillStyle = '#34495E';
    ctx.fillRect(miner.x - miner.width/2 + 8, miner.y - miner.height/2 + 25, miner.width - 16, 15);
    
    // 矿工头部
    ctx.fillStyle = '#FDBCB4'; // 肤色
    ctx.beginPath();
    ctx.arc(miner.x, miner.y - miner.height/2 - 15, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // 矿工面部特征
    ctx.fillStyle = '#8B4513'; // 眉睛
    ctx.beginPath();
    ctx.arc(miner.x - 4, miner.y - miner.height/2 - 18, 2, 0, Math.PI * 2);
    ctx.arc(miner.x + 4, miner.y - miner.height/2 - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 矿工微笑
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(miner.x, miner.y - miner.height/2 - 12, 6, 0, Math.PI);
    ctx.stroke();
    
    // 安全帽（更立体）
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(miner.x, miner.y - miner.height/2 - 15, 15, Math.PI, 0);
    ctx.fill();
    
    // 安全帽高光
    const helmetGradient = ctx.createLinearGradient(
        miner.x - 15, miner.y - miner.height/2 - 25,
        miner.x + 15, miner.y - miner.height/2 - 5
    );
    helmetGradient.addColorStop(0, '#FFEA00');
    helmetGradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = helmetGradient;
    ctx.beginPath();
    ctx.arc(miner.x, miner.y - miner.height/2 - 15, 15, Math.PI, 0);
    ctx.fill();
    
    // 安全帽徽章
    ctx.fillStyle = '#FF6B35';
    ctx.fillRect(miner.x - 5, miner.y - miner.height/2 - 20, 10, 3);
    
    // 手臂（持绳子的手臂）
    ctx.fillStyle = '#FDBCB4';
    ctx.fillRect(miner.x - 5, miner.y - miner.height/2 + 5, 10, 20);
    
    // 手套
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(miner.x - 6, miner.y - miner.height/2 + 20, 12, 8);
    
    ctx.restore();
}

// 绘制钩子线
function drawHookLine() {
    ctx.save();
    
    const lineLength = hook.currentLength;
    const angleRad = gameState.hookAngle * Math.PI / 180;
    const endX = miner.x + Math.sin(angleRad) * lineLength;
    const endY = miner.y + miner.height/2 + Math.cos(angleRad) * lineLength;
    
    // 绘制绳子（更粗更有质感）
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(miner.x, miner.y + miner.height/2);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // 绘制绳子纹理
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(miner.x, miner.y + miner.height/2);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 绘制钩子（只有当没有抓取物品时才显示）
    hook.x = endX;
    hook.y = endY;
    
    if (!gameState.caughtItem) {
        // 绘制精细的矿工小人
        ctx.save();
        ctx.translate(hook.x, hook.y);
        ctx.rotate(-angleRad); // 反转角度，让矿工身体垂直向下
        
        // 矿工身体（缩小版）
        ctx.fillStyle = '#4169E1'; // 蓝色工作服
        ctx.fillRect(-6, -4, 12, 10);
        
        // 工作服细节
        ctx.fillStyle = '#2C5282'; // 深色条纹
        ctx.fillRect(-4, -2, 3, 6);
        ctx.fillRect(1, -2, 3, 6);
        
        // 矿工头部
        ctx.fillStyle = '#FDBCB4'; // 肤色
        ctx.beginPath();
        ctx.arc(0, -8, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 矿工面部特征
        ctx.fillStyle = '#8B4513'; // 眼睛
        ctx.beginPath();
        ctx.arc(-2, -10, 1.5, 0, Math.PI * 2);
        ctx.arc(2, -10, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // 矿工微笑
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -6, 3, 0, Math.PI);
        ctx.stroke();
        
        // 安全帽（缩小版）
        ctx.fillStyle = '#FFD700'; // 金色安全帽
        ctx.beginPath();
        ctx.arc(0, -8, 5, Math.PI, 0);
        ctx.fill();
        
        // 安全帽高光
        const helmetGradient = ctx.createLinearGradient(0, -13, 0, -3);
        helmetGradient.addColorStop(0, '#FFEA00');
        helmetGradient.addColorStop(1, '#FFD700');
        ctx.fillStyle = helmetGradient;
        ctx.beginPath();
        ctx.arc(0, -8, 5, Math.PI, 0);
        ctx.fill();
        
        // 安全帽徽章
        ctx.fillStyle = '#FF6B35'; // 橴色徽章
        ctx.fillRect(-3, -13, 6, 2);
        
        // 手臂
        ctx.fillStyle = '#FDBCB4'; // 肤色
        ctx.fillRect(-3, 2, 6, 8);
        
        // 手套
        ctx.fillStyle = '#8B4513'; // 深色手套
        ctx.fillRect(-4, 8, 8, 6);
        
        // 连接点
        ctx.fillStyle = '#8B4513'; // 与绳子同色
        ctx.beginPath();
        ctx.arc(0, 6, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    ctx.restore();
}

// 绘制物品
function drawItems() {
    items.forEach(item => {
        if (!item.caught || (item.caught && item === gameState.caughtItem)) {
            ctx.save();
            
            let drawX = item.x;
            let drawY = item.y;
            
            // 如果被抓取，物品直接覆盖钩子位置
            if (item.caught && item === gameState.caughtItem) {
                drawX = hook.x;
                drawY = hook.y;
            }
            
            if (item.type === 'diamond') {
                // 绘制钻石
                ctx.save();
                ctx.translate(drawX, drawY);
                
                // 钻石主体
                ctx.fillStyle = '#00FFFF';
                ctx.beginPath();
                ctx.moveTo(0, -item.size/2);
                ctx.lineTo(item.size/2, 0);
                ctx.lineTo(0, item.size/2);
                ctx.lineTo(-item.size/2, 0);
                ctx.closePath();
                ctx.fill();
                
                // 钻石光泽
                const gradient = ctx.createLinearGradient(-item.size/2, -item.size/2, item.size/2, item.size/2);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(0, -item.size/2);
                ctx.lineTo(item.size/2, 0);
                ctx.lineTo(0, item.size/2);
                ctx.lineTo(-item.size/2, 0);
                ctx.closePath();
                ctx.fill();
                
                // 钻石闪光
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, -item.size/2);
                ctx.lineTo(item.size/2, 0);
                ctx.lineTo(0, item.size/2);
                ctx.lineTo(-item.size/2, 0);
                ctx.closePath();
                ctx.stroke();
                
                ctx.restore();
            } else if (item.type.includes('gold')) {
                // 绘制金块，增加立体感
                ctx.save();
                ctx.translate(drawX, drawY);
                
                // 金块主体
                ctx.fillStyle = item.color;
                ctx.beginPath();
                ctx.arc(0, 0, item.size/2, 0, Math.PI * 2);
                ctx.fill();
                
                // 金块光泽
                const gradient = ctx.createRadialGradient(-item.size/4, -item.size/4, 0, 0, 0, item.size/2);
                gradient.addColorStop(0, 'rgba(255, 255, 224, 0.8)');
                gradient.addColorStop(0.3, 'rgba(255, 255, 224, 0.4)');
                gradient.addColorStop(1, 'rgba(255, 215, 0, 0.2)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, item.size/2 * 0.8, 0, Math.PI * 2);
                ctx.fill();
                
                // 金块边缘高光
                ctx.strokeStyle = 'rgba(255, 255, 224, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, item.size/2 - 1, 0, Math.PI * 2);
                ctx.stroke();
                
                // 金块内部纹理
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(0, 0, item.size/2 - i * 5, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                ctx.restore();
            } else {
                // 绘制石头
                ctx.save();
                ctx.translate(drawX, drawY);
                
                // 石头主体
                ctx.fillStyle = item.color;
                ctx.beginPath();
                ctx.arc(0, 0, item.size/2, 0, Math.PI * 2);
                ctx.fill();
                
                // 石头纹理
                ctx.fillStyle = 'rgba(105, 105, 105, 0.3)';
                ctx.beginPath();
                ctx.arc(-item.size/6, -item.size/6, item.size/6, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(item.size/6, item.size/6, item.size/6, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, item.size/4, item.size/8, 0, Math.PI * 2);
                ctx.fill();
                
                // 石头边缘
                ctx.strokeStyle = 'rgba(64, 64, 64, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, item.size/2 - 1, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.restore();
            }
            
            // 只为未被抓取的物品显示价值
            if (!item.caught) {
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeText('$' + item.value, item.x, item.y);
                ctx.fillText('$' + item.value, item.x, item.y);
            }
            
            ctx.restore();
        }
    });
}

// 创建粒子特效
function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 3;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            life: 1.0,
            size: 3 + Math.random() * 4
        });
    }
}

// 创建分数弹出动画
function createScorePopup(x, y, value) {
    scorePopups.push({
        x: x,
        y: y,
        value: value,
        life: 1.0,
        vy: -2
    });
}

// 创建抓取特效
function createCatchEffect() {
    catchEffects.push({
        life: 1.0,
        pulsePhase: 0
    });
}

// 更新抓取特效
function updateCatchEffects() {
    catchEffects = catchEffects.filter(effect => {
        effect.life -= 0.02;
        effect.pulsePhase += 0.2;
        return effect.life > 0;
    });
}

// 绘制抓取特效
function drawCatchEffects() {
    catchEffects.forEach(effect => {
        if (gameState.caughtItem) {
            ctx.save();
            
            // 连线闪烁效果
            const pulseIntensity = (Math.sin(effect.pulsePhase) + 1) / 2;
            ctx.strokeStyle = `rgba(255, 215, 0, ${effect.life * pulseIntensity})`;
            ctx.lineWidth = 3 + pulseIntensity * 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFD700';
            
            ctx.beginPath();
            ctx.moveTo(miner.x, miner.y + miner.height/2);
            ctx.lineTo(hook.x, hook.y);
            ctx.stroke();
            
            // 物品旋转效果
            ctx.translate(hook.x, hook.y);
            ctx.rotate(effect.pulsePhase * 0.5);
            ctx.translate(-hook.x, -hook.y);
            
            // 物品光晕效果
            const gradient = ctx.createRadialGradient(hook.x, hook.y, 0, hook.x, hook.y, gameState.caughtItem.size);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${effect.life * 0.3})`);
            gradient.addColorStop(0.5, `rgba(255, 215, 0, ${effect.life * 0.2})`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(hook.x, hook.y, gameState.caughtItem.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    });
}

// 更新粒子
function updateParticles() {
    particles = particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;
        particle.vy += 0.1; // 重力效果
        return particle.life > 0;
    });
}

// 更新分数弹出
function updateScorePopups() {
    scorePopups = scorePopups.filter(popup => {
        popup.y += popup.vy;
        popup.life -= 0.015;
        return popup.life > 0;
    });
}

// 绘制粒子
function drawParticles() {
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 闪光效果
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.fill();
        ctx.restore();
    });
}

// 绘制分数弹出
function drawScorePopups() {
    scorePopups.forEach(popup => {
        ctx.save();
        ctx.globalAlpha = popup.life;
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText('+$' + popup.value, popup.x, popup.y);
        ctx.fillText('+$' + popup.value, popup.x, popup.y);
        ctx.restore();
    });
}

// 绘制背景
function drawBackground() {
    // 天空
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, 200);
    
    // 地面
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 200, canvas.width, canvas.height - 200);
    
    // 地下层次
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(139, 115, 85, ${0.1 + i * 0.1})`;
        ctx.fillRect(0, 200 + i * 80, canvas.width, 80);
    }
}

// 碰撞检测
function checkCollision() {
    if (gameState.hookExtending || gameState.hookRetracting) {
        for (let item of items) {
            if (!item.caught) {
                const distance = Math.sqrt(
                    Math.pow(hook.x - item.x, 2) + 
                    Math.pow(hook.y - item.y, 2)
                );
                
                if (distance < (hook.width/2 + item.size/2)) {
                    item.caught = true;
                    gameState.caughtItem = item;
                    gameState.hookExtending = false;
                    gameState.hookRetracting = true;
                    
                    // 添加捕获特效（但不立即显示分数）
                    createParticles(item.x, item.y, item.color, 15);
                    createCatchEffect();
                    
                    break;
                }
            }
        }
    }
}

// 更新钩子
function updateHook() {
    if (gameState.hookExtending) {
        hook.currentLength += hook.speed;
        if (hook.currentLength >= gameState.hookMaxExtension) {
            gameState.hookExtending = false;
            gameState.hookRetracting = true;
        }
    }
    
    if (gameState.hookRetracting) {
        const retractSpeed = gameState.caughtItem ? 
            hook.speed / gameState.caughtItem.weight : hook.speed * 1.5; // 空钩子回弹更快
        
        hook.currentLength -= retractSpeed;
        
        if (hook.currentLength <= gameState.hookLength) {
                            if (gameState.caughtItem) {
                                // 抓取完成，计算分数并显示
                                gameState.score += gameState.caughtItem.value;
                                updateScore();
                                
                                // 在钩子位置显示分数弹出
                                createScorePopup(miner.x, miner.y - 20, gameState.caughtItem.value);
                                
                                // 移除已捕获的物品
                                items = items.filter(item => !item.caught);
                                gameState.caughtItem = null;
                            }
                            
                            gameState.hookRetracting = false;
                            hook.currentLength = gameState.hookLength;
                        }    }
    
    if (!gameState.hookExtending && !gameState.hookRetracting) {
        gameState.hookAngle += gameState.hookDirection * gameState.hookSpeed;
        if (gameState.hookAngle >= 80 || gameState.hookAngle <= -80) {
            gameState.hookDirection *= -1;
        }
    }
}

// 更新游戏
function updateGame() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    updateHook();
    checkCollision();
    updateParticles();
    updateScorePopups();
    updateCatchEffects();
    
    // 检查是否所有物品被抓完
    const availableItems = items.filter(item => !item.caught);
    
    if (availableItems.length === 0 && items.length > 0 && !gameState.levelSuccess) {
        console.log('所有物品已抓完，显示闯关成功界面');
        // 物品全部抓完，显示闯关成功界面
        gameState.levelSuccess = true;
        gameState.isGameOver = true;
        return;
    }
    
    // 检查关卡完成（标记但不自动升级）
    if (gameState.score >= gameState.targetScore && !gameState.levelCompleted) {
        gameState.levelCompleted = true;
    }
    
    // 检查游戏结束
    if (gameState.timeLeft <= 0 && !gameState.isGameOver) {
        gameState.isGameOver = true;
        // 不调用gameOver()，避免重复设置
    }
}

// 绘制游戏
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    drawMiner();
    drawHookLine();
    drawCatchEffects();
    drawItems();
    drawParticles();
    drawScorePopups();
    
    // 如果游戏结束，绘制游戏结束画面
    if (gameState.isGameOver) {
        drawGameOverScreen();
        return;
    }
    
    // 绘制暂停提示
    if (gameState.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏暂停', canvas.width/2, canvas.height/2);
    }
}

// 游戏循环
function gameLoop() {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// 更新分数显示
function updateScore() {
    document.getElementById('score').textContent = gameState.score;
}

// 更新时间
function updateTimer() {
    if (gameState.isRunning && !gameState.isPaused && !gameState.levelSuccess) {
        gameState.timeLeft--;
        document.getElementById('time').textContent = gameState.timeLeft;
        
        if (gameState.timeLeft <= 0) {
            // 确保游戏结束逻辑正确执行
            if (!gameState.isGameOver) {
                gameState.isGameOver = true;
                // 不调用gameOver()，避免重复设置
            }
        }
    }
}

// 升级
function levelUp() {
    gameState.levelCompleted = true; // 标记关卡完成，但不立即进入下一关
}

// 游戏结束
function gameOver() {
    gameState.isRunning = false;
    gameState.isGameOver = true;
    
    // 清除之前的点击事件
    canvas.onclick = null;
    
    // 强制绘制游戏结束画面
    drawGameOverScreen();
}

// 绘制游戏结束画面
function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    
    let showButtons = false;
    
    // 判断是否闯关成功
    if (gameState.levelSuccess) {
        // 闯关成功界面
        ctx.fillStyle = '#f39c12';
        ctx.fillText('闯关成功！', canvas.width/2, canvas.height/2 - 120);
        
        // 绘制庆祝星星
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = '#FFD700';
            ctx.font = '36px Arial';
            const starX = canvas.width/2 - 120 + i * 60;
            const starY = canvas.height/2 - 70;
            ctx.fillText('⭐', starX, starY);
        }
        
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(`第 ${gameState.level} 关完成！`, canvas.width/2, canvas.height/2 - 20);
        ctx.fillText(`获得分数: ${gameState.score}`, canvas.width/2, canvas.height/2 + 20);
        
        showButtons = true;
    } else if (gameState.score >= gameState.targetScore) {
        ctx.fillStyle = '#2ecc71';
        if (gameState.timeLeft <= 0) {
            ctx.fillText('通关成功！', canvas.width/2, canvas.height/2 - 80);
            showButtons = true; // 时间结束后显示按钮
        } else {
            ctx.fillText('目标达成！', canvas.width/2, canvas.height/2 - 80);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('继续游戏直到时间结束', canvas.width/2, canvas.height/2 - 40);
        }
    } else {
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('游戏失败！', canvas.width/2, canvas.height/2 - 80);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`目标分数: ${gameState.targetScore}`, canvas.width/2, canvas.height/2 - 40);
        ctx.fillText(`还差: ${gameState.targetScore - gameState.score} 分`, canvas.width/2, canvas.height/2 - 10);
        showButtons = true; // 失败时显示按钮
    }
    
    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    if (!gameState.levelSuccess) {
        ctx.fillText(`最终得分: ${gameState.score}`, canvas.width/2, canvas.height/2 + 30);
        ctx.fillText(`达到关卡: ${gameState.level}`, canvas.width/2, canvas.height/2 + 70);
    }
    
    // 显示按钮（仅在闯关成功、时间结束后或失败时）
    if (showButtons) {
        // 清除之前的事件
        canvas.onclick = null;
        canvas.ontouchstart = null;
        
        if (gameState.levelSuccess || gameState.score >= gameState.targetScore) {
            // 闯关成功：下一关按钮
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(canvas.width/2 - 80, canvas.height/2 + 100, 160, 50);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('下一关', canvas.width/2, canvas.height/2 + 130);
            
            // 添加点击事件
            canvas.onclick = function(event) {
                const rect = canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                if (x >= canvas.width/2 - 80 && x <= canvas.width/2 + 80 && 
                    y >= canvas.height/2 + 100 && y <= canvas.height/2 + 150) {
                    nextLevel();
                }
            };
            
            canvas.ontouchstart = function(event) {
                event.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const touch = event.touches[0];
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                if (x >= canvas.width/2 - 80 && x <= canvas.width/2 + 80 && 
                    y >= canvas.height/2 + 100 && y <= canvas.height/2 + 150) {
                    nextLevel();
                }
            };
        } else {
            // 游戏失败：重新开始按钮
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(canvas.width/2 - 80, canvas.height/2 + 100, 160, 50);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('重新开始', canvas.width/2, canvas.height/2 + 130);
            
            // 添加点击事件
            canvas.onclick = function(event) {
                const rect = canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                if (x >= canvas.width/2 - 80 && x <= canvas.width/2 + 80 && 
                    y >= canvas.height/2 + 100 && y <= canvas.height/2 + 150) {
                    restartGame();
                }
            };
            
            canvas.ontouchstart = function(event) {
                event.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const touch = event.touches[0];
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                if (x >= canvas.width/2 - 80 && x <= canvas.width/2 + 80 && 
                    y >= canvas.height/2 + 100 && y <= canvas.height/2 + 150) {
                    restartGame();
                }
            };
        }
    }
}

// 进入下一关
function nextLevel() {
    gameState.level++;
    
    // 前几关目标分数更低
    if (gameState.level === 1) {
        gameState.targetScore = 300;
    } else if (gameState.level === 2) {
        gameState.targetScore = 400;
    } else if (gameState.level === 3) {
        gameState.targetScore = 500;
    } else {
        gameState.targetScore = 500 + (gameState.level - 3) * 120; // 3关后：500, 620, 740...
    }
    
    gameState.timeLeft = 60; // 每关固定1分钟
    gameState.hookSpeed = Math.min(1.5 + gameState.level * 0.15, 3.5); // 钩子速度递增更慢
    gameState.levelCompleted = false; // 重置关卡完成标志
    gameState.levelSuccess = false; // 重置闯关成功标志
    gameState.isGameOver = false; // 重置游戏结束标志
    gameState.isRunning = true; // 直接开始游戏
    
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('target').textContent = gameState.targetScore;
    document.getElementById('time').textContent = gameState.timeLeft;
    
    // 清除事件
    canvas.onclick = null;
    canvas.ontouchstart = null;
    
    // 重置钩子状态
    hook.currentLength = gameState.hookLength;
    gameState.hookExtending = false;
    gameState.hookRetracting = false;
    gameState.caughtItem = null;
    
    // 清空特效
    particles = [];
    scorePopups = [];
    catchEffects = [];
    
    initItems();
}

// 开始游戏
function startGame() {
    gameState = {
        isRunning: true,
        isPaused: false,
        level: 1,
        score: 0,
        targetScore: 300, // 进一步降低初始目标分数
        timeLeft: 60,
        hookAngle: 0,
        hookDirection: 1,
        hookSpeed: 1.5,
        hookLength: 50,
        hookExtending: false,
        hookRetracting: false,
        hookMaxExtension: 550,
        caughtItem: null,
        isGameOver: false,
        levelCompleted: false, // 新增关卡完成标志
        levelSuccess: false // 新增闯关成功标志
    };
    
    hook.currentLength = gameState.hookLength;
    
    // 清空特效
    particles = [];
    scorePopups = [];
    catchEffects = [];
    
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('target').textContent = gameState.targetScore;
    document.getElementById('time').textContent = gameState.timeLeft;
    
    // 隐藏开始按钮
    document.getElementById('startBtn').style.display = 'none';
    
    initItems();
}

// 暂停游戏
function pauseGame() {
    if (gameState.isRunning) {
        gameState.isPaused = !gameState.isPaused;
        document.getElementById('pauseBtn').textContent = gameState.isPaused ? '继续' : '暂停';
    }
}

// 重新开始游戏
function restartGame() {
    // 显示开始按钮
    document.getElementById('startBtn').style.display = 'inline-block';
    
    // 清除事件
    canvas.onclick = null;
    canvas.ontouchstart = null;
    
    // 重新开始游戏
    startGame();
}

// 出钩子按钮事件
function launchHook() {
    if (gameState.isRunning && !gameState.isPaused) {
        if (!gameState.hookExtending && !gameState.hookRetracting) {
            gameState.hookExtending = true;
            // 按钮按下效果
            const hookBtn = document.getElementById('hookBtn');
            hookBtn.classList.add('pressed');
            setTimeout(() => hookBtn.classList.remove('pressed'), 200);
        }
    }
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState.isRunning && !gameState.isPaused) {
        e.preventDefault();
        if (!gameState.hookExtending && !gameState.hookRetracting) {
            gameState.hookExtending = true;
            // 按钮按下效果
            const hookBtn = document.getElementById('hookBtn');
            hookBtn.classList.add('pressed');
            setTimeout(() => hookBtn.classList.remove('pressed'), 200);
        }
    }
});

// 按钮事件
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('pauseBtn').addEventListener('click', pauseGame);
document.getElementById('hookBtn').addEventListener('click', launchHook);

// 触摸事件支持
document.getElementById('hookBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    launchHook();
});

// 防止页面滚动
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.game-container')) {
        e.preventDefault();
    }
}, { passive: false });

// 计时器
setInterval(updateTimer, 1000);

// 启动游戏循环
gameLoop();

// 初始化
initItems();
drawGame();