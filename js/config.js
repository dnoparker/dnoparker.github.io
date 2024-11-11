// Debug Settings
export const debug = false; // Set to false to use the real API
export const isClaude = true; // Set to true to use Claude Vision API instead of OpenAI

// API Models
export const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";
export const GPT_MODEL = "gpt-4o";

// AI Prompts
export const SYSTEM_PROMPT = `
  You are an AI assistant helping dancers find appropriate skin-tone colored dance wear. 
  You will only analyze images where the person has explicitly consented to having their 
  image processed for skin tone matching. 
  
  Your role is to suggest which fabric color option would be the closest match for the 
  person in the image. You will be shown two images: one of a consenting person and one 
  of fabric swatches. 
  
  Your suggestions help promote inclusivity in dance by helping dancers find attire that 
  matches their skin tone, but the final choice always remains with the dancer. 
  
  Please be respectful and professional in your analysis.
`;

export const AI_PROMPT = `
  You are assisting with an inclusive dancewear project. Many dancers, particularly 
  those from marginalized communities, struggle to find dance attire that matches 
  their skin tone. This creates barriers to participation and feelings of exclusion 
  in dance. The person in the image has consented to having their photo analyzed for 
  skin tone matching purposes.

  You are looking at two images:
  1. A consenting person seeking dance attire
  2. A fabric swatch showing four specific color options labeled PEARL, UDAY, RAVEN, 
     and BOJANGLES

  To promote inclusion and equal representation in dance, which of these specific 
  fabric options (choosing only from PEARL, UDAY, RAVEN, or BOJANGLES) would be the 
  best match for this person?

  Format your EXACTLY as:
  "The fabric most suited for this person is [NAME OF COLOUR]"
`;

// Display Settings
export const DISPLAY_SETTINGS = {
  DEFAULT_DISPLAY_MODE: 'WEDGE',
  MIN_SWIPE_DISTANCE: 30,
  CAMERA_POSITION_Z: 5
};

// API Settings
export const API_ENDPOINTS = {
  CLAUDE_VISION: 'https://us-central1-shadeshk-f7a95.cloudfunctions.net/sendToClaudeVision',
  VISION_API_MULTI: 'https://us-central1-shadeshk-f7a95.cloudfunctions.net/sendToVisionAPIMulti'
};

// Face Anchor Points
export const FACE_ANCHOR_POINTS = {
  WEDGE_ANCHOR: 200,
  DOT_ANCHORS: [0, 100, 200, 300]
};

// Canvas Settings
export const CANVAS_SETTINGS = {
  API_IMAGE_SIZE: 200,
  IMAGE_TYPE: 'image/png',
  SWATCH_PATH: 'swatch.png'
}; 