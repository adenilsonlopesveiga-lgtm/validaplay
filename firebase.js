import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBp43RboeJ5eQildnFcTc7JtkHa0xvQdnM",
  authDomain: "validaplay.firebaseapp.com",
  projectId: "validaplay",
  storageBucket: "validaplay.firebasestorage.app",
  messagingSenderId: "731420070879",
  appId: "1:731420070879:web:2b7a466b362211d8256a6a"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
