let students = JSON.parse(localStorage.getItem("shub_students")) || [];
let currentPage = "dashboard";
let page = 1;
const perPage = 8;
let deleteId = null;

// ── Seed Data ────────────────────────────────────────────
if (!students.length) {
    students = [
        {id:101,name:"Rahul Sharma",email:"rahul@school.edu",phone:"+91 9876543210",roll:"BCA-2024-001",course:"BCA",year:"2nd",dob:"2003-05-15",status:"Active",address:"Mumbai, Maharashtra"},
        {id:102,name:"Aman Verma",email:"aman@school.edu",phone:"+91 9876543211",roll:"BTech-2023-042",course:"B.Tech",year:"3rd",dob:"2002-08-22",status:"Active",address:"Delhi, India"},
        {id:103,name:"Priya Patel",email:"priya@school.edu",phone:"+91 9876543212",roll:"BCA-2025-003",course:"BCA",year:"1st",dob:"2004-01-10",status:"Active",address:"Ahmedabad, Gujarat"},
        {id:104,name:"Sneha Reddy",email:"sneha@school.edu",phone:"+91 9876543213",roll:"BBA-2023-015",course:"BBA",year:"3rd",dob:"2002-11-05",status:"Active",address:"Hyderabad, Telangana"},
        {id:105,name:"Vikram Singh",email:"vikram@school.edu",phone:"+91 9876543214",roll:"BTech-2022-008",course:"B.Tech",year:"4th",dob:"2001-03-18",status:"Graduated",address:"Jaipur, Rajasthan"},
        {id:106,name:"Ananya Nair",email:"ananya@school.edu",phone:"+91 9876543215",roll:"BCA-2024-007",course:"BCA",year:"2nd",dob:"2003-07-25",status:"Active",address:"Kochi, Kerala"},
        {id:107,name:"Deepak Gupta",email:"deepak@school.edu",phone:"+91 9876543216",roll:"MCA-2025-001",course:"MCA",year:"1st",dob:"2001-12-30",status:"Active",address:"Lucknow, UP"},
        {id:108,name:"Kavya Iyer",email:"kavya@school.edu",phone:"+91 9876543217",roll:"BSc-2024-011",course:"B.Sc",year:"2nd",dob:"2003-09-12",status:"Active",address:"Chennai, Tamil Nadu"},
        {id:109,name:"Arjun Mehta",email:"arjun@school.edu",phone:"+91 9876543218",roll:"BTech-2023-033",course:"B.Tech",year:"3rd",dob:"2002-04-08",status:"Inactive",address:"Pune, Maharashtra"},
        {id:110,name:"Nisha Joshi",email:"nisha@school.edu",phone:"+91 9876543219",roll:"BCA-2025-012",course:"BCA",year:"1st",dob:"2004-06-20",status:"Active",address:"Indore, MP"},
        {id:111,name:"Rohan Das",email:"rohan@school.edu",phone:"+91 9876543220",roll:"BTech-2022-019",course:"B.Tech",year:"4th",dob:"2001-02-14",status:"Graduated",address:"Kolkata, West Bengal"},
        {id:112,name:"Simran Kaur",email:"simran@school.edu",phone:"+91 9876543221",roll:"BBA-2024-005",course:"BBA",year:"2nd",dob:"2003-10-03",status:"Active",address:"Chandigarh"},
        {id:113,name:"Aditya Rao",email:"aditya@school.edu",phone:"+91 9876543222",roll:"MTech-2025-002",course:"M.Tech",year:"1st",dob:"2000-08-17",status:"Active",address:"Bangalore, Karnataka"},
        {id:114,name:"Pooja Sinha",email:"pooja@school.edu",phone:"+91 9876543223",roll:"BCA-2023-021",course:"BCA",year:"3rd",dob:"2002-01-28",status:"Active",address:"Patna, Bihar"},
        {id:115,name:"Karan Malhotra",email:"karan@school.edu",phone:"+91 9876543224",roll:"BTech-2024-055",course:"B.Tech",year:"2nd",dob:"2003-11-11",status:"Active",address:"Noida, UP"},
    ];
    save();
}

