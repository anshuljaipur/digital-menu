const iceCreamSheetUrl = "https://script.google.com/macros/s/AKfycbwq17hSzF9mgPqqKw8FDVWFktoxpugpZNKYRjc6hmTSOKxQm4fY2jC1talNoEpMdDQ/exec"; 
const grocerySheetUrl = "https://script.google.com/macros/s/AKfycbxNEtZH-ugGQgTwcfDFNdJ8Thd46FxeZJ8emO4v3mqeCkhcQKqW0UQNDj63XitbNwE/exec"; 
window.WHATSAPP_NUMBER = "919829610570"; 
const APPSHEET_APP_NAME = "LiveInventroy-257487838"; 
const APPSHEET_TABLE_NAME = "Products"; 

window.allItems = []; window.allIceCreamItems = []; window.allGroceryItems = [];
window.hideOutOfStock = false; window.currentStoreMode = 'icecream'; 
window.currentCategory = 'All Items'; window.currentBrand = 'All Brands'; window.currentTagFilter = 'All'; 
window.cart = {}; window.currentFilteredItems = []; window.currentlyDisplayed = 0;
window.currentTheme = localStorage.getItem('glacier_theme') || 'auto';

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
    const splashSub = document.getElementById('splash-subtext');
    const percentText = document.getElementById('loading-percentage');
    
    if (!navigator.onLine) {
        alert("⚠️ Broken Connection: No internet detected. Please connect to a network and refresh.");
        if(splashSub) { splashSub.innerText = "No Internet Connection."; splashSub.style.color = "#ffcccc"; }
        return;
    }

    let progress = 0;
    let simInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 5) + 1;
        if (progress > 95) progress = 95;
        if (percentText) percentText.innerText = progress + '%';
    }, 300);

    let slowTimer = setTimeout(() => {
        if(splashSub) { splashSub.innerText = "Connection is slow. Still trying..."; splashSub.style.color = "#ffcc00"; }
    }, 10000);

    try {
        const noCacheParam = "?_t=" + Date.now();
        let iceCreamData = [], groceryData = [];

        try {
            const resIce = await fetch(iceCreamSheetUrl + noCacheParam);
            if(resIce.ok) iceCreamData = JSON.parse(await resIce.text());
        } catch(e) { console.error("Ice cream fetch failed"); }

        try {
            const resGroc = await fetch(grocerySheetUrl + noCacheParam);
            if(resGroc.ok) groceryData = JSON.parse(await resGroc.text());
        } catch(e) { console.error("Grocery fetch failed"); }

        window.allIceCreamItems = window.normalizeData(iceCreamData, false); 
        window.allGroceryItems = window.normalizeData(groceryData, true); 
        window.allItems = window.currentStoreMode === 'icecream' ? window.allIceCreamItems : window.allGroceryItems;

        clearTimeout(slowTimer);

        if(!window.allItems || window.allItems.length === 0) { 
            if(statusMsg) {
                statusMsg.innerHTML = `<div style="padding: 40px 10px; text-align: center;"><span style="font-size: 3em;">${window.currentStoreMode === 'icecream' ? '🍦' : '🛒'}</span><h3 style="color: var(--text-muted); margin: 10px 0 5px 0;">No items found</h3><p style="margin: 0; font-size: 0.9em; color:var(--text-muted);">Try changing your filters.</p><button onclick="window.clearAllFilters()" class="action-btn" style="margin: 15px auto; border-color: var(--glacier-blue); color: var(--glacier-blue);">Clear Filters</button></div>`; 
                statusMsg.style.display = 'block'; 
            }
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.has('brand')) window.currentBrand = urlParams.get('brand');
            if(urlParams.has('category')) window.currentCategory = urlParams.get('category');
            
            window.setupAppUI(); 
            window.updateCategoryVisibility();
            window.applyFilters();
            if(statusMsg) statusMsg.style.display = 'none';
        }

        clearInterval(simInterval);
        if (percentText) percentText.innerText = '100%';
        setTimeout(() => {
            if(splash) {
                splash.style.opacity = '0';
                setTimeout(() => { if(splash.parentNode) splash.remove(); }, 600);
            }
            window.updateBrandArrows();
        }, 800);

    } catch (error) { 
        clearTimeout(slowTimer); clearInterval(simInterval);
        if(splashSub) { splashSub.innerText = "⚠️ Loading failed."; splashSub.style.color = "#ffcccc"; }
        alert("⚠️ Broken Connection: Failed to fetch the menu data.");
    }
};

