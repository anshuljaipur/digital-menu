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

window.db = db; window.addDoc = addDoc; window.collection = collection;

window.globalUser = null; window.globalUserData = null; window.userDocId = null; 
window.selectedAddressIndex = 0; window.newAddressType = 'Home';

onAuthStateChanged(auth, (user) => {
    if (user) {
        window.globalUser = user; window.userDocId = user.uid; 
        let displayName = "Guest"; let photoUrl = "https://placehold.co/100x100/1f51c6/ffffff?text=G";
        if(!user.isAnonymous && user.displayName) { displayName = user.displayName.split(' ')[0]; if(user.photoURL) photoUrl = user.photoURL; }
        document.getElementById('nav-profile-text').innerText = displayName;
        document.getElementById('nav-profile-icon').innerHTML = `<img src="${photoUrl}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" referrerpolicy="no-referrer">`;
        window.closeSpecificModal('auth-modal'); window.fetchUserData(window.userDocId);
    } else {
        window.globalUser = null; window.globalUserData = null; window.userDocId = null;
        document.getElementById('nav-profile-text').innerText = "Login"; document.getElementById('nav-profile-icon').innerHTML = '👤';
    }
});

window.googleLogin = async () => {
    const btn = document.getElementById('login-btn'); const errorDiv = document.getElementById('auth-error');
    btn.disabled = true; btn.innerHTML = "Connecting... ⏳"; errorDiv.innerText = "";
    try { await signInWithPopup(auth, provider); } 
    catch (error) { btn.disabled = false; btn.innerHTML = "Continue with Google"; errorDiv.innerText = "Login failed. Please try again."; }
};

window.guestLogin = async () => {
    const btn = document.getElementById('guest-btn'); const errorDiv = document.getElementById('auth-error');
    btn.disabled = true; btn.innerHTML = "Continuing... ⏳"; errorDiv.innerText = "";
    try { await signInAnonymously(auth); } 
    catch (error) { btn.disabled = false; btn.innerHTML = "👤 Continue as Guest"; errorDiv.innerText = "Failed to continue as guest."; }
};

window.logout = () => { signOut(auth).then(() => { document.getElementById('profile-dropdown').classList.remove('active'); window.location.reload(); }); };

window.fetchUserData = function(docId) {
    onSnapshot(doc(db, "users", docId), (docSnap) => {
        if (docSnap.exists()) {
            window.globalUserData = docSnap.data();
            document.getElementById('profile-name-main').value = window.globalUserData.name || '';
            document.getElementById('profile-dob').value = window.globalUserData.dob || '';
            if(window.globalUserData.gender) window.setGender(window.globalUserData.gender);
            else { window.currentGender = ''; document.querySelectorAll('#gender-selector .type-badge').forEach(b => b.classList.remove('active')); }
            
            if (!window.globalUserData.addresses) window.globalUserData.addresses = [];
            window.selectedAddressIndex = window.globalUserData.defaultAddressIndex || 0;
            if(window.selectedAddressIndex >= window.globalUserData.addresses.length) window.selectedAddressIndex = 0;
            window.renderAddresses(); 
        } else {
            window.globalUserData = { name: window.globalUser.displayName || '', addresses: [], defaultAddressIndex: 0 };
            setDoc(doc(db, "users", docId), window.globalUserData); window.renderAddresses();
        }
    });
    window.loadPastOrders(docId);
}

window.handleProfileClick = (e) => {
    if(e) e.stopPropagation();
    if (window.globalUser) { 
        document.getElementById('profile-user-name').innerText = window.globalUser.displayName || window.globalUserData?.name || 'Guest User';
        document.getElementById('profile-user-email').innerText = window.globalUser.email || 'Temporary Session';
        document.getElementById('profile-user-avatar').src = window.globalUser.photoURL || 'https://placehold.co/100x100/1f51c6/ffffff?text=G';
        document.getElementById('profile-dropdown').classList.toggle('active');
    } else { 
        document.getElementById('auth-modal').style.display = 'flex'; window.lockBodyScroll(); document.getElementById('auth-error').innerText = ''; 
    }
};

window.currentGender = '';
window.setGender = (g) => { window.currentGender = g; document.querySelectorAll('#gender-selector .type-badge').forEach(b => b.classList.remove('active')); if(document.getElementById('gender-'+g)) document.getElementById('gender-'+g).classList.add('active'); };

