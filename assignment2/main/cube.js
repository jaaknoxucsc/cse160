// cube.js
import { drawTriangle3D } from './triangle.js';

export class Cube {
    constructor(gl, a_Position, program, baseColor) {
        this.gl = gl;
        this.a_Position = a_Position;
        this.program = program;
        this.baseColor = baseColor.map(c => c / 255);
        this.initVertices();
    }

    initVertices() {
        const adjustColor = (color, amount) => color.map(n => Math.max(0.0, Math.min(1.0, (n * 255 + amount) / 255)));
        this.faces = [
            {
                vertices: [
                    -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0,
                    -1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,  1.0
                ],
                color: adjustColor(this.baseColor, 20)
            },
            {
                vertices: [
                     1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,
                     1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0
                ],
                color: adjustColor(this.baseColor, 20)
            },
            {
                vertices: [
                    -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,
                    -1.0,  1.0, -1.0,  1.0,  1.0,  1.0, -1.0,  1.0,  1.0
                ],
                color: adjustColor(this.baseColor, -20)
            },
            {
                vertices: [
                    -1.0, -1.0, -1.0,  1.0, -1.0, -1.0,  1.0, -1.0,  1.0,
                    -1.0, -1.0, -1.0,  1.0, -1.0,  1.0, -1.0, -1.0,  1.0
                ],
                color: adjustColor(this.baseColor, -20)
            },
            {
                vertices: [
                     1.0, -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,
                     1.0, -1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0
                ],
                color: adjustColor(this.baseColor, 0)
            },
            {
                vertices: [
                    -1.0, -1.0, -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,  1.0,
                    -1.0, -1.0, -1.0, -1.0,  1.0,  1.0, -1.0, -1.0,  1.0
                ],
                color: adjustColor(this.baseColor, 0)
            }
        ];
    }

    render() {
        this.gl.useProgram(this.program);
        const uColorLocation = this.gl.getUniformLocation(this.program, 'u_Color');
        this.gl.uniform4fv(uColorLocation, [...this.baseColor, 1]);
        this.faces.forEach(face => {
            this.gl.uniform4fv(uColorLocation, [...face.color, 1]);
            drawTriangle3D(this.gl, face.vertices, this.a_Position, this.program);
        });
    }
}
