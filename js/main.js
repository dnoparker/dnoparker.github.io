import * as THREE from 'three';
import { MindARThree } from 'mindar-face-three';
import { createToneCircles, highlightAISuggestedTone, getCurrentTone, updateUISelection, tones } from './tones.js';
import { WedgeChart } from './wedge.js'; // Import the WedgeChart class
import { FaceObject } from './faceObject.js'; // Import the base FaceObject class
import { FaceDots } from './faceDots.js';
import { DisplayMode } from './displayMode.js';
import { storeToneChoices, storeRefusal } from './firebase.js';
import { debug, isClaude, CLAUDE_MODEL, GPT_MODEL, SYSTEM_PROMPT, AI_PROMPT, DISPLAY_SETTINGS, API_ENDPOINTS, FACE_ANCHOR_POINTS, CANVAS_SETTINGS, storeImages, showDebugUI } from './config.js';

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
const saveButton = document.getElementById('save-data');
const termsModal = document.getElementById('terms-modal');
const acceptTermsButton = document.getElementById('accept-terms');
const declineTermsButton = document.getElementById('decline-terms');
const thankYouModal = document.getElementById('thank-you-modal');
const userToneText = document.getElementById('user-tone-text');
const aiToneText = document.getElementById('ai-tone-text');

// Touch and Mouse Event Variables
let startX = 0;
let endX = 0;

// Select the Mode Button
const modeButton = document.getElementById('mode-button');

// Add this near the top with other global variables
let capturedData = {
  apiImage: null,      // Image sent to AI (scaled)
  fullResImage: null,  // Full resolution image
  userTone: null,      // User selected tone
  aiTone: null,        // AI suggested tone
  aiResponse: null     // Full AI response text
};

// Add to your global variables
const instructionPanel = document.getElementById('instruction-panel');
const instructionText = document.getElementById('instruction-text');
const instructionNext = document.getElementById('instruction-next');


// Add this function to manage instructions
const instructions = [
  {
    text: "Please position your face inside the oval and hold still. Press next to continue.",
    action: () => {
      // Trigger the Send to AI functionality
      handleSendToAI();
      // Hide the instruction panel while AI processes
      instructionPanel.classList.add('hidden');
    }
  },
  {
    text: "Select your preferred tone from the circles above",
    action: async () => {
      // Hide the instruction panel
      instructionPanel.classList.add('hidden');
      
      try {
        await storeCapturedData();
        
        // Show the thank you modal with the selected tones
        userToneText.textContent = capturedData.userTone.toUpperCase()  || 'no tone';
        aiToneText.textContent = capturedData.aiTone.toUpperCase() || 'no tone';
        thankYouModal.classList.remove('hidden');
        
        // Clear the captured data after successful save
        capturedData = {
          apiImage: null,
          fullResImage: null,
          userTone: null,
          aiTone: null,
          aiResponse: null
        };
        checkCapturedData(); // This will disable relevant buttons
        
        // Disable the send to AI button permanently
        sendToAIButton.disabled = true;
        sendToAIButton.classList.add('button-disabled');
        
      } catch (error) {
        console.error('Error saving data:', error);
        // Optionally show an error message to the user
      }
    }
  }
];

let currentInstructionIndex = 0;

const showInstruction = (index) => {
  if (index < instructions.length) {
    instructionText.textContent = instructions[index].text;
    instructionPanel.classList.remove('hidden');
  } else {
    instructionPanel.classList.add('hidden');
  }
};

