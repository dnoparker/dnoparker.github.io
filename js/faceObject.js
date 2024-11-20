import * as THREE from 'three';

export class FaceObject {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        // Create a group to hold the object
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Initialize properties
        this.currentTween = null;

        // Add raycaster and mouse properties
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Bind methods if necessary
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
        this.swipeLeft = this.swipeLeft.bind(this);
        this.swipeRight = this.swipeRight.bind(this);
        this.onClick = this.onClick.bind(this);
    }

    /**
     * Initialize the object. To be implemented by subclasses.
     */
    initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }

    /**
     * Update the object. Can be overridden by subclasses.
     */
    update() {
        // Default update logic (if any)
    }

    /**
     * Render the object. Can be overridden by subclasses.
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Set up event listeners. Can be overridden by subclasses.
     */
    setupEventListeners() {
        // Default event listeners (if any)
    }

    /**
     * Handle swipe left gesture. To be overridden by subclasses.
     */
    swipeLeft() {
        // Default swipe left behavior (if any)
        console.log('Swipe left on generic FaceObject');
    }

    /**
     * Handle swipe right gesture. To be overridden by subclasses.
     */
    swipeRight() {
        // Default swipe right behavior (if any)
        console.log('Swipe right on generic FaceObject');
    }

    /**
     * Generic click handler. To be overridden by subclasses.
     * @param {Event} event - The click event
     */
    onClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.mouse.set(x, y);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.group.children, true);

        if (intersects.length > 0) {
            console.log('Generic click on FaceObject:', intersects[0].object);
        }
    }

    /**
     * Clean up resources when the object is removed.
     */
    dispose() {
        this.scene.remove(this.group);
        // Dispose geometries, materials, etc.
    }
}