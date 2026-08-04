const API_KEY = '4d8fb5b93d4af21d66a2948710284366';
const BASE = 'https://api.openweathermap.org/data/2.5';

let unit = 'celsius';
let favorites = JSON.parse(localStorage.getItem('wf_favorites')) || [];
let recentSearches = JSON.parse(localStorage.getItem('wf_recent')) || [];
let currentCity = null;

const weatherIcons = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
};

const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function convertTemp(k) {
    if (unit === 'celsius') return Math.round(k - 273.15);
    return Math.round((k - 273.15) * 9/5 + 32);
}

function getUnitSymbol() { return unit === 'celsius' ? '°C' : '°F'; }

function save() {
    localStorage.setItem('wf_favorites', JSON.stringify(favorites));
    localStorage.setItem('wf_recent', JSON.stringify(recentSearches));
}

function addRecent(city) {
    recentSearches = recentSearches.filter(c => c.toLowerCase() !== city.toLowerCase());
    recentSearches.unshift(city);
    recentSearches = recentSearches.slice(0, 5);
    save();
    renderRecent();
}

function renderRecent() {
    const el = document.getElementById('recentSearches');
    if (!recentSearches.length) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    el.innerHTML = recentSearches.map(c => `<span class="recent-tag" onclick="searchCity('${c}')">${c}</span>`).join('');
}

function renderFavorites() {
    const card = document.getElementById('favoritesCard');
    const list = document.getElementById('favoritesList');
    if (!favorites.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    list.innerHTML = favorites.map(c => `
        <div class="fav-city" onclick="searchCity('${c}')">
            <span>${c}</span>
            <span class="fav-remove" onclick="event.stopPropagation();removeFav('${c}')">✕</span>
        </div>
    `).join('');
}

function toggleFav() {
    if (!currentCity) return;
    const idx = favorites.indexOf(currentCity);
    if (idx > -1) favorites.splice(idx, 1);
    else favorites.push(currentCity);
    save();
    renderFavorites();
    document.getElementById('favBtn').textContent = favorites.includes(currentCity) ? '❤️' : '🤍';
}

function removeFav(city) {
    favorites = favorites.filter(c => c !== city);
    save();
    renderFavorites();
    if (currentCity) document.getElementById('favBtn').textContent = favorites.includes(currentCity) ? '❤️' : '🤍';
}

function showLoading() {
    document.getElementById('loadingScreen').style.display = 'block';
    document.getElementById('errorScreen').style.display = 'none';
    document.getElementById('weatherContent').style.display = 'none';
}

function showError(msg) {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('errorScreen').style.display = 'block';
    document.getElementById('errorScreen').classList.add('glitch');
    document.getElementById('weatherContent').style.display = 'none';
    document.getElementById('errorMessage').textContent = msg;
}

function showWeather() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('errorScreen').style.display = 'none';
    document.getElementById('weatherContent').style.display = 'block';
}

function getWeatherCondition(code) {
    if (code >= 200 && code < 300) return 'stormy';
    if (code >= 300 && code < 600) return 'rainy';
    if (code >= 600 && code < 700) return 'snowy';
    if (code >= 700 && code < 800) return 'cloudy';
    if (code === 800) return 'sunny';
    return 'cloudy';
}

function setBackground(condition) {
    const bg = document.getElementById('weatherBg');
    bg.className = 'weather-bg ' + condition;
    createRain(condition === 'rainy' || condition === 'stormy');
    createSnow(condition === 'snowy');
    if (condition === 'stormy') startThunder();
    else stopThunder();
}

function createRain(active) {
    const container = document.getElementById('rainContainer');
    container.innerHTML = '';
    if (!active) return;
    for (let i = 0; i < 100; i++) {
        const drop = document.createElement('div');
        drop.className = 'raindrop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.height = Math.random() * 20 + 10 + 'px';
        drop.style.animationDuration = Math.random() * 0.5 + 0.3 + 's';
        drop.style.animationDelay = Math.random() * 2 + 's';
        container.appendChild(drop);
    }
}

function createSnow(active) {
    const container = document.getElementById('snowContainer');
    container.innerHTML = '';
    if (!active) return;
    for (let i = 0; i < 50; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.textContent = '❄';
        flake.style.left = Math.random() * 100 + '%';
        flake.style.fontSize = Math.random() * 10 + 8 + 'px';
        flake.style.animationDuration = Math.random() * 5 + 5 + 's';
        flake.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(flake);
    }
}

