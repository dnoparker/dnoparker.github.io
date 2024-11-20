import * as THREE from 'three';
import '@tweenjs/tween.js';
import { tones } from './tones.js';
import { FaceObject } from './faceObject.js';

/**
 * WedgeChart class to manage pie chart slices within an existing Three.js scene.
 * Inherits from FaceObject.
 */
export class WedgeChart extends FaceObject {
    constructor(scene, camera, renderer) {
        super(scene, camera, renderer);

        // Hard-set values
        this.scale = 0.75;
        this.gapSize = 0.02;
        this.cornerRadius = 0.065;
        this.minOuterRadius = 0.8;
        this.maxOuterRadius = 1.1;
        this.sliceCount = tones.length; // Use the number of tones instead of a fixed value

        // Initialize rotation
        this.rotationZ = 3.841592638331002;
        this.group.rotation.z = this.rotationZ;

        // Bind the new scroll method
        this.onScroll = this.onScroll.bind(this);

        // Initialize properties specific to WedgeChart
        this.slices = [];
        this.sliceValues = [];
        this.sliceGeometries = [];
        this.currentHeights = [];

        // Raycaster setup
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Bind methods
        this.onMouseClick = this.onClick.bind(this);
        this.animate = this.animate.bind(this);

        // Add a new property to track the animation state
        this.isAnimatingOut = false;

        // Initialize slices with the hard-set slice count
        this.initializeSlices(this.sliceCount);

        // Animate slices on initialization
        this.animateWedgesIn();

        // Start animation
        this.animate();

        // scale group
        this.group.scale.set(this.scale, this.scale, this.scale);

        this.currentTween = null;
        this.isAnimating = false;
        this.lastUpdateTime = 0;
        this.updateInterval = 1000 / 30; // Update at 30fps

        // Add event listener for tone selection
        document.addEventListener('toneSelected', (event) => {
            const index = event.detail.index;
            this.animateSlicesToNewDistribution(index);
        });

        // Initialize with first tone selected
        this.defaultToneIndex = 0;

        // Select default tone on initialization
        this.slices.forEach((slice, index) => {
            slice.userData.selected = (index === this.defaultToneIndex);
        });
    }

    initialize() {
        // Any additional initialization if needed
    }

    initializeSlices(count) {
        // Remove old slices from the scene and dispose of their geometries
        this.slices.forEach(slice => {
            this.group.remove(slice);
            slice.geometry.dispose();
            slice.material.dispose();
        });

        // Clear the arrays
        this.slices = [];
        this.sliceValues = [];
        this.sliceGeometries = [];
        this.currentHeights = [];

        // Initialize new slices
        const toneCount = tones.length;
        this.sliceValues = Array(toneCount).fill(100 / toneCount); // Set slice values based on the number of tones
        this.colors = tones.map(tone => tone.hex); // Use colors from tones
        this.currentHeights = Array(toneCount).fill(0.5); // Start with height 0
        this.createSliceGeometries();
        this.updatePieChart();

        // Select a random slice
        const randomIndex = Math.floor(Math.random() * toneCount);
        this.slices[randomIndex].userData.selected = true;
    }

    createSliceGeometries() {
        console.log("createSliceGeometries");
        const total = this.sliceValues.reduce((acc, val) => acc + val, 0);
        const cornerRadiusFactor = this.cornerRadius;
        const minOuterRadius = this.minOuterRadius;
        const maxOuterRadius = this.maxOuterRadius;

        let startAngle = 0;

        this.sliceValues.forEach((value, index) => {
            const angle = (value / total) * Math.PI;
            const dynamicOuterRadius = minOuterRadius; // Default to minOuterRadius
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.MeshBasicMaterial({ color: this.colors[index], side: THREE.DoubleSide });
            const slice = new THREE.Mesh(geometry, material);

            this.updateSliceGeometry(geometry, startAngle, startAngle + angle, 0.5, dynamicOuterRadius, cornerRadiusFactor);

            slice.userData = { index: index, value: value, startAngle: startAngle, endAngle: startAngle + angle };
            startAngle += angle;

            this.group.add(slice);
            this.slices.push(slice);
            this.sliceGeometries.push(geometry);
        });
    }

