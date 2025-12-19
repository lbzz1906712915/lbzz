const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
    width: 20,
    height: 20,
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

// 物品类型
const itemTypes = {
    gold_small: { value: 50, size: 30, color: '#FFD700', weight: 0.6 },
    gold_medium: { value: 100, size: 45, color: '#FFA500', weight: 0.9 },
    gold_large: { value: 200, size: 60, color: '#FF8C00', weight: 1.2 },
    diamond: { value: 300, size: 25, color: '#00FFFF', weight: 0.5 },
    rock: { value: 20, size: 50, color: '#808080', weight: 2.5 }
};

// 初始化游戏物品
function initItems() {
    items = [];
    const itemCount = 8 + gameState.level * 2;
    
    for (let i = 0; i < itemCount; i++) {
        const types = Object.keys(itemTypes);
        const type = types[Math.floor(Math.random() * types.length)];
        const itemData = itemTypes[type];
        
        items.push({
            type: type,
            x: Math.random() * (canvas.width - itemData.size * 2) + itemData.size,
            y: Math.random() * (canvas.height - 300) + 250,
            size: itemData.size,
            color: itemData.color,
            value: itemData.value,
            weight: itemData.weight,
            caught: false
        });
    }
}

// 绘制矿工
function drawMiner() {
    ctx.save();
    
    // 矿工身体
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(miner.x - miner.width/2, miner.y - miner.height/2, miner.width, miner.height);
    
    // 矿工头部
    ctx.fillStyle = '#FDBCB4';
    ctx.beginPath();
    ctx.arc(miner.x, miner.y - miner.height/2 - 15, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // 安全帽
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(miner.x, miner.y - miner.height/2 - 15, 15, Math.PI, 0);
    ctx.fill();
    
    ctx.restore();
}

// 绘制钩子线
function drawHookLine() {
    ctx.save();
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const lineLength = hook.currentLength;
    const endX = miner.x + Math.sin(gameState.hookAngle * Math.PI / 180) * lineLength;
    const endY = miner.y + miner.height/2 + Math.cos(gameState.hookAngle * Math.PI / 180) * lineLength;
    
    ctx.moveTo(miner.x, miner.y + miner.height/2);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // 绘制钩子（只有当没有抓取物品时才显示）
    hook.x = endX;
    hook.y = endY;
    
    if (!gameState.caughtItem) {
        ctx.fillStyle = '#696969';
        ctx.beginPath();
        ctx.arc(hook.x, hook.y, hook.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // 钩子尖端
        ctx.strokeStyle = '#696969';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hook.x - 10, hook.y + 5);
        ctx.lineTo(hook.x, hook.y);
        ctx.lineTo(hook.x + 10, hook.y + 5);
        ctx.stroke();
    }
    
    ctx.restore();
}

// 绘制物品
function drawItems() {
    items.forEach(item => {
        if (!item.caught || (item.caught && item === gameState.caughtItem)) {
            ctx.save();
            ctx.fillStyle = item.color;
            
            let drawX = item.x;
            let drawY = item.y;
            
            // 如果被抓取，物品直接覆盖钩子位置
            if (item.caught && item === gameState.caughtItem) {
                drawX = hook.x;
                drawY = hook.y;
            }
            
            if (item.type === 'diamond') {
                // 绘制钻石
                ctx.beginPath();
                ctx.moveTo(drawX, drawY - item.size/2);
                ctx.lineTo(drawX + item.size/2, drawY);
                ctx.lineTo(drawX, drawY + item.size/2);
                ctx.lineTo(drawX - item.size/2, drawY);
                ctx.closePath();
                ctx.fill();
            } else {
                // 绘制圆形物品
                ctx.beginPath();
                ctx.arc(drawX, drawY, item.size/2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 只为未被抓取的物品显示价值
            if (!item.caught) {
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
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
                    
                    // 添加捕获特效
                    createParticles(item.x, item.y, item.color, 15);
                    createScorePopup(item.x, item.y - 20, item.value);
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
            hook.speed / gameState.caughtItem.weight : hook.speed;
        
        hook.currentLength -= retractSpeed;
        
        if (hook.currentLength <= gameState.hookLength) {
            if (gameState.caughtItem) {
                gameState.score += gameState.caughtItem.value;
                updateScore();
                
                // 移除已捕获的物品
                items = items.filter(item => !item.caught);
                gameState.caughtItem = null;
            }
            
            gameState.hookRetracting = false;
            hook.currentLength = gameState.hookLength;
        }
    }
    
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
    
    // 检查关卡完成
    if (gameState.score >= gameState.targetScore) {
        levelUp();
    }
    
    // 检查游戏结束
    if (gameState.timeLeft <= 0) {
        gameOver();
    }
}

// 绘制游戏
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    drawItems();
    drawMiner();
    drawHookLine();
    drawCatchEffects();
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
    if (gameState.isRunning && !gameState.isPaused) {
        gameState.timeLeft--;
        document.getElementById('time').textContent = gameState.timeLeft;
        
        if (gameState.timeLeft <= 0) {
            // 确保游戏结束逻辑正确执行
            if (!gameState.isGameOver) {
                gameState.isGameOver = true;
                gameOver();
            }
        }
    }
}

// 升级
function levelUp() {
    gameState.level++;
    gameState.targetScore = 500 * gameState.level;
    gameState.timeLeft = 60; // 每关固定1分钟
    gameState.hookSpeed = 1.5 + gameState.level * 0.3;
    
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('target').textContent = gameState.targetScore;
    document.getElementById('time').textContent = gameState.timeLeft;
    
    initItems();
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
    
    // 判断是否达标
    if (gameState.score >= gameState.targetScore) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillText('关卡完成！', canvas.width/2, canvas.height/2 - 80);
    } else {
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('游戏失败！', canvas.width/2, canvas.height/2 - 80);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`目标分数: ${gameState.targetScore}`, canvas.width/2, canvas.height/2 - 40);
        ctx.fillText(`还差: ${gameState.targetScore - gameState.score} 分`, canvas.width/2, canvas.height/2 - 10);
    }
    
    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`最终得分: ${gameState.score}`, canvas.width/2, canvas.height/2 + 30);
    ctx.fillText(`达到关卡: ${gameState.level}`, canvas.width/2, canvas.height/2 + 70);
    
    // 显示重新开始按钮
    if (gameState.score < gameState.targetScore) {
        // 绘制按钮
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
            
            // 检查是否点击了重新开始按钮
            if (x >= canvas.width/2 - 80 && x <= canvas.width/2 + 80 && 
                y >= canvas.height/2 + 100 && y <= canvas.height/2 + 150) {
                restartGame();
            }
        };
        
        // 添加触摸事件支持
        canvas.ontouchstart = function(event) {
            event.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const touch = event.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // 检查是否点击了重新开始按钮
            if (x >= canvas.width/2 - 80 && x <= canvas.width/2 + 80 && 
                y >= canvas.height/2 + 100 && y <= canvas.height/2 + 150) {
                restartGame();
            }
        };
    }
}

// 开始游戏
function startGame() {
    gameState = {
        isRunning: true,
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