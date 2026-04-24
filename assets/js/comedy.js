// ====================== CONFIG ======================
const API_KEY = "3181431f6c4cfc12df118981955505c6";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/";
const POSTER_SIZE = "w342";

// ====================== DOM REFERENCES ======================
const moviesGrid = document.getElementById("movies-grid");
const sortSelect = document.getElementById("sort-select");
const loadMoreBtn = document.getElementById("load-more-btn");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");

const modal = document.getElementById("movie-modal");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalPlot = document.getElementById("modal-plot");
const modalPlotText = document.getElementById("modal-plot-text");
const modalYear = document.getElementById("modal-year");
const modalRating = document.getElementById("modal-rating");
const modalRuntime = document.getElementById("modal-runtime");
const modalLanguage = document.getElementById("modal-language");
const modalClose = document.querySelector(".modal-close");
const modalPlayBtn = document.getElementById("modal-play-btn");
const modalEpisodes = document.getElementById("modal-episodes");
const modalRecommendations = document.getElementById("modal-recommendations");
const trailerPlaceholder = document.querySelector('.trailer-placeholder');

// ====================== STATE ======================
let movies = [];
let movieDetails = {};
let displayedCount = 0;
let currentSort = "popularity.desc";
let currentPage = 1;
let totalPages = 1;
let currentQuery = "";
const LOAD_PER_PAGE = 18;

// ====================== HELPER FUNCTIONS ======================
function getImageUrl(path, size = POSTER_SIZE) {
    if (!path) return "https://via.placeholder.com/200x300/222/fff?text=No+Image";
    return `${IMG_BASE}${size}${path}`;
}

function generateMovieEpisodes(movie) {
    const runtime = movieDetails[movie.id]?.runtime || 120;
    const episodeCount = Math.max(3, Math.min(8, Math.floor(runtime / 20)));
    const episodeLength = Math.floor(runtime / episodeCount);
    const episodes = [];

    for (let i = 1; i <= episodeCount; i++) {
        episodes.push({
            number: i,
            title: `Part ${i}`,
            duration: `${episodeLength} min`,
            description: `Watch Part ${i} of ${movie.title}`
        });
    }
    return episodes;
}

function showAllEpisodesModal(movie, baseEpisodes) {
    const runtime = movieDetails[movie.id]?.runtime || 120;
    const baseEpisodeCount = Math.max(3, Math.min(8, Math.floor(runtime / 20)));
    const totalCount = baseEpisodeCount + 7;
    const episodeLength = Math.floor(runtime / baseEpisodeCount);

    const episodes = [];
    for (let i = 1; i <= totalCount; i++) {
        episodes.push({
            number: i,
            title: `EP ${i}`,
            duration: `${episodeLength} min`,
            description: `Watch EP ${i} of ${movie.title || movie.name}`
        });
    }

    const modalDiv = document.createElement('div');
    modalDiv.className = 'all-episodes-modal';
    
    modalDiv.innerHTML = `
        <div class="all-episodes-content">
            <div class="all-episodes-header">
                <h3><i class="fas fa-list"></i> All Episodes - ${movie.title || movie.name || "Untitled"}</h3>
                <button class="all-episodes-close">&times;</button>
            </div>
            <div class="all-episodes-list">
                ${episodes.map(episode => `
                    <div class="episode-item" data-episode="${episode.number}">
                        <div class="episode-number">${episode.number}</div>
                        <div class="episode-info">
                            <div class="episode-title">${episode.title}</div>
                            <div class="episode-meta">${episode.duration}</div>
                        </div>
                        <div class="episode-actions">
                            <button class="episode-download-btn" title="Download">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="episode-play-btn" title="Play">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    modalDiv.querySelector('.all-episodes-close').addEventListener('click', () => {
        modalDiv.remove();
    });

    modalDiv.addEventListener('click', (e) => {
        if (e.target === modalDiv) {
            modalDiv.remove();
        }
    });

    modalDiv.querySelectorAll('.episode-item').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('show-download');
        });

        const playBtn = item.querySelector('.episode-play-btn');
        if(playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                alert(`🎬 Playing ${movie.title || movie.name || "Untitled"} - EP ${item.dataset.episode}\n\n(This would play the specific EP of the movie in a real app!)`);
            });
        }

        const downloadBtn = item.querySelector('.episode-download-btn');
        if(downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                alert(`📥 Downloading ${movie.title || movie.name || "Untitled"} - EP ${item.dataset.episode}...`);
            });
        }
    });
}

