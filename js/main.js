import * as THREE from 'three';
import { MindARThree } from 'mindar-face-three';
import { Tone } from './tone.js';

// Setup for accessing the webcam
const video = document.getElementById('webcam');

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(error => {
    console.error('Error accessing webcam:', error);
  });

const mindarThree = new MindARThree({
  container: document.querySelector("#container"),
});

const { renderer, scene, camera } = mindarThree;
const anchors = [];

for (let index = 0; index < 468; index++) {
  // Create a new anchor and add it to the list
  const anchorEye = mindarThree.addAnchor(index);
  anchors.push(anchorEye);  // Store the anchor in the array

  const geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
  const box = new THREE.Mesh(geometry);
  anchorEye.group.add(box);
}


const geometry = new THREE.BoxGeometry( 0.5, 0.5,   0.5 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
 // Position the cube in the bottom-left corner
 cube.position.x = -1.5; // Adjust this value as needed
 cube.position.y = -1; // Adjust this value as needed
 cube.position.z = 0;  // Keeping Z position to 0 for simplicity
scene.add( cube );

camera.position.z = 5;

/// create an anchor dd

// const anchorEye = mindarThree.addAnchor(388)
// const geometry = new THREE.BoxGeometry(0.1,0.1,0.1);
// const box = new THREE.Mesh(geometry);
// anchorEye.group.add(box);


const anchor = mindarThree.addAnchor(1);
const childGroup = new THREE.Group();
//  anchor.group.add(childGroup);

const tonesData = [
  { text: 'bojangle', color: 0xF2D6B1, size: 0.1, url: 'https://shades-dancewear.com/product/ballet-socks/?attribute_pa_color=bojangles&attribute_pa_size=6-8-5', position: { x: 0.35, y: 0.35, z: 0 } },
  { text: 'raven', color: 0xD9A084, size: 0.1, url: 'https://shades-dancewear.com/product/ballet-socks/?attribute_pa_color=raven&attribute_pa_size=6-8-5', position: { x: -0.35, y: 0.35, z: 0 } },
  { text: 'ailey', color: 0xAC7A63, size: 0.1, url: 'https://shades-dancewear.com/product/ballet-socks/?attribute_pa_color=ailey&attribute_pa_size=6-8-5', position: { x: 0.35, y: -0.35, z: 0 } },
  { text: 'pearl', color: 0x6C4F39, size: 0.1, url: 'https://shades-dancewear.com/product/ballet-socks/?attribute_pa_color=pearl&attribute_pa_size=6-8-5', position: { x: -0.35, y: -0.35, z: 0 } },
];

const tones = tonesData.map(data => new Tone(data.text, data.color, data.size, data.url, data.position));

tones.forEach(tone => {
  childGroup.add(tone.sphere);
  childGroup.add(tone.textSprite);
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const onMouseClick = (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(tones.map(tone => tone.sphere));

  if (intersects.length > 0) {
    window.open(intersects[0].object.userData.url, '_blank');
  } else {
    captureScreenshot();
  }
};

window.addEventListener('click', onMouseClick, false);

const rotationSpeed = 0.02;
let isRotatingLeft = false;
let isRotatingRight = false;

let lastCapturedImage = null;  // Variable to store the last captured image

const onKeyDown = (event) => {
  if (event.key === 'ArrowLeft') {
    isRotatingLeft = true;
  } else if (event.key === 'ArrowRight') {
    isRotatingRight = true;
  } else if (event.key === 'd' || event.key === 'D') {
    if (lastCapturedImage) {
      const imgElement = document.getElementById('captured-image');
      imgElement.src = lastCapturedImage;
      imgElement.style.display = 'block';
    }
  } else if (event.keyCode  == 32){
    getSampleFaceColours();
  }
};

const onKeyUp = (event) => {
  if (event.key === 'ArrowLeft') {
    isRotatingLeft = false;
  } else if (event.key === 'ArrowRight') {
    isRotatingRight = false;
  } else if (event.key === 'd' || event.key === 'D') {
    const imgElement = document.getElementById('captured-image');
    imgElement.style.display = 'none';
  } 
};

window.addEventListener('keydown', onKeyDown, false);
window.addEventListener('keyup', onKeyUp, false);

const animate = () => {

  cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

  if (isRotatingLeft) {
    childGroup.rotation.z += rotationSpeed;
  } else if (isRotatingRight) {
    childGroup.rotation.z -= rotationSpeed;
  }
};

const start = async () => {
  await mindarThree.start();
  renderer.setAnimationLoop(() => {
    animate();
    renderer.render(scene, camera);
  });
};

start();

const getSampleFaceColours = async () => {
  // Create an offscreen canvas to blend video feed and Three.js scene
  const canvas = document.createElement('canvas');
  canvas.width = renderer.domElement.width;
  canvas.height = renderer.domElement.height;
  const context = canvas.getContext('2d');

  // Draw the video feed onto the canvas
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Reset the transformation matrix
  context.setTransform(1, 0, 0, 1, 0, 0);

  // Get the final image data
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  // Loop through all anchors
  anchors.forEach((anchor, index) => {
    // Sample the colour at the position of the anchor
    const anchorScreenPosition = getAnchorScreenPosition(anchor, renderer, camera);
    const x = Math.floor(anchorScreenPosition.x);
    const y = Math.floor(anchorScreenPosition.y);

    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
      const pixelIndex = (y * canvas.width + x) * 4;
      const r = imageData.data[pixelIndex];
      const g = imageData.data[pixelIndex + 1];
      const b = imageData.data[pixelIndex + 2];
      
      const hex = rgbToHex(r, g, b);
      //console.log(`Colour at anchor ${index} position: ${hex}`);

      // Update the colour of the box at the anchor position
      const box = anchor.group.children.find(child => child instanceof THREE.Mesh);
      if (box) {
        box.material.color.set(hex);
      }

      // Accumulate colour values
      totalR += r;
      totalG += g;
      totalB += b;
      count++;
    } else {
      console.log(`Anchor ${index} position is out of canvas bounds.`);
    }
  });

  if (count > 0) {
    // Calculate the average colour
    const avgR = Math.round(totalR / count);
    const avgG = Math.round(totalG / count);
    const avgB = Math.round(totalB / count);

    const avgHex = rgbToHex(avgR, avgG, avgB);
    cube.material.color.set(avgHex)
    console.log(`Average Colour: ${avgHex}`);
  } else {
    console.log('No valid colours were sampled.');
  }
};


// Function to convert RGB to HEX
const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
};

// Function to get anchor screen position
const getAnchorScreenPosition = (anchor, renderer, camera) => {
  const worldPosition = new THREE.Vector3();
  anchor.group.getWorldPosition(worldPosition);
  
  const vector = worldPosition.clone().project(camera);
  const canvas = renderer.domElement;
  const screenX = (vector.x + 1) / 2 * canvas.width;
  const screenY = (-vector.y + 1) / 2 * canvas.height;

  return { x: screenX, y: screenY };
};


// Function to load and convert the swatch image to Base64
const loadSwatchImage = async () => {
  const response = await fetch('swatch.png');
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
};

const captureScreenshot = async () => {
  // Create an offscreen canvas to blend video feed and Three.js scene
  const canvas = document.createElement('canvas');
  canvas.width = renderer.domElement.width;
  canvas.height = renderer.domElement.height;
  const context = canvas.getContext('2d');

  // Flip the context horizontally before drawing the video feed
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Reset the transformation matrix before drawing the Three.js scene
  context.setTransform(1, 0, 0, 1, 0, 0);

  // Render the Three.js scene
  renderer.render(scene, camera);
  const rendererImage = new Image();
  rendererImage.src = renderer.domElement.toDataURL('image/png');
  rendererImage.onload = async () => {
    // Draw the Three.js scene on top of the video feed
    //context.drawImage(rendererImage, 0, 0, canvas.width, canvas.height);

    // Get the final merged image as base64
    const base64Image = canvas.toDataURL('image/png').split(',')[1];

    // Store the last captured image
    lastCapturedImage = base64Image;

    // Load the swatch image and convert it to Base64
    const base64SwatchImage = await loadSwatchImage();

    // Send both images to the Vision API
    sendToVisionAPIMulti(base64Image, base64SwatchImage).then(text => {
      displayText(text);
    });
  };
};


// Function to send the screenshot to the Vision API
const sendToVisionAPI = async (base64Image) => {
  try {
    const response = await fetch('https://us-central1-lightnightflutter-c94ae.cloudfunctions.net/sendToVisionAPI', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ base64Image })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Error:', error);
  }
};