    updatePieChart() {
        const total = this.sliceValues.reduce((acc, val) => acc + val, 0);
        const gapSize = this.gapSize;
        const cornerRadiusFactor = this.cornerRadius;

        let startAngle = 0;

        this.slices.forEach((slice, index) => {
            const value = this.sliceValues[index];
            const angle = (value / total) * Math.PI;
            const dynamicOuterRadius = this.currentHeights[index];

            this.updateSliceGeometry(slice.geometry, startAngle, startAngle + angle, 0.5, dynamicOuterRadius, cornerRadiusFactor);

            const middleAngle = startAngle + angle / 2;
            const offsetX = Math.cos(middleAngle) * gapSize;
            const offsetY = Math.sin(middleAngle) * gapSize;
            slice.position.set(offsetX, offsetY, 0);

            slice.userData.startAngle = startAngle;
            slice.userData.endAngle = startAngle + angle;
            slice.userData.value = value;

            startAngle += angle;
        });
    }

    updateSliceGeometry(geometry, startAngle, endAngle, innerRadius, outerRadius, cornerRadiusFactor) {
        const angle = endAngle - startAngle;
        const maxCornerRadius = Math.min(outerRadius, innerRadius) * cornerRadiusFactor;
        const sliceCornerRadius = Math.min(angle * outerRadius / 2, maxCornerRadius, angle * innerRadius / 2);

        const shape = new THREE.Shape();

        // Calculate the circular segment border points, with rounded corners consideration
        const outerArcStartAngle = startAngle + sliceCornerRadius / outerRadius;
        const outerArcEndAngle = endAngle - sliceCornerRadius / outerRadius;
        const innerArcStartAngle = startAngle + sliceCornerRadius / innerRadius;
        const innerArcEndAngle = endAngle - sliceCornerRadius / innerRadius;

        const s1 = { x: Math.cos(startAngle) * (innerRadius + sliceCornerRadius), y: Math.sin(startAngle) * (innerRadius + sliceCornerRadius) };
        const s2 = { x: Math.cos(startAngle) * (outerRadius - sliceCornerRadius), y: Math.sin(startAngle) * (outerRadius - sliceCornerRadius) };
        const e1 = { x: Math.cos(endAngle) * (outerRadius - sliceCornerRadius), y: Math.sin(endAngle) * (outerRadius - sliceCornerRadius) };
        const e2 = { x: Math.cos(endAngle) * (innerRadius + sliceCornerRadius), y: Math.sin(endAngle) * (innerRadius + sliceCornerRadius) };

        shape.moveTo(s1.x, s1.y);
        shape.lineTo(s2.x, s2.y);

        shape.quadraticCurveTo(
            Math.cos(startAngle) * outerRadius, Math.sin(startAngle) * outerRadius,
            Math.cos(outerArcStartAngle) * outerRadius, Math.sin(outerArcStartAngle) * outerRadius
        );

        shape.absarc(0, 0, outerRadius, outerArcStartAngle, outerArcEndAngle, false, 8);

        shape.quadraticCurveTo(
            Math.cos(endAngle) * outerRadius, Math.sin(endAngle) * outerRadius,
            e1.x, e1.y
        );

        shape.lineTo(e2.x, e2.y);

        shape.quadraticCurveTo(
            Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius,
            Math.cos(innerArcEndAngle) * innerRadius, Math.sin(innerArcEndAngle) * innerRadius
        );

        shape.absarc(0, 0, innerRadius, innerArcEndAngle, innerArcStartAngle, true, 8);

        shape.quadraticCurveTo(
            Math.cos(startAngle) * innerRadius, Math.sin(startAngle) * innerRadius,
            s1.x, s1.y
        );


        const shapeGeometry = new THREE.ShapeGeometry(shape);
        geometry.setAttribute('position', shapeGeometry.getAttribute('position'));
        geometry.setAttribute('normal', shapeGeometry.getAttribute('normal'));
        geometry.setAttribute('uv', shapeGeometry.getAttribute('uv'));
        geometry.index = shapeGeometry.index;
        geometry.computeBoundingSphere();
    }

