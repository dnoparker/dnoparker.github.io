import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, update } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyApzwzB3qTJuP6SW_nlm5Rj984Ic5cBMEs",
    authDomain: "shapeartstest.firebaseapp.com",
    projectId: "shapeartstest",
    storageBucket: "shapeartstest.appspot.com",
    messagingSenderId: "1021998130062",
    appId: "1:1021998130062:web:819bbec47355ff812bfadf",
    measurementId: "G-Z3XLCJN1KH"
  };

initializeApp(firebaseConfig);

const db = getDatabase();
const storage = getStorage();

// Upload an image along with dog's name and breed
if (document.getElementById('uploadForm')) {
  document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const dogName = document.getElementById('dogName').value;
    const dogBreed = document.getElementById('dogBreed').value;
    const dogImage = document.getElementById('dogImage').files[0];
  
    const storageReference = storageRef(storage, `images/${dogImage.name}`);
    uploadBytes(storageReference, dogImage).then(snapshot => {
      getDownloadURL(snapshot.ref).then(downloadURL => {
        const dbRef = ref(db, `dogs/${snapshot.metadata.name}`);
        set(dbRef, {
          name: dogName,
          breed: dogBreed,
          imageUrl: downloadURL,
          approved: false
        });
      });
    });
  });
}

// Function to approve a dog image (for display.html)
window.approveDog = function(key) {
  const dogRef = ref(db, `dogs/${key}`);
  update(dogRef, { approved: true });
};

// Code to populate dogList and approvedList could be added in display.html and approved.html respectively

