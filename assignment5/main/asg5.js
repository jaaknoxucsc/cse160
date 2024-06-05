import * as THREE from '../lib/three.module.js';
import { OBJLoader } from '../lib/OBJLoader.js';
import { MTLLoader } from '../lib/MTLLoader.js';
import Camera from './camera.js';
import { Cube } from './cube.js';

let scene, renderer, camera, skybox, floor, walls;
let isVictory = false;
let keyStates = {
    'w': false,
    's': false,
    'a': false,
    'd': false,
    'q': false,
    'e': false,
    ' ': false
};
let stamina = 100;
const maxStamina = 100;
let staminaRecoveryRate = 20;
const sprintDrainRate = 40;
const sprintSpeedMultiplier = 2;
let lastTimeStaminaDepleted = 0;
const staminaDepletionPause = 2;
const fillRadius = 20;
let isFilled = false;
const wellPosition = new THREE.Vector3(-40, -5, -5);
const wellRadius = 20;
let wellMessageShown = false;
const playerSpeed = 0.3 * 60;
const clock = new THREE.Clock(true);
let wateringCount = 0;
let mapVersion = 1;
let isWatering = false;
let currentPlant = null;

const canvas = document.getElementById('glcanvas');
const fpsDiv = document.createElement('div');
fpsDiv.style.position = 'absolute';
fpsDiv.style.color = 'white';
fpsDiv.style.top = '10px';
fpsDiv.style.left = '10px';
document.body.appendChild(fpsDiv);

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const backgroundMusic = document.getElementById('backgroundMusic');
const secondTrack = document.getElementById('secondTrack');

const bgMusicSource = audioContext.createMediaElementSource(backgroundMusic);
const secondTrackSource = audioContext.createMediaElementSource(secondTrack);

const bgMusicGain = audioContext.createGain();
const secondTrackGain = audioContext.createGain();

bgMusicSource.connect(bgMusicGain).connect(audioContext.destination);
secondTrackSource.connect(secondTrackGain).connect(audioContext.destination);

bgMusicGain.gain.value = 0.2;
secondTrackGain.gain.value = 0;

canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (backgroundMusic.paused) {
        backgroundMusic.play();
    }
});


function checkProximityToWell(playerPosition) {
    if (!wellMessageShown && playerPosition.distanceTo(wellPosition) <= wellRadius) {
        wellMessageShown = true;
        displayFirstMessage();
    }
}

function displayFirstMessage() {
    displayText("THEY NEED TO grow \nBUT THEY WILT BENEATH THE clouds", () => {
        clearText(displaySecondMessage);
    });
}

function displaySecondMessage() {
    setTimeout(() => {
        displayText("CLICK TO WATER THE topiaries \nMAKE THEM REACH THE sky", () => {
            clearText(() => console.log("Message cleared."));
        });
    }, 2000);
}

canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', lockChangeAlert, false);

