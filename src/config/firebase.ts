import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBSXprJ6Dq3C5SS_0uncwGI4s4g5qdOKUA",
  authDomain: "klik-ci.firebaseapp.com",
  projectId: "klik-ci",
  storageBucket: "klik-ci.firebasestorage.app",
  messagingSenderId: "603820263430",
  appId: "1:603820263430:web:7f1c622a196a0807521b87",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;