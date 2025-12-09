import * as THREE from '../lib/three.module.js';

export class Loot {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type; // 'shield', 'speed', 'weapon', 'currency'
        this.radius = 10;
        this.markedForDeletion = false;
        this.lifeTime = 10000; // 10 seconds
        this.creationTime = performance.now();

        this.vy = 50; // Gravity speed
        this.magnetRadius = 300; // Increased from 150
        this.magnetSpeed = 500; // Increased from 300

        let color = 0xffffff;
        switch (this.type) {
            case 'shield': color = 0x00ffff; break;
            case 'speed': color = 0xffff00; break;
            case 'weapon': color = 0xff00ff; break;
            case 'currency': color = 0xffd700; break;
        }

        // 3D Mesh
        const geo = new THREE.OctahedronGeometry(15, 0); // Increased size
        const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, metalness: 1.0, emissive: color, emissiveIntensity: 0.5 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(this.x, this.y, 10); // Z = 10 to be in front
        this.game.scene.add(this.mesh);

        console.log(`Loot created at ${this.x}, ${this.y} type: ${this.type}`);
    }

    update(deltaTime) {
        if (performance.now() - this.creationTime > this.lifeTime) {
            this.markedForDeletion = true;
        }

        // Gravity
        this.y += this.vy * (deltaTime / 1000);

        // Magnet Effect
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.magnetRadius) {
            this.x += (dx / distance) * this.magnetSpeed * (deltaTime / 1000);
            this.y += (dy / distance) * this.magnetSpeed * (deltaTime / 1000);
        }
    }

    draw() {
        // Handled by Three.js
        this.mesh.position.set(this.x, this.y, 10);
        this.mesh.rotation.y += 0.05;
        this.mesh.rotation.z += 0.02;
    }

    cleanup() {
        this.game.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