window.setupAppUI = () => {
    const sidebar = document.getElementById('category-sidebar');
    const fabCategoryGrid = document.getElementById('fab-category-grid');
    const desktopCategoryGrid = document.getElementById('desktop-category-grid');
    if(sidebar) sidebar.innerHTML = ''; 
    if(fabCategoryGrid) fabCategoryGrid.innerHTML = '';
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
            else if (lCat.includes('dairy') || lCat.includes('milk') || lCat.includes('cheese')) iconHTML = '🥛';
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
                else if(lCat.includes('tub')) iconHTML = '<img src="https://i.postimg.cc/ydZk4TbJ/1012418_1.png" style="width: 24px; height: 24px; object-fit: contain;">';
                else if(lCat.includes('cone')) iconHTML = '🍦'; 
                else if(lCat.includes('stick')||lCat.includes('bar') || lCat.includes('kulfi')) iconHTML = '<img src="https://i.postimg.cc/QC6CP5Pp/5350544-1.png" style="width: 24px; height: 24px; object-fit: contain;">'; 
                else if(lCat.includes('cake')||lCat.includes('slice')) iconHTML = '🍰'; 
                else if(lCat.includes('cup')||lCat.includes('sundae')) iconHTML = '🍧'; 
                else iconHTML = '🍨';
            }
        }
        
        if(sidebar) {
            const div = document.createElement('div'); div.className = `cat-item ${cat === window.currentCategory ? 'active' : ''}`;
            div.setAttribute('data-category', cat); div.onclick = () => window.setCategory(cat);
            div.innerHTML = `<div class="cat-icon">${iconHTML}</div><div class="cat-name">${name}</div>`; sidebar.appendChild(div);
        }

        if (desktopCategoryGrid) {
            let dtCatDiv = document.createElement('div'); dtCatDiv.className = `filter-tag-chip ${cat === window.currentCategory ? 'active' : ''}`;
            dtCatDiv.setAttribute('data-category', cat); dtCatDiv.onclick = () => window.setCategory(cat);
            let cleanIcon = ['✨','🍨','📦','🍦','🍰','🍧','🛒','🥦','🥛','🍿','🧃','🌶️','🛍️','🍞'].includes(iconHTML) ? iconHTML : '';
            dtCatDiv.innerHTML = `${cleanIcon} ${name}`; desktopCategoryGrid.appendChild(dtCatDiv);
        }

        if(fabCategoryGrid) {
            let fabCatDiv = document.createElement('div'); fabCatDiv.className = `grid-sel-item ${cat === window.currentCategory ? 'active' : ''}`;
            fabCatDiv.setAttribute('data-category', cat);
            fabCatDiv.onclick = () => { window.setCategory(cat); window.closeSpecificModal('mobile-category-modal'); document.getElementById('fab-container').classList.remove('active'); document.getElementById('fab-main-btn').classList.remove('open'); };
            let displayIcon = ['✨','🍨','📦','🍦','🍰','🍧','🛒','🥦','🥛','🍿','🧃','🌶️','🛍️','🍞'].includes(iconHTML) ? `<div style="font-size:2em; line-height:1;">${iconHTML}</div>` : `<div class="grid-sel-icon">${iconHTML}</div>`;
            fabCatDiv.innerHTML = `${displayIcon}<div class="grid-sel-name">${name}</div>`; fabCategoryGrid.appendChild(fabCatDiv);
        }
    });

    const brandSidebar = document.getElementById('brands-sidebar');
    const fabBrandGrid = document.getElementById('fab-brand-grid');
    if(brandSidebar) brandSidebar.innerHTML = ''; if(fabBrandGrid) fabBrandGrid.innerHTML = '';
    
    const brands = ['All Brands', ...new Set(window.allItems.map(item => item.brand).filter(b => b))];
    brands.forEach(brand => {
        let iconHTML = brand === 'All Brands' ? `<svg viewBox="0 0 100 100" style="width:100%; height:100%; background:var(--chip-bg);"><text x="50" y="55" font-size="28" fill="var(--glacier-blue)" font-weight="bold" font-family="Montserrat, sans-serif" text-anchor="middle" dominant-baseline="middle">ALL</text></svg>` : window.getBrandLogo(brand);
        
        if(brandSidebar) {
            const div = document.createElement('div'); div.className = `brand-item ${brand === window.currentBrand ? 'active' : ''}`;
            div.onclick = () => window.setBrand(brand); div.innerHTML = `<div class="brand-icon">${iconHTML}</div><div class="brand-name">${brand === 'All Brands' ? 'All' : brand}</div>`; brandSidebar.appendChild(div);
        }
        if(fabBrandGrid) {
            let fabBrandDiv = document.createElement('div'); fabBrandDiv.className = `grid-sel-item ${brand === window.currentBrand ? 'active' : ''}`;
            fabBrandDiv.onclick = () => { window.setBrand(brand); window.closeSpecificModal('mobile-brand-modal'); document.getElementById('fab-container').classList.remove('active'); document.getElementById('fab-main-btn').classList.remove('open');};
            fabBrandDiv.innerHTML = `<div class="grid-sel-icon" style="padding:4px;">${iconHTML}</div><div class="grid-sel-name">${brand === 'All Brands' ? 'All' : brand}</div>`; fabBrandGrid.appendChild(fabBrandDiv);
        }
    });

    let allTags = new Set(); window.allItems.forEach(item => { window.getItemTags(item).forEach(t => allTags.add(t)); });
    const ptContainer = document.getElementById('tags-container-portrait'); const lsContainer = document.getElementById('tags-container-landscape'); const dtContainer = document.getElementById('desktop-tags-grid'); 
    
    if(allTags.size > 0) {
        let tagsHTML = `<div class="filter-tag-chip ${window.currentTagFilter === 'All' ? 'active' : ''}" data-tag="All" onclick="window.setTagFilter('All')">All</div>`;
        Array.from(allTags).sort().forEach(tag => {
            let safeTag = tag.replace(/'/g, "\\'"); let isActive = window.currentTagFilter === tag ? 'active' : '';
            tagsHTML += `<div class="filter-tag-chip ${isActive}" data-tag="${safeTag}" onclick="window.setTagFilter('${safeTag}')">${tag}</div>`;
        });
        if(ptContainer) { ptContainer.innerHTML = tagsHTML; ptContainer.style.display = 'flex'; }
        if(lsContainer) { lsContainer.innerHTML = tagsHTML; lsContainer.style.display = 'flex'; }
        if(dtContainer) { dtContainer.innerHTML = tagsHTML; if(dtContainer.parentElement) dtContainer.parentElement.style.display = ''; }
    } else {
        if(ptContainer) ptContainer.style.display = 'none'; if(lsContainer) lsContainer.style.display = 'none';
        if(dtContainer && dtContainer.parentElement) dtContainer.parentElement.style.display = 'none';
    }
};

