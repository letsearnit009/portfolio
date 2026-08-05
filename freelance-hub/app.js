let clients = JSON.parse(localStorage.getItem('fh_clients')) || [];
let projects = JSON.parse(localStorage.getItem('fh_projects')) || [];
let invoices = JSON.parse(localStorage.getItem('fh_invoices')) || [];
let payments = JSON.parse(localStorage.getItem('fh_payments')) || [];

const stages = ['Inquiry','Discussion','Accepted','Development','Review','Completed'];

const seedClients = [
    {id:1,name:'Rahul Sharma',email:'rahul@gmail.com',phone:'9876543210',company:'TechStart India'},
    {id:2,name:'Priya Patel',email:'priya@outlook.com',phone:'9123456780',company:'FashionHub'},
    {id:3,name:'Amit Kumar',email:'amit@yahoo.com',phone:'9988776655',company:'FoodieBox'},
    {id:4,name:'Sneha Reddy',email:'sneha@gmail.com',phone:'8877665544',company:''},
    {id:5,name:'Vikram Singh',email:'vikram@company.in',phone:'7766554433',company:'GreenEnergy'}
];

const seedProjects = [
    {id:1,name:'Website for ABC',clientId:1,budget:4000,paid:2000,deadline:'2026-08-15',status:'Development',desc:'Business landing page with contact form'},
    {id:2,name:'E-Commerce Store',clientId:2,budget:12000,paid:6000,deadline:'2026-08-25',status:'Development',desc:'Online clothing store with cart and payments'},
    {id:3,name:'Food Delivery App UI',clientId:3,budget:8000,paid:8000,deadline:'2026-07-20',status:'Completed',desc:'Mobile app UI design for food delivery'},
    {id:4,name:'Portfolio Website',clientId:4,budget:3000,paid:0,deadline:'2026-09-01',status:'Inquiry',desc:'Personal portfolio with blog section'},
    {id:5,name:'Solar Panel Dashboard',clientId:5,budget:15000,paid:5000,deadline:'2026-08-30',status:'Accepted',desc:'Admin dashboard for solar panel monitoring'}
];

const seedPayments = [
    {id:1,clientId:1,projectId:1,amount:2000,date:'2026-07-10',method:'UPI'},
    {id:2,clientId:2,projectId:2,amount:3000,date:'2026-07-12',method:'UPI'},
    {id:3,clientId:2,projectId:2,amount:3000,date:'2026-07-18',method:'Bank Transfer'},
    {id:4,clientId:3,projectId:3,amount:4000,date:'2026-07-05',method:'UPI'},
    {id:5,clientId:3,projectId:3,amount:4000,date:'2026-07-15',method:'UPI'},
    {id:6,clientId:5,projectId:5,amount:5000,date:'2026-07-20',method:'UPI'}
];

const seedInvoices = [
    {id:1,projectId:1,items:[{name:'Website Development',amount:3000},{name:'Responsive Design',amount:1000}],date:'2026-07-10'},
    {id:2,projectId:2,items:[{name:'E-Commerce Setup',amount:8000},{name:'Payment Gateway',amount:4000}],date:'2026-07-12'},
    {id:3,projectId:3,items:[{name:'UI Design',amount:5000},{name:'Prototyping',amount:3000}],date:'2026-07-05'}
];

if(clients.length === 0) { clients = seedClients; projects = seedProjects; payments = seedPayments; invoices = seedInvoices; save(); }

function save() {
    localStorage.setItem('fh_clients', JSON.stringify(clients));
    localStorage.setItem('fh_projects', JSON.stringify(projects));
    localStorage.setItem('fh_invoices', JSON.stringify(invoices));
    localStorage.setItem('fh_payments', JSON.stringify(payments));
}

function toast(msg, type='success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i> ${msg}`;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-'+page).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.target.closest('.nav-link')?.classList.add('active');
    const titles = {dashboard:'Dashboard',clients:'Clients',projects:'Projects',invoices:'Invoices',income:'Income'};
    document.getElementById('pageTitle').textContent = titles[page] || page;
    if(page==='dashboard') renderDashboard();
    if(page==='clients') renderClients();
    if(page==='projects') renderProjects();
    if(page==='invoices') renderInvoices();
    if(page==='income') renderIncome();
}

