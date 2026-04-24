// script.js
// ====================== CONFIG ======================
const API_KEY = "3181431f6c4cfc12df118981955505c6"; // ← Replace with your actual TMDB API key
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/";
const BACKDROP_SIZE = "original";
const POSTER_SIZE = "w342";

// ====================== DOM REFERENCES ======================
const hero = document.getElementById("hero");
const heroTitle = document.getElementById("hero-title");
const heroDescription = document.getElementById("hero-description");
const heroRating = document.getElementById("hero-rating");
const heroYear = document.getElementById("hero-year");
const heroType = document.getElementById("hero-type");

const discoverTitle = document.getElementById("discover-title");
const discoverRow = document.getElementById("discover-row");
const topRatedRow = document.getElementById("top-rated-row");
const upcomingRow = document.getElementById("upcoming-row");
const koreanDramasRow = document.getElementById("korean-dramas-row");
const indianMoviesRow = document.getElementById("indian-movies-row");
const nigerianMoviesRow = document.getElementById("nigerian-movies-row");
const asianMoviesRow = document.getElementById("asian-movies-row");

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

// ====================== CAROUSEL STATE ======================
let carouselMovies = [];
let currentCarouselIndex = 0;
let carouselAutoPlayInterval;

// ====================== PAGINATION STATE ======================
const paginationState = {
    discover: { page: 1, endpoint: "/trending/movie/week", isLoading: false, hasMore: true },
    topRated: { page: 1, endpoint: "/discover/movie?sort_by=release_date.asc&vote_count.gte=100", isLoading: false, hasMore: true },
    upcoming: { page: 1, endpoint: "/movie/upcoming", isLoading: false, hasMore: true },
    koreanDramas: { page: 1, endpoint: "/discover/tv?with_original_language=ko&sort_by=popularity.desc", isLoading: false, hasMore: true },
    indianMovies: { page: 1, endpoint: "/discover/movie?with_original_language=hi&sort_by=popularity.desc", isLoading: false, hasMore: true },
    nigerianMovies: { page: 1, endpoint: "/discover/movie?with_origin_country=NG&sort_by=popularity.desc", isLoading: false, hasMore: true },
    asianMovies: { page: 1, endpoint: "/discover/movie?with_origin_country=KR|JP|CN|TH&sort_by=popularity.desc", isLoading: false, hasMore: true }
};

// ====================== HELPER FUNCTIONS ======================
function getImageUrl(path, size = POSTER_SIZE) {
    if (!path) return "https://via.placeholder.com/342x510/222/fff?text=No+Image";
    return `${IMG_BASE}${size}${path}`;
}

