import * as THREE from '../lib/three.module.js';
import { Projectile } from './Projectile.js';

export class Enemy {
    constructor(game, x, y, stats = {}, type = 'normal') {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type; // 'normal', 'elite', 'boss'

        // Stats
        this.radius = type === 'boss' ? 60 : (type === 'elite' ? 35 : 25);
        this.speed = (stats.speed || 100) * (type === 'elite' ? 1.2 : 1);
        this.health = (stats.health || 30) * (type === 'boss' ? 20 : (type === 'elite' ? 3 : 1));
        this.scoreValue = (stats.scoreValue || 10) * (type === 'boss' ? 50 : (type === 'elite' ? 5 : 1));
        this.color = type === 'boss' ? 0xff00ff : (type === 'elite' ? 0xffaa00 : 0xff0000);

        this.markedForDeletion = false;

        // Shooting
        this.canShoot = true;
        this.fireRate = type === 'boss' ? 500 : (type === 'elite' ? 1000 : 2000);
        this.canShoot = true;
        this.fireRate = type === 'boss' ? 500 : (type === 'elite' ? 1000 : 2000);
        this.lastShotTime = performance.now(); // Start ready to shoot or with small delay
        this.stopDistance = 200; // Distance to stop from player

        // Mesh
        this.mesh = new THREE.Group();

        // Sprite/Texture Setup
        const textureLoader = new THREE.TextureLoader();
        let texturePath = 'images/enemy1.png'; // Default
        if (this.type === 'elite') texturePath = 'images/enemy2.png';
        if (this.type === 'boss') texturePath = 'images/boss1.png';

        const texture = textureLoader.load(texturePath);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;

        // Adjust size based on type
        const size = this.radius * 2.5; // Scale up a bit from radius
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            color: 0xffffff // Use texture color
        });

        this.sprite = new THREE.Mesh(geometry, material);
        this.mesh.add(this.sprite);

        // Engine Glow (Optional, maybe keep or remove if texture has engines)
        // Let's keep a subtle glow
        const glowGeo = new THREE.SphereGeometry(this.radius * 0.3, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.6 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.y = this.radius; // Position at "back" (top in texture space usually?)
        // Actually, let's remove the geometric glow to avoid clashing with the sprite art
        // this.mesh.add(glow);

        this.game.scene.add(this.mesh);

        this.flashTimer = 0;
    }

    update(deltaTime) {
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angleToPlayer = Math.atan2(dy, dx);

        // Rotate mesh to face player
        // Mesh points +Y by default (Cone).
        // angleToPlayer is standard atan2(dy, dx).
        // To align +Y axis to angle, we subtract PI/2.
        this.mesh.rotation.z = angleToPlayer - Math.PI / 2;

        // Movement: Fly towards player or just down?
        // "Alien Hunter" usually implies flying down, but "Nose points to player" implies chasing.
        // Let's make them chase slowly or fly in general direction.
        // Let's stick to flying down generally but steering towards player X.

        // Simple Chase with Stop Distance
        if (dist > this.stopDistance) {
            const vx = Math.cos(angleToPlayer) * this.speed;
            const vy = Math.sin(angleToPlayer) * this.speed;

            this.x += vx * (deltaTime / 1000);
            this.y += vy * (deltaTime / 1000);
        }
        // Else: Stop moving, just rotate and shoot

        // Shooting
        const now = performance.now();
        // Shoot if on screen (y > -50)
        if (this.canShoot && now - this.lastShotTime > this.fireRate && this.y > -50 && this.y < this.game.height + 50) {
            // Aim at player
            this.shoot(angleToPlayer);
            this.lastShotTime = now;
        }

        // Screen Bounds (Delete if far off screen)
        if (this.y > this.game.height + 100 || this.y < -100 || this.x < -100 || this.x > this.game.width + 100) {
            // Don't delete immediately if chasing, only if WAY off
            // this.markedForDeletion = true; 
        }

        this.mesh.position.set(this.x, this.y, 0);

        // Flash Timer
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
            if (this.flashTimer <= 0) {
                // Reset colors
                if (this.sprite) this.sprite.material.color.setHex(0xffffff);
            }
        }
    }

    shoot(angle) {
        // Create Enemy Projectile
        this.game.addProjectile(new Projectile(
            this.game,
            this.x,
            this.y,
            angle,
            'enemy_laser',
            10 // Damage
        ));
    }

    hit() {
        this.flashTimer = 100; // ms
        if (this.sprite) this.sprite.material.color.setHex(0xff0000); // Flash red
    }

    cleanup() {
        this.game.scene.remove(this.mesh);
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }
}
