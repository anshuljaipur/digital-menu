window.initLocationPicker = () => {
    document.getElementById('map-wrapper-parent').style.display = 'block';
    if (!window.addressMap) {
        window.addressMap = L.map('map-container').setView([26.9124, 75.7873], 13); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(window.addressMap);
        window.addressMarker = L.marker([26.9124, 75.7873], {draggable: true}).addTo(window.addressMap);
        
        window.addressMarker.on('dragend', function() {
            const position = window.addressMarker.getLatLng();
            window.getAddressFromCoords(position.lat, position.lng);
        });
    }
    setTimeout(() => { window.addressMap.invalidateSize(true); window.getCurrentLocation(); }, 400);
}
// Add remaining map location functions (handleSearchInput, getAddressFromCoords) here...
