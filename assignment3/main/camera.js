// camera.js
class Camera {
    constructor(canvas) {
        this.fov = 60 * Math.PI / 180;
        this.aspect = canvas.width / canvas.height;
        this.near = 0.1;
        this.far = 1000;
        this.eye = glMatrix.vec3.fromValues(0, 0, 5);
        this.at = glMatrix.vec3.fromValues(0, 0, 0);
        this.up = glMatrix.vec3.fromValues(0, 1, 0);

        this.viewMatrix = glMatrix.mat4.create();
        this.projectionMatrix = glMatrix.mat4.create();
        this.updateProjectionMatrix();
        this.updateViewMatrix();
    }

    updateProjectionMatrix() {
        glMatrix.mat4.perspective(this.projectionMatrix, this.fov, this.aspect, this.near, this.far);
    }

    updateViewMatrix() {
        glMatrix.mat4.lookAt(this.viewMatrix, this.eye, this.at, this.up);
    }

    moveForward(speed) {
        let f = glMatrix.vec3.create();
        glMatrix.vec3.subtract(f, this.at, this.eye);
        glMatrix.vec3.normalize(f, f);
        glMatrix.vec3.scale(f, f, speed);
        glMatrix.vec3.add(this.eye, this.eye, f);
        glMatrix.vec3.add(this.at, this.at, f);
        this.updateViewMatrix();
    }

    moveBackward(speed) {
        let b = glMatrix.vec3.create();
        glMatrix.vec3.subtract(b, this.eye, this.at);
        glMatrix.vec3.normalize(b, b);
        glMatrix.vec3.scale(b, b, speed);
        glMatrix.vec3.add(this.eye, this.eye, b);
        glMatrix.vec3.add(this.at, this.at, b);
        this.updateViewMatrix();
    }

    moveLeft(speed) {
        let f = glMatrix.vec3.create();
        let s = glMatrix.vec3.create();
        glMatrix.vec3.subtract(f, this.at, this.eye);
        glMatrix.vec3.cross(s, this.up, f);
        glMatrix.vec3.normalize(s, s);
        glMatrix.vec3.scale(s, s, speed);
        glMatrix.vec3.add(this.eye, this.eye, s);
        glMatrix.vec3.add(this.at, this.at, s);
        this.updateViewMatrix();
    }

    moveRight(speed) {
        let f = glMatrix.vec3.create();
        let s = glMatrix.vec3.create();
        glMatrix.vec3.subtract(f, this.at, this.eye);
        glMatrix.vec3.cross(s, f, this.up);
        glMatrix.vec3.normalize(s, s);
        glMatrix.vec3.scale(s, s, speed);
        glMatrix.vec3.add(this.eye, this.eye, s);
        glMatrix.vec3.add(this.at, this.at, s);
        this.updateViewMatrix();
    }

    panLeft(alpha) {
        let f = glMatrix.vec3.create();
        let rotationMatrix = glMatrix.mat4.create();
        glMatrix.vec3.subtract(f, this.at, this.eye);
        glMatrix.mat4.rotateY(rotationMatrix, rotationMatrix, alpha);
        glMatrix.vec3.transformMat4(f, f, rotationMatrix);
        glMatrix.vec3.add(this.at, this.eye, f);
        this.updateViewMatrix();
    }

    panRight(alpha) {
        let f = glMatrix.vec3.create();
        let rotationMatrix = glMatrix.mat4.create();
        glMatrix.vec3.subtract(f, this.at, this.eye);
        glMatrix.mat4.rotateY(rotationMatrix, rotationMatrix, -alpha);
        glMatrix.vec3.transformMat4(f, f, rotationMatrix);
        glMatrix.vec3.add(this.at, this.eye, f);
        this.updateViewMatrix();
    }
}

export default Camera;
