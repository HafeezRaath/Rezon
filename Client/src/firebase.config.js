// 1. Ye import line sabse upar lazmi honi chahiye
import { initializeApp } from "firebase/app"; 

import { 
  getAuth, 
  GoogleAuthProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQvJ8cJ_c8q7lJrWHtHRDD9vdfgd4WSaw",
  authDomain: "otp-project-ef670.firebaseapp.com",
  projectId: "otp-project-ef670",
  storageBucket: "otp-project-ef670.appspot.com",
  messagingSenderId: "854222680516",
  appId: "1:854222680516:web:d3a506aa2b3aefabcdf491",
  measurementId: "G-FQC1ZES5PR"
};

// 2. Ab ye line sahi chale gi
const app = initializeApp(firebaseConfig); 
const auth = getAuth(app);

const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: "select_account" });

export { auth, google, RecaptchaVerifier, signInWithPhoneNumber };