function save() { localStorage.setItem("shub_students", JSON.stringify(students)); }

// ── Login ────────────────────────────────────────────────
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPass").value;
    if (email === "admin@school.edu" && pass === "admin123") {
        snd("ok");
        const lp = document.getElementById("loginPage");
        lp.style.transition = "opacity 0.5s, transform 0.5s";
        lp.style.opacity = "0";
        lp.style.transform = "scale(1.05)";
        setTimeout(() => {
            lp.classList.remove("active");
            lp.style.opacity = "";
            lp.style.transform = "";
            document.getElementById("appPage").classList.add("active");
            loadDashboard();
        }, 500);
    } else {
        snd("err");
        toast("Invalid credentials!", "error");
        const card = document.querySelector(".login-card");
        card.style.animation = "none";
        card.offsetHeight;
        card.style.animation = "shake 0.4s ease";
    }
    return false;
}

function handleLogout() {
    snd("ui");
    document.getElementById("appPage").classList.remove("active");
    const lp = document.getElementById("loginPage");
    lp.classList.add("active");
    lp.style.opacity = "0";
    lp.style.transform = "scale(0.95)";
    requestAnimationFrame(() => {
        lp.style.transition = "opacity 0.5s, transform 0.5s";
        lp.style.opacity = "1";
        lp.style.transform = "scale(1)";
    });
}

function togglePass() {
    const inp = document.getElementById("loginPass");
    inp.type = inp.type === "password" ? "text" : "password";
}

// ── Navigation ───────────────────────────────────────────
function showPage(p) {
    snd("ui");
    currentPage = p;
    document.querySelectorAll(".content-page").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"));
    const pg = document.getElementById("page-" + p);
    if (pg) pg.classList.add("active");
    const nl = document.querySelector(`.nav-link[data-page="${p}"]`);
    if (nl) nl.classList.add("active");

    if (p === "dashboard") loadDashboard();
    else if (p === "students") loadStudents();
    else if (p === "courses") loadCourses();
    else if (p === "addStudent") {
        document.getElementById("formTitle").textContent = "Add New Student";
        document.getElementById("formSubmitText").textContent = "Save Student";
        document.getElementById("studentForm").reset();
        document.getElementById("editId").value = "";
    }
}

function toggleSidebar() { document.getElementById("sidebar").classList.toggle("open"); }

// ── Dashboard ────────────────────────────────────────────
function loadDashboard() {
    setTimeout(() => {
        const total = students.length;
        const active = students.filter(s => s.status === "Active").length;
        const grad = students.filter(s => s.status === "Graduated").length;
        const inactive = students.filter(s => s.status === "Inactive").length;

        animateNum("totalStudents", total);
        animateNum("activeStudents", active);
        animateNum("graduatedStudents", grad);
        animateNum("inactiveStudents", inactive);

        document.getElementById("dashSkeleton").style.display = "none";
        renderTable(students.slice(0, 5), "recentTableBody", false);
    }, 600);
}

function animateNum(id, target) {
    const el = document.getElementById(id);
    let cur = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const iv = setInterval(() => {
        cur += step;
        if (cur >= target) { cur = target; clearInterval(iv); }
        el.textContent = cur;
    }, 25);
}

// ── Students List ────────────────────────────────────────
function loadStudents() {
    page = 1;
    applyFilters();
}

