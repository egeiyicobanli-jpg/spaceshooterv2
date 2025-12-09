import * as THREE from '../lib/three.module.js';

// Shared texture to avoid repeated loading
const particleTexture = new THREE.TextureLoader().load('images/spark1.png');


export class Particle {
    constructor(game, x, y, color, velocity, size, life) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.vx = velocity.x;
        this.vy = velocity.y;
        this.life = life;
        this.maxLife = life;
        this.markedForDeletion = false;

        const mat = new THREE.SpriteMaterial({ map: particleTexture, color: color });
        this.sprite = new THREE.Sprite(mat);
        this.sprite.scale.set(size * 2, size * 2, 1);
        this.sprite.position.set(x, y, 0);

        this.game.scene.add(this.sprite);
    }

    update(deltaTime) {
        this.x += this.vx * (deltaTime / 1000);
        this.y += this.vy * (deltaTime / 1000);
        this.life -= deltaTime;

        this.sprite.position.set(this.x, this.y, 0);
        this.sprite.material.opacity = this.life / this.maxLife;

        if (this.life <= 0) {
            this.markedForDeletion = true;
            this.cleanup();
        }
    }

    draw() {
        // Handled by Three.js
    }

    cleanup() {
        this.game.scene.remove(this.sprite);
        this.sprite.material.dispose();
    }
}

export class ParticleSystem {
    constructor(game) {
        this.game = game;
        this.particles = [];
    }

    addParticle(x, y, color, velocity, size, life) {
        this.particles.push(new Particle(this.game, x, y, color, velocity, size, life));
    }

    createExplosion(x, y, color, count = 10) {
        // Procedural Explosion (Flash)
        const flashGeo = new THREE.SphereGeometry(15, 8, 8);
        const flashMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.set(x, y, 0);
        this.game.scene.add(flash);

        // Add a custom particle for the flash that shrinks/fades
        const flashParticle = {
            mesh: flash,
            life: 200,
            maxLife: 200,
            update: (dt) => {
                flashParticle.life -= dt;
                flash.material.opacity = flashParticle.life / flashParticle.maxLife;
                flash.scale.setScalar(1 + (1 - flashParticle.life / flashParticle.maxLife) * 2);
                if (flashParticle.life <= 0) {
                    flashParticle.markedForDeletion = true;
                    flash.geometry.dispose();
                    flash.material.dispose();
                    this.game.scene.remove(flash);
                }
            },
            markedForDeletion: false
        };
        this.particles.push(flashParticle);

        // Sparks
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            const velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };
            this.addParticle(x, y, color, velocity, Math.random() * 3 + 1, Math.random() * 500 + 200);
        }
    }

    createTrail(x, y, color, size = 2) {
        const particle = {
            mesh: null,
            life: 200, // Longer life
            maxLife: 200,
            update: (dt) => {
                particle.life -= dt;
                if (particle.mesh) {
                    particle.mesh.material.opacity = (particle.life / particle.maxLife) * 0.8; // Higher opacity
                    particle.mesh.scale.setScalar(size * (particle.life / particle.maxLife)); // Shrink
                }
                if (particle.life <= 0) {
                    particle.markedForDeletion = true;
                    if (particle.mesh) {
                        particle.mesh.material.dispose();
                        this.game.scene.remove(particle.mesh);
                    }
                }
            },
            markedForDeletion: false
        };

        const mat = new THREE.SpriteMaterial({
            map: particleTexture,
            color: color,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        particle.mesh = new THREE.Sprite(mat);
        particle.mesh.scale.set(size, size, 1);
        particle.mesh.position.set(x, y, -1); // Behind projectile
        this.game.scene.add(particle.mesh);

        this.particles.push(particle);
    }

    createThruster(x, y) {
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5; // Downwards with spread
        const speed = Math.random() * 100 + 50;
        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        this.addParticle(x, y, 0x00ffff, velocity, Math.random() * 2 + 1, Math.random() * 200 + 100);
    }

    update(deltaTime) {
        this.particles.forEach(p => p.update(deltaTime));
        this.particles = this.particles.filter(p => !p.markedForDeletion);
    }

    draw() {
        // Handled by Three.js
    }
}
