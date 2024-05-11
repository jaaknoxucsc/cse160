//asg3.js
import { Cube } from './cube.js';
import Camera from './camera.js';

let gl;
let shaderProgram;
let cloudsTexture, grassTexture, jacob1Texture, jacob2Texture, appleTexture;
let testCube;
let camera;
let isVictory = false;

let pointerLockActive = false;
let keyStates = {
    'w': false,
    's': false,
    'a': false,
    'd': false,
    'q': false,
    'e': false
};

const canvas = document.getElementById('glcanvas');
canvas.addEventListener('click', () => {
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.requestPointerLock();
});

function lockChangeAlert() {
    if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
        document.addEventListener("mousemove", handleLockedMouseMove, false);
    } else {
        document.removeEventListener("mousemove", handleLockedMouseMove, false);
        pointerLockActive = false;
        lastMouseX = null;
        lastMouseY = null;
    }
}

document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

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

canvas.addEventListener('mousedown', (event) => {
    switch (event.button) {
        case 0: // Left click
            deleteBlock();
            break;
        case 2: // Right click
            addBlock();
            break;
    }
});

function getMapIndexFromCamera() {
    let forwardVector = glMatrix.vec3.create();
    glMatrix.vec3.subtract(forwardVector, camera.at, camera.eye);
    glMatrix.vec3.normalize(forwardVector, forwardVector);

    let checkPoint = glMatrix.vec3.create();
    glMatrix.vec3.scaleAndAdd(checkPoint, camera.eye, forwardVector, 4);

    let mapX = Math.floor((checkPoint[0] + 3.5 +(mapSize * 6 / 2)) / 6);
    let mapZ = Math.floor((checkPoint[2] + 3.5 + (mapSize * 6 / 2)) / 6);
    return { mapX, mapZ };
}


function addBlock() {
    const { mapX, mapZ } = getMapIndexFromCamera();
    if (mapX >= 0 && mapX < mapSize && mapZ >= 0 && mapZ < mapSize) {
        map[mapX][mapZ] = 1;
        createWorld();
    }
}

function deleteBlock() {
    const { mapX, mapZ } = getMapIndexFromCamera();
    if (mapX >= 0 && mapX < mapSize && mapZ >= 0 && mapZ < mapSize && map[mapX][mapZ] !== 0) {
        map[mapX][mapZ] = 0;
        createWorld();
    }
}

function handleLockedMouseMove(event) {
    const deltaX = event.movementX || event.mozMovementX || 0;
    const deltaY = event.movementY || event.mozMovementY || 0;
    camera.rotate(deltaX, deltaY);
}

function updateCamera() {
    if (keyStates['w']) camera.moveForward(0.1);
    if (keyStates['s']) camera.moveBackward(0.1);
    if (keyStates['a']) camera.moveLeft(0.1);
    if (keyStates['d']) camera.moveRight(0.1);
    if (!pointerLockActive) {
        if (keyStates['q']) camera.panLeft(0.01);
        if (keyStates['e']) camera.panRight(0.01);
    }
    camera.updateViewMatrix();
}




function initWebGL() {
    const canvas = document.getElementById('glcanvas');
    gl = canvas.getContext('webgl');
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
}

function initShaders() {
    const vsSource = `
        attribute vec4 a_position;
        attribute vec2 a_texCoord;
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        varying vec2 v_texCoord;
        
        void main() {
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * a_position;
            v_texCoord = vec2(a_texCoord.x, 1.0 - a_texCoord.y);
        }
    `;

    const fsSource = `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_sampler;
        uniform vec4 u_baseColor;
        uniform float u_texColorWeight;
        
        void main() {
            vec4 texColor = texture2D(u_sampler, v_texCoord);
            vec4 baseColor = u_baseColor;
            gl_FragColor = (1.0 - u_texColorWeight) * baseColor + u_texColorWeight * texColor;
        }
        
    `;

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    shaderProgram.uModelMatrix = gl.getUniformLocation(shaderProgram, 'uModelMatrix');
    shaderProgram.uViewMatrix = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
    shaderProgram.uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
    shaderProgram.uSampler = gl.getUniformLocation(shaderProgram, 'u_sampler');
    shaderProgram.uBaseColor = gl.getUniformLocation(shaderProgram, 'u_baseColor');
    shaderProgram.uTexColorWeight = gl.getUniformLocation(shaderProgram, 'u_texColorWeight');
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

function loadTexture(url, callback) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255])); // black as placeholder

    const image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        if (callback) callback();
    };
    image.src = url;
    return texture;
}