function generateMovieEpisodes(movie) {
    const runtime = movie.runtime || 120;
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

async function fetchMovieDetails(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching movie details:", error);
        return {};
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
    card.className = "movie-card";

    const title = movie.title || movie.name || "Untitled";
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";

    // Format release date
    let formattedDate = "Release date not available";
    const rawDate = movie.release_date || movie.first_air_date;
    if (rawDate) {
        const dateObj = new Date(rawDate);
        if (!isNaN(dateObj)) {
            // e.g. "23 Apr 2026"
            formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } else {
            formattedDate = rawDate;
        }
    }

    card.innerHTML = `
        <img src="${getImageUrl(movie.poster_path)}" alt="${title}">
        <div class="card-info">
            <h3>${title}</h3>
            <p class="release-date" style="font-size: 0.85rem; color: #aaa; margin: 4px 0;">${formattedDate}</p>
            <p class="rating"><i class="fas fa-star"></i> ${rating}</p>
        </div>
    `;

    // Click card → open modal with details
    card.addEventListener("click", async () => {
        const backdrop = movie.backdrop_path ? `${IMG_BASE}original${movie.backdrop_path}` : '';
        modalBackdrop.style.backgroundImage = backdrop ? `url('${backdrop}')` : '';
        modalTitle.textContent = title;
        modalDescription.textContent = "";
        modalYear.textContent = (movie.release_date || "2026").split("-")[0];
        modalRating.innerHTML = `<i class="fas fa-star"></i> ${rating}`;

        // Fetch additional details
        const details = await fetchMovieDetails(movie.id);
        if (modalRuntime) modalRuntime.innerHTML = details.runtime ? `<i class="fas fa-clock"></i> ${details.runtime} min` : '';
        if (modalLanguage) modalLanguage.innerHTML = details.original_language ? `<i class="fas fa-globe"></i> ${details.original_language.toUpperCase()}` : '';
        if (modalPlotText) modalPlotText.textContent = details.overview || movie.overview || "Plot unavailable.";

        // Generate and display episodes
        const isTV = !!movie.first_air_date;
        const type = isTV ? 'tv' : 'movie';
        let episodes = [];

        if (isTV) {
            episodes = await fetchTVShowEpisodes(movie.id, 1);
            // Limit to 20 episodes for UI performance if needed, or keep all
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

        // Add click handlers for episode play buttons
        modalEpisodes.querySelectorAll('.episode-item').forEach(item => {
            item.addEventListener('click', () => {
                const epNum = item.dataset.episode;
                const backdropPlayer = document.getElementById('backdrop-player');
                const embedUrl = getEmbedUrl(type, movie.id, 1, epNum);

                if (backdropPlayer) {
                    backdropPlayer.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
                    backdropPlayer.classList.add('active');
                }

                // Still scroll to top of modal to see the video
                document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

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

        modal.style.display = "flex";
    });

    return card;
}

function showSkeletons(container, count = 8) {
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const skel = document.createElement("div");
        skel.className = "skeleton";
        container.appendChild(skel);
    }
}

// ====================== CAROUSEL MANAGEMENT ======================
function createCarouselSlides(movies) {
    carouselMovies = movies.filter(m => m.backdrop_path && m.title);
    const wrapper = document.querySelector(".carousel-wrapper");
    const indicatorsContainer = document.getElementById("carousel-indicators");

    // Clear existing slides
    wrapper.innerHTML = "";
    indicatorsContainer.innerHTML = "";

    if (carouselMovies.length === 0) {
        console.error("No movies with backdrop available");
        return;
    }

    // Create slides
    carouselMovies.forEach((movie, index) => {
        const slide = document.createElement("div");
        slide.className = `carousel-slide ${index === 0 ? "active" : ""}`;
        slide.id = `carousel-slide-${index}`;
        slide.innerHTML = `
            <div class="hero-background" style="background-image: url('${IMG_BASE}${BACKDROP_SIZE}${movie.backdrop_path}')"></div>
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <div class="hero-badge">${["TRENDING #1", "NEW RELEASE", "TOP PICK", "STAFF FAVORITE"][Math.floor(Math.random() * 4)]}</div>
                <h1 class="hero-title">${movie.title || movie.name}</h1>
                <div class="hero-meta">
                    <span class="hero-year">${(movie.release_date || "2026").split("-")[0]}</span>
                    <span class="hero-rating"><i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)}</span>
                </div>
                <p class="hero-description">${(movie.overview || "No description available.").substring(0, 220)}...</p>
                <div class="hero-buttons">
                    <button class="btn-play">
                        <i class="fas fa-play"></i>
                        PLAY
                    </button>
                    <button class="btn-info">
                        <i class="fas fa-circle-info"></i> More Info
                    </button>
                </div>
            </div>
        `;

        wrapper.appendChild(slide);

        // Create indicator
        const indicator = document.createElement("button");
        indicator.className = `carousel-indicator ${index === 0 ? "active" : ""}`;
        indicator.setAttribute("data-index", index);
        indicator.addEventListener("click", () => {
            goToSlide(index);
            resetAutoPlay();
        });
        indicatorsContainer.appendChild(indicator);
    });

    currentCarouselIndex = 0;
    startAutoPlay();
}

function goToSlide(index) {
    if (index < 0 || index >= carouselMovies.length) return;

    // Update slides
    document.querySelectorAll(".carousel-slide").forEach((slide, i) => {
        slide.classList.toggle("active", i === index);
    });

    // Update indicators
    document.querySelectorAll(".carousel-indicator").forEach((indicator, i) => {
        indicator.classList.toggle("active", i === index);
    });

    currentCarouselIndex = index;
}

function nextSlide() {
    goToSlide((currentCarouselIndex + 1) % carouselMovies.length);
}

function prevSlide() {
    goToSlide((currentCarouselIndex - 1 + carouselMovies.length) % carouselMovies.length);
}

function startAutoPlay() {
    carouselAutoPlayInterval = setInterval(nextSlide, 6000);
}

function resetAutoPlay() {
    clearInterval(carouselAutoPlayInterval);
    startAutoPlay();
}

function initCarouselControls() {
    const prevBtn = document.getElementById("carousel-prev");
    const nextBtn = document.getElementById("carousel-next");

    if (prevBtn) prevBtn.addEventListener("click", () => {
        prevSlide();
        resetAutoPlay();
    });

    if (nextBtn) nextBtn.addEventListener("click", () => {
        nextSlide();
        resetAutoPlay();
    });
}

// ====================== API CALLS ======================
async function fetchData(endpoint, page = 1) {
    if (!API_KEY || API_KEY === "YOUR_TMDB_API_KEY") {
        console.error("❌ Please replace YOUR_TMDB_API_KEY with a real TMDB API key!");
        return { results: [] };
    }

    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&language=en-US&page=${page}`;
        console.log("Fetching:", url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("Fetch error:", err);
        return { results: [] };
    }
}

async function fetchByGenre(genreId, page = 1) {
    let endpoint = `/discover/movie?sort_by=popularity.desc`;
    if (genreId) endpoint += `&with_genres=${genreId}`;
    return await fetchData(endpoint, page);
}

// Reusable functions for Language and Region
async function fetchMoviesByLanguage(language, isTv = false, page = 1) {
    const type = isTv ? 'tv' : 'movie';
    const endpoint = `/discover/${type}?with_original_language=${language}&sort_by=popularity.desc`;
    return await fetchData(endpoint, page);
}

async function fetchMoviesByRegion(regionCodes, page = 1) {
    const endpoint = `/discover/movie?with_origin_country=${regionCodes}&sort_by=popularity.desc`;
    return await fetchData(endpoint, page);
}

async function fetchSearch(query, page = 1) {
    return await fetchData(`/search/movie?query=${encodeURIComponent(query)}`, page);
}

// ====================== POPULATE ROWS ======================
function populateRow(container, movies, append = false) {
    if (!append) container.innerHTML = "";
    if (!movies || movies.length === 0) {
        if (!append) {
            const empty = document.createElement("div");
            empty.style.color = "#666";
            empty.style.padding = "40px";
            empty.textContent = "No results found.";
            container.appendChild(empty);
        }
        return;
    }
    movies.forEach(movie => {
        const card = createMovieCard(movie);
        container.appendChild(card);
    });
}

function showLoader(container) {
    const loader = document.createElement("div");
    loader.className = "loader-container";
    loader.innerHTML = '<div class="loader-spinner"></div>';
    container.appendChild(loader);
}

function removeLoader(container) {
    const loader = container.querySelector(".loader-container");
    if (loader) loader.remove();
}

function setupInfiniteScroll(container, stateKey) {
    // Check if it's the discoverRow (which we want to scroll vertically on the page)
    if (container === discoverRow) {
        window.addEventListener('scroll', async () => {
            const state = paginationState[stateKey];
            if (state.isLoading || !state.hasMore) return;

            // Detect if near bottom of page
            const scrollPos = window.innerHeight + window.scrollY;
            const threshold = document.documentElement.offsetHeight - 800;

            if (scrollPos >= threshold) {
                state.isLoading = true;
                showLoader(container);
                state.page += 1;

                try {
                    const data = await fetchData(state.endpoint, state.page);
                    removeLoader(container);
                    if (data && data.results && data.results.length > 0) {
                        populateRow(container, data.results, true);
                    } else {
                        state.hasMore = false;
                    }
                } catch (error) {
                    console.error("Error loading more items:", error);
                    removeLoader(container);
                    state.hasMore = false;
                } finally {
                    state.isLoading = false;
                }
            }
        });
    } else {
        // Horizontal scroll for other rows
        container.addEventListener('scroll', async () => {
            const state = paginationState[stateKey];
            if (state.isLoading || !state.hasMore) return;

            if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 500) {
                state.isLoading = true;
                state.page += 1;

                try {
                    const data = await fetchData(state.endpoint, state.page);
                    if (data && data.results && data.results.length > 0) {
                        populateRow(container, data.results, true);
                    } else {
                        state.hasMore = false;
                    }
                } catch (error) {
                    console.error("Error loading more items:", error);
                    state.hasMore = false;
                } finally {
                    state.isLoading = false;
                }
            }
        });
    }
}

// ====================== INITIAL DATA LOAD ======================
async function loadInitialData() {
    const isUpcomingPage = window.location.pathname.includes('upcoming');

    // Show skeletons
    showSkeletons(discoverRow);
    showSkeletons(topRatedRow);
    if (isUpcomingPage && upcomingRow) showSkeletons(upcomingRow);
    showSkeletons(koreanDramasRow);
    showSkeletons(indianMoviesRow);
    showSkeletons(nigerianMoviesRow);
    showSkeletons(asianMoviesRow);

    // 1. Trending → Hero Carousel + Discover section
    paginationState.discover.endpoint = "/trending/movie/week";
    const trendingData = await fetchData(paginationState.discover.endpoint, 1);
    if (trendingData.results && trendingData.results.length > 0) {
        createCarouselSlides(trendingData.results.slice(0, 8));
        populateRow(discoverRow, trendingData.results);
    }


    // 3. Old Movies
    const topRatedData = await fetchData(paginationState.topRated.endpoint, 1);
    populateRow(topRatedRow, topRatedData.results);

    // 4. Upcoming
    if (isUpcomingPage && upcomingRow) {
        const upcomingData = await fetchData(paginationState.upcoming.endpoint, 1);
        populateRow(upcomingRow, upcomingData.results);
    }

    // 5. Korean Dramas
    const koreanData = await fetchMoviesByLanguage('ko', true, 1);
    populateRow(koreanDramasRow, koreanData.results);

    // 6. Indian Movies
    const indianData = await fetchMoviesByLanguage('hi', false, 1);
    populateRow(indianMoviesRow, indianData.results);

    // 7. Nigerian Movies
    const nigerianData = await fetchMoviesByRegion('NG', 1);
    populateRow(nigerianMoviesRow, nigerianData.results);

    // 8. Asian Movies
    const asianData = await fetchMoviesByRegion('KR|JP|CN|TH', 1);
    populateRow(asianMoviesRow, asianData.results);

    // Setup infinite scroll
    setupInfiniteScroll(discoverRow, 'discover');
    setupInfiniteScroll(topRatedRow, 'topRated');
    if (isUpcomingPage && upcomingRow) setupInfiniteScroll(upcomingRow, 'upcoming');
    setupInfiniteScroll(koreanDramasRow, 'koreanDramas');
    setupInfiniteScroll(indianMoviesRow, 'indianMovies');
    setupInfiniteScroll(nigerianMoviesRow, 'nigerianMovies');
    setupInfiniteScroll(asianMoviesRow, 'asianMovies');
}

// ====================== CATEGORY FILTERS ======================
function initCategoryFilters() {
    const buttons = document.querySelectorAll(".category-btn");

    buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            // Remove active from all
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const genreId = btn.getAttribute("data-genre-id");
            const label = btn.textContent.trim();

            discoverTitle.textContent = genreId === ""
                ? "Most Viewed"
                : `${label} Movies`;

            showSkeletons(discoverRow);

            // Update pagination state
            paginationState.discover.endpoint = genreId
                ? `/discover/movie?sort_by=popularity.desc&with_genres=${genreId}`
                : `/trending/movie/week`;
            paginationState.discover.page = 1;
            paginationState.discover.hasMore = true;

            const data = await fetchData(paginationState.discover.endpoint, 1);
            populateRow(discoverRow, data.results);
        });
    });
}

// ====================== SEARCH ======================
let searchTimeout;
function initSearch() {
    // Live search with debounce
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(async () => {
            const query = searchInput.value.trim();

            if (query.length < 2) {
                // Reset to trending when search is cleared
                discoverTitle.textContent = "Most Viewed";
                showSkeletons(discoverRow);

                paginationState.discover.endpoint = "/trending/movie/week";
                paginationState.discover.page = 1;
                paginationState.discover.hasMore = true;

                const trendingData = await fetchData(paginationState.discover.endpoint, 1);
                populateRow(discoverRow, trendingData.results);
                return;
            }

            discoverTitle.textContent = `Results for “${query}”`;
            showSkeletons(discoverRow);

            paginationState.discover.endpoint = `/search/movie?query=${encodeURIComponent(query)}`;
            paginationState.discover.page = 1;
            paginationState.discover.hasMore = true;

            const searchData = await fetchData(paginationState.discover.endpoint, 1);
            populateRow(discoverRow, searchData.results);
        }, 420);
    });

    // Enter key support
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            searchBtn.click();
        }
    });

    // Also support clicking the search icon
    searchBtn.addEventListener("click", async () => {
        const query = searchInput.value.trim();

        if (query.length < 2) {
            // Focus input if no query
            searchInput.focus();
            return;
        }

        // Perform search immediately
        discoverTitle.textContent = `Results for "${query}"`;
        showSkeletons(discoverRow);

        try {
            paginationState.discover.endpoint = `/search/movie?query=${encodeURIComponent(query)}`;
            paginationState.discover.page = 1;
            paginationState.discover.hasMore = true;

            const searchData = await fetchData(paginationState.discover.endpoint, 1);
            populateRow(discoverRow, searchData.results);
        } catch (error) {
            console.error("Search failed:", error);
            discoverTitle.textContent = "Search failed - try again";
        }
    });
}

// ====================== MODAL ======================
function initModal() {
    // Open modal from hero Play button
    document.addEventListener("click", async (e) => {
        if (e.target.closest(".btn-play")) {
            const slide = e.target.closest(".carousel-slide") || document.querySelector(".carousel-slide.active");
            if (!slide) return;

            const slideIndex = parseInt(slide.id.split("-")[2]);
            const movie = carouselMovies[slideIndex];

            const title = slide.querySelector(".hero-title").textContent;
            const description = slide.querySelector(".hero-description").textContent;
            const year = slide.querySelector(".hero-year").textContent;
            const rating = slide.querySelector(".hero-rating").innerHTML;
            const backdrop = slide.querySelector(".hero-background").style.backgroundImage;

            modalBackdrop.style.backgroundImage = backdrop;
            modalTitle.textContent = title;
            modalDescription.textContent = "";
            modalYear.textContent = year;
            modalRating.innerHTML = rating;

            // Fetch additional details
            if (movie) {
                const details = await fetchMovieDetails(movie.id);
                if (modalRuntime) modalRuntime.innerHTML = details.runtime ? `<i class="fas fa-clock"></i> ${details.runtime} min` : '';
                if (modalLanguage) modalLanguage.innerHTML = details.original_language ? `<i class="fas fa-globe"></i> ${details.original_language.toUpperCase()}` : '';
            }

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
                    <div id="hero-video-player-container" class="modal-video-section"></div>
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
            }

            modal.style.display = "flex";
        }
    });

    // Close modal
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

    // Fake trailer button
    modalPlayBtn.addEventListener("click", () => {
        modalPlayBtn.innerHTML = `
            <i class="fas fa-play"></i>
            NOW PLAYING TRAILER...
        `;
        setTimeout(() => {
            alert("🎬 In a real app this would play the official trailer from TMDB/YouTube.\n\n(Everything else is fully functional!)");
            modalPlayBtn.innerHTML = `
                <i class="fas fa-play"></i>
                WATCH TRAILER
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

    // Close on background click
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });
}

// ====================== START THE APP ======================
document.addEventListener("DOMContentLoaded", () => {
    if (API_KEY === "YOUR_TMDB_API_KEY") {
        console.warn("%c⚠️  TMDB API KEY MISSING – replace in script.js", "color:#ffd700; font-size:18px");
        // Still run the UI with placeholders
    }

    loadInitialData();
    initCarouselControls();
    initCategoryFilters();
    initSearch();
    initModal();

    // Call the standalone upcoming movies function
    fetchAndDisplayUpcomingMovies(API_KEY, "upcoming-movies");

    console.log("%c✅ BRIGSFLIX landing page ready! Replace API key and enjoy the full Netflix-style experience.", "color:#00b4ff; font-weight:700");
});

// ====================== STANDALONE UPCOMING FUNCTION ======================
/**
 * Fetches and displays upcoming movies from the TMDB API.
 * 
 * @param {string} apiKey - Your TMDB API key.
 * @param {string} containerId - The HTML ID of the container element.
 */
async function fetchAndDisplayUpcomingMovies(apiKey, containerId = "upcoming-movies") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const endpoint = `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=en-US&page=1`;

    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const movies = data.results;

        container.innerHTML = '';

        movies.forEach(movie => {
            if (!movie.poster_path) return;

            const card = document.createElement('div');
            card.className = 'movie-card';

            const img = document.createElement('img');
            img.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
            img.alt = movie.title;
            img.loading = 'lazy';

            const cardInfo = document.createElement('div');
            cardInfo.className = 'card-info';

            const title = document.createElement('h3');
            title.textContent = movie.title;

            const releaseDate = document.createElement('p');
            releaseDate.className = 'rating';
            releaseDate.innerHTML = `<i class="fas fa-calendar"></i> ${movie.release_date}`;

            cardInfo.appendChild(title);
            cardInfo.appendChild(releaseDate);
            card.appendChild(img);
            card.appendChild(cardInfo);

            // Add click event to open modal (using createMovieCard's logic)
            card.addEventListener('click', async () => {
                const titleText = movie.title || movie.name || "Untitled";
                const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
                const backdrop = movie.backdrop_path ? `${IMG_BASE}original${movie.backdrop_path}` : '';

                modalBackdrop.style.backgroundImage = backdrop ? `url('${backdrop}')` : '';
                modalTitle.textContent = titleText;
                modalDescription.textContent = "";
                modalYear.textContent = (movie.release_date || "2026").split("-")[0];
                modalRating.innerHTML = `<i class="fas fa-star"></i> ${rating}`;

                const details = await fetchMovieDetails(movie.id);
                if (modalRuntime) modalRuntime.innerHTML = details.runtime ? `<i class="fas fa-clock"></i> ${details.runtime} min` : '';
                if (modalLanguage) modalLanguage.innerHTML = details.original_language ? `<i class="fas fa-globe"></i> ${details.original_language.toUpperCase()}` : '';
                if (modalPlotText) modalPlotText.textContent = details.overview || movie.overview || "Plot unavailable.";

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

                modal.style.display = "flex";
            });

            container.appendChild(card);
        });
    } catch (error) {
        console.error("Failed to fetch upcoming movies:", error);
        container.innerHTML = `<p style="color: red; padding: 20px;">Failed to load movies. Please try again later.</p>`;
    }
}