document.addEventListener('keydown', (event) => {
    if (keyStates.hasOwnProperty(event.key)) {
        keyStates[event.key] = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (keyStates.hasOwnProperty(event.key)) {
        keyStates[event.key] = false;
    }
});

function lockChangeAlert() {
    if (document.pointerLockElement === canvas) {
        document.addEventListener("mousemove", handleLockedMouseMove, false);
    } else {
        document.removeEventListener("mousemove", handleLockedMouseMove, false);
    }
}

function handleLockedMouseMove(event) {
    const deltaX = event.movementX || 0;
    const deltaY = event.movementY || 0;
    camera.rotate(deltaX, deltaY);
}
function updateCamera(delta) {
    let currentSpeed = playerSpeed * delta;
    let isMoving = keyStates['w'] || keyStates['s'] || keyStates['a'] || keyStates['d'];
    let isSprinting = keyStates[' '] && stamina > 0;
    let currentTime = performance.now();

    if (isSprinting) {
        currentSpeed *= sprintSpeedMultiplier;
        stamina -= sprintDrainRate * delta;
        if (stamina <= 0) {
            stamina = 0;
            lastTimeStaminaDepleted = currentTime;
        }
    }

    if (!isSprinting && currentTime > lastTimeStaminaDepleted + staminaDepletionPause * 1000) {
        if (isMoving) {
            stamina += (staminaRecoveryRate) * delta;
        } else {
            // Increased regen rate if standing still
            stamina += (staminaRecoveryRate * 5) * delta;
        }
        stamina = Math.min(stamina, maxStamina);
    }

    if (keyStates['w']) camera.moveForward(currentSpeed);
    if (keyStates['s']) camera.moveBackward(currentSpeed);
    if (keyStates['a']) camera.moveLeft(currentSpeed);
    if (keyStates['d']) camera.moveRight(currentSpeed);
    if (keyStates['q']) camera.panLeft(0.01 * delta);
    if (keyStates['e']) camera.panRight(0.01 * delta);
}


let sunlight; 
function initThreeJS() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.toneMappingExposure = 0.5;

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // directional light representing the sun
    sunlight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunlight.position.set(150, 450, -400);
    sunlight.castShadow = true;
    scene.add(sunlight);
    addSun();

    // 2 point lights
    const pointLight1 = new THREE.PointLight(0x990000, 1000, 20);
    pointLight1.position.set(48, 2, -18);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x990000, 1000, 20);
    pointLight2.position.set(48, 2, 10);
    scene.add(pointLight2);

    // World and objects
    initWorld();

    camera = new Camera(canvas, walls.map(wall => wall.mesh));
    camera.getObject().position.set(120, 0, 0);
    scene.add(camera.getObject());

    // Skybox
    initSkybox();
    initPlants();

    // Floor
    const loader = new THREE.TextureLoader();
    loader.load('./textures/grass.png', function(texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);

        const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
        const floorMaterial = new THREE.MeshPhongMaterial({ map: texture, specular: 0x222222, shininess: 10 });
        floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -5;
        scene.add(floor);
    });
    let textureLoader = new THREE.TextureLoader();
    let material1 = new THREE.MeshBasicMaterial({
        map: textureLoader.load('./textures/welcome1.png'),
        transparent: true,
        side: THREE.DoubleSide
    });
    let material2 = new THREE.MeshBasicMaterial({
        map: textureLoader.load('./textures/welcome2.png'),
        transparent: true,
        side: THREE.DoubleSide
    });
    
    let planeGeometry = new THREE.PlaneGeometry(10, 5);
    let plane = new THREE.Mesh(planeGeometry, material1);
    scene.add(plane);
    
    plane.position.set(35, 7, -2.5);
    plane.rotation.y = Math.PI / 2;
    let currentTexture = 1;
    setInterval(() => {
        if (currentTexture === 1) {
            plane.material = material2;
            currentTexture = 2;
        } else {
            plane.material = material1;
            currentTexture = 1;
        }
    }, 1000);

        
    loadCustomObjects();
    renderScene();
}


function loadCustomObjects() {
    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();

    const objects = [
        { obj: 'Well_OBJ.obj', mtl: 'Well_OBJ.mtl', position: { x: -40, y: -5, z: -5 }, scale: 0.04 },
    ];

    objects.forEach(({ obj, mtl, position, scale }) => {
        mtlLoader.load(`objects/${mtl}`, (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);
            objLoader.load(`objects/${obj}`, (loadedObject) => {
                loadedObject.position.set(position.x, position.y, position.z);
                loadedObject.scale.set(scale, scale, scale);
                scene.add(loadedObject);
            });
        });
    });
}

function initSkybox() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        './textures/bluecloud_lf.jpg',
        './textures/bluecloud_rt.jpg',
        './textures/bluecloud_up.jpg',
        './textures/bluecloud_dn.jpg',
        './textures/bluecloud_ft.jpg',
        './textures/bluecloud_bk.jpg' 
    ], function(texture) {
        texture.images.forEach((img) => {
           
        });
    });
    texture.encoding = THREE.sRGBEncoding;
    scene.background = texture;
}

