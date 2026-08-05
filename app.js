const GITHUB_USERNAME = 'letsearnit009';
const API_BASE = 'https://api.github.com';

const LANG_COLORS = {
    HTML: '#e34c26',
    CSS: '#563d7c',
    JavaScript: '#f1e05a',
    TypeScript: '#2b7489',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Shell: '#89e051',
    Dart: '#00B4AB',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Vue: '#41b883',
    'Jupyter Notebook': '#DA5B0B',
    default: '#6c5ce7'
};

const FALLBACK_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a1a25"/><text x="50" y="55" text-anchor="middle" fill="#6c5ce7" font-size="40" font-family="monospace">L</text></svg>`);

async function fetchGitHubProfile() {
    try {
        const res = await fetch(`${API_BASE}/users/${GITHUB_USERNAME}`);
        if (!res.ok) throw new Error('Failed to fetch profile');
        return await res.json();
    } catch (err) {
        console.error('Profile fetch error:', err);
        return null;
    }
}

async function fetchGitHubRepos() {
    try {
        const res = await fetch(`${API_BASE}/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`);
        if (!res.ok) throw new Error('Failed to fetch repos');
        return await res.json();
    } catch (err) {
        console.error('Repos fetch error:', err);
        return [];
    }
}

async function fetchAllLanguages(repos) {
    const langTotals = {};
    const repoLangPromises = repos.map(repo =>
        fetch(`${API_BASE}/repos/${GITHUB_USERNAME}/${repo.name}/languages`)
            .then(r => r.json())
            .catch(() => ({}))
    );
    const repoLangs = await Promise.all(repoLangPromises);
    repoLangs.forEach(langs => {
        Object.entries(langs).forEach(([lang, bytes]) => {
            langTotals[lang] = (langTotals[lang] || 0) + bytes;
        });
    });
    return langTotals;
}

function updateProfile(profile) {
    if (!profile) return;

    const avatar = document.getElementById('github-avatar');
    avatar.src = profile.avatar_url || FALLBACK_AVATAR;
    avatar.onerror = () => { avatar.src = FALLBACK_AVATAR; };

    if (profile.name) {
        document.getElementById('github-name').textContent = profile.name;
        document.querySelector('.tagline').textContent = `@${GITHUB_USERNAME}`;
    }

    if (profile.bio) {
        document.getElementById('github-bio').textContent = profile.bio;
    }

    document.getElementById('repo-count').textContent = profile.public_repos || 0;
    document.getElementById('follower-count').textContent = profile.followers || 0;
    document.getElementById('following-count').textContent = profile.following || 0;

    document.title = `${profile.name || GITHUB_USERNAME} | Portfolio`;
}

function renderRepos(repos) {
    const grid = document.getElementById('projects-grid');

    const featuredCards = grid.querySelectorAll('.featured');
    grid.innerHTML = '';
    featuredCards.forEach(card => grid.appendChild(card));

    const skipRepos = ['alfred-ai-assistant','portfolio','campus-store','student-expense-manager','smart-study-planner','student-portal','freelance-hub','weather-dashboard','smart-file-organizer'];
    const filtered = repos.filter(r => !skipRepos.includes(r.name));

    if (!filtered.length) return;

    const repoCards = filtered.map(repo => {
        const lang = repo.language || 'Unknown';
        const langColor = LANG_COLORS[lang] || LANG_COLORS.default;
        const desc = repo.description || 'No description provided.';

        return `
            <a href="${repo.html_url}" target="_blank" class="project-card">
                <div class="project-header">
                    <span class="project-name">${repo.name}</span>
                    <svg class="project-repo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M7 17L17 7M17 7H7M17 7V17"/>
                    </svg>
                </div>
                <p class="project-desc">${desc}</p>
                <div class="project-footer">
                    <span class="project-lang">
                        <span class="lang-dot" style="background:${langColor}"></span>
                        ${lang}
                    </span>
                    <div class="project-stats">
                        <span class="project-stat">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.782 1.4 8.17L12 19.896l-7.334 3.267 1.4-8.17L.132 9.211l8.2-1.193z"/></svg>
                            ${repo.stargazers_count}
                        </span>
                        <span class="project-stat">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M14 14V6a4 4 0 00-8 0v8"/></svg>
                            ${repo.forks_count}
                        </span>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    grid.insertAdjacentHTML('beforeend', repoCards);
}

function renderLanguages(langs) {
    const container = document.getElementById('languages-chart');
    const sorted = Object.entries(langs).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [, bytes]) => sum + bytes, 0);

    if (!sorted.length) {
        container.innerHTML = '<p style="color:var(--text-secondary)">No language data available.</p>';
        return;
    }

    container.innerHTML = sorted.map(([lang, bytes]) => {
        const pct = ((bytes / total) * 100).toFixed(1);
        const color = LANG_COLORS[lang] || LANG_COLORS.default;
        return `
            <div class="lang-item">
                <span class="lang-name">${lang}</span>
                <div class="lang-bar-bg">
                    <div class="lang-bar" style="width:${pct}%;background:${color}"></div>
                </div>
                <span class="lang-percent">${pct}%</span>
            </div>
        `;
    }).join('');
}

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

async function init() {
    setupSmoothScroll();

    const [profile, repos] = await Promise.all([
        fetchGitHubProfile(),
        fetchGitHubRepos()
    ]);

    updateProfile(profile);
    renderRepos(repos);

    const langs = await fetchAllLanguages(repos);
    renderLanguages(langs);
}

document.addEventListener('DOMContentLoaded', init);
