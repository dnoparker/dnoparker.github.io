// Update the imports to use the CDN versions
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { API_ENDPOINTS } from './config.js';

async function initializeFirebase() {
  try {
    const response = await fetch(API_ENDPOINTS.FIREBASE_CONFIG);
    if (!response.ok) {
      throw new Error('Failed to fetch Firebase config');
    }
    const firebaseConfig = await response.json();
    const app = initializeApp(firebaseConfig);
    return getFirestore(app);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

// Initialize Firebase and export db
let db = null;
const getDb = async () => {
  if (!db) {
    db = await initializeFirebase();
  }
  return db;
};

export const storeToneChoices = async (
  userSelectedTone,
  aiSuggestedTone,
  imageUrl = null,
  aiResponse = null
) => {
  try {
    const payload = {
      userSelectedTone: userSelectedTone?.trim() || null,
      aiSuggestedTone: aiSuggestedTone?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      aiResponse: aiResponse?.trim() || null
    };

    const response = await fetch(API_ENDPOINTS.WRITE_TO_FIRESTORE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    const result = await response.text();
    console.log('Cloud Function response:', result);
    return result;
  } catch (error) {
    console.error('Error storing tone choices via Cloud Function:', error);
    throw error;
  }
};

export const storeRefusal = async (imageUrl, aiResponse) => {
  try {
    const db = await getDb();
    const refusalsRef = collection(db, 'Refusals');
    
    const refusalData = {
      timestamp: serverTimestamp(),
      imageUrl: imageUrl,
      aiResponse: aiResponse
    };

    await addDoc(refusalsRef, refusalData);
    console.log('Refusal stored successfully');
  } catch (error) {
    console.error('Error storing refusal:', error);
  }
};

export { getDb as db }; 