function initWorld() {
    walls = [];
    const map = generateMap();
    const loader = new THREE.TextureLoader();

    for (let x = 0; x < map.length; x++) {
        for (let z = 0; z < map[x].length; z++) {
            let type = map[x][z];
            if (type > 0) {
                const cube = new Cube(type, loader);
                cube.mesh.position.set((x - map.length / 2) * 6, -2, (z - map[x].length / 2) * 6);
                scene.add(cube.mesh);
                walls.push(cube);
            }
        }
    }
}

function generateMap() {
    if (mapVersion === 1) {
        return [
            Array.from("78879789789778978789878978897897", x => parseInt(x)),
            Array.from("80000000000000000000000000000008", x => parseInt(x)),
            Array.from("80000000000000000000000000000009", x => parseInt(x)),
            Array.from("90000000000000000000000000000008", x => parseInt(x)),
            Array.from("70000000000000000000000000000007", x => parseInt(x)),
            Array.from("80000000000000000000000000000007", x => parseInt(x)),
            Array.from("80000000000000000000000000000009", x => parseInt(x)),
            Array.from("70000000000000000000000000000009", x => parseInt(x)),
            Array.from("90000000000000000000000000000009", x => parseInt(x)),
            Array.from("90000000000000000000000000000008", x => parseInt(x)),
            Array.from("80000000000000000000000000000008", x => parseInt(x)),
            Array.from("90000000000000000000000000000008", x => parseInt(x)),
            Array.from("70000000000000000000000000000007", x => parseInt(x)),
            Array.from("90000000000000000000000000000009", x => parseInt(x)),
            Array.from("80000000000000000000000000000008", x => parseInt(x)),
            Array.from("80000000000000000000000000000009", x => parseInt(x)),
            Array.from("70000000000000000000000000000009", x => parseInt(x)),
            Array.from("80000000000000000000000000000009", x => parseInt(x)),
            Array.from("90000000000000000000000000000008", x => parseInt(x)),
            Array.from("90000000000000000000000000000008", x => parseInt(x)),
            Array.from("80000000000000000000000000000007", x => parseInt(x)),
            Array.from("70000000000000000000000000000007", x => parseInt(x)),
            Array.from("70000000000000000000000000000007", x => parseInt(x)),
            Array.from("70000000000000000000000000000008", x => parseInt(x)),
            Array.from("80000000000000000000000000000009", x => parseInt(x)),
            Array.from("90000000000000000000000000000008", x => parseInt(x)),
            Array.from("70000000000000000000000000000007", x => parseInt(x)),
            Array.from("80000000000000000000000000000007", x => parseInt(x)),
            Array.from("80000000000000000000000000000008", x => parseInt(x)),
            Array.from("90000000000000000000000000000009", x => parseInt(x)),
            Array.from("90000000000000000000000000000008", x => parseInt(x)),
            Array.from("97878978988888300388889979787878", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080001000010009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000089999999999999000000000", x => parseInt(x)),
        ];
    } else if (mapVersion === 3) {
        return [
            Array.from("78879789789778978789878978897897", x => parseInt(x)),
            Array.from("80000000707000000000000000000008", x => parseInt(x)),
            Array.from("80000007007007000000700000000009", x => parseInt(x)),
            Array.from("90000070007007000070700007000008", x => parseInt(x)),
            Array.from("70000070000007000000700007000007", x => parseInt(x)),
            Array.from("80777777777777000077777777777777", x => parseInt(x)),
            Array.from("80000000000007000000000000000009", x => parseInt(x)),
            Array.from("70070070000007000070000000000009", x => parseInt(x)),
            Array.from("90070070000007000070000000000009", x => parseInt(x)),
            Array.from("90077770007777777777770000000008", x => parseInt(x)),
            Array.from("80000000007000000000000000000008", x => parseInt(x)),
            Array.from("90000000007000000000000000000008", x => parseInt(x)),
            Array.from("70007007070007777777700077770007", x => parseInt(x)),
            Array.from("90070000700000000000000700007009", x => parseInt(x)),
            Array.from("80700000070000000000007000000708", x => parseInt(x)),
            Array.from("80000000000000000000007000000709", x => parseInt(x)),
            Array.from("70700000070000000000007000000709", x => parseInt(x)),
            Array.from("80700000070000000000007000000709", x => parseInt(x)),
            Array.from("90070000700000000000000700007008", x => parseInt(x)),
            Array.from("90007777000000000000000077770008", x => parseInt(x)),
            Array.from("80000770000000000000000000000007", x => parseInt(x)),
            Array.from("70000770000000000000000000007007", x => parseInt(x)),
            Array.from("70000770007777777777777007777007", x => parseInt(x)),
            Array.from("70000000000070000007000707777008", x => parseInt(x)),
            Array.from("80000770000070000007000077777009", x => parseInt(x)),
            Array.from("90000770000070000007000000000008", x => parseInt(x)),
            Array.from("70777777777777000077777777777707", x => parseInt(x)),
            Array.from("80000000000070000007000000000007", x => parseInt(x)),
            Array.from("80000000000007000070000000000008", x => parseInt(x)),
            Array.from("90000000000007000070000000000009", x => parseInt(x)),
            Array.from("90000000000007000070000000000008", x => parseInt(x)),
            Array.from("97878978988888300388889979787878", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080001000010009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000089999999999999000000000", x => parseInt(x)),
        ];
    } else if (mapVersion === 2) {
        return [
            Array.from("78879789789778978789878978897897", x => parseInt(x)),
            Array.from("80000000000000000000000000000008", x => parseInt(x)),
            Array.from("80000000000000000000000000000009", x => parseInt(x)),
            Array.from("90000070000000000000000007000008", x => parseInt(x)),
            Array.from("70000070000000000000000007000007", x => parseInt(x)),
            Array.from("87777777777777000077777777777777", x => parseInt(x)),
            Array.from("80000000000000000000000000000009", x => parseInt(x)),
            Array.from("70000000000007000070000000000009", x => parseInt(x)),
            Array.from("90000000000007000070000000000009", x => parseInt(x)),
            Array.from("90000000007777777777770000000008", x => parseInt(x)),
            Array.from("80000000000000000000000000000008", x => parseInt(x)),
            Array.from("90000000000000000000000000000008", x => parseInt(x)),
            Array.from("70007777000000000000000077770007", x => parseInt(x)),
            Array.from("90070000700000000000000700007009", x => parseInt(x)),
            Array.from("80700000070000000000007000000708", x => parseInt(x)),
            Array.from("80700000070000000000007000000709", x => parseInt(x)),
            Array.from("70700000070000000000007000000709", x => parseInt(x)),
            Array.from("80700000070000000000007000000709", x => parseInt(x)),
            Array.from("90070000700000000000000700007008", x => parseInt(x)),
            Array.from("90007777000000000000000077770008", x => parseInt(x)),
            Array.from("80000000000000000000000000000007", x => parseInt(x)),
            Array.from("70000000000000000000000000000007", x => parseInt(x)),
            Array.from("70000000007777777777770000000007", x => parseInt(x)),
            Array.from("70000000000070000007000000000008", x => parseInt(x)),
            Array.from("80000000000070000007000000000009", x => parseInt(x)),
            Array.from("90000000000000000000000000000008", x => parseInt(x)),
            Array.from("77777777777777000077777777777777", x => parseInt(x)),
            Array.from("80000000000000000000000000000007", x => parseInt(x)),
            Array.from("80000000000000000000000000000008", x => parseInt(x)),
            Array.from("90000000000000000000000000000009", x => parseInt(x)),
            Array.from("90000000000000000000000000000008", x => parseInt(x)),
            Array.from("97878978988888300388889979787878", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080001000010009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000080000000000009000000000", x => parseInt(x)),
            Array.from("00000000089999999999999000000000", x => parseInt(x)),
        ];
    } else if (mapVersion === 4) {
        return [
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),
            Array.from("00000000000000000000000000000000", x => parseInt(x)),            
        ];
    }
}

function renderScene() {
    let delta = clock.getDelta();
    let playerPosition = camera.getObject().position;
    updateWaterMeter(playerPosition);
    checkProximityToWell(playerPosition);
    if (!isVictory) {
        updateCamera(delta);
        requestAnimationFrame(renderScene);
    }
    animateClouds();
    shrinkPlants();
    renderer.render(scene, camera.getObject());
    fpsDiv.innerHTML = 'FPS: ' + (1 / delta).toFixed(2);
    document.getElementById('staminaIndicator').style.width = `${(stamina / maxStamina) * 100}%`;
}

document.addEventListener('DOMContentLoaded', function() {
    loadManModel();
    setTimeout(() => {
        initThreeJS();
        initClouds();
        setTimeout(() => {
            displayText("WELCOME TO THE JACOB ZONE \nCLICK THE screen \nAND APPROACH THE well", () => {
                clearText(() => console.log("Message cleared."));
            });
        }, 2000);
    }, 500);
});

function createCloud() {
    let cloud = new THREE.Group();
    cloud.name = 'cloud';

    let cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    let cubeGeometry = new THREE.BoxGeometry(100, 100, 100);

    for (let i = 0; i < 10; i++) {
        let cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.x = (Math.random() * 100 - 50);
        cube.position.y = (Math.random() * 50 - 25);
        cube.position.z = (Math.random() * 100 - 50);
        cloud.add(cube);
    }

    return cloud;
}

function initClouds() {
    for (let i = 0; i < 200; i++) {
        let cloud = createCloud();
        cloud.position.set(
            Math.random() * 3000 - 1500,
            300,
            Math.random() * 2000 - 1000 
        );
        scene.add(cloud);
    }
}

let cloudSpeedMultiplier = 1;
function animateClouds() {
    let speedMultiplier = wateringCount >= 9 ? 5 : 1;
    speedMultiplier *= cloudSpeedMultiplier;
    scene.traverse(function (object) {
        if (object.name === 'cloud') {
            object.position.x += .7 * speedMultiplier;

            if (object.position.x > 1500) {
                object.position.x = -1500;
            }
        }
    });
}

function addSun() {
    const sunGeometry = new THREE.SphereGeometry(30, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(0, 450, 0);
    scene.add(sun);
}

function displayText(message, onComplete) {
    const lines = message.split("\n");
    const messageBox = document.getElementById('messageBox');
    messageBox.innerHTML = '';
    let lineIndex = 0;

    function typeLine() {
        if (lineIndex >= lines.length) {
            setTimeout(() => onComplete(), 2000);
            return;
        }
        let line = lines[lineIndex];
        let i = 0;
        const lineElem = document.createElement('div');
        messageBox.appendChild(lineElem);

        const interval = setInterval(() => {
            lineElem.textContent += line.charAt(i);
            i++;
            if (i > line.length) {
                clearInterval(interval);
                lineIndex++;
                typeLine();
            }
        }, 50);
    }

    typeLine();
}

function clearText(onCleared) {
    const messageBox = document.getElementById('messageBox');
    let lines = messageBox.innerHTML.split('<br>');
    let lineIndex = lines.length - 1;

    function clearLine() {
        let line = lines[lineIndex];
        let i = line.length - 1;
        const interval = setInterval(() => {
            line = line.slice(0, i);
            lines[lineIndex] = line;
            messageBox.innerHTML = lines.join('<br>');
            i--;
            if (i < 0) {
                clearInterval(interval);
                lineIndex--;
                if (lineIndex >= 0) {
                    clearLine();
                } else {
                    onCleared();
                }
            }
        }, 20);
    }

    if (lines.length > 0) {
        clearLine();
    } else {
        onCleared();
    }
}
let hasProcessedWateringCycle = false;

function updateWaterMeter(playerPosition) {
    const distance = playerPosition.distanceTo(wellPosition);
    const waterLevel = document.getElementById('waterLevel');

    if (distance <= fillRadius && !isFilled) {
        waterLevel.style.height = '100%';
        isFilled = true;
        hasProcessedWateringCycle = false;
    }

    if (isWatering && isFilled) {
        let currentHeight = parseFloat(waterLevel.style.height);
        if (currentHeight > 0) {
            console.log('height:', currentHeight);
            waterLevel.style.height = (currentHeight - 1.0) + '%';
            growPlant(currentPlant, 1.5);
        } else {
            
            isFilled = false;
            wateringCount++;
            if (!hasProcessedWateringCycle) {
                console.log('hooray');
                processMapChangeLogic();
                hasProcessedWateringCycle = true;
            }
        }
    }
}

function processMapChangeLogic() {
    console.log('Processing map change logic, water count:', wateringCount);
    if (wateringCount === 2) {
        mapVersion = 2;
        updateWorld();
        displayText("KEEP GOING KEEP GOING KEEP GOING \nTHEY FLOURISH UNDER YOUR care \n BUT YOU ARE NOT DONE yet", () => {
            clearText(() => console.log("Message cleared."));
        });
    }
    if (wateringCount === 4) {
        mapVersion = 3;
        updateWorld();
        displayText("THE SUN IS INCHES away \nTHE CLOUDS MUST BE breached", () => {
            clearText(() => console.log("Message cleared."));
        });
    }
    if (wateringCount === 8) {
        sunlight.color.set(0xff0000);
        changeSkybox();
        displayText("SOMETHING'S GONE WRONG \nTHE SUN IS not real", () => {
            clearText(displayFinalMessage);
        });
    }
}


function drainWaterMeter() {
    const waterLevel = document.getElementById('waterLevel');
    if (isFilled) {
        waterLevel.style.transition = 'height 0.5s ease-out';
        waterLevel.style.height = '0%';
        isFilled = false;
    }
}

let men = [];

function initPlants() {
    const plantMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const plantGeometry = new THREE.CylinderGeometry(1, 1, 500, 32);

    for (let i = 0; i < 4; i++) {
        const plant = new THREE.Mesh(plantGeometry, plantMaterial);
        const xPos = (i % 2 === 0) ? 20 : -140;
        const zPos = (i < 2) ? -70 : 70;
        plant.position.set(xPos, -247.5, zPos);
        plant.userData = { interactionRange: 15, index: i };
        scene.add(plant);

        if (manModel) {
            const manClone = manModel.clone();
            manClone.position.set(xPos, 2.5, zPos);
            manClone.name = `man_${i}`;
            scene.add(manClone);
            men.push({ plant: plant, man: manClone });
        }
    }
}

canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0 || event.button === 2) {
        let playerPosition = camera.getObject().position;
        currentPlant = getClosestPlant(playerPosition);
        if (currentPlant && isFilled) {
            isWatering = true;
            console.log('Watering started on plant at position:', currentPlant.position);
        } else {
            console.log('No plant to water or water meter is not filled');
        }
    }
});

