import * as THREE from 'three';
import { MindARThree } from 'mindar-face-three';
import { createToneCircles, highlightAISuggestedTone } from './tones.js';
import { WedgeChart } from './wedge.js'; // Import the WedgeChart class
import { FaceObject } from './faceObject.js'; // Import the base FaceObject class
import { tones } from './tones.js';


// -------------------------
// Global Variables
// -------------------------

const debug = true; // Set to false to use the real API

let mindAR, renderer, scene, camera;
const faceObjects = [];
const facialAnchors = [];

// DOM Elements
const videoElement = document.getElementById('webcam');
const container = document.getElementById('container');
const sendToAIButton = document.getElementById('send-to-ai');
const getAverageColorsButton = document.getElementById('get-average-colors');
const loadingAnimation = document.getElementById('loading-animation');
const averageColorCircle = document.getElementById('average-color-circle');

// Touch and Mouse Event Variables
let startX = 0;
let endX = 0;
const minSwipeDistance = 30;

// -------------------------
// Utility Functions
// -------------------------

/**
 * Converts RGB color values to Hex format.
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {string} Hex color string
 */
const rgbToHex = (r, g, b) => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

/**
 * Gets screen position of a 3D object.
 * @param {THREE.Object3D} object - The 3D object.
 * @param {THREE.Camera} camera - The camera.
 * @returns {Object} x and y coordinates on the screen.
 */
const getScreenPosition = (object, camera) => {
  const vector = new THREE.Vector3();
  object.getWorldPosition(vector);
  vector.project(camera);
  const canvas = renderer.domElement;
  const x = (vector.x + 1) / 2 * canvas.width;
  const y = (-vector.y + 1) / 2 * canvas.height;
  return { x: Math.floor(x), y: Math.floor(y) };
};

/**
 * Loads an image and converts it to Base64.
 * @param {string} imagePath - Path to the image.
 * @returns {Promise<string>} Base64 encoded image.
 */
const loadImageAsBase64 = async (imagePath) => {
  const response = await fetch(imagePath);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// -------------------------
// Face Object Creation
// -------------------------

/**
 * Creates a FaceObject based on the specified type.
 * @param {string} type - Type of the face object.
 * @param {THREE.Scene} scene - The THREE.js scene.
 * @param {THREE.Camera} camera - The camera.
 * @param {THREE.Renderer} renderer - The renderer.
 * @returns {FaceObject} An instance of FaceObject or its subclass.
 */
function createFaceObject(type, scene, camera, renderer) {
  switch (type) {
    case 'wedge':
      return new WedgeChart(scene, camera, renderer);
    // Add other cases for different face object types here
    default:
      return new FaceObject(scene, camera, renderer);
  }
}

/**
 * Adds a FaceObject to a specific anchor.
 * @param {string} type - Type of the face object.
 * @param {number} anchorIndex - Index of the facial anchor.
 * @returns {FaceObject} The created face object.
 */
function addFaceObject(type, anchorIndex) {
  const newObject = createFaceObject(type, scene, camera, renderer);
  newObject.setupEventListeners();
  facialAnchors[anchorIndex].group.add(newObject.group);
  faceObjects.push(newObject);
  return newObject;
}

// -------------------------
// Initialization
// -------------------------

/**
 * Initializes the webcam video stream.
 */
function initializeWebcam() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      videoElement.srcObject = stream;
    })
    .catch(error => {
      console.error('Error accessing webcam:', error);
    });
}

/**
 * Initializes MindAR with Three.js.
 */
function initializeMindAR() {
  mindAR = new MindARThree({
    container: container,
  });

  renderer = mindAR.renderer;
  scene = mindAR.scene;
  camera = mindAR.camera;
}

/**
 * Sets up facial anchors and attaches basic cubes for debugging.
 */
function setupFacialAnchors() {
  for (let index = 0; index < 468; index++) {
    const anchor = mindAR.addAnchor(index);
    facialAnchors.push(anchor);

    // const cubeGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    // const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    // anchor.group.add(cube);
  }

  // wait for 5 seconds
  setTimeout(() => {
    // Example of adding a custom face object
    addFaceObject('wedge', 19);
  }, 5000);
}