// Add instruction button handler
instructionNext.addEventListener('click', () => {
  if (currentInstructionIndex < instructions.length) {
    // Hide the oval when moving to next instruction
    oval.classList.add('hidden');

    // Capture the user tone before executing the action
    const currentToneData = getCurrentTone();
    capturedData.userTone = currentToneData?.tone?.name || null;

    // Execute the action for current instruction if it exists
    if (instructions[currentInstructionIndex].action) {
      instructions[currentInstructionIndex].action();
    }
    
    if (currentInstructionIndex === 1) {
      instructionPanel.classList.add('hidden');
      
      userToneText.textContent = capturedData.userTone || 'no tone';
      aiToneText.textContent = capturedData.aiTone || 'no tone';
      thankYouModal.classList.remove('hidden');
      
      sendToAIButton.disabled = true;
      sendToAIButton.classList.add('button-disabled');
    }
  }
});

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
    const wedge = addFaceObject(FACE_ANCHOR_POINTS.WEDGE_ANCHOR);
    // Initially hide the wedge
    wedge.group.visible = false;
  } else {
    // Add FaceDots objects
    FACE_ANCHOR_POINTS.DOT_ANCHORS.forEach(anchorPoint => {
      const dots = addFaceObject(anchorPoint);
      dots.setDefaultTone(0); // Set default tone to first tone (index 0)
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
  sendToAIButton.disabled = true;
  sendToAIButton.classList.add('button-disabled');

  showLoading();

  // Only animate wedges out if they are currently visible
  faceObjects.forEach(obj => {
    if (obj instanceof WedgeChart && obj.group.visible) {
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
    const wedge = addFaceObject(FACE_ANCHOR_POINTS.WEDGE_ANCHOR);
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
  
  // Get the position indicator element
  const oval = document.getElementById('oval');
  
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);   
    
    // Add this code to continuously monitor the distance
    const centerAnchor = facialAnchors[19];
    if (centerAnchor) {
      const vector = new THREE.Vector3();
      centerAnchor.group.getWorldPosition(vector);
      const distanceX = vector.x - camera.position.x;
      const absDistance = Math.abs(distanceX);
      
      // Toggle the indicator class based on distance
      if (absDistance < 3) {
        oval.classList.add('in-position');
      } else {
        oval.classList.remove('in-position');
      }
      
      //console.log('Distance from camera to anchor 33 (X-axis):', absDistance);
    }
    
    // Update face landmarks for FaceDots
    faceObjects.forEach(obj => {
      obj.update();
    });
  });
};

// -------------------------
// Screenshot and API Interaction
// -------------------------

/**
 * Uploads an image to the server
 * @param {string} base64Image - Base64 encoded image data
 * @returns {Promise<string>} Success status of upload
 */
const uploadImageToServer = async (base64Image) => {
  try {
    const response = await fetch(base64Image);
    const blob = await response.blob();
    
    // Generate filename with timestamp
    const filename = `capture_${Date.now()}.png`;
    const imageUrl = `https://hotknife.co.uk/imageuploader_1/uploads/${filename}`;
    
    // Log the URL for easier access
    console.log('Image URL:', imageUrl);
    
    // Send to PHP server in background
    const formData = new FormData();
    formData.append('image', blob, filename);
    fetch('https://hotknife.co.uk/imageuploader_1/upload.php', {
      method: 'POST',
      body: formData
    }).catch(error => console.error('PHP upload error:', error));

    // Return URL immediately
    console.log('Generated image URL:', imageUrl);
    return imageUrl;
    
  } catch (error) {
    console.error('Error preparing image:', error);
    return null;
  }
};

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

  // Get positions of top and bottom anchor points
  const topPoint = getScreenPosition(facialAnchors[10].group, camera);
  const bottomPoint = getScreenPosition(facialAnchors[152].group, camera);

  // Calculate face height and add some padding
  const faceHeight = bottomPoint.y - topPoint.y;
  const padding = faceHeight * 0.2; // 20% padding

  // Calculate crop dimensions
  const cropX = Math.max(0, topPoint.x - faceHeight / 2);
  const cropY = Math.max(0, topPoint.y - padding);
  const cropWidth = Math.min(faceHeight, offscreenCanvas.width - cropX);
  const cropHeight = Math.min(faceHeight + padding * 2, offscreenCanvas.height - cropY);

  // Create a new canvas for the cropped image
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const croppedCtx = croppedCanvas.getContext('2d');

  // Draw the cropped region
  croppedCtx.drawImage(
    offscreenCanvas,
    cropX, cropY, cropWidth, cropHeight,  // Source rectangle
    0, 0, cropWidth, cropHeight           // Destination rectangle
  );

  // Render the Three.js scene onto the canvas
  renderer.render(scene, camera);
  const rendererImage = new Image();
  rendererImage.src = renderer.domElement.toDataURL('image/png');
  rendererImage.onload = async () => {
    const fullResBase64 = offscreenCanvas.toDataURL('image/png');
    const scaledCanvas = scaleImage(croppedCanvas, CANVAS_SETTINGS.API_IMAGE_SIZE, CANVAS_SETTINGS.API_IMAGE_SIZE);
    const scaledBase64Image = scaledCanvas.toDataURL('image/png');
    const scaledBase64ForAPI = scaledBase64Image.split(',')[1];

    // Store the images in capturedData
    capturedData.apiImage = scaledBase64Image;
    capturedData.fullResImage = fullResBase64;
    
    // Check if data is complete after updating images
    checkCapturedData();

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
        responseText = await sendToVisionAPIMulti(scaledBase64ForAPI, scaledBase64Swatch);
      } catch (error) {
        console.error('Error processing swatch image:', error);
        return;
      }
    }

    if (responseText) {
      await displayTextWithImage(responseText, fullResBase64);
    } else {
      await displayTextWithImage('No response from Vision API', fullResBase64);
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
 * Handles storing the captured data to the server and database
 * @returns {Promise<string|null>} The uploaded image URL if successful, null if failed
 */
const storeCapturedData = async () => {
  try {
    let uploadedImageUrl = null;
    if (storeImages) {
      uploadedImageUrl = await uploadImageToServer(capturedData.apiImage);
      console.log('Image upload result:', uploadedImageUrl);
    }

    // Log the values before storing
    console.log('About to store in Firebase:', {
      userTone: capturedData.userTone,
      aiTone: capturedData.aiTone,
      uploadedImageUrl,
      aiResponse: capturedData.aiResponse
    });

    // Store in Firebase with AI response
    await storeToneChoices(
      capturedData.userTone,
      capturedData.aiTone,
      uploadedImageUrl,
      capturedData.aiResponse
    );
    
    console.log('Successfully stored in Firebase with image URL:', uploadedImageUrl);
    return uploadedImageUrl;
    
  } catch (error) {
    console.error('Error storing captured data:', error);
    return null;
  }
};

/**
 * Displays a text overlay with an image on the screen.
 * @param {string} text - The text to display
 * @param {string} imageUrl - The URL of the image to display
 */
const displayTextWithImage = async (text, imageUrl) => {
  hideLoading();
  
  const suggestedToneName = extractToneName(text);
  const currentToneData = getCurrentTone();

  // Store the tones and AI response in capturedData
  capturedData.userTone = currentToneData?.tone?.name || null;
  capturedData.aiTone = suggestedToneName;
  capturedData.aiResponse = text;
  
  // Check if data is complete after updating tones
  checkCapturedData();

  const suggestedTone = tones.find(tone => 
    tone.name.toUpperCase() === suggestedToneName.toUpperCase()
  );
  const colorHex = suggestedTone ? suggestedTone.hex : '#FFFFFF';

  // Update the modal elements
  const modal = document.getElementById('result-modal');
  const resultImage = document.getElementById('result-image');
  const resultText = document.getElementById('result-text');
  const colorLine = document.getElementById('result-color-line');
  const toneName = document.getElementById('result-tone-name');
  const continueButton = document.getElementById('submit-result');
  const retryButton = document.getElementById('retry-result');

  resultImage.src = imageUrl;
  
  // Format the display text based on whether a valid tone was found
  if (suggestedToneName) {
    resultText.textContent = `The fabric most suited for this person is ${suggestedToneName}`;
    continueButton.classList.remove('hidden');
    retryButton.classList.add('hidden');
  } else {
    resultText.textContent = 'Sorry, something went wrong, please retry';
    continueButton.classList.add('hidden');
    retryButton.classList.remove('hidden');
    
    // Store the refusal if we have an image URL
    if (capturedData.apiImage) {
      let uploadedImageUrl = null;
      if (storeImages) {
        uploadedImageUrl = await uploadImageToServer(capturedData.apiImage);
      }
      await storeRefusal(uploadedImageUrl, text);
    }
  }

  colorLine.style.backgroundColor = colorHex;
  toneName.textContent = suggestedToneName;

  // Show the modal
  modal.classList.remove('hidden');

  // Add event listeners for buttons
  continueButton.onclick = () => {
    modal.classList.add('hidden');
    
    // Show the mode button and tone circles
    document.querySelector('.mode-dropdown').classList.add('visible');
    document.getElementById('tone-circles').classList.add('visible');

    // Make face objects visible before starting AI analysis
    faceObjects.forEach(obj => {
      obj.group.visible = true;
    });
    
    // Show the tone selection instruction
    currentInstructionIndex = 1;
    showInstruction(currentInstructionIndex);
  };

  retryButton.onclick = () => {
    // Show the oval again when retrying
    oval.classList.remove('hidden');
    
    // Hide the result modal
    modal.classList.add('hidden');
    
    // Reset the send to AI button
    sendToAIButton.disabled = false;
    sendToAIButton.classList.remove('button-disabled');

    // Hide the face objects when retrying
    faceObjects.forEach(obj => {
      obj.group.visible = false;
    });

    // Animate wedges back in (if needed)
    faceObjects.forEach(obj => {
      if (obj instanceof WedgeChart) {
        obj.animateWedgesIn();
      }
    });

    // Reset to first instruction and show it
    currentInstructionIndex = 0;
    showInstruction(currentInstructionIndex);
  };

  highlightAISuggestedTone(suggestedToneName);
  checkAndLogTone(text);
};

// Helper function to extract the tone name from the AI's response
const extractToneName = (text) => {
  // Create an array of valid tone names from the tones array
  const validTones = tones.map(tone => tone.name.toLowerCase());
  
  // Look for any of the valid tone names in the text
  const foundTone = validTones.find(tone => 
    text.toLowerCase().includes(tone.toLowerCase())
  );
  
  return foundTone ? foundTone.charAt(0).toUpperCase() + foundTone.slice(1) : '';
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

// Add this function to check if all data is available
const checkCapturedData = () => {
  const isComplete = 
    capturedData.apiImage !== null &&
    capturedData.fullResImage !== null &&
    capturedData.userTone !== null &&
    capturedData.aiTone !== null;

  // Enable/disable save button based on data completeness
  saveButton.disabled = !isComplete;
  if (isComplete) {
    saveButton.classList.remove('button-disabled');
  } else {
    saveButton.classList.add('button-disabled');
  }
};

// Add event listener for save button
saveButton.addEventListener('click', async () => {
  saveButton.disabled = true;
  saveButton.classList.add('button-disabled');
  
  try {
    await storeCapturedData();
    // Optional: Clear the captured data after successful save
    capturedData = {
      apiImage: null,
      fullResImage: null,
      userTone: null,
      aiTone: null,
      aiResponse: null
    };
    checkCapturedData(); // This will disable the button again
  } catch (error) {
    console.error('Error saving data:', error);
    // Re-enable the button if save fails
    saveButton.disabled = false;
    saveButton.classList.remove('button-disabled');
  }
});

// Add this function to your initialization code
const initializeDebugUI = () => {
  if (showDebugUI) {
    // Show debug UI elements
    document.querySelectorAll('.debug-ui').forEach(element => {
      element.classList.add('visible');
    });
    document.querySelector('.button-row').classList.add('visible');
  }
};

// Add this to your initialization sequence
document.addEventListener('DOMContentLoaded', () => {
  // Show terms modal immediately
  termsModal.classList.remove('hidden');

  // Handle terms acceptance
  acceptTermsButton.addEventListener('click', () => {
    termsModal.classList.add('hidden');
    
    // Initialize the app immediately without showing oval instructions
    initializeDebugUI();
    initializeWebcam();
    initializeMindAR();
    setupFacialAnchors();
    setCameraPosition();
    setupEventListeners();
    createToneCircles();
    startAR();
    
    // Initially hide the mode button and tone circles
    document.querySelector('.mode-dropdown').classList.remove('visible');
    document.getElementById('tone-circles').classList.remove('visible');
    
    // Show the first instruction and oval instruction modal together
    currentInstructionIndex = 0;
    showInstruction(currentInstructionIndex);
    
    // Show oval instruction modal as overlay
    const ovalInstructionModal = document.getElementById('oval-instruction-modal');
    ovalInstructionModal.classList.remove('hidden');
    
    // Handle the understand button click
    document.getElementById('understand-oval').addEventListener('click', () => {
      ovalInstructionModal.classList.add('hidden');
    });
  });

  // Handle terms decline
  declineTermsButton.addEventListener('click', () => {
    // You might want to redirect or show a message
    alert('You must accept the terms to use this application.');
  });

  // Add this to your DOMContentLoaded event listener or initialization code
  document.getElementById('start-over').addEventListener('click', () => {
    window.location.reload();
  });
});

