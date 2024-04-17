import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { OBJLoader } from 'https://threejs.org/examples/jsm/loaders/OBJLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new THREE.TextureLoader();
const objLoader = new OBJLoader();

objLoader.load('12140_Skull_v3_L2.obj', function(object) {
    object.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            child.material.map = loader.load('Skull.jpg');
        }
    });
    scene.add(object);
    object.position.set(0, -5, 0);
});

function makeInstance(geometry, texturePath, x) {
    const texture = loader.load(texturePath);
    const material = new THREE.MeshPhongMaterial({ map: texture });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cube.position.x = x;
    return cube;
}

const geometry = new THREE.BoxGeometry();

const cubes = [
    makeInstance(geometry, 'jacob1.png', 0),
    makeInstance(geometry, 'jacob2.png', -2),
    makeInstance(geometry, 'jacob1.png', 2),
];

const light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(-1, 2, 4);
scene.add(light);

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    cubes.forEach(cube => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
    });
    renderer.render(scene, camera);
}
animate();
