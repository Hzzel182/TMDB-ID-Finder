/**
 * TMDB Companion - Client-side application for querying TMDB API
 * Designed for GitHub Pages and Notion integration.
 */

const API_KEY = '0ba50b1a0e817c1f5e8ba94951a3a3c2';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_THUMB_URL = 'https://image.tmdb.org/t/p/w200';

// In-memory cache for search queries and item details
const searchCache = new Map();
const detailCache = new Map();

// Region display names formatter for full English country names
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

// DOM Elements
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');

let debounceTimer = null;
let currentAbortController = null;

// Event Listeners
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(debounceTimer);
    
    if (!query) {
        renderInitialMessage();
        return;
    }
    
    debounceTimer = setTimeout(() => {
        performSearch(query);
    }, 300);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim();
        if (query) {
            performSearch(query);
        }
    }
});

/**
 * Renders initial helper message
 */
function renderInitialMessage() {
    resultsContainer.innerHTML = '<div class="initial-message">Comienza a escribir para buscar en TMDB...</div>';
}

/**
 * Renders loading state
 */
function renderLoading() {
    resultsContainer.innerHTML = '<div class="loading-message">Buscando...</div>';
}

/**
 * Renders no results state
 */
function renderNoResults() {
    resultsContainer.innerHTML = '<div class="no-results">No se encontraron resultados.</div>';
}

/**
 * Performs multi-search on TMDB API with caching and abort controller
 */
async function performSearch(query) {
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    renderLoading();

    if (searchCache.has(query)) {
        displayResults(searchCache.get(query));
        return;
    }

    try {
        const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
        const response = await fetch(url, { signal: currentAbortController.signal });
        
        if (!response.ok) throw new Error('Error en la respuesta de la red');
        
        const data = await response.json();
        // Filter out persons as requested
        const filteredResults = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');

        // Fetch additional details in parallel using Promise.all for enriched data
        const detailedResults = await Promise.all(
            filteredResults.map(item => fetchItemDetails(item.id, item.media_type))
        );

        searchCache.set(query, detailedResults);
        displayResults(detailedResults);
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Search error:', error);
        resultsContainer.innerHTML = '<div class="no-results">Ocurrió un error al realizar la búsqueda.</div>';
    }
}

/**
 * Fetches specific item details in English and Spanish, plus English-text posters
 */
async function fetchItemDetails(id, mediaType) {
    const cacheKey = `${mediaType}_${id}`;
    if (detailCache.has(cacheKey)) {
        return detailCache.get(cacheKey);
    }

    try {
        const [resEn, resEs, resImages] = await Promise.all([
            fetch(`${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}&language=en-US`),
            fetch(`${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}&language=es-ES`),
            fetch(`${BASE_URL}/${mediaType}/${id}/images?api_key=${API_KEY}`)
        ]);

        const dataEn = resEn.ok ? await resEn.json() : {};
        const dataEs = resEs.ok ? await resEs.json() : {};
        const dataImages = resImages.ok ? await resImages.json() : {};
        
        const formatted = formatItemData(dataEn, dataEs, dataImages, mediaType);
        detailCache.set(cacheKey, formatted);
        return formatted;
    } catch (error) {
        console.error(`Detail error for ${mediaType} ${id}:`, error);
        return null;
    }
}

/**
 * Normalizes raw TMDB API response into a clean structure with English names/posters and full country names
 */