function initTextures() {
    cloudsTexture = loadTexture('clouds.png', renderScene);
    grassTexture = loadTexture('grass.png', renderScene);
    jacob1Texture = loadTexture('jacob1.png', renderScene);
    jacob2Texture = loadTexture('jacob2.png', renderScene);
    appleTexture = loadTexture('apple.png', renderScene);
}

function checkVictoryCondition() {
    let countOnes = 0;
    let countTwos = 0;
    for (let x = 0; x < map.length; x++) {
        for (let z = 0; z < map[x].length; z++) {
            if (map[x][z] === 1) countOnes++;
            if (map[x][z] === 2) countTwos++;
        }
    }
    return countTwos === 0 && countOnes >= 11;
}
function checkBadEndingCondition() {
    let countOnes = 0;
    map.forEach(row => row.forEach(value => {
        if (value === 1) countOnes++;
    }));
    return countOnes === 0;
}

let mapSize = 32;
let map = Array.from({ length: mapSize }, () => Array(mapSize).fill(0));

// 1 = jacob
// 2 = grass
// 3 = jacob box
// 4 = grass
// 5 = clouds
// 6 = green
// 7 = 2 stacked green
// 8 = 3 stacked green
// 9 = 4 stacked green
let solidColorCube = [0.2, 0.8, 0.2, 1]; // this is said solid color
map = [
    Array.from("78879789789778978789878978897897", x => parseInt(x)),
    Array.from("80000000000000000000000000000008", x => parseInt(x)),
    Array.from("80000000000000020000000000000009", x => parseInt(x)),
    Array.from("90000000000000000000000000000008", x => parseInt(x)),
    Array.from("70002000000000000000000000200007", x => parseInt(x)),
    Array.from("80000000000000000000000000000007", x => parseInt(x)),
    Array.from("80000000000000000000000000000009", x => parseInt(x)),
    Array.from("70000000000000000000000000000009", x => parseInt(x)),
    Array.from("90002000000000000000000000200009", x => parseInt(x)),
    Array.from("90000000000000000000000000000008", x => parseInt(x)),
    Array.from("80000000000000030103000000000008", x => parseInt(x)),
    Array.from("90000000000000000000000000000008", x => parseInt(x)),
    Array.from("70000000000000000000000000000007", x => parseInt(x)),
    Array.from("90000000000000000000000000000009", x => parseInt(x)),
    Array.from("80002000000000000000000000200008", x => parseInt(x)),
    Array.from("80000000000000000000000000000009", x => parseInt(x)),
    Array.from("70000000000000000000000000000009", x => parseInt(x)),
    Array.from("80000000000000000000000000000009", x => parseInt(x)),
    Array.from("90000000000000000000000000000008", x => parseInt(x)),
    Array.from("90000000000000000000000000000008", x => parseInt(x)),
    Array.from("80002000000000000000000000200007", x => parseInt(x)),
    Array.from("70000000000000000000000000000007", x => parseInt(x)),
    Array.from("70000000000000000000000000000007", x => parseInt(x)),
    Array.from("70000000000000000000000000000008", x => parseInt(x)),
    Array.from("80000000000000000000000000000009", x => parseInt(x)),
    Array.from("90000000000000000000000000000008", x => parseInt(x)),
    Array.from("70002000000000000000000000200007", x => parseInt(x)),
    Array.from("80000000000000000000000000000007", x => parseInt(x)),
    Array.from("80000000000000000000000000000008", x => parseInt(x)),
    Array.from("90000000000000002000000000000009", x => parseInt(x)),
    Array.from("90000000000000000000000000000008", x => parseInt(x)),
    Array.from("97878978989789778997879979787878", x => parseInt(x)),
];


let walls = [];

