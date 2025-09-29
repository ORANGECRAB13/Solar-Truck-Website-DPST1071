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

// Generate a unique session ID for this browser session
function generateSessionId() {
    let sessionId = localStorage.getItem('solarTruckSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('solarTruckSessionId', sessionId);
    }
    return sessionId;
}

// Make Firebase available globally
window.firebaseApp = app;
window.db = db;
window.currentSessionId = generateSessionId();
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
        script.src = 'script.js?v=7';
        document.head.appendChild(script);
    }
}

// Start loading the main script
loadMainScript();