window.applyFilters = () => {
    const gridWrapper = document.getElementById('main-menu-grid'); const statusMsg = document.getElementById('status-msg');
    let activeEnv = window.innerWidth > 999 ? 'header' : (window.matchMedia("(orientation: landscape)").matches ? 'landscape' : 'mobile');
    
    const searchInput = document.getElementById(window.innerWidth > 999 ? 'search-bar-header' : `search-bar-${activeEnv}`);
    const sortDropdown = document.getElementById(activeEnv === 'header' ? 'sort-dropdown-desktop-tools' : (activeEnv === 'mobile' ? 'sort-dropdown-main' : `sort-dropdown-${activeEnv}`));

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : ''; 
    const sortValue = sortDropdown ? sortDropdown.value : 'default';
    const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);

    let filteredData = window.allItems.map(item => {
        const isAvailable = String(item.available).toLowerCase() === 'yes' || item.available === true;
        const matchesBrand = window.currentBrand === 'All Brands' || item.brand === window.currentBrand;
        const matchesCategory = window.currentCategory === 'All Items' ? true : (window.currentCategory === 'New Arrivals' ? window.isNewArrival(item) : (item.category || 'More Favorites') === window.currentCategory);
        let matchesSearch = true; let relevanceScore = 0;

        if (searchWords.length > 0) {
            let textToSearch = (item.name + ' ' + (item.brand || '') + ' ' + (item.category || '')).toLowerCase();
            let matchCount = 0;
            if (textToSearch.includes(searchTerm)) relevanceScore += 100; 
            searchWords.forEach(word => {
                if (textToSearch.includes(word)) {
                    matchCount++;
                    if (new RegExp(`\\b${word}`).test(textToSearch)) relevanceScore += 10; else relevanceScore += 2;
                }
            });
            let requiredMatches = Math.max(1, Math.ceil(searchWords.length * 0.5));
            matchesSearch = matchCount >= requiredMatches; relevanceScore += (matchCount * 5);
        }

        const itemTags = window.getItemTags(item);
        const matchesTagFilter = window.currentTagFilter === 'All' ? true : itemTags.includes(window.currentTagFilter);
        let stock = window.getItemStock(item);
        let isOOS = window.currentStoreMode === 'grocery' && stock === 0;
        let passesOosFilter = !(window.hideOutOfStock && isOOS);

        return { item, isValid: isAvailable && matchesBrand && matchesCategory && matchesSearch && matchesTagFilter && passesOosFilter, relevanceScore };
    }).filter(obj => obj.isValid);

    filteredData.sort((a, b) => {
        let stockA = window.getItemStock(a.item); let stockB = window.getItemStock(b.item);
        let isOosA = (window.currentStoreMode === 'grocery' && stockA === 0) ? 1 : 0;
        let isOosB = (window.currentStoreMode === 'grocery' && stockB === 0) ? 1 : 0;
        if (isOosA !== isOosB) return isOosA - isOosB; 

        if (sortValue === 'default' && searchTerm !== '') return b.relevanceScore - a.relevanceScore;
        else if (window.currentCategory === 'New Arrivals' && sortValue === 'default') {
            let dateA = window.getLaunchDate(a.item); let dateB = window.getLaunchDate(b.item);
            let valA = dateA ? (dateA.year * 12 + dateA.month) : 0; let valB = dateB ? (dateB.year * 12 + dateB.month) : 0;
            return valB - valA;
        } else {
            let itemA = a.item, itemB = b.item;
            if (sortValue === 'price-low-high') return itemA.price - itemB.price; 
            else if (sortValue === 'price-high-low') return itemB.price - itemA.price; 
            else if (sortValue === 'size-low-high') return window.getVolume(itemA.name) - window.getVolume(itemB.name); 
            else if (sortValue === 'size-high-low') return window.getVolume(itemB.name) - window.getVolume(itemA.name); 
            else if (sortValue === 'brand') return String(itemA.brand || '').localeCompare(String(itemB.brand || ''));
            else if (sortValue === 'category') return String(itemA.category || '').localeCompare(String(itemB.category || ''));
            return 0;
        }
    });

    window.currentFilteredItems = filteredData.map(obj => obj.item);
    window.currentlyDisplayed = 0;
    
    let titlePrefix = window.currentBrand !== 'All Brands' ? window.currentBrand + ' ' : '';
    let titleText = searchTerm !== '' ? 'Search Results' : (window.currentCategory === 'New Arrivals' ? 'New Arrivals' : (window.currentCategory === 'All Items' ? 'Menu' : window.currentCategory));
    if (window.currentTagFilter !== 'All') titleText += ` (${window.currentTagFilter})`;
    document.getElementById('current-category-title').innerText = titlePrefix + titleText;
    document.getElementById('item-count').innerText = `${window.currentFilteredItems.length} items`;

    let clearBtn = document.getElementById('clear-filters-btn'); let clearBtnDesk = document.getElementById('clear-filters-btn-desktop');
    let hasFilters = (searchTerm !== '' || window.currentCategory !== 'All Items' || window.currentBrand !== 'All Brands' || window.currentTagFilter !== 'All' || sortValue !== 'default' || window.hideOutOfStock);
    if (clearBtn) clearBtn.style.display = hasFilters ? 'flex' : 'none';
    if (clearBtnDesk) clearBtnDesk.style.display = hasFilters ? 'flex' : 'none';

    if(gridWrapper) gridWrapper.innerHTML = '';
    let loadMore = document.getElementById('load-more-container');
    
    if (window.currentFilteredItems.length === 0) { 
        if(loadMore) loadMore.style.display = 'none';
        if(statusMsg) {
            statusMsg.innerHTML = `<div style="padding: 40px 10px; text-align: center;"><span style="font-size: 3em;">${window.currentStoreMode === 'icecream' ? '🍦' : '🛒'}</span><h3 style="color: var(--text-muted); margin: 10px 0 5px 0;">No items found</h3><button onclick="window.clearAllFilters()" class="action-btn" style="margin: 15px auto; border-color: var(--glacier-blue); color: var(--glacier-blue);">Clear Filters</button></div>`; 
            statusMsg.style.display = 'block'; 
        }
        return; 
    }
    if(statusMsg) statusMsg.style.display = 'none'; 
    window.renderMoreItems();
};

