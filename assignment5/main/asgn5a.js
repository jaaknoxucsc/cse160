import * as THREE from '../lib/three.module.js';
import { OBJLoader } from '../lib/OBJLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new THREE.TextureLoader();
const objLoader = new OBJLoader();

objLoader.load('teapot.obj', function(object) {
    object.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            const texture = loader.load('jacob1.PNG');
            child.material = new THREE.MeshPhongMaterial({
                map: texture
            });
        }
    });
    
    scene.add(object);
    object.position.set(-5, -3, 0); 
    object.scale.set(1, 1, 1); 

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
    makeInstance(geometry, 'jacob2.PNG', 0),
    makeInstance(geometry, 'jacob1.PNG', -2),
    makeInstance(geometry, 'jacob1.PNG', 2),
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