async function fetchMovieCredits(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`);
        const data = await response.json();
        return data.cast || [];
    } catch (error) {
        console.error("Error fetching credits:", error);
        return [];
    }
}

async function fetchMovieRecommendations(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}/recommendations?api_key=${API_KEY}`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        return [];
    }
}

async function fetchMovieTrailer(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
        const data = await response.json();
        const trailer = data.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
        return trailer ? trailer.key : null;
    } catch (error) {
        console.error("Error fetching trailer:", error);
        return null;
    }
}

function createMovieCard(movie) {
    const card = document.createElement("div");
    card.className = "upcoming-card";
    const title = movie.title || "Untitled";
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
    const releaseDate = movie.release_date || "TBA";
    const year = releaseDate !== "TBA" ? releaseDate.split("-")[0] : "TBA";
    const runtime = movieDetails[movie.id]?.runtime || "N/A";
    const backdropUrl = movie.backdrop_path ? `${IMG_BASE}original${movie.backdrop_path}` : "https://via.placeholder.com/1920x1080/141414/fff?text=No+Image";

    card.innerHTML = `
        <img src="${getImageUrl(movie.poster_path)}" alt="${title}" class="upcoming-card-image">
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
            <p class="upcoming-card-description">${movie.overview || "No description available."}</p>
            <button class="upcoming-card-button" data-movie-id="${movie.id}" data-backdrop="${backdropUrl}" data-title="${title}" data-description="${movie.overview || ''}" data-year="${year}" data-rating="${rating}" data-runtime="${runtime}">
                <i class="fas fa-info-circle"></i>
                More Info
            </button>
        </div>
    `;

    card.querySelector(".upcoming-card-button").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        const movieId = btn.dataset.movieId;
        const movie = movies.find(m => m.id == movieId);
        const backdrop = btn.dataset.backdrop;

        modalBackdrop.style.backgroundImage = `url('${backdrop}')`;
        modalTitle.textContent = btn.dataset.title;
        modalDescription.textContent = btn.dataset.description || "No description available.";
        modalPlotText.textContent = btn.dataset.description || "Plot not available.";
        modalYear.textContent = btn.dataset.year;
        modalRating.innerHTML = `<i class="fas fa-star"></i> ${btn.dataset.rating}`;
        const runtimeText = btn.dataset.runtime !== "N/A" ? `${btn.dataset.runtime} min` : "N/A";
        modalRuntime.innerHTML = `<i class="fas fa-clock"></i> ${runtimeText}`;
        const language = movieDetails[movieId]?.original_language || "N/A";
        modalLanguage.innerHTML = language !== "N/A" ? `<i class="fas fa-globe"></i> ${language.toUpperCase()}` : "";

        if (movie) {
            const episodes = generateMovieEpisodes(movie);
            modalEpisodes.innerHTML = `
                <h3><i class="fas fa-list"></i> Movie Parts</h3>
                <div class="episodes-list">
                    ${episodes.map(episode => `
                        <div class="episode-item" data-episode="${episode.number}">
                            <div class="episode-number">${episode.number}</div>
                            <div class="episode-info">
                                <div class="episode-title">${episode.title}</div>
                                <div class="episode-meta">${episode.duration}</div>
                            </div>
                            <button class="episode-play-btn">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    `).join('')}
                    <div class="episode-item load-more-episodes" style="justify-content: center; background: rgba(0,208,255,0.1); border: 1px dashed rgba(0,208,255,0.4);">
                        <span style="color: #00d0ff; font-weight: bold; font-size: 15px;"><i class="fas fa-plus"></i> Load More</span>
                    </div>
                </div>
            `;

            modalEpisodes.querySelectorAll('.episode-play-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    alert(`🎬 Playing ${movie.title} - Part ${btn.closest('.episode-item').dataset.episode}\n\n(This would play the specific part of the movie in a real app!)`);
                });
            });

            const cast = await fetchMovieCredits(movie.id);
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

            const recommendations = await fetchMovieRecommendations(movie.id);
            if (recommendations.length > 0) {
                modalRecommendations.innerHTML = `
                    <h3><i class="fas fa-thumbs-up"></i> Recommended Movies</h3>
                    <div class="recommendations-list">
                        ${recommendations.slice(0, 10).map(rec => `
                            <div class="recommendation-item">
                                <img src="${getImageUrl(rec.poster_path)}" alt="${rec.title}" class="recommendation-poster">
                                <div class="recommendation-info">
                                    <div class="recommendation-title">${rec.title}</div>
                                    <div class="recommendation-meta">
                                        <span class="recommendation-year">${(rec.release_date || "").split("-")[0]}</span>
                                        <span class="recommendation-rating"><i class="fas fa-star"></i> ${rec.vote_average.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                modalRecommendations.innerHTML = `
                    <h3><i class="fas fa-thumbs-up"></i> Recommended Movies</h3>
                    <p style="color: #aaa; font-size: 14px;">No recommendations available.</p>
                `;
            }

            const trailerKey = await fetchMovieTrailer(movie.id);
            if (trailerKey) {
                trailerPlaceholder.style.backgroundImage = `url('${backdrop}')`;
                trailerPlaceholder.style.backgroundSize = 'cover';
                trailerPlaceholder.style.backgroundPosition = 'center';
                trailerPlaceholder.innerHTML = `
                    <div class="trailer-overlay">
                        <div class="youtube-play-btn" onclick="this.parentElement.style.display='none'; this.parentElement.nextElementSibling.style.display='block';">
                            <i class="fab fa-youtube"></i>
                        </div>
                    </div>
                    <iframe class="trailer-iframe" style="display:none;" width="100%" height="315" src="https://www.youtube.com/embed/${trailerKey}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                `;
            } else {
                trailerPlaceholder.style.backgroundImage = `url('${backdrop}')`;
                trailerPlaceholder.style.backgroundSize = 'cover';
                trailerPlaceholder.style.backgroundPosition = 'center';
                trailerPlaceholder.innerHTML = `
                    <div class="trailer-overlay">
                        <div class="play-circle">
                            <i class="fas fa-play"></i>
                        </div>
                        <p class="trailer-text">Official Trailer would play here (TMDB integration ready)</p>
                    </div>
                `;
            }
        }

        modal.style.display = "flex";
    });

    return card;
}