    animateSlicesToNewDistribution(clickedIndex) {
        if (this.currentTween) {
            this.currentTween.stop();
        }

        const currentValues = [...this.sliceValues];
        const targetValues = this.calculateNewDistribution(clickedIndex);

        const minOuterRadius = this.minOuterRadius;
        const maxOuterRadius = this.maxOuterRadius;
        const targetHeights = this.calculateTargetHeights(clickedIndex, minOuterRadius, maxOuterRadius);

        this.currentTween = new TWEEN.Tween({ values: currentValues, heights: this.currentHeights })
            .to({ values: targetValues, heights: targetHeights }, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(({ values, heights }) => {
                this.sliceValues = values.map(value => parseFloat(value.toFixed(2)));
                this.currentHeights = heights.map(height => parseFloat(height.toFixed(3)));
                this.updatePieChart();
            })
            .start();

        this.slices.forEach((slice, index) => {
            slice.userData.selected = (index === clickedIndex);
        });

        // Update UI circles when wedge is selected
        import('./tones.js').then(module => {
            module.updateUISelection(clickedIndex);
        });
    }

    calculateNewDistribution(clickedIndex) {
        const totalSlices = this.sliceValues.length;
        const clickedValue = 50; // 50% for the clicked slice
        const remainingValue = 50; // 50% to distribute among other slices
        const nonSelectedSliceValue = remainingValue / (totalSlices - 1);

        return this.sliceValues.map((_, index) => {
            if (index === clickedIndex) return clickedValue;
            return nonSelectedSliceValue;
        });
    }

    calculateTargetHeights(selectedIndex, minHeight, maxHeight) {
        return this.slices.map((_, index) => {
            if (index === selectedIndex) return maxHeight;
            const distance = Math.abs(index - selectedIndex);
            const maxDistance = Math.floor(this.slices.length / 2);
            const heightFactor = 1 - (distance / maxDistance);
            return minHeight + (maxHeight - minHeight) * heightFactor;
        });
    }

    /**
     * Override the generic onClick method with wedge-specific behavior
     * @param {Event} event - The click event
     */
    onClick(event) {
        super.onClick(event); // Call the parent class onClick method

        const intersects = this.raycaster.intersectObjects(this.group.children, true);

        if (intersects.length > 0) {
            const clickedSlice = intersects[0].object;
            console.log("Clicked slice:", clickedSlice);
            this.animateSlicesToNewDistribution(clickedSlice.userData.index);

            // Visualization marker (optional)
            this.addClickMarker(intersects[0].point);
        } else {
            console.log('No wedge intersection detected');
        }
    }

    /**
     * Add a temporary marker at the click point for visualization
     * @param {THREE.Vector3} point - The point to place the marker
     */
    addClickMarker(point) {
        const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);

        marker.position.copy(point);
        this.scene.add(marker);

        // Remove the marker after a short duration
        setTimeout(() => {
            this.scene.remove(marker);
            marker.geometry.dispose();
            marker.material.dispose();
        }, 1000);
    }

    animate(time) {
        requestAnimationFrame(this.animate);
        TWEEN.update(time);
        this.render();
    }

    setupEventListeners() {
        // Existing event listeners
        document.getElementById('container').addEventListener('click', this.onClick, false);
        console.log("Click event listener added to container");

        // Add scroll event listener
        window.addEventListener('wheel', this.onScroll, false);
        console.log("Scroll event listener added to window");
    }

    onScroll(event) {
        // Adjust rotation based on scroll
        const scrollSensitivity = 0.001;
        this.rotationZ += event.deltaY * scrollSensitivity;

        // Allow rotation to go all the way round
        this.rotationZ = this.rotationZ % (2 * Math.PI);

        // Apply rotation
        this.group.rotation.z = this.rotationZ;

        // Log the rotation value
        console.log("Rotation Z:", this.rotationZ);
    }

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Override swipeLeft to handle left swipe behavior for WedgeChart.
     */
    swipeLeft() {
        this.selectNextWedge();
    }