let thunderInterval = null;
function startThunder() {
    stopThunder();
    thunderInterval = setInterval(() => {
        if (Math.random() > 0.7) {
            const flash = document.getElementById('thunderFlash');
            flash.classList.add('flash');
            setTimeout(() => flash.classList.remove('flash'), 100);
            setTimeout(() => { flash.classList.add('flash'); setTimeout(() => flash.classList.remove('flash'), 50); }, 200);
        }
    }, 3000);
}

function stopThunder() {
    if (thunderInterval) clearInterval(thunderInterval);
}

async function fetchWeather(city) {
    showLoading();
    try {
        const res = await fetch(`${BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}`);
        if (!res.ok) throw new Error('City not found');
        const data = await res.json();
        currentCity = data.name;
        addRecent(data.name);
        await renderWeather(data);
        showWeather();
        setBackground(getWeatherCondition(data.weather[0].id));
        document.getElementById('favBtn').textContent = favorites.includes(currentCity) ? '❤️' : '🤍';
        initParticles();
    } catch (e) {
        showError(e.message === 'City not found' ? 'City not found. Try another search.' : 'Failed to fetch weather data.');
    }
}

async function fetchWeatherByCoords(lat, lon) {
    showLoading();
    try {
        const res = await fetch(`${BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        if (!res.ok) throw new Error('Location not found');
        const data = await res.json();
        currentCity = data.name;
        addRecent(data.name);
        await renderWeather(data);
        showWeather();
        setBackground(getWeatherCondition(data.weather[0].id));
        document.getElementById('favBtn').textContent = favorites.includes(currentCity) ? '❤️' : '🤍';
        initParticles();
    } catch (e) {
        showError('Unable to fetch weather for your location.');
    }
}

async function renderWeather(data) {
    document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('dateTime').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.getElementById('weatherIconLarge').textContent = weatherIcons[data.weather[0].icon] || '🌤️';
    document.getElementById('tempValue').textContent = convertTemp(data.main.temp);
    document.getElementById('tempUnit').textContent = getUnitSymbol();
    document.getElementById('weatherDesc').textContent = data.weather[0].description;
    document.getElementById('feelsLike').textContent = `Feels like ${convertTemp(data.main.feels_like)}${getUnitSymbol()}`;
    document.getElementById('humidity').textContent = data.main.humidity + '%';
    document.getElementById('wind').textContent = Math.round(data.wind.speed * 3.6) + ' km/h';
    document.getElementById('pressure').textContent = data.main.pressure + ' hPa';
    document.getElementById('visibility').textContent = Math.round(data.visibility / 1000) + ' km';

    await renderHourly(data.coord.lat, data.coord.lon);
    await renderDaily(data.coord.lat, data.coord.lon);
}

async function renderHourly(lat, lon) {
    try {
        const res = await fetch(`${BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        if (!res.ok) return;
        const data = await res.json();
        const container = document.getElementById('hourlyForecast');
        const hourlyItems = data.list.slice(0, 12);
        container.innerHTML = createHourlyCarousel(hourlyItems);
    } catch (e) {}
}

async function renderDaily(lat, lon) {
    try {
        const res = await fetch(`${BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        if (!res.ok) return;
        const data = await res.json();
        const daily = {};
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000).toLocaleDateString('en-IN', { weekday: 'short' });
            if (!daily[date]) daily[date] = { temps: [], icons: [] };
            daily[date].temps.push(item.main.temp);
            daily[date].icons.push(item.weather[0].icon);
        });

        const container = document.getElementById('dailyForecast');
        const entries = Object.entries(daily).slice(0, 5);
        container.innerHTML = entries.map(([day, info]) => {
            const high = convertTemp(Math.max(...info.temps));
            const low = convertTemp(Math.min(...info.temps));
            const midIcon = info.icons[Math.floor(info.icons.length / 2)];
            return `<div class="daily-item">
                <span class="daily-day">${day}</span>
                <span class="daily-icon">${weatherIcons[midIcon] || '🌤️'}</span>
                <div class="daily-temps">
                    <span class="daily-high">${high}°</span>
                    <span class="daily-low">${low}°</span>
                </div>
            </div>`;
        }).join('');
    } catch (e) {}
}

function searchCity(city) {
    if (!city.trim()) return;
    fetchWeather(city.trim());
}

function useLocation() {
    if (!navigator.geolocation) { showError('Geolocation not supported.'); return; }
    showLoading();
    navigator.geolocation.getCurrentPosition(
        pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => showError('Unable to access your location.')
    );
}

// Particles
function initParticles() {
    const canvas = document.getElementById('weatherParticles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#00e89d', '#a855f7', '#00e5ff', '#ffb347'];
    const shapes = ['circle', 'triangle', 'diamond'];

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 8 + 3;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            this.opacity = Math.random() * 0.25 + 0.05;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.shape = shapes[Math.floor(Math.random() * shapes.length)];
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.015;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.rotation += this.rotSpeed;
            if (this.x < -20) this.x = canvas.width + 20;
            if (this.x > canvas.width + 20) this.x = -20;
            if (this.y < -20) this.y = canvas.height + 20;
            if (this.y > canvas.height + 20) this.y = -20;
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.globalAlpha = this.opacity;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (this.shape === 'circle') {
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            } else if (this.shape === 'triangle') {
                ctx.moveTo(0, -this.size);
                ctx.lineTo(this.size, this.size);
                ctx.lineTo(-this.size, this.size);
                ctx.closePath();
            } else {
                ctx.moveTo(0, -this.size);
                ctx.lineTo(this.size, 0);
                ctx.lineTo(0, this.size);
                ctx.lineTo(-this.size, 0);
                ctx.closePath();
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }
    for (let i = 0; i < 25; i++) particles.push(new Particle());
    function animate() { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(animate); }
    animate();
    window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
}

function init() {
    renderRecent();
    renderFavorites();

    document.getElementById('searchBtn').addEventListener('click', () => searchCity(document.getElementById('searchInput').value));
    document.getElementById('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') searchCity(e.target.value); });
    document.getElementById('locationBtn').addEventListener('click', useLocation);
    document.getElementById('favBtn').addEventListener('click', toggleFav);

    document.getElementById('unitToggle').addEventListener('click', () => {
        unit = unit === 'celsius' ? 'fahrenheit' : 'celsius';
        document.getElementById('unitToggle').textContent = unit === 'celsius' ? '°C' : '°F';
        if (currentCity) fetchWeather(currentCity);
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
    });

    // Auto-load with a default city
    fetchWeather('Mumbai');
}

document.addEventListener('DOMContentLoaded', init);

/* 3D Parallax Cloud Effect */
document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    document.querySelectorAll('[data-depth]').forEach(cloud => {
        const d = parseFloat(cloud.dataset.depth);
        cloud.style.transform = `translate(${x * d * 30}px, ${y * d * 15}px)`;
    });
    const sun = document.getElementById('sunEl');
    if (sun) sun.style.transform = `translateX(calc(-50% + ${x * 20}px))`;
});

/* Enhanced Hourly Carousel */
function createHourlyCarousel(items) {
    return items.map((h, i) => {
        const time = i === 0 ? 'NOW' : new Date(h.dt * 1000).toLocaleTimeString([], { hour: 'numeric' });
        const temp = convertTemp(h.main.temp);
        const icon = weatherIcons[h.weather[0].icon] || '❓';
        const desc = h.weather[0].description;
        const delay = i * 0.08;
        return `<div class="hourly-item${i === 0 ? ' now' : ''}" style="animation-delay:${delay}s">
            <div class="hourly-time">${time}</div>
            <div class="hourly-icon">${icon}</div>
            <div class="hourly-temp">${temp}${getUnitSymbol()}</div>
            <div class="hourly-desc">${desc}</div>
        </div>`;
    }).join('');
}

/* Glitch Effect on Error */
function showErrorGlitch(message) {
    const el = document.getElementById('mainWeather');
    el.innerHTML = `<div class="error-screen glitch">
        <div class="error-icon">🔍</div>
        <h2 style="margin:20px 0 10px;font-size:1.4rem">City Not Found</h2>
        <p style="opacity:.7;margin-bottom:20px">${message}</p>
        <button onclick="document.getElementById('searchInput').focus()" style="padding:12px 30px;background:var(--ac);border:none;border-radius:12px;color:#fff;font-weight:600;cursor:pointer;font-size:1rem">Try Again</button>
    </div>`;
    document.getElementById('weatherDesc').textContent = 'Search for a city';
    document.getElementById('weatherTemp').textContent = '--°C';
}
