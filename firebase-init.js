// Firebase initialization script
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBLIsi_VczMnVoKoNaHqJimZRHUv5QaZDc",
    authDomain: "solar-truck-database.firebaseapp.com",
    projectId: "solar-truck-database",
    storageBucket: "solar-truck-database.firebasestorage.app",
    messagingSenderId: "852200317885",
    appId: "1:852200317885:web:c5bc1fb607f9d282bfa8d4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Make Firebase available globally
window.firebaseApp = app;
window.db = db;
window.firebaseFunctions = {
    collection,
    addDoc,
    getDocs,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy
};

// Load main script after Firebase is ready
function loadMainScript() {
    if (window.db && window.firebaseFunctions && !window.mainScriptLoaded) {
        window.mainScriptLoaded = true;
        const script = document.createElement('script');
        script.src = 'script.js?v=8';
        document.head.appendChild(script);
    }
}

// Start loading the main script
loadMainScript();