function showSkeletons(count = 12) {
    moviesGrid.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const skel = document.createElement("div");
        skel.className = "upcoming-card";
        skel.style.background = "linear-gradient(90deg, #222 25%, #333 50%, #222 75%)";
        skel.style.backgroundSize = "200% 100%";
        skel.style.animation = "pulse 1.5s infinite";
        skel.style.height = "400px";
        moviesGrid.appendChild(skel);
    }
}

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
        return await response.json();
    } catch (err) {
        console.error("Fetch error:", err);
        return { results: [] };
    }
}

async function fetchMovieDetails(movieId) {
    const data = await fetchData(`/movie/${movieId}`);
    if (data.runtime || data.original_language) {
        movieDetails[movieId] = {
            runtime: data.runtime,
            original_language: data.original_language
        };
    }
    return data;
}

async function fetchMovies(page = 1) {
    currentPage = page;
    let endpoint;

    if (currentQuery) {
        endpoint = `/search/movie?query=${encodeURIComponent(currentQuery)}&page=${page}`;
    } else {
        endpoint = `/discover/movie?with_genres=35&sort_by=${currentSort}&page=${page}`;
    }

    const data = await fetchData(endpoint);
    totalPages = data.total_pages || 1;

    if (data.results) {
        const results = data.results
            .filter(movie => movie.poster_path)
            .sort((a, b) => {
                if (currentSort.includes("popularity")) {
                    return b.popularity - a.popularity;
                } else if (currentSort.includes("release_date.desc")) {
                    return new Date(b.release_date || 0) - new Date(a.release_date || 0);
                } else if (currentSort.includes("release_date.asc")) {
                    return new Date(a.release_date || 0) - new Date(b.release_date || 0);
                } else if (currentSort.includes("vote_average")) {
                    return b.vote_average - a.vote_average;
                }
                return 0;
            });

        if (page === 1) {
            movies = results;
        } else {
            movies = movies.concat(results);
        }
    }
}