/**
 * Sets the initial camera position.
 */
function setCameraPosition() {
  camera.position.z = 5;
}

// -------------------------
// Event Handlers
// -------------------------

/**
 * Displays the loading animation.
 */
const showLoading = () => {
  loadingAnimation.classList.remove('loading-hidden');

  // Check if the loading text already exists
  let loadingText = document.querySelector('.loading-text');
  if (!loadingText) {
    // Create and append the text element if it doesn't exist
    loadingText = document.createElement('div');
    loadingText.innerText = 'Analysing Face';
    loadingText.className = 'loading-text'; // Optional: Add a class for styling
    loadingAnimation.appendChild(loadingText);
  }
};

/**
 * Hides the loading animation.
 */
const hideLoading = () => {
  loadingAnimation.classList.add('loading-hidden');
};

/**
 * Handles the click event for getting average colors.
 * @param {Event} event - The click event.
 */
const handleGetAverageColors = (event) => {
  getSampleFaceColors();
};

/**
 * Handles the swipe gestures based on distance and direction.
 */
const handleSwipeGesture = () => {
  const distance = endX - startX;
  if (Math.abs(distance) > minSwipeDistance) {
    if (distance < 0) {
      // Swipe left
      faceObjects.forEach(obj => obj.swipeLeft());
    } else {
      // Swipe right
      faceObjects.forEach(obj => obj.swipeRight());
    }
  }
};

/**
 * Handles touch start event.
 * @param {TouchEvent} event 
 */
const handleTouchStart = (event) => {
  startX = event.touches[0].clientX;
};

/**
 * Handles touch move event.
 * @param {TouchEvent} event 
 */
const handleTouchMove = (event) => {
  endX = event.touches[0].clientX;
};

/**
 * Handles touch end event.
 */
const handleTouchEnd = () => {
  handleSwipeGesture();
};

/**
 * Handles mouse down event.
 * @param {MouseEvent} event 
 */
const handleMouseDown = (event) => {
  startX = event.clientX;
};

/**
 * Handles mouse move event.
 * @param {MouseEvent} event 
 */
const handleMouseMove = (event) => {
  endX = event.clientX;
};

/**
 * Handles mouse up event.
 */
const handleMouseUp = () => {
  handleSwipeGesture();
};

/**
 * Handles the click event for the "Send to AI" button.
 */
const handleSendToAI = async () => {
  // Disable the button and change its appearance
  sendToAIButton.disabled = true;
  sendToAIButton.classList.add('button-disabled');

  showLoading();

  // Animate wedges out
  faceObjects.forEach(obj => {
    if (obj instanceof WedgeChart) {
      obj.animateWedgesOut();
    }
  });

  try {
    await captureScreenshot();
    // The API call and text display are handled within captureScreenshot

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('AI response received and processed');
  } catch (error) {
    console.error('Error processing AI request:', error);
    displayText('Error processing AI request');
  } 
};

// -------------------------
// DEBUG: Wedge Animation Toggle
// Remove this section for production
// -------------------------

let isWedgesVisible = true; // Track the current state of wedges

// Toggle wedge animation
const toggleWedgeAnimation = () => {
  isWedgesVisible = !isWedgesVisible;
  faceObjects.forEach(obj => {
    if (obj instanceof WedgeChart) {
      if (isWedgesVisible) {
        obj.animateWedgesIn();
      } else {
        obj.animateWedgesOut();
      }
    }
  });
};

// Handle keydown events for debug toggle
const handleKeyDown = (event) => {
  if (event.code === 'Space') {
    event.preventDefault(); // Prevent default space bar behavior
    toggleWedgeAnimation();
  }
};

// -------------------------
// Event Listeners Setup
// -------------------------

