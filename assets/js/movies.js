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

    const episodes = [];
    for (let i = 1; i <= episodeCount; i++) {
        episodes.push({
            number: i,
            title: `EP ${i}`,
            description: `Watch EP ${i} of ${movie.title}`
        });
    }
    return episodes;
}

function getEmbedUrl(type, id, season = 1, episode = 1) {
    if (type === 'tv') {
        return `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;
    }
    return `https://vidsrc.to/embed/movie/${id}`;
}

async function fetchTVShowEpisodes(tvId, seasonNumber = 1) {
    try {
        const response = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}`);
        const data = await response.json();
        return data.episodes || [];
    } catch (error) {
        console.error("Error fetching TV episodes:", error);
        return [];
    }
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
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                alert(`🎬 Playing ${movie.title || movie.name || "Untitled"} - EP ${item.dataset.episode}\n\n(This would play the specific EP of the movie in a real app!)`);
            });
        }

        const downloadBtn = item.querySelector('.episode-download-btn');
        if (downloadBtn) {
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

function showTrailerModal(trailerKey, title) {
    // Create trailer modal
    const trailerModal = document.createElement('div');
    trailerModal.className = 'trailer-modal';
    trailerModal.innerHTML = `
        <div class="trailer-modal-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="trailer-modal-content">
            <div class="trailer-modal-header">
                <h3>${title} - Official Trailer</h3>
                <button class="trailer-modal-close" onclick="this.closest('.trailer-modal').remove()">&times;</button>
            </div>
            <div class="trailer-modal-body">
                <iframe width="100%" height="400" src="https://www.youtube.com/embed/${trailerKey}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        </div>
    `;

    document.body.appendChild(trailerModal);
}

function createMovieCard(movie) {
    const card = document.createElement("div");
    card.className = "upcoming-card";

    const title = movie.title || "Untitled";
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
    const releaseDate = movie.release_date || "TBA";
    const year = releaseDate !== "TBA" ? releaseDate.split("-")[0] : "TBA";
    const runtime = movieDetails[movie.id]?.runtime || "N/A";

    const backdropUrl = movie.backdrop_path
        ? `${IMG_BASE}original${movie.backdrop_path}`
        : "https://via.placeholder.com/1920x1080/141414/fff?text=No+Image";

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
            <div class="upcoming-card-buttons">
                <button class="upcoming-card-trailer" data-movie-id="${movie.id}" data-title="${title}">
                    <i class="fas fa-play"></i>
                    Trailer
                </button>
                <button class="upcoming-card-button" data-movie-id="${movie.id}" data-backdrop="${backdropUrl}" data-title="${title}" data-description="${movie.overview || ''}" data-year="${year}" data-rating="${rating}" data-runtime="${runtime}">
                    <i class="fas fa-info-circle"></i>
                    More Info
                </button>
            </div>
        </div>
    `;

    // Click handler for More Info button
    card.querySelector(".upcoming-card-button").addEventListener("click", (e) => {
        const btn = e.currentTarget;
        const movieId = btn.dataset.movieId;
        const movie = movies.find(m => m.id == movieId);

        modalBackdrop.style.backgroundImage = `url('${btn.dataset.backdrop}')`;
        modalTitle.textContent = btn.dataset.title;
        modalDescription.textContent = btn.dataset.description || "No description available.";
        modalPlotText.textContent = btn.dataset.description || "Plot not available.";
        modalYear.textContent = btn.dataset.year;
        modalRating.innerHTML = `<i class="fas fa-star"></i> ${btn.dataset.rating}`;
        const runtimeText = btn.dataset.runtime !== "N/A" ? `${btn.dataset.runtime} min` : "N/A";
        modalRuntime.innerHTML = `<i class="fas fa-clock"></i> ${runtimeText}`;
        const language = movieDetails[movieId]?.original_language || "N/A";
        modalLanguage.innerHTML = language !== "N/A" ? `<i class="fas fa-globe"></i> ${language.toUpperCase()}` : "";

        // Generate and display episodes
        if (movie) {
            const isTV = !!movie.first_air_date;
            const type = isTV ? 'tv' : 'movie';
            let episodes = [];

            if (isTV) {
                episodes = await fetchTVShowEpisodes(movie.id, 1);
            } else {
                episodes = generateMovieEpisodes(movie);
            }

            modalEpisodes.innerHTML = `
                <h3><i class="fas fa-list"></i> ${isTV ? 'Episodes' : 'Movie Parts'}</h3>
                <div id="video-player-container" class="modal-video-section"></div>
                <div class="episodes-list">
                    ${episodes.map(ep => {
                const epNum = ep.episode_number || ep.number;
                const epTitle = ep.name || ep.title || `Episode ${epNum}`;
                return `
                            <div class="episode-item" data-episode="${epNum}">
                                <div class="episode-number">${epNum}</div>
                                <div class="episode-info">
                                    <div class="episode-title">${epTitle}</div>
                                </div>
                                <button class="episode-play-btn">
                                    <i class="fas fa-play"></i>
                                </button>
                            </div>
                        `;
            }).join('')}
                </div>
            `;

            // Add click handlers for episodes
            modalEpisodes.querySelectorAll('.episode-item').forEach(item => {
                item.addEventListener('click', () => {
                    const epNum = item.dataset.episode;
                    const backdropPlayer = document.getElementById('backdrop-player');
                    const embedUrl = getEmbedUrl(type, movie.id, 1, epNum);

                    if (backdropPlayer) {
                        backdropPlayer.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
                        backdropPlayer.classList.add('active');
                    }

                    document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
                });
            });

            // Load More handler
            const loadMoreEpsBtn = modalEpisodes.querySelector('.load-more-episodes');
            if (loadMoreEpsBtn) {
                loadMoreEpsBtn.addEventListener('click', () => {
                    showAllEpisodesModal(movie);
                });
            }

            // Fetch and display cast
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

            // Fetch and display recommendations
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

            // Fetch and display trailer
            const trailerKey = await fetchMovieTrailer(movie.id);
            if (trailerKey) {
                embedTrailer(trailerKey);
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

    // Click handler for Trailer button
    card.querySelector(".upcoming-card-trailer").addEventListener("click", async (e) => {
        e.stopPropagation(); // Prevent triggering the card click
        const btn = e.currentTarget;
        const movieId = btn.dataset.movieId;
        const title = btn.dataset.title;

        // Fetch trailer and show it
        const trailerKey = await fetchMovieTrailer(movieId);
        if (trailerKey) {
            showTrailerModal(trailerKey, title);
        } else {
            alert("Trailer not available for this movie.");
        }
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

// ====================== API CALLS ======================
async function fetchData(endpoint, page = 1) {
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
        endpoint = `/movie/popular?sort_by=${currentSort}&page=${page}`;
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

    // Show/hide load more button
    if (displayedCount >= movies.length) {
        loadMoreBtn.style.display = "none";
    } else {
        loadMoreBtn.style.display = "inline-flex";
    }
}

// Function to fetch and display all movies in a vertical layout
async function displayAllMovies() {
    const moviesGrid = document.getElementById("movies-grid");
    moviesGrid.innerHTML = ""; // Clear existing content

    try {
        const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&page=1`);
        const data = await response.json();
        const movies = data.results;

        movies.forEach(movie => {
            const movieItem = document.createElement("div");
            movieItem.className = "movie-item";
            movieItem.style.display = "flex";
            movieItem.style.flexDirection = "column";
            movieItem.style.marginBottom = "20px";

            movieItem.innerHTML = `
                <img src="${getImageUrl(movie.poster_path)}" alt="${movie.title}" style="width: 200px; height: auto;">
                <h3>${movie.title}</h3>
                <p>${movie.overview || "No description available."}</p>
                <p><strong>Rating:</strong> ${movie.vote_average.toFixed(1)}</p>
            `;

            moviesGrid.appendChild(movieItem);
        });
    } catch (error) {
        console.error("Error fetching movies:", error);
        moviesGrid.innerHTML = "<p>Failed to load movies. Please try again later.</p>";
    }
}

// Function to fetch and display Nollywood movies
async function displayNollywoodMovies() {
    const moviesGrid = document.getElementById("movies-grid");
    moviesGrid.innerHTML = ""; // Clear existing content

    try {
        const response = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=ig,yo,ha`);
        const data = await response.json();
        const movies = data.results;

        movies.forEach(movie => {
            const movieItem = document.createElement("div");
            movieItem.className = "movie-item";
            movieItem.style.display = "flex";
            movieItem.style.flexDirection = "column";
            movieItem.style.marginBottom = "20px";

            movieItem.innerHTML = `
                <img src="${getImageUrl(movie.poster_path)}" alt="${movie.title}" style="width: 200px; height: auto;">
                <h3>${movie.title}</h3>
                <p>${movie.overview || "No description available."}</p>
                <p><strong>Rating:</strong> ${movie.vote_average.toFixed(1)}</p>
            `;

            moviesGrid.appendChild(movieItem);
        });
    } catch (error) {
        console.error("Error fetching Nollywood movies:", error);
        moviesGrid.innerHTML = "<p>Failed to load Nollywood movies. Please try again later.</p>";
    }
}

// Call the function to display movies on page load
displayAllMovies();

// ====================== EVENT LISTENERS ======================
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
    if (currentPage < totalPages) {
        currentPage++;
        const endpoint = `/discover/movie?sort_by=${currentSort}&page=${currentPage}`;
        const data = await fetchData(endpoint);
        const newMovies = data.results;
        movies = [...movies, ...newMovies];
        newMovies.forEach(movie => {
            const movieCard = createMovieCard(movie);
            moviesGrid.appendChild(movieCard);
        });
    } else {
        alert("No more movies to load.");
    }
});

// Search functionality
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

// Add category filter functionality
const categorySelect = document.getElementById("category-select");
categorySelect.addEventListener("change", async (e) => {
    const selectedCategory = e.target.value;
    if (selectedCategory) {
        currentPage = 1; // Reset to the first page for the new category
        const endpoint = `/discover/movie?with_genres=${selectedCategory}&page=${currentPage}`;
        const data = await fetchData(endpoint);
        movies = data.results;
        totalPages = data.total_pages;
        moviesGrid.innerHTML = "";
        movies.forEach(movie => {
            const movieCard = createMovieCard(movie);
            moviesGrid.appendChild(movieCard);
        });
        categoryLoadMoreBtn.style.display = currentPage < totalPages ? "block" : "none";
    }
});

// Add 'Display More Movies' button functionality for category section
const categoryLoadMoreBtn = document.createElement("button");
categoryLoadMoreBtn.id = "category-load-more-btn";
categoryLoadMoreBtn.className = "btn-load-more";
categoryLoadMoreBtn.textContent = "Display More Movies";
categoryLoadMoreBtn.style.display = "none";
moviesGrid.parentElement.appendChild(categoryLoadMoreBtn);

categoryLoadMoreBtn.addEventListener("click", async () => {
    if (currentPage < totalPages) {
        currentPage++;
        const selectedCategory = categorySelect.value;
        const endpoint = `/discover/movie?with_genres=${selectedCategory}&page=${currentPage}`;
        const data = await fetchData(endpoint);
        const newMovies = data.results;
        movies = [...movies, ...newMovies];
        newMovies.forEach(movie => {
            const movieCard = createMovieCard(movie);
            moviesGrid.appendChild(movieCard);
        });
        categoryLoadMoreBtn.style.display = currentPage < totalPages ? "block" : "none";
    } else {
        categoryLoadMoreBtn.style.display = "none";
    }
});

// Example usage: Populate category dropdown dynamically
async function populateCategories() {
    const categoriesEndpoint = "/genre/movie/list";
    const data = await fetchData(categoriesEndpoint);
    const categories = data.genres || [];
    const categorySelect = document.getElementById("category-select");
    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

populateCategories();

// ====================== MODAL ======================
function initModal() {
    modalClose.addEventListener("click", () => {
        modal.style.display = "none";
        const backdropPlayer = document.getElementById('backdrop-player');
        if (backdropPlayer) {
            backdropPlayer.innerHTML = '';
            backdropPlayer.classList.remove('active');
        }
    });
    document.getElementById("modal-close-btn").addEventListener("click", () => {
        modal.style.display = "none";
        const backdropPlayer = document.getElementById('backdrop-player');
        if (backdropPlayer) {
            backdropPlayer.innerHTML = '';
            backdropPlayer.classList.remove('active');
        }
    });

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
        console.warn("%c⚠️  TMDB API KEY MISSING – replace in movies.js", "color:#ffd700; font-size:18px");
    }

    showSkeletons();
    await fetchMovies();
    displayMovies(0, LOAD_PER_PAGE);
    initModal();

    console.log("%c✅ Movies page loaded!", "color:#00d0ff; font-weight:700");
});
