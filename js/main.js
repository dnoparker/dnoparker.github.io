import * as THREE from 'three';
import { MindARThree } from 'mindar-face-three';
import { tones, createToneCircles, highlightAISuggestedTone } from './tones.js';
import { WedgeChart } from './wedge.js'; // Import the WedgeChart class

// Add this near the top of your file, with other global variables
const debug = true; // Set this to false when you want to use the real API

// -------------------------
// Initialization
// -------------------------

// Set up webcam video element
const videoElement = document.getElementById('webcam');

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    videoElement.srcObject = stream;
  })
  .catch(error => {
    console.error('Error accessing webcam:', error);
  });

// Initialize MindAR with Three.js
const mindAR = new MindARThree({
  container: document.querySelector("#container"),
});

const { renderer, scene, camera } = mindAR;

// Initialize WedgeChart with the existing scene, camera, and renderer
let wedgeChart;

// Array to hold all facial anchors
const facialAnchors = [];

// Create anchors and attach cubes to each facial landmark
for (let index = 0; index < 468; index++) {
  const anchor = mindAR.addAnchor(index);
  facialAnchors.push(anchor);

  if (index === 19) {
    // Initialize WedgeChart and attach it to anchor 19
    wedgeChart = new WedgeChart(scene, camera, renderer);
    wedgeChart.setupEventListeners();
    anchor.group.add(wedgeChart.group);
    console.log("WedgeChart initialized and added to anchor 19");
  } else {
    const cubeGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    anchor.group.add(cube);
  }
}

// Set the camera position
camera.position.z = 5;

// -------------------------
// Event Handlers
// -------------------------

/**
 * Handles the click event on the "send to AI" button.
 * Captures a screenshot and processes it.
 * @param {Event} event - The click event
 */
const showLoading = () => {
  document.getElementById('loading-animation').classList.remove('loading-hidden');
};

const hideLoading = () => {
  document.getElementById('loading-animation').classList.add('loading-hidden');
};

/**
 * Handles the click event on the "get average colors" button.
 * @param {Event} event - The click event
 */
const handleGetAverageColors = (event) => {
  getSampleFaceColors();
};

// -------------------------
// Event Listeners
// -------------------------

// Handle get average colors button click
document.getElementById('get-average-colors').addEventListener('click', handleGetAverageColors);

document.addEventListener('DOMContentLoaded', () => {
  const sendToAIButton = document.getElementById('send-to-ai');

  // Remove the 'disabled' attribute from the button in HTML
  sendToAIButton.removeAttribute('disabled');

  sendToAIButton.addEventListener('click', async () => {
    // Disable the button and change its appearance
    sendToAIButton.disabled = true;
    sendToAIButton.classList.add('button-disabled');

    showLoading();
    try {
      await captureScreenshot();
      // The API call and text display will be handled in the captureScreenshot function

      // Simulating AI processing time with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('AI response received and processed');
    } catch (error) {
      console.error('Error processing AI request:', error);
      displayText('Error processing AI request');
    }
  });

  createToneCircles();

  // Ensure addWedgeClickListener is called
  addWedgeClickListener();

  // Add this new code for toggle functionality
  const toggleControlsButton = document.getElementById('toggle-controls');
  const controlsDiv = document.getElementById('controls');

  const toggleControls = () => {
    controlsDiv.classList.toggle('collapsed');
    toggleControlsButton.textContent = controlsDiv.classList.contains('collapsed') ? 'Show Controls' : 'Hide Controls';
  };

  toggleControlsButton.addEventListener('click', toggleControls);
  toggleControlsButton.addEventListener('touchstart', toggleControls);

  // Variables to store the start and end positions of touch/mouse events
  let startX = 0;
  let endX = 0;

  // Minimum distance for a swipe to be considered valid
  const minSwipeDistance = 30;

  // Touch event handlers
  const handleTouchStart = (event) => {
    startX = event.touches[0].clientX;
  };

  const handleTouchMove = (event) => {
    endX = event.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    handleSwipeGesture();
  };

  // Mouse event handlers
  const handleMouseDown = (event) => {
    startX = event.clientX;
  };

  const handleMouseMove = (event) => {
    endX = event.clientX;
  };

  const handleMouseUp = () => {
    handleSwipeGesture();
  };

  // Function to handle swipe gestures
  const handleSwipeGesture = () => {
    const distance = endX - startX;
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance < 0) {
        // Swipe left
        selectNextWedge();
      } else {
        // Swipe right
        selectPreviousWedge();
      }
    }
  };

  // Function to select the next wedge
  const selectNextWedge = () => {
    if (wedgeChart) {
      const currentIndex = wedgeChart.slices.findIndex(slice => slice.userData.selected);
      const nextIndex = (currentIndex + 1) % wedgeChart.slices.length;
      wedgeChart.animateSlicesToNewDistribution(nextIndex);
    }
  };

  // Function to select the previous wedge
  const selectPreviousWedge = () => {
    if (wedgeChart) {
      const currentIndex = wedgeChart.slices.findIndex(slice => slice.userData.selected);
      const previousIndex = (currentIndex - 1 + wedgeChart.slices.length) % wedgeChart.slices.length;
      wedgeChart.animateSlicesToNewDistribution(previousIndex);
    }
  };

  // Add event listeners for touch events
  const container = document.getElementById('container');
  container.addEventListener('touchstart', handleTouchStart, false);
  container.addEventListener('touchmove', handleTouchMove, false);
  container.addEventListener('touchend', handleTouchEnd, false);

  // Add event listeners for mouse events
  container.addEventListener('mousedown', handleMouseDown, false);
  container.addEventListener('mousemove', handleMouseMove, false);
  container.addEventListener('mouseup', handleMouseUp, false);
});