function setupEventListeners() {
  // Button Event Listeners
  getAverageColorsButton.addEventListener('click', handleGetAverageColors);
  sendToAIButton.removeAttribute('disabled');
  sendToAIButton.addEventListener('click', handleSendToAI);

  // Touch Event Listeners for Swipe Gestures
  container.addEventListener('touchstart', handleTouchStart, false);
  container.addEventListener('touchmove', handleTouchMove, false);
  container.addEventListener('touchend', handleTouchEnd, false);

  // Mouse Event Listeners for Swipe Gestures
  container.addEventListener('mousedown', handleMouseDown, false);
  container.addEventListener('mousemove', handleMouseMove, false);
  container.addEventListener('mouseup', handleMouseUp, false);

  // DEBUG: Add keyboard event listener for animation toggle
  document.addEventListener('keydown', handleKeyDown);
}

// -------------------------
// Rendering Loop
// -------------------------

/**
 * Starts the AR session and begins the render loop.
 */
const startAR = async () => {
  await mindAR.start();
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    faceObjects.forEach(obj => obj.update());
  });
};

// -------------------------
// Screenshot and API Interaction
// -------------------------

/**
 * Captures a screenshot from the video and Three.js renderer.
 */
const captureScreenshot = async () => {
  // Create an offscreen canvas
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = renderer.domElement.width;
  offscreenCanvas.height = renderer.domElement.height;
  const ctx = offscreenCanvas.getContext('2d');

  // Draw the mirrored video feed
  ctx.translate(offscreenCanvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

  // Reset transformation
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Render the Three.js scene onto the canvas
  renderer.render(scene, camera);
  const rendererImage = new Image();
  rendererImage.src = renderer.domElement.toDataURL('image/png');
  rendererImage.onload = async () => {
    // Get the final image data
    const base64Image = offscreenCanvas.toDataURL('image/png').split(',')[1];

    let responseText;
    if (debug) {
      // Use placeholder text in debug mode
      responseText = "Based on the image swatch provided, this person's skin tone mostly closely resembles: Raven";
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      // Load the swatch image as Base64
      const base64Swatch = await loadImageAsBase64('swatch.png');

      // Send both images to the Vision API
      responseText = await sendToVisionAPIMulti(base64Image, base64Swatch);
    }

    if (responseText) {
      displayTextWithImage(responseText, `data:image/png;base64,${base64Image}`);
    } else {
      displayTextWithImage('No response from Vision API', `data:image/png;base64,${base64Image}`);
    }
  };
};

/**
 * Gets sample face colors from the captured image.
 */
const getSampleFaceColors = async () => {
  // Create an offscreen canvas to capture the video frame
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = renderer.domElement.width;
  offscreenCanvas.height = renderer.domElement.height;
  const ctx = offscreenCanvas.getContext('2d');

  // Draw the mirrored video feed
  ctx.translate(offscreenCanvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

  // Reset transformation
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Get image data from the canvas
  const imageData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);

  let totalR = 0, totalG = 0, totalB = 0, count = 0;

  facialAnchors.forEach((anchor) => {
    const { x, y } = getScreenPosition(anchor.group, camera);

    if (x >= 0 && x < offscreenCanvas.width && y >= 0 && y < offscreenCanvas.height) {
      const pixelIndex = (y * offscreenCanvas.width + x) * 4;
      const r = imageData.data[pixelIndex];
      const g = imageData.data[pixelIndex + 1];
      const b = imageData.data[pixelIndex + 2];

      const hexColor = rgbToHex(r, g, b);

      // Update the color of the cube attached to the anchor
      const cube = anchor.group.children.find(child => child instanceof THREE.Mesh);
      if (cube) {
        cube.material.color.set(hexColor);
      }

      // Accumulate RGB values for average color
      totalR += r;
      totalG += g;
      totalB += b;
      count++;
    }
  });

  if (count > 0) {
    // Calculate and set the average color for the circle
    const avgR = Math.round(totalR / count);
    const avgG = Math.round(totalG / count);
    const avgB = Math.round(totalB / count);
    const averageHex = rgbToHex(avgR, avgG, avgB);

    updateAverageColorCircle(averageHex);
  }
};

/**
 * Sends two Base64 encoded images to the Vision API.
 * @param {string} base64Image1 - First image in Base64
 * @param {string} base64Image2 - Second image in Base64
 * @returns {Promise<string>} The content returned by the API
 */
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
    console.error('Error sending images to Vision API:', error);
    return null;
  }
};

