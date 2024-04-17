// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Texture and OBJ Loaders
const loader = new THREE.TextureLoader();
const objLoader = new THREE.OBJLoader();

// Load and display a static .obj model with texture
objLoader.load('12140_Skull_v3_L2.obj', function(object) {
    object.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            child.material.map = loader.load('Skull.jpg'); // Apply the texture
        }
    });
    scene.add(object);
    object.position.set(0, -5, 0); // Adjust position to make it a background element
});

// Function to create instances of cubes
function makeInstance(geometry, texturePath, x) {
    const texture = loader.load(texturePath); // Load the texture from the path
    const material = new THREE.MeshPhongMaterial({ map: texture }); // Use MeshPhongMaterial for lighting effects
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cube.position.x = x;
    return cube;
}

// Define a basic cube geometry
const geometry = new THREE.BoxGeometry();

// Create multiple cubes with different textures and positions
const cubes = [
    makeInstance(geometry, 'jacob1.png', 0),
    makeInstance(geometry, 'jacob2.png', -2),
    makeInstance(geometry, 'jacob1.png', 2),
];

// Add light
const light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(-1, 2, 4); // Adjust light position for better effects
scene.add(light);

// Camera position
camera.position.z = 5;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    cubes.forEach(cube => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
    });
    renderer.render(scene, camera);
}
animate();
