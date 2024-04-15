let canvas, gl, program;
let currentShape = 'point';
let shapeSize = 10;
let circleSegments = 10;
let color = [1.0, 0.0, 0.0, 1.0];
let mouseDown = false;
let raveMode = false;
let raveInterval;

function toggleRaveMode() {
    raveMode = !raveMode;
    if (raveMode) {
        startRaveMode();
    } else {
        stopRaveMode();
    }
}

function startRaveMode() {
    raveInterval = setInterval(() => {
        shapes.forEach(shape => {
            shape.color = [Math.random(), Math.random(), Math.random(), 1.0];
        });
        document.getElementById('redSlider').value = Math.floor(Math.random() * 256);
        document.getElementById('greenSlider').value = Math.floor(Math.random() * 256);
        document.getElementById('blueSlider').value = Math.floor(Math.random() * 256);
        redrawAllShapes();
    }, 100);
}

function stopRaveMode() {
    clearInterval(raveInterval);
}

function redrawAllShapes() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shapes.forEach(shape => {
        drawShape(shape.x, shape.y, shape.size, shape.segments);
    });
}


document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('drawingCanvas');
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    initShaders();

    canvas.addEventListener('mousedown', () => { mouseDown = true; drawShape(event.clientX, event.clientY);});
    canvas.addEventListener('mouseup', () => { mouseDown = false; });
    canvas.addEventListener('mousemove', handleMouseMove);

    document.getElementById('clearButton').addEventListener('click', clearCanvas);
});
let u_FragColorLocation;

function initShaders() {
    const vsSource = `
        attribute vec4 a_Position;
        void main() {
            gl_Position = a_Position;
            gl_PointSize = 10.0;
        }
    `;
    const fsSource = `
        precision mediump float;
        uniform vec4 u_FragColor;
        void main() {
            gl_FragColor = u_FragColor;
        }
    `;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vsSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fsSource);
    gl.compileShader(fragmentShader);

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.program = program;
    u_FragColorLocation = gl.getUniformLocation(program, 'u_FragColor');
    return true;
}

let shapes = [];

function drawShape(clientX, clientY) {
    let normalizedX = (clientX / canvas.width) * 2 - 1;
    let normalizedY = -(clientY / canvas.height) * 2 + 1;

    if (currentShape === 'triangle') {
        let height = shapeSize / canvas.height * 0.5;
        let width = shapeSize / canvas.width * 0.5;

        let vertices = [
            [normalizedX, normalizedY + height],
            [normalizedX - width, normalizedY - height],
            [normalizedX + width, normalizedY - height] 
        ];

        shapes.push({
            type: 'triangle',
            vertices: vertices,
            color: [...color]
        });
    } else {
        let currentSize = shapeSize;
        let currentSegments = circleSegments;

        shapes.push({
            type: currentShape,
            x: normalizedX,
            y: normalizedY,
            size: currentSize,
            segments: currentSegments,
            color: [...color]
        });
    }

    redrawAllShapes();
}

let drawTrianglesFlag = false;

document.getElementById('drawTrianglesButton').addEventListener('click', function() {
    drawTrianglesFlag = true;
    redrawAllShapes();
});

document.getElementById('clearButton').addEventListener('click', function() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shapes = [];
    drawTrianglesFlag = false;
});

function redrawAllShapes() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    if(drawTrianglesFlag) {
        drawing();
    }

    shapes.forEach(shape => {
        gl.uniform4fv(u_FragColorLocation, new Float32Array(shape.color));
        switch (shape.type) {
            case 'circle':
                drawCircle(shape.x, shape.y, shape.size, shape.segments);
                break;
            case 'triangle':
                drawTriangle(shape.vertices, shape.color, true);
                break;
            case 'point':
                drawPoint(shape.x, shape.y);
                break;
        }
    });
}

function drawPoint(x, y) {
    let pointPosition = new Float32Array([x, y]);
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pointPosition, gl.STATIC_DRAW);

    let a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(positionBuffer);
}

function drawCircle(x, y, size, numSegments) {
    let vertices = [];
    const angleStep = Math.PI * 2 / numSegments;
    const radius = size / canvas.width;
    for (let i = 0; i <= numSegments; i++) {
        vertices.push(x + Math.cos(i * angleStep) * radius);
        vertices.push(y + Math.sin(i * angleStep) * radius);
    }

    let circleBuffer = new Float32Array(vertices);
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, circleBuffer, gl.STATIC_DRAW);

    let a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, numSegments + 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(positionBuffer);
}

