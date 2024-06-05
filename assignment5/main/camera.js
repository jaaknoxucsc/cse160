import * as THREE from '../lib/three.module.js';

class Camera {
    constructor(canvas, collisionObjects) {
        this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
        this.camera.position.set(0, 1.6, 5);
        this.yaw = -Math.PI / 2;
        this.pitch = 0;
        this.mouseSensitivity = 0.002;
        this.rotationSensitivity = 1.0;
        this.collisionObjects = collisionObjects;

        this.updateCameraDirection();
    }

    getObject() {
        return this.camera;
    }

    rotate(deltaX, deltaY) {
        this.yaw -= deltaX * this.mouseSensitivity;
        this.pitch -= deltaY * this.mouseSensitivity;
        const maxPitch = Math.PI / 2 - 0.1;
        this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
        this.updateCameraDirection();
    }

    updateCameraDirection() {
        const direction = new THREE.Vector3();
        direction.x = Math.cos(this.pitch) * Math.sin(this.yaw);
        direction.y = Math.sin(this.pitch);
        direction.z = Math.cos(this.pitch) * Math.cos(this.yaw);
        this.camera.lookAt(direction.add(this.camera.position));
    }

    moveForward(speed) {
        const direction = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        direction.normalize().multiplyScalar(speed);
        this.tryMove(direction);
    }

    moveBackward(speed) {
        this.moveForward(-speed);
    }

    moveLeft(speed) {
        const direction = new THREE.Vector3(Math.sin(this.yaw + Math.PI / 2), 0, Math.cos(this.yaw + Math.PI / 2));
        direction.normalize().multiplyScalar(speed);
        this.tryMove(direction);
    }

    moveRight(speed) {
        this.moveLeft(-speed);
    }

    panLeft(alpha) {
        this.yaw += alpha * this.rotationSensitivity;
        this.updateCameraDirection();
    }

    panRight(alpha) {
        this.panLeft(-alpha);
    }

    tryMove(direction) {
        const steps = 5;
        const stepDirection = direction.clone().divideScalar(steps);
        for (let i = 0; i < steps; i++) {
            const collisionResult = this.checkCollision(stepDirection);
            if (!collisionResult.collision) {
                this.camera.position.add(stepDirection);
            } else {
                let slideDirection = stepDirection.clone().projectOnPlane(collisionResult.normal);
                slideDirection.multiplyScalar(4.0);
    
                for (let j = 0; j < 5; j++) {
                    const slideCollision = this.checkCollision(slideDirection.clone().divideScalar(5));
                    if (!slideCollision.collision) {
                        this.camera.position.add(slideDirection.clone().divideScalar(5));
                    } else {
                        break;
                    }
                }
                break;
            }
        }
    }
    
    checkCollision(direction) {
        const nextPosition = this.camera.position.clone().add(direction);
        const playerBox = new THREE.Box3().setFromCenterAndSize(nextPosition, new THREE.Vector3(0.4, 1.6, 0.4));
    
        for (let obj of this.collisionObjects) {
            const objBox = new THREE.Box3().setFromObject(obj);
            if (playerBox.intersectsBox(objBox)) {
                const collisionNormal = getNormalFromBox3(objBox, nextPosition);
                return { collision: true, normal: collisionNormal };
            }
        }
        return { collision: false };
    }
}


function getNormalFromBox3(box, point) {
    const normals = [
        new THREE.Vector3(1, 0, 0),  // +x
        new THREE.Vector3(-1, 0, 0), // -x
        new THREE.Vector3(0, 1, 0),  // +y
        new THREE.Vector3(0, -1, 0), // -y
        new THREE.Vector3(0, 0, 1),  // +z
        new THREE.Vector3(0, 0, -1)  // -z
    ];

    const distances = [
        box.max.x - point.x, // +x
        point.x - box.min.x, // -x
        box.max.y - point.y, // +y
        point.y - box.min.y, // -y
        box.max.z - point.z, // +z
        point.z - box.min.z  // -z
    ];

    let minIndex = 0;
    let minDistance = distances[0];
    for (let i = 1; i < distances.length; i++) {
        if (distances[i] < minDistance) {
            minDistance = distances[i];
            minIndex = i;
        }
    }

    return normals[minIndex];
}



export default Camera;
