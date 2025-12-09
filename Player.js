import * as THREE from '../lib/three.module.js';
import { Projectile } from './Projectile.js';

export class Player {
    constructor(game) {
        this.game = game;
        this.radius = 20;
        this.angle = 0;

        this.x = game.width / 2; // Initial X
        this.targetY = game.height - 150; // Fixed Y position
        this.y = game.height + 100; // Start below screen
        this.state = 'ENTERING'; // ENTERING, PLAYING

        // Stats from UpgradeManager
        this.speed = this.game.upgrades.getValue('engine');
        this.maxHealth = this.game.upgrades.getValue('hull');
        this.health = this.maxHealth;
        this.damage = this.game.upgrades.getValue('cannon');
        this.fireRate = this.game.upgrades.getValue('cooldown');

        this.color = 0x0000ff; // Hex for Three.js

        this.shield = 0;

        // Weapons
        this.cannonCooldown = this.fireRate;
        this.lastCannonTime = 0;
        this.missileCooldown = 1000;
        this.lastMissileTime = 0;

        // Dash
        this.canDash = true;
        this.isDashing = false;
        this.dashDuration = 200;
        this.dashCooldown = 1000;
        this.dashSpeedMultiplier = 3;
        this.lastDashTime = 0;
        this.dashCost = 30;

        // Energy
        this.maxEnergy = 100;
        this.energy = this.maxEnergy;
        this.energyRegen = 15; // per second

        // 3D Mesh Setup
        this.mesh = new THREE.Group();

        // Ship Sprite (PlaneGeometry)
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('images/player1.png'); // Correct path
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;

        const geometry = new THREE.PlaneGeometry(80, 80); // Adjusted size
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        this.sprite = new THREE.Mesh(geometry, material);
        this.mesh.add(this.sprite);

        // Shield Sphere (Invisible initially)
        const shieldGeo = new THREE.SphereGeometry(35, 16, 16);
        const shieldMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0, wireframe: true });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.mesh.add(this.shieldMesh);

        this.game.scene.add(this.mesh);

        this.bankAngle = 0;
        this.maxBankAngle = Math.PI / 4; // 45 degrees
    }

    update(deltaTime) {
        // Entrance Animation
        if (this.state === 'ENTERING') {
            this.y -= 100 * (deltaTime / 1000);
            if (this.y <= this.targetY) {
                this.y = this.targetY;
                this.state = 'PLAYING';
            }
            // Thruster effect
            this.game.particles.createThruster(this.x, this.y + 20);
            return;
        }

        // Energy Regen
        if (this.energy < this.maxEnergy) {
            this.energy += this.energyRegen * (deltaTime / 1000);
            if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
        }

        // Calculate angle to mouse
        const dx = this.game.input.mouse.x - this.x;
        const dy = this.game.input.mouse.y - this.y;
        this.angle = Math.atan2(dy, dx);

        // Shooting
        if (this.game.input.mouseButtons.left) {
            this.shoot('cannon');
        }
        if (this.game.input.mouseButtons.right) {
            this.shoot('missile');
        }

        // Movement Logic
        let currentSpeed = this.speed;

        // Handle Dash
        if (this.game.input.keys['Space'] && !this.isDashing && this.energy >= this.dashCost) {
            this.startDash();
        }

        if (this.isDashing) {
            currentSpeed *= this.dashSpeedMultiplier;
            if (performance.now() - this.lastDashTime > this.dashDuration) {
                this.isDashing = false;
            }
        }

        // Horizontal Movement (Keyboard)
        let vx = 0;
        if (this.game.input.keys['KeyA'] || this.game.input.keys['ArrowLeft']) {
            vx = -currentSpeed;
        }
        if (this.game.input.keys['KeyD'] || this.game.input.keys['ArrowRight']) {
            vx = currentSpeed;
        }

        this.x += vx * (deltaTime / 1000);

        // Screen bounds
        this.x = Math.max(this.radius, Math.min(this.game.width - this.radius, this.x));
        // Y is fixed at targetY
        this.y = this.targetY;

        // Thruster effect when moving
        if (vx !== 0 || this.isDashing) {
            this.game.particles.createThruster(this.x, this.y + 20);
        }

        // --- Visual Updates ---
        // Sync Mesh Position
        this.mesh.position.set(this.x, this.y, 0);

        // Rotate mesh to face the angle.
        // Standard canvas: +Y is Down.
        // If angle is 0 (Right), we want ship nose to point Right.
        // PlaneGeometry faces +Z. We rotate Z to point it.
        // Default orientation of image: Up.
        // To point Right (0), we need -90 deg (-PI/2).
        this.mesh.rotation.z = this.angle - Math.PI / 2;
        this.mesh.rotation.y = this.bankAngle;

        // Visual updates
        if (this.isDashing) {
            this.sprite.material.color.setHex(0x00ffff); // Cyan tint when dashing
        } else {
            this.sprite.material.color.setHex(0xffffff); // Normal color
        }

        // Shield effect
        if (this.shield > 0) {
            this.shieldMesh.material.opacity = 0.5 + Math.sin(performance.now() / 100) * 0.2;
        } else {
            this.shieldMesh.material.opacity = 0;
        }
    }

    startDash() {
        this.isDashing = true;
        this.energy -= this.dashCost;
        this.lastDashTime = performance.now();
    }

    shoot(type) {
        const now = performance.now();

        // Get Upgrade Stats
        const multishotLevel = this.game.upgrades.getValue('multishot');
        const critChance = this.game.upgrades.getValue('critChance');
        const damageAmp = this.game.upgrades.getValue('allDamage');
        const ricochetLevel = this.game.upgrades.getValue('ricochet');

        const behavior = ricochetLevel > 0 ? 'ricochet' : 'normal';

        // Calculate Damage
        let damage = this.damage * damageAmp;
        if (Math.random() < critChance) {
            damage *= 2; // Crit!
        }

        if (type === 'cannon') {
            if (now - this.lastCannonTime > this.cannonCooldown) {
                // Multishot Logic
                const shots = 1 + multishotLevel;
                const spread = 0.1; // Radians

                for (let i = 0; i < shots; i++) {
                    let angleOffset = 0;
                    if (shots > 1) {
                        angleOffset = (i - (shots - 1) / 2) * spread;
                    }

                    this.game.addProjectile(new Projectile(
                        this.game,
                        this.x,
                        this.y,
                        this.angle + angleOffset,
                        'cannon',
                        damage,
                        behavior
                    ));
                }

                this.lastCannonTime = now;
            }
        } else if (type === 'missile') {
            if (now - this.lastMissileTime > this.missileCooldown) {
                this.game.addProjectile(new Projectile(
                    this.game,
                    this.x,
                    this.y,
                    this.angle,
                    'missile',
                    damage,
                    'tracking'
                ));
                this.lastMissileTime = now;
            }
        }
    }

    activateShield() {
        this.shield = 100;
        console.log('Shield Activated');
        if (this.shieldTimeout) clearTimeout(this.shieldTimeout);

        this.shieldTimeout = setTimeout(() => {
            this.shield = 0;
            console.log('Shield Deactivated');
        }, 5000);
    }

    activateSpeedBoost() {
        this.speed *= 2;
        console.log('Speed Boost Activated');

        if (this.speedTimeout) clearTimeout(this.speedTimeout);

        this.speedTimeout = setTimeout(() => {
            this.speed /= 2;
            console.log('Speed Boost Deactivated');
        }, 5000);
    }

    addCurrency(amount) {
        console.log('Currency collected: ' + amount);
    }
}