function applyFilters() {
    const course = document.getElementById("filterCourse").value;
    const year = document.getElementById("filterYear").value;
    const status = document.getElementById("filterStatus").value;
    const search = document.getElementById("globalSearch").value.toLowerCase();

    let filtered = students.filter(s => {
        if (course && s.course !== course) return false;
        if (year && s.year !== year) return false;
        if (status && s.status !== status) return false;
        if (search && !s.name.toLowerCase().includes(search) && !s.roll.toLowerCase().includes(search) && !s.email.toLowerCase().includes(search)) return false;
        return true;
    });

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const paged = filtered.slice(start, start + perPage);

    renderTable(paged, "studentsTableBody", true);
    document.getElementById("tableInfo").textContent = `Showing ${start + 1}-${Math.min(start + perPage, total)} of ${total}`;
    renderPagination(total);
}

function renderTable(data, tbodyId, showActions) {
    const tbody = document.getElementById(tbodyId);
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--dim)">No students found</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map((s, i) => `
        <tr style="animation:fadeSlide 0.3s ease ${i * 0.04}s both">
            <td style="color:var(--teal);font-weight:600">#${s.id}</td>
            <td style="font-weight:600;color:var(--silver-b)">${s.name}</td>
            ${showActions ? `<td style="color:var(--dim);font-size:0.8rem">${s.email}</td>` : ""}
            <td>${s.course}</td>
            <td>${s.year}</td>
            <td><span class="status-badge status-${s.status.toLowerCase()}">${s.status}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn view" title="View" onclick="viewStudent(${s.id})"><i class="fas fa-eye"></i></button>
                    ${showActions ? `
                    <button class="action-btn edit" title="Edit" onclick="editStudent(${s.id})"><i class="fas fa-pen"></i></button>
                    <button class="action-btn del" title="Delete" onclick="confirmDelete(${s.id})"><i class="fas fa-trash"></i></button>
                    ` : ""}
                </div>
            </td>
        </tr>
    `).join("");
}

function renderPagination(total) {
    const pages = Math.ceil(total / perPage);
    const el = document.getElementById("pagination");
    el.innerHTML = "";
    for (let i = 1; i <= pages; i++) {
        el.innerHTML += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    }
}

function goPage(p) { page = p; snd("ui"); applyFilters(); }

function handleSearch(val) {
    if (currentPage === "students") applyFilters();
}

// ── CRUD ─────────────────────────────────────────────────
function handleFormSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById("editId").value;
    const data = {
        name: document.getElementById("fName").value,
        email: document.getElementById("fEmail").value,
        phone: document.getElementById("fPhone").value,
        roll: document.getElementById("fRoll").value,
        course: document.getElementById("fCourse").value,
        year: document.getElementById("fYear").value,
        dob: document.getElementById("fDob").value,
        status: document.getElementById("fStatus").value,
        address: document.getElementById("fAddress").value,
    };

    if (editId) {
        const idx = students.findIndex(s => s.id == editId);
        if (idx > -1) { students[idx] = { ...students[idx], ...data }; }
        snd("ok");
        toast("Student updated successfully!", "success");
    } else {
        data.id = students.length ? Math.max(...students.map(s => s.id)) + 1 : 101;
        students.push(data);
        snd("ok");
        toast("Student added successfully!", "success");
    }
    save();
    showPage("students");
    return false;
}

function editStudent(id) {
    snd("ui");
    const s = students.find(st => st.id === id);
    if (!s) return;
    document.getElementById("formTitle").textContent = "Edit Student";
    document.getElementById("formSubmitText").textContent = "Update Student";
    document.getElementById("editId").value = s.id;
    document.getElementById("fName").value = s.name;
    document.getElementById("fEmail").value = s.email;
    document.getElementById("fPhone").value = s.phone;
    document.getElementById("fRoll").value = s.roll;
    document.getElementById("fCourse").value = s.course;
    document.getElementById("fYear").value = s.year;
    document.getElementById("fDob").value = s.dob || "";
    document.getElementById("fStatus").value = s.status;
    document.getElementById("fAddress").value = s.address || "";
    showPage("addStudent");
}

function confirmDelete(id) {
    snd("ui");
    deleteId = id;
    document.getElementById("deleteModal").classList.add("active");
    document.getElementById("confirmDelete").onclick = () => doDelete();
}

function doDelete() {
    students = students.filter(s => s.id !== deleteId);
    save();
    closeModal("deleteModal");
    snd("ok");
    toast("Student deleted!", "success");
    applyFilters();
}

function closeModal(id) { document.getElementById(id).classList.remove("active"); }

// ── Profile ──────────────────────────────────────────────
function viewStudent(id) {
    snd("ui");
    const s = students.find(st => st.id === id);
    if (!s) return;
    document.getElementById("profileAvatar").textContent = s.name.charAt(0);
    document.getElementById("profileName").textContent = s.name;
    document.getElementById("profileCourse").textContent = `${s.course} - ${s.year} Year`;
    const badge = document.getElementById("profileStatus");
    badge.textContent = s.status;
    badge.className = `status-badge status-${s.status.toLowerCase()}`;
    document.getElementById("profileEmail").textContent = s.email;
    document.getElementById("profilePhone").textContent = s.phone;
    document.getElementById("profileRoll").textContent = s.roll;
    document.getElementById("profileDob").textContent = s.dob || "-";
    document.getElementById("profileAddress").textContent = s.address || "-";

    // Random stats for demo
    const att = 75 + Math.floor(Math.random() * 20);
    const asgn = Math.floor(Math.random() * 4) + 6;
    const marks = 70 + Math.floor(Math.random() * 25);
    const rank = Math.floor(Math.random() * 10) + 1;
    document.getElementById("profileAttendance").textContent = att + "%";
    document.getElementById("profileAssignments").textContent = asgn + "/10";
    document.getElementById("profileMarks").textContent = marks + "%";
    document.getElementById("profileRank").textContent = "#" + rank;

    document.querySelectorAll(".mini-bar-fill").forEach((el, i) => {
        el.style.width = [att, asgn * 10, marks, 100 - rank * 10][i] + "%";
    });

    showPage("profile");
}

// ── Courses ──────────────────────────────────────────────
function loadCourses() {
    const counts = {};
    students.forEach(s => { counts[s.course] = (counts[s.course] || 0) + 1; });
    const map = { BCA: "courseBCA", "B.Tech": "courseBTech", BBA: "courseBBA", "B.Sc": "courseBSc", MCA: "courseMCA", "M.Tech": "courseMTech" };
    for (const [c, id] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.textContent = (counts[c] || 0) + " Students";
    }
}

// ── Toast ────────────────────────────────────────────────
function toast(msg, type = "info") {
    const c = document.getElementById("toastContainer");
    const icons = { success: "fa-check-circle", error: "fa-times-circle", info: "fa-info-circle" };
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
    c.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 3000);
}

// ── Sound ────────────────────────────────────────────────
function snd(n) {
    try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        g.gain.value = 0.03;
        o.type = "sine";
        if (n === "ok") {
            o.frequency.setValueAtTime(800, ac.currentTime);
            o.frequency.setValueAtTime(1200, ac.currentTime + 0.05);
            o.start(); setTimeout(() => ac.close(), 100);
        } else if (n === "ui") {
            o.frequency.value = 1000;
            o.start(); setTimeout(() => ac.close(), 30);
        } else if (n === "err") {
            o.frequency.value = 300;
            o.start(); setTimeout(() => ac.close(), 100);
        }
    } catch (e) {}
}

// ── 3D Tilt ──────────────────────────────────────────────
document.addEventListener("mousemove", e => {
    document.querySelectorAll("[data-tilt]").forEach(el => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        if (Math.abs(x) < 2 && Math.abs(y) < 2) {
            el.style.transform = `perspective(600px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-2px)`;
        }
    });
});
document.addEventListener("mouseleave", () => {
    document.querySelectorAll("[data-tilt]").forEach(el => { el.style.transform = ""; });
}, true);

// ── Init ─────────────────────────────────────────────────
document.getElementById("dashSkeleton").style.display = "block";
