// 薪跳 - 浏览器插件版本
// 主应用类
class SalaryJumpPopup {
    constructor() {
        this.startTime = null;
        this.currentEarnings = 0;
        this.hourlyRate = 0;
        this.settings = {};
        this.isRunning = false;
        this.updateInterval = null;
        this.particleInterval = null;
        this.celebrationInterval = null;
        this.soundEnabled = true;
        this.currentTheme = 'money';
        this.milestones = [50, 100, 200, 500, 1000, 2000, 5000];
        this.achievedMilestones = [];
        this.lastCelebrationTime = 0;
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.bindEvents();
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

        // 老板键 (插件版本只关闭窗口)
        document.getElementById('bossKey').addEventListener('click', () => {
            window.close();
        });

        // 打开完整页面
        document.getElementById('openFullPage').addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
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

    async loadSettings() {
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
            if (chrome && chrome.storage) {
                const result = await chrome.storage.local.get('salaryJumpSettings');
                this.settings = result.salaryJumpSettings ? 
                    { ...defaultSettings, ...result.salaryJumpSettings } : defaultSettings;
            } else {
                // 回退到localStorage
                const saved = localStorage.getItem('salaryJumpSettings');
                this.settings = saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
            }
            
            this.currentTheme = this.settings.theme || 'money';
            this.soundEnabled = this.settings.soundEnabled !== false;
        } catch (error) {
            console.error('加载设置失败:', error);
            this.settings = defaultSettings;
        }

        return this.settings;
    }

