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

// --- Inicjalizacja Aplikacji / Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
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

// --- Powiązanie Eventów (NOWA WERSJA) / Event Binding (NEW VERSION) ---
function bindEvents() {
    const dom = { // Ponowne pobranie referencji dla czytelności
        searchBtn: document.getElementById('search-weather-btn'),
        cityInput: document.getElementById('city-input'),
        geoBtn: document.getElementById('geolocation-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        favoritesContainer: document.getElementById('favorites-container'),
        hourly: {
            rangeSwitcher: document.querySelector('.hourly-range-switcher'),
            sliderPrevBtn: document.querySelector('#hourly-forecast-wrapper .slider-nav.prev'),
            sliderNextBtn: document.querySelector('#hourly-forecast-wrapper .slider-nav.next'),
            scrollWrapper: document.querySelector('#hourly-forecast-wrapper .slider-scroll-wrapper'),
        },
        daily: {
            sliderPrevBtn: document.querySelector('#daily-forecast-wrapper .slider-nav.prev'),
            sliderNextBtn: document.querySelector('#daily-forecast-wrapper .slider-nav.next'),
            scrollWrapper: document.querySelector('#daily-forecast-wrapper .slider-scroll-wrapper'),
        },
        modal: {
            overlay: document.getElementById('details-modal'),
            closeBtn: document.querySelector('.modal-close-btn'),
        },
        forecastSwitcherMobile: document.querySelector('.forecast-switcher-mobile'),
    };

    dom.searchBtn.addEventListener('click', () => handleSearch(dom.cityInput.value.trim()));
    dom.cityInput.addEventListener('keyup', e => { if (e.key === 'Enter') handleSearch(dom.cityInput.value.trim()); });
    dom.geoBtn.addEventListener('click', handleGeolocation);
    // dom.themeToggle.addEventListener('click', toggleTheme);
    
    dom.favoritesContainer.addEventListener('click', handleFavoriteClick);

    // Nowe eventy dla sliderów i przełączników
    dom.hourly.rangeSwitcher.addEventListener('click', handleHourlyRangeSwitch);
    dom.hourly.sliderPrevBtn.addEventListener('click', () => handleSliderScroll(dom.hourly.scrollWrapper, -1));
    dom.hourly.sliderNextBtn.addEventListener('click', () => handleSliderScroll(dom.hourly.scrollWrapper, 1));
    
    dom.daily.sliderPrevBtn.addEventListener('click', () => handleSliderScroll(dom.daily.scrollWrapper, -1));
    dom.daily.sliderNextBtn.addEventListener('click', () => handleSliderScroll(dom.daily.scrollWrapper, 1));
    
    if(dom.forecastSwitcherMobile) {
        dom.forecastSwitcherMobile.addEventListener('click', handleMobileForecastSwitch);
    }
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
    }
}

function processWeatherData(data) {
    // Ta funkcja pozostaje praktycznie bez zmian, bo operuje na danych, a nie na DOM
    return {
        ...data,
        generatedOverview: data.daily[0].weather[0].description,
        roadCondition: (() => { /* ... */ return { key: 'dry', class: 'roadDry' }; })(),
        uvCategory: (() => { /* ... */ return 'low'; })(),
        formattedTimes: {
            sunrise: new Date(data.current.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sunset: new Date(data.current.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
    };
}

function updateFullUI(query) {
    const t = translations[state.currentLang];
    
    ui.showContent(); // Odkrywamy kontener z wynikami
    
    ui.renderCurrentWeather(state.currentWeather, t);
    ui.renderWeatherAlerts(state.currentWeather, t);
    ui.renderMinutelyForecast(state.currentWeather.minutely);
    ui.renderHourlyForecast(state.currentWeather.hourly, state.currentHourlyRange, t);
    ui.renderDailyForecast(state.currentWeather.daily, t);
    
    loadFavorites(); // Odświeżamy ulubione, żeby podświetlić aktywną
    document.getElementById('add-favorite-btn').addEventListener('click', toggleFavorite);
    // updateFavoriteButtonState();
    
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
    const scrollAmount = scrollWrapper.clientWidth * 0.8 * direction;
    scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

function handleMobileForecastSwitch(event) {
    const btn = event.target.closest('button');
    if (!btn || btn.classList.contains('active')) return;

    const forecastType = btn.dataset.forecast;
    
    // Zdejmij klasę 'active' z obecnego przycisku i sekcji
    const currentActiveBtn = document.querySelector('.forecast-switcher-mobile .active');
    const currentActiveSection = document.querySelector('.forecast-section.active');
    if(currentActiveBtn) currentActiveBtn.classList.remove('active');
    if(currentActiveSection) currentActiveSection.classList.remove('active');

    // Dodaj klasę 'active' do nowego przycisku i odpowiadającej mu sekcji
    btn.classList.add('active');
    document.getElementById(`${forecastType}-forecast-wrapper`).classList.add('active');
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
        if (state.favorites.length >= 5) return;
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

