import * as THREE from 'three';
import '@tweenjs/tween.js';

/**
 * WedgeChart class to manage pie chart slices within an existing Three.js scene.
 */
export class WedgeChart {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        // Create a group to hold all the slices
        this.group = new THREE.Group();
        this.scene.add(this.group); // Ensure the group is added to the scene

        // Initialize properties
        this.slices = [];
        this.sliceValues = [];
        this.colors = [];
        this.sliceGeometries = [];
        this.currentTween = null;
        this.currentHeights = [];

        // Raycaster setup
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Color palette
        this.colorPalette = [
            0xff5733, 0xff8f33, 0xf0d9b5, 0xe0ac69, 0xc68642,
            0x8d5524, 0x5a2b0d, 0x33ff57, 0x3357ff, 0xff33a8,
            0xa833ff, 0x33fff5, 0x8fff33, 0x338fff, 0xff3333,
            0x33ffcb, 0xcb33ff, 0xffcb33, 0x33cbff, 0xff33cb,
            0x66ff33, 0x3366ff, 0xff3366, 0x33ff66, 0x6633ff
        ];

        // Bind methods
        this.onMouseClick = this.onMouseClick.bind(this);
        this.animate = this.animate.bind(this);

        // Initialize slices
        this.initializeSlices(10);

        // Start animation
        this.animate();
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
        this.colors = [];
        this.sliceGeometries = [];
        this.currentHeights = [];

        // Initialize new slices
        this.sliceValues = Array(count).fill(100 / count);
        this.colors = this.generateColors(count);
        this.currentHeights = Array(count).fill(parseFloat(document.getElementById('minOuterRadius').value));
        this.createSliceGeometries();
        this.updatePieChart();
    }

    createSliceGeometries() {
        console.log("createSliceGeometries");
        const total = this.sliceValues.reduce((acc, val) => acc + val, 0);
        const cornerRadiusFactor = parseFloat(document.getElementById('cornerRadius').value);
        const minOuterRadius = parseFloat(document.getElementById('minOuterRadius').value);
        const maxOuterRadius = parseFloat(document.getElementById('maxOuterRadius').value);

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
        const gapSize = parseFloat(document.getElementById('gapSize').value);
        const cornerRadiusFactor = parseFloat(document.getElementById('cornerRadius').value);

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

        shape.absarc(0, 0, outerRadius, outerArcStartAngle, outerArcEndAngle, false);

        shape.quadraticCurveTo(
            Math.cos(endAngle) * outerRadius, Math.sin(endAngle) * outerRadius,
            e1.x, e1.y
        );

        shape.lineTo(e2.x, e2.y);

        shape.quadraticCurveTo(
            Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius,
            Math.cos(innerArcEndAngle) * innerRadius, Math.sin(innerArcEndAngle) * innerRadius
        );

        shape.absarc(0, 0, innerRadius, innerArcEndAngle, innerArcStartAngle, true);

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

    generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            // Cycle through the palette
            colors.push(this.colorPalette[i % this.colorPalette.length]);
        }
        return colors;
    }

    animateSlicesToNewDistribution(clickedIndex) {
        if (this.currentTween) {
            this.currentTween.stop();
        }

        const currentValues = [...this.sliceValues];
        const targetValues = this.calculateNewDistribution(clickedIndex);

        const minOuterRadius = parseFloat(document.getElementById('minOuterRadius').value);
        const maxOuterRadius = parseFloat(document.getElementById('maxOuterRadius').value);
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

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onMouseClick(event) {
        console.log("WedgeChart onMouseClick called"); // Debug log
        const container = document.getElementById('container');
        const rect = container.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        console.log("Normalized mouse coordinates:", x, y); // Debug log

        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const intersects = this.raycaster.intersectObjects(this.group.children, true);

        console.log("Intersects:", intersects); // Debug log

        if (intersects.length > 0) {
            const clickedSlice = intersects[0].object;
            console.log("Clicked slice:", clickedSlice); // Debug log
            this.animateSlicesToNewDistribution(clickedSlice.userData.index);
        } else {
            console.log("No slice intersected"); // Debug log
        }
    }

    animate(time) {
        requestAnimationFrame(this.animate);
        TWEEN.update(time);
        this.render();
    }

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Public method to set up event listeners
    setupEventListeners() {
        window.addEventListener('resize', this.debounce(() => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.render();
        }, 100), false);

        document.querySelectorAll('input[type="range"]').forEach(input => {
            input.addEventListener('input', this.debounce(() => {
                this.updatePieChart();
                this.render();
            }, 100));
        });

        document.getElementById('updateSlices').addEventListener('click', () => {
            const count = parseInt(document.getElementById('sliceCount').value);
            if (count >= 2 && count <= 20) {
                this.initializeSlices(count);
                this.render();
            } else {
                alert('Please enter a number between 2 and 20');
            }
        });

        document.getElementById('container').addEventListener('click', this.onMouseClick, false);
        console.log("Click event listener added to container"); // Debug log
    }

    update() {
        // Update the position and rotation of the group based on the anchor's position
        // This method will be called in the render loop
        TWEEN.update();
    }
}