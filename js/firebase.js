// Update the imports to use the CDN versions
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDygPgbNFj_A42Q4k65okz1qhSLZTvFBN8",
    authDomain: "shadeshk-f7a95.firebaseapp.com",
    projectId: "shadeshk-f7a95",
    storageBucket: "shadeshk-f7a95.firebasestorage.app",
    messagingSenderId: "837744563127",
    appId: "1:837744563127:web:ad597ddb131a40c5604e32",
    measurementId: "G-N568EPGZFJ"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const storeToneChoices = async (userSelectedTone, aiSuggestedTone, imageUrl = null, aiResponse = null) => {
  try {
    // Clean up the values
    const cleanUserTone = userSelectedTone?.trim() || null;
    const cleanAiTone = aiSuggestedTone?.trim() || null;
    const cleanImageUrl = imageUrl?.trim() || null;
    const cleanAiResponse = aiResponse?.trim() || null;

    console.log('storeToneChoices called with:', {
      userSelectedTone: cleanUserTone,
      aiSuggestedTone: cleanAiTone,
      imageUrl: cleanImageUrl,
      aiResponse: cleanAiResponse
    });

    const data = {
      userSelectedTone: cleanUserTone,
      aiSuggestedTone: cleanAiTone,
      timestamp: new Date().toISOString(),
      aiResponse: cleanAiResponse
    };

    if (cleanImageUrl) {
      data.imageUrl = cleanImageUrl;
    }

    const docRef = await addDoc(collection(db, "toneChoices"), data);
    console.log('Document written with ID:', docRef.id);
    
    return docRef;
  } catch (error) {
    console.error("Error storing tone choices:", error);
    throw error;
  }
};

export const storeRefusal = async (imageUrl, aiResponse) => {
  try {
    const db = getFirestore();
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

export { db }; 