    async saveSettings() {
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
            
            if (chrome && chrome.storage) {
                await chrome.storage.local.set({ salaryJumpSettings: this.settings });
            } else {
                localStorage.setItem('salaryJumpSettings', JSON.stringify(this.settings));
            }
            
            this.calculateHourlyRate();
            this.updateUI();
            this.applyTheme(this.settings.theme);
            this.hideModal('settingsModal');

            // 显示保存成功消息
            this.showNotification('设置保存成功！', 'success');
            
            // 重新开始计算
            this.startEarningsCalculation();
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showNotification('保存设置失败', 'error');
        }
    }

    resetSettings() {
        document.getElementById('salaryType').value = 'monthly';
        document.getElementById('salaryAmount').value = '';
        document.getElementById('workDays').value = '5';
        document.getElementById('workHours').value = '8';
        document.getElementById('startTime').value = '09:00';
        document.getElementById('endTime').value = '18:00';
        document.getElementById('theme').value = 'money';
        this.updateSalaryInputLabel();
    }

    updateSettingsForm() {
        document.getElementById('salaryType').value = this.settings.salaryType || 'monthly';
        document.getElementById('salaryAmount').value = this.settings.salaryAmount || '';
        document.getElementById('workDays').value = this.settings.workDays || 5;
        document.getElementById('workHours').value = this.settings.workHours || 8;
        document.getElementById('startTime').value = this.settings.startTime || '09:00';
        document.getElementById('endTime').value = this.settings.endTime || '18:00';
        document.getElementById('theme').value = this.settings.theme || 'money';
        this.updateSalaryInputLabel();
    }

    updateSalaryInputLabel() {
        const salaryType = document.getElementById('salaryType').value;
        const amountInput = document.getElementById('salaryAmount');
        
        switch(salaryType) {
            case 'yearly':
                amountInput.placeholder = '例如：120000（年薪）';
                break;
            case 'monthly':
                amountInput.placeholder = '例如：10000（月薪）';
                break;
            case 'hourly':
                amountInput.placeholder = '例如：50（时薪）';
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
                // 年薪 ÷ (每周工作天数 × 52周) ÷ 每日工作小时数
                this.hourlyRate = salaryAmount / (workDays * 52) / workHours;
                break;
            case 'monthly':
                // 月薪 ÷ (每周工作天数 × 4.33周) ÷ 每日工作小时数
                this.hourlyRate = salaryAmount / (workDays * 4.33) / workHours;
                break;
            case 'hourly':
                this.hourlyRate = salaryAmount;
                break;
            default:
                this.hourlyRate = 0;
        }
    }

    startEarningsCalculation() {
        // 清除现有的定时器
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.celebrationInterval) {
            clearInterval(this.celebrationInterval);
        }

        this.isRunning = true;
        this.lastCelebrationTime = Date.now();
        
        // 每秒更新一次
        this.updateInterval = setInterval(() => {
            this.updateEarnings();
        }, 1000);

        // 开始分钟庆祝检查
        this.startMinuteCelebration();
    }

    getTodayWorkStartTime() {
        const today = new Date();
        const [hours, minutes] = this.settings.startTime.split(':');
        const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                                 parseInt(hours), parseInt(minutes), 0);
        return startTime;
    }

    getTodayWorkEndTime() {
        const today = new Date();
        const [hours, minutes] = this.settings.endTime.split(':');
        const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                                parseInt(hours), parseInt(minutes), 0);
        return endTime;
    }

    getWorkedHoursToday() {
        const now = new Date();
        const startTime = this.getTodayWorkStartTime();
        const endTime = this.getTodayWorkEndTime();
        
        // 如果当前时间在上班前
        if (now < startTime) {
            return 0;
        }
        
        // 如果当前时间在下班后
        if (now > endTime) {
            return (endTime - startTime) / (1000 * 60 * 60); // 完整工作时长
        }
        
        // 如果在工作时间内
        return (now - startTime) / (1000 * 60 * 60);
    }

    startMinuteCelebration() {
        this.celebrationInterval = setInterval(() => {
            this.checkMinuteCelebration();
        }, 1000);
    }

    checkMinuteCelebration() {
        const now = Date.now();
        const timeSinceLastCelebration = now - this.lastCelebrationTime;
        
        // 每60秒庆祝一次
        if (timeSinceLastCelebration >= 60000) {
            const workedMinutes = Math.floor(this.getWorkedHoursToday() * 60);
            if (workedMinutes > 0) {
                this.minuteCelebration(workedMinutes);
                this.lastCelebrationTime = now;
            }
        }
    }

    minuteCelebration(minutes) {
        const messages = [
            `又熬过了一分钟！已工作 ${minutes} 分钟 🎉`,
            `时间就是金钱！第 ${minutes} 分钟完成 💰`,
            `坚持就是胜利！${minutes} 分钟达成 ✨`,
            `每一分钟都在赚钱！${minutes} 分钟了 🚀`,
            `工作使我快乐！第 ${minutes} 分钟 😄`,
            `摸鱼也是技术活！${minutes} 分钟了 🐟`,
            `时间就是生命！${minutes} 分钟完成 ⏰`,
            `又是充实的一分钟！${minutes} 分钟 💪`
        ];

        const milestoneMessages = [
            `里程碑达成！已工作 ${minutes} 分钟 🏆`,
            `重大突破！第 ${minutes} 分钟完成 🎯`,
            `超级成就！${minutes} 分钟达成 🌟`,
            `传奇时刻！${minutes} 分钟了 👑`
        ];

        // 每10分钟使用特殊消息
        const isSpecialMoment = minutes % 10 === 0;
        const messageList = isSpecialMoment ? milestoneMessages : messages;
        const message = messageList[Math.floor(Math.random() * messageList.length)];

        this.showCelebrationMessage(message);
        this.createConfetti();
        this.createFireworks();
        this.addPageShake();

        // 特殊里程碑双倍效果
        if (isSpecialMoment) {
            setTimeout(() => {
                this.specialCelebration(minutes);
            }, 500);
        }

        // 播放音效
        if (this.soundEnabled) {
            this.playSound('celebration');
        }
    }

    showCelebrationMessage(message) {
        // 创建临时消息元素
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #FFD700, #FFA500);
            color: #333;
            padding: 12px 20px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 12px;
            z-index: 4000;
            box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
            animation: celebrationMessagePop 3s ease-out forwards;
            text-align: center;
            max-width: 300px;
        `;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);

        // 3秒后删除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    createConfetti() {
        const container = document.getElementById('confetti-container');
        if (!container) return;

        const emojis = ['🎉', '🎊', '✨', '💰', '🌟', '💎', '🎈', '🎁', '🏆', '🎯'];
        
        // 创建50个粒子
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createConfettiPiece(container, emojis);
            }, i * 20);
        }
    }

    createConfettiPiece(container, emojis) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.fontSize = (Math.random() * 8 + 12) + 'px';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        
        container.appendChild(confetti);
        
        // 动画结束后删除
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 4000);
    }

    createFireworks() {
        const container = document.getElementById('fireworks-container');
        if (!container) return;

        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
        
        // 创建3发烟花
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createFirework(container, colors);
            }, i * 200);
        }
    }

    createFirework(container, colors) {
        const centerX = Math.random() * 300 + 50;
        const centerY = Math.random() * 200 + 100;
        
        // 创建爆炸粒子
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            
            container.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        }
    }

    addPageShake() {
        document.body.classList.add('shake');
        setTimeout(() => {
            document.body.classList.remove('shake');
        }, 500);
    }

    specialCelebration(minutes) {
        // 双倍庆祝效果
        this.createConfetti();
        this.createFireworks();
    }

    clearAllCelebrations() {
        // 清理所有庆祝效果
        const confettiContainer = document.getElementById('confetti-container');
        const fireworksContainer = document.getElementById('fireworks-container');
        
        if (confettiContainer) confettiContainer.innerHTML = '';
        if (fireworksContainer) fireworksContainer.innerHTML = '';
        
        // 移除页面效果
        document.body.classList.remove('shake');
        
        // 清理临时消息
        const messages = document.querySelectorAll('[style*="celebrationMessagePop"]');
        messages.forEach(msg => {
            if (msg.parentNode) {
                msg.parentNode.removeChild(msg);
            }
        });
    }

    testCelebration() {
        this.minuteCelebration(Math.floor(Math.random() * 100) + 1);
    }

    updateEarnings() {
        const workedHours = this.getWorkedHoursToday();
        const oldEarnings = this.currentEarnings;
        this.currentEarnings = workedHours * this.hourlyRate;
        
        this.updateEarningsDisplay();
        this.updateStats();
        this.updateWorkStatus();
        this.checkMilestones(oldEarnings, this.currentEarnings);
        this.addMoneyEffect();
    }

    updateEarningsDisplay() {
        const earningsEl = document.getElementById('earningsAmount');
        if (earningsEl) {
            earningsEl.textContent = `¥${this.currentEarnings.toFixed(2)}`;
        }
    }

    addMoneyEffect() {
        // 简化的金钱效果，适配插件窗口
        const animationEl = document.getElementById('earningsAnimation');
        if (!animationEl) return;

        if (this.currentEarnings > 0 && Math.random() < 0.1) {
            const effect = document.createElement('span');
            effect.textContent = '+¥' + (this.hourlyRate / 3600).toFixed(4);
            effect.style.cssText = `
                position: absolute;
                color: #00ff88;
                font-size: 10px;
                font-weight: bold;
                opacity: 1;
                transform: translateY(0);
                transition: all 1s ease-out;
                pointer-events: none;
            `;
            
            animationEl.appendChild(effect);
            
            setTimeout(() => {
                effect.style.transform = 'translateY(-20px)';
                effect.style.opacity = '0';
            }, 50);
            
            setTimeout(() => {
                if (effect.parentNode) {
                    effect.parentNode.removeChild(effect);
                }
            }, 1000);
        }
    }

    checkMilestones(oldEarnings, newEarnings) {
        for (const milestone of this.milestones) {
            if (oldEarnings < milestone && newEarnings >= milestone && 
                !this.achievedMilestones.includes(milestone)) {
                this.achievedMilestones.push(milestone);
                this.showMilestone(milestone);
                break;
            }
        }
    }

    showMilestone(amount) {
        const milestoneEl = document.getElementById('milestone');
        const amountEl = document.getElementById('milestoneAmount');
        
        if (milestoneEl && amountEl) {
            amountEl.textContent = amount;
            milestoneEl.style.display = 'block';
            
            setTimeout(() => {
                milestoneEl.style.display = 'none';
            }, 3000);
        }
    }

    updateStats() {
        const workedHours = this.getWorkedHoursToday();
        const hours = Math.floor(workedHours);
        const minutes = Math.floor((workedHours - hours) * 60);
        const seconds = Math.floor(((workedHours - hours) * 60 - minutes) * 60);
        
        document.getElementById('workTime').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('hourlyRate').textContent = `¥${this.hourlyRate.toFixed(0)}/h`;
        
        const dailyTarget = this.hourlyRate * this.settings.workHours;
        document.getElementById('dailyTarget').textContent = `¥${dailyTarget.toFixed(0)}`;
        
        const efficiency = dailyTarget > 0 ? (this.currentEarnings / dailyTarget) * 100 : 0;
        document.getElementById('efficiency').textContent = `${Math.min(efficiency, 100).toFixed(0)}%`;
    }

    updateWorkStatus() {
        const now = new Date();
        const startTime = this.getTodayWorkStartTime();
        const endTime = this.getTodayWorkEndTime();
        const statusEl = document.getElementById('workStatus');
        
        if (!statusEl) return;
        
        if (now < startTime) {
            const timeToWork = Math.ceil((startTime - now) / (1000 * 60));
            if (timeToWork > 60) {
                const hours = Math.floor(timeToWork / 60);
                const minutes = timeToWork % 60;
                statusEl.textContent = `还有 ${hours} 小时 ${minutes} 分钟上班`;
            } else {
                statusEl.textContent = `还有 ${timeToWork} 分钟上班`;
            }
        } else if (now > endTime) {
            statusEl.textContent = '今日工作已结束，辛苦了！';
        } else {
            const timeToEnd = Math.ceil((endTime - now) / (1000 * 60));
            if (timeToEnd > 60) {
                const hours = Math.floor(timeToEnd / 60);
                const minutes = timeToEnd % 60;
                statusEl.textContent = `还有 ${hours} 小时 ${minutes} 分钟下班`;
            } else {
                statusEl.textContent = `还有 ${timeToEnd} 分钟下班`;
            }
        }
    }

    updateUI() {
        this.updateSettingsForm();
        this.updateStats();
        this.updateEarningsDisplay();
        this.updateWorkStatus();
    }

    playSound(type = 'coin') {
        if (!this.soundEnabled) return;
        
        // 简化的音效，适配插件环境
        try {
            const audio = new Audio();
            if (type === 'celebration') {
                // 庆祝音效数据
                audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMgAzWX1Oy5ciMFl';
            } else {
                audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMgAzWX1Oy5ciMFl';
            }
            audio.volume = 0.3;
            audio.play().catch(() => {}); // 忽略播放错误
        } catch (error) {
            console.log('音效播放失败:', error);
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('soundBtn');
        if (soundBtn) {
            soundBtn.textContent = this.soundEnabled ? '🔊' : '🔕';
            soundBtn.title = this.soundEnabled ? '关闭音效' : '开启音效';
        }
    }

    cycleTheme() {
        const themes = ['money', 'cash', 'digital', 'minimal', 'retro'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.currentTheme = themes[nextIndex];
        this.applyTheme(this.currentTheme);
        
        // 更新设置并保存
        this.settings.theme = this.currentTheme;
        this.saveSettings();
    }

    applyTheme(theme) {
        // 移除所有主题类
        const themes = ['theme-money', 'theme-cash', 'theme-digital', 'theme-minimal', 'theme-retro'];
        themes.forEach(t => document.body.classList.remove(t));
        
        // 应用新主题
        document.body.classList.add(`theme-${theme}`);
        this.currentTheme = theme;
    }

    startParticleEffect() {
        this.particleInterval = setInterval(() => {
            this.createParticle();
        }, 500);
    }

    createParticle() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        // 限制粒子数量
        const existingParticles = particlesContainer.children.length;
        if (existingParticles > 20) return;

        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 3 + 's';
        particle.style.animationDuration = (Math.random() * 2 + 3) + 's';

        particlesContainer.appendChild(particle);

        // 动画结束后删除粒子
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 5000);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            this.updateSettingsForm();
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // 简单的通知实现
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 5000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        if (type === 'success') {
            notification.style.background = 'rgba(52, 199, 89, 0.9)';
            notification.style.color = 'white';
        } else if (type === 'error') {
            notification.style.background = 'rgba(255, 59, 48, 0.9)';
            notification.style.color = 'white';
        } else {
            notification.style.background = 'rgba(0, 122, 255, 0.9)';
            notification.style.color = 'white';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new SalaryJumpPopup();
});

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes celebrationMessagePop {
        0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
        20% { transform: translateX(-50%) scale(1.1); opacity: 1; }
        100% { transform: translateX(-50%) scale(1); opacity: 0; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style); 