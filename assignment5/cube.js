import * as THREE from '../lib/three.module.js';

const textures = {
    1: 'textures/jacob1.png',
    2: 'textures/apple.png',
    3: 'textures/jacob2.png',
    4: 'textures/grass.png',
    5: 'textures/clouds.png',
    6: 'textures/hedge.png'
};

class Cube {
    constructor(type, loader) {
        this.geometry = new THREE.BoxGeometry(6, 6, 6);
        let material;
        
        if (textures[type]) {
            const texture = loader.load(textures[type]);
            texture.colorSpace = THREE.SRGBColorSpace;
            material = new THREE.MeshBasicMaterial({ map: texture });
        } else {
            material = new THREE.MeshPhongMaterial({ map: loader.load(textures[6]) });
        }

        this.mesh = new THREE.Mesh(this.geometry, material);
    }

    getObject() {
        return this.mesh;
    }
}

export { Cube };
