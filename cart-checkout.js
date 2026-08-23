window.addToCart = (name, price, brand, maxStock) => { 
    let currentQty = window.cart[name] ? window.cart[name].qty : 0;
    if (window.currentStoreMode === 'grocery' && maxStock !== null && currentQty >= maxStock) {
        alert("Maximum stock limit reached! 🚫"); return;
    }
    if(window.cart[name]) window.cart[name].qty += 1; 
    else window.cart[name] = { price: price, qty: 1, brand: brand, maxStock: maxStock }; 
    window.updateCartUI(); 
};

window.changeQty = (name, delta) => { 
    if(window.cart[name]) { 
        let newQty = window.cart[name].qty + delta;
        if (delta > 0 && window.currentStoreMode === 'grocery' && window.cart[name].maxStock !== null && newQty > window.cart[name].maxStock) return;
        window.cart[name].qty = newQty; 
        if(window.cart[name].qty <= 0) delete window.cart[name]; 
        window.updateCartUI(); 
    } 
};

window.updateCartUI = () => {
    const cartList = document.getElementById('cart-items-list'); 
    const floatingCartBtn = document.getElementById('floating-cart');
    let totalQty = 0; let totalPrice = 0; if(cartList) cartList.innerHTML = '';
    
    for (const [name, data] of Object.entries(window.cart)) {
        totalQty += data.qty; const itemTotal = data.price * data.qty; totalPrice += itemTotal;
        if(cartList) cartList.innerHTML += `<div class="cart-item">...</div>`; // Rest of your HTML here
    }
    document.getElementById('cart-total-price').innerText = totalPrice;
    if(totalQty > 0) floatingCartBtn.classList.add('visible'); 
    else floatingCartBtn.classList.remove('visible');
};

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
            let addr = window.globalUserData.addresses[window.selectedAddressIndex] || window.globalUserData.addresses[0];
            let fullDeliveryAddress = `${addr.house}, ${addr.area}`;
            message += `\n*Delivery Details:*\nReceiver: ${addr.name}\nContact: ${addr.phone}\nAddress: ${fullDeliveryAddress}\n`;
            
            try {
                // Ensure db and addDoc are globally available from firebase-config.js
                window.addDoc(window.collection(window.db, "orders"), { userId: window.userDocId, items: window.cart, itemsSummary: itemsSummary.join(', '), totalAmount: total, timestamp: new Date() });
            } catch(e) {}
        } else if (window.globalUser) { 
            alert("Please add a delivery address in 'Addresses' before checking out!"); return;
        } else { window.handleProfileClick(); return; }

        message += `\n*Total Amount: ₹${total}*\n\n_Please confirm my order._`;
        const cleanPhone = window.WHATSAPP_NUMBER.replace(/[^0-9]/g, '');
        window.location.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    }
};
