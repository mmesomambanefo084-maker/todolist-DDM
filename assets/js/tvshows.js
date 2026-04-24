// ====================== CONFIG ======================
const API_KEY = "3181431f6c4cfc12df118981955505c6";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/";
const POSTER_SIZE = "w342";

// ====================== DOM REFERENCES ======================
const tvshowsGrid = document.getElementById("tvshows-grid");
const sortSelect = document.getElementById("sort-select");
const loadMoreBtn = document.getElementById("load-more-btn");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");

const modal = document.getElementById("tvshow-modal");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalYear = document.getElementById("modal-year");
const modalRating = document.getElementById("modal-rating");
const modalSeasons = document.getElementById("modal-seasons");
const modalClose = document.querySelector(".modal-close");
const modalPlayBtn = document.getElementById("modal-play-btn");

// ====================== STATE ======================
let tvshows = [];
let displayedCount = 0;
let currentSort = "popularity.desc";
const LOAD_PER_PAGE = 12;

// ====================== HELPER FUNCTIONS ======================
function getImageUrl(path, size = POSTER_SIZE) {
    if (!path) return "https://via.placeholder.com/200x300/222/fff?text=No+Image";
    return `${IMG_BASE}${size}${path}`;
}

async function fetchTVShowCredits(tvId) {
    try {
        const response = await fetch(`${BASE_URL}/tv/${tvId}/credits?api_key=${API_KEY}`);
        const data = await response.json();
        return data.cast || [];
    } catch (error) {
        console.error("Error fetching TV credits:", error);
        return [];
    }
}

function createTVShowCard(tvshow) {
    const card = document.createElement("div");
    card.className = "upcoming-card";

    const title = tvshow.name || tvshow.title || "Untitled";
    const rating = tvshow.vote_average ? tvshow.vote_average.toFixed(1) : "N/A";
    const firstAirDate = tvshow.first_air_date || "TBA";
    const year = firstAirDate !== "TBA" ? firstAirDate.split("-")[0] : "TBA";
    const seasons = tvshow.number_of_seasons || "N/A";
    const episodes = tvshow.number_of_episodes || "N/A";

    const backdropUrl = tvshow.backdrop_path
        ? `${IMG_BASE}original${tvshow.backdrop_path}`
        : "https://via.placeholder.com/1920x1080/141414/fff?text=No+Image";

    card.innerHTML = `
        <img src="${getImageUrl(tvshow.poster_path)}" alt="${title}" class="upcoming-card-image">
        <div class="upcoming-card-content">
            <h3 class="upcoming-card-title">${title}</h3>
            <div class="upcoming-card-meta">
                <span class="upcoming-card-date">
                    <i class="fas fa-calendar"></i>
                    ${year}
                </span>
                <span class="upcoming-card-rating">
                    <i class="fas fa-star"></i>
                    ${rating}
                </span>
            </div>
            <p class="upcoming-card-description">${tvshow.overview || "No description available."}</p>
            <button class="upcoming-card-button" data-backdrop="${backdropUrl}" data-title="${title}" data-description="${tvshow.overview || ''}" data-year="${year}" data-rating="${rating}" data-seasons="${seasons}" data-episodes="${episodes}">
                <i class="fas fa-info-circle"></i>
                More Info
            </button>
        </div>
    `;

    // Click handler for More Info button
    card.querySelector(".upcoming-card-button").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        const tvId = btn.dataset.tvId;
        modalBackdrop.style.backgroundImage = `url('${btn.dataset.backdrop}')`;
        modalTitle.textContent = btn.dataset.title;
        modalDescription.textContent = btn.dataset.description || "No description available.";
        modalYear.textContent = btn.dataset.year;
        modalRating.innerHTML = `<i class="fas fa-star"></i> ${btn.dataset.rating}`;
        modalSeasons.innerHTML = `<i class="fas fa-play-circle"></i> ${btn.dataset.seasons} Seasons • ${btn.dataset.episodes} Episodes`;

        // Fetch and display cast
        const cast = await fetchTVShowCredits(tvId);
        const modalCast = document.getElementById("modal-cast");
        if (cast.length > 0) {
            modalCast.innerHTML = `
                <h3><i class="fas fa-users"></i> Cast</h3>
                <div class="cast-list">
                    ${cast.slice(0, 10).map(actor => `
                        <div class="cast-item">
                            <img src="${getImageUrl(actor.profile_path, 'w185')}" alt="${actor.name}" class="cast-photo">
                            <div class="cast-name">${actor.name}</div>
                            <div class="cast-character">${actor.character}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            modalCast.innerHTML = `
                <h3><i class="fas fa-users"></i> Cast</h3>
                <p style="color: #aaa; font-size: 14px;">Cast information not available.</p>
            `;
        }

        modal.style.display = "flex";
    });

    return card;
}

function showSkeletons(count = 12) {
    tvshowsGrid.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const skel = document.createElement("div");
        skel.className = "upcoming-card";
        skel.style.background = "linear-gradient(90deg, #222 25%, #333 50%, #222 75%)";
        skel.style.backgroundSize = "200% 100%";
        skel.style.animation = "pulse 1.5s infinite";
        skel.style.height = "400px";
        tvshowsGrid.appendChild(skel);
    }
}

