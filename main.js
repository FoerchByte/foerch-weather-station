/**
 * --- PL ---
 * Główny plik aplikacji v2.0 (Orkiestrator).
 * Łączy wszystkie moduły i zarządza stanem oraz logiką.
 * Wersja zaktualizowana o logikę mapy Leaflet i pełne przetwarzanie danych.
 * --- EN ---
 * Main application file v2.0 (Orchestrator).
 * Connects all modules and manages state and logic.
 * Updated version with Leaflet map logic and full data processing.
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
    
    // ZMIANA: Przywrócenie stanu mapy
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
    // ZMIANA: Aktualizuj kafelki mapy po zmianie motywu
    if (state.map) updateMapTileLayer();
}

function toggleTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    setTheme(isDarkMode ? 'light' : 'dark');
}


// --- Inicjalizacja Aplikacji / Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // ZMIANA: Ustawienie motywu na 'dark' jako domyślny, jeśli nic nie ma w localStorage
    setTheme(localStorage.getItem('theme') || 'dark');
    ui.initUI();
    
    // ZMIANA: Inicjalizacja mapy
    initMap(); 
    
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
    addSafeListener(domElements.hourlySliderPrev, 'click', () => handleSliderScroll(domElements.hourlyScrollWrapper, -1));
    addSafeListener(domElements.hourlySliderNext, 'click', () => handleSliderScroll(domElements.hourlyScrollWrapper, 1));
    
    // ZMIANA: Usunięto listenery dla slidera dziennego, bo to teraz siatka
    
    addSafeListener(domElements.forecastSwitcherMobile, 'click', handleMobileForecastSwitch);
    
    // ZMIANA: Dodano nasłuch na kliknięcia w kontenerach prognoz (delegacja zdarzeń)
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
        const data = await api.getWeatherData(query);
        state.currentWeather = processWeatherData(data);
        state.currentLocation = data.location;
        if (typeof query === 'string') localStorage.setItem('lastCity', query);
        
        updateFullUI(query); // ZMIANA: Przekazanie query do updateFullUI
        
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

// ZMIANA: Przywrócenie pełnej logiki przetwarzania danych z v1.0
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

// ZMIANA: Dodano przekazanie 'query' do funkcji
function updateFullUI(query) {
    const t = translations[state.currentLang];
    
    ui.showContent();
    
    ui.renderCurrentWeather(state.currentWeather, t);
    ui.renderWeatherAlerts(state.currentWeather, t);
    ui.renderMinutelyForecast(state.currentWeather.minutely, t);
    ui.renderHourlyForecast(state.currentWeather.hourly, state.currentHourlyRange, t);
    ui.renderDailyForecast(state.currentWeather.daily, t);
    
    loadFavorites(); 
    updateFavoriteButtonState();

    // ZMIANA: Aktualizacja mapy po załadowaniu danych
    const isGeoSearch = typeof query === 'object' && query.latitude;
    const zoomLevel = isGeoSearch ? 17 : 13;
    
    setTimeout(() => {
        if (state.map) {
            state.map.invalidateSize();
            updateMap(state.currentLocation.lat, state.currentLocation.lon, state.currentLocation.name, zoomLevel);
        }
    }, 0); // Opóźnienie, aby DOM zdążył się przerysować
}


// --- Handlery Zdarzeń UI ---
function handleHourlyRangeSwitch(event) {
    const btn = event.target.closest('button');
    if (!btn || btn.classList.contains('active')) return;
    
    state.currentHourlyRange = parseInt(btn.dataset.range, 10);
    
    const switcher = document.querySelector('.hourly-range-switcher');
    if (switcher) {
        switcher.querySelector('.active')?.classList.remove('active');
    }
    btn.classList.add('active');
    
    ui.renderHourlyForecast(state.currentWeather.hourly, state.currentHourlyRange, translations[state.currentLang]);
}

function handleSliderScroll(scrollWrapper, direction) {
    if (!scrollWrapper) return;
    // ZMIANA: Przewijanie o 80% szerokości kontenera
    const scrollAmount = (scrollWrapper.clientWidth * 0.8) * direction;
    scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

function handleMobileForecastSwitch(event) {
    const btn = event.target.closest('button');
    if (!btn || btn.classList.contains('active')) return;

    const forecastType = btn.dataset.forecast; // np. "hourly-forecast-wrapper" lub "map-section"
    
    document.querySelector('.forecast-switcher-mobile .active')?.classList.remove('active');
    btn.classList.add('active');

    document.querySelectorAll('.forecast-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const newActiveSection = document.getElementById(forecastType);
    if (newActiveSection) {
        newActiveSection.classList.add('active');
    }

    // ZMIANA: Przelicz rozmiar mapy, jeśli została aktywowana
    if (forecastType === 'map-section' && state.map) {
        setTimeout(() => state.map.invalidateSize(), 10);
    }
}

function handleForecastItemClick(event, type) {
    // ZMIANA: Poprawione selektory dla v2.0
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
    ui.updateFavoriteButtonState(isFav, state.favorites.length); // ZMIANA: Przekazanie liczby ulubionych
}

// --- ZMIANA: Przywrócenie logiki mapy z v1.0 ---

/**
 * --- PL --- Inicjalizuje mapę Leaflet, warstwy kafelków i warstwę opadów.
 * --- EN --- Initializes the Leaflet map, tile layers, and precipitation layer.
 */
