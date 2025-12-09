import * as THREE from '../lib/three.module.js';

export class Background {
    constructor(game) {
        this.game = game;
        this.layers = [
            { count: 100, speed: 20, size: 1, color: 0x555555 }, // Distant
            { count: 100, speed: 50, size: 2, color: 0xaaaaaa }, // Mid
            { count: 50, speed: 100, size: 3, color: 0xffffff }  // Close
        ];

        this.starSystems = [];

        this.layers.forEach(layer => {
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(layer.count * 3);

            for (let i = 0; i < layer.count; i++) {
                positions[i * 3] = Math.random() * this.game.width;
                positions[i * 3 + 1] = Math.random() * this.game.height;
                positions[i * 3 + 2] = -50 - (layer.speed * 0.1); // Depth based on speed
            }

            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({ color: layer.color, size: layer.size, transparent: true, opacity: 0.8 });
            const points = new THREE.Points(geo, mat);

            this.game.scene.add(points);
            this.starSystems.push({ mesh: points, speed: layer.speed });
        });

        // Background Image
        const textureLoader = new THREE.TextureLoader();
        const bgTexture = textureLoader.load('images/background.jpg',
            () => console.log('Background texture loaded successfully'),
            undefined,
            (err) => console.error('Error loading background texture:', err)
        );

        // Make it huge to cover screen
        const bgGeo = new THREE.PlaneGeometry(this.game.width * 2, this.game.height * 2);
        const bgMat = new THREE.MeshBasicMaterial({
            map: bgTexture,
            depthTest: false,
            depthWrite: false
        });
        this.bgMesh = new THREE.Mesh(bgGeo, bgMat);
        this.bgMesh.renderOrder = -999; // Force draw absolutely first
        this.bgMesh.position.set(this.game.width / 2, this.game.height / 2, -100);
        this.game.scene.add(this.bgMesh);
    }

    update(deltaTime) {
        this.starSystems.forEach(system => {
            const positions = system.mesh.geometry.attributes.position.array;
            const count = positions.length / 3;

            for (let i = 0; i < count; i++) {
                positions[i * 3 + 1] += system.speed * (deltaTime / 1000);

                if (positions[i * 3 + 1] > this.game.height) {
                    positions[i * 3 + 1] = 0;
                    positions[i * 3] = Math.random() * this.game.width;
                }
            }
            system.mesh.geometry.attributes.position.needsUpdate = true;
        });

        // Resize background if needed (optional, but good for window resize)
        if (this.bgMesh && (this.bgMesh.geometry.parameters.width !== this.game.width || this.bgMesh.geometry.parameters.height !== this.game.height)) {
            this.bgMesh.geometry.dispose();
            this.bgMesh.geometry = new THREE.PlaneGeometry(this.game.width, this.game.height);
        }
    }

    draw() {
        // No draw needed, Three.js handles it
    }
}
