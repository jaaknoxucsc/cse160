export class Sphere {
    constructor(gl, program, a_Position, a_Normal, latitudeBands = 30, longitudeBands = 30) {
        this.gl = gl;
        this.program = program;
        this.a_Position = a_Position;
        this.a_Normal = a_Normal;
        this.latitudeBands = latitudeBands;
        this.longitudeBands = longitudeBands;
        this.initBuffers();
    }

    initBuffers() {
        const vertexData = this.generateSphereVertices(this.latitudeBands, this.longitudeBands);
        this.vertexBuffer = this.createBuffer(new Float32Array(vertexData.vertices));
        this.normalBuffer = this.createBuffer(new Float32Array(vertexData.normals));
        this.indexBuffer = this.createBuffer(new Uint16Array(vertexData.indices), this.gl.ELEMENT_ARRAY_BUFFER);
        this.numIndices = vertexData.indices.length;
    }

    createBuffer(data, bufferType = this.gl.ARRAY_BUFFER) {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(bufferType, buffer);
        this.gl.bufferData(bufferType, data, this.gl.STATIC_DRAW);
        return buffer;
    }
    
    bindAttribute(buffer, attribute, size) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.vertexAttribPointer(attribute, size, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(attribute);
    }

    generateSphereVertices(latitudeBands, longitudeBands) {
        const vertices = [];
        const normals = [];
        const indices = [];
    
        const pi = Math.PI;
        const twoPi = 2 * pi;
    
        for (let lat = 0; lat <= latitudeBands; ++lat) {
            const theta = lat * pi / latitudeBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
    
            for (let lon = 0; lon <= longitudeBands; ++lon) {
                const phi = lon * twoPi / longitudeBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
    
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
    
                vertices.push(x, y, z);
                normals.push(x, y, z);
            }
        }
    
        for (let lat = 0; lat < latitudeBands; ++lat) {
            for (let lon = 0; lon < longitudeBands; ++lon) {
                const current = lat * (longitudeBands + 1) + lon;
                const next = current + longitudeBands + 1;
    
                indices.push(current, next, current + 1);
                indices.push(next, next + 1, current + 1);
            }
        }
    
        return { vertices, normals, indices };
    }
    
    render() {
        this.gl.useProgram(this.program);
        this.bindAttribute(this.vertexBuffer, this.a_Position, 3);
        this.bindAttribute(this.normalBuffer, this.a_Normal, 3);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.numIndices, this.gl.UNSIGNED_SHORT, 0);
    }
}