function initMap() {
    if (state.map) return; // Zapobiegaj podwójnej inicjalizacji
    
    try {
        state.map = L.map('map', {
            zoomControl: false // Wyłącz domyślne kontrolki zoomu, jeśli chcesz dodać własne
        }).setView([51.75, 19.45], 10);
        
        // Pane, aby warstwa opadów była nad mapą bazową
        state.map.createPane('precipitationPane');
        state.map.getPane('precipitationPane').style.zIndex = 650;
        
        // Warstwy kafelków dla motywu jasnego i ciemnego
        state.lightTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
            attribution: '&copy; OpenStreetMap' 
        });
        state.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
            attribution: '&copy; OpenStreetMap &copy; CARTO' 
        });
        
        updateMapTileLayer(); // Ustawia warstwę kafelków zgodną z motywem
        
        // Warstwa opadów (korzysta z proxy)
        const proxyUrl = `/.netlify/functions/map-tiles/{z}/{x}/{y}`;
        state.precipitationLayer = L.tileLayer(proxyUrl, {
            attribution: '&copy; OpenWeatherMap',
            pane: 'precipitationPane',
            opacity: 0.7
        });
        state.map.addLayer(state.precipitationLayer);

    } catch (error) {
        console.error("Błąd podczas inicjalizacji mapy:", error);
        document.getElementById('map').innerHTML = "Nie udało się załadować mapy.";
    }
}

/**
 * --- PL --- Aktualizuje warstwę kafelków mapy (jasna/ciemna) w zależności od motywu.
 * --- EN --- Updates the map tile layer (light/dark) based on the theme.
 */
function updateMapTileLayer() {
    if (!state.map) return;
    const isDarkMode = document.body.classList.contains('dark-mode');
    const targetLayer = isDarkMode ? state.darkTileLayer : state.lightTileLayer;
    const otherLayer = isDarkMode ? state.lightTileLayer : state.darkTileLayer;

    if (state.map.hasLayer(otherLayer)) {
        state.map.removeLayer(otherLayer);
    }
    if (!state.map.hasLayer(targetLayer)) {
        state.map.addLayer(targetLayer);
        // Upewnij się, że warstwa bazowa jest pod opadami
        targetLayer.setZIndex(1); 
    }
}

/**
 * --- PL --- Aktualizuje widok mapy (pozycja i marker) do nowej lokalizacji.
 * --- EN --- Updates the map view (position and marker) to the new location.
 */
function updateMap(lat, lon, cityName, zoomLevel = 13) {
    if (state.map) {
        state.map.flyTo([lat, lon], zoomLevel);
        
        if (state.marker) {
            state.map.removeLayer(state.marker);
        }
        
        state.marker = L.marker([lat, lon]).addTo(state.map);
        
        if (cityName) {
            state.marker.bindPopup(cityName).openPopup();
        }
    }
}