/**
 * Displays a text overlay on the screen with the provided content.
 * @param {string} text - The text to display
 */
const displayText = (text) => {
  hideLoading();
  // Remove any existing text overlays
  const existingTexts = document.querySelectorAll('.displayed-text');
  existingTexts.forEach(element => element.remove());

  // Create the text container
  const textContainer = document.createElement('div');
  textContainer.innerText = text;
  textContainer.className = 'displayed-text';

  // Create the dismiss button
  const dismissBtn = document.createElement('span');
  dismissBtn.innerText = ' X';
  dismissBtn.className = 'dismiss-btn';
  dismissBtn.onclick = () => {
    textContainer.remove();
    // Re-enable the "Send to AI" button and restore its appearance
    sendToAIButton.disabled = false;
    sendToAIButton.classList.remove('button-disabled');
  };
  textContainer.appendChild(dismissBtn);

  // Append to the body
  document.body.appendChild(textContainer);
};

/**
 * Displays a text overlay with an image on the screen.
 * @param {string} text - The text to display
 * @param {string} imageUrl - The URL of the image to display
 */
const displayTextWithImage = (text, imageUrl) => {
  hideLoading();
  const existingTexts = document.querySelectorAll('.displayed-text');
  existingTexts.forEach(element => element.remove());

  const suggestedToneName = extractToneName(text);
  const suggestedTone = tones.find(tone => tone.name.toUpperCase() === suggestedToneName.toUpperCase());
  const colorHex = suggestedTone ? suggestedTone.hex : '#FFFFFF';

  const textContainer = document.createElement('div');
  textContainer.className = 'displayed-text';

  const imageContainer = document.createElement('div');
  imageContainer.className = 'image-container';

  const img = document.createElement('img');
  img.src = imageUrl;
  img.className = 'captured-image';
  imageContainer.appendChild(img);

  const colorLine = document.createElement('div');
  colorLine.className = 'color-line';
  colorLine.style.backgroundColor = colorHex;
  imageContainer.appendChild(colorLine);

  textContainer.appendChild(imageContainer);

  const textElement = document.createElement('p');
  textElement.innerText = text;
  textContainer.appendChild(textElement);

  const dismissBtn = document.createElement('span');
  dismissBtn.innerText = '×';
  dismissBtn.className = 'dismiss-btn';
  dismissBtn.onclick = () => {
      textContainer.remove();
      const sendToAIButton = document.getElementById('send-to-ai');
      if (sendToAIButton) {
          sendToAIButton.disabled = false;
          sendToAIButton.classList.remove('button-disabled');
      }

          // Animate wedges back in
    faceObjects.forEach(obj => {
      if (obj instanceof WedgeChart) {
        obj.animateWedgesIn();
      }
    });
  };
  textContainer.appendChild(dismissBtn);

  document.body.appendChild(textContainer);

  highlightAISuggestedTone(suggestedToneName);
  checkAndLogTone(text);
};

// Helper function to extract the tone name from the AI's response
const extractToneName = (text) => {
  const match = text.match(/resembles:\s*(\w+)/i);
  return match ? match[1].trim() : '';
};

/**
 * Updates the average color circle's background color.
 * @param {string} color - Hex color code
 */
const updateAverageColorCircle = (color) => {
  averageColorCircle.style.backgroundColor = color;
};

/**
 * Checks the AI response text and logs the corresponding tone.
 * @param {string} text - The AI response text
 */
const checkAndLogTone = (text) => {
  // Implement tone checking logic here if necessary
  // Example:
  if (text.includes('Raven')) {
    highlightAISuggestedTone('Raven');
    console.log('Raven');
  }
};

// -------------------------
// DOM Content Loaded
// -------------------------

document.addEventListener('DOMContentLoaded', () => {
  initializeWebcam();
  initializeMindAR();
  setupFacialAnchors();
  setCameraPosition();
  setupEventListeners();
  createToneCircles();
  startAR();
});