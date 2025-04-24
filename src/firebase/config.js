import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCus7FLwZTI1L7IlriabVLYrSzgtNQvEDU",
  authDomain: "thinkboard-d0191.firebaseapp.com",
  projectId: "thinkboard-d0191",
  storageBucket: "thinkboard-d0191.firebasestorage.app",
  messagingSenderId: "40100675004",
  appId: "1:40100675004:web:0c7843aa0fbc6a0201ffb9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 