// -------------------------
// Render Loop
// -------------------------

// Start the MindAR session and begin rendering
const startAR = async () => {
  await mindAR.start();
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    if (wedgeChart) {
      wedgeChart.update();
    }
  });
};

startAR();

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
 * Handles the click event on the "send to AI" button.
 * Captures a screenshot and processes it.
 * @param {Event} event - The click event
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
      // Use lorem ipsum text in debug mode
      responseText = "Based on the image swatch provide, this persons skin tone mostly closely resembles:Raven";
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
 * Handles the click event on the "get average colors" button.
 * @param {Event} event - The click event
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

  facialAnchors.forEach((anchor, index) => {
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
    const sendToAIButton = document.getElementById('send-to-ai');
    sendToAIButton.disabled = false;
    sendToAIButton.classList.remove('button-disabled');
  };
  textContainer.appendChild(dismissBtn);

  // Append to the body
  document.body.appendChild(textContainer);
};

const displayTextWithImage = (text, imageUrl) => {
  hideLoading();
  // Remove any existing text overlays
  const existingTexts = document.querySelectorAll('.displayed-text');
  existingTexts.forEach(element => element.remove());

  // Create the text container
  const textContainer = document.createElement('div');
  textContainer.className = 'displayed-text';

  // Create the image element
  const img = document.createElement('img');
  img.src = imageUrl;
  img.className = 'captured-image';
  textContainer.appendChild(img);

  // Create the text element
  const textElement = document.createElement('p');
  textElement.innerText = text;
  textContainer.appendChild(textElement);

  // Create the dismiss button
  const dismissBtn = document.createElement('span');
  dismissBtn.innerText = ' X';
  dismissBtn.className = 'dismiss-btn';
  dismissBtn.onclick = () => {
    textContainer.remove();
    // Re-enable the "Send to AI" button and restore its appearance
    const sendToAIButton = document.getElementById('send-to-ai');
    sendToAIButton.disabled = false;
    sendToAIButton.classList.remove('button-disabled');
  };
  textContainer.appendChild(dismissBtn);

  // Append to the body
  document.body.appendChild(textContainer);

  // Check and log the tone
  checkAndLogTone(text);
};

// Update the average color circle
const updateAverageColorCircle = (color) => {
  const circle = document.getElementById('average-color-circle');
  circle.style.backgroundColor = color;
};

// Add this new function near the other event handlers
const handleWedgeClick = (event) => {
  if (wedgeChart) {
    wedgeChart.onMouseClick(event);
  }
};

// Add this new function near the other event handlers
const addWedgeClickListener = () => {
  renderer.domElement.addEventListener('click', handleWedgeClick);
};