window.renderMoreItems = () => {
    const gridWrapper = document.getElementById('main-menu-grid'); if(!gridWrapper) return;
    let itemsPerRow = window.innerWidth <= 360 ? 2 : (window.innerWidth <= 999 ? (window.matchMedia("(orientation: landscape)").matches ? 3 : 2) : Math.floor((gridWrapper.clientWidth + 20) / 240) || 4);
    let itemsPerPage = Math.max(1, itemsPerRow) * 8;
    
    let itemsToRender = window.currentFilteredItems.slice(window.currentlyDisplayed, window.currentlyDisplayed + itemsPerPage);
    let newHTML = '';

    itemsToRender.forEach((item) => {
        if(!item.name) return;
        const safeName = item.name.replace(/[^a-zA-Z0-9]/g, '_'); const volText = window.extractVolumeText(item.name);
        let displayName = item.name.replace(volText, '').trim() || item.name;
        let discountNum = window.getDiscount(item);
        let priceHTML = discountNum > 0 ? `<div class="price-row"><span class="item-price">₹${item.price}</span><span class="item-mrp">₹${item.mrp}</span></div>` : `<div class="price-row"><span class="item-price">₹${item.price}</span></div>`;
        
        let tagsHTML = window.getItemTags(item).length > 0 ? `<div class="card-tags-row">` + window.getItemTags(item).map(t => `<span class="card-tag ${window.getTagStyle(t)}" title="${t}" style="width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 1.1em; flex-shrink: 0;">${window.getTagIcon(t)}</span>`).join('') + `</div>` : '';
        
        let stock = window.getItemStock(item); let isOutOfStock = false; let stockHTML = '';
        if (window.currentStoreMode === 'grocery' && stock !== null) {
            if (stock === 0) { isOutOfStock = true; stockHTML = `<div class="stock-badge" id="stock-badge-${safeName}" data-stock="0" style="display:none;"></div>`; } 
            else { stockHTML = `<div class="stock-badge ${stock <= 5 ? 'low-stock' : ''}" id="stock-badge-${safeName}" data-stock="${stock}">${stock} in stock</div>`; }
        } else { stockHTML = `<div class="stock-badge" id="stock-badge-${safeName}" data-stock="-1" style="display:none;"></div>`; }

        newHTML += `
            <div class="menu-card ${isOutOfStock ? 'oos-card' : ''}" id="card-${safeName}" onclick="window.openProductDetail('${item.name.replace(/'/g, "\\'")}')">
                <div class="card-img-wrapper skeleton-bg">
                    ${window.isNewArrival(item) ? `<div class="new-badge">✨ NEW</div>` : ''}
                    ${discountNum > 0 ? `<div class="red-discount-icon">${Math.round(discountNum)}% OFF</div>` : ''}
                    <img src="${window.formatImageUrl(item.img)}" crossorigin="anonymous" loading="lazy" decoding="async" style="opacity: 0; transition: opacity 0.3s ease-in-out;" onload="this.parentElement.classList.remove('skeleton-bg'); this.style.opacity='1';" onerror="this.onerror=null; this.src='https://placehold.co/300x220/f4f6f9/a0a0a0?text=No+Image'; this.parentElement.classList.remove('skeleton-bg'); this.style.opacity='1';">
                    <div class="btn-container" id="add-wrap-${safeName}" onclick="event.stopPropagation()">${isOutOfStock ? `<div class="out-of-stock-badge">OUT OF STOCK</div>` : ''}</div>
                </div>
                ${stockHTML}<div class="brand-tag">${item.brand}</div>${tagsHTML}<div class="item-name">${displayName}</div>
                <div class="vol-price-row"><div class="item-volume">${volText || ' '}</div>${priceHTML}</div>
            </div>`;
    });
    gridWrapper.insertAdjacentHTML('beforeend', newHTML);
    window.currentlyDisplayed += itemsToRender.length;
    window.updateAddButtons();
};

