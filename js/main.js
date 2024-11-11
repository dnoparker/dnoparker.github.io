import * as THREE from 'three';
import { MindARThree } from 'mindar-face-three';
import { createToneCircles, highlightAISuggestedTone, getCurrentTone, updateUISelection, tones } from './tones.js';
import { WedgeChart } from './wedge.js'; // Import the WedgeChart class
import { FaceObject } from './faceObject.js'; // Import the base FaceObject class
import { FaceDots } from './faceDots.js';
import { DisplayMode } from './displayMode.js';
import { storeToneChoices } from './firebase.js';
import { debug, isClaude, CLAUDE_MODEL, GPT_MODEL, SYSTEM_PROMPT, AI_PROMPT, DISPLAY_SETTINGS, API_ENDPOINTS, FACE_ANCHOR_POINTS, CANVAS_SETTINGS } from './config.js';

// -------------------------
// Global Variables
// -------------------------

let mindAR, renderer, scene, camera;
const faceObjects = [];
const facialAnchors = [];

let currentDisplayMode = DisplayMode[DISPLAY_SETTINGS.DEFAULT_DISPLAY_MODE];
const minSwipeDistance = DISPLAY_SETTINGS.MIN_SWIPE_DISTANCE;

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

// Select the Mode Button
const modeButton = document.getElementById('mode-button');


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

// Fix the scaleImage function
const scaleImage = (sourceCanvas, targetWidth, targetHeight) => {
  const scaledCanvas = document.createElement('canvas'); // Create new canvas instead of recursive call
  scaledCanvas.width = targetWidth;
  scaledCanvas.height = targetHeight;
  const ctx = scaledCanvas.getContext('2d');
  
  // Use better quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw the source canvas scaled down to target dimensions
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  
  return scaledCanvas;
};

// -------------------------
// Face Object Creation
// -------------------------

/**
 * Creates a FaceObject based on the current display mode.
 * @param {THREE.Scene} scene - The THREE.js scene.
 * @param {THREE.Camera} camera - The camera.
 * @param {THREE.Renderer} renderer - The renderer.
 * @returns {FaceObject} An instance of FaceObject or its subclass.
 */
function createFaceObject(scene, camera, renderer) {
  switch (currentDisplayMode) {
    case DisplayMode.WEDGE:
      return new WedgeChart(scene, camera, renderer);
    case DisplayMode.FACEDOTS:
      return new FaceDots(scene, camera, renderer);
    default:
      return new FaceObject(scene, camera, renderer);
  }
}

/**
 * Adds a FaceObject to a specific anchor based on the current display mode.
 * @param {number} anchorIndex - Index of the facial anchor.
 * @returns {FaceObject} The created face object.
 */
function addFaceObject(anchorIndex) {
  const newObject = createFaceObject(scene, camera, renderer);
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
 * Sets up facial anchors and attaches face objects based on the current display mode.
 */
function setupFacialAnchors() {
  for (let index = 0; index < 468; index++) {
    const anchor = mindAR.addAnchor(index);
    facialAnchors.push(anchor);
  }

  if (currentDisplayMode === DisplayMode.WEDGE) {
    addFaceObject(FACE_ANCHOR_POINTS.WEDGE_ANCHOR);
  } else {
    FACE_ANCHOR_POINTS.DOT_ANCHORS.forEach(anchor => {
      addFaceObject(anchor);
    });
  }
}

/**
 * Sets the initial camera position.
 */
function setCameraPosition() {
  camera.position.z = DISPLAY_SETTINGS.CAMERA_POSITION_Z;
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
// Display Mode Toggle
// -------------------------

/**
 * Toggles between display modes.
 */
const toggleDisplayMode = (mode) => {
  if (mode === 'wedge') {
    currentDisplayMode = DisplayMode.WEDGE;
  } else if (mode === 'dots') {
    currentDisplayMode = DisplayMode.FACEDOTS;
  } else {
    return;
  }
  
  // Remove existing face objects
  faceObjects.forEach(obj => {
    const anchorGroup = obj.group.parent;
    if (anchorGroup) {
      anchorGroup.remove(obj.group);
    }
  });
  faceObjects.length = 0;

  // Add new face objects based on the current display mode
  if (currentDisplayMode === DisplayMode.WEDGE) {
    const wedge = addFaceObject(200); // Add WedgeChart to a specific anchor
    wedge.animateSlicesToNewDistribution(0); // Set default tone to first tone (index 0)
  } else {
    // Add FaceDots objects
    for (let i of [0, 100, 200, 300]) {
      const dots = addFaceObject(i);
      dots.setDefaultTone(0); // Set default tone to first tone (index 0)
    }
  }

  // Update UI selection to match default tone
  updateUISelection(0);

  highlightSelectedMode(mode);
};


/**
 * Highlights the selected mode in the dropdown menu.
 * @param {string} selectedMode - The selected mode ('wedge' or 'dots')
 */
const highlightSelectedMode = (selectedMode) => {
  const modeOptions = document.querySelectorAll('.mode-option');
  modeOptions.forEach(option => {
    if (option.getAttribute('data-mode') === selectedMode) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
};

/**
 * Handles keydown events for display mode toggle and debug features.
 * @param {KeyboardEvent} event 
 */
const handleKeyDown = (event) => {
  if (event.code === 'Space') {
    event.preventDefault(); // Prevent default space bar behavior
    toggleDisplayMode();
  }
};

// Event Listener for Mode Button
modeButton.addEventListener('click', () => {
  toggleDisplayMode();
});

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

  // Mode dropdown functionality
  const modeButton = document.getElementById('mode-button');
  const modeDropdownContent = document.querySelector('.mode-dropdown-content');

  modeButton.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = modeButton.classList.contains('menu-open');
    modeButton.classList.toggle('menu-open');
    
    if (!isOpen) {
      // Show dropdown content with a slight delay to allow button animation
      setTimeout(() => {
        modeDropdownContent.classList.add('visible');
      }, 150);
    } else {
      modeDropdownContent.classList.remove('visible');
    }
  });

  document.querySelectorAll('.mode-option').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling up
      const selectedMode = e.currentTarget.getAttribute('data-mode');
      toggleDisplayMode(selectedMode);
      // Remove the lines that close the dropdown
      // modeButton.classList.remove('menu-open');
      // modeDropdownContent.classList.remove('visible');
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mode-dropdown')) {
      modeButton.classList.remove('menu-open');
      modeDropdownContent.classList.remove('visible');
    }
  });

  highlightSelectedMode(currentDisplayMode === DisplayMode.WEDGE ? 'wedge' : 'dots');
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
    
    // Update face landmarks for FaceDots
    const faceLandmarks = mindAR.getFaceLandmarks();
    faceObjects.forEach(obj => {
      if (obj instanceof FaceDots) {
        obj.update(faceLandmarks);
      } else {
        obj.update();
      }
    });
  });
};

