const EXT_MAP = {
    Images: [".jpg",".jpeg",".png",".gif",".bmp",".svg",".webp",".ico",".tiff",".tif"],
    Documents: [".pdf",".doc",".docx",".txt",".xlsx",".xls",".pptx",".ppt",".csv",".rtf",".odt",".md"],
    Videos: [".mp4",".avi",".mkv",".mov",".wmv",".flv",".webm",".m4v",".mpg",".mpeg"],
    Audio: [".mp3",".wav",".flac",".aac",".ogg",".wma",".m4a",".opus"],
    Code: [".py",".js",".html",".css",".java",".cpp",".c",".ts",".jsx",".tsx",".json",".xml"],
    Archives: [".zip",".rar",".7z",".tar",".gz",".bz2",".xz"],
};

let categories = JSON.parse(localStorage.getItem("fo_cats")) || JSON.parse(JSON.stringify(EXT_MAP));
let recentFolders = JSON.parse(localStorage.getItem("fo_recent")) || [];
let scannedFiles = [];
let undoStack = [];

// ── Canvas Background ────────────────────────────────────
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");
let W, H, mx = 0, my = 0, particles = [], tick = 0, mouseSpeed = 0, lastMx = 0, lastMy = 0;

function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
window.addEventListener("resize", resize);
resize();

class Particle {
    constructor() {
        this.reset(true);
    }
    reset(init) {
        this.x = init ? Math.random() * W : -20;
        this.y = Math.random() * H;
        this.baseR = Math.random() * 2.2 + 0.6;
        this.r = this.baseR;
        this.vx = Math.random() * 1.4 + 0.3;
        this.baseVx = this.vx;
        this.vy = 0;
        this.waveAmp = Math.random() * 25 + 10;
        this.waveFreq = Math.random() * 0.012 + 0.004;
        this.waveOff = Math.random() * Math.PI * 2;
        this.gold = Math.random() < 0.35;
        this.hue = this.gold ? 40 + Math.random() * 10 : 30 + Math.random() * 20;
        this.sat = this.gold ? 60 : 30;
        this.light = this.gold ? 55 : 15;
        this.alpha = this.gold ? 0.7 + Math.random() * 0.3 : 0.2 + Math.random() * 0.2;
        this.trail = [];
    }
    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 6) this.trail.shift();

        this.x += this.vx;
        this.y += Math.sin(tick * this.waveFreq + this.waveOff) * 0.6;

        const dx = mx - this.x;
        const dy = my - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < 220 && d > 1) {
            const force = (220 - d) / 220;
            this.y += dy * force * 0.018;
            this.x += dx * force * 0.01;
            this.vx += force * 0.03;
            this.r = this.baseR * (1 + force * 0.5);
        } else {
            this.r += (this.baseR - this.r) * 0.1;
        }

        this.vx += (this.baseVx - this.vx) * 0.02;
        this.vx = Math.max(0.2, Math.min(this.vx, 3));
        if (this.x > W + 30) this.reset(false);
    }
    draw() {
        // Trail
        if (this.gold && this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = `hsla(${this.hue},${this.sat}%,${this.light}%,${this.alpha * 0.2})`;
            ctx.lineWidth = this.r * 0.5;
            ctx.stroke();
        }

        // Particle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue},${this.sat}%,${this.light}%,${this.alpha})`;
        ctx.fill();

        // Glow
        if (this.gold) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r * 3, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 3);
            grad.addColorStop(0, `hsla(${this.hue},${this.sat}%,${this.light}%,0.15)`);
            grad.addColorStop(1, `hsla(${this.hue},${this.sat}%,${this.light}%,0)`);
            ctx.fillStyle = grad;
            ctx.fill();
        }
    }
}

for (let i = 0; i < 45; i++) particles.push(new Particle());

