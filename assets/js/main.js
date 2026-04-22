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
const heroDescription = document.getElementById("hero-de  bbbbbbbbbscription");
const heroRating = document.getElementById("hero-rating");
const heroYear = document.getElementById("hero-year");
const heroType = document.getElementById("hero-type");

const discoverTitle = document.getElementById("discover-title");
const discoverRow = document.getElementById("discover-row");
const popularRow = document.getElementById("popular-row");
const topRatedRow = document.getElementById("top-rated-row");
const upcomingRow = document.getElementById("upcoming-row");

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

// ====================== HELPER FUNCTIONS ======================
// ====================== CAROUSEL STATE ======================
let carouselMovies = [];
let currentCarouselIndex = 0;
let carouselAutoPlayInterval;

// ====================== HELPER FUNCTIONS ======================
function getImageUrl(path, size = POSTER_SIZE) {
    if (!path) return "https://via.placeholder.com/342x510/222/fff?text=No+Image";
    return `${IMG_BASE}${size}${path}`;
}

function generateMovieEpisodes(movie) {
    const runtime = movie.runtime || 120; // Default to 120 minutes if no runtime
    const episodeCount = Math.max(3, Math.min(8, Math.floor(runtime / 20))); // 3-8 episodes based on runtime
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
    
    card.innerHTML = `
        <img src="${getImageUrl(movie.poster_path)}" alt="${title}">
        <div class="card-info">
            <h3>${title}</h3>
            <p class="rating"><i class="fas fa-star"></i> ${rating}</p>
        </div>
    `;
    
    // Click card → open modal with details
    card.addEventListener("click", async () => {
        const backdrop = movie.backdrop_path ? `${IMG_BASE}original${movie.backdrop_path}` : '';
        modalBackdrop.style.backgroundImage = backdrop ? `url('${backdrop}')` : '';
        modalTitle.textContent = title;
        modalDescription.textContent = movie.overview || "No description available.";
        modalYear.textContent = (movie.release_date || "2026").split("-")[0];
        modalRating.innerHTML = `<i class="fas fa-star"></i> ${rating}`;
        
        // Fetch additional details
        const details = await fetchMovieDetails(movie.id);
        if (modalRuntime) modalRuntime.innerHTML = details.runtime ? `<i class="fas fa-clock"></i> ${details.runtime} min` : '';
        if (modalLanguage) modalLanguage.innerHTML = details.original_language ? `<i class="fas fa-globe"></i> ${details.original_language.toUpperCase()}` : '';
        if (modalPlotText) modalPlotText.textContent = details.overview || movie.overview || "Plot unavailable.";
        
        // Generate and display episodes
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
            </div>
        `;
        
        // Add click handlers for episode play buttons
        modalEpisodes.querySelectorAll('.episode-play-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                alert(`🎬 Playing ${title} - Part ${btn.closest('.episode-item').dataset.episode}\n\n(This would play the specific part of the movie in a real app!)`);
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
async function fetchData(endpoint) {
    if (!API_KEY || API_KEY === "YOUR_TMDB_API_KEY") {
        console.error("❌ Please replace YOUR_TMDB_API_KEY with a real TMDB API key!");
        return { results: [] };
    }
    
    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&language=en-US`;
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

async function fetchByGenre(genreId) {
    let endpoint = `/discover/movie?sort_by=popularity.desc`;
    if (genreId) endpoint += `&with_genres=${genreId}`;
    return await fetchData(endpoint);
}

async function fetchSearch(query) {
    return await fetchData(`/search/movie?query=${encodeURIComponent(query)}`);
}

// ====================== POPULATE ROWS ======================
function populateRow(container, movies) {
    container.innerHTML = "";
    if (!movies || movies.length === 0) {
        const empty = document.createElement("div");
        empty.style.color = "#666";
        empty.style.padding = "40px";
        empty.textContent = "No results found.";
        container.appendChild(empty);
        return;
    }
    movies.forEach(movie => {
        const card = createMovieCard(movie);
        container.appendChild(card);
    });
}

// ====================== INITIAL DATA LOAD ======================
async function loadInitialData() {
    // Show skeletons
    showSkeletons(discoverRow);
    showSkeletons(popularRow);
    showSkeletons(topRatedRow);
    showSkeletons(upcomingRow);
    
    // 1. Trending → Hero Carousel + Discover section
    const trendingData = await fetchData("/trending/movie/week");
    if (trendingData.results && trendingData.results.length > 0) {
        createCarouselSlides(trendingData.results.slice(0, 8));
        populateRow(discoverRow, trendingData.results.slice(0, 12));
    }
    
    // 2. Popular
    const popularData = await fetchData("/movie/popular");
    populateRow(popularRow, popularData.results.slice(0, 12));
    
    // 3. Top Rated
    const topRatedData = await fetchData("/movie/top_rated");
    populateRow(topRatedRow, topRatedData.results.slice(0, 12));
    
    // 4. Upcoming
    const upcomingData = await fetchData("/movie/upcoming");
    populateRow(upcomingRow, upcomingData.results.slice(0, 12));
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
            
            const data = await fetchByGenre(genreId);
            populateRow(discoverRow, data.results.slice(0, 12));
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
                const trendingData = await fetchData("/trending/movie/week");
                populateRow(discoverRow, trendingData.results.slice(0, 12));
                return;
            }
            
            discoverTitle.textContent = `Results for “${query}”`;
            showSkeletons(discoverRow);
            
            const searchData = await fetchSearch(query);
            populateRow(discoverRow, searchData.results.slice(0, 12));
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
            const searchData = await fetchSearch(query);
            populateRow(discoverRow, searchData.results.slice(0, 12));
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
            modalDescription.textContent = description;
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
                    </div>
                `;
                
                // Add click handlers for episode play buttons
                modalEpisodes.querySelectorAll('.episode-play-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        alert(`🎬 Playing ${movie.title} - Part ${btn.closest('.episode-item').dataset.episode}\n\n(This would play the specific part of the movie in a real app!)`);
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
    modalClose.addEventListener("click", () => modal.style.display = "none");
    document.getElementById("modal-close-btn").addEventListener("click", () => modal.style.display = "none");
    
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
    
    console.log("%c✅ Movie Love landing page ready! Replace API key and enjoy the full Netflix-style experience.", "color:#00b4ff; font-weight:700");
});