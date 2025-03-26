import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
    apiKey: "AIzaSyCb39BFUZgafzPp26cslWJ7TGcHh_LaPmA",
    authDomain: "final-project-ef75f.firebaseapp.com",
    projectId: "final-project-ef75f",
    storageBucket: "final-project-ef75f.firebasestorage.app",
    messagingSenderId: "246958918346",
    appId: "1:246958918346:web:519ee03722aaab80084233",
    measurementId: "G-RJ0SP53S9M"
  };

  const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);