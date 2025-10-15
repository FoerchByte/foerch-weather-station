/**
 * --- PL ---
 * Główny plik aplikacji v2.0 (Orkiestrator).
 * Łączy wszystkie moduły i zarządza stanem oraz logiką.
 * Wersja dostosowana do nowej struktury HTML i modułu UI.
 * --- EN ---
 * Main application file v2.0 (Orchestrator).
 * Connects all modules and manages state and logic.
 * Version adapted for the new HTML structure and UI module.
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
    // if (state.map) updateMapTileLayer(); // Odkomentuj, gdy mapa będzie aktywna
}

function toggleTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    setTheme(isDarkMode ? 'light' : 'dark');
}


// --- Inicjalizacja Aplikacji / Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setTheme(localStorage.getItem('theme') || 'light');
    ui.initUI();
    // initMap(); // Mapa wymaga Leaflet, można ją dodać później
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

// --- Powiązanie Eventów (Wersja Finalna) / Event Binding (Final Version) ---
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
        hourlyScrollWrapper: document.querySelector('#hourly-forecast-wrapper .slider-scroll-wrapper'),
        dailySliderPrev: document.querySelector('#daily-forecast-wrapper .slider-nav.prev'),
        dailySliderNext: document.querySelector('#daily-forecast-wrapper .slider-nav.next'),
        dailyScrollWrapper: document.querySelector('#daily-forecast-wrapper .slider-scroll-wrapper'),
        forecastSwitcherMobile: document.querySelector('.forecast-switcher-mobile'),
    };

    // Funkcja pomocnicza do bezpiecznego dodawania eventów
    const addSafeListener = (element, event, handler) => {
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element for event '${event}' not found.`);
        }
    };

    addSafeListener(domElements.searchBtn, 'click', () => handleSearch(domElements.cityInput.value.trim()));
    addSafeListener(domElements.cityInput, 'keyup', e => { if (e.key === 'Enter') handleSearch(domElements.cityInput.value.trim()); });
    addSafeListener(domElements.geoBtn, 'click', handleGeolocation);
    addSafeListener(domElements.themeToggle, 'click', toggleTheme);
    addSafeListener(domElements.favoritesContainer, 'click', handleFavoriteClick);
    addSafeListener(domElements.addFavoriteBtn, 'click', toggleFavorite);
    addSafeListener(domElements.hourlyRangeSwitcher, 'click', handleHourlyRangeSwitch);
    addSafeListener(domElements.hourlySliderPrev, 'click', () => handleSliderScroll(domElements.hourlyScrollWrapper, -1));
    addSafeListener(domElements.hourlySliderNext, 'click', () => handleSliderScroll(domElements.hourlyScrollWrapper, 1));
    addSafeListener(domElements.dailySliderPrev, 'click', () => handleSliderScroll(domElements.dailyScrollWrapper, -1));
    addSafeListener(domElements.dailySliderNext, 'click', () => handleSliderScroll(domElements.dailyScrollWrapper, 1));
    addSafeListener(domElements.forecastSwitcherMobile, 'click', handleMobileForecastSwitch);
}


// --- Główna Logika (z drobnymi zmianami) / Main Logic (with minor changes) ---
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
        if (typeof query === 'string') localStorage.setItem('lastCity', query);
        
        updateFullUI();
        
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
    }
}

function processWeatherData(data) {
    // Przywrócono pełną logikę przetwarzania danych
    return {
        ...data,
        generatedOverview: data.daily[0].weather[0].description,
        roadCondition: (() => {
            const mainWeather = data.current.weather[0].main;
            if (data.current.temp > 2 && !['Rain', 'Snow', 'Drizzle'].includes(mainWeather)) return { key: 'dry', class: 'roadDry' };
            if (data.current.temp <= 2) return { key: 'icy', class: 'roadIcy' };
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
        }
    };
}

function updateFullUI() {
    const t = translations[state.currentLang];
    
    ui.showContent(); // Odkrywamy kontener z wynikami
    
    ui.renderCurrentWeather(state.currentWeather, t);
    ui.renderWeatherAlerts(state.currentWeather, t);
    ui.renderMinutelyForecast(state.currentWeather.minutely);
    ui.renderHourlyForecast(state.currentWeather.hourly, state.currentHourlyRange, t);
    ui.renderDailyForecast(state.currentWeather.daily, t);
    
    loadFavorites(); // Odświeżamy ulubione, żeby podświetlić aktywną
    // updateFavoriteButtonState(); // Tę funkcję zintegrujemy później
    // updateMap(state.currentLocation.lat, state.currentLocation.lon, state.currentLocation.name);
}


// --- Handlery Zdarzeń UI (NOWE) / UI Event Handlers (NEW) ---
function handleHourlyRangeSwitch(event) {
    const btn = event.target.closest('button');
    if (!btn || btn.classList.contains('active')) return;
    
    state.currentHourlyRange = parseInt(btn.dataset.range, 10);
    
    document.querySelector('.hourly-range-switcher .active').classList.remove('active');
    btn.classList.add('active');
    
    ui.renderHourlyForecast(state.currentWeather.hourly, state.currentHourlyRange, translations[state.currentLang]);
}

function handleSliderScroll(scrollWrapper, direction) {
    if (!scrollWrapper) return;
    const scrollAmount = scrollWrapper.clientWidth * 0.8 * direction;
    scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

function handleMobileForecastSwitch(event) {
    const btn = event.target.closest('button');
    if (!btn || btn.classList.contains('active')) return;

    const forecastType = btn.dataset.forecast;
    
    const currentActiveBtn = document.querySelector('.forecast-switcher-mobile .active');
    if(currentActiveBtn) currentActiveBtn.classList.remove('active');
    btn.classList.add('active');

    // Pokazujemy/ukrywamy odpowiednie sekcje za pomocą klas
    document.querySelectorAll('.forecast-section').forEach(section => {
        section.style.display = 'none';
    });
    const sectionToShow = document.getElementById(`${forecastType}-forecast-wrapper`);
    if(sectionToShow) sectionToShow.style.display = 'block';
}

// --- Logika Ulubionych (bez zmian) / Favorites Logic (unchanged) ---
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
            console.warn("Maksymalna liczba ulubionych osiągnięta.");
            return;
        }
        state.favorites.push(state.currentLocation);
    }
    
    saveFavorites();
    loadFavorites(); // Prosty sposób na odświeżenie widoku
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

