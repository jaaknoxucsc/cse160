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
        this.yaw = -Math.PI / 2;
        this.pitch = 0;
        this.mouseSensitivity = 0.003;
        this.rotationSensitivity = 1.0;

        this.viewMatrix = glMatrix.mat4.create();
        this.projectionMatrix = glMatrix.mat4.create();
        this.initialHeight = this.eye[1];
        this.updateProjectionMatrix();
        this.updateViewMatrix();
    }

    updateProjectionMatrix() {
        glMatrix.mat4.perspective(this.projectionMatrix, this.fov, this.aspect, this.near, this.far);
    }
    updateViewMatrix() {
        let direction = glMatrix.vec3.create();
        direction[0] = Math.cos(this.pitch) * Math.sin(this.yaw);
        direction[1] = Math.sin(this.pitch);
        direction[2] = Math.cos(this.pitch) * Math.cos(this.yaw);
    
        glMatrix.vec3.add(this.at, this.eye, direction);
        glMatrix.mat4.lookAt(this.viewMatrix, this.eye, this.at, this.up);
    }
    rotate(deltaX, deltaY) {
        this.yaw -= deltaX * this.mouseSensitivity;
        this.pitch -= deltaY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    }
    
    moveForward(speed) {
        let direction = glMatrix.vec3.create();
        direction[0] = Math.sin(this.yaw);
        direction[1] = 0;
        direction[2] = Math.cos(this.yaw);
        glMatrix.vec3.scale(direction, direction, speed);
        glMatrix.vec3.add(this.eye, this.eye, direction);
        this.eye[1] = this.initialHeight;
        this.updateViewMatrix();
    }

    moveBackward(speed) {
        let direction = glMatrix.vec3.create();
        direction[0] = -Math.sin(this.yaw);
        direction[1] = 0;
        direction[2] = -Math.cos(this.yaw);
        glMatrix.vec3.scale(direction, direction, speed);
        glMatrix.vec3.add(this.eye, this.eye, direction);
        this.eye[1] = this.initialHeight;
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
        this.yaw += alpha * this.rotationSensitivity;
        this.updateViewMatrix();
    }

    panRight(alpha) {
        this.yaw -= alpha * this.rotationSensitivity;
        this.updateViewMatrix();
    }
}

export default Camera;
