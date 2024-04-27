// asg2.js
import { Cube } from './cube.js';
let gl;
let shaderProgram;
let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
let cameraAngleX = 0;
let cameraAngleY = 0;
let squatProgress = 0;
let disableCameraControl = false;
let lowerLegRotationAngle = 0;
let animationActive = false;
let g_time = 0;
let animationStage = 0;
let lastTimeStamp = 0;
let cameraVerticalOffset = 0;

let frameCount = 0;
let elapsedTime = 0;
let fpsDisplayInterval = 1000;
let goblinVisible = true;

let showTemporaryCube = false;
let temporaryCubeTimer = 0;
const temporaryCubeDuration = 500;


function tick() {
    const now = Date.now();
    const deltaTime = now - lastTimeStamp;
    lastTimeStamp = now;

    frameCount++;
    elapsedTime += deltaTime;
    if (elapsedTime >= fpsDisplayInterval) {
        const fps = Math.round(frameCount * 1000 / elapsedTime);
        document.getElementById('fpsCounter').innerText = 'FPS: ' + fps;
        frameCount = 0;
        elapsedTime = 0;
    }

    if (showTemporaryCube && (now - temporaryCubeTimer > temporaryCubeDuration)) {
        showTemporaryCube = false;
        renderScene();
    }

    if (animationActive) {
        g_time += deltaTime;
        updateAnimationAngles(deltaTime);
        renderScene();
    }

    requestAnimationFrame(tick);
}

function updateAnimationAngles(deltaTime) {
    const animationSpeed = 0.01;
    let currentSquatValue, currentLowerLegValue;
    let squatSlider = document.getElementById('squat-animation-slider');
    let lowerLegSlider = document.getElementById('lower-leg-rotation-slider');
    lowerLegRotationAngle = parseFloat(lowerLegSlider.value) * Math.PI / 180;
    squatProgress = parseFloat(squatSlider.value);

    switch(animationStage) {
        case 0: // Top Leg 0 to max
            currentSquatValue = parseFloat(squatSlider.value);
            squatSlider.value = Math.min(1, currentSquatValue + animationSpeed * deltaTime);
            if (parseFloat(squatSlider.value) >= 1) {
                animationStage++;
            }
            break;
        case 1: // Bottom Leg 0 to 45
            cameraVerticalOffset = Math.min(2, cameraVerticalOffset + 2000 * deltaTime);
            currentLowerLegValue = parseFloat(lowerLegSlider.value);
            lowerLegSlider.value = Math.min(45, currentLowerLegValue + (45 * animationSpeed * deltaTime));
            if (parseFloat(lowerLegSlider.value) >= 45) {
                animationStage++;
            }
            break;
        case 2: // Bottom Leg 45 to 0
            currentLowerLegValue = parseFloat(lowerLegSlider.value);
            lowerLegSlider.value = Math.max(0, currentLowerLegValue - (45 * animationSpeed * deltaTime)); 
            if (parseFloat(lowerLegSlider.value) <= 0) {
                animationStage++;
            }
            break;
        case 3: // Top Leg max to min
            cameraVerticalOffset = Math.max(0, cameraVerticalOffset - 2000 * deltaTime);
            currentSquatValue = parseFloat(squatSlider.value);
            squatSlider.value = Math.max(0, currentSquatValue - animationSpeed * deltaTime);
            if (parseFloat(squatSlider.value) <= 0) {
                animationStage = 0;
            }
            break;
    }
}


document.getElementById('animation-toggle').addEventListener('click', function() {
    animationActive = !animationActive;
    cameraVerticalOffset = 0;
});

document.getElementById('lower-leg-rotation-slider').addEventListener('input', function() {
    lowerLegRotationAngle = parseFloat(this.value) * Math.PI / 180;
    disableCameraControl = true;
    renderScene();
});

document.getElementById('lower-leg-rotation-slider').addEventListener('mouseup', function() {
    disableCameraControl = false;
});

document.getElementById('squat-animation-slider').addEventListener('input', function(event) {
    squatProgress = parseFloat(this.value);
    disableCameraControl = true;
    renderScene();
});

document.getElementById('squat-animation-slider').addEventListener('mouseup', function(event) {
    disableCameraControl = false;
});


