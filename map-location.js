let searchTimeout;

window.initLocationPicker = () => {
    document.getElementById('map-wrapper-parent').style.display = 'block';
    document.getElementById('open-map-btn').style.display = 'none'; 
    
    if (!window.addressMap) {
        window.addressMap = L.map('map-container').setView([26.9124, 75.7873], 13); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(window.addressMap);
        window.addressMarker = L.marker([26.9124, 75.7873], {draggable: true}).addTo(window.addressMap);
        
        window.addressMarker.on('dragend', function() {
            const position = window.addressMarker.getLatLng();
            document.getElementById('new-addr-lat').value = position.lat; document.getElementById('new-addr-lng').value = position.lng;
            window.getAddressFromCoords(position.lat, position.lng);
        });

        window.addressMap.on('click', function(e) {
            window.addressMarker.setLatLng(e.latlng);
            document.getElementById('new-addr-lat').value = e.latlng.lat; document.getElementById('new-addr-lng').value = e.latlng.lng;
            window.getAddressFromCoords(e.latlng.lat, e.latlng.lng);
        });
    }
    setTimeout(() => { window.addressMap.invalidateSize(true); window.getCurrentLocation(); }, 400);
};

window.getCurrentLocation = () => {
    document.getElementById('new-addr-area').value = "Locating you... 📍";
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude; const lng = position.coords.longitude;
                document.getElementById('new-addr-lat').value = lat; document.getElementById('new-addr-lng').value = lng;
                window.addressMap.setView([lat, lng], 16); window.addressMarker.setLatLng([lat, lng]); window.getAddressFromCoords(lat, lng);
            },
            () => { document.getElementById('new-addr-area').value = "Location access denied. Please search or tap on map."; },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else { document.getElementById('new-addr-area').value = "GPS not supported. Please search or tap on map."; }
};

window.handleSearchInput = (event) => {
    clearTimeout(searchTimeout); let query = event.target.value.trim();
    const suggestionBox = document.getElementById('search-suggestions');
    if (query.length < 3) { suggestionBox.style.display = 'none'; return; }
    
    searchTimeout = setTimeout(async () => {
        try {
            let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`);
            let data = await response.json();
            if (data && data.length > 0) {
                suggestionBox.innerHTML = '';
                data.forEach(place => {
                    let div = document.createElement('div'); div.className = 'suggestion-item'; div.innerText = place.display_name;
                    div.onclick = () => {
                        document.getElementById('map-search-input').value = place.display_name; suggestionBox.style.display = 'none';
                        let lat = parseFloat(place.lat); let lon = parseFloat(place.lon);
                        document.getElementById('new-addr-lat').value = lat; document.getElementById('new-addr-lng').value = lon;
                        window.addressMap.setView([lat, lon], 16); window.addressMarker.setLatLng([lat, lon]); window.getAddressFromCoords(lat, lon);
                    };
                    suggestionBox.appendChild(div);
                });
                suggestionBox.style.display = 'block';
            } else { suggestionBox.style.display = 'none'; }
        } catch (error) {}
    }, 500); 
};

window.searchLocation = async () => {
    const query = document.getElementById('map-search-input').value.trim(); if(!query) return;
    document.getElementById('search-suggestions').style.display = 'none'; document.getElementById('new-addr-area').value = "Searching... 🔍";
    try {
        let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`);
        let data = await response.json();
        if(data && data.length > 0) {
            let lat = data[0].lat; let lon = data[0].lon;
            document.getElementById('new-addr-lat').value = lat; document.getElementById('new-addr-lng').value = lon;
            window.addressMap.setView([lat, lon], 16); window.addressMarker.setLatLng([lat, lon]); window.getAddressFromCoords(lat, lon); 
        } else { document.getElementById('new-addr-area').value = "Location not found. Try a different search."; }
    } catch(e) { document.getElementById('new-addr-area').value = "Search error. Please try again."; }
};

window.getAddressFromCoords = async (lat, lng) => {
    document.getElementById('new-addr-area').value = "Fetching exact area... ⏳";
    try {
        let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        let data = await response.json();
        if(data && data.address) {
            let addr = data.address;
            let parts = [addr.road || '', [addr.neighbourhood || '', addr.suburb || ''].filter(Boolean).join(', '), addr.city || addr.town || addr.county || '', addr.postcode || ''].filter(p => p.trim() !== '');
            let uniqueParts = [];
            parts.forEach(p => { if (!uniqueParts.some(existing => existing.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(existing.toLowerCase()))) uniqueParts.push(p); });
            document.getElementById('new-addr-area').value = uniqueParts.join(', ');
            const houseField = document.getElementById('new-addr-house');
            houseField.style.borderColor = 'var(--active-brand-red)'; houseField.focus();
            setTimeout(() => { houseField.style.borderColor = 'var(--border-color)'; }, 3000);
        } else if(data && data.display_name) { document.getElementById('new-addr-area').value = data.display_name; } 
        else { document.getElementById('new-addr-area').value = "Area not found. Please type manually."; }
    } catch (e) { document.getElementById('new-addr-area').value = "Error fetching location. Please type manually."; }
};