function getClosestPlant(playerPosition) {
    let closestPlant = null;
    let minDistance = Infinity;

    scene.children.forEach((child) => {
        if (child.geometry && child.geometry.type === 'CylinderGeometry') {
            const adjustedPlayerPosition = new THREE.Vector3(playerPosition.x, 0, playerPosition.z);
            const adjustedPlantPosition = new THREE.Vector3(child.position.x, 0, child.position.z);
            const distance = adjustedPlayerPosition.distanceTo(adjustedPlantPosition);
            console.log('Distance to plant at position', child.position, 'is', distance);
            if (distance < minDistance && distance <= child.userData.interactionRange) {
                closestPlant = child;
                minDistance = distance;
            }
        }
    });

    if (closestPlant) {
        console.log('Closest plant found at position:', closestPlant.position);
    } else {
        console.log('No plant found');
    }

    return closestPlant;
}

canvas.addEventListener('mouseup', (event) => {
    if (event.button === 0 || event.button === 2) {
        isWatering = false;
        console.log('Watering stopped');
    }
});

function growPlant(plant, increment) {
    if (plant) {
        plant.position.y += increment;

        men.forEach(({ plant: plantRef, man }) => {
            if (plantRef === plant) {
                man.position.y += increment;
            }
        });

    }
}

