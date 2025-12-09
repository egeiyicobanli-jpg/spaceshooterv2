import * as THREE from '../lib/three.module.js';

// Textures removed in favor of primitives


export class Projectile {
    constructor(game, x, y, angle, type, damage, behavior = 'normal') {
        this.game = game;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.type = type;
        this.damage = damage;
        this.behavior = behavior; // 'normal', 'tracking', 'ricochet'
        this.markedForDeletion = false;
        this.bounces = 0; // For ricochet

        if (this.type === 'cannon') {
            this.speed = 600;
            this.radius = 3;
            this.color = 0xffff00;
            this.life = 2000;
        } else if (this.type === 'missile') {
            this.speed = 400;
            this.radius = 5;
            this.color = 0xff0000;
            this.life = 3000;
            // Missiles track by default if behavior is not specified, or we can make it an upgrade
            if (this.behavior === 'normal') this.behavior = 'tracking';
        }

        // Mesh
        // Mesh
        if (this.type === 'cannon') {
            const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color: this.color });
            this.mesh = new THREE.Mesh(geometry, material);
        } else if (this.type === 'missile') {
            const geometry = new THREE.ConeGeometry(this.radius, this.radius * 3, 8);
            const material = new THREE.MeshBasicMaterial({ color: this.color });
            this.mesh = new THREE.Mesh(geometry, material);
            // Cone points up (+Y), we want it to point along +X by default or just rotate it later
            this.mesh.rotation.x = Math.PI / 2; // Point to +Z? No, let's align with direction in update
            // Actually, let's just rotate the mesh so its tip points to +X (0 angle)
            this.mesh.geometry.rotateZ(-Math.PI / 2);
        } else if (this.type === 'enemy_laser') {
            this.speed = 300;
            this.radius = 3;
            this.color = 0x00ff00; // Green
            this.life = 3000;

            const geometry = new THREE.CapsuleGeometry(this.radius, this.radius * 4, 4, 8);
            const material = new THREE.MeshBasicMaterial({ color: this.color });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.geometry.rotateZ(Math.PI / 2); // Align with X axis
        } else {
            // Default
            const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color: this.color });
            this.mesh = new THREE.Mesh(geometry, material);
        }

        this.game.scene.add(this.mesh);

        // Neon Glow Effect
        const glowTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png');
        // Fallback to canvas if needed, but let's try to make the glow more intense
        const canvas = document.createElement('canvas');
        canvas.width = 64; // Higher res
        canvas.height = 64;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)'); // Core
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)'); // Outer
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        const glowMap = new THREE.CanvasTexture(canvas);

        const glowMaterial = new THREE.SpriteMaterial({
            map: glowMap,
            color: this.color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 1.0 // Max opacity
        });
        const glowSprite = new THREE.Sprite(glowMaterial);
        glowSprite.scale.set(this.radius * 8, this.radius * 8, 1); // Bigger glow
        this.mesh.add(glowSprite);

        this.trailTimer = 0;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.markedForDeletion = true;
            return;
        }

        // Trail Effect - Handled at end of update

        // Tracking Logic
        if (this.behavior === 'tracking') {
            let nearest = null;
            let minDist = Infinity;
            this.game.enemies.forEach(enemy => {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = enemy;
                }
            });

            if (nearest && minDist < 500) {
                const targetAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
                // Smooth turn
                const turnRate = 5 * (deltaTime / 1000);
                let diff = targetAngle - this.angle;
                // Normalize angle
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                this.angle += Math.sign(diff) * Math.min(Math.abs(diff), turnRate);
            }
        }

        const vx = Math.cos(this.angle) * this.speed;
        const vy = Math.sin(this.angle) * this.speed;

        this.x += vx * (deltaTime / 1000);
        this.y += vy * (deltaTime / 1000);

        // Screen Bounds (Delete if off screen)
        if (this.x < -50 || this.x > this.game.width + 50 || this.y < -50 || this.y > this.game.height + 50) {
            this.markedForDeletion = true;
        }

        // Update Mesh
        this.mesh.position.set(this.x, this.y, 0);
        this.mesh.rotation.z = this.angle; // Rotate mesh to match movement direction

        // Trails
        if (this.type === 'missile') {
            this.game.particles.createTrail(this.x, this.y, 0xffaa00, 10); // Bigger trail
        } else if (this.type === 'enemy_laser') {
            this.game.particles.createTrail(this.x, this.y, 0x00ff00, 6);
        } else {
            this.game.particles.createTrail(this.x, this.y, 0xffff00, 6);
        }
    }

    bounce(normalX, normalY) {
        if (this.behavior !== 'ricochet') return false;

        // Reflect vector: r = d - 2(d.n)n
        const vx = Math.cos(this.angle);
        const vy = Math.sin(this.angle);

        const dot = vx * normalX + vy * normalY;

        const rx = vx - 2 * dot * normalX;
        const ry = vy - 2 * dot * normalY;

        this.angle = Math.atan2(ry, rx);
        this.bounces++;

        // Limit bounces based on upgrade level? 
        // For now, let's say max 3 bounces or handled by caller logic
        return true;
    }

    cleanup() {
        this.game.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
