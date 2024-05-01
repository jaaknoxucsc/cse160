// asg3.js
import { Cube } from './cube.js';
import Camera from './camera.js';

let gl;
let shaderProgram;
let cloudsTexture, grassTexture;
let testCube;
let camera;

document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'w': camera.moveForward(1); break;
        case 's': camera.moveBackward(1); break;
        case 'a': camera.moveLeft(1); break;
        case 'd': camera.moveRight(1); break;
        case 'q': camera.panLeft(0.2); break;
        case 'e': camera.panRight(0.2); break;
    }
    renderScene();
});


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
            v_texCoord = a_texCoord;
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
}

let mapSize = 32;
let map = Array.from({ length: mapSize }, () => Array(mapSize).fill(0));

// 1 = clouds
// 2 = grass
// 3 = solid color
let solidColorCube = [0.2, 0.8, 0.2, 1]; // this is said solid color
map[1][10] = 1;
map[1][11] = 1;
map[31][10] = 1;
map[15][10] = 1;
map[16][10] = 3;
map[31][15] = 1;
map[31][16] = 1;

let walls = [];

function createWorld() {
    walls = [];
    for (let x = 0; x < mapSize; x++) {
        for (let z = 0; z < mapSize; z++) {
            let type = map[x][z];
            if (type > 0) {
                const modelMatrix = glMatrix.mat4.create();
                glMatrix.mat4.translate(modelMatrix, modelMatrix, [(x - mapSize / 2) * 6, 0, (z - mapSize / 2) * 6]);
                glMatrix.mat4.scale(modelMatrix, modelMatrix, [2, 2, 2]);

                let texture = cloudsTexture;
                let color = [1, 1, 1, 1];
                let texWeight = 1.0;

                switch (type) {
                    case 1:
                        texture = cloudsTexture;
                        break;
                    case 2:
                        texture = grassTexture;
                        break;
                    case 3:
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
    gl.useProgram(shaderProgram);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Hardcoded sky and ground
    const skyMatrix = glMatrix.mat4.create();
    glMatrix.mat4.scale(skyMatrix, skyMatrix, [100.0, 100.0, 100.0]);
    renderCube(skyMatrix, [0.0, 0.0, 1.0, 1.0], 0.0, cloudsTexture);

    const floorMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(floorMatrix, floorMatrix, [0, -5, 0]);
    glMatrix.mat4.scale(floorMatrix, floorMatrix, [100.0, 0.1, 100.0]);
    renderCube(floorMatrix, [0.0, 0.5, 0.0, 1.0], 1.0, grassTexture);

    renderWorld(); // populates world with objects

    requestAnimationFrame(renderScene); // works better than ticks for performance ??? I think ??? might bite me later
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