function createWorld() {
    walls = [];
    for (let x = 0; x < map.length; x++) {
        for (let z = 0; z < map[x].length; z++) {
            let rawType = map[x][z];
            let type = parseInt(rawType);
            let numBlocks = 1;

            if (type === 7) {
                numBlocks = 2;
            } else if (type === 8) {
                numBlocks = 3;
            } else if (type === 9) {
                numBlocks = 4;
            }

            if (type === 7 || type === 8 || type === 9) {
                for (let y = 0; y < numBlocks; y++) {
                    const modelMatrix = glMatrix.mat4.create();
                    glMatrix.mat4.translate(modelMatrix, modelMatrix, [(x - map.length / 2) * 6, 6 * y - 1.9, (z - map[x].length / 2) * 6]);
                    glMatrix.mat4.scale(modelMatrix, modelMatrix, [3, 3, 3]);
                    walls.push({
                        modelMatrix: modelMatrix,
                        color: solidColorCube,
                        texWeight: 0.0,
                        texture: null
                    });
                }
            } else if (type > 0 && type < 7) {
                const modelMatrix = glMatrix.mat4.create();
                glMatrix.mat4.translate(modelMatrix, modelMatrix, [(x - map.length / 2) * 6, -1.9, (z - map[x].length / 2) * 6]);
                glMatrix.mat4.scale(modelMatrix, modelMatrix, [3, 3, 3]);

                let texture = null;
                let color = [1, 1, 1, 1];
                let texWeight = 1.0;

                switch (type) {
                    case 1:
                        texture = jacob1Texture;
                        break;
                    case 2:
                        texture = appleTexture;
                        break;
                    case 3:
                        texture = jacob2Texture;
                        break;
                    case 4:
                        texture = grassTexture;
                        break;
                    case 5:
                        texture = cloudsTexture;
                        break;
                    case 6:
                        texture = null;
                        color = solidColorCube;
                        texWeight = 0.0;
                        break;
                }
                walls.push({
                    modelMatrix: modelMatrix,
                    color: color,
                    texWeight: texWeight,
                    texture: texture
                });
            }
        }
    }
}

function renderWorld() {
    walls.forEach(wall => {
        renderCube(wall.modelMatrix, wall.color, wall.texWeight, wall.texture);
    });
}

function renderScene() {
    if (!isVictory) {
        updateCamera();

    }
    gl.useProgram(shaderProgram);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (checkVictoryCondition() && !isVictory) {
        document.getElementById('victoryImage').style.display = 'block';
        isVictory = true; // Stop further updates
    } else if (checkBadEndingCondition() && !isVictory) {
        document.getElementById('badEndingImage').style.display = 'block';
        isVictory = true; // Stop further updates
    }
    // Hardcoded sky and ground
    const skyMatrix = glMatrix.mat4.create();
    glMatrix.mat4.scale(skyMatrix, skyMatrix, [100.0, 100.0, 100.0]);
    renderCube(skyMatrix, [0.0, 0.0, 1.0, 1.0], 0.0, cloudsTexture);

    const floorMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(floorMatrix, floorMatrix, [0, -5, 0]);
    glMatrix.mat4.scale(floorMatrix, floorMatrix, [100.0, 0.1, 100.0]);
    renderCube(floorMatrix, [0.0, 0.5, 0.0, 1.0], 1.0, grassTexture);
    renderWorld();
    if (!isVictory) {
        requestAnimationFrame(renderScene);
    }
}

function renderCube(modelMatrix, color, texWeight, texture) {
    gl.uniformMatrix4fv(shaderProgram.uModelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(shaderProgram.uViewMatrix, false, camera.viewMatrix);
    gl.uniformMatrix4fv(shaderProgram.uProjectionMatrix, false, camera.projectionMatrix);

    gl.uniform4fv(shaderProgram.uBaseColor, color);
    gl.uniform1f(shaderProgram.uTexColorWeight, texWeight);

    if (texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(shaderProgram.uSampler, 0);
    }

    if (!testCube) {
        const a_Position = gl.getAttribLocation(shaderProgram, 'a_position');
        const a_TexCoord = gl.getAttribLocation(shaderProgram, 'a_texCoord');
        testCube = new Cube(gl, a_Position, a_TexCoord, shaderProgram);
    }
    testCube.render();
}

document.addEventListener('DOMContentLoaded', function() {
    initWebGL();
    if (gl) {
        initShaders();
        initTextures();
        camera = new Camera(document.getElementById('glcanvas'));
        createWorld();
        renderScene();
    }
});