function formatItemData(dataEn, dataEs, dataImages, mediaType) {
    const isMovie = mediaType === 'movie';
    
    // Ensure English name for primary/EN button (no native foreign scripts like Japanese/Korean)
    const englishName = isMovie ? (dataEn.title || dataEn.original_title || '—') : (dataEn.name || dataEn.original_name || '—');
    
    // Proper Spanish localized title
    const spanishName = isMovie ? (dataEs.title || dataEs.original_title || englishName) : (dataEs.name || dataEs.original_name || englishName);
    
    const releaseDate = isMovie ? (dataEn.release_date || dataEs.release_date) : (dataEn.first_air_date || dataEs.first_air_date);
    const year = releaseDate ? releaseDate.split('-')[0] : '—';
    
    // Full English country names (no abbreviations)
    let countries = '—';
    const rawCountries = dataEn.production_countries || dataEs.production_countries || [];
    const rawOrigin = dataEn.origin_country || dataEs.origin_country || [];
    
    if (rawCountries.length > 0) {
        const countryNames = rawCountries.map(c => {
            try {
                return regionNames.of(c.iso_3166_1) || c.iso_3166_1;
            } catch {
                return c.iso_3166_1;
            }
        });
        countries = countryNames.join(', ');
    } else if (rawOrigin.length > 0) {
        const countryNames = rawOrigin.map(c => {
            try {
                return regionNames.of(c) || c;
            } catch {
                return c;
            }
        });
        countries = countryNames.join(', ');
    }

    // Genres (localized to Spanish via dataEs)
    let genres = '—';
    const genresSource = (dataEs.genres && dataEs.genres.length > 0) ? dataEs.genres : (dataEn.genres || []);
    if (genresSource.length > 0) {
        genres = genresSource.map(g => g.name).join(' • ');
    }

    const type = isMovie ? 'Movie' : 'TV Series';

    // Poster with English lettering/text preferred
    let posterPath = '';
    let originalPosterPath = '';

    if (dataImages && dataImages.posters && dataImages.posters.length > 0) {
        const enPoster = dataImages.posters.find(p => p.iso_639_1 === 'en');
        const nullPoster = dataImages.posters.find(p => p.iso_639_1 === null);
        const selectedPoster = enPoster || nullPoster || dataImages.posters[0];

        if (selectedPoster && selectedPoster.file_path) {
            posterPath = `${POSTER_THUMB_URL}${selectedPoster.file_path}`;
            originalPosterPath = `${IMAGE_BASE_URL}${selectedPoster.file_path}`;
        }
    }

    // Fallback if images endpoint didn't provide paths
    if (!posterPath && dataEn.poster_path) {
        posterPath = `${POSTER_THUMB_URL}${dataEn.poster_path}`;
        originalPosterPath = `${IMAGE_BASE_URL}${dataEn.poster_path}`;
    }

    return {
        id: dataEn.id || dataEs.id || '—',
        originalName: englishName,
        localName: spanishName,
        year,
        countries,
        genres,
        type,
        posterPath,
        originalPosterPath,
        imdbId: dataEn.imdb_id || dataEs.imdb_id || '—',
        runtime: isMovie ? (dataEn.runtime ? `${dataEn.runtime} min` : '—') : (dataEn.episode_run_time?.[0] ? `${dataEn.episode_run_time[0]} min` : '—'),
        backdropPath: dataEn.backdrop_path ? `${IMAGE_BASE_URL}${dataEn.backdrop_path}` : ''
    };
}

/**
 * Displays search results in the DOM
 */
function displayResults(items) {
    if (!items || items.length === 0) {
        renderNoResults();
        return;
    }

    resultsContainer.innerHTML = '';
    
    items.forEach(item => {
        if (!item) return;
        const card = createCardElement(item);
        resultsContainer.appendChild(card);
    });
}

/**
 * Creates individual result card element
 */
function createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'card';

    // Poster element
    const posterContainer = document.createElement('div');
    posterContainer.className = 'card-poster-container';
    
    if (item.originalPosterPath) {
        const img = document.createElement('img');
        img.className = 'card-poster';
        img.src = item.posterPath;
        img.alt = item.originalName;
        img.loading = 'lazy';
        posterContainer.appendChild(img);

        posterContainer.addEventListener('click', () => {
            window.open(item.originalPosterPath, '_blank');
        });
    }

    // Content element
    const content = document.createElement('div');
    content.className = 'card-content';

    content.innerHTML = `
        <div class="card-title-group">
            <div class="card-title-orig" title="${escapeHtml(item.originalName)}">${escapeHtml(item.originalName)}</div>
            <div class="card-title-local" title="${escapeHtml(item.localName)}">${escapeHtml(item.localName)} (${escapeHtml(item.year)})</div>
        </div>
        <div class="card-meta">
            <span class="meta-label">Original:</span>
            <span class="meta-value">${escapeHtml(item.originalName)}</span>
            <span class="meta-label">Español:</span>
            <span class="meta-value">${escapeHtml(item.localName)}</span>
            <span class="meta-label">ID:</span>
            <span class="meta-value">${escapeHtml(String(item.id))}</span>
            <span class="meta-label">País:</span>
            <span class="meta-value">${escapeHtml(item.countries)}</span>
            <span class="meta-label">Géneros:</span>
            <span class="meta-value">${escapeHtml(item.genres)}</span>
            <span class="meta-label">Tipo:</span>
            <span class="meta-value">${escapeHtml(item.type)}</span>
        </div>
    `;

    // Buttons element
    const buttons = document.createElement('div');
    buttons.className = 'card-buttons';

    const btnEN = createActionButton('EN', () => item.originalName);
    const btnES = createActionButton('ES', () => item.localName);
    const btnID = createActionButton('ID', () => String(item.id));
    
    // IMG button downloads the poster as .webp in quality 0.8 with rounded corners
    const btnIMG = createActionButton('IMG', async () => {
        await downloadRoundedWebpPoster(item);
        return item.originalPosterPath;
    });

    const btnCOPY = createActionButton('COPY', () => generateCopyBlock(item));

    buttons.appendChild(btnEN);
    buttons.appendChild(btnES);
    buttons.appendChild(btnID);
    buttons.appendChild(btnIMG);
    buttons.appendChild(btnCOPY);

    card.appendChild(posterContainer);
    card.appendChild(content);
    card.appendChild(buttons);

    return card;
}

/**
 * Downloads poster as WebP format (quality 0.8) with rounded corners
 */
async function downloadRoundedWebpPoster(item) {
    if (!item.originalPosterPath) return;
    try {
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                
                // Proportional rounded corners radius
                const radius = Math.min(canvas.width, canvas.height) * 0.04;
                
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(0, 0, canvas.width, canvas.height, radius);
                } else {
                    ctx.moveTo(radius, 0);
                    ctx.lineTo(canvas.width - radius, 0);
                    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
                    ctx.lineTo(canvas.width, canvas.height - radius);
                    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
                    ctx.lineTo(radius, canvas.height);
                    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
                    ctx.lineTo(0, radius);
                    ctx.quadraticCurveTo(0, 0, radius, 0);
                }
                ctx.closePath();
                ctx.clip();
                
                ctx.drawImage(img, 0, 0);
                
                // Export as webp with 0.8 quality for lightweight and optimized files
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas blob creation failed'));
                        return;
                    }
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const safeName = item.originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    a.download = `${safeName}_poster.webp`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    resolve();
                }, 'image/webp', 0.8);
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = item.originalPosterPath;
        });
    } catch (err) {
        console.error('Error generating WebP poster:', err);
        window.open(item.originalPosterPath, '_blank');
    }
}

/**
 * Creates an action button with copy/action feedback animation
 */
function createActionButton(text, actionFn) {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.textContent = text;
    
    btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const result = await actionFn();
        
        if (text !== 'IMG') {
            if (!result || result === '—') return;
            const success = await copyToClipboard(result);
            if (success) {
                triggerSuccessAnimation(btn, text);
            }
        } else {
            triggerSuccessAnimation(btn, text);
        }
    });

    return btn;
}

/**
 * Generates formatted copy block for COPY button
 */
function generateCopyBlock(item) {
    return `Original: ${item.originalName}
Español: ${item.localName}
ID: ${item.id}
País: ${item.countries}
Géneros: ${item.genres}
Tipo: ${item.type}`;
}

/**
 * Copies text to clipboard securely
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
    }
}

/**
 * Triggers temporary checkmark animation on button
 */
function triggerSuccessAnimation(btn, originalText) {
    btn.textContent = '✔';
    btn.classList.add('success');
    setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('success');
    }, 500);
}

/**
 * Utility to escape HTML and prevent XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
