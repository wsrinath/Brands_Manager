import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyBFDJH_SKsCeybH8eewBw7HTZILnpzVRkw",
    authDomain: "brands-manager.firebaseapp.com",
    projectId: "brands-manager",
    storageBucket: "brands-manager.firebasestorage.app",
    messagingSenderId: "406158641394",
    appId: "1:406158641394:web:b2458de042fdc3265d286b",
    measurementId: "G-H7QR69VQ3Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
