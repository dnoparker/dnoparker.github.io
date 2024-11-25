import*as THREE from"three";import"@tweenjs/tween.js";import{tones}from"./tones.js";import{FaceObject}from"./faceObject.js";export class WedgeChart extends FaceObject{constructor(scene,camera,renderer){super(scene,camera,renderer),this.scale=.75,this.gapSize=.02,this.cornerRadius=.065,this.minOuterRadius=.8,this.maxOuterRadius=1.1,this.sliceCount=tones.length,this.rotationZ=3.841592638331002,this.group.rotation.z=this.rotationZ,this.onScroll=this.onScroll.bind(this),this.slices=[],this.sliceValues=[],this.sliceGeometries=[],this.currentHeights=[],this.raycaster=new THREE.Raycaster,this.mouse=new THREE.Vector2,this.onMouseClick=this.onClick.bind(this),this.animate=this.animate.bind(this),this.isAnimatingOut=!1,this.initializeSlices(this.sliceCount),this.animateWedgesIn(),this.animate(),this.group.scale.set(this.scale,this.scale,this.scale),this.currentTween=null,this.isAnimating=!1,this.lastUpdateTime=0,this.updateInterval=1e3/30,document.addEventListener("toneSelected",event=>{const index=event.detail.index;this.animateSlicesToNewDistribution(index)}),this.defaultToneIndex=0,this.slices.forEach((slice,index)=>{slice.userData.selected=index===this.defaultToneIndex})}initialize(){}initializeSlices(count){this.slices.forEach(slice=>{this.group.remove(slice),slice.geometry.dispose(),slice.material.dispose()}),this.slices=[],this.sliceValues=[],this.sliceGeometries=[],this.currentHeights=[];const toneCount=tones.length;this.sliceValues=Array(toneCount).fill(100/toneCount),this.colors=tones.map(tone=>tone.hex),this.currentHeights=Array(toneCount).fill(.5),this.createSliceGeometries(),this.updatePieChart();const randomIndex=Math.floor(Math.random()*toneCount);this.slices[randomIndex].userData.selected=!0}createSliceGeometries(){console.log("createSliceGeometries");const total=this.sliceValues.reduce((acc,val)=>acc+val,0),cornerRadiusFactor=this.cornerRadius,minOuterRadius=this.minOuterRadius,maxOuterRadius=this.maxOuterRadius;let startAngle=0;this.sliceValues.forEach((value,index)=>{const angle=value/total*Math.PI,dynamicOuterRadius=minOuterRadius,geometry=new THREE.BufferGeometry,material=new THREE.MeshBasicMaterial({color:this.colors[index],side:THREE.DoubleSide}),slice=new THREE.Mesh(geometry,material);this.updateSliceGeometry(geometry,startAngle,startAngle+angle,.5,dynamicOuterRadius,cornerRadiusFactor),slice.userData={index:index,value:value,startAngle:startAngle,endAngle:startAngle+angle},startAngle+=angle,this.group.add(slice),this.slices.push(slice),this.sliceGeometries.push(geometry)})}updatePieChart(){const total=this.sliceValues.reduce((acc,val)=>acc+val,0),gapSize=this.gapSize,cornerRadiusFactor=this.cornerRadius;let startAngle=0;this.slices.forEach((slice,index)=>{const value=this.sliceValues[index],angle=value/total*Math.PI,dynamicOuterRadius=this.currentHeights[index];this.updateSliceGeometry(slice.geometry,startAngle,startAngle+angle,.5,dynamicOuterRadius,cornerRadiusFactor);const middleAngle=startAngle+angle/2,offsetX=Math.cos(middleAngle)*gapSize,offsetY=Math.sin(middleAngle)*gapSize;slice.position.set(offsetX,offsetY,0),slice.userData.startAngle=startAngle,slice.userData.endAngle=startAngle+angle,slice.userData.value=value,startAngle+=angle})}updateSliceGeometry(geometry,startAngle,endAngle,innerRadius,outerRadius,cornerRadiusFactor){const angle=endAngle-startAngle,maxCornerRadius=Math.min(outerRadius,innerRadius)*cornerRadiusFactor,sliceCornerRadius=Math.min(angle*outerRadius/2,maxCornerRadius,angle*innerRadius/2),shape=new THREE.Shape,outerArcStartAngle=startAngle+sliceCornerRadius/outerRadius,outerArcEndAngle=endAngle-sliceCornerRadius/outerRadius,innerArcStartAngle=startAngle+sliceCornerRadius/innerRadius,innerArcEndAngle=endAngle-sliceCornerRadius/innerRadius,s1={x:Math.cos(startAngle)*(innerRadius+sliceCornerRadius),y:Math.sin(startAngle)*(innerRadius+sliceCornerRadius)},s2={x:Math.cos(startAngle)*(outerRadius-sliceCornerRadius),y:Math.sin(startAngle)*(outerRadius-sliceCornerRadius)},e1={x:Math.cos(endAngle)*(outerRadius-sliceCornerRadius),y:Math.sin(endAngle)*(outerRadius-sliceCornerRadius)},e2={x:Math.cos(endAngle)*(innerRadius+sliceCornerRadius),y:Math.sin(endAngle)*(innerRadius+sliceCornerRadius)};shape.moveTo(s1.x,s1.y),shape.lineTo(s2.x,s2.y),shape.quadraticCurveTo(Math.cos(startAngle)*outerRadius,Math.sin(startAngle)*outerRadius,Math.cos(outerArcStartAngle)*outerRadius,Math.sin(outerArcStartAngle)*outerRadius),shape.absarc(0,0,outerRadius,outerArcStartAngle,outerArcEndAngle,!1,8),shape.quadraticCurveTo(Math.cos(endAngle)*outerRadius,Math.sin(endAngle)*outerRadius,e1.x,e1.y),shape.lineTo(e2.x,e2.y),shape.quadraticCurveTo(Math.cos(endAngle)*innerRadius,Math.sin(endAngle)*innerRadius,Math.cos(innerArcEndAngle)*innerRadius,Math.sin(innerArcEndAngle)*innerRadius),shape.absarc(0,0,innerRadius,innerArcEndAngle,innerArcStartAngle,!0,8),shape.quadraticCurveTo(Math.cos(startAngle)*innerRadius,Math.sin(startAngle)*innerRadius,s1.x,s1.y);const shapeGeometry=new THREE.ShapeGeometry(shape);geometry.setAttribute("position",shapeGeometry.getAttribute("position")),geometry.setAttribute("normal",shapeGeometry.getAttribute("normal")),geometry.setAttribute("uv",shapeGeometry.getAttribute("uv")),geometry.index=shapeGeometry.index,geometry.computeBoundingSphere()}animateSlicesToNewDistribution(clickedIndex){this.currentTween&&this.currentTween.stop();const currentValues=[...this.sliceValues],targetValues=this.calculateNewDistribution(clickedIndex),minOuterRadius=this.minOuterRadius,maxOuterRadius=this.maxOuterRadius,targetHeights=this.calculateTargetHeights(clickedIndex,minOuterRadius,maxOuterRadius);this.currentTween=new TWEEN.Tween({values:currentValues,heights:this.currentHeights}).to({values:targetValues,heights:targetHeights},1e3).easing(TWEEN.Easing.Quadratic.Out).onUpdate(({values:values,heights:heights})=>{this.sliceValues=values.map(value=>parseFloat(value.toFixed(2))),this.currentHeights=heights.map(height=>parseFloat(height.toFixed(3))),this.updatePieChart()}).start(),this.slices.forEach((slice,index)=>{slice.userData.selected=index===clickedIndex})}calculateNewDistribution(clickedIndex){const totalSlices=this.sliceValues.length,clickedValue=50,remainingValue=50,nonSelectedSliceValue=50/(totalSlices-1);return this.sliceValues.map((_,index)=>index===clickedIndex?50:nonSelectedSliceValue)}calculateTargetHeights(selectedIndex,minHeight,maxHeight){return this.slices.map((_,index)=>{if(index===selectedIndex)return maxHeight;const distance=Math.abs(index-selectedIndex),maxDistance=Math.floor(this.slices.length/2),heightFactor=1-distance/maxDistance;return minHeight+(maxHeight-minHeight)*heightFactor})}onClick(event){super.onClick(event);const intersects=this.raycaster.intersectObjects(this.group.children,!0);if(intersects.length>0){const clickedSlice=intersects[0].object;console.log("Clicked slice:",clickedSlice),import("./tones.js").then(module=>{module.selectTone(clickedSlice.userData.index)}),this.animateSlicesToNewDistribution(clickedSlice.userData.index),this.addClickMarker(intersects[0].point)}else console.log("No wedge intersection detected")}addClickMarker(point){const markerGeometry=new THREE.SphereGeometry(.02,16,16),markerMaterial=new THREE.MeshBasicMaterial({color:16711680}),marker=new THREE.Mesh(markerGeometry,markerMaterial);marker.position.copy(point),this.scene.add(marker),setTimeout(()=>{this.scene.remove(marker),marker.geometry.dispose(),marker.material.dispose()},1e3)}animate(time){requestAnimationFrame(this.animate),TWEEN.update(time),this.render()}setupEventListeners(){document.getElementById("container").addEventListener("click",this.onClick,!1),console.log("Click event listener added to container"),window.addEventListener("wheel",this.onScroll,!1),console.log("Scroll event listener added to window")}onScroll(event){const scrollSensitivity=.001;this.rotationZ+=.001*event.deltaY,this.rotationZ=this.rotationZ%(2*Math.PI),this.group.rotation.z=this.rotationZ,console.log("Rotation Z:",this.rotationZ)}debounce(func,wait){let timeout;return function(...args){clearTimeout(timeout),timeout=setTimeout(()=>func.apply(this,args),wait)}}swipeLeft(){this.selectNextWedge()}swipeRight(){this.selectPreviousWedge()}selectNextWedge(){if(this.slices.length>0){const selectedIndex=this.slices.findIndex(slice=>slice.userData.selected),nextIndex=(selectedIndex+1)%this.slices.length;this.animateSlicesToNewDistribution(nextIndex)}}selectPreviousWedge(){if(this.slices.length>0){const selectedIndex=this.slices.findIndex(slice=>slice.userData.selected),previousIndex=(selectedIndex-1+this.slices.length)%this.slices.length;this.animateSlicesToNewDistribution(previousIndex)}}animateWedgesOut(){if(this.isAnimating)return;this.isAnimating=!0,this.currentTween&&this.currentTween.stop();const startHeights=[...this.currentHeights],startOpacity=1,endHeights=Array(this.sliceCount).fill(.5),endOpacity=0;this.currentTween=new TWEEN.Tween({t:0}).to({t:1},1e3).easing(TWEEN.Easing.Quadratic.In).onUpdate(({t:t})=>{const now=TWEEN.now();now-this.lastUpdateTime>=this.updateInterval&&(this.updateWedges(startHeights,endHeights,1,0,t),this.lastUpdateTime=now)}).onComplete(()=>{this.isAnimating=!1,this.updateWedges(startHeights,endHeights,1,0,1)}).start()}animateWedgesIn(){if(this.isAnimating)return;this.isAnimating=!0,this.currentTween&&this.currentTween.stop();const selectedIndex=this.slices.findIndex(slice=>slice.userData.selected),startHeights=Array(this.sliceCount).fill(.5),endHeights=this.calculateTargetHeights(selectedIndex,this.minOuterRadius,this.maxOuterRadius),startOpacity=0,endOpacity=1;this.currentTween=new TWEEN.Tween({t:0}).to({t:1},1e3).easing(TWEEN.Easing.Elastic.Out).onUpdate(({t:t})=>{const now=TWEEN.now();now-this.lastUpdateTime>=this.updateInterval&&(this.updateWedges(startHeights,endHeights,0,1,t),this.lastUpdateTime=now)}).onComplete(()=>{this.isAnimating=!1,this.updateWedges(startHeights,endHeights,0,1,1)}).start()}updateWedges(startHeights,endHeights,startOpacity,endOpacity,t){this.currentHeights=startHeights.map((start,i)=>{const end=endHeights[i];return parseFloat((start+(end-start)*t).toFixed(3))});const opacity=startOpacity+(endOpacity-startOpacity)*t;this.slices.forEach(slice=>{slice.material.opacity=opacity,slice.material.transparent=!0}),this.updatePieChart()}dispose(){this.currentTween&&(this.currentTween.stop(),this.currentTween=null),document.getElementById("container").removeEventListener("click",this.onClick),window.removeEventListener("wheel",this.onScroll),this.slices.forEach(slice=>{slice.geometry.dispose(),slice.material.dispose()}),this.slices=[],this.sliceValues=[],this.sliceGeometries=[],this.currentHeights=[],this.scene.remove(this.group),super.dispose&&super.dispose()}setDefaultTone(index){this.animateSlicesToNewDistribution(index)}}