    /**
     * Override swipeRight to handle right swipe behavior for WedgeChart.
     */
    swipeRight() {
        this.selectPreviousWedge();
    }

    /**
     * Select the next wedge.
     */
    selectNextWedge() {
        if (this.slices.length > 0) {
            const selectedIndex = this.slices.findIndex(slice => slice.userData.selected);
            const nextIndex = (selectedIndex + 1) % this.slices.length;
            this.animateSlicesToNewDistribution(nextIndex);
        }
    }

    /**
     * Select the previous wedge.
     */
    selectPreviousWedge() {
        if (this.slices.length > 0) {
            const selectedIndex = this.slices.findIndex(slice => slice.userData.selected);
            const previousIndex = (selectedIndex - 1 + this.slices.length) % this.slices.length;
            this.animateSlicesToNewDistribution(previousIndex);
        }
    }

    // Add this new method to animate the wedges out
    animateWedgesOut() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        if (this.currentTween) {
            this.currentTween.stop();
        }

        const startHeights = [...this.currentHeights];
        const startOpacity = 1;
        const endHeights = Array(this.sliceCount).fill(0.5);
        const endOpacity = 0;

        this.currentTween = new TWEEN.Tween({ t: 0 })
            .to({ t: 1 }, 1000)
            .easing(TWEEN.Easing.Quadratic.In)
            .onUpdate(({ t }) => {
                const now = TWEEN.now();
                if (now - this.lastUpdateTime >= this.updateInterval) {
                    this.updateWedges(startHeights, endHeights, startOpacity, endOpacity, t);
                    this.lastUpdateTime = now;
                }
            })
            .onComplete(() => {
                this.isAnimating = false;
                this.updateWedges(startHeights, endHeights, startOpacity, endOpacity, 1);
            })
            .start();
    }

    animateWedgesIn() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        if (this.currentTween) {
            this.currentTween.stop();
        }

        const selectedIndex = this.slices.findIndex(slice => slice.userData.selected);
        const startHeights = Array(this.sliceCount).fill(0.5);
        const endHeights = this.calculateTargetHeights(selectedIndex, this.minOuterRadius, this.maxOuterRadius);
        const startOpacity = 0;
        const endOpacity = 1;

        this.currentTween = new TWEEN.Tween({ t: 0 })
            .to({ t: 1 }, 1000)
            .easing(TWEEN.Easing.Elastic.Out)
            .onUpdate(({ t }) => {
                const now = TWEEN.now();
                if (now - this.lastUpdateTime >= this.updateInterval) {
                    this.updateWedges(startHeights, endHeights, startOpacity, endOpacity, t);
                    this.lastUpdateTime = now;
                }
            })
            .onComplete(() => {
                this.isAnimating = false;
                this.updateWedges(startHeights, endHeights, startOpacity, endOpacity, 1);
            })
            .start();
    }

    updateWedges(startHeights, endHeights, startOpacity, endOpacity, t) {
        this.currentHeights = startHeights.map((start, i) => {
            const end = endHeights[i];
            return parseFloat((start + (end - start) * t).toFixed(3));
        });

        const opacity = startOpacity + (endOpacity - startOpacity) * t;

        this.slices.forEach(slice => {
            slice.material.opacity = opacity;
            slice.material.transparent = true;
        });

        this.updatePieChart();
    }

    /**
     * Clean up resources and remove event listeners when disposing of the chart
     */
    dispose() {
        // Stop any ongoing animations
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }

        // Remove event listeners
        document.getElementById('container').removeEventListener('click', this.onClick);
        window.removeEventListener('wheel', this.onScroll);

        // Dispose of geometries and materials
        this.slices.forEach(slice => {
            slice.geometry.dispose();
            slice.material.dispose();
        });

        // Clear arrays
        this.slices = [];
        this.sliceValues = [];
        this.sliceGeometries = [];
        this.currentHeights = [];

        // Remove group from scene
        this.scene.remove(this.group);

        // Call parent class dispose if it exists
        if (super.dispose) {
            super.dispose();
        }
    }

    // Add new method to set default tone
    setDefaultTone(index) {
        this.animateSlicesToNewDistribution(index);
    }
}