window.openProductDetail = (itemName) => {
    const item = window.allItems.find(i => i.name === itemName); if(!item) return;
    const volText = window.extractVolumeText(item.name);
    document.getElementById('pd-modal-img').src = window.formatImageUrl(item.img);
    document.getElementById('pd-modal-brand-logo').innerHTML = window.getBrandLogo(item.brand);
    document.getElementById('pd-modal-brand-name').innerText = item.brand;
    document.getElementById('pd-modal-name').innerText = item.name;
    document.getElementById('pd-modal-volume').innerText = volText || '';

    let desc = ''; let ing = '';
    for(let key in item) {
        let cleanKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
        if(['description', 'desc', 'detail'].includes(cleanKey) && item[key]) desc = String(item[key]).trim();
        if(['ingredient', 'ingredients'].includes(cleanKey) && item[key]) ing = String(item[key]).trim();
    }
    const descEl = document.getElementById('pd-modal-desc'); const ingEl = document.getElementById('pd-modal-ingredients');
    if(desc !== '') { descEl.innerText = desc; descEl.style.display = 'block'; } else { descEl.style.display = 'none'; }
    if(ing !== '') { ingEl.innerText = "*Note: " + ing; ingEl.style.display = 'block'; } else { ingEl.style.display = 'none'; }

    let discountNum = window.getDiscount(item);
    document.getElementById('pd-modal-price-wrap').innerHTML = discountNum > 0 ? `<span class="item-price">₹${item.price}</span> <span class="item-mrp" style="text-decoration:line-through; color:var(--text-muted); font-size:0.8em; margin-left:5px;">₹${item.mrp}</span>` : `<span class="item-price">₹${item.price}</span>`;

    const btnWrap = document.getElementById('pd-modal-btn-wrap'); let stock = window.getItemStock(item);
    if (window.currentStoreMode === 'grocery' && stock === 0) btnWrap.innerHTML = `<div class="out-of-stock-badge" style="margin:0; padding:10px 15px; font-size:1em;">OUT OF STOCK</div>`;
    else if (window.cart[item.name]) btnWrap.innerHTML = `<div class="app-qty-control" style="height:40px; width:100px; font-size:1.1em;"><button onclick="event.stopPropagation(); window.changeQty('${item.name.replace(/'/g, "\\'")}', -1)">−</button><span>${window.cart[item.name].qty}</span><button onclick="event.stopPropagation(); window.changeQty('${item.name.replace(/'/g, "\\'")}', 1)">+</button></div>`;
    else btnWrap.innerHTML = `<div class="app-add-btn" style="height:40px; border-radius:10px; width:auto; padding:0 20px; font-size:1em; font-weight:bold;" onclick="event.stopPropagation(); window.addToCart('${item.name.replace(/'/g, "\\'")}', ${item.price}, '${item.brand ? item.brand.replace(/'/g, "\\'") : ''}', ${stock})">+ ADD</div>`;

    window.openSpecificModal('product-detail-modal');
};

// HELPER FUNCTIONS (Preserved exactly)
window.updateCategoryVisibility = () => {
    const uniqueCats = [...new Set(window.allItems.map(item => item.category || 'More Favorites').filter(c => c))];
    const categories = ['New Arrivals', 'All Items', ...uniqueCats]; let catVisibility = {};
    categories.forEach(cat => {
        if (cat === 'All Items') catVisibility[cat] = true;
        else if (cat === 'New Arrivals') catVisibility[cat] = window.allItems.some(i => window.isNewArrival(i) && (window.currentBrand === 'All Brands' || i.brand === window.currentBrand));
        else catVisibility[cat] = window.allItems.some(i => (i.category || 'More Favorites') === cat && (window.currentBrand === 'All Brands' || i.brand === window.currentBrand));
    });
    document.querySelectorAll('.cat-item, .filter-tag-chip, .grid-sel-item').forEach(btn => {
        let cat = btn.getAttribute('data-category'); if (cat) btn.style.display = catVisibility[cat] ? 'flex' : 'none';
    });
    if (!catVisibility[window.currentCategory] && window.currentCategory !== 'All Items') setTimeout(() => window.setCategory('All Items'), 0);
};

window.switchStore = (mode) => {
    if (window.currentStoreMode === mode) return;
    window.currentStoreMode = mode;
    document.getElementById('tab-icecream').classList.remove('active'); document.getElementById('tab-grocery').classList.remove('active');
    document.getElementById(`tab-${mode}`).classList.add('active');
    let oosDesk = document.getElementById('hide-oos-wrap-desk'); let oosMob = document.getElementById('hide-oos-wrap-mob');
    if (mode === 'grocery') { if(oosDesk) oosDesk.style.display = 'flex'; if(oosMob) oosMob.style.display = 'flex'; } 
    else { if(oosDesk) oosDesk.style.display = 'none'; if(oosMob) oosMob.style.display = 'none'; window.syncOOS(false); }
    window.allItems = mode === 'icecream' ? window.allIceCreamItems : window.allGroceryItems;
    window.currentCategory = 'All Items'; window.currentBrand = 'All Brands'; window.currentTagFilter = 'All';
    window.setupAppUI(); window.updateCategoryVisibility(); window.applyFilters();
};

