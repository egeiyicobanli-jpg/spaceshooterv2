export class UIManager {
    constructor(game) {
        this.game = game;

        // --- Element Retrieval with Safety Checks ---
        this.dashboard = this.getElement('cockpit-dashboard');
        this.scoreDisplay = this.getElement('score-display');
        this.currencyDisplay = this.getElement('currency-display');
        this.levelDisplay = this.getElement('level-display');
        this.progressDisplay = this.getElement('progress-display');

        // Bars
        this.healthBarFill = this.getElement('health-bar-fill');
        this.energyBarFill = this.getElement('energy-bar-fill');

        // Menu
        this.menuOverlay = this.getElement('menu-overlay');
        this.startBtn = this.getElement('start-btn');
        this.upgradeBtn = this.getElement('upgrade-btn');

        // Armory
        this.armoryOverlay = this.getElement('armory-overlay');
        this.armoryBackBtn = this.getElement('armory-back-btn');
        this.armoryCurrency = this.getElement('armory-currency');
        this.buyBtns = document.querySelectorAll('.buy-btn');

        // Announcements
        this.levelAnnouncement = this.getElement('level-announcement');

        console.log('UIManager initialized.');

        // --- Event Listeners ---
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => {
                console.log('Start Button Clicked');
                this.game.start();
                this.hideMenu();
                this.showDashboard();
            });
        }

        if (this.upgradeBtn) {
            this.upgradeBtn.addEventListener('click', () => {
                console.log('Upgrade Button Clicked');
                this.showArmory();
            });
        }

        if (this.armoryBackBtn) {
            this.armoryBackBtn.addEventListener('click', () => {
                this.hideArmory();
            });
        }

        this.buyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                console.log('Buy Upgrade Clicked:', type);
                if (this.game.upgrades.buyUpgrade(type)) {
                    this.updateArmory();
                } else {
                    e.target.style.borderColor = 'red';
                    setTimeout(() => e.target.style.borderColor = '#0ff', 200);
                }
            });
        });
    }

    getElement(id) {
        const el = document.getElementById(id);
        if (!el) {
            console.error(`UIManager: Element with ID '${id}' not found!`);
        }
        return el;
    }

    update() {
        if (!this.game.player) return;

        // Text Updates
        if (this.scoreDisplay) this.scoreDisplay.textContent = this.game.score.toString().padStart(6, '0');
        if (this.currencyDisplay) this.currencyDisplay.textContent = 'CREDITS: ' + this.game.currency;

        // Bar Updates
        if (this.healthBarFill) {
            const healthPct = Math.max(0, (this.game.player.health / this.game.player.maxHealth) * 100);
            this.healthBarFill.style.width = `${healthPct}%`;
        }

        if (this.energyBarFill) {
            const energyPct = Math.max(0, (this.game.player.energy / this.game.player.maxEnergy) * 100);
            this.energyBarFill.style.width = `${energyPct}%`;
        }
    }

    showMenu() {
        if (this.menuOverlay) this.menuOverlay.classList.remove('hidden');
        if (this.dashboard) this.dashboard.classList.add('hidden');
        if (this.armoryOverlay) this.armoryOverlay.classList.add('hidden');
    }

    hideMenu() {
        if (this.menuOverlay) this.menuOverlay.classList.add('hidden');
    }

    showArmory() {
        if (this.menuOverlay) this.menuOverlay.classList.add('hidden');
        if (this.armoryOverlay) this.armoryOverlay.classList.remove('hidden');
        this.updateArmory();
    }

    hideArmory() {
        if (this.armoryOverlay) this.armoryOverlay.classList.add('hidden');
        if (this.menuOverlay) this.menuOverlay.classList.remove('hidden');
    }

    updateArmory() {
        if (this.armoryCurrency) this.armoryCurrency.textContent = 'CREDITS: ' + this.game.currency;

        const types = ['hull', 'engine', 'cannon', 'cooldown', 'ricochet', 'multishot', 'critChance', 'allDamage'];
        types.forEach(type => {
            const level = this.game.upgrades.getLevel(type);
            const cost = this.game.upgrades.getCost(type);

            const lvlEl = document.getElementById(`lvl-${type}`);
            const costEl = document.getElementById(`cost-${type}`);

            if (lvlEl) lvlEl.textContent = level;
            if (costEl) costEl.textContent = cost === Infinity ? 'MAX' : cost;
        });
    }

    showDashboard() {
        if (this.dashboard) this.dashboard.classList.remove('hidden');
    }

    updateScore(score) {
        if (this.scoreDisplay) this.scoreDisplay.textContent = score.toString().padStart(6, '0');
    }

    updateCurrency(currency) {
        if (this.currencyDisplay) this.currencyDisplay.textContent = 'CREDITS: ' + currency;
    }

    updateHealth(health) {
        if (this.healthBarFill && this.game.player) {
            const healthPct = Math.max(0, (health / this.game.player.maxHealth) * 100);
            this.healthBarFill.style.width = `${healthPct}%`;
        }
    }

    updateLevelInfo(level, stage, current, required) {
        if (this.levelDisplay) this.levelDisplay.textContent = `LEVEL ${level} - STAGE ${stage}`;
        if (this.progressDisplay) this.progressDisplay.textContent = `ENEMIES: ${current}/${required}`;
    }

    showStageAnnouncement(text) {
        if (!this.levelAnnouncement) return;

        this.levelAnnouncement.textContent = text;
        this.levelAnnouncement.classList.remove('hidden');

        // Reset animation
        this.levelAnnouncement.style.animation = 'none';
        this.levelAnnouncement.offsetHeight; /* trigger reflow */
        this.levelAnnouncement.style.animation = 'fadeOut 3s forwards';

        setTimeout(() => {
            this.levelAnnouncement.classList.add('hidden');
        }, 3000);
    }

    showDamage(x, y, amount) {
        const el = document.createElement('div');
        el.textContent = amount;
        el.style.position = 'absolute';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = '#ff0000';
        el.style.fontSize = '20px';
        el.style.fontWeight = 'bold';
        el.style.textShadow = '0 0 5px #000';
        el.style.pointerEvents = 'none';
        el.style.transition = 'all 1s';
        el.style.zIndex = '2000';

        document.body.appendChild(el);

        // Animate
        requestAnimationFrame(() => {
            el.style.top = (y - 50) + 'px';
            el.style.opacity = '0';
        });

        setTimeout(() => {
            el.remove();
        }, 1000);
    }
}