function getClient(id) { return clients.find(c=>c.id===id); }
function getProject(id) { return projects.find(p=>p.id===id); }

// DASHBOARD
function renderDashboard() {
    const totalPaid = payments.reduce((s,p)=>s+p.amount, 0);
    const active = projects.filter(p=>p.status!=='Completed').length;
    const completed = projects.filter(p=>p.status==='Completed').length;
    const pending = projects.reduce((s,p)=>s+(p.budget-p.paid), 0);

    document.getElementById('totalRevenue').textContent = '₹'+totalPaid.toLocaleString();
    document.getElementById('activeProjects').textContent = active;
    document.getElementById('pendingPayments').textContent = '₹'+pending.toLocaleString();
    document.getElementById('completedProjects').textContent = completed;

    document.getElementById('recentProjects').innerHTML = projects.slice(0,5).map(p => {
        const c = getClient(p.clientId);
        return `<div class="dash-item">
            <div class="dash-item-icon"><i class="fas fa-folder" style="color:var(--green)"></i></div>
            <div class="dash-item-info">
                <div class="dash-item-name">${p.name}</div>
                <div class="dash-item-sub">${c?c.name:'Unknown'} • <span class="status-badge status-${p.status.toLowerCase()}">${p.status}</span></div>
            </div>
            <div class="dash-item-amount">₹${p.budget.toLocaleString()}</div>
        </div>`;
    }).join('');

    document.getElementById('recentClients').innerHTML = clients.slice(0,5).map(c => {
        const projCount = projects.filter(p=>p.clientId===c.id).length;
        const totalPaid = payments.filter(p=>p.clientId===c.id).reduce((s,x)=>s+x.amount,0);
        return `<div class="dash-item">
            <div class="dash-item-icon" style="background:linear-gradient(135deg,var(--green-d),var(--green));color:#050505;font-weight:700">${c.name.charAt(0)}</div>
            <div class="dash-item-info">
                <div class="dash-item-name">${c.name}</div>
                <div class="dash-item-sub">${projCount} projects</div>
            </div>
            <div class="dash-item-amount">₹${totalPaid.toLocaleString()}</div>
        </div>`;
    }).join('');
}

// CLIENTS
function renderClients() {
    document.getElementById('clientsList').innerHTML = clients.map(c => {
        const projCount = projects.filter(p=>p.clientId===c.id).length;
        const totalPaid = payments.filter(p=>p.clientId===c.id).reduce((s,x)=>s+x.amount,0);
        const totalBudget = projects.filter(p=>p.clientId===c.id).reduce((s,x)=>s+x.budget,0);
        const outstanding = totalBudget - totalPaid;
        return `<div class="client-card">
            <div class="client-header">
                <div>
                    <div class="client-name">${c.name}</div>
                    <div class="client-company">${c.company||'Individual'}</div>
                </div>
                <div class="client-actions">
                    <button class="btn-sm" onclick="editClient(${c.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-red" onclick="deleteClient(${c.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="client-details">
                <span><i class="fas fa-envelope"></i>${c.email}</span>
                <span><i class="fas fa-phone"></i>${c.phone}</span>
            </div>
            <div class="client-stats">
                <div class="client-stat"><div class="client-stat-val">${projCount}</div><div class="client-stat-lbl">Projects</div></div>
                <div class="client-stat"><div class="client-stat-val" style="color:var(--green)">₹${totalPaid.toLocaleString()}</div><div class="client-stat-lbl">Paid</div></div>
                <div class="client-stat"><div class="client-stat-val" style="color:var(--red)">₹${outstanding.toLocaleString()}</div><div class="client-stat-lbl">Outstanding</div></div>
            </div>
        </div>`;
    }).join('');
}

function showAddClient() {
    document.getElementById('clientModalTitle').textContent = 'Add Client';
    document.getElementById('editClientId').value = '';
    document.getElementById('cName').value = '';
    document.getElementById('cEmail').value = '';
    document.getElementById('cPhone').value = '';
    document.getElementById('cCompany').value = '';
    document.getElementById('clientModal').classList.add('active');
}

