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
        const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&language=es-ES&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
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
 * Fetches specific item details to ensure complete and accurate metadata
 */
async function fetchItemDetails(id, mediaType) {
    const cacheKey = `${mediaType}_${id}`;
    if (detailCache.has(cacheKey)) {
        return detailCache.get(cacheKey);
    }

    try {
        const url = `${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}&language=es-ES`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error fetching details');
        const data = await response.json();
        
        const formatted = formatItemData(data, mediaType);
        detailCache.set(cacheKey, formatted);
        return formatted;
    } catch (error) {
        console.error(`Detail error for ${mediaType} ${id}:`, error);
        return null;
    }
}

/**
 * Normalizes raw TMDB API response into a clean structure
 */
function formatItemData(raw, mediaType) {
    const isMovie = mediaType === 'movie';
    
    const originalName = isMovie ? (raw.original_title || '—') : (raw.original_name || '—');
    const localName = isMovie ? (raw.title || raw.original_title || '—') : (raw.name || raw.original_name || '—');
    
    const releaseDate = isMovie ? raw.release_date : raw.first_air_date;
    const year = releaseDate ? releaseDate.split('-')[0] : '—';
    
    // Countries
    let countries = '—';
    if (raw.production_countries && raw.production_countries.length > 0) {
        countries = raw.production_countries.map(c => c.iso_3166_1).join(', ');
    } else if (raw.origin_country && raw.origin_country.length > 0) {
        countries = raw.origin_country.join(', ');
    }

    // Genres
    let genres = '—';
    if (raw.genres && raw.genres.length > 0) {
        genres = raw.genres.map(g => g.name).join(' • ');
    }

    const type = isMovie ? 'Movie' : 'TV Series';
    const posterPath = raw.poster_path ? `${POSTER_THUMB_URL}${raw.poster_path}` : '';
    const originalPosterPath = raw.poster_path ? `${IMAGE_BASE_URL}${raw.poster_path}` : '';

    return {
        id: raw.id || '—',
        originalName,
        localName,
        year,
        countries,
        genres,
        type,
        posterPath,
        originalPosterPath,
        // Prepared fields for future scalability requirements
        imdbId: raw.imdb_id || '—',
        runtime: isMovie ? (raw.runtime ? `${raw.runtime} min` : '—') : (raw.episode_run_time?.[0] ? `${raw.episode_run_time[0]} min` : '—'),
        backdropPath: raw.backdrop_path ? `${IMAGE_BASE_URL}${raw.backdrop_path}` : ''
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
    const btnIMG = createActionButton('IMG', () => item.originalPosterPath);
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
 * Creates an action button with copy feedback animation
 */
function createActionButton(text, getDataFn) {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.textContent = text;
    
    btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const data = getDataFn();
        if (!data || data === '—') return;

        const success = await copyToClipboard(data);
        if (success) {
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
