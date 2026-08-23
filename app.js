const iceCreamSheetUrl = "https://script.google.com/macros/s/AKfycbwq17hSzF9mgPqqKw8FDVWFktoxpugpZNKYRjc6hmTSOKxQm4fY2jC1talNoEpMdDQ/exec"; 
const grocerySheetUrl = "https://script.google.com/macros/s/AKfycbxNEtZH-ugGQgTwcfDFNdJ8Thd46FxeZJ8emO4v3mqeCkhcQKqW0UQNDj63XitbNwE/exec"; 
window.WHATSAPP_NUMBER = "919829610570"; 

const APPSHEET_APP_NAME = "LiveInventroy-257487838"; 
const APPSHEET_TABLE_NAME = "Products"; 

window.allItems = []; window.allIceCreamItems = []; window.allGroceryItems = [];
window.hideOutOfStock = false; window.currentStoreMode = 'icecream'; 
window.currentCategory = 'All Items'; window.currentBrand = 'All Brands'; window.currentTagFilter = 'All'; 
window.cart = {}; window.currentFilteredItems = []; window.currentlyDisplayed = 0;

window.normalizeData = (items, isGrocery = false) => {
    const timeStamp = Date.now();
    return items.map(item => {
        if (item.brand && typeof item.brand === 'string') item.brand = item.brand.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        if (item.name && typeof item.name === 'string') item.name = item.name.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        if (item.category && typeof item.category === 'string') item.category = item.category.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        
        if (isGrocery && item.img && String(item.img).includes('Products_Images/')) {
            let fileName = String(item.img).trim();
            let safeFileName = fileName.split('/').map(encodeURIComponent).join('/');
            item.img = `https://www.appsheet.com/template/gettablefileurl?appName=${encodeURIComponent(APPSHEET_APP_NAME)}&tableName=${encodeURIComponent(APPSHEET_TABLE_NAME)}&fileName=${safeFileName}&_t=${timeStamp}`;
        }
        return item;
    });
};

window.loadData = async function() {
    const statusMsg = document.getElementById('status-msg'); 
    const splash = document.getElementById('splash-screen');
    const percentText = document.getElementById('loading-percentage');
    
    if (!navigator.onLine) { alert("⚠️ No internet connection detected."); return; }

    let progress = 0;
    let simInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 5) + 1;
        if (progress > 95) progress = 95;
        if (percentText) percentText.innerText = progress + '%';
    }, 300);

    try {
        const noCacheParam = "?_t=" + Date.now();
        const [resIceCream, resGrocery] = await Promise.all([
            fetch(iceCreamSheetUrl + noCacheParam), fetch(grocerySheetUrl + noCacheParam)
        ]);

        const iceCreamData = await resIceCream.json();
        const groceryData = await resGrocery.json();

        window.allIceCreamItems = window.normalizeData(iceCreamData, false); 
        window.allGroceryItems = window.normalizeData(groceryData, true); 
        window.allItems = window.currentStoreMode === 'icecream' ? window.allIceCreamItems : window.allGroceryItems;

        window.setupAppUI(); 
        window.updateCategoryVisibility();
        window.applyFilters();
        if(statusMsg) statusMsg.style.display = 'none';

        clearInterval(simInterval);
        if (percentText) percentText.innerText = '100%';
        setTimeout(() => { if(splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 600); } }, 800);
    } catch (error) { 
        clearInterval(simInterval);
        alert("⚠️ Failed to fetch the menu data.");
    }
};