// Connection lines
function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if (!a.gold) continue;
        for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j];
            if (!b.gold) continue;
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 150) {
                const alpha = (1 - d / 150) * 0.25;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                // Curved connection
                const mx2 = (a.x + b.x) / 2 + (a.y - b.y) * 0.1;
                const my2 = (a.y + b.y) / 2 + (b.x - a.x) * 0.1;
                ctx.quadraticCurveTo(mx2, my2, b.x, b.y);
                ctx.strokeStyle = `rgba(154,120,48,${alpha})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }
}

// Ambient glow
function drawGlow() {
    const gx = W * 0.15 + (mx / W) * W * 0.12;
    const gy = H * 0.25 + (my / H) * H * 0.1;

    for (let r = 0; r < 5; r++) {
        const sz = 60 + r * 55;
        const alpha = 0.08 - r * 0.015;
        ctx.beginPath();
        ctx.ellipse(gx, gy, sz, sz * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212,168,67,${Math.max(0, alpha)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Second glow following mouse more closely
    const gx2 = mx;
    const gy2 = my;
    const grad = ctx.createRadialGradient(gx2, gy2, 0, gx2, gy2, 120);
    grad.addColorStop(0, "rgba(212,168,67,0.04)");
    grad.addColorStop(1, "rgba(212,168,67,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(gx2 - 120, gy2 - 120, 240, 240);
}

function animBg() {
    ctx.clearRect(0, 0, W, H);
    tick++;

    // Track mouse speed
    mouseSpeed = Math.hypot(mx - lastMx, my - lastMy);
    lastMx = mx;
    lastMy = my;

    for (const p of particles) p.update();
    drawConnections();
    for (const p of particles) p.draw();
    drawGlow();

    requestAnimationFrame(animBg);
}
animBg();

document.addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; });

// ── 3D Card Tilt ─────────────────────────────────────────
document.querySelectorAll(".card, .stat-box").forEach(el => {
    el.addEventListener("mousemove", e => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-2px)`;
    });
    el.addEventListener("mouseleave", () => {
        el.style.transform = "";
    });
});

// ── Typewriter ───────────────────────────────────────────
const titleEl = document.getElementById("title");
const fullTitle = "SMART FILE ORGANIZER";
let ti = 0, deleting = false;

function typeTick() {
    if (!deleting) {
        ti++;
        titleEl.textContent = fullTitle.slice(0, ti);
        if (ti >= fullTitle.length) {
            setTimeout(() => { deleting = true; typeTick(); }, 2500);
            return;
        }
        setTimeout(typeTick, 65);
    } else {
        ti--;
        titleEl.textContent = fullTitle.slice(0, ti);
        if (ti <= 0) {
            deleting = false;
            setTimeout(typeTick, 600);
            return;
        }
        setTimeout(typeTick, 30);
    }
}
typeTick();

// ── Sound ────────────────────────────────────────────────
function snd(n) {
    try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        g.gain.value = 0.04;
        if (n === "ok") {
            o.type = "sine";
            o.frequency.setValueAtTime(800, ac.currentTime);
            o.frequency.setValueAtTime(1200, ac.currentTime + 0.05);
            o.frequency.setValueAtTime(1600, ac.currentTime + 0.1);
            o.start(); setTimeout(() => ac.close(), 150);
        } else if (n === "ui") {
            o.type = "sine";
            o.frequency.value = 1000;
            g.gain.value = 0.02;
            o.start(); setTimeout(() => ac.close(), 40);
        } else if (n === "err") {
            o.type = "sawtooth";
            o.frequency.value = 200;
            g.gain.value = 0.03;
            o.start(); setTimeout(() => ac.close(), 120);
        }
    } catch (e) {}
}

function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function logMsg(msg, tag = "info") {
    const scroll = document.getElementById("logScroll");
    const empty = scroll.querySelector(".log-empty");
    if (empty) empty.remove();
    const el = document.createElement("div");
    el.className = `log-entry ${tag}`;
    el.innerHTML = `<div class="log-dot"></div><div class="log-msg">${msg}</div>`;
    scroll.appendChild(el);
    scroll.scrollTop = scroll.scrollHeight;
}

function setStat(cat, val) {
    const el = document.getElementById("stat" + cat);
    if (!el) return;
    const cur = parseInt(el.textContent) || 0;
    if (cur === val) return;
    const step = val > cur ? 1 : -1;
    let c = cur;
    const iv = setInterval(() => {
        c += step;
        el.textContent = c;
        if (c === val) clearInterval(iv);
    }, 18);
}

