let products = JSON.parse(localStorage.getItem('cs_products')) || [];
let cart = JSON.parse(localStorage.getItem('cs_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('cs_wishlist')) || [];
let orders = JSON.parse(localStorage.getItem('cs_orders')) || [];
let users = JSON.parse(localStorage.getItem('cs_users')) || [];
let currentUser = JSON.parse(localStorage.getItem('cs_currentUser')) || null;
let currentPage = 1;
const perPage = 8;
let currentCategory = 'all';
let currentSort = 'default';
let searchTerm = '';

const defaultProducts = [
    {id:1,name:"Classmate Notebook",price:45,category:"notebooks",rating:4.5,stock:150,image:"📓",desc:"Premium quality notebook with 200 pages. Smooth paper, perfect for college notes."},
    {id:2,name:"Apsara Drawing Book",price:80,category:"notebooks",rating:4.2,stock:80,image:"📒",desc:"A4 size drawing book with thick pages. Great for art and design students."},
    {id:3,name:"Register File",price:120,category:"notebooks",rating:4.0,stock:60,image:"📕",desc:"Hardcover register file with 300 pages. Lab record and assignment ready."},
    {id:4,name:"Cello Pointerr Pen",price:10,category:"pens",rating:4.3,stock:500,image:"✏️",desc:"Smooth ballpoint pen. Black ink, comfortable grip. Pack of 10."},
    {id:5,name:"Reynolds Trimax",price:15,category:"pens",rating:4.6,stock:300,image:"🖊️",desc:"Premium gel pen with smooth writing. Blue ink, 0.5mm tip."},
    {id:6,name:"Faber Castell Pencil",price:8,category:"pens",rating:4.4,stock:400,image:"✒️",desc:"HB pencils pack of 12. Perfect for exams and everyday use."},
    {id:7,name:"NCERT Math Class 12",price:350,category:"books",rating:4.8,stock:40,image:"📖",desc:"Official NCERT Mathematics textbook for Class 12. Complete syllabus covered."},
    {id:8,name:"HC Verma Physics",price:420,category:"books",rating:4.9,stock:35,image:"📚",desc:"Concepts of Physics by HC Verma. Must-have for JEE/NEET aspirants."},
    {id:9,name:"RD Sharma Maths",price:380,category:"books",rating:4.7,stock:45,image:"📘",desc:"Mathematics for Class 12. Detailed solutions and practice problems."},
    {id:10,name:"College Backpack",price:899,category:"accessories",rating:4.4,stock:25,image:"🎒",desc:"Waterproof laptop backpack with USB charging port. 3 compartments."},
    {id:11,name:"Calculator Casio fx-991",price:1299,category:"accessories",rating:4.8,stock:20,image:"🔢",desc:"Scientific calculator allowed in exams. 417 functions."},
    {id:12,name:"Pencil Box",price:150,category:"accessories",rating:4.1,stock:60,image:"📦",desc:"Metal pencil box with 2 compartments. Durable and stylish."},
    {id:13,name:"Geometry Box",price:250,category:"stationery",rating:4.3,stock:50,image:"📐",desc:"Complete geometry set with compass, protractor, scale, and divider."},
    {id:14,name:"Highlighter Set",price:99,category:"stationery",rating:4.5,stock:100,image:"🖍️",desc:"6 color highlighter set. Neon colors, chisel tip, no smear."},
    {id:15,name:"Sticky Notes Pack",price:75,category:"stationery",rating:4.2,stock:120,image:"📝",desc:"200 sticky notes in 4 colors. 3x3 inch, strong adhesive."},
    {id:16,name:"Whiteboard Marker",price:120,category:"stationery",rating:4.0,stock:80,image:"🖊️",desc:"Set of 8 dry erase markers. Bright colors, easy to erase."},
    {id:17,name:"Correction Tape",price:45,category:"stationery",rating:4.1,stock:150,image:"🔄",desc:"Instant dry correction tape. 8mm x 10m, no mess."},
    {id:18,name:"USB Drive 32GB",price:350,category:"accessories",rating:4.6,stock:40,image:"💾",desc:"SanDisk USB 3.0 flash drive. Fast data transfer, compact design."},
    {id:19,name:"Notebook Set (3pc)",price:130,category:"notebooks",rating:4.4,stock:70,image:"📋",desc:"Set of 3 subject notebooks. 180 pages each, ruled pattern."},
    {id:20,name:"Gel Pen Set",price:60,category:"pens",rating:4.5,stock:200,image:"🖊️",desc:"Pack of 10 colorful gel pens. Smooth ink, vibrant colors."}
];

if(products.length === 0) {
    products = defaultProducts;
    save();
}

function save() {
    localStorage.setItem('cs_products', JSON.stringify(products));
    localStorage.setItem('cs_cart', JSON.stringify(cart));
    localStorage.setItem('cs_wishlist', JSON.stringify(wishlist));
    localStorage.setItem('cs_orders', JSON.stringify(orders));
    localStorage.setItem('cs_users', JSON.stringify(users));
    localStorage.setItem('cs_currentUser', JSON.stringify(currentUser));
}

function toast(msg, type='success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i> ${msg}`;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-'+page).classList.add('active');
    window.scrollTo(0, 0);
    if(page === 'cart') renderCart();
    if(page === 'wishlist') renderWishlist();
    if(page === 'orders') renderOrders();
    if(page === 'admin') renderAdmin();
    if(page === 'checkout') renderCheckout();
    updateCounts();
}

function goHome() {
    showPage('home');
    renderProducts();
}

function toggleMobile() {
    document.querySelector('.nav-links').classList.toggle('open');
}

function updateCounts() {
    document.getElementById('cartCount').textContent = cart.length;
    document.getElementById('wishlistCount').textContent = wishlist.length;
    if(currentUser) {
        document.getElementById('authLinks').style.display = 'none';
        document.getElementById('userLinks').style.display = 'flex';
        if(currentUser.role === 'admin') document.getElementById('adminLink').style.display = 'block';
    } else {
        document.getElementById('authLinks').style.display = 'block';
        document.getElementById('userLinks').style.display = 'none';
    }
}

// PRODUCTS
function renderProducts() {
    let filtered = [...products];
    if(currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
    if(searchTerm) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if(currentSort === 'low') filtered.sort((a,b) => a.price - b.price);
    if(currentSort === 'high') filtered.sort((a,b) => b.price - a.price);
    if(currentSort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
    if(currentSort === 'rating') filtered.sort((a,b) => b.rating - a.rating);

    const start = (currentPage - 1) * perPage;
    const paged = filtered.slice(start, start + perPage);

    const grid = document.getElementById('productsGrid');
    grid.innerHTML = paged.map((p, i) => `
        <div class="product-card" style="animation-delay:${i*0.05}s" onclick="showDetail(${p.id})">
            <button class="wishlist-btn ${wishlist.includes(p.id)?'active':''}" onclick="event.stopPropagation();toggleWishlist(${p.id})">
                <i class="fas fa-heart"></i>
            </button>
            <div class="product-emoji">${p.image}</div>
            <div class="product-name">${p.name}</div>
            <div class="product-price">₹${p.price}</div>
            <div class="product-rating">
                ${'★'.repeat(Math.floor(p.rating))}${'☆'.repeat(5-Math.floor(p.rating))}
                ${p.rating}
            </div>
            <div class="product-actions">
                <button class="btn-green" onclick="event.stopPropagation();addToCart(${p.id})" style="flex:1">Add to Cart</button>
            </div>
        </div>
    `).join('');

    const totalPages = Math.ceil(filtered.length / perPage);
    const pag = document.getElementById('pagination');
    pag.innerHTML = '';
    for(let i=1;i<=totalPages;i++) {
        pag.innerHTML += `<button class="page-btn ${i===currentPage?'active':''}" onclick="currentPage=${i};renderProducts()">${i}</button>`;
    }
}

function filterCategory(cat) {
    currentCategory = cat;
    currentPage = 1;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderProducts();
}

function sortProducts(val) {
    currentSort = val;
    renderProducts();
}

function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    currentPage = 1;
    renderProducts();
}

function showDetail(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    const inCart = cart.find(x => x.id === id);
    document.getElementById('productDetail').innerHTML = `
        <div class="back-btn" onclick="goHome()"><i class="fas fa-arrow-left"></i> Back to Products</div>
        <div class="detail-image">${p.image}</div>
        <div class="detail-info">
            <h1>${p.name}</h1>
            <div class="detail-price">₹${p.price}</div>
            <div class="detail-rating">
                ${'★'.repeat(Math.floor(p.rating))}${'☆'.repeat(5-Math.floor(p.rating))}
                ${p.rating} rating
            </div>
            <p class="detail-desc">${p.desc}</p>
            <div class="detail-stock">${p.stock > 0 ? '✓ In Stock ('+p.stock+' available)' : '✗ Out of Stock'}</div>
            <div class="qty-control">
                <button class="qty-btn" onclick="changeQty(-1)">-</button>
                <span class="qty-val" id="qtyVal">1</span>
                <button class="qty-btn" onclick="changeQty(1)">+</button>
            </div>
            <div class="detail-actions">
                <button class="btn-green" onclick="addToCartQty(${p.id})" style="flex:1">
                    <i class="fas fa-shopping-cart"></i> Add to Cart
                </button>
                <button class="btn-outline" onclick="toggleWishlist(${p.id});showDetail(${p.id})">
                    <i class="fas fa-heart" style="color:${wishlist.includes(p.id)?'var(--red)':'var(--dim)'}"></i>
                </button>
            </div>
        </div>
    `;
    showPage('detail');
}

let qty = 1;
function changeQty(d) {
    qty = Math.max(1, qty + d);
    document.getElementById('qtyVal').textContent = qty;
}

function addToCartQty(id) {
    for(let i=0;i<qty;i++) addToCart(id, true);
    qty = 1;
    toast('Added to cart!');
}

function addToCart(id, silent) {
    const existing = cart.find(x => x.id === id);
    if(existing) { existing.qty++; }
    else { cart.push({id, qty:1}); }
    save();
    updateCounts();
    if(!silent) toast('Added to cart!');
}

function removeFromCart(id) {
    cart = cart.filter(x => x.id !== id);
    save();
    renderCart();
    updateCounts();
    toast('Removed from cart');
}

function updateCartQty(id, d) {
    const item = cart.find(x => x.id === id);
    if(item) {
        item.qty += d;
        if(item.qty <= 0) cart = cart.filter(x => x.id !== id);
    }
    save();
    renderCart();
    updateCounts();
}

function renderCart() {
    const el = document.getElementById('cartContent');
    if(cart.length === 0) {
        el.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-cart"></i><p>Your cart is empty</p></div>';
        return;
    }
    let total = 0;
    el.innerHTML = cart.map(c => {
        const p = products.find(x => x.id === c.id);
        if(!p) return '';
        const sub = p.price * c.qty;
        total += sub;
        return `
            <div class="cart-item">
                <div class="cart-emoji">${p.image}</div>
                <div class="cart-info">
                    <div class="cart-name">${p.name}</div>
                    <div class="cart-price">₹${p.price} × ${c.qty}</div>
                </div>
                <div class="qty-control" style="margin:0">
                    <button class="qty-btn" onclick="updateCartQty(${p.id},-1)">-</button>
                    <span class="qty-val">${c.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty(${p.id},1)">+</button>
                </div>
                <button class="btn-red" onclick="removeFromCart(${p.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }).join('') + `
        <div class="cart-total">
            <div>Total: ₹${total}</div>
            <button class="btn-green" style="margin-top:16px" onclick="proceedToCheckout()">
                Proceed to Checkout <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;
}

function proceedToCheckout() {
    if(!currentUser) { toast('Please login first', 'error'); showPage('login'); return; }
    showPage('checkout');
}

function renderCheckout() {
    const el = document.getElementById('checkoutContent');
    let total = 0;
    cart.forEach(c => { const p = products.find(x => x.id === c.id); if(p) total += p.price * c.qty; });
    el.innerHTML = `
        <div class="auth-card" style="margin-top:0">
            <h2><i class="fas fa-credit-card"></i> Order Summary</h2>
            ${cart.map(c => {
                const p = products.find(x => x.id === c.id);
                return p ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--brd);font-size:.88rem">
                    <span>${p.image} ${p.name} × ${c.qty}</span><span style="color:var(--green)">₹${p.price*c.qty}</span>
                </div>` : '';
            }).join('')}
            <div style="display:flex;justify-content:space-between;padding:16px 0;font-weight:700;font-size:1.1rem">
                <span>Total</span><span style="color:var(--green)">₹${total}</span>
            </div>
            <div style="background:var(--glass);border:1px solid var(--brd);border-radius:12px;padding:16px;margin:16px 0;font-size:.85rem;color:var(--dim)">
                <strong style="color:#fff">Payment Method: UPI / Google Pay</strong><br>
                Pay ₹${total} to: <span style="color:var(--green);font-weight:600">mahajanyadneah@upi</span><br>
                <span style="font-size:.78rem">After payment, click "Place Order" and share screenshot on DM</span>
            </div>
            <button class="btn-green full" onclick="placeOrder()">
                <i class="fas fa-check"></i> Place Order
            </button>
        </div>
    `;
}

function placeOrder() {
    const order = {
        id: Date.now(),
        user: currentUser.email,
        items: [...cart],
        total: cart.reduce((sum,c) => { const p = products.find(x=>x.id===c.id); return sum + (p?p.price*c.qty:0); }, 0),
        status: 'pending',
        date: new Date().toLocaleDateString()
    };
    orders.push(order);
    cart = [];
    save();
    toast('Order placed successfully!');
    showPage('orders');
}

function renderOrders() {
    const el = document.getElementById('ordersContent');
    const myOrders = orders.filter(o => o.user === currentUser?.email);
    if(myOrders.length === 0) {
        el.innerHTML = '<div class="cart-empty"><i class="fas fa-box"></i><p>No orders yet</p></div>';
        return;
    }
    el.innerHTML = myOrders.map(o => `
        <div class="cart-item" style="flex-direction:column;align-items:flex-start">
            <div style="display:flex;justify-content:space-between;width:100%;margin-bottom:8px">
                <span style="font-weight:600;color:#fff">Order #${o.id}</span>
                <span class="status-badge status-${o.status}">${o.status}</span>
            </div>
            <div style="font-size:.82rem;color:var(--dim);margin-bottom:8px">${o.date}</div>
            ${o.items.map(c => {
                const p = products.find(x=>x.id===c.id);
                return p ? `<div style="font-size:.85rem;color:var(--txt)">${p.image} ${p.name} × ${c.qty} — ₹${p.price*c.qty}</div>` : '';
            }).join('')}
            <div style="font-weight:700;color:var(--green);margin-top:8px">Total: ₹${o.total}</div>
        </div>
    `).join('');
}

// WISHLIST
function toggleWishlist(id) {
    if(wishlist.includes(id)) { wishlist = wishlist.filter(x=>x!==id); toast('Removed from wishlist'); }
    else { wishlist.push(id); toast('Added to wishlist!'); }
    save();
    updateCounts();
    renderProducts();
}

function renderWishlist() {
    const el = document.getElementById('wishlistContent');
    if(wishlist.length === 0) {
        el.innerHTML = '<div class="cart-empty"><i class="fas fa-heart"></i><p>Your wishlist is empty</p></div>';
        return;
    }
    el.innerHTML = wishlist.map(id => {
        const p = products.find(x=>x.id===id);
        if(!p) return '';
        return `
            <div class="cart-item">
                <div class="cart-emoji">${p.image}</div>
                <div class="cart-info">
                    <div class="cart-name">${p.name}</div>
                    <div class="cart-price">₹${p.price}</div>
                </div>
                <button class="btn-green" onclick="addToCart(${p.id})">Add to Cart</button>
                <button class="btn-red" onclick="toggleWishlist(${p.id});renderWishlist()"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }).join('');
}

