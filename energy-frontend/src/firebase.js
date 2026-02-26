import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBBocDxgWPQnXpZVhOZsOPPws5_8HvGCxc",
  authDomain: "energy-analytics-70e9a.firebaseapp.com",
  projectId: "energy-analytics-70e9a",
  appId: "1:1079776429370:web:e7e4821424449c6648fc03",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();