/**
 * --- PL ---
 * Główny plik aplikacji v2.0 (Orkiestrator).
 * Łączy wszystkie moduły i zarządza stanem oraz logiką.
 * Wersja zaktualizowana o logikę mapy Leaflet, pełne przetwarzanie danych i i18n.
 * --- EN ---
 * Main application file v2.0 (Orchestrator).
 * Connects all modules and manages state and logic.
 * Updated version with Leaflet map logic, full data processing, and i18n.
 */

// --- Import modułów / Module Imports ---
import { translations } from './translations.js';
import * as api from './api.js';
import * as ui from './ui.js';

// --- Stan Aplikacji / Application State ---
let state = {
    currentWeather: null,
    currentLocation: null,
    favorites: [],
    // ZMIANA: Odczyt języka z localStorage (domyślnie 'pl')
    currentLang: localStorage.getItem('lang') || 'pl',
    currentHourlyRange: 24,
    
    map: null,
    marker: null,
    precipitationLayer: null,
    lightTileLayer: null,
    darkTileLayer: null,
};

// --- Logika Motywu / Theme Logic ---
function setTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    document.body.classList.toggle('light-mode', theme === 'light');
    localStorage.setItem('theme', theme);
    if (state.map) updateMapTileLayer();
}

function toggleTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    setTheme(isDarkMode ? 'light' : 'dark');
}

// --- NOWOŚĆ: Logika Zmiany Języka / Language Switch Logic ---
async function switchLanguage(lang) {
    if (state.currentLang === lang) return;
    
    state.currentLang = lang;
    localStorage.setItem('lang', lang);
    
    // Aktualizacja wizualna przełącznika
    document.querySelectorAll('.lang-switcher button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Natychmiastowa aktualizacja tekstów statycznych
    ui.updateStaticElements(translations[lang]);

    // Jeśli mamy załadowane miasto, odświeżamy dane z API w nowym języku
    if (state.currentLocation) {
        // Używamy współrzędnych dla precyzji
        await handleSearch({ latitude: state.currentLocation.lat, longitude: state.currentLocation.lon });
    } else {
        // Jeśli nie ma danych, odświeżamy tylko pusty stan ulubionych i listę (jeśli są)
        ui.showInitialState(translations[lang]);
        loadFavorites(); 
    }
}

// --- Inicjalizacja Aplikacji / Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setTheme(localStorage.getItem('theme') || 'dark');
    ui.initUI();
    initMap();
    
    // ZMIANA: Inicjalizacja języka na starcie
    const initialLang = state.currentLang;
    ui.updateStaticElements(translations[initialLang]);
    
    // Ustawienie aktywnego przycisku języka
    const langBtns = document.querySelectorAll('.lang-switcher button');
    langBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === initialLang);
    });

    loadFavorites();
    bindEvents();
    
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        document.getElementById('city-input').value = lastCity;
        handleSearch(lastCity);
    } else if (state.favorites.length > 0) {
        handleSearch(state.favorites[0].name);
    } else {
        ui.showInitialState(translations[state.currentLang]);
    }
});

