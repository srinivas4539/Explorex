import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCuKgQRge3YtSCZ-9PSajQiHcIAFUxPduM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "explorex-e8d76.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "explorex-e8d76",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "explorex-e8d76.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "764087263124",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:764087263124:web:5a23cb607f9d6c1a38f981",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WGPNZX6P8L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