document.addEventListener('mousedown', function(event) {
    if (!disableCameraControl) {
        isDragging = true;
        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }
});

document.addEventListener('mouseup', function(event) {
    isDragging = false;
});

document.addEventListener('mousemove', function(event) {
    if (isDragging && !disableCameraControl) {
        const deltaX = event.clientX - previousMouseX;
        const deltaY = event.clientY - previousMouseY;
        
        cameraAngleX -= deltaX * 0.005;
        cameraAngleY += deltaY * 0.005;
        cameraAngleY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleY));

        renderScene();

        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }
});


document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('glcanvas');
    initWebGL();
    if (gl) {
        initShaders();
        renderScene();
        lastTimeStamp = Date.now();
        tick();
        canvas.addEventListener('click', function(event) {
            if (event.shiftKey) {
                goblinVisible = !goblinVisible;
                showTemporaryCube = true;
                temporaryCubeTimer = Date.now();
                renderScene();
            }
        });
    }
});

function initWebGL() {
    const canvas = document.getElementById('glcanvas');
    gl = canvas.getContext('webgl');
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.depthFunc(gl.LEQUAL);
}

function initShaders() {
    const vsSource = `
        attribute vec4 a_position;
        uniform mat4 uModelViewProjectionMatrix;
        uniform vec4 u_Color;
        varying vec4 v_Color;

        void main() {
            gl_Position = uModelViewProjectionMatrix * a_position;
            v_Color = u_Color;
        }
    `;

    const fsSource = `
        precision mediump float;
        varying vec4 v_Color;

        void main() {
            gl_FragColor = v_Color;
        }
    `;

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    gl.useProgram(shaderProgram);

    shaderProgram.uModelViewProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uModelViewProjectionMatrix');
    shaderProgram.uColor = gl.getUniformLocation(shaderProgram, 'u_Color');
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shaderProgram);

    const projectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionMatrix, Math.PI / 4, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 100);

    const radius = 40;
    const cameraX = Math.sin(cameraAngleX) * Math.cos(cameraAngleY) * radius;
    const cameraY = Math.sin(cameraAngleY) * radius + 20 - cameraVerticalOffset;
    const cameraZ = Math.cos(cameraAngleX) * Math.cos(cameraAngleY) * radius;
    const cameraPosition = [cameraX, cameraY, cameraZ];
    const upVector = [0, 1, 0];

    const viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.lookAt(viewMatrix, cameraPosition, [0, 0, 0], upVector);

    function renderCube(transformationMatrix, baseColor) {
        const mvpMatrix = glMatrix.mat4.create();
        glMatrix.mat4.multiply(mvpMatrix, viewMatrix, transformationMatrix);
        glMatrix.mat4.multiply(mvpMatrix, projectionMatrix, mvpMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'uModelViewProjectionMatrix'), false, mvpMatrix);
        const cube = new Cube(gl, gl.getAttribLocation(shaderProgram, 'a_position'), shaderProgram, baseColor);
        cube.render();
    }

    if (goblinVisible) {
        let leg1Rotation = glMatrix.glMatrix.toRadian(15 + 30 * squatProgress);
        let leg2Rotation = glMatrix.glMatrix.toRadian(-15 - 30 * squatProgress);
        
        let pantsMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(pantsMatrix, pantsMatrix, [0, -3, 0]);
        glMatrix.mat4.scale(pantsMatrix, pantsMatrix, [1.7, 0.7, 1.2]);
        renderCube(pantsMatrix, [150, 75, 0]);

        let pants2Matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(pants2Matrix, pants2Matrix, [0, -3.2, 0]);
        glMatrix.mat4.scale(pants2Matrix, pants2Matrix, [0.7, 1.0, 1.2]);
        renderCube(pants2Matrix, [150, 75, 0]);

        let bottomMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(bottomMatrix, bottomMatrix, [0, -1.5, 0]);
        glMatrix.mat4.scale(bottomMatrix, bottomMatrix, [1.5, 2.5, 1]);
        renderCube(bottomMatrix, [0, 102, 0]);

        // Middle Cube
        let middleMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(middleMatrix, middleMatrix, [0, 1, 0]);
        glMatrix.mat4.scale(middleMatrix, middleMatrix, [2, 1.75, 1.5]);
        renderCube(middleMatrix, [0, 111, 0]);

        // Top Body
        let topMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(topMatrix, topMatrix, [0, 3.5, 0]); 
        glMatrix.mat4.scale(topMatrix, topMatrix, [2.5, 1.75, 2]); 
        renderCube(topMatrix, [0, 120, 0]); 

        // Head
        let headMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(headMatrix, headMatrix, [0, 8, 0]); 
        glMatrix.mat4.scale(headMatrix, headMatrix, [3, 2, 2.5]); 
        renderCube(headMatrix, [0, 128, 0]);

        let neckMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(neckMatrix, neckMatrix, [0, 6, 0]); 
        glMatrix.mat4.scale(neckMatrix, neckMatrix, [1.5, 1, 1.5]); 
        renderCube(neckMatrix, [0, 125, 0]);

        // Arms
        let armMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(armMatrix, armMatrix, [3, 3, 0]); 
        glMatrix.mat4.rotateZ(armMatrix, armMatrix, glMatrix.glMatrix.toRadian(15));
        glMatrix.mat4.scale(armMatrix, armMatrix, [0.5, 2.5, 0.5]); 
        renderCube(armMatrix, [0, 128, 0]);

        let arm2Matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(arm2Matrix, arm2Matrix, [-3, 3, 0]); 
        glMatrix.mat4.rotateZ(arm2Matrix, arm2Matrix, glMatrix.glMatrix.toRadian(-15));
        glMatrix.mat4.scale(arm2Matrix, arm2Matrix, [0.5, 2.5, 0.5]); 
        renderCube(arm2Matrix, [0, 128, 0]);

        let lowerArmMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(lowerArmMatrix, lowerArmMatrix, [3.5, -1, 0]); 
        glMatrix.mat4.scale(lowerArmMatrix, lowerArmMatrix, [0.5, 2.5, 0.5]); 
        renderCube(lowerArmMatrix, [0, 128, 0]);

        let lowerArm2Matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(lowerArm2Matrix, lowerArm2Matrix, [-3.5, -1, 0]); 
        glMatrix.mat4.scale(lowerArm2Matrix, lowerArm2Matrix, [0.5, 2.5, 0.5]); 
        renderCube(lowerArm2Matrix, [0, 128, 0]);

        // Upper leg 1
        let leg1Matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(leg1Matrix, leg1Matrix, [1.4, -4, 0]);
        glMatrix.mat4.rotateZ(leg1Matrix, leg1Matrix, leg1Rotation);
        glMatrix.mat4.translate(leg1Matrix, leg1Matrix, [0, -1.5, 0]);
        glMatrix.mat4.scale(leg1Matrix, leg1Matrix, [0.5, 3, 0.8]);
        renderCube(leg1Matrix, [0, 128, 0]);

        // Upper leg 2
        let leg2Matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(leg2Matrix, leg2Matrix, [-1.6, -4, 0]);
        glMatrix.mat4.rotateZ(leg2Matrix, leg2Matrix, leg2Rotation);
        glMatrix.mat4.translate(leg2Matrix, leg2Matrix, [0, -1.5, 0]);
        glMatrix.mat4.scale(leg2Matrix, leg2Matrix, [0.5, 3, 0.7]);
        renderCube(leg2Matrix, [0, 128, 0]);

        // Lower leg 1
        let lowerLeg1Matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(lowerLeg1Matrix, lowerLeg1Matrix, [2.65 + 1.6 * squatProgress, -11 + 1 * squatProgress, 0]);
        glMatrix.mat4.translate(lowerLeg1Matrix, lowerLeg1Matrix, [0, 3, 0]);
        glMatrix.mat4.rotateZ(lowerLeg1Matrix, lowerLeg1Matrix, lowerLegRotationAngle);
        glMatrix.mat4.translate(lowerLeg1Matrix, lowerLeg1Matrix, [0, -3, 0]);
        glMatrix.mat4.scale(lowerLeg1Matrix, lowerLeg1Matrix, [0.5, 3, 0.8]);
        renderCube(lowerLeg1Matrix, [0, 128, 0]);

        // Lower leg 2
        let lowerLeg2Matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(lowerLeg2Matrix, lowerLeg2Matrix, [-2.9 - 1.6 * squatProgress, -11 + 1 * squatProgress, 0]);
        glMatrix.mat4.translate(lowerLeg2Matrix, lowerLeg2Matrix, [0, 3, 0]);
        glMatrix.mat4.rotateZ(lowerLeg2Matrix, lowerLeg2Matrix, -lowerLegRotationAngle);
        glMatrix.mat4.translate(lowerLeg2Matrix, lowerLeg2Matrix, [0, -3, 0]);
        glMatrix.mat4.scale(lowerLeg2Matrix, lowerLeg2Matrix, [0.5, 3, 0.7]);
        renderCube(lowerLeg2Matrix, [0, 128, 0]);



        // Eyes
        let eyeMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(eyeMatrix, eyeMatrix, [1.5, 8.5, 2]); 
        glMatrix.mat4.scale(eyeMatrix, eyeMatrix, [1, .75, 1]); 
        renderCube(eyeMatrix, [255, 255, 170]);

        let eye2Matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(eye2Matrix, eye2Matrix, [-1.5, 8.5, 2]); 
        glMatrix.mat4.scale(eye2Matrix, eye2Matrix, [1, .75, 1]); 
        renderCube(eye2Matrix, [255, 255, 170]);

        let pupil = glMatrix.mat4.create();
        glMatrix.mat4.translate(pupil, pupil, [1.5, 8.5, 2.8]); 
        glMatrix.mat4.scale(pupil, pupil, [.25, .25, .25]); 
        renderCube(pupil, [0, 0, 0]);

        let pupil2 = glMatrix.mat4.create();
        glMatrix.mat4.translate(pupil2, pupil2, [-1.5, 8.5, 2.8]); 
        glMatrix.mat4.scale(pupil2, pupil2, [.25, .25, .25]); 
        renderCube(pupil2, [0, 0, 0]);


        // Mouth
        let mouthMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(mouthMatrix, mouthMatrix, [0, 6.5, 2]); 
        glMatrix.mat4.scale(mouthMatrix, mouthMatrix, [2, .2, 1]); 
        renderCube(mouthMatrix, [0, 0, 0]);

        // Ears
        let earMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(earMatrix, earMatrix, [3, 9.5, 0]); 
        glMatrix.mat4.scale(earMatrix, earMatrix, [0.1, 1.75, 1]); 
        renderCube(earMatrix, [0, 150, 0]);
        let tipearMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(tipearMatrix, tipearMatrix, [3, 10, 0]); 
        glMatrix.mat4.scale(tipearMatrix, tipearMatrix, [0.1, 1.75, 0.5]); 
        renderCube(tipearMatrix, [0, 150, 0]);

        let ear2Matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(ear2Matrix, ear2Matrix, [-3, 9.5, 0]); 
        glMatrix.mat4.scale(ear2Matrix, ear2Matrix, [0.1, 1.75, 1]); 
        renderCube(ear2Matrix, [0, 150, 0]);
        let tipear2Matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(tipear2Matrix, tipear2Matrix, [-3, 10, 0]); 
        glMatrix.mat4.scale(tipear2Matrix, tipear2Matrix, [0.1, 1.75, 0.5]); 
        renderCube(tipear2Matrix, [0, 150, 0]);
    }

    // Explosion
    if (showTemporaryCube) {
        let matrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(matrix, matrix, [0, 0, 0]);
        glMatrix.mat4.scale(matrix, matrix, [11, 11, 11]);
        renderCube(matrix, [255, 255, 0]);
        let matrix2 = glMatrix.mat4.create();
        glMatrix.mat4.translate(matrix2, matrix2, [4, 0, 0]);
        glMatrix.mat4.scale(matrix2, matrix2, [8, 7, 11.5]);
        renderCube(matrix2, [255, 165, 0]);
        let matrix3 = glMatrix.mat4.create();
        glMatrix.mat4.translate(matrix3, matrix3, [-4, 0, -2]);
        glMatrix.mat4.scale(matrix3, matrix3, [8, 11.7, 7]);
        renderCube(matrix3, [255, 165, 0]);
    }
}