function saveConfig() { localStorage.setItem("fo_cats", JSON.stringify(categories)); }
function saveRecent() { localStorage.setItem("fo_recent", JSON.stringify(recentFolders)); }

// ── File Input ───────────────────────────────────────────
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const folderPath = document.getElementById("folderPath");

browseBtn.addEventListener("click", () => { snd("ui"); fileInput.click(); });

fileInput.addEventListener("change", e => {
    const files = e.target.files;
    if (!files.length) return;
    const folder = files[0].webkitRelativePath.split("/")[0];
    folderPath.textContent = folder;
    addRecent(folder);
    scanFiles(files);
});

function addRecent(folder) {
    recentFolders = recentFolders.filter(f => f !== folder);
    recentFolders.unshift(folder);
    recentFolders = recentFolders.slice(0, 5);
    saveRecent();
    renderRecent();
}

function renderRecent() {
    const dd = document.getElementById("recentDropdown");
    if (!recentFolders.length) {
        dd.innerHTML = '<div class="recent-item disabled">No recent folders</div>';
        return;
    }
    dd.innerHTML = recentFolders.map(f =>
        `<div class="recent-item" onclick="selectRecent('${f.replace(/'/g, "\\'")}')">${f}</div>`
    ).join("");
}

function selectRecent(f) {
    snd("ui");
    folderPath.textContent = f + " (cached)";
    document.getElementById("recentDropdown").classList.remove("open");
}

// Recent Dropdown
const recentBtn = document.getElementById("recentBtn");
const recentDD = document.getElementById("recentDropdown");

recentBtn.addEventListener("click", e => {
    e.stopPropagation();
    snd("ui");
    recentDD.classList.toggle("open");
});
document.addEventListener("click", () => recentDD.classList.remove("open"));
renderRecent();

// ── Scan ─────────────────────────────────────────────────
function scanFiles(fileList) {
    scannedFiles = [];
    const stats = { Total: 0, Images: 0, Documents: 0, Videos: 0, Audio: 0, Code: 0, Other: 0 };

    for (const f of fileList) {
        const ext = "." + f.name.split(".").pop().toLowerCase();
        let cat = "Other";
        for (const [c, exts] of Object.entries(categories)) {
            if (exts.includes(ext)) { cat = c; break; }
        }
        stats[cat]++;
        stats.Total++;
        scannedFiles.push({ name: f.name, ext, cat, size: f.size });
    }

    for (const [cat, val] of Object.entries(stats)) setStat(cat, val);
    logMsg(`Scanned ${fileList.length} files`, "info");
}

// ── Organize ─────────────────────────────────────────────
const organizeBtn = document.getElementById("organizeBtn");
const undoBtn = document.getElementById("undoBtn");
const progressWrap = document.getElementById("progressWrap");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

organizeBtn.addEventListener("click", organize);

function organize() {
    if (!scannedFiles.length) { logMsg("No files to organize!", "err"); snd("err"); return; }

    snd("ok");
    organizeBtn.disabled = true;
    progressWrap.classList.add("show");
    undoStack = [];

    const total = scannedFiles.length;
    let moved = 0;

    logMsg(`Organizing ${total} files...`, "info");

    const files = [...scannedFiles];
    let i = 0;

    function next() {
        if (i >= files.length) { finish(moved); return; }
        const f = files[i];
        const pct = ((i + 1) / total * 100);
        progressFill.style.width = pct + "%";
        progressText.textContent = `${i + 1} / ${total} files`;

        const ts = timeNow();
        logMsg(`${ts}  ${f.name} → ${f.cat}`, "ok");
        undoStack.push(f);
        moved++;
        i++;
        setTimeout(next, 50 + Math.random() * 30);
    }
    next();
}

function finish(moved) {
    snd("ok");
    logMsg(`\nDone! Organized ${moved} files.`, "ok");
    organizeBtn.disabled = false;
    undoBtn.disabled = false;
    setTimeout(() => {
        progressWrap.classList.remove("show");
        progressFill.style.width = "0%";
    }, 2000);
}