// AUTH
function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const phone = document.getElementById('regPhone').value;
    if(users.find(u => u.email === email)) { toast('Email already registered', 'error'); return false; }
    users.push({name, email, pass, phone, role: 'user'});
    save();
    toast('Registered! Please login');
    showPage('login');
    return false;
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    const user = users.find(u => u.email === email && u.pass === pass);
    if(!user) { toast('Invalid credentials', 'error'); return false; }
    currentUser = user;
    save();
    toast('Welcome back, ' + user.name + '!');
    goHome();
    updateCounts();
    return false;
}

function logout() {
    currentUser = null;
    save();
    toast('Logged out');
    goHome();
    updateCounts();
}

// ADMIN
function showAddProduct() {
    document.getElementById('modalTitle').textContent = 'Add Product';
    document.getElementById('editId').value = '';
    document.getElementById('pName').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pCategory').value = '';
    document.getElementById('pRating').value = '';
    document.getElementById('pStock').value = '';
    document.getElementById('pImage').value = '';
    document.getElementById('pDesc').value = '';
    document.getElementById('productModal').classList.add('active');
}

function editProduct(id) {
    const p = products.find(x=>x.id===id);
    if(!p) return;
    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('editId').value = id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pRating').value = p.rating;
    document.getElementById('pStock').value = p.stock;
    document.getElementById('pImage').value = p.image;
    document.getElementById('pDesc').value = p.desc;
    document.getElementById('productModal').classList.add('active');
}