// -------------------------
// Screenshot and API Interaction
// -------------------------

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
    // Keep full resolution version for display
    const fullResBase64 = offscreenCanvas.toDataURL('image/png');

    // Create scaled version for API
    const scaledCanvas = scaleImage(offscreenCanvas, CANVAS_SETTINGS.API_IMAGE_SIZE, CANVAS_SETTINGS.API_IMAGE_SIZE);
    const scaledBase64Image = scaledCanvas.toDataURL('image/png').split(',')[1];

    let responseText;
    if (debug) {
      responseText = "Based on the image swatch provided, this person's skin tone mostly closely resembles: Raven";
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      // Load and scale the swatch image
      const swatchImg = new Image();
      swatchImg.crossOrigin = "Anonymous";
      
      try {
        await new Promise((resolve, reject) => {
          swatchImg.onload = resolve;
          swatchImg.onerror = reject;
          swatchImg.src = 'swatch.png';
        });

        const swatchCanvas = document.createElement('canvas');
        swatchCanvas.width = swatchImg.width;
        swatchCanvas.height = swatchImg.height;
        const swatchCtx = swatchCanvas.getContext('2d');
        swatchCtx.drawImage(swatchImg, 0, 0);

        // Scale swatch to 200x200 for API
        const scaledSwatchCanvas = scaleImage(swatchCanvas, CANVAS_SETTINGS.API_IMAGE_SIZE, CANVAS_SETTINGS.API_IMAGE_SIZE);
        const scaledBase64Swatch = scaledSwatchCanvas.toDataURL('image/png').split(',')[1];

        // Send scaled images to Vision API
        responseText = await sendToVisionAPIMulti(scaledBase64Image, scaledBase64Swatch);
      } catch (error) {
        console.error('Error processing swatch image:', error);
        return;
      }
    }

    if (responseText) {
      // Use full resolution image for display
      displayTextWithImage(responseText, fullResBase64);
    } else {
      displayTextWithImage('No response from Vision API', fullResBase64);
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
    console.log('Sending images to API:', {
      image1Length: base64Image1.length,
      image2Length: base64Image2.length
    });

    const endpoint = isClaude 
      ? API_ENDPOINTS.CLAUDE_VISION
      : API_ENDPOINTS.VISION_API_MULTI;

    const model = isClaude ? CLAUDE_MODEL : GPT_MODEL;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        base64Image1, 
        base64Image2,
        prompt: AI_PROMPT,
        model: model,
        systemPrompt: SYSTEM_PROMPT  // Add the system prompt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
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
const displayTextWithImage = async (text, imageUrl) => {
  hideLoading();
  const existingTexts = document.querySelectorAll('.displayed-text');
  existingTexts.forEach(element => element.remove());

  const suggestedToneName = extractToneName(text);
  const suggestedTone = tones.find(tone => tone.name.toUpperCase() === suggestedToneName.toUpperCase());
  const colorHex = suggestedTone ? suggestedTone.hex : '#FFFFFF';

  // Get the current user-selected tone
  let userSelectedTone = 'UNKNOWN';
  try {
    const currentToneData = getCurrentTone();
    if (currentToneData && currentToneData.tone) {
      userSelectedTone = currentToneData.tone.name;
      console.log('Selected tone:', userSelectedTone); // Debug log
    }
  } catch (error) {
    console.error('Error getting selected tone:', error);
  }

  // Store the choices in Firestore
  try {
    await storeToneChoices(userSelectedTone, suggestedToneName);
    console.log('Stored tones:', { userSelectedTone, suggestedToneName });
  } catch (error) {
    console.error('Error storing tone choices:', error);
  }

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

  // Add the tone name on top of the color line
  const toneName = document.createElement('div');
  toneName.className = 'tone-name';
  toneName.textContent = suggestedToneName;
  colorLine.appendChild(toneName);

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
  // Update the regex pattern to match the new response format
  const match = text.match(/most suited for this person is (\w+)/i);
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
  const toneName = extractToneName(text);
  if (toneName) {
    highlightAISuggestedTone(toneName);
    console.log('AI suggested tone:', toneName);
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

