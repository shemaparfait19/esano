// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "esano-ai-genealogy-explorer",
  "appId": "1:955274882186:web:1c97929adafc3f7c2d5173",
  "storageBucket": "esano-ai-genealogy-explorer.firebasestorage.app",
  "apiKey": "AIzaSyBkfXSjTEvHUq0U01sayIwS36ALVx-dKuY",
  "authDomain": "esano-ai-genealogy-explorer.firebaseapp.com",
  "messagingSenderId": "955274882186"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