window.saveProfileData = async () => {
    if(!window.userDocId) return;
    const name = document.getElementById('profile-name-main').value.trim(); const dob = document.getElementById('profile-dob').value; const gender = window.currentGender;
    window.globalUserData.name = name; window.globalUserData.dob = dob; window.globalUserData.gender = gender;
    let msg = document.getElementById('profile-save-msg'); msg.innerText = "Saving..."; msg.style.color = "var(--text-muted)";
    try {
        await setDoc(doc(db, "users", window.userDocId), { name: name, dob: dob, gender: gender }, { merge: true });
        if(name) { document.getElementById('nav-profile-text').innerText = name.split(' ')[0]; document.getElementById('profile-user-name').innerText = name; }
        msg.innerText = "Profile saved! ✅"; msg.style.color = "#10b981"; setTimeout(() => { msg.innerText = ''; }, 3000);
    } catch(e) { msg.innerText = "Failed to save."; msg.style.color = "var(--active-brand-red)"; }
};

window.renderAddresses = () => {
    const container = document.getElementById('addresses-container'); container.innerHTML = '';
    if(!window.globalUserData || !window.globalUserData.addresses || window.globalUserData.addresses.length === 0) {
        container.innerHTML = '<p style="font-size:0.85em; color:var(--text-muted); text-align:center; padding:10px 0;">No addresses saved yet. Add one to order!</p>'; return;
    }
    window.globalUserData.addresses.forEach((addr, index) => {
        let isSelected = index === window.selectedAddressIndex; let icon = addr.label === 'Home' ? '🏠' : (addr.label === 'Work' ? '💼' : '📍');
        let lat = parseFloat(addr.lat) || 26.9124; let lng = parseFloat(addr.lng) || 75.7873; let zoom = 15;
        let x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom)); let y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
        let dynamicTileUrl = `https://a.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
        let mapThumbnail = `<div style="width: 100%; height: 100%; background: url('${dynamicTileUrl}') center/cover; display: flex; align-items: center; justify-content: center;"><div style="font-size: 1.8em; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.4)); margin-top: -10px;">📍</div></div>`;
        
        let cardHTML = `
            <div class="address-card ${isSelected ? 'selected' : ''}" onclick="window.selectAddress(${index})">
                <div style="display:flex; gap: 15px; align-items: center; margin-bottom: 10px;">
                    <div style="width: 70px; height: 70px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); flex-shrink: 0; background: var(--chip-bg);">${mapThumbnail}</div>
                    <div style="flex: 1; min-width:0;">
                        <div class="addr-label">${icon} ${addr.label}</div>
                        <div class="addr-details" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${addr.house}, ${addr.area}</div>
                        <div class="addr-contact">Receiver: ${addr.name}<br>📞 ${addr.phone}</div>
                    </div>
                </div>
                <div class="addr-actions" style="margin-top: 5px; padding-top: 10px;">
                    <button class="addr-btn" onclick="event.stopPropagation(); window.showAddAddressForm(${index})" style="color:var(--glacier-blue);">EDIT</button>
                    <button class="addr-btn" onclick="event.stopPropagation(); window.deleteAddress(${index})">DELETE</button>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

window.selectAddress = async (index) => { window.selectedAddressIndex = index; window.globalUserData.defaultAddressIndex = index; window.renderAddresses(); if(window.userDocId) { await setDoc(doc(db, "users", window.userDocId), { defaultAddressIndex: index }, { merge: true }); } }
window.setAddrType = (type) => { window.newAddressType = type; document.querySelectorAll('#addr-type-selector .type-badge').forEach(b => b.classList.remove('active')); if(document.getElementById(`badge-${type}`)) document.getElementById(`badge-${type}`).classList.add('active'); }

window.showAddAddressForm = (editIndex = -1) => {
    document.getElementById('address-list-view').style.display = 'none'; document.getElementById('add-address-form').style.display = 'block'; document.getElementById('addr-msg').innerText = '';
    if(editIndex >= 0) {
        document.getElementById('addr-form-title').innerText = 'Edit Address'; document.getElementById('edit-addr-index').value = editIndex;
        let addr = window.globalUserData.addresses[editIndex]; window.setAddrType(addr.label);
        document.getElementById('new-addr-name').value = addr.name; document.getElementById('new-addr-phone').value = addr.phone;
        document.getElementById('new-addr-house').value = addr.house; document.getElementById('new-addr-area').value = addr.area;
        document.getElementById('new-addr-lat').value = addr.lat || ''; document.getElementById('new-addr-lng').value = addr.lng || '';
    } else {
        document.getElementById('addr-form-title').innerText = 'Add New Address'; document.getElementById('edit-addr-index').value = -1; window.setAddrType('Home');
        document.getElementById('new-addr-name').value = window.globalUserData.name || window.globalUser.displayName || '';
        document.getElementById('new-addr-phone').value = (window.globalUserData && window.globalUserData.addresses && window.globalUserData.addresses.length > 0) ? window.globalUserData.addresses[0].phone : '';
        document.getElementById('new-addr-house').value = ''; document.getElementById('new-addr-area').value = '';
    }
    document.getElementById('map-wrapper-parent').style.display = 'none'; document.getElementById('open-map-btn').style.display = 'flex'; document.getElementById('map-search-input').value = '';
}

window.hideAddAddressForm = () => { document.getElementById('add-address-form').style.display = 'none'; document.getElementById('address-list-view').style.display = 'block'; }

window.deleteAddress = async (index) => {
    if(!confirm("Delete this address?")) return;
    window.globalUserData.addresses.splice(index, 1);
    if(window.selectedAddressIndex >= window.globalUserData.addresses.length) window.selectedAddressIndex = Math.max(0, window.globalUserData.addresses.length - 1);
    window.globalUserData.defaultAddressIndex = window.selectedAddressIndex; window.renderAddresses();
    if(window.userDocId) await setDoc(doc(db, "users", window.userDocId), { addresses: window.globalUserData.addresses, defaultAddressIndex: window.globalUserData.defaultAddressIndex }, { merge: true });
}

window.saveNewAddress = async () => {
    if(!window.userDocId) return;
    const name = document.getElementById('new-addr-name').value.trim(); const phone = document.getElementById('new-addr-phone').value.trim();
    const house = document.getElementById('new-addr-house').value.trim(); const area = document.getElementById('new-addr-area').value.trim();
    const editIndex = parseInt(document.getElementById('edit-addr-index').value);
    const lat = document.getElementById('new-addr-lat').value; const lng = document.getElementById('new-addr-lng').value;
    let msgBox = document.getElementById('addr-msg');
    
    if(!name || !phone || !house || !area) { msgBox.innerText = "Please fill all details (*)"; msgBox.style.color = "var(--active-brand-red)"; return; }
    msgBox.innerText = "Saving..."; msgBox.style.color = "var(--text-muted)";
    
    let newAddrObj = { label: window.newAddressType, name: name, phone: phone, house: house, area: area, lat: lat, lng: lng };
    if(!window.globalUserData.addresses) window.globalUserData.addresses = [];
    if(editIndex >= 0) window.globalUserData.addresses[editIndex] = newAddrObj; 
    else { window.globalUserData.addresses.push(newAddrObj); window.selectedAddressIndex = window.globalUserData.addresses.length - 1; window.globalUserData.defaultAddressIndex = window.selectedAddressIndex; }

    try {
        await setDoc(doc(db, "users", window.userDocId), { addresses: window.globalUserData.addresses, defaultAddressIndex: window.globalUserData.defaultAddressIndex, name: window.globalUserData.name || '' }, { merge: true });
        window.hideAddAddressForm(); 
        document.getElementById('addr-msg').innerText = "Address saved! ✅"; document.getElementById('addr-msg').style.color = "#10b981";
        setTimeout(() => { document.getElementById('addr-msg').innerText = ''; }, 3000);
    } catch(e) { msgBox.innerText = "Failed to save."; msgBox.style.color = "var(--active-brand-red)"; }
};

window.loadPastOrders = function(docId) {
    const listDiv = document.getElementById('order-history-list');
    try {
        const q = query(collection(db, "orders"), where("userId", "==", docId), orderBy("timestamp", "desc"));
        onSnapshot(q, (querySnapshot) => {
            if (querySnapshot.empty) { listDiv.innerHTML = '<p style="font-size: 0.85em; color: var(--text-muted); text-align: center; padding: 20px 0;">No past orders found. 🍦</p>'; return; }
            let html = ''; let count = 0;
            querySnapshot.forEach((doc) => {
                if (count >= 10) return; const data = doc.data(); 
                const dateObj = data.timestamp ? new Date(data.timestamp.seconds * 1000) : new Date();
                const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                let itemsHtml = '';
                if(data.itemsSummary) { data.itemsSummary.split(', ').forEach(item => { itemsHtml += `<div class="order-item-line"><span style="color:#cbd5e1;">▪</span> <span>${item}</span></div>`; }); }
                html += `<div class="order-history-card"><div class="order-header-row"><div class="order-history-date">📅 ${dateStr} <span class="order-history-time">${timeStr}</span></div><div class="order-history-total">₹${data.totalAmount}</div></div><div class="order-history-items">${itemsHtml}</div></div>`;
                count++;
            });
            listDiv.innerHTML = html;
        });
    } catch(e) { listDiv.innerHTML = '<p style="font-size: 0.85em; color: #e74c3c; text-align: center; padding:15px;">Failed to load orders.</p>'; }
};