function displayFinalMessage() {
    setTimeout(() => {
        displayText("THEY ARE wilting \nO CALAMITOUS day", () => {
            clearText(displayFinalMessage2);
        });
    }, 4000);
}

function displayFinalMessage2() {
    mapVersion = 1;
    cloudSpeedMultiplier = 0.07;
    updateWorld();

    
    fadeOutAudio(bgMusicGain, 2);
    
    secondTrack.play();
    setTimeout(() => {
        fadeInAudio(secondTrackGain, 2);
    }, 2000);

    setTimeout(() => {
        displayText("hey \nyou can kind of still see them up there \nthrough the clouds \n⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\nmaybe this was how it was supposed to happen", () => {
            clearText(displayFinalMessage3);
        });
    }, 8000);
}

function displayFinalMessage3() {
    setTimeout(() => {
        displayText("maybe this is what they wanted?", () => {
            clearText(displayFinalMessage4);
        });
    }, 2000);
}

function displayFinalMessage4() {
    setTimeout(() => {
        displayText("BGM: \nFat Cat - Pilotredsun \nThanks - Pilotredsun", () => {
            clearText(displayFinalMessage5);
        });
    }, 2000);
    mapVersion = 4;
    updateWorld();
}

function displayFinalMessage5() {
    setTimeout(() => {
        displayText("Now leaving: The Jacob Zone", () => {
            clearText(() => console.log("Message cleared."));
        });
    }, 2000);
}