function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const data = {
        name: document.getElementById('pName').value,
        price: Number(document.getElementById('pPrice').value),
        category: document.getElementById('pCategory').value,
        rating: Number(document.getElementById('pRating').value),
        stock: Number(document.getElementById('pStock').value),
        image: document.getElementById('pImage').value || '📦',
        desc: document.getElementById('pDesc').value
    };
    if(id) {
        const idx = products.findIndex(x=>x.id===Number(id));
        if(idx>=0) products[idx] = {...products[idx], ...data};
    } else {
        data.id = Date.now();
        products.push(data);
    }
    save();
    closeModal();
    renderAdmin();
    toast(id ? 'Product updated!' : 'Product added!');
    return false;
}

function deleteProduct(id) {
    if(!confirm('Delete this product?')) return;
    products = products.filter(x=>x.id!==id);
    save();
    renderAdmin();
    toast('Product deleted');
}

function updateOrderStatus(id, status) {
    const order = orders.find(o=>o.id===id);
    if(order) { order.status = status; save(); renderAdmin(); toast('Order updated!'); }
}

function renderAdmin() {
    if(!currentUser || currentUser.role !== 'admin') return;
    const totalRevenue = orders.reduce((s,o)=>s+o.total,0);
    document.getElementById('adminStats').innerHTML = `
        <div class="admin-stat"><div class="admin-stat-val">${products.length}</div><div class="admin-stat-lbl">Products</div></div>
        <div class="admin-stat"><div class="admin-stat-val">${orders.length}</div><div class="admin-stat-lbl">Orders</div></div>
        <div class="admin-stat"><div class="admin-stat-val">₹${totalRevenue}</div><div class="admin-stat-lbl">Revenue</div></div>
        <div class="admin-stat"><div class="admin-stat-val">${users.length}</div><div class="admin-stat-lbl">Users</div></div>
    `;
    document.getElementById('adminProducts').innerHTML = `
        <table class="admin-table">
            <tr><th>Product</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
            ${products.map(p=>`<tr>
                <td>${p.image} ${p.name}</td>
                <td style="color:var(--green)">₹${p.price}</td>
                <td>${p.stock}</td>
                <td class="admin-btns">
                    <button class="btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-red" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('')}
        </table>
    `;
    document.getElementById('adminOrders').innerHTML = orders.length === 0 ? '<p style="color:var(--dim)">No orders yet</p>' : `
        <table class="admin-table">
            <tr><th>Order</th><th>User</th><th>Total</th><th>Status</th><th>Actions</th></tr>
            ${orders.map(o=>`<tr>
                <td>#${o.id}</td>
                <td>${o.user}</td>
                <td style="color:var(--green)">₹${o.total}</td>
                <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                <td class="admin-btns">
                    <button class="btn-sm" onclick="updateOrderStatus(${o.id},'confirmed')">Confirm</button>
                    <button class="btn-sm" onclick="updateOrderStatus(${o.id},'delivered')">Deliver</button>
                    <button class="btn-red" onclick="updateOrderStatus(${o.id},'cancelled')">Cancel</button>
                </td>
            </tr>`).join('')}
        </table>
    `;
}

// INIT
function init() {
    // Create admin account if not exists
    if(!users.find(u => u.role === 'admin')) {
        users.push({name:'Admin', email:'admin@campus.edu', pass:'admin123', phone:'9999999999', role:'admin'});
        save();
    }
    renderProducts();
    updateCounts();
}

init();
