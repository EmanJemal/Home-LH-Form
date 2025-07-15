// firebase.js (using CDN imports)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getDatabase, ref, set, get, update, remove, onValue, child, push } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyC_RUop4ljHtYD-dpMDRBBTBuuUIKb5MH4",
    authDomain: "home-land-hotel.firebaseapp.com",
    projectId: "home-land-hotel",
    storageBucket: "home-land-hotel.firebasestorage.app",
    messagingSenderId: "228096864712",
    appId: "1:228096864712:web:cbee74a33f435c34d150fd",
    measurementId: "G-N1FNRRNVDV"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Export all needed things
export { database, auth, ref, set, get, update, remove, onValue, child, push, signInWithEmailAndPassword, onAuthStateChanged, signOut };