window.setCategory = (categoryName) => {
    window.currentCategory = categoryName; const container = document.getElementById('category-sidebar');
    document.querySelectorAll('.cat-item, .filter-tag-chip, .grid-sel-item').forEach(btn => {
        if (btn.getAttribute('data-category') === categoryName) {
            btn.classList.add('active');
            if (btn.classList.contains('cat-item') && window.innerWidth <= 999 && container) {
                const scrollPos = btn.offsetLeft - (container.clientWidth / 2) + (btn.clientWidth / 2); container.scrollTo({ left: scrollPos, behavior: 'smooth' });
            }
        } else if (btn.hasAttribute('data-category')) btn.classList.remove('active');
    });
    window.updateUrlParams(); window.applyFilters(); setTimeout(() => { window.scrollTo({top: 0, behavior: 'smooth'}); }, 10);
};

window.setBrand = (brandName) => {
    window.currentBrand = brandName; const container = document.getElementById('brands-sidebar');
    document.querySelectorAll('.brand-item').forEach(btn => {
        const name = btn.querySelector('.brand-name').innerText.trim();
        if (name === (brandName === 'All Brands' ? 'ALL' : brandName.toUpperCase())) {
            btn.classList.add('active');
            if(container) { const scrollPos = btn.offsetLeft - (container.clientWidth / 2) + (btn.clientWidth / 2); container.scrollTo({ left: scrollPos, behavior: 'smooth' }); }
        } else btn.classList.remove('active');
    });
    document.querySelectorAll('#fab-brand-grid .grid-sel-item').forEach(btn => {
        const name = btn.querySelector('.grid-sel-name').innerText.trim();
        if (name.toLowerCase() === (brandName === 'All Brands' ? 'All' : brandName).toLowerCase()) btn.classList.add('active'); else btn.classList.remove('active');
    });
    window.updateCategoryVisibility(); window.updateUrlParams(); window.applyFilters(); setTimeout(() => { window.scrollTo({top: 0, behavior: 'smooth'}); }, 10);
};

window.setTagFilter = (tag) => {
    window.currentTagFilter = tag;
    document.querySelectorAll('.filter-tag-chip').forEach(btn => {
        if(btn.hasAttribute('data-tag')) { if(btn.getAttribute('data-tag') === tag) btn.classList.add('active'); else btn.classList.remove('active'); }
    });
    window.applyFilters(); setTimeout(() => { window.scrollTo({top: 0, behavior: 'smooth'}); }, 10);
};

window.getVolume = (name) => { let total = 0; let match; const regex = /(\d+(?:\.\d+)?)\s*(ml|l|ltr|gm|g|kg)/gi; while ((match = regex.exec(name)) !== null) { let val = parseFloat(match[1]); let unit = match[2].toLowerCase(); if (unit === 'l' || unit === 'ltr' || unit === 'kg') val *= 1000; total += val; } return total; };
window.getDiscount = (item) => { let m = parseFloat(item.mrp); let p = parseFloat(item.price); if (m && !isNaN(m) && m > p) return ((m - p) / m) * 100; return 0; };
window.extractVolumeText = (name) => { const match = name.match(/(\d+(?:\.\d+)?\s*(ml|l|ltr|gm|g|kg))/i); return match ? match[0] : ''; };
window.getItemStock = (item) => { if(!item) return null; for (let key in item) { let cleanKey = String(key).toLowerCase().replace(/[^a-z]/g, ''); if (['stock', 'qty', 'quantity', 'available'].includes(cleanKey)) { if (typeof item[key] === 'number') return item[key]; if (typeof item[key] === 'string' && !isNaN(parseInt(item[key]))) return parseInt(item[key]); } } return null; };
window.getLaunchDate = (item) => { let dateStr = null; for (let key in item) { let cleanKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, ''); if (cleanKey.includes('launch') || cleanKey.includes('year') || cleanKey.includes('date')) { if (item[key] && String(item[key]).trim() !== '') { dateStr = String(item[key]).trim(); break; } } } if (!dateStr) return null; let yearMatch = dateStr.match(/\d{4}/); if (!yearMatch) return null; let year = parseInt(yearMatch[0], 10); let month = 0; let monthMatchDigits = dateStr.match(/(?:^|[\/\-])(\d{1,2})(?:[\/\-]|$)/); if (monthMatchDigits && parseInt(monthMatchDigits[1], 10) <= 12) { month = parseInt(monthMatchDigits[1], 10) - 1; } else { const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]; let lowerDateStr = dateStr.toLowerCase(); for (let i = 0; i < monthNames.length; i++) { if (lowerDateStr.includes(monthNames[i])) { month = i; break; } } } return { year: year, month: month }; };
window.isNewArrival = (item) => { let launchData = window.getLaunchDate(item); if (!launchData) return false; let now = new Date(); let monthsDiff = (now.getFullYear() - launchData.year) * 12 + (now.getMonth() - launchData.month); return monthsDiff >= -2 && monthsDiff <= 3; };
window.getItemTags = (item) => { let tagString = item.tags || item.Tags || item.TAGS || ''; if (!tagString) return []; return String(tagString).split(',').map(t => t.trim()).filter(t => t.length > 0); };
window.getTagStyle = (tag) => { let t = tag.toLowerCase(); if(t.includes('vegan')) return 'tag-style-vegan'; if(t.includes('sugar')) return 'tag-style-sugarfree'; if(t.includes('fast') || t.includes('vrat') || t.includes('guilt')) return 'tag-style-fastfriendly'; return 'tag-style-default'; };
window.getTagIcon = (tag) => { let t = tag.toLowerCase(); let imgUrl = ''; if (t.includes('vegan')) imgUrl = 'https://i.postimg.cc/mD5dDdW4/vegan.png'; else if (t.includes('diet') || t.includes('fast') || t.includes('vrat') || t.includes('guilt')) imgUrl = 'https://i.postimg.cc/wvGWvWYY/diet_icon.png'; else if (t.includes('sugar')) imgUrl = 'https://i.postimg.cc/MTFsTsJ2/sficon.png'; else if (t.includes('fruit')) imgUrl = 'https://i.postimg.cc/rmPhmhXB/fruit.png'; if (imgUrl) return `<img src="${imgUrl}" style="width: 16px; height: 16px; object-fit: contain; vertical-align: middle;">`; return ''; };
window.formatImageUrl = (imgPath) => { if (!imgPath) return 'https://placehold.co/300x220/f4f6f9/a0a0a0?text=No+Image'; if (imgPath.startsWith('http')) return imgPath; return "https://www.appsheet.com/template/gettablefileurl?appName=IceCreamInventory-257487838&tableName=menu&fileName=" + imgPath; };

