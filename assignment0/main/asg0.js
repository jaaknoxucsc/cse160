function main() {
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');
  
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(1, -1);

    var v1 = new Vector3([2.25, 2.25, 0]);
    drawVector(v1, 'red', ctx);
}

function handleDrawEvent() {
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(1, -1);

    var x1 = parseFloat(document.getElementById('xCoord_v1').value);
    var y1 = parseFloat(document.getElementById('yCoord_v1').value);

    if (Number.isFinite(x1) && Number.isFinite(y1)) {
        var v1 = new Vector3([x1, y1, 0]);
        drawVector(v1, 'red', ctx);
    }

    var x2 = parseFloat(document.getElementById('xCoord_v2').value);
    var y2 = parseFloat(document.getElementById('yCoord_v2').value);

    if (Number.isFinite(x2) && Number.isFinite(y2)) {
        var v2 = new Vector3([x2, y2, 0]);
        drawVector(v2, 'blue', ctx);
    }
}
  
function drawVector(v, color, ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(v.elements[0] * 20, v.elements[1] * 20); 
    ctx.strokeStyle = color;
    ctx.stroke();
}

function angleBetween(v1, v2) {
    let dotProd = Vector3.dot(v1, v2);
    const mags = v1.magnitude() * v2.magnitude();
    if (mags == 0) return 0;
    
    const cosTheta = Math.max(-1, Math.min(1, dotProd / mags));
    return Math.acos(cosTheta) * (180 / Math.PI);
}

function areaTriangle(v1, v2) {
    const cross = Vector3.cross(v1, v2);
    const area = cross.magnitude();
    return area / 2;
}

function handleDrawOperationEvent() {
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(1, -1);

    var v1 = new Vector3([parseFloat(document.getElementById('xCoord_v1').value), parseFloat(document.getElementById('yCoord_v1').value), 0]);
    drawVector(v1, 'red', ctx);

    var v2 = new Vector3([parseFloat(document.getElementById('xCoord_v2').value), parseFloat(document.getElementById('yCoord_v2').value), 0]);
    drawVector(v2, 'blue', ctx);

    var operation = document.getElementById('operation').value;
    var scalar = parseFloat(document.getElementById('scalar').value);
    var v3, v4;

    switch (operation) {
        case 'add':
            v3 = new Vector3(v1.elements).add(v2);
            drawVector(v3, 'green', ctx);
            break;
        case 'sub':
            v3 = new Vector3(v1.elements).sub(v2);
            drawVector(v3, 'green', ctx);
            break;
        case 'mul':
            if (Number.isFinite(scalar)) {
                v3 = new Vector3(v1.elements).mul(scalar);
                v4 = new Vector3(v2.elements).mul(scalar);
                drawVector(v3, 'green', ctx);
                drawVector(v4, 'green', ctx);
            }
            break;
        case 'div':
            if (Number.isFinite(scalar) && scalar !== 0) {
                v3 = new Vector3(v1.elements).div(scalar);
                v4 = new Vector3(v2.elements).div(scalar);
                drawVector(v3, 'green', ctx);
                drawVector(v4, 'green', ctx);
            }
            break;
        case 'mag':
            console.log('Magnitude of v1:', v1.magnitude());
            console.log('Magnitude of v2:', v2.magnitude());
            break;
        case 'norm':
            var normV1 = new Vector3(v1.elements).normalize();
            drawVector(normV1, 'green', ctx);
            var normV2 = new Vector3(v2.elements).normalize();
            drawVector(normV2, 'green', ctx);
            break;
        case 'angle': 
            let angle = angleBetween(v1, v2)
            console.log(`Angle: ${angle.toFixed(2)}`); 
            break;
        case 'area':
            const area = areaTriangle(v1, v2);
            console.log(`Area of the triangle: ${area.toFixed(2)}`); 
            break;
  }
}

