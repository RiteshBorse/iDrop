import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA267yR32ZUJa7ALCCnzi8Oe5KRLlw2YKs",
  authDomain: "copy-79763.firebaseapp.com",
  projectId: "copy-79763",
  storageBucket: "copy-79763.firebasestorage.app",
  messagingSenderId: "709623909562",
  appId: "1:709623909562:web:6e641a6841530e51928683",
  measurementId: "G-Q5QR35ZENZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