const brandImageLinks = { "baskin robbins": "https://i.postimg.cc/j5FTdyfz/brlogo.png", "london dairy": "https://i.postimg.cc/jdtSC4nV/LD-logo.png", "mother dairy": "https://i.postimg.cc/4dSGNpcB/md_logo.png", "amul": "https://via.placeholder.com/100/e44d26/ffffff?text=Amul", "kwality": "https://i.postimg.cc/ncGM1PfV/kw_logo.png", "kwality walls": "https://i.postimg.cc/ncGM1PfV/kw_logo.png", "gianis": "https://i.postimg.cc/L6kw6Gr2/lgo-gianis.png", "havmor": "https://i.postimg.cc/KvD45HhZ/logo_havmor.png", "hocco": "https://i.postimg.cc/CLsd4Qph/hocco_logo.png", "frubon": "https://i.postimg.cc/0y5Q0rM3/logo_fb.png", "veeba": "https://i.postimg.cc/DwBtSHQz/veeba.png", "hersheys": "https://i.postimg.cc/x1tWXhG0/hersheyland.jpg", "cadbury": "https://i.postimg.cc/Njg3fBXB/cadbury.jpg", "karachi bakery": "https://i.postimg.cc/htSkPcmh/karachibakery.png", "orion": "https://i.postimg.cc/P52BC9bH/orion.png", "fererro": "https://i.postimg.cc/HkpqsdMW/fererro.png", "pringles": "https://i.postimg.cc/13JL8203/pringle.png", "nissin": "https://i.postimg.cc/Qd0RFwg3/nissin.png", "aakash": "https://i.postimg.cc/Jz1f4MX4/aakash.jpg", "bagrrys": "https://i.postimg.cc/W12BbTZs/bagrrys.png", "bikaji": "https://ui-avatars.com/api/?name=Bikaji&background=e74c3c&color=fff&bold=true", "puregrab": "https://ui-avatars.com/api/?name=Pure+Grab&background=8e44ad&color=fff&bold=true", "shahi agarwal": "https://i.postimg.cc/JzP9sv3n/shahi-agarwal.jpg" };
window.getBrandLogo = (brandName) => { if(!brandName) return ''; const b = brandName.toLowerCase(); let matchedImg = ''; for (let key in brandImageLinks) { if (b.includes(key)) { matchedImg = brandImageLinks[key]; break; } } if (matchedImg) return `<img src="${matchedImg}" alt="${brandName}">`; let text = brandName.substring(0, 2).toUpperCase(); return `<svg viewBox="0 0 100 100" style="width:100%; height:100%; background:var(--chip-bg);"><text x="50" y="55" font-size="38" fill="var(--text-muted)" font-weight="bold" font-family="Montserrat, sans-serif" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`; };

window.updateBrandArrows = () => { const row = document.getElementById('brands-sidebar'); if(!row) return; const items = row.querySelectorAll('.brand-item'); if(items.length === 0) return; let hiddenLeft = 0; let hiddenRight = 0; const containerRect = row.getBoundingClientRect(); items.forEach(item => { const rect = item.getBoundingClientRect(); const itemCenter = rect.left + (rect.width / 2); if(itemCenter < containerRect.left) hiddenLeft++; else if(itemCenter > containerRect.right) hiddenRight++; }); const lBtn = document.getElementById('btn-brand-left'); const rBtn = document.getElementById('btn-brand-right'); if (row.scrollLeft > 5) { if(lBtn) lBtn.style.display = 'flex'; } else { if(lBtn) lBtn.style.display = 'none'; } if (Math.ceil(row.scrollLeft + row.clientWidth) < row.scrollWidth - 5) { if(rBtn) rBtn.style.display = 'flex'; } else { if(rBtn) rBtn.style.display = 'none'; } };
window.scrollBrands = (dir) => { const row = document.getElementById('brands-sidebar'); if(row) row.scrollBy({ left: dir * 150, behavior: 'smooth' }); setTimeout(window.updateBrandArrows, 300); };
window.syncInputs = (source) => { const searchVal = document.getElementById(`search-bar-${source}`) ? document.getElementById(`search-bar-${source}`).value : ''; const sortVal = document.getElementById(source === 'main' ? 'sort-dropdown-main' : (source === 'desktop-tools' ? 'sort-dropdown-desktop-tools' : `sort-dropdown-${source}`)) ? document.getElementById(source === 'main' ? 'sort-dropdown-main' : (source === 'desktop-tools' ? 'sort-dropdown-desktop-tools' : `sort-dropdown-${source}`)).value : 'default'; ['header', 'desktop', 'mobile', 'landscape', 'desktop-tools', 'main'].forEach(env => { if(env !== source) { const searchEl = document.getElementById(`search-bar-${env}`); const sortEl = document.getElementById(env === 'main' ? 'sort-dropdown-main' : (env === 'desktop-tools' ? 'sort-dropdown-desktop-tools' : `sort-dropdown-${env}`)); if(searchEl) searchEl.value = searchVal; if(sortEl) sortEl.value = sortVal; } }); window.applyFilters(); };
window.syncOOS = (checked) => { window.hideOutOfStock = checked; let dDesk = document.getElementById('hide-oos-desk'); let dMob = document.getElementById('hide-oos-mob'); if(dDesk && dDesk.checked !== checked) dDesk.checked = checked; if(dMob && dMob.checked !== checked) dMob.checked = checked; window.applyFilters(); };
window.showToast = (itemName) => { const container = document.getElementById('toast-container'); if(!container) return; const toast = document.createElement('div'); toast.className = 'toast'; toast.innerHTML = `<span>✅</span> <span>${itemName}</span>`; container.appendChild(toast); setTimeout(() => { if(toast.parentElement) toast.remove(); }, 3000); };
window.updateUrlParams = () => { const url = new URL(window.location); if (window.currentCategory === 'All Items') url.searchParams.delete('category'); else url.searchParams.set('category', window.currentCategory); if (window.currentBrand === 'All Brands') url.searchParams.delete('brand'); else url.searchParams.set('brand', window.currentBrand); window.history.replaceState({}, '', url); };

