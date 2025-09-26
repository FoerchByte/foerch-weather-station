/**
 * --- PL ---
 * Główny plik aplikacji (Orkiestrator).
 * Łączy wszystkie moduły (UI, API, Tłumaczenia) i zarządza stanem aplikacji
 * oraz główną logiką biznesową.
 * --- EN ---
 * Main application file (Orchestrator).
 * Connects all modules (UI, API, Translations) and manages the application state
 * and main business logic.
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
    currentLang: 'pl',
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
    localStorage.setItem('theme', theme);
    if (state.map) updateMapTileLayer();
}

function toggleTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    setTheme(isDarkMode ? 'light' : 'dark');
}


// --- Inicjalizacja Aplikacji / Application Initialization ---

setTheme(localStorage.getItem('theme') || 'light');

document.addEventListener('DOMContentLoaded', () => {
    ui.initUI();
    initMap();
    initPrecipitationLayer();
    loadFavorites();
    bindEvents();
    
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        document.getElementById('city-input').value = lastCity;
        handleSearch(lastCity);
    } else if (state.favorites.length > 0) {
        handleSearch(state.favorites[0].name);
    } else {
        ui.showInitialState();
    }
});

// --- Powiązanie Eventów / Event Binding ---

function bindEvents() {
    const dom = {
        searchBtn: document.getElementById('search-weather-btn'),
        cityInput: document.getElementById('city-input'),
        geoBtn: document.getElementById('geolocation-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        forecastSwitcher: document.getElementById('forecast-switcher'),
        hourlyRangeSwitcher: document.getElementById('hourly-range-switcher'),
        hourlyContainer: document.getElementById('hourly-forecast-container'),
        dailyContainer: document.getElementById('daily-forecast-container'),
        modalContainer: document.getElementById('details-modal'),
        favoritesContainer: document.getElementById('favorites-container'),
        hourly: {
            sliderPrevBtn: document.getElementById('hourly-slider-prev'),
            sliderNextBtn: document.getElementById('hourly-slider-next'),
            scrollWrapper: document.querySelector('.hourly-forecast__scroll-wrapper'),
        },
        daily: {
            sliderPrevBtn: document.getElementById('daily-slider-prev'),
            sliderNextBtn: document.getElementById('daily-slider-next'),
            scrollWrapper: document.querySelector('.daily-forecast__scroll-wrapper'),
        }
    };

    dom.searchBtn.addEventListener('click', () => handleSearch(dom.cityInput.value.trim()));
    dom.cityInput.addEventListener('keyup', e => { if (e.key === 'Enter') handleSearch(dom.cityInput.value.trim()); });
    dom.geoBtn.addEventListener('click', handleGeolocation);
    dom.themeToggle.addEventListener('click', toggleTheme);
    
    dom.favoritesContainer.addEventListener('click', handleFavoriteClick);
    
    dom.forecastSwitcher.addEventListener('click', handleForecastSwitch);
    dom.hourlyRangeSwitcher.addEventListener('click', handleHourlyRangeSwitch);
    
    dom.hourly.sliderPrevBtn.addEventListener('click', () => handleSliderScroll(dom.hourly.scrollWrapper, -1, 8));
    dom.hourly.sliderNextBtn.addEventListener('click', () => handleSliderScroll(dom.hourly.scrollWrapper, 1, 8));
    dom.hourly.scrollWrapper.addEventListener('scroll', ui.updateSliderButtons, { passive: true });
    
    // Uruchomienie slidera 4+4 dla prognozy dziennej
    dom.daily.sliderPrevBtn.addEventListener('click', () => handleSliderScroll(dom.daily.scrollWrapper, -1, 4));
    dom.daily.sliderNextBtn.addEventListener('click', () => handleSliderScroll(dom.daily.scrollWrapper, 1, 4));
    dom.daily.scrollWrapper.addEventListener('scroll', ui.updateDailySliderButtons, { passive: true });
    
    dom.hourlyContainer.addEventListener('click', handleHourlyItemClick);
    dom.dailyContainer.addEventListener('click', handleDailyItemClick);
    
    dom.modalContainer.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]')) {
            ui.hideDetailsModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dom.modalContainer.classList.contains('is-visible')) {
            ui.hideDetailsModal();
        }
    });

    window.addEventListener('resize', () => {
        if (state.currentWeather) {
            const t = translations[state.currentLang];
            ui.renderHourlyForecast(state.currentWeather.hourly, state.currentHourlyRange, t);
            ui.updateSliderButtons();
            ui.updateDailySliderButtons();
        }
    });
}

// --- Główna Logika / Main Logic ---

async function handleSearch(query) {
    if (!query) return;

    const buttonToLoad = (typeof query === 'object' && query.latitude) 
        ? document.getElementById('geolocation-btn') 
        : document.getElementById('search-weather-btn');
        
    ui.toggleButtonLoading(buttonToLoad, true);
    ui.showLoadingState();

    try {
        const data = await api.getWeatherData(query);
        state.currentWeather = processWeatherData(data);
        state.currentLocation = data.location;

        if (typeof query === 'string') {
            localStorage.setItem('lastCity', query.trim());
        }
        
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
            () => {
                const t = translations[state.currentLang];
                ui.showError(t.errors.location);
            }
        );
    }
}

function processWeatherData(data) {
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
            sunrise: new Date(data.current.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sunset: new Date(data.current.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            moonrise: new Date(data.daily[0].moonrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            moonset: new Date(data.daily[0].moonset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
    };
}

function updateFullUI(query) {
    const t = translations[state.currentLang];
    
    ui.renderCurrentWeather(state.currentWeather, t);
    
    document.getElementById('add-favorite-btn').addEventListener('click', toggleFavorite);
    
    ui.renderFavorites(state.favorites, state.currentLocation);
    updateFavoriteButtonState();
    
    ui.renderWeatherAlerts(state.currentWeather, t);
    ui.renderMinutelyForecast(state.currentWeather.minutely);
    ui.renderHourlyForecast(state.currentWeather.hourly, state.currentHourlyRange, t);
    ui.renderDailyForecast(state.currentWeather.daily, t);
    
    ui.updateDailySliderButtons();

    ui.showContent();
    
    const isGeoSearch = typeof query === 'object' && query.latitude;
    const zoomLevel = isGeoSearch ? 17 : 13;
    
    setTimeout(() => {
        if (state.map) {
            state.map.invalidateSize();
            updateMap(state.currentLocation.lat, state.currentLocation.lon, state.currentLocation.name, zoomLevel);
        }
    }, 0);
}


// --- Handlery Zdarzeń UI / UI Event Handlers ---

function handleForecastSwitch(event) {
    const btn = event.target.closest('button');
    if (!btn) return;
    const forecastType = btn.dataset.forecast;
    
    document.getElementById('forecasts-container').className = `show-${forecastType}`;
    
    document.getElementById('forecast-switcher').querySelectorAll('button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
}

function handleHourlyRangeSwitch(event) {
    const btn = event.target.closest('button');
    if (!btn || btn.classList.contains('active')) return;
    
    state.currentHourlyRange = parseInt(btn.dataset.range, 10);
    
    document.getElementById('hourly-range-switcher').querySelector('.active').classList.remove('active');
    btn.classList.add('active');
    
    const t = translations[state.currentLang];
    ui.renderHourlyForecast(state.currentWeather.hourly, state.currentHourlyRange, t);
}

function handleSliderScroll(scrollWrapper, direction, itemsToScroll) {
    const item = scrollWrapper.querySelector('.hourly-forecast__item, .daily-forecast__day');
    if (!item) return;

    const gap = 16; // 1rem
    const scrollAmount = (item.offsetWidth + gap) * itemsToScroll * direction;
    
    scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

function handleHourlyItemClick(event) {
    const itemEl = event.target.closest('.hourly-forecast__item');
    if (!itemEl) return;
    const timestamp = parseInt(itemEl.dataset.timestamp, 10);
    const hourData = state.currentWeather.hourly.find(item => item.dt === timestamp);
    if (hourData) {
        const t = translations[state.currentLang];
        ui.showDetailsModal(hourData, 'hourly', t);
    }
}

function handleDailyItemClick(event) {
    const itemEl = event.target.closest('.daily-forecast__day');
    if (!itemEl) return;
    const timestamp = parseInt(itemEl.dataset.timestamp, 10);
    const dayData = state.currentWeather.daily.find(item => item.dt === timestamp);
    if (dayData) {
        const t = translations[state.currentLang];
        ui.showDetailsModal(dayData, 'daily', t);
    }
}

// --- Logika Ulubionych / Favorites Logic ---

function loadFavorites() {
    state.favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
    ui.renderFavorites(state.favorites, state.currentLocation);
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
            console.warn("Maksymalna liczba ulubionych (5) została osiągnięta.");
            return;
        }
        state.favorites.push(state.currentLocation);
    }
    
    saveFavorites();
    ui.renderFavorites(state.favorites, state.currentLocation);
    updateFavoriteButtonState();
}

function updateFavoriteButtonState() {
    if (!state.currentLocation) return;
    const locationId = `${state.currentLocation.lat},${state.currentLocation.lon}`;
    const isFav = state.favorites.some(fav => `${fav.lat},${fav.lon}` === locationId);
    ui.updateFavoriteButtonState(isFav, state.favorites.length);
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


// --- Logika Mapy / Map Logic ---

function initMap() {
    state.map = L.map('map').setView([51.75, 19.45], 10);
    
    state.map.createPane('precipitationPane');
    state.map.getPane('precipitationPane').style.zIndex = 650;
    
    state.lightTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' });
    state.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO' });
    updateMapTileLayer();
}

function initPrecipitationLayer() {
    const proxyUrl = `/.netlify/functions/map-tiles/{z}/{x}/{y}`;
    state.precipitationLayer = L.tileLayer(proxyUrl, {
        attribution: '&copy; OpenWeatherMap',
        pane: 'precipitationPane'
    });
    state.map.addLayer(state.precipitationLayer);
}

function updateMapTileLayer() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const targetLayer = isDarkMode ? state.darkTileLayer : state.lightTileLayer;
    const otherLayer = isDarkMode ? state.lightTileLayer : state.darkTileLayer;
    if (state.map.hasLayer(otherLayer)) state.map.removeLayer(otherLayer);
    if (!state.map.hasLayer(targetLayer)) state.map.addLayer(targetLayer);
}

function updateMap(lat, lon, cityName, zoomLevel = 13) {
    if (state.map) {
        state.map.flyTo([lat, lon], zoomLevel);
        if (state.marker) state.map.removeLayer(state.marker);
        state.marker = L.marker([lat, lon]).addTo(state.map).bindPopup(cityName).openPopup();
    }
}