window.setupAppUI = () => {
    const sidebar = document.getElementById('category-sidebar');
    const desktopCategoryGrid = document.getElementById('desktop-category-grid');
    if(sidebar) sidebar.innerHTML = ''; 
    if(desktopCategoryGrid) desktopCategoryGrid.innerHTML = '';
    
    const rawCats = window.allItems.map(item => item.category || 'More Favorites').filter(c => c);
    let uniqueCats = [...new Set(rawCats)]; uniqueCats.sort((a, b) => a.localeCompare(b)); 
    const categories = ['New Arrivals', 'All Items', ...uniqueCats];
    
    categories.forEach(cat => {
        let iconHTML = ''; let name = cat; const lCat = cat.toLowerCase();
        
        if (window.currentStoreMode === 'grocery') {
            if (lCat === 'new arrivals') { iconHTML = '✨'; name = 'New Arrivals'; } 
            else if (lCat === 'all items') { iconHTML = '🛒'; name = 'All Items'; } 
            else if (lCat.includes('veg') || lCat.includes('fruit')) iconHTML = '🥦';
            else if (lCat.includes('dairy') || lCat.includes('milk')) iconHTML = '🥛';
            else if (lCat.includes('snack') || lCat.includes('chips') || lCat.includes('biscuit')) iconHTML = '🍿';
            else if (lCat.includes('drink') || lCat.includes('juice')) iconHTML = '🧃';
            else if (lCat.includes('spice') || lCat.includes('masala')) iconHTML = '🌶️';
            else if (lCat.includes('bread') || lCat.includes('bakery')) iconHTML = '🍞';
            else iconHTML = '🛍️';
        } else {
            if (lCat === 'new arrivals') { iconHTML = '✨'; name = 'New Arrivals'; } 
            else if (lCat === 'all items') { iconHTML = '🍨'; name = 'All Items'; } 
            else {
                if(lCat.includes('family')||lCat.includes('pack')) iconHTML = '📦';
                else if(lCat.includes('cone')) iconHTML = '🍦'; 
                else if(lCat.includes('cake')) iconHTML = '🍰'; 
                else iconHTML = '🍨';
            }
        }
        
        if(sidebar) {
            const div = document.createElement('div'); div.className = `cat-item ${cat === window.currentCategory ? 'active' : ''}`;
            div.setAttribute('data-category', cat); div.onclick = () => window.setCategory(cat);
            div.innerHTML = `<div class="cat-icon">${iconHTML}</div><div class="cat-name">${name}</div>`;
            sidebar.appendChild(div);
        }
    });

    const brandSidebar = document.getElementById('brands-sidebar');
    if(brandSidebar) brandSidebar.innerHTML = ''; 
    const brands = ['All Brands', ...new Set(window.allItems.map(item => item.brand).filter(b => b))];
    brands.forEach(brand => {
        let iconHTML = brand === 'All Brands' ? `<svg viewBox="0 0 100 100" style="width:100%; height:100%; background:var(--chip-bg);"><text x="50" y="55" font-size="28" fill="var(--glacier-blue)" font-weight="bold" font-family="Montserrat, sans-serif" text-anchor="middle" dominant-baseline="middle">ALL</text></svg>` : window.getBrandLogo(brand);
        if(brandSidebar) {
            const div = document.createElement('div'); div.className = `brand-item ${brand === window.currentBrand ? 'active' : ''}`;
            div.onclick = () => window.setBrand(brand); div.innerHTML = `<div class="brand-icon">${iconHTML}</div><div class="brand-name">${brand === 'All Brands' ? 'All' : brand}</div>`;
            brandSidebar.appendChild(div);
        }
    });
};

window.switchStore = (mode) => {
    if (window.currentStoreMode === mode) return;
    window.currentStoreMode = mode;
    document.getElementById('tab-icecream').classList.remove('active');
    document.getElementById('tab-grocery').classList.remove('active');
    document.getElementById(`tab-${mode}`).classList.add('active');

    window.allItems = mode === 'icecream' ? window.allIceCreamItems : window.allGroceryItems;
    window.currentCategory = 'All Items'; window.currentBrand = 'All Brands'; 
    
    window.setupAppUI(); 
    window.updateCategoryVisibility();
    window.applyFilters();
};

window.formatImageUrl = (imgPath) => {
    if (!imgPath) return 'https://placehold.co/300x220/f4f6f9/a0a0a0?text=No+Image';
    if (imgPath.startsWith('http')) return imgPath;
    return "https://www.appsheet.com/template/gettablefileurl?appName=IceCreamInventory-257487838&tableName=menu&fileName=" + imgPath;
};

// ... Apply filters and rest of pure UI rendering logic here (same as before).
window.onload = window.loadData;