window.refreshMenu = async () => {
    const refreshBtns = document.querySelectorAll('.action-btn[onclick="window.refreshMenu()"], #inline-refresh-btn');
    refreshBtns.forEach(btn => { if(!btn.dataset.orig) btn.dataset.orig = btn.innerHTML; btn.innerHTML = '⏳'; btn.style.pointerEvents = 'none'; btn.style.opacity = '0.5'; });
    try {
        const noCacheParam = "?_t=" + Date.now();
        let iceCreamData = [], groceryData = [];
        try { const resIce = await fetch(iceCreamSheetUrl + noCacheParam); if(resIce.ok) iceCreamData = JSON.parse(await resIce.text()); } catch(e) {}
        try { const resGroc = await fetch(grocerySheetUrl + noCacheParam); if(resGroc.ok) groceryData = JSON.parse(await resGroc.text()); } catch(e) {}
        window.allIceCreamItems = window.normalizeData(iceCreamData, false); window.allGroceryItems = window.normalizeData(groceryData, true); 
        window.allItems = window.currentStoreMode === 'icecream' ? window.allIceCreamItems : window.allGroceryItems;
        window.setupAppUI(); window.updateCategoryVisibility();
        document.querySelectorAll('.cat-item').forEach(btn => { const name = btn.querySelector('.cat-name').innerText.trim(); if (name.toLowerCase() === window.currentCategory.toLowerCase() || (window.currentCategory.includes('New') && name.includes('New'))) btn.classList.add('active'); else btn.classList.remove('active'); });
        document.querySelectorAll('.brand-item').forEach(btn => { const name = btn.querySelector('.brand-name').innerText.trim(); if (name === (window.currentBrand === 'All Brands' ? 'ALL' : window.currentBrand.toUpperCase())) btn.classList.add('active'); else btn.classList.remove('active'); });
        document.querySelectorAll('.filter-tag-chip').forEach(btn => { if(btn.getAttribute('data-tag') === window.currentTagFilter) btn.classList.add('active'); else btn.classList.remove('active'); });
        window.applyFilters();
        for (let name in window.cart) { let found = window.allItems.find(i => i.name === name); if (found) { let s = window.getItemStock(found); if (window.currentStoreMode === 'grocery' && s !== null) { window.cart[name].maxStock = s; if (s === 0) delete window.cart[name]; else if (window.cart[name].qty > s) window.cart[name].qty = s; } } }
        window.updateCartUI();
        if (window.globalUser && typeof window.fetchUserData === 'function') await window.fetchUserData(window.userDocId);
    } catch(e) { console.error(e); }
    refreshBtns.forEach(btn => { btn.innerHTML = btn.dataset.orig; btn.style.pointerEvents = 'auto'; btn.style.opacity = '1'; });
};

const productsArea = document.getElementById('products-area');
window.addEventListener('scroll', function() {
    let isMobile = window.innerWidth <= 999;
    let scrollTop = isMobile ? (window.scrollY || document.documentElement.scrollTop) : (productsArea ? productsArea.scrollTop : 0);
    let scrollHeight = isMobile ? document.documentElement.scrollHeight : (productsArea ? productsArea.scrollHeight : 0);
    let clientHeight = isMobile ? window.innerHeight : (productsArea ? productsArea.clientHeight : 0);
    if (window.currentlyDisplayed < window.currentFilteredItems.length) { if (scrollTop + clientHeight >= scrollHeight - 1500) { window.renderMoreItems(); } }
    const backToTop = document.getElementById('back-to-top');
    if(backToTop) { if(scrollTop > 400) backToTop.classList.add('visible'); else backToTop.classList.remove('visible'); }
});
if (productsArea) productsArea.addEventListener('scroll', function() { window.dispatchEvent(new Event('scroll')); });

window.onload = window.loadData;
