window.updateAddButtons = () => {
    window.allItems.forEach(item => {
        if(!item.name) return;
        const safeName = item.name.replace(/[^a-zA-Z0-9]/g, '_'); 
        const wrap = document.getElementById(`add-wrap-${safeName}`);
        if (wrap) {
            let stock = window.getItemStock(item);
            if (window.currentStoreMode === 'grocery' && stock === 0) {
                wrap.innerHTML = `<div class="out-of-stock-badge">OUT OF STOCK</div>`;
            } else if (window.cart[item.name]) {
                wrap.innerHTML = `<div class="app-qty-control"><button onclick="event.stopPropagation(); window.changeQty('${item.name.replace(/'/g, "\\'")}', -1)">−</button><span>${window.cart[item.name].qty}</span><button onclick="event.stopPropagation(); window.changeQty('${item.name.replace(/'/g, "\\'")}', 1)">+</button></div>`;
            } else {
                wrap.innerHTML = `<div class="app-add-btn" onclick="event.stopPropagation(); window.addToCart('${item.name.replace(/'/g, "\\'")}', ${item.price}, '${item.brand ? item.brand.replace(/'/g, "\\'") : ''}', ${stock})">+</div>`;
            }
        }
    });
};

window.addToCart = (name, price, brand, maxStock) => { 
    let currentQty = window.cart[name] ? window.cart[name].qty : 0;
    if (window.currentStoreMode === 'grocery' && maxStock !== null && currentQty >= maxStock) {
        alert("Maximum stock limit reached! 🚫"); return;
    }
    if(window.cart[name]) window.cart[name].qty += 1; 
    else window.cart[name] = { price: price, qty: 1, brand: brand, maxStock: maxStock }; 
    window.updateCartUI(); window.showToast("Added " + name); 
    if(document.getElementById('product-detail-modal').style.display === 'flex') window.openProductDetail(name);
};

window.changeQty = (name, delta) => { 
    if(window.cart[name]) { 
        let newQty = window.cart[name].qty + delta;
        if (delta > 0 && window.currentStoreMode === 'grocery' && window.cart[name].maxStock !== null && newQty > window.cart[name].maxStock) {
            alert("Maximum stock limit reached! 🚫"); return;
        }
        window.cart[name].qty = newQty; 
        if(window.cart[name].qty <= 0) delete window.cart[name]; 
        window.updateCartUI(); 
        if(document.getElementById('product-detail-modal').style.display === 'flex') window.openProductDetail(name);
    } 
};

window.updateCartUI = () => {
    const cartList = document.getElementById('cart-items-list'); 
    const floatingCartBtn = document.getElementById('floating-cart');
    const badgeCount = document.getElementById('cart-badge-count');
    
    let totalQty = 0; let totalPrice = 0; if(cartList) cartList.innerHTML = '';
    for (const [name, data] of Object.entries(window.cart)) {
        totalQty += data.qty; const itemTotal = data.price * data.qty; totalPrice += itemTotal;
        let itemPriceHTML = `₹${itemTotal}`;
        if(cartList) cartList.innerHTML += `<div class="cart-item"><div class="cart-item-details"><div style="font-size: 0.75em; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">${data.brand}</div><div style="font-weight: 600; color: var(--text-main);">${name}</div></div><div class="cart-item-controls"><button class="qty-btn" onclick="window.changeQty('${name.replace(/'/g, "\\'")}', -1)">-</button><span style="font-weight: 700;">${data.qty}</span><button class="qty-btn" onclick="window.changeQty('${name.replace(/'/g, "\\'")}', 1)">+</button></div><div class="cart-item-price">${itemPriceHTML}</div></div>`;
    }
    window.updateAddButtons();
    
    if(totalQty > 0) { 
        if(badgeCount) badgeCount.innerText = totalQty; 
        if(floatingCartBtn) floatingCartBtn.classList.add('visible'); 
    } else { 
        if(cartList) cartList.innerHTML = '<p style="color:var(--text-muted); text-align: center; font-weight: 500;">Your cart is empty. 🛒</p>'; 
        if(floatingCartBtn) floatingCartBtn.classList.remove('visible'); 
        document.getElementById('cart-modal').style.display = 'none'; window.unlockBodyScroll();
    }
    document.getElementById('cart-total-price').innerText = totalPrice;
};

window.toggleCart = () => { 
    if(Object.keys(window.cart).length === 0) return; 
    const modal = document.getElementById('cart-modal'); 
    if(modal.style.display === 'flex') { modal.style.display = 'none'; window.unlockBodyScroll(); } 
    else { modal.style.display = 'flex'; window.lockBodyScroll(); }
};

window.clearCart = () => { if(Object.keys(window.cart).length === 0) return; if(confirm("Are you sure you want to clear your cart?")) { window.cart = {}; window.updateCartUI(); } };

window.checkout = async (method) => {
    if(Object.keys(window.cart).length === 0) return;
    if (method === 'whatsapp') {
        let message = window.currentStoreMode === 'icecream' ? "Hello Glacier Ice Cream!🍦\n\n*New Order:*\n" : "Hello Glacier Grocery!🛒\n\n*New Order:*\n"; 
        let total = 0; let itemsSummary = [];
        for (const [name, data] of Object.entries(window.cart)) {
            message += `- ${data.qty}x [${data.brand}] ${name} (₹${data.price * data.qty})\n`;
            total += (data.price * data.qty); itemsSummary.push(`${data.qty}x ${name}`);
        }
        
        if (window.userDocId && window.globalUserData && window.globalUserData.addresses && window.globalUserData.addresses.length > 0) {
            let addr = window.globalUserData.addresses[window.selectedAddressIndex];
            if(!addr) addr = window.globalUserData.addresses[0]; 
            let fullDeliveryAddress = `${addr.house}, ${addr.area}`;
            message += `\n*Delivery Details:*\nLabel: ${addr.label}\nReceiver: ${addr.name}\nContact: ${addr.phone}\nAddress: ${fullDeliveryAddress}\n`;
            if (addr.lat && addr.lng) { message += `📍 *Location Link:* https://maps.google.com/maps?q=${addr.lat},${addr.lng}\n`; }
            try {
                if(window.addDoc && window.collection && window.db) {
                    window.addDoc(window.collection(window.db, "orders"), { userId: window.userDocId, items: window.cart, itemsSummary: itemsSummary.join(', '), totalAmount: total, timestamp: new Date() });
                }
            } catch(e) {}
        } else if (window.globalUser) { 
            alert("Please add a delivery address in 'Addresses' before checking out!"); 
            window.openSpecificModal('addresses-modal'); return;
        } else { window.handleProfileClick(); return; }

        message += `\n*Total Amount: ₹${total}*\n\n_Please confirm my order._`;
        const cleanPhone = window.WHATSAPP_NUMBER.replace(/[^0-9]/g, '');
        window.location.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    }
};
