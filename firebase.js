import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "validaplay.firebaseapp.com",
  projectId: "validaplay",
  storageBucket: "validaplay.firebasestorage.app",
  messagingSenderId: "731420070879",
  appId: "1:731420070879:web:2b7a466b362211d8256a6a"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
