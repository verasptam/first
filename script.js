// 薪跳 - 上班时间财富可视化器
// 主应用类
class SalaryJump {
    constructor() {
        this.startTime = null;
        this.currentEarnings = 0;
        this.hourlyRate = 0;
        this.settings = this.loadSettings();
        this.isRunning = false;
        this.updateInterval = null;
        this.particleInterval = null;
        this.celebrationInterval = null;
        this.soundEnabled = true;
        this.currentTheme = 'money';
        this.milestones = [50, 100, 200, 500, 1000, 2000, 5000];
        this.achievedMilestones = [];
        this.isBossMode = false;
        this.lastCelebrationTime = 0;
        
        // 伪装页面内容
        this.fakeContent = {
            todoList: `
                <div style="padding: 40px; max-width: 800px; margin: 0 auto; background: #f8fafc; color: #334155; min-height: 100vh;">
                    <h1 style="color: #1e293b; margin-bottom: 30px; font-size: 28px;">📝 工作任务清单</h1>
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
                        <h3 style="color: #475569; margin-bottom: 15px;">今日重点任务</h3>
                        <ul style="list-style: none; padding: 0;">
                            <li style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center;">
                                <input type="checkbox" checked style="margin-right: 10px;"> 完成Q4季度报告分析
                            </li>
                            <li style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center;">
                                <input type="checkbox" style="margin-right: 10px;"> 整理客户反馈数据
                            </li>
                            <li style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center;">
                                <input type="checkbox" style="margin-right: 10px;"> 准备周例会材料
                            </li>
                            <li style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center;">
                                <input type="checkbox" style="margin-right: 10px;"> 更新项目进度文档
                            </li>
                            <li style="padding: 10px 0; display: flex; align-items: center;">
                                <input type="checkbox" style="margin-right: 10px;"> 回复重要邮件
                            </li>
                        </ul>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="color: #475569; margin-bottom: 15px;">📊 本周数据统计</h3>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                            <div style="text-align: center; padding: 15px; background: #f1f5f9; border-radius: 6px;">
                                <div style="font-size: 24px; font-weight: bold; color: #0ea5e9;">87%</div>
                                <div style="font-size: 12px; color: #64748b;">任务完成率</div>
                            </div>
                            <div style="text-align: center; padding: 15px; background: #f1f5f9; border-radius: 6px;">
                                <div style="font-size: 24px; font-weight: bold; color: #10b981;">23</div>
                                <div style="font-size: 12px; color: #64748b;">处理文档数</div>
                            </div>
                            <div style="text-align: center; padding: 15px; background: #f1f5f9; border-radius: 6px;">
                                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">4.2h</div>
                                <div style="font-size: 12px; color: #64748b;">平均专注时长</div>
                            </div>
                        </div>
                    </div>
                </div>
            `
        };
        
        this.originalContent = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
        this.updateUI();
        this.applyTheme(this.currentTheme);
        this.startParticleEffect();
        
        // 如果有保存的设置，自动开始计算
        if (this.settings.salaryAmount && this.settings.salaryAmount > 0) {
            this.calculateHourlyRate();
            this.startEarningsCalculation();
        }
    }

