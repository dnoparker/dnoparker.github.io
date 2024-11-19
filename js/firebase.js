import{initializeApp}from"https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";import{getFirestore,collection,addDoc,serverTimestamp}from"https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";const firebaseConfig={apiKey:"AIzaSyDygPgbNFj_A42Q4k65okz1qhSLZTvFBN8",authDomain:"shadeshk-f7a95.firebaseapp.com",projectId:"shadeshk-f7a95",storageBucket:"shadeshk-f7a95.firebasestorage.app",messagingSenderId:"837744563127",appId:"1:837744563127:web:ad597ddb131a40c5604e32",measurementId:"G-N568EPGZFJ"},app=initializeApp(firebaseConfig),db=getFirestore(app);export const storeToneChoices=async(userSelectedTone,aiSuggestedTone,imageUrl=null)=>{try{console.log("storeToneChoices called with:",{userSelectedTone:userSelectedTone,aiSuggestedTone:aiSuggestedTone,imageUrl:imageUrl});const data={userSelectedTone:userSelectedTone,aiSuggestedTone:aiSuggestedTone,timestamp:(new Date).toISOString()};imageUrl&&(console.log("Adding image URL to Firebase data:",imageUrl),data.imageUrl=imageUrl);const docRef=await addDoc(collection(db,"toneChoices"),data);return console.log("Document written with ID:",docRef.id),docRef}catch(error){throw console.error("Error storing tone choices:",error),error}};export{db};