// Function to send the screenshot to the Vision API
const sendToVisionAPIMulti = async (base64Image1, base64Image2) => {
  try {
    const response = await fetch('https://us-central1-lightnightflutter-c94ae.cloudfunctions.net/sendToVisionAPIMulti', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ base64Image1, base64Image2 })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Error:', error);
  }
};

const displayText = (text) => {
  // Remove existing text elements
  const existingTextElements = document.querySelectorAll('.displayed-text');
  existingTextElements.forEach(element => element.remove());

  // Create and display the new text element
  const textElement = document.createElement('div');
  textElement.innerText = text;
  textElement.className = 'displayed-text'; // Add a class for easier removal later
  textElement.style.position = 'absolute';
  textElement.style.top = '10px';
  textElement.style.left = '10px';
  textElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  textElement.style.color = 'white';
  textElement.style.padding = '15px';
  textElement.style.borderRadius = '8px';
  textElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
  textElement.style.fontFamily = 'Arial, sans-serif';
  textElement.style.fontSize = '16px';
  textElement.style.zIndex = '1000';

  // Create and add the dismiss button
  const dismissButton = document.createElement('span');
  dismissButton.innerText = 'X';
  dismissButton.style.marginLeft = '10px';
  dismissButton.style.cursor = 'pointer';
  dismissButton.onclick = () => textElement.remove();
  textElement.appendChild(dismissButton);

  document.body.appendChild(textElement);
};