// --- Powiązanie Eventów ---
function bindEvents() {
    const domElements = {
        searchBtn: document.getElementById('search-weather-btn'),
        cityInput: document.getElementById('city-input'),
        geoBtn: document.getElementById('geolocation-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        favoritesContainer: document.getElementById('favorites-container'),
        addFavoriteBtn: document.getElementById('add-favorite-btn'),
        hourlyRangeSwitcher: document.querySelector('.hourly-range-switcher'),
        hourlySliderPrev: document.querySelector('#hourly-forecast-wrapper .slider-nav.prev'),
        hourlySliderNext: document.querySelector('#hourly-forecast-wrapper .slider-nav.next'),
        hourlyScrollWrapper: document.getElementById('hourly-forecast-content'),
        dailyScrollWrapper: document.getElementById('daily-forecast-content'),
        forecastSwitcherMobile: document.querySelector('.forecast-switcher-mobile'),
        modalOverlay: document.getElementById('details-modal'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        // ZMIANA: Dodajemy referencję do switchera języka
        langSwitcher: document.querySelector('.lang-switcher'),
    };

    const addSafeListener = (element, event, handler) => {
        if (element) element.addEventListener(event, handler);
    };

    addSafeListener(domElements.searchBtn, 'click', () => handleSearch(domElements.cityInput.value.trim()));
    addSafeListener(domElements.cityInput, 'keyup', e => { if (e.key === 'Enter') handleSearch(domElements.cityInput.value.trim()); });
    addSafeListener(domElements.geoBtn, 'click', handleGeolocation);
    addSafeListener(domElements.themeToggle, 'click', toggleTheme);
    addSafeListener(domElements.favoritesContainer, 'click', handleFavoriteClick);
    addSafeListener(domElements.addFavoriteBtn, 'click', toggleFavorite);
    addSafeListener(domElements.hourlyRangeSwitcher, 'click', handleHourlyRangeSwitch);
    
    addSafeListener(domElements.hourlySliderPrev, 'click', () => handleSliderScroll(domElements.hourlyScrollWrapper, -1, 7));
    addSafeListener(domElements.hourlySliderNext, 'click', () => handleSliderScroll(domElements.hourlyScrollWrapper, 1, 7));
    // Uwaga: w HTML v2.0 nie ma dailySliderPrev/Next, jeśli ich nie używasz, możesz usunąć te linie
    // addSafeListener(domElements.dailySliderPrev, 'click', () => handleSliderScroll(domElements.dailyScrollWrapper, -1));
    // addSafeListener(domElements.dailySliderNext, 'click', () => handleSliderScroll(domElements.dailyScrollWrapper, 1));
    
    addSafeListener(domElements.forecastSwitcherMobile, 'click', handleMobileForecastSwitch);
    addSafeListener(domElements.hourlyScrollWrapper, 'click', (e) => handleForecastItemClick(e, 'hourly'));
    addSafeListener(domElements.dailyScrollWrapper, 'click', (e) => handleForecastItemClick(e, 'daily'));
    
    addSafeListener(domElements.modalCloseBtn, 'click', ui.hideDetailsModal);
    addSafeListener(domElements.modalOverlay, 'click', (e) => {
        if (e.target === domElements.modalOverlay) ui.hideDetailsModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !domElements.modalOverlay.hidden) {
            ui.hideDetailsModal();
        }
    });

    // ZMIANA: Obsługa kliknięcia w przełącznik języka
    addSafeListener(domElements.langSwitcher, 'click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.lang) {
            switchLanguage(btn.dataset.lang);
        }
    });
}

// --- Główna Logika ---
async function handleSearch(query) {
    if (!query) return;

    const buttonToLoad = (typeof query === 'object' && query.latitude) 
        ? document.getElementById('geolocation-btn') 
        : document.getElementById('search-weather-btn');
        
    ui.toggleButtonLoading(buttonToLoad, true);
    ui.showLoadingState();

    try {
        // ZMIANA: Przekazujemy aktualny język do API
        const data = await api.getWeatherData(query, state.currentLang);
        state.currentWeather = processWeatherData(data);
        state.currentLocation = data.location;
        if (typeof query === 'string') localStorage.setItem('lastCity', query);
        
        updateFullUI(query);
        
    } catch (error) {
        ui.showError(error.message);
    } finally {
        ui.toggleButtonLoading(buttonToLoad, false);
    }
}

function handleGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => handleSearch({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => ui.showError(translations[state.currentLang].errors.location)
        );
    } else {
        ui.showError(translations[state.currentLang].errors.default);
    }
}

