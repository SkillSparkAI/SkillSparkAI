import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0798551092",
  appId: "1:990686618444:web:36e011de904dafd59fa5e9",
  apiKey: "AIzaSyCMkNkIoBbXWbpk5Mrarc27MfnKP4LlLsg",
  authDomain: "gen-lang-client-0798551092.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-afd9fb28-b31f-4fd7-8613-9a577841682a",
  storageBucket: "gen-lang-client-0798551092.firebasestorage.app",
  messagingSenderId: "990686618444",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const discordProvider = new OAuthProvider('oidc.discord');
