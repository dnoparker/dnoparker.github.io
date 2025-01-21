import * as THREE from 'three';
import { FaceObject } from './faceObject.js';
import { tones } from './tones.js';

export class FaceDots extends FaceObject {
    constructor(scene, camera, renderer) {
        super(scene, camera, renderer);
        this.dots = [];
        this.currentToneIndex = 0; // Default to first tone
        this.dotMaterial = new THREE.MeshBasicMaterial({ 
            color: this.getCurrentToneColor(),
            side: THREE.DoubleSide // Ensure the disc is visible from both sides
        });
        this.dotGeometry = new THREE.CircleGeometry(0.08, 32); // Doubled the size
        this.initialize();

        // Add event listener for tone selection
        document.addEventListener('toneSelected', (event) => {
            const index = event.detail.index;
            this.currentToneIndex = index;
            this.setColor(this.getCurrentToneColor());
        });
    }

    initialize() {
        // Create dots for each facial landmark
        for (let i = 0; i < 468; i++) {
            const dot = new THREE.Mesh(this.dotGeometry, this.dotMaterial);
            dot.rotation.y = Math.PI; // Rotate 90 degrees on y axis to face forward
            this.dots.push(dot);
            this.group.add(dot);
        }

        // Add event listeners for mouse interactions
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    update() {

    }

    onMouseDown(event) {
        event.preventDefault();
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.dots);
        if (intersects.length > 0) {
            this.selectedDot = intersects[0].object;
            this.selectedDot.isBeingDragged = true;
        }
    }

    onMouseMove(event) {
        event.preventDefault();
        if (this.selectedDot) {
            this.updateMousePosition(event);
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.group);
            if (intersects.length > 0) {
                const newPosition = intersects[0].point;
                this.selectedDot.position.copy(newPosition);
                this.snapToNearestAnchor(this.selectedDot);
            }
        }
    }

    onMouseUp(event) {
        event.preventDefault();
        if (this.selectedDot) {
            this.selectedDot.isBeingDragged = false;
            this.selectedDot = null;
        }
    }

    updateMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    snapToNearestAnchor(dot) {
        if (this.faceLandmarks) {
            let nearestIndex = 0;
            let minDistance = Infinity;
            this.faceLandmarks.forEach((landmark, index) => {
                const distance = dot.position.distanceTo(new THREE.Vector3(landmark.x, -landmark.y, landmark.z));
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestIndex = index;
                }
            });
            const nearestLandmark = this.faceLandmarks[nearestIndex];
            dot.position.set(nearestLandmark.x, -nearestLandmark.y, nearestLandmark.z);
        }
    }

    getCurrentToneColor() {
        return new THREE.Color(tones[this.currentToneIndex].hex);
    }

    setColor(color) {
        this.dotMaterial.color.set(color);
    }

    setSize(size) {
        this.dots.forEach(dot => {
            dot.scale.set(size, size, size);
        });
    }

    // Override methods from FaceObject if needed
    onClick(event) {
        super.onClick(event);
        console.log('Clicked on FaceDots');
    }

    swipeLeft() {
        console.log('Swiped left on FaceDots');
        this.currentToneIndex = (this.currentToneIndex - 1 + tones.length) % tones.length;
        this.setColor(this.getCurrentToneColor());
        
        // Update UI circles
        import('./tones.js').then(module => {
            module.updateUISelection(this.currentToneIndex);
        });
        
        console.log(`Changed color to ${tones[this.currentToneIndex].name}`);
    }

    swipeRight() {
        console.log('Swiped right on FaceDots');
        this.currentToneIndex = (this.currentToneIndex + 1) % tones.length;
        this.setColor(this.getCurrentToneColor());
        
        // Update UI circles
        import('./tones.js').then(module => {
            module.updateUISelection(this.currentToneIndex);
        });
        
        console.log(`Changed color to ${tones[this.currentToneIndex].name}`);
    }

    // Add new method to set default tone
    setDefaultTone(index) {
        this.currentToneIndex = index;
        this.setColor(this.getCurrentToneColor());
    }
}