function editClient(id) {
    const c = getClient(id);
    if(!c) return;
    document.getElementById('clientModalTitle').textContent = 'Edit Client';
    document.getElementById('editClientId').value = id;
    document.getElementById('cName').value = c.name;
    document.getElementById('cEmail').value = c.email;
    document.getElementById('cPhone').value = c.phone;
    document.getElementById('cCompany').value = c.company || '';
    document.getElementById('clientModal').classList.add('active');
}

function saveClient(e) {
    e.preventDefault();
    const id = document.getElementById('editClientId').value;
    const data = {
        name: document.getElementById('cName').value,
        email: document.getElementById('cEmail').value,
        phone: document.getElementById('cPhone').value,
        company: document.getElementById('cCompany').value
    };
    if(id) {
        const idx = clients.findIndex(c=>c.id===Number(id));
        if(idx>=0) clients[idx] = {...clients[idx], ...data};
    } else {
        data.id = Date.now();
        clients.push(data);
    }
    save();
    closeModal('clientModal');
    renderClients();
    toast(id ? 'Client updated!' : 'Client added!');
    return false;
}

function deleteClient(id) {
    if(!confirm('Delete this client?')) return;
    clients = clients.filter(c=>c.id!==id);
    save();
    renderClients();
    toast('Client deleted');
}

