export class LevelSystem {
    constructor(game) {
        this.game = game;
        this.level = 1;
        this.stage = 1;
        this.maxLevels = 5;
        this.maxStages = 5;

        this.enemiesDefeated = 0;
        this.enemiesRequired = 10; // Base requirement

        this.isLevelComplete = false;
        this.isBossStage = false;
    }

    reset() {
        this.level = 1;
        this.stage = 1;
        this.enemiesDefeated = 0;
        this.updateStageConfig();
    }

    enemyDefeated() {
        this.enemiesDefeated++;
        if (this.enemiesDefeated >= this.enemiesRequired) {
            this.completeStage();
        }
    }

    completeStage() {
        console.log(`Stage ${this.stage} Complete!`);
        this.stage++;
        this.enemiesDefeated = 0;

        if (this.stage > this.maxStages) {
            this.completeLevel();
        } else {
            this.updateStageConfig();
            this.game.ui.showStageAnnouncement(`STAGE ${this.stage}`);
        }
    }

    completeLevel() {
        console.log(`Level ${this.level} Complete!`);
        this.level++;
        this.stage = 1;

        if (this.level > this.maxLevels) {
            this.game.victory();
        } else {
            this.updateStageConfig();
            this.game.ui.showStageAnnouncement(`LEVEL ${this.level}`);
        }
    }

    updateStageConfig() {
        // Difficulty Curve
        this.enemiesRequired = 10 + (this.level - 1) * 5 + (this.stage - 1) * 2;
        this.enemiesDefeated = 0;

        // Spawn Interval decreases
        this.spawnInterval = Math.max(500, 2000 - (this.level - 1) * 200 - (this.stage - 1) * 100);

        // Enemy Stats
        this.enemyHealth = 30 + (this.level - 1) * 10 + (this.stage - 1) * 5;
        this.enemySpeed = 100 + (this.level - 1) * 10 + (this.stage - 1) * 5;
        this.enemyScore = 10 + (this.level - 1) * 5;

        // Boss Check
        this.isBossStage = (this.level % 5 === 0 && this.stage === 5);
        if (this.isBossStage) {
            this.enemiesRequired = 1; // Just the boss
            this.spawnInterval = 100000; // Don't spawn others automatically
        }

        console.log(`Level ${this.level} Stage ${this.stage} Config Updated`);

        // Notify UI
        if (this.game.ui) {
            this.game.ui.updateLevelInfo(this.level, this.stage, this.enemiesDefeated, this.enemiesRequired);
        }
    }

    getNextEnemyType() {
        if (this.isBossStage && this.enemiesDefeated === 0) {
            return 'boss';
        }

        // Elite Chance: 10% + 2% per level
        const eliteChance = 0.1 + (this.level * 0.02);
        if (Math.random() < eliteChance) {
            return 'elite';
        }

        return 'normal';
    }

    getProgress() {
        return {
            level: this.level,
            stage: this.stage,
            current: this.enemiesDefeated,
            required: this.enemiesRequired
        };
    }
}
