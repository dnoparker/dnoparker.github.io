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

export const storeToneChoices = async (
  userSelectedTone,
  aiSuggestedTone,
  imageUrl = null,
  aiResponse = null
) => {
  try {
    // Clean up the values.
    const payload = {
      userSelectedTone: userSelectedTone?.trim() || null,
      aiSuggestedTone: aiSuggestedTone?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      aiResponse: aiResponse?.trim() || null
    };

    // Cloud Functions endpoint URL that performs domain checking.
    const endpointURL =
      'https://us-central1-shadeshk-f7a95.cloudfunctions.net/writeToFirestore';

    const response = await fetch(endpointURL, {
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