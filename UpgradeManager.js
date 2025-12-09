export class UpgradeManager {
    constructor(game) {
        this.game = game;
        this.upgrades = {
            hull: { level: 1, maxLevel: 10, baseCost: 100, costMult: 1.5, name: 'Hull Plating' },
            engine: { level: 1, maxLevel: 10, baseCost: 150, costMult: 1.5, name: 'Ion Thrusters' },
            cannon: { level: 1, maxLevel: 10, baseCost: 200, costMult: 1.5, name: 'Plasma Cannon' },
            cooldown: { level: 1, maxLevel: 10, baseCost: 250, costMult: 1.5, name: 'Cooling System' },
            ricochet: { level: 0, maxLevel: 5, baseCost: 500, costMult: 2.0, name: 'Ricochet' },
            multishot: { level: 0, maxLevel: 5, baseCost: 1000, costMult: 2.0, name: 'Multishot' },
            critChance: { level: 0, maxLevel: 10, baseCost: 300, costMult: 1.5, name: 'Crit Chance' },
            allDamage: { level: 0, maxLevel: 10, baseCost: 800, costMult: 1.5, name: 'Amplifier' }
        };

        this.load();
    }

    getCost(type) {
        const upgrade = this.upgrades[type];
        if (!upgrade || upgrade.level >= upgrade.maxLevel) return Infinity;
        // Ricochet, Multishot, etc start at level 0, so cost formula needs to handle that.
        // Standard formula: base * mult^(level-1). For level 0 start, we want base cost at level 0.
        // So if level is 0, exponent should be 0.
        // Let's standardize: base * mult^(level - startLevel)
        // Hull starts at 1. Ricochet starts at 0.
        // If hull level 1 -> cost for level 2 is base * mult^0? No, usually cost to buy level 1 is base.
        // But we start at level 1. So cost to buy level 2 is base * mult^0?
        // Let's stick to: base * mult^(currentLevel - (startsAt1 ? 1 : 0))

        let exponent = upgrade.level;
        if (['hull', 'engine', 'cannon', 'cooldown'].includes(type)) {
            exponent -= 1;
        }

        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, exponent));
    }

    buyUpgrade(type) {
        const cost = this.getCost(type);
        if (this.game.currency >= cost && cost !== Infinity) {
            this.game.currency -= cost;
            this.upgrades[type].level++;
            this.save();
            this.game.saveProgress();
            return true;
        }
        return false;
    }

    getLevel(type) {
        return this.upgrades[type] ? this.upgrades[type].level : 0;
    }

    getValue(type) {
        const level = this.upgrades[type].level;
        switch (type) {
            case 'hull': return 100 + (level - 1) * 20;
            case 'engine': return 400 + (level - 1) * 50;
            case 'cannon': return 10 + (level - 1) * 5;
            case 'cooldown': return Math.max(100, 500 - (level - 1) * 40);
            case 'ricochet': return level; // Number of bounces
            case 'multishot': return level; // 0 = single, 1 = double, 2 = triple...
            case 'critChance': return level * 0.05; // 5% per level
            case 'allDamage': return 1 + (level * 0.1); // +10% per level
            default: return 0;
        }
    }

    save() {
        const data = {};
        for (const key in this.upgrades) {
            data[key] = this.upgrades[key].level;
        }
        localStorage.setItem('alien_hunter_upgrades', JSON.stringify(data));
    }

    load() {
        const data = JSON.parse(localStorage.getItem('alien_hunter_upgrades'));
        if (data) {
            for (const key in data) {
                if (this.upgrades[key]) {
                    this.upgrades[key].level = data[key];
                }
            }
        }
    }
}