// ── Undo ─────────────────────────────────────────────────
undoBtn.addEventListener("click", () => {
    if (!undoStack.length) return;
    snd("ui");
    const n = undoStack.length;
    for (const f of [...undoStack].reverse()) {
        logMsg(`${timeNow()}  Undid: ${f.name}`, "undo");
    }
    undoStack = [];
    undoBtn.disabled = true;
    logMsg(`\nRestored ${n} files.`, "undo");
});

// ── Export ────────────────────────────────────────────────
document.getElementById("exportBtn").addEventListener("click", () => {
    snd("ui");
    const entries = document.querySelectorAll(".log-msg");
    if (!entries.length) { logMsg("No log to export.", "err"); return; }
    let txt = "Smart File Organizer — Activity Log\n" + "=".repeat(50) + "\n\n";
    entries.forEach(e => txt += e.textContent + "\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "organizer_log.txt";
    a.click();
    snd("ok");
    logMsg("Log exported!", "info");
});

// ── Settings ─────────────────────────────────────────────
const settingsModal = document.getElementById("settingsModal");
const settingsList = document.getElementById("settingsList");

document.getElementById("settingsBtn").addEventListener("click", () => {
    snd("ui");
    settingsList.innerHTML = "";
    for (const [cat, exts] of Object.entries(categories)) {
        const row = document.createElement("div");
        row.className = "modal-row";
        row.innerHTML = `
            <div class="modal-cat">${cat}</div>
            <input class="modal-input" data-cat="${cat}" value="${exts.join(", ")}">
        `;
        settingsList.appendChild(row);
    }
    settingsModal.classList.add("active");
});

document.getElementById("saveSettings").addEventListener("click", () => {
    snd("ok");
    document.querySelectorAll(".modal-input").forEach(inp => {
        const cat = inp.dataset.cat;
        categories[cat] = inp.value.split(",").map(e => e.trim()).filter(Boolean);
    });
    saveConfig();
    settingsModal.classList.remove("active");
    logMsg("Settings saved", "info");
    if (fileInput.files.length) scanFiles(fileInput.files);
});

settingsModal.addEventListener("click", e => {
    if (e.target === settingsModal) settingsModal.classList.remove("active");
});

// ── Drag & Drop ──────────────────────────────────────────
const dropOverlay = document.getElementById("dropOverlay");
let dragCounter = 0;

document.addEventListener("dragenter", e => {
    e.preventDefault();
    dragCounter++;
    dropOverlay.classList.add("active");
});

document.addEventListener("dragleave", e => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; dropOverlay.classList.remove("active"); }
});

document.addEventListener("dragover", e => e.preventDefault());

document.addEventListener("drop", e => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.remove("active");

    const items = e.dataTransfer.items;
    if (!items) return;

    const entries = [];
    for (const item of items) {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) entries.push(entry);
    }

    function readEntries(dir, callback) {
        const reader = dir.createReader();
        const all = [];
        function readBatch() {
            reader.readEntries(batch => {
                if (batch.length === 0) { callback(all); return; }
                all.push(...batch);
                readBatch();
            });
        }
        readBatch();
    }

    function processEntry(entry, callback) {
        if (entry.isFile) {
            entry.file(f => callback([f]));
        } else if (entry.isDirectory) {
            readEntries(entry, subEntries => {
                let files = [];
                let pending = subEntries.length;
                if (pending === 0) { callback(files); return; }
                subEntries.forEach(se => processEntry(se, f => {
                    files.push(...f);
                    pending--;
                    if (pending === 0) callback(files);
                }));
            });
        }
    }

    let allFiles = [];
    let pending = entries.length;
    if (pending === 0) return;

    entries.forEach(entry => {
        processEntry(entry, files => {
            allFiles.push(...files);
            pending--;
            if (pending === 0 && allFiles.length) {
                const folderName = entries[0].name || "Dropped Folder";
                folderPath.textContent = folderName;
                addRecent(folderName);
                scanFiles(allFiles);
            }
        });
    });
});