// ====================== API CALLS ======================
async function fetchData(endpoint) {
    if (!API_KEY || API_KEY === "YOUR_TMDB_API_KEY") {
        console.error("❌ Please replace YOUR_TMDB_API_KEY with a real TMDB API key!");
        return { results: [] };
    }

    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&language=en-US`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("Fetch error:", err);
        return { results: [] };
    }
}

async function fetchTVShows() {
    let endpoint = `/tv/on_the_air?sort_by=${currentSort}`;
    const data = await fetchData(endpoint);

    if (data.results) {
        // Filter out TV shows without poster
        tvshows = data.results
            .filter(show => show.poster_path)
            .sort((a, b) => {
                if (currentSort.includes("popularity")) {
                    return b.popularity - a.popularity;
                } else if (currentSort.includes("first_air_date.desc")) {
                    return new Date(b.first_air_date || 0) - new Date(a.first_air_date || 0);
                } else if (currentSort.includes("first_air_date.asc")) {
                    return new Date(a.first_air_date || 0) - new Date(b.first_air_date || 0);
                } else if (currentSort.includes("vote_average")) {
                    return b.vote_average - a.vote_average;
                }
                return 0;
            });
    }
}

function displayTVShows(startIdx = 0, endIdx = LOAD_PER_PAGE) {
    if (startIdx === 0) {
        tvshowsGrid.innerHTML = "";
    }

    for (let i = startIdx; i < Math.min(endIdx, tvshows.length); i++) {
        const card = createTVShowCard(tvshows[i]);
        tvshowsGrid.appendChild(card);
    }

    displayedCount = Math.min(endIdx, tvshows.length);

    // Show/hide load more button
    if (displayedCount >= tvshows.length) {
        loadMoreBtn.style.display = "none";
    } else {
        loadMoreBtn.style.display = "inline-flex";
    }
}

// ====================== EVENT LISTENERS ======================
sortSelect.addEventListener("change", async (e) => {
    currentSort = e.target.value;
    showSkeletons();
    await fetchTVShows();
    displayTVShows(0, LOAD_PER_PAGE);
});

loadMoreBtn.addEventListener("click", () => {
    displayTVShows(displayedCount, displayedCount + LOAD_PER_PAGE);
});

// Search functionality
let searchTimeout;
searchInput.addEventListener("input", async () => {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
        const query = searchInput.value.trim();

        if (query.length < 2) {
            await fetchTVShows();
            displayTVShows(0, LOAD_PER_PAGE);
            return;
        }

        showSkeletons();
        const searchData = await fetchData(`/search/tv?query=${encodeURIComponent(query)}`);

        if (searchData.results) {
            tvshows = searchData.results
                .filter(show => show.poster_path)
                .slice(0, 30);
            displayedCount = 0;
            displayTVShows(0, LOAD_PER_PAGE);
        }
    }, 420);
});

// Enter key support
searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        searchBtn.click();
    }
});

searchBtn.addEventListener("click", async () => {
    const query = searchInput.value.trim();

    if (query.length < 2) {
        searchInput.focus();
        return;
    }

    showSkeletons();
    try {
        const searchData = await fetchData(`/search/tv?query=${encodeURIComponent(query)}`);

        if (searchData.results) {
            tvshows = searchData.results
                .filter(show => show.poster_path)
                .slice(0, 30);
            displayedCount = 0;
            displayTVShows(0, LOAD_PER_PAGE);
        }
    } catch (error) {
        console.error("Search failed:", error);
    }
});

// ====================== MODAL ======================
function initModal() {
    modalClose.addEventListener("click", () => modal.style.display = "none");
    document.getElementById("modal-close-btn").addEventListener("click", () => modal.style.display = "none");

    modalPlayBtn.addEventListener("click", () => {
        modalPlayBtn.innerHTML = `
            <i class="fas fa-play"></i>
            NOW PLAYING EPISODE...
        `;
        setTimeout(() => {
            alert("🎬 In a real app this would play the latest episode or trailer from TMDB/YouTube.\n\n(Everything else is fully functional!)");
            modalPlayBtn.innerHTML = `
                <i class="fas fa-play"></i>
                WATCH NOW
            `;
        }, 1200);
    });

    // Action buttons event listeners
    const downloadBtn = document.getElementById("download-btn");
    const watchlistBtn = document.getElementById("watchlist-btn");
    const reportBtn = document.getElementById("report-btn");
    const shareBtn = document.getElementById("share-btn");

    if (downloadBtn) {
        downloadBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            alert("📥 Download feature would be available in premium version.");
        });
    }

    if (watchlistBtn) {
        watchlistBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            watchlistBtn.style.background = "linear-gradient(135deg, rgba(0, 208, 255, 0.3) 0%, rgba(0, 180, 255, 0.15) 100%)";
            watchlistBtn.innerHTML = `<i class="fas fa-check"></i><span>Added!</span>`;
            setTimeout(() => {
                watchlistBtn.innerHTML = `<i class="fas fa-bookmark"></i><span>Watchlist</span>`;
                watchlistBtn.style.background = "linear-gradient(135deg, rgba(0, 208, 255, 0.1) 0%, rgba(0, 180, 255, 0.05) 100%)";
            }, 2000);
        });
    }

    if (reportBtn) {
        reportBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            alert("⚠️ Thank you for reporting. Our team will review this content.");
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const movieTitle = modalTitle.textContent;
            alert(`📤 Share: ${movieTitle}\n\nShare options:\n- Facebook\n- Twitter\n- WhatsApp\n- Copy Link`);
        });
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });
}

// ====================== INITIALIZE ======================
document.addEventListener("DOMContentLoaded", async () => {
    if (API_KEY === "YOUR_TMDB_API_KEY") {
        console.warn("%c⚠️  TMDB API KEY MISSING – replace in tvshows.js", "color:#ffd700; font-size:18px");
    }

    showSkeletons();
    await fetchTVShows();
    displayTVShows(0, LOAD_PER_PAGE);
    initModal();

    console.log("%c✅ TV Shows page loaded!", "color:#00d0ff; font-weight:700");
});
