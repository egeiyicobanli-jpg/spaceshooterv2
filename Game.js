import * as THREE from './lib/three.module.js';
import { InputHandler } from './systems/InputHandler.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { Loot } from './entities/Loot.js';
import { UIManager } from './ui/UIManager.js';
import { Background } from './entities/Background.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { UpgradeManager } from './systems/UpgradeManager.js';
import { LevelSystem } from './systems/LevelSystem.js';

export class Game {
    constructor() {
        // Three.js Setup
        this.scene = new THREE.Scene();

        // Orthographic Camera for 2D-like view
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera = new THREE.OrthographicCamera(0, this.width, 0, this.height, -1000, 1000);
        this.camera.position.z = 100;

        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(100, 100, 100);
        this.scene.add(dirLight);

        this.lastTime = 0;
        this.isRunning = false;

        // Progression
        this.score = 0;
        this.currency = parseInt(localStorage.getItem('alien_hunter_currency')) || 0;

        // Systems
        this.input = new InputHandler(this.renderer.domElement);
        this.upgrades = new UpgradeManager(this);
        this.levelSystem = new LevelSystem(this);

        this.background = new Background(this);
        this.particles = new ParticleSystem(this);
        this.player = new Player(this);
        this.ui = new UIManager(this);

        this.projectiles = [];
        this.enemies = [];
        this.loot = [];
        this.enemySpawnTimer = 0;

        // Screen Shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Bind methods
        this.loop = this.loop.bind(this);

        // Initial UI Update
        this.ui.updateCurrency(this.currency);
        this.levelSystem.updateStageConfig(); // Initialize level config
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.camera.right = this.width;
        this.camera.top = 0;
        this.camera.bottom = this.height;

        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.renderer.setAnimationLoop(this.loop);
        console.log('Game Started');
    }

    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }

    saveProgress() {
        localStorage.setItem('alien_hunter_currency', this.currency);
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    victory() {
        this.isRunning = false;
        alert("YOU WIN! All levels cleared!");
        location.reload();
    }

    gameOver() {
        this.isRunning = false;
        console.log('Game Over');
        alert('Game Over! Score: ' + this.score);
        location.reload();
    }

    update(deltaTime) {
        this.background.update(deltaTime);
        this.player.update(deltaTime);
        this.particles.update(deltaTime);
        this.ui.update();

        // Screen Shake
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.set(rx, ry, 100);
            if (this.shakeDuration <= 0) {
                this.camera.position.set(0, 0, 100);
            }
        }

        // Projectiles
        this.projectiles.forEach(p => p.update(deltaTime));
        this.projectiles.forEach(p => {
            if (p.markedForDeletion) p.cleanup();
        });
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);

        // Loot
        this.loot.forEach(l => {
            l.update(deltaTime);
            const dx = l.x - this.player.x;
            const dy = l.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < l.radius + this.player.radius) {
                l.markedForDeletion = true;
                if (l.type === 'currency') {
                    this.currency += 10;
                    this.ui.updateCurrency(this.currency);
                    this.player.addCurrency(10);
                    this.saveProgress();
                }
            }
        });

        this.loot.forEach(l => {
            if (l.markedForDeletion) l.cleanup();
        });
        this.loot = this.loot.filter(l => !l.markedForDeletion);

        // Enemies
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer > this.levelSystem.spawnInterval) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        this.enemies.forEach(enemy => {
            enemy.update(deltaTime);
        });

        this.checkCollisions();

        this.enemies.forEach(e => {
            if (e.markedForDeletion) e.cleanup();
        });
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
    }

    spawnLoot(x, y) {
        // Loot removed
    }

    spawnEnemy() {
        const x = Math.random() * this.width;
        const y = -50;

        const type = this.levelSystem.getNextEnemyType();

        const stats = {
            health: this.levelSystem.enemyHealth,
            speed: this.levelSystem.enemySpeed,
            scoreValue: this.levelSystem.enemyScore
        };

        this.enemies.push(new Enemy(this, x, y, stats, type));
    }

    checkCollisions() {
        // Player Projectiles hitting Enemies
        this.projectiles.forEach(projectile => {
            if (projectile.type === 'enemy_laser') return; // Skip enemy projectiles here

            this.enemies.forEach(enemy => {
                if (projectile.markedForDeletion || enemy.markedForDeletion) return;

                const dx = projectile.x - enemy.x;
                const dy = projectile.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < enemy.radius + projectile.radius) {
                    // Hit!
                    enemy.health -= projectile.damage;
                    enemy.hit();
                    this.ui.showDamage(enemy.x, enemy.y, Math.floor(projectile.damage));

                    if (enemy.health <= 0) {
                        enemy.markedForDeletion = true;
                        this.score += enemy.scoreValue;
                        this.currency += Math.floor(enemy.scoreValue / 2); // Currency drop
                        this.ui.updateScore(this.score);
                        this.ui.updateCurrency(this.currency);

                        // Notify Level System
                        this.levelSystem.enemyDefeated();
                        this.ui.updateLevelInfo(
                            this.levelSystem.level,
                            this.levelSystem.stage,
                            this.levelSystem.enemiesDefeated,
                            this.levelSystem.enemiesRequired
                        );

                        // Explosion
                        this.particles.createExplosion(enemy.x, enemy.y, enemy.color);
                        this.shake(5, 100);

                        // Loot Drop Chance Removed
                        // if (Math.random() < 0.3) {
                        //     this.spawnLoot(enemy.x, enemy.y);
                        // }
                    }

                    // Ricochet or Destroy
                    if (projectile.behavior === 'ricochet') {
                        // Calculate normal (simple approx: vector from enemy center to projectile)
                        const nx = dx / dist;
                        const ny = dy / dist;
                        if (!projectile.bounce(nx, ny)) {
                            projectile.markedForDeletion = true;
                        }
                    } else {
                        projectile.markedForDeletion = true;
                    }

                    this.particles.createExplosion(projectile.x, projectile.y, 0xffff00, 5);
                }
            });
        });

        // Enemy Projectiles hitting Player
        this.projectiles.forEach(projectile => {
            if (projectile.type !== 'enemy_laser') return;

            if (projectile.markedForDeletion) return;

            const dx = projectile.x - this.player.x;
            const dy = projectile.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.player.radius + projectile.radius) {
                // Hit Player!
                if (this.player.shield > 0) {
                    // Shield absorbs?
                    // For now, just take damage
                }

                this.player.health -= projectile.damage;
                this.ui.updateHealth(this.player.health);
                this.shake(10, 200);
                this.particles.createExplosion(this.player.x, this.player.y, 0xff0000, 10);

                projectile.markedForDeletion = true;

                if (this.player.health <= 0) {
                    this.gameOver();
                }
            }
        });

        // Player collision with Enemies
        this.enemies.forEach(enemy => {
            if (enemy.markedForDeletion) return;

            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.player.radius + enemy.radius) {
                this.player.health -= 20;
                this.ui.updateHealth(this.player.health);
                enemy.markedForDeletion = true;
                this.particles.createExplosion(enemy.x, enemy.y, enemy.color);
                this.shake(20, 200);

                if (this.player.health <= 0) {
                    this.gameOver();
                }
            }
        });
    }

    draw() {
        this.renderer.render(this.scene, this.camera);
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        try {
            this.update(deltaTime);
            this.draw();
        } catch (error) {
            console.error("Game Loop Error:", error);
            this.isRunning = false;
            alert("Game Error: " + error.message);
        }
    }
}
