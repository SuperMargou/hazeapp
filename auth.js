import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_GRG-jab16eVlfmQq7-2OxyL5KFsBOAo",
  authDomain: "catho-wiki.firebaseapp.com",
  projectId: "catho-wiki",
  storageBucket: "catho-wiki.firebasestorage.app",
  messagingSenderId: "638696298389",
  appId: "1:638696298389:web:a1496d8175bb029ac0089c",
  measurementId: "G-WQ1VJNKZG5"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export function onAuthChange(callback) {
  onAuthStateChanged(auth, user => callback(user));
}

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}