function drawTriangle(vertices, color, normalized = false) {
    let triangleVertices;
    if (!normalized) {
        triangleVertices = vertices.map(vertex => [
            (vertex[0] / canvas.width) * 2 - 1,
            -((vertex[1] / canvas.height) * 2 - 1)
        ]).flat();
    } else {
        triangleVertices = vertices.flat();
    }

    let triangleBuffer = new Float32Array(triangleVertices);
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleBuffer, gl.STATIC_DRAW);

    let a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.uniform4fv(u_FragColorLocation, new Float32Array(color));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(positionBuffer);
}

function handleMouseMove(event) {
    if (mouseDown) {
        drawShape(event.clientX, event.clientY);
    }
}

function setCurrentShape(shape) {
    currentShape = shape;
}

function updateSize(size) {
    shapeSize = size;
}

function updateSegments(segments) {
    circleSegments = segments;
}

function updateColor() {
    const r = document.getElementById('redSlider').value / 255;
    const g = document.getElementById('greenSlider').value / 255;
    const b = document.getElementById('blueSlider').value / 255;
    color = [r, g, b, 1.0];
}

function clearCanvas() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shapes = [];
}

const hardcodedTriangles = [
    //left leg
    {vertices: [[50, 350], [80, 350], [80, 320]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green
    {vertices: [[80, 350], [80, 250], [120, 250]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green

    //right leg
    {vertices: [[160, 350], [160, 250], [120, 250]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green
    {vertices: [[190, 350], [160, 350], [160, 320]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green

    //torso
    {vertices: [[80, 250], [160, 250], [140, 120]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green
    {vertices: [[80, 250], [80, 120], [140, 120]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green

    //left arm
    {vertices: [[80, 120], [70, 220], [50, 220]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green
    {vertices: [[70, 240], [70, 220], [50, 220]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green

    //claws
    {vertices: [[70, 240], [64, 240], [64, 230]], color: [0.5, 0.5, 0.5, 1.0]}, // Gray
    {vertices: [[64, 235], [58, 235], [58, 225]], color: [0.5, 0.5, 0.5, 1.0]}, // Gray
    {vertices: [[58, 230], [54, 230], [54, 220]], color: [0.5, 0.5, 0.5, 1.0]}, // Gray

    //right arm
    {vertices: [[140, 120], [240, 140], [240, 120]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green
    {vertices: [[240, 140], [270, 140], [240, 120]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green

    //claws
    {vertices: [[240, 140], [250, 140], [245, 150]], color: [0.5, 0.5, 0.5, 1.0]}, // Gray
    {vertices: [[250, 140], [260, 140], [255, 150]], color: [0.5, 0.5, 0.5, 1.0]}, // Gray
    {vertices: [[260, 140], [270, 140], [265, 150]], color: [0.5, 0.5, 0.5, 1.0]}, // Gray

    //head
    {vertices: [[80, 120], [80, 70], [140, 70]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green
    {vertices: [[85, 50], [80, 70], [90, 70]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green
    {vertices: [[95, 50], [90, 70], [100, 70]], color: [0.0, 0.5, 0.0, 1.0]}, // Goblin green

    //eye
    {vertices: [[95, 80], [90, 80], [100, 90]], color: [1.0, 1.0, 0.0, 1.0]}, // Yellow

    //teeth
    {vertices: [[140, 80], [125, 80], [140, 70]], color: [1.0, 1.0, 0.9, 1.0]}, // Yellowish white
    {vertices: [[110, 90], [125, 80], [125, 90]], color: [1.0, 1.0, 0.9, 1.0]}, // Yellowish white
    {vertices: [[140, 120], [130, 120], [135, 110]], color: [1.0, 1.0, 0.9, 1.0]}, // Yellowish white
    {vertices: [[130, 120], [120, 120], [125, 110]], color: [1.0, 1.0, 0.9, 1.0]} // Yellowish white
];

function drawing() {
    hardcodedTriangles.forEach(triangle => {
        drawTriangle(triangle.vertices, triangle.color, false);
    });
}