// PROJECTS
function renderProjects() {
    document.getElementById('projectsList').innerHTML = projects.map(p => {
        const c = getClient(p.clientId);
        const remaining = p.budget - p.paid;
        return `<div class="project-card">
            <div class="project-header">
                <div>
                    <div class="project-name">${p.name}</div>
                    <div class="project-client">${c?c.name:'Unknown'}</div>
                </div>
                <span class="status-badge status-${p.status.toLowerCase()}">${p.status}</span>
            </div>
            <div class="project-meta">
                <span><i class="fas fa-calendar"></i>${p.deadline}</span>
                <span><i class="fas fa-info-circle"></i>${p.desc||'No description'}</span>
            </div>
            <div class="stages">
                ${stages.map((s,i) => {
                    const currentIdx = stages.indexOf(p.status);
                    let cls = i < currentIdx ? 'done' : i === currentIdx ? 'active' : '';
                    return `<span class="stage ${cls}">${s}</span>${i<stages.length-1?'<span class="stage-arrow">→</span>':''}`;
                }).join('')}
            </div>
            <div class="project-budget">
                <div class="budget-item"><div class="budget-val">₹${p.budget.toLocaleString()}</div><div class="budget-lbl">Budget</div></div>
                <div class="budget-item"><div class="budget-val green">₹${p.paid.toLocaleString()}</div><div class="budget-lbl">Paid</div></div>
                <div class="budget-item"><div class="budget-val red">₹${remaining.toLocaleString()}</div><div class="budget-lbl">Remaining</div></div>
            </div>
            <div class="project-actions">
                <button class="btn-sm" onclick="editProject(${p.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-sm" onclick="advanceStage(${p.id})"><i class="fas fa-arrow-right"></i> Next Stage</button>
                <button class="btn-red" onclick="deleteProject(${p.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

function showAddProject() {
    document.getElementById('projectModalTitle').textContent = 'Add Project';
    document.getElementById('editProjectId').value = '';
    document.getElementById('prName').value = '';
    document.getElementById('prBudget').value = '';
    document.getElementById('prDeadline').value = '';
    document.getElementById('prStatus').value = 'Development';
    document.getElementById('prPaid').value = '0';
    document.getElementById('prDesc').value = '';
    const sel = document.getElementById('prClient');
    sel.innerHTML = '<option value="">Select Client</option>' + clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('projectModal').classList.add('active');
}

function editProject(id) {
    const p = getProject(id);
    if(!p) return;
    document.getElementById('projectModalTitle').textContent = 'Edit Project';
    document.getElementById('editProjectId').value = id;
    document.getElementById('prName').value = p.name;
    document.getElementById('prBudget').value = p.budget;
    document.getElementById('prDeadline').value = p.deadline;
    document.getElementById('prStatus').value = p.status;
    document.getElementById('prPaid').value = p.paid;
    document.getElementById('prDesc').value = p.desc || '';
    const sel = document.getElementById('prClient');
    sel.innerHTML = '<option value="">Select Client</option>' + clients.map(c=>`<option value="${c.id}" ${c.id===p.clientId?'selected':''}>${c.name}</option>`).join('');
    document.getElementById('projectModal').classList.add('active');
}

function saveProject(e) {
    e.preventDefault();
    const id = document.getElementById('editProjectId').value;
    const data = {
        name: document.getElementById('prName').value,
        clientId: Number(document.getElementById('prClient').value),
        budget: Number(document.getElementById('prBudget').value),
        deadline: document.getElementById('prDeadline').value,
        status: document.getElementById('prStatus').value,
        paid: Number(document.getElementById('prPaid').value),
        desc: document.getElementById('prDesc').value
    };
    if(id) {
        const idx = projects.findIndex(p=>p.id===Number(id));
        if(idx>=0) projects[idx] = {...projects[idx], ...data};
    } else {
        data.id = Date.now();
        projects.push(data);
    }
    save();
    closeModal('projectModal');
    renderProjects();
    toast(id ? 'Project updated!' : 'Project added!');
    return false;
}

function deleteProject(id) {
    if(!confirm('Delete this project?')) return;
    projects = projects.filter(p=>p.id!==id);
    save();
    renderProjects();
    toast('Project deleted');
}

function advanceStage(id) {
    const p = getProject(id);
    if(!p) return;
    const idx = stages.indexOf(p.status);
    if(idx < stages.length - 1) {
        p.status = stages[idx+1];
        save();
        renderProjects();
        toast('Stage updated to: ' + p.status);
    }
}

// INVOICES
function renderInvoices() {
    document.getElementById('invoicesList').innerHTML = invoices.map(inv => {
        const p = getProject(inv.projectId);
        const c = p ? getClient(p.clientId) : null;
        const total = inv.items.reduce((s,i)=>s+i.amount, 0);
        const paid = p ? p.paid : 0;
        const remaining = total - paid;
        return `<div class="invoice-card">
            <div class="invoice-header">
                <div>
                    <div class="invoice-id">Invoice #${inv.id}</div>
                    <div class="invoice-date">${inv.date} • ${p?p.name:'Unknown Project'}</div>
                </div>
                <div class="invoice-actions">
                    <button class="btn-sm" onclick="viewInvoice(${inv.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn-red" onclick="deleteInvoice(${inv.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="invoice-preview">
                <div style="text-align:center;margin-bottom:12px;font-size:1rem;font-weight:700;color:#fff">INVOICE</div>
                <div class="invoice-line"><span>Developer:</span><span>Yadneah</span></div>
                <div class="invoice-line"><span>Client:</span><span>${c?c.name:'Unknown'}</span></div>
                <div style="border-top:1px dashed var(--brd);margin:8px 0"></div>
                ${inv.items.map(i=>`<div class="invoice-line"><span>${i.name}</span><span>₹${i.amount.toLocaleString()}</span></div>`).join('')}
                <div class="invoice-line total"><span>TOTAL</span><span>₹${total.toLocaleString()}</span></div>
                <div class="invoice-line paid"><span>Paid</span><span>₹${paid.toLocaleString()}</span></div>
                <div class="invoice-line pending"><span>Remaining</span><span>₹${remaining.toLocaleString()}</span></div>
            </div>
        </div>`;
    }).join('');
}

function showAddInvoice() {
    const sel = document.getElementById('invProject');
    sel.innerHTML = '<option value="">Select Project</option>' + projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('invoiceItems').innerHTML = `
        <div class="invoice-item-row">
            <input type="text" placeholder="Service name" class="inv-item-name" required>
            <input type="number" placeholder="Amount" class="inv-item-amount" required>
            <button type="button" class="btn-red" onclick="removeInvItem(this)"><i class="fas fa-times"></i></button>
        </div>`;
    document.getElementById('invoiceModal').classList.add('active');
}

function addInvItem() {
    const row = document.createElement('div');
    row.className = 'invoice-item-row';
    row.innerHTML = `
        <input type="text" placeholder="Service name" class="inv-item-name" required>
        <input type="number" placeholder="Amount" class="inv-item-amount" required>
        <button type="button" class="btn-red" onclick="removeInvItem(this)"><i class="fas fa-times"></i></button>`;
    document.getElementById('invoiceItems').appendChild(row);
}

function removeInvItem(btn) {
    if(document.querySelectorAll('.invoice-item-row').length > 1) btn.parentElement.remove();
}

function saveInvoice(e) {
    e.preventDefault();
    const projectId = Number(document.getElementById('invProject').value);
    const names = document.querySelectorAll('.inv-item-name');
    const amounts = document.querySelectorAll('.inv-item-amount');
    const items = [];
    names.forEach((n,i) => { if(n.value && amounts[i].value) items.push({name:n.value, amount:Number(amounts[i].value)}); });
    if(items.length === 0) { toast('Add at least one item', 'error'); return false; }
    invoices.push({id: Date.now(), projectId, items, date: new Date().toISOString().split('T')[0]});
    save();
    closeModal('invoiceModal');
    renderInvoices();
    toast('Invoice created!');
    return false;
}

function viewInvoice(id) {
    const inv = invoices.find(i=>i.id===id);
    if(!inv) return;
    const p = getProject(inv.projectId);
    const c = p ? getClient(p.clientId) : null;
    const total = inv.items.reduce((s,i)=>s+i.amount, 0);
    const paid = p ? p.paid : 0;
    const remaining = total - paid;
    document.getElementById('invoiceViewContent').innerHTML = `
        <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:1.5rem;font-weight:800;color:#fff">INVOICE</div>
            <div style="font-size:.82rem;color:var(--dim)">#${inv.id} • ${inv.date}</div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:.88rem">
            <div><strong style="color:#fff">Developer:</strong> Yadneah</div>
            <div><strong style="color:#fff">Client:</strong> ${c?c.name:'Unknown'}</div>
        </div>
        <div style="border-top:1px dashed var(--brd);margin:12px 0"></div>
        ${inv.items.map(i=>`<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.88rem"><span>${i.name}</span><span style="color:var(--green)">₹${i.amount.toLocaleString()}</span></div>`).join('')}
        <div style="border-top:2px solid var(--brd);margin:12px 0;padding-top:12px;display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem"><span>TOTAL</span><span style="color:var(--green)">₹${total.toLocaleString()}</span></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:.88rem;color:var(--green)"><span>Paid</span><span>₹${paid.toLocaleString()}</span></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:.88rem;color:var(--red)"><span>Remaining</span><span>₹${remaining.toLocaleString()}</span></div>
        <div style="text-align:center;margin-top:20px;padding:12px;background:var(--glass);border-radius:10px;font-size:.82rem;color:var(--dim)">
            Payment: UPI / Google Pay<br>
            <span style="color:var(--green);font-weight:600">mahajanyadneah@upi</span>
        </div>`;
    document.getElementById('invoiceViewModal').classList.add('active');
}

function printInvoice() { window.print(); }

function deleteInvoice(id) {
    if(!confirm('Delete this invoice?')) return;
    invoices = invoices.filter(i=>i.id!==id);
    save();
    renderInvoices();
    toast('Invoice deleted');
}

// INCOME
function renderIncome() {
    const now = new Date();
    const monthPayments = payments.filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const yearPayments = payments.filter(p => new Date(p.date).getFullYear() === now.getFullYear());
    document.getElementById('monthIncome').textContent = '₹'+monthPayments.reduce((s,p)=>s+p.amount,0).toLocaleString();
    document.getElementById('yearIncome').textContent = '₹'+yearPayments.reduce((s,p)=>s+p.amount,0).toLocaleString();

    document.getElementById('paymentHistory').innerHTML = payments.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(p => {
        const c = getClient(p.clientId);
        const proj = getProject(p.projectId);
        return `<div class="dash-item">
            <div class="dash-item-icon" style="background:rgba(0,200,150,0.1);color:var(--green)"><i class="fas fa-rupee-sign"></i></div>
            <div class="dash-item-info">
                <div class="dash-item-name">₹${p.amount.toLocaleString()} from ${c?c.name:'Unknown'}</div>
                <div class="dash-item-sub">${proj?proj.name:'Unknown'} • ${p.date} • ${p.method}</div>
            </div>
        </div>`;
    }).join('');
}

// MODAL
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// INIT
function init() { renderDashboard(); }
init();