function processWeatherData(data) {
    // ... (bez zmian w logice przetwarzania, dane przychodzą już zlokalizowane z API)
    return {
        ...data,
        generatedOverview: data.daily[0].weather[0].description,
        roadCondition: (() => {
            const mainWeather = data.current.weather[0].main;
            if (data.current.temp > 2 && !['Rain', 'Snow', 'Drizzle'].includes(mainWeather)) {
                return { key: 'dry', class: 'roadDry' };
            }
            if (data.current.temp <= 2) {
                return { key: 'icy', class: 'roadIcy' };
            }
            return { key: 'wet', class: 'roadWet' };
        })(),
        uvCategory: (() => {
            const uvIndex = Math.round(data.current.uvi);
            if (uvIndex >= 11) return 'extreme';
            if (uvIndex >= 8) return 'very-high';
            if (uvIndex >= 6) return 'high';
            if (uvIndex >= 3) return 'moderate';
            return 'low';
        })(),
        formattedTimes: {
            // ZMIANA: Dodano 'pl-PL' jako fallback, ale lepiej użyć locale z tłumaczeń jeśli dostępne
            sunrise: new Date(data.current.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sunset: new Date(data.current.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            moonrise: new Date(data.daily[0].moonrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            moonset: new Date(data.daily[0].moonset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
    };
}

function updateFullUI(query) {
    // ZMIANA: Pobieramy aktualne tłumaczenia
    const t = translations[state.currentLang];
    
    ui.showContent();
    
    // ZMIANA: Przekazujemy 't' do wszystkich funkcji renderujących
    ui.renderCurrentWeather(state.currentWeather, t);
    ui.renderWeatherAlerts(state.currentWeather, t);
    ui.renderMinutelyForecast(state.currentWeather.minutely, t);
    ui.renderHourlyForecast(state.currentWeather.hourly, state.currentHourlyRange, t);
    ui.renderDailyForecast(state.currentWeather.daily, t);
    
    loadFavorites(); 
    updateFavoriteButtonState();

    const isGeoSearch = typeof query === 'object' && query.latitude;
    const zoomLevel = isGeoSearch ? 17 : 13;
    
    setTimeout(() => {
        if (state.map) {
            state.map.invalidateSize();
            updateMap(state.currentLocation.lat, state.currentLocation.lon, state.currentLocation.name, zoomLevel);
        }
    }, 0);
}

// --- Handlery Zdarzeń UI ---
function handleHourlyRangeSwitch(event) {
    const btn = event.target.closest('button');
    if (!btn || btn.classList.contains('active')) return;
    
    state.currentHourlyRange = parseInt(btn.dataset.range, 10);
    document.querySelector('.hourly-range-switcher .active')?.classList.remove('active');
    btn.classList.add('active');
    
    ui.renderHourlyForecast(state.currentWeather.hourly, state.currentHourlyRange, translations[state.currentLang]);
}

function handleSliderScroll(scrollWrapper, direction, itemsToScroll = 7) {
    if (!scrollWrapper) return;
    const firstItem = scrollWrapper.querySelector('.hourly-forecast-item, .daily-forecast-item');
    if (!firstItem) return;
    const computedStyle = getComputedStyle(scrollWrapper);
    const gap = parseFloat(computedStyle.gap) || 12;
    const itemWidth = firstItem.offsetWidth;
    const scrollAmount = (itemWidth + gap) * itemsToScroll * direction;
    scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

function handleMobileForecastSwitch(event) {
    const btn = event.target.closest('button');
    if (!btn || btn.classList.contains('active')) return;
    const forecastType = btn.dataset.forecast;
    document.querySelector('.forecast-switcher-mobile .active')?.classList.remove('active');
    btn.classList.add('active');
    document.querySelectorAll('.forecast-section').forEach(section => section.classList.remove('active'));
    const newActiveSection = document.getElementById(forecastType);
    if (newActiveSection) newActiveSection.classList.add('active');
    if (forecastType === 'map-section' && state.map) {
        setTimeout(() => state.map.invalidateSize(), 10);
    }
}

function handleForecastItemClick(event, type) {
    const itemEl = event.target.closest('.hourly-forecast-item, .daily-forecast-item');
    if (!itemEl) return;
    const timestamp = parseInt(itemEl.dataset.timestamp, 10);
    const dataSet = (type === 'hourly') ? state.currentWeather.hourly : state.currentWeather.daily;
    const data = dataSet.find(item => item.dt === timestamp);
    if (data) {
        ui.showDetailsModal(data, type, translations[state.currentLang]);
    }
}

// --- Logika Ulubionych ---
function loadFavorites() {
    state.favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
    ui.renderFavorites(state.favorites, state.currentLocation, translations[state.currentLang]);
}

function saveFavorites() {
    localStorage.setItem('weatherFavorites', JSON.stringify(state.favorites));
}

function toggleFavorite() {
    if (!state.currentLocation) return;
    const locationId = `${state.currentLocation.lat},${state.currentLocation.lon}`;
    const index = state.favorites.findIndex(fav => `${fav.lat},${fav.lon}` === locationId);
    
    if (index > -1) {
        state.favorites.splice(index, 1);
    } else {
        if (state.favorites.length >= 5) {
            console.warn("Max favorites reached."); // Można dodać alert w przyszłości
            return;
        }
        state.favorites.push(state.currentLocation);
    }
    
    saveFavorites();
    loadFavorites(); 
    updateFavoriteButtonState();
}

function handleFavoriteClick(event) {
    const btn = event.target.closest('.favorite-location-btn');
    if (!btn) return;
    const cityName = btn.dataset.city;
    if (cityName) {
        document.getElementById('city-input').value = cityName;
        handleSearch(cityName);
    }
}

function updateFavoriteButtonState() {
    if (!state.currentLocation) return;
    const locationId = `${state.currentLocation.lat},${state.currentLocation.lon}`;
    const isFav = state.favorites.some(fav => `${fav.lat},${fav.lon}` === locationId);
    ui.updateFavoriteButtonState(isFav, state.favorites.length);
}

// --- Logika Mapy ---
function initMap() {
    if (state.map) return;
    try {
        state.map = L.map('map', { zoomControl: false }).setView([51.75, 19.45], 10);
        state.map.createPane('precipitationPane');
        state.map.getPane('precipitationPane').style.zIndex = 650;
        
        state.lightTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' });
        state.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO' });
        
        updateMapTileLayer();
        
        const proxyUrl = `/.netlify/functions/map-tiles/{z}/{x}/{y}`;
        state.precipitationLayer = L.tileLayer(proxyUrl, {
            attribution: '&copy; OpenWeatherMap',
            pane: 'precipitationPane',
            opacity: 0.7
        });
        state.map.addLayer(state.precipitationLayer);

    } catch (error) {
        console.error("Map init error:", error);
        document.getElementById('map').innerHTML = "Map could not be loaded.";
    }
}

function updateMapTileLayer() {
    if (!state.map) return;
    const isDarkMode = document.body.classList.contains('dark-mode');
    const targetLayer = isDarkMode ? state.darkTileLayer : state.lightTileLayer;
    const otherLayer = isDarkMode ? state.lightTileLayer : state.darkTileLayer;

    if (state.map.hasLayer(otherLayer)) state.map.removeLayer(otherLayer);
    if (!state.map.hasLayer(targetLayer)) {
        state.map.addLayer(targetLayer);
        targetLayer.setZIndex(1); 
    }
}

function updateMap(lat, lon, cityName, zoomLevel = 13) {
    if (state.map) {
        state.map.flyTo([lat, lon], zoomLevel);
        if (state.marker) state.map.removeLayer(state.marker);
        state.marker = L.marker([lat, lon]).addTo(state.map);
        if (cityName) state.marker.bindPopup(cityName).openPopup();
    }
}
