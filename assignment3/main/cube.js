// cube.js
export class Cube {
    constructor(gl, a_Position, a_TexCoord, program, baseColor) {
        this.gl = gl;
        this.a_Position = a_Position;
        this.a_TexCoord = a_TexCoord;
        this.program = program;
        this.baseColor = baseColor || [1, 1, 1, 1];
        this.vertexBuffer = this.initVertices();
    }

    initVertices() {
        // Vertices for each face with texture coordinates (u, v) at end
        const vertices = [
            // Front face
            -1.0, -1.0,  1.0, 1, 0,
             1.0, -1.0,  1.0, 1, 1,
             1.0,  1.0,  1.0, 0, 1,
            -1.0, -1.0,  1.0, 1, 0,
             1.0,  1.0,  1.0, 0, 1,
            -1.0,  1.0,  1.0, 0, 0,

            // Back face
             1.0, -1.0, -1.0, 1, 0,
            -1.0, -1.0, -1.0, 0, 0,
            -1.0,  1.0, -1.0, 0, 1,
             1.0, -1.0, -1.0, 1, 0,
            -1.0,  1.0, -1.0, 0, 1,
             1.0,  1.0, -1.0, 1, 1,

            // Top face
            -1.0,  1.0, -1.0, 0, 0,
             1.0,  1.0, -1.0, 1, 0,
             1.0,  1.0,  1.0, 1, 1,
            -1.0,  1.0, -1.0, 0, 0,
             1.0,  1.0,  1.0, 1, 1,
            -1.0,  1.0,  1.0, 0, 1,

            // Bottom face
            -1.0, -1.0, -1.0, 1, 1,
             1.0, -1.0, -1.0, 0, 1,
             1.0, -1.0,  1.0, 0, 0,
            -1.0, -1.0, -1.0, 1, 1,
             1.0, -1.0,  1.0, 0, 0,
            -1.0, -1.0,  1.0, 1, 0,

            // Right face
             1.0, -1.0, -1.0, 1, 0,
             1.0,  1.0, -1.0, 1, 1,
             1.0,  1.0,  1.0, 0, 1,
             1.0, -1.0, -1.0, 1, 0,
             1.0,  1.0,  1.0, 0, 1,
             1.0, -1.0,  1.0, 0, 0,

            // Left face
            -1.0, -1.0, -1.0, 0, 0,
            -1.0,  1.0, -1.0, 1, 0,
            -1.0,  1.0,  1.0, 1, 1,
            -1.0, -1.0, -1.0, 0, 0,
            -1.0,  1.0,  1.0, 1, 1,
            -1.0, -1.0,  1.0, 0, 1
        ];

        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        return vertexBuffer;
    }

    render() {
        this.gl.useProgram(this.program);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);

        const stride = 5 * Float32Array.BYTES_PER_ELEMENT;
        this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, stride, 0);
        this.gl.enableVertexAttribArray(this.a_Position);
        this.gl.vertexAttribPointer(this.a_TexCoord, 2, this.gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
        this.gl.enableVertexAttribArray(this.a_TexCoord);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 36);
    }
}