function displayMovies(startIdx = 0, endIdx = LOAD_PER_PAGE) {
    if (startIdx === 0) {
        moviesGrid.innerHTML = "";
    }

    for (let i = startIdx; i < Math.min(endIdx, movies.length); i++) {
        const card = createMovieCard(movies[i]);
        moviesGrid.appendChild(card);
    }

    displayedCount = Math.min(endIdx, movies.length);
    if (displayedCount >= movies.length) {
        loadMoreBtn.style.display = "none";
    } else {
        loadMoreBtn.style.display = "inline-flex";
    }
}

sortSelect.addEventListener("change", async (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    currentQuery = "";
    showSkeletons();
    movieDetails = {};
    await fetchMovies(1);
    displayMovies(0, LOAD_PER_PAGE);
});

loadMoreBtn.addEventListener("click", async () => {
    if (displayedCount >= movies.length && currentPage < totalPages) {
        currentPage += 1;
        await fetchMovies(currentPage);
    }
    displayMovies(displayedCount, displayedCount + LOAD_PER_PAGE);
});

let searchTimeout;
searchInput.addEventListener("input", async () => {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
        const query = searchInput.value.trim();

        if (query.length < 2) {
            currentQuery = "";
            currentPage = 1;
            movieDetails = {};
            await fetchMovies(1);
            displayMovies(0, LOAD_PER_PAGE);
            return;
        }

        currentQuery = query;
        currentPage = 1;
        showSkeletons();
        movieDetails = {};
        await fetchMovies(1);
        displayedCount = 0;
        displayMovies(0, LOAD_PER_PAGE);
    }, 420);
});

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

    currentQuery = query;
    currentPage = 1;
    showSkeletons();
    try {
        await fetchMovies(1);
        displayedCount = 0;
        displayMovies(0, LOAD_PER_PAGE);
    } catch (error) {
        console.error("Search failed:", error);
    }
});

function initModal() {
    modalClose.addEventListener("click", () => modal.style.display = "none");
    document.getElementById("modal-close-btn").addEventListener("click", () => modal.style.display = "none");

    modalPlayBtn.addEventListener("click", () => {
        modalPlayBtn.innerHTML = `
            <i class="fas fa-play"></i>
            NOW PLAYING...
        `;
        setTimeout(() => {
            alert("🎬 In a real app this would play the movie or trailer from TMDB/YouTube.\n\n(Everything else is fully functional!)");
            modalPlayBtn.innerHTML = `
                <i class="fas fa-play"></i>
                WATCH NOW
            `;
        }, 1200);
    });

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

document.addEventListener("DOMContentLoaded", async () => {
    if (API_KEY === "YOUR_TMDB_API_KEY") {
        console.warn("%c⚠️  TMDB API KEY MISSING – replace in comedy.js", "color:#ffd700; font-size:18px");
    }

    showSkeletons();
    await fetchMovies(1);
    displayMovies(0, LOAD_PER_PAGE);
    initModal();

    console.log("%c✅ Comedy page loaded!", "color:#00d0ff; font-weight:700");
});