function fadeOutAudio(gainNode, duration) {
    const currentTime = audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
}

function fadeInAudio(gainNode, duration) {
    const currentTime = audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, currentTime + duration);
}



function updateWorld() {
    walls.forEach(wall => {
        scene.remove(wall.mesh);
    });
    walls = [];

    const map = generateMap();
    const loader = new THREE.TextureLoader();
    for (let x = 0; x < map.length; x++) {
        for (let z = 0; z < map[x].length; z++) {
            let type = map[x][z];
            if (type > 0) {
                const cube = new Cube(type, loader);
                cube.mesh.position.set((x - map.length / 2) * 6, -2, (z - map[x].length / 2) * 6);
                scene.add(cube.mesh);
                walls.push(cube);
            }
        }
    }

    if (camera) {
        camera.collisionObjects = walls.map(wall => wall.mesh);
    }
}

function shrinkPlants() {
    let shrinkRate = wateringCount >= 8 ? 0.35 : 0.0;
    scene.traverse((object) => {
        if (object.geometry && object.geometry.type === 'CylinderGeometry' && object.position.y > -247.5) {
            object.position.y -= shrinkRate;
        }
    });
}

function changeSkybox() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        './textures/yellowcloud_lf.jpg',
        './textures/yellowcloud_rt.jpg',
        './textures/yellowcloud_up.jpg',
        './textures/yellowcloud_dn.jpg',
        './textures/yellowcloud_ft.jpg',
        './textures/yellowcloud_bk.jpg'
    ], function(texture) {
        texture.images.forEach((img) => {
        });
    });
    texture.encoding = THREE.sRGBEncoding;
    scene.background = texture;
    console.log("Skybox changed to yellow clouds.");
}


let manModel;

function loadManModel() {
    const objLoader = new OBJLoader();
    objLoader.load('objects/man.obj', (loadedObject) => {
        const greenMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 });
        loadedObject.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = greenMaterial;
            }
        });
        manModel = loadedObject;
        manModel.scale.set(61.04, 61.04, 61.04);
    });
}