    bindEvents() {
        // 设置按钮
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showModal('settingsModal');
        });

        // 主题切换
        document.getElementById('themeBtn').addEventListener('click', () => {
            this.cycleTheme();
        });

        // 音效切换
        document.getElementById('soundBtn').addEventListener('click', () => {
            this.toggleSound();
        });

        // 测试庆祝效果
        document.getElementById('testCelebrationBtn').addEventListener('click', () => {
            this.testCelebration();
        });

        // 老板键
        document.getElementById('bossKey').addEventListener('click', () => {
            this.toggleBossMode();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isInputFocused()) {
                e.preventDefault();
                this.toggleBossMode();
            }
        });

        // 设置模态框
        document.getElementById('closeSettings').addEventListener('click', () => {
            this.hideModal('settingsModal');
        });

        // 保存设置
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        // 重置设置
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });

        // 清除数据
        document.getElementById('clearData').addEventListener('click', () => {
            this.clearAllData();
        });

        // 模态框外部点击关闭
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal('settingsModal');
            }
        });

        // 薪资类型变化时更新界面
        document.getElementById('salaryType').addEventListener('change', () => {
            this.updateSalaryInputLabel();
        });
    }

    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT' || activeElement.tagName === 'TEXTAREA');
    }

    loadSettings() {
        const defaultSettings = {
            salaryType: 'monthly',
            salaryAmount: 0,
            workDays: 5,
            workHours: 8,
            startTime: '09:00',
            endTime: '18:00',
            theme: 'money',
            soundEnabled: true
        };

        try {
            const saved = localStorage.getItem('salaryJumpSettings');
            this.settings = saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
            this.currentTheme = this.settings.theme || 'money';
            this.soundEnabled = this.settings.soundEnabled !== false;
        } catch (error) {
            console.error('加载设置失败:', error);
            this.settings = defaultSettings;
        }

        return this.settings;
    }

    saveSettings() {
        try {
            const formData = {
                salaryType: document.getElementById('salaryType').value,
                salaryAmount: parseFloat(document.getElementById('salaryAmount').value) || 0,
                workDays: parseInt(document.getElementById('workDays').value) || 5,
                workHours: parseFloat(document.getElementById('workHours').value) || 8,
                startTime: document.getElementById('startTime').value,
                endTime: document.getElementById('endTime').value,
                theme: document.getElementById('theme').value,
                soundEnabled: this.soundEnabled
            };

            this.settings = formData;
            localStorage.setItem('salaryJumpSettings', JSON.stringify(this.settings));
            
            this.calculateHourlyRate();
            this.updateUI();
            this.applyTheme(this.settings.theme);
            this.hideModal('settingsModal');
            
            // 重新开始计算
            if (this.settings.salaryAmount > 0) {
                this.startEarningsCalculation();
            }

            this.showNotification('设置已保存！', 'success');
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showNotification('保存失败，请重试', 'error');
        }
    }

    resetSettings() {
        if (confirm('确定要重置所有设置吗？')) {
            const defaultSettings = {
                salaryType: 'monthly',
                salaryAmount: 0,
                workDays: 5,
                workHours: 8,
                startTime: '09:00',
                endTime: '18:00',
                theme: 'money',
                soundEnabled: true
            };
            
            this.settings = defaultSettings;
            this.updateSettingsForm();
            this.showNotification('设置已重置', 'info');
        }
    }

    clearAllData() {
        if (confirm('确定要清除所有数据吗？这将删除所有设置和历史记录。')) {
            try {
                localStorage.removeItem('salaryJumpSettings');
                localStorage.removeItem('salaryJumpHistory');
                location.reload();
            } catch (error) {
                console.error('清除数据失败:', error);
                this.showNotification('清除失败，请重试', 'error');
            }
        }
    }

    updateSettingsForm() {
        document.getElementById('salaryType').value = this.settings.salaryType;
        document.getElementById('salaryAmount').value = this.settings.salaryAmount || '';
        document.getElementById('workDays').value = this.settings.workDays;
        document.getElementById('workHours').value = this.settings.workHours;
        document.getElementById('startTime').value = this.settings.startTime;
        document.getElementById('endTime').value = this.settings.endTime;
        document.getElementById('theme').value = this.settings.theme;
        this.updateSalaryInputLabel();
    }

    updateSalaryInputLabel() {
        const salaryType = document.getElementById('salaryType').value;
        const input = document.getElementById('salaryAmount');
        
        switch (salaryType) {
            case 'yearly':
                input.placeholder = '请输入年薪（如：120000）';
                break;
            case 'monthly':
                input.placeholder = '请输入月薪（如：10000）';
                break;
            case 'hourly':
                input.placeholder = '请输入时薪（如：50）';
                break;
        }
    }

    calculateHourlyRate() {
        const { salaryType, salaryAmount, workDays, workHours } = this.settings;
        
        if (!salaryAmount || salaryAmount <= 0) {
            this.hourlyRate = 0;
            return;
        }

        switch (salaryType) {
            case 'yearly':
                // 年薪转时薪：年薪 / (工作周数 * 每周工作天数 * 每天工作小时数)
                this.hourlyRate = salaryAmount / (52 * workDays * workHours);
                break;
            case 'monthly':
                // 月薪转时薪：月薪 / (每月工作天数 * 每天工作小时数)
                const monthlyWorkDays = workDays * 4.33; // 平均每月工作天数
                this.hourlyRate = salaryAmount / (monthlyWorkDays * workHours);
                break;
            case 'hourly':
                this.hourlyRate = salaryAmount;
                break;
            default:
                this.hourlyRate = 0;
        }
    }

    startEarningsCalculation() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.isRunning = true;
        this.achievedMilestones = [];
        
        // 计算今天的上班时间
        this.todayStartTime = this.getTodayWorkStartTime();
        
        // 初始计算当前收入
        this.updateEarnings();

        this.updateInterval = setInterval(() => {
            this.updateEarnings();
        }, 100); // 每100ms更新一次，确保流畅
        
        // 启动每分钟庆祝
        this.startMinuteCelebration();
    }

    getTodayWorkStartTime() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [hours, minutes] = this.settings.startTime.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return today;
    }

    getTodayWorkEndTime() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [hours, minutes] = this.settings.endTime.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return today;
    }

    getWorkedHoursToday() {
        const now = new Date();
        const startTime = this.todayStartTime;
        const endTime = this.getTodayWorkEndTime();
        
        // 如果当前时间在上班时间之前，返回0
        if (now < startTime) {
            return 0;
        }
        
        // 如果当前时间在下班时间之后，返回完整工作时长
        if (now > endTime) {
            return this.settings.workHours;
        }
        
        // 计算从上班时间到现在的小时数
        const workedMilliseconds = now - startTime;
        const workedHours = workedMilliseconds / (1000 * 60 * 60);
        
        // 不超过设定的每日工作时长
        return Math.min(workedHours, this.settings.workHours);
    }

    startMinuteCelebration() {
        if (this.celebrationInterval) {
            clearInterval(this.celebrationInterval);
        }
        
        // 每5秒检查一次是否需要庆祝（更精确）
        this.celebrationInterval = setInterval(() => {
            this.checkMinuteCelebration();
        }, 5000);
    }

    checkMinuteCelebration() {
        if (!this.isRunning || this.isBossMode || this.hourlyRate <= 0) return;
        
        const workedHours = this.getWorkedHoursToday();
        const currentMinutes = Math.floor(workedHours * 60);
        const lastMinutes = this.lastCelebrationTime;
        
        // 每完成一分钟就庆祝
        if (currentMinutes > lastMinutes && currentMinutes > 0) {
            this.lastCelebrationTime = currentMinutes;
            this.minuteCelebration(currentMinutes);
        }
    }

    minuteCelebration(minutes) {
        // 创建庆祝文案
        const celebrationMessages = [
            `🎉 恭喜！又赚了一分钟的钱！`,
            `💰 时间就是金钱！第${minutes}分钟达成！`,
            `🚀 打工人威武！继续加油！`,
            `⭐ 又一分钟的财富入账！`,
            `🎊 时间在流逝，钱包在增长！`,
            `💎 每一分钟都是宝贵的财富！`,
            `🔥 摸鱼达人！第${minutes}分钟成就解锁！`,
            `🎯 一分钟一分钟，积少成多！`
        ];
        
        const message = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
        
        // 显示庆祝消息
        this.showCelebrationMessage(message);
        
        // 创建撒花效果
        this.createConfetti();
        
        // 创建烟花效果
        this.createFireworks();
        
        // 播放庆祝音效
        this.playSound('celebration');
        
        // 页面震动效果
        this.addPageShake();
        
        // 特殊分钟数的额外庆祝
        if (minutes % 10 === 0) {
            setTimeout(() => {
                this.specialCelebration(minutes);
            }, 1000);
        }
    }

    showCelebrationMessage(message) {
        const celebration = document.createElement('div');
        celebration.className = 'minute-celebration';
        celebration.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-icon">🎉</div>
                <div class="celebration-text">${message}</div>
            </div>
        `;
        
        document.body.appendChild(celebration);
        
        // 3秒后移除
        setTimeout(() => {
            if (document.body.contains(celebration)) {
                celebration.style.animation = 'celebrationOut 0.5s ease-in forwards';
                setTimeout(() => {
                    if (document.body.contains(celebration)) {
                        document.body.removeChild(celebration);
                    }
                }, 500);
            }
        }, 3000);
    }

    createConfetti() {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);
        
        // 创建50个撒花粒子
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createConfettiPiece(confettiContainer);
            }, i * 20); // 错开时间创建
        }
        
        // 5秒后清理
        setTimeout(() => {
            if (document.body.contains(confettiContainer)) {
                document.body.removeChild(confettiContainer);
            }
        }, 5000);
    }

    createConfettiPiece(container) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        
        // 随机颜色
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // 随机形状
        const shapes = ['💰', '💵', '🎉', '⭐', '💎', '🎊', '🔥', '💫'];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        
        confetti.textContent = shape;
        confetti.style.color = color;
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        
        container.appendChild(confetti);
    }

    createFireworks() {
        const fireworksContainer = document.createElement('div');
        fireworksContainer.className = 'fireworks-container';
        document.body.appendChild(fireworksContainer);
        
        // 创建3个烟花
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createFirework(fireworksContainer);
            }, i * 500);
        }
        
        // 3秒后清理
        setTimeout(() => {
            if (document.body.contains(fireworksContainer)) {
                document.body.removeChild(fireworksContainer);
            }
        }, 3000);
    }

    createFirework(container) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = Math.random() * 80 + 10 + 'vw';
        firework.style.top = Math.random() * 50 + 20 + 'vh';
        
        // 创建爆炸粒子
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            particle.style.transform = `rotate(${i * 30}deg)`;
            firework.appendChild(particle);
        }
        
        container.appendChild(firework);
    }

    addPageShake() {
        document.body.style.animation = 'pageShake 0.5s ease-in-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 500);
    }

    specialCelebration(minutes) {
        const specialMessages = [
            `🏆 哇！第${minutes}分钟！十分钟大关突破！`,
            `👑 ${minutes}分钟达成！你就是摸鱼之王！`,
            `🌟 第${minutes}分钟里程碑！奖励双倍撒花！`,
            `🎖️ ${minutes}分钟成就解锁！专业打工人认证！`
        ];
        
        const message = specialMessages[Math.floor(Math.random() * specialMessages.length)];
        this.showCelebrationMessage(message);
        
        // 双倍撒花
        setTimeout(() => this.createConfetti(), 200);
        setTimeout(() => this.createConfetti(), 400);
    }

    clearAllCelebrations() {
        // 清理所有庆祝相关的DOM元素
        const celebrations = document.querySelectorAll('.minute-celebration, .confetti-container, .fireworks-container');
        celebrations.forEach(element => {
            if (document.body.contains(element)) {
                document.body.removeChild(element);
            }
        });
        
        // 停止页面震动
        document.body.style.animation = '';
    }

    testCelebration() {
        if (this.isBossMode) return;
        
        // 模拟一个随机分钟数的庆祝
        const testMinutes = Math.floor(Math.random() * 30) + 1;
        this.minuteCelebration(testMinutes);
    }

    updateEarnings() {
        if (!this.isRunning || this.hourlyRate <= 0) return;

        // 计算今天已工作的小时数
        const workedHours = this.getWorkedHoursToday();
        const newEarnings = this.hourlyRate * workedHours;
        
        // 检查里程碑
        this.checkMilestones(this.currentEarnings, newEarnings);
        
        this.currentEarnings = newEarnings;
        this.updateEarningsDisplay();
        this.updateStats();
    }

    updateEarningsDisplay() {
        const earningsElement = document.getElementById('earningsAmount');
        const formattedAmount = `¥${this.currentEarnings.toFixed(2)}`;
        
        if (earningsElement.textContent !== formattedAmount) {
            earningsElement.textContent = formattedAmount;
            this.addMoneyEffect();
        }
    }

    addMoneyEffect() {
        const container = document.getElementById('earningsAnimation');
        const effect = document.createElement('div');
        
        // 根据主题选择不同的效果
        switch (this.currentTheme) {
            case 'money':
                effect.className = 'coin-effect';
                effect.textContent = '💰';
                break;
            case 'cash':
                effect.className = 'cash-effect';
                effect.textContent = '💵';
                break;
            case 'digital':
                effect.className = 'coin-effect';
                effect.textContent = '₿';
                break;
            case 'retro':
                effect.className = 'coin-effect';
                effect.textContent = '¥';
                break;
            default:
                effect.className = 'coin-effect';
                effect.textContent = '+';
        }
        
        // 随机位置
        effect.style.left = Math.random() * 100 + 'px';
        effect.style.top = Math.random() * 50 + 'px';
        
        container.appendChild(effect);
        
        // 播放音效
        this.playSound();
        
        // 移除效果
        setTimeout(() => {
            if (container.contains(effect)) {
                container.removeChild(effect);
            }
        }, 1000);
    }

    checkMilestones(oldEarnings, newEarnings) {
        for (const milestone of this.milestones) {
            if (oldEarnings < milestone && newEarnings >= milestone && !this.achievedMilestones.includes(milestone)) {
                this.achievedMilestones.push(milestone);
                this.showMilestone(milestone);
            }
        }
    }

    showMilestone(amount) {
        const milestone = document.getElementById('milestone');
        const milestoneAmount = document.getElementById('milestoneAmount');
        
        milestoneAmount.textContent = amount;
        milestone.style.display = 'block';
        
        // 播放特殊音效
        this.playSound('celebration');
        
        setTimeout(() => {
            milestone.style.display = 'none';
        }, 3000);
    }

    updateStats() {
        if (!this.todayStartTime) return;

        // 计算今天已工作的小时数
        const workedHours = this.getWorkedHoursToday();
        
        // 工作时长显示
        const totalSeconds = Math.floor(workedHours * 3600);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        document.getElementById('workTime').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 时薪
        document.getElementById('hourlyRate').textContent = `¥${this.hourlyRate.toFixed(0)}/h`;
        
        // 今日目标
        const dailyTarget = this.hourlyRate * this.settings.workHours;
        document.getElementById('dailyTarget').textContent = `¥${dailyTarget.toFixed(0)}`;
        
        // 效率
        const expectedHours = this.settings.workHours;
        const efficiency = Math.min(100, (workedHours / expectedHours) * 100);
        document.getElementById('efficiency').textContent = `${efficiency.toFixed(0)}%`;
        
        // 显示工作状态
        this.updateWorkStatus();
    }

    updateWorkStatus() {
        const now = new Date();
        const startTime = this.getTodayWorkStartTime();
        const endTime = this.getTodayWorkEndTime();
        
        let statusText = '';
        if (now < startTime) {
            const timeToWork = startTime - now;
            const hours = Math.floor(timeToWork / (1000 * 60 * 60));
            const minutes = Math.floor((timeToWork % (1000 * 60 * 60)) / (1000 * 60));
            if (hours > 0) {
                statusText = `还有${hours}小时${minutes}分钟上班`;
            } else {
                statusText = `还有${minutes}分钟上班`;
            }
        } else if (now > endTime) {
            statusText = '今日工作已结束 🎉';
        } else {
            const timeToEnd = endTime - now;
            const hours = Math.floor(timeToEnd / (1000 * 60 * 60));
            const minutes = Math.floor((timeToEnd % (1000 * 60 * 60)) / (1000 * 60));
            if (hours > 0) {
                statusText = `还有${hours}小时${minutes}分钟下班 💪`;
            } else {
                statusText = `还有${minutes}分钟下班 💪`;
            }
        }
        
        // 更新页面上的工作状态显示
        const statusElement = document.getElementById('workStatus');
        if (statusElement) {
            statusElement.textContent = statusText;
        }
    }

    updateUI() {
        this.updateSettingsForm();
        this.updateEarningsDisplay();
        this.updateStats();
    }

    playSound(type = 'coin') {
        if (!this.soundEnabled) return;
        
        try {
            const audio = type === 'celebration' ? document.getElementById('cashSound') : document.getElementById('coinSound');
            if (audio) {
                audio.currentTime = 0;
                audio.volume = 0.1; // 很小的音量
                audio.play().catch(e => console.log('音效播放失败:', e));
            }
        } catch (error) {
            console.log('音效播放错误:', error);
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const btn = document.getElementById('soundBtn');
        btn.textContent = this.soundEnabled ? '🔊' : '🔕';
        btn.title = this.soundEnabled ? '关闭音效' : '开启音效';
        
        // 保存设置
        this.settings.soundEnabled = this.soundEnabled;
        localStorage.setItem('salaryJumpSettings', JSON.stringify(this.settings));
    }

    cycleTheme() {
        const themes = ['money', 'cash', 'digital', 'minimal', 'retro'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        this.applyTheme(nextTheme);
        this.currentTheme = nextTheme;
        
        // 保存主题设置
        this.settings.theme = nextTheme;
        localStorage.setItem('salaryJumpSettings', JSON.stringify(this.settings));
    }

    applyTheme(theme) {
        const body = document.body;
        
        // 移除所有主题类
        body.classList.remove('theme-money', 'theme-cash', 'theme-digital', 'theme-minimal', 'theme-retro');
        
        // 添加新主题类
        body.classList.add(`theme-${theme}`);
        
        this.currentTheme = theme;
        
        // 更新主题选择器
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.value = theme;
        }
    }

    startParticleEffect() {
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
        }

        this.particleInterval = setInterval(() => {
            this.createParticle();
        }, 2000); // 每2秒创建一个粒子
    }

    createParticle() {
        if (this.isBossMode) return; // 老板模式下不显示粒子

        const particles = document.getElementById('particles');
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // 根据主题选择粒子内容
        const particleContent = {
            money: ['💰', '🪙', '💴'],
            cash: ['💵', '💶', '💷'],
            digital: ['₿', '🔗', '💎'],
            minimal: ['•', '○', '◦'],
            retro: ['¥', '$', '€']
        };
        
        const content = particleContent[this.currentTheme] || particleContent.money;
        particle.textContent = content[Math.floor(Math.random() * content.length)];
        
        // 随机位置
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.fontSize = (Math.random() * 10 + 15) + 'px';
        
        particles.appendChild(particle);
        
        // 8秒后移除粒子
        setTimeout(() => {
            if (particles.contains(particle)) {
                particles.removeChild(particle);
            }
        }, 8000);
    }

    toggleBossMode() {
        if (this.isBossMode) {
            this.exitBossMode();
        } else {
            this.enterBossMode();
        }
    }

    enterBossMode() {
        this.isBossMode = true;
        
        // 清理所有庆祝效果
        this.clearAllCelebrations();
        
        // 保存原始内容
        this.originalContent = document.body.innerHTML;
        
        // 替换为伪装内容
        document.body.innerHTML = this.fakeContent.todoList;
        
        // 添加退出按钮（隐藏）
        const exitBtn = document.createElement('div');
        exitBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 20px;
            height: 20px;
            background: transparent;
            cursor: pointer;
            z-index: 10000;
        `;
        exitBtn.addEventListener('click', () => this.exitBossMode());
        exitBtn.addEventListener('dblclick', () => this.exitBossMode());
        document.body.appendChild(exitBtn);

        // 添加键盘监听
        document.addEventListener('keydown', this.bossKeyHandler);
    }

    exitBossMode() {
        this.isBossMode = false;
        
        // 移除键盘监听
        document.removeEventListener('keydown', this.bossKeyHandler);
        
        // 恢复原始内容
        if (this.originalContent) {
            document.body.innerHTML = this.originalContent;
            this.originalContent = null;
            
            // 重新初始化
            this.init();
        }
    }

    bossKeyHandler = (e) => {
        if (e.code === 'Space' || e.code === 'Escape') {
            e.preventDefault();
            this.exitBossMode();
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            font-size: 14px;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // 自动移除
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new SalaryJump();
});

// PWA支持
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
} 