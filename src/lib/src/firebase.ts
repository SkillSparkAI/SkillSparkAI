import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-YOUR-FIREBASE-API-KEY",
  authDomain: "skillspark-ai.firebaseapp.com",
  projectId: "skillspark-ai",
  storageBucket: "skillspark-ai.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const discordProvider = new OAuthProvider('discord.com');

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
