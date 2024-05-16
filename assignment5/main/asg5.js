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

const wellPosition = new THREE.Vector3(-40, -5, -5);
const wellRadius = 20;
let wellMessageShown = false;
const playerSpeed = 0.3 * 60;
const clock = new THREE.Clock(true);

const canvas = document.getElementById('glcanvas');
const fpsDiv = document.createElement('div');
fpsDiv.style.position = 'absolute';
fpsDiv.style.color = 'white';
fpsDiv.style.top = '10px';
fpsDiv.style.left = '10px';
document.body.appendChild(fpsDiv);


function checkProximityToWell(playerPosition) {
    if (!wellMessageShown && playerPosition.distanceTo(wellPosition) <= wellRadius) {
        wellMessageShown = true;
        displayFirstMessage();
    }
}

function displayFirstMessage() {
    displayText("HA HA HA THIS GAME IS SO UNFINISHED \nHAVE FUN WANDERING AROUND AN EMPTY FIELD", () => {
        clearText(displaySecondMessage);
    });
}

function displaySecondMessage() {
    setTimeout(() => {
        displayText("HAVE YOU NOTICED THERE'S COLLISION YET? THAT TOOK ME A WHILE \nIT'S ONLY ON THE BLOCKS THOUGH. NOT THE WELL. \nWHICH YOU PROBABLY JUST WALKED THROUGH", () => {
            clearText(displayThirdMessage);
        });
    }, 2000);
}

function displayThirdMessage() {
    setTimeout(() => {
        displayText("I'M THINKING UHHH MAYBE I'LL ADD AN INVISIBLE CUBE ON TOP OF IT? \nTHAT SEEMS LIKE A GOOD LAZY SOLUTION. \nNOT LIKE I'M GONNA ADD ANY MORE .OBJ FILES IN THE FUTURE", () => {
            clearText(displayFinalMessage);
        });
    }, 2000);
}

function displayFinalMessage() {
    setTimeout(() => {
        displayText("ALRIGHT THAT'S ALL I HAVE TO SAY \nGLAD YOU'VE BEEN ENTERTAINING YOURSELF FOR SO LONG \nIN THIS HORNSWOGGLINGLY BARREN ENVIRONMENT", () => {
            clearText(() => console.log("All messages displayed and cleared."));
        });
    }, 5000);
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
            stamina += (staminaRecoveryRate / 2) * delta;
        } else {
            // Increased regen rate if standing still
            stamina += (staminaRecoveryRate * 1.5) * delta;
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



function initThreeJS() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.toneMappingExposure = 0.5;

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // directional light representing the sun
    const sunlight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunlight.position.set(150, 450, -400);
    sunlight.castShadow = true;
    scene.add(sunlight);
    addSun();

    // 2 point lights
    const pointLight1 = new THREE.PointLight(0x990000, 10000, 20);
    pointLight1.position.set(48, 2, -18);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x990000, 10000, 20);
    pointLight2.position.set(48, 2, 10);
    scene.add(pointLight2);

    // World and objects
    initWorld();

    camera = new Camera(canvas, walls.map(wall => wall.mesh));
    camera.getObject().position.set(120, 0, 0);
    scene.add(camera.getObject());

    // Skybox
    initSkybox();

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

    loadCustomObjects();
    renderScene();
}


function loadCustomObjects() {
    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();

    const objects = [
        { obj: 'Well_OBJ.obj', mtl: 'Well_OBJ.mtl', position: { x: -40, y: -5, z: -5 }, scale: 0.04 }
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
}

function renderScene() {
    let delta = clock.getDelta();
    let playerPosition = camera.getObject().position;

    checkProximityToWell(playerPosition);
    if (!isVictory) {
        updateCamera(delta);
        requestAnimationFrame(renderScene);
    }
    animateClouds();
    renderer.render(scene, camera.getObject());
    fpsDiv.innerHTML = 'FPS: ' + (1 / delta).toFixed(2);
    document.getElementById('staminaIndicator').style.width = `${(stamina / maxStamina) * 100}%`;
}

document.addEventListener('DOMContentLoaded', function() {
    initThreeJS();
    initClouds();
    setTimeout(() => {
        displayText("WELCOME TO THE JACOB ZONE \nAPPROACH THE WELL", () => {
            clearText(() => console.log("Message cleared."));
        });
    }, 2000);
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
function animateClouds() {
    scene.traverse(function (object) {
        if (object.name === 'cloud') {
            object.position.x += .7;

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

