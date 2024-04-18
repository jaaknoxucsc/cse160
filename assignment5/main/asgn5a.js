import * as THREE from '../lib/three.module.js';
import { OBJLoader } from '../lib/OBJLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add ambient light to illuminate the entire scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const loader = new THREE.TextureLoader();
const objLoader = new OBJLoader();

// Load the OBJ file
objLoader.load('12140_Skull_v3_L2.obj', function(object) {
    console.log("Skull OBJ loaded:", object); // Log the loaded object

    object.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            console.log("Skull Mesh found:", child); // Log mesh details

            // Load and apply the texture
            child.material.map = loader.load('Skull.jpg', function(texture) {
                console.log("Skull texture loaded successfully", texture); // Log successful texture load
            }, undefined, function(error) {
                console.log("Error loading skull texture:", error); // Log texture loading error
            });
            child.material.needsUpdate = true; // Ensure the material is updated
        }
    });

    scene.add(object);
    object.position.set(0, 0, 0); // Adjust position to be more centered
    console.log("Skull object added to the scene at position", object.position); // Log position details
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
console.log("Directional light added to the scene");

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
