import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, addDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCZJj830ufepvh2fh_ehkPoOki_l3QcCew",
    authDomain: "glacier-ice-cream-parlor.firebaseapp.com",
    projectId: "glacier-ice-cream-parlor",
    storageBucket: "glacier-ice-cream-parlor.firebasestorage.app",
    messagingSenderId: "281867852305",
    appId: "1:281867852305:web:6a35075905bdadb0592fb0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider(); 
const db = getFirestore(app);

// Make Firebase functions available globally for Cart & Checkouts
window.db = db;
window.addDoc = addDoc;
window.collection = collection;

window.globalUser = null; 
window.globalUserData = null;
window.userDocId = null; 

onAuthStateChanged(auth, (user) => {
    if (user) {
        window.globalUser = user; window.userDocId = user.uid; 
        document.getElementById('nav-profile-text').innerText = user.displayName ? user.displayName.split(' ')[0] : "Guest";
        window.fetchUserData(window.userDocId);
    } else {
        window.globalUser = null; window.globalUserData = null; window.userDocId = null;
        document.getElementById('nav-profile-text').innerText = "Login";
    }
});

window.googleLogin = async () => {
    try { await signInWithPopup(auth, provider); document.getElementById('auth-modal').style.display='none'; } 
    catch (error) { document.getElementById('auth-error').innerText = "Login failed."; }
};

window.guestLogin = async () => {
    try { await signInAnonymously(auth); document.getElementById('auth-modal').style.display='none'; } 
    catch (error) { document.getElementById('auth-error').innerText = "Login failed."; }
};

window.logout = () => { signOut(auth).then(() => { window.location.reload(); }); };

window.fetchUserData = function(docId) {
    onSnapshot(doc(db, "users", docId), (docSnap) => {
        if (docSnap.exists()) {
            window.globalUserData = docSnap.data();
            window.renderAddresses(); 
        } else {
            window.globalUserData = { name: window.globalUser.displayName || '', addresses: [], defaultAddressIndex: 0 };
            setDoc(doc(db, "users", docId), window.globalUserData); window.renderAddresses();
        }
    });
}
