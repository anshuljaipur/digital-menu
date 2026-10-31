// Shared Firebase setup for AppDesk apps (Firestore + Google login).
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithPopup,GoogleAuthProvider,signOut} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getFirestore,collection,doc,addDoc,setDoc,getDoc,getDocs,updateDoc,deleteDoc,onSnapshot,query,orderBy,limit,where} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const cfg=window.FIREBASE_CONFIG||{};
const ok=!!cfg.apiKey&&!/^PASTE/.test(cfg.apiKey);
const app=ok?initializeApp(cfg):null;
export const auth=ok?getAuth(app):null;
export const db=ok?getFirestore(app):null;
export {collection,doc,addDoc,setDoc,getDoc,getDocs,updateDoc,deleteDoc,onSnapshot,query,orderBy,limit,where};
export const logout=()=>signOut(auth);
export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function boot(cb){
  const ov=document.createElement('div');ov.id='login';
  ov.innerHTML='<div><h2>Sign in to continue</h2><p class="mut">Your data is saved to your Google account.</p><button class="pri" id="gb">Sign in with Google</button><p id="le" style="color:#ef4444"></p></div>';
  document.body.append(ov);
  const le=ov.querySelector('#le'),gb=ov.querySelector('#gb');
  if(!ok){ov.style.display='grid';gb.hidden=true;le.textContent='Firebase is not set up. Fill in firebase-config.js in the AppDesk folder.';return}
  gb.onclick=()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>le.textContent=e.message);
  let started=false;
  onAuthStateChanged(auth,u=>{ov.style.display=u?'none':'grid';if(u&&!started){started=true;cb(u)}});
}
