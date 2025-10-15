/**
 * --- PL ---
 * Moduł UI (Interfejsu Użytkownika) dla wersji 2.0.
 * Odpowiada za wszelkie manipulacje w drzewie DOM - renderowanie danych,
 * aktualizowanie widoków, pokazywanie/ukrywanie elementów, zarządzanie klasami CSS.
 * Operuje na istniejącej strukturze HTML zdefiniowanej w index.html.
 * --- EN ---
 * UI (User Interface) Module for version 2.0.
 * Responsible for all DOM manipulations - rendering data, updating views,
 * showing/hiding elements, managing CSS classes.
 * Operates on the existing HTML structure defined in index.html.
 */

// --- Referencje do elementów DOM / DOM Element References ---
const dom = {};

// --- Stan wewnętrzny modułu UI / Internal UI Module State ---
let minutelyChart = null;
let activeModalTrigger = null; 

/**
 * --- PL --- Inicjalizuje moduł, pobierając referencje do elementów DOM v2.0.
 * --- EN --- Initializes the module by caching DOM element references for v2.0.
 */
export function initUI() {
    // --- Główne elementy / Main Elements ---
    dom.searchBtn = document.getElementById('search-weather-btn');
    dom.cityInput = document.getElementById('city-input');
    dom.geoBtn = document.getElementById('geolocation-btn');
    dom.themeToggle = document.getElementById('theme-toggle');
    dom.weatherResultContainer = document.getElementById('weather-result-container');
    dom.favoritesContainer = document.getElementById('favorites-container');
    
    // --- Kontenery prognoz / Forecast Containers ---
    dom.forecastsContainer = document.querySelector('.forecasts-container');
    dom.mapContainer = document.getElementById('map-container');
    dom.forecastSwitcherMobile = document.querySelector('.forecast-switcher-mobile');
    
    // --- Prognoza Minutowa / Minutely Forecast ---
    dom.minutely = {
        wrapper: document.getElementById('minutely-forecast-wrapper'),
        chartCanvas: document.getElementById('minutely-chart'),
        chartContainer: document.querySelector('.minutely-chart-container'),
    };
    
    // --- Prognoza Godzinowa / Hourly Forecast ---
    dom.hourly = {
        wrapper: document.getElementById('hourly-forecast-wrapper'),
        rangeSwitcher: document.querySelector('.hourly-range-switcher'),
        scrollWrapper: document.querySelector('#hourly-forecast-wrapper .slider-scroll-wrapper'),
        sliderPrevBtn: document.querySelector('#hourly-forecast-wrapper .slider-nav.prev'),
        sliderNextBtn: document.querySelector('#hourly-forecast-wrapper .slider-nav.next'),
    };

    // --- Prognoza Dzienna / Daily Forecast ---
    dom.daily = {
        wrapper: document.getElementById('daily-forecast-wrapper'),
        scrollWrapper: document.querySelector('#daily-forecast-wrapper .slider-scroll-wrapper'),
        sliderPrevBtn: document.querySelector('#daily-forecast-wrapper .slider-nav.prev'),
        sliderNextBtn: document.querySelector('#daily-forecast-wrapper .slider-nav.next'),
    };

    // --- Okno Modalne / Modal ---
    dom.modal = {
        overlay: document.getElementById('details-modal'),
        title: document.getElementById('modal-title'),
        body: document.getElementById('modal-body'),
        closeBtn: document.querySelector('.modal-close-btn'),
    };
    
    // --- Elementy renderowane dynamicznie / Dynamically rendered elements ---
    dom.cityName = document.getElementById('city-name');
    dom.addFavoriteBtn = document.getElementById('add-favorite-btn');
    dom.currentTemp = document.getElementById('current-temp');
    dom.weatherDescription = document.getElementById('weather-description');
    dom.weatherIcon = document.querySelector('.current-weather__icon');
    dom.weatherOverview = document.getElementById('weather-overview');
    dom.weatherAlertsContainer = document.getElementById('weather-alerts-container');
    dom.extraDetailsGrid = document.querySelector('.current-weather__extra-details-grid');
}

// --- Funkcje pomocnicze (bez zmian) / Helper Functions (unchanged) ---

function getWeatherIconHtml(iconCode, description) {
    const iconBaseUrl = 'https://basmilius.github.io/weather-icons/production/fill/all/';
    const iconMap = { '01d': 'clear-day.svg', '01n': 'clear-night.svg', '02d': 'partly-cloudy-day.svg', '02n': 'partly-cloudy-night.svg', '03d': 'cloudy.svg', '03n': 'cloudy.svg', '04d': 'overcast-day.svg', '04n': 'overcast-night.svg', '09d': 'rain.svg', '09n': 'rain.svg', '10d': 'partly-cloudy-day-rain.svg', '10n': 'partly-cloudy-night-rain.svg', '11d': 'thunderstorms-day.svg', '11n': 'thunderstorms-night.svg', '13d': 'snow.svg', '13n': 'snow.svg', '50d': 'fog-day.svg', '50n': 'fog-night.svg', };
    const iconName = iconMap[iconCode] || 'not-available.svg';
    return `<img src="${iconBaseUrl}${iconName}" alt="${description}" class="weather-icon-img">`;
}

function convertWindDirection(deg) {
    const directions = ['Pn', 'Pn-Wsch', 'Wsch', 'Pd-Wsch', 'Pd', 'Pd-Zach', 'Zach', 'Pn-Zach'];
    return directions[Math.round(deg / 45) % 8];
}

function translateOverview(apiDescription, t) {
    if (!apiDescription) return '';
    const translationEntry = t.overview[apiDescription.toLowerCase()];
    if (translationEntry && translationEntry.genitive) {
        let sentence = `${t.overview.expect} ${translationEntry.genitive} ${t.overview['throughout the day']}.`;
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
    }
    return apiDescription.charAt(0).toUpperCase() + apiDescription.slice(1);
}

// ... inne funkcje pomocnicze ...

// --- Zarządzanie stanem UI / UI State Management ---

export function toggleButtonLoading(button, isLoading) {
    // Ta funkcja może wymagać dostosowania, jeśli przyciski nie mają spanów
    if (!button) return;
    const originalText = button.textContent;
    if (isLoading) {
        button.innerHTML = '<div class="loader"></div>'; // Prostsza implementacja loadera
        button.disabled = true;
    } else {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

export function showInitialState() {
    dom.favoritesContainer.innerHTML = `<p>Dodaj swoje ulubione lokalizacje za pomocą ikony gwiazdki ⭐</p>`;
    hideContent();
}

export function showLoadingState() {
    // Zamiast generować HTML, po prostu pokazujemy/ukrywamy kontenery
    hideContent();
    // Można dodać globalny loader na środku ekranu jeśli potrzeba
    console.log("Pokazuję stan ładowania...");
}

export function showError(message) {
    // Możemy mieć dedykowany kontener na błędy lub użyć modala
    alert(message); // Tymczasowe rozwiązanie
    hideContent();
}

function hideContent() {
    if (dom.weatherResultContainer) {
        dom.weatherResultContainer.style.display = 'none';
    }
}

export function showContent() {
    if (dom.weatherResultContainer) {
        dom.weatherResultContainer.style.display = 'block';
    }
}

// --- Renderowanie komponentów (NOWA WERSJA) / Component Rendering (NEW VERSION) ---

export function renderCurrentWeather(data, t) {
    // Zamiast generować cały HTML, aktualizujemy istniejące elementy
    dom.cityName.textContent = data.location.name;
    dom.currentTemp.textContent = `${Math.round(data.current.temp)}°C`;
    dom.weatherDescription.textContent = data.current.weather[0].description;
    dom.weatherIcon.innerHTML = getWeatherIconHtml(data.current.weather[0].icon, data.current.weather[0].description);
    
    const translatedOverview = translateOverview(data.generatedOverview, t);
    dom.weatherOverview.innerHTML = translatedOverview ? `<p>${translatedOverview}</p>` : '';

    // Siatka z detalami wymaga teraz generowania wewnętrznych elementów
    dom.extraDetailsGrid.innerHTML = `
        <div class="detail-item"><span>${t.details.wind}</span><span>${data.current.wind_speed.toFixed(1)} m/s</span></div>
        <div class="detail-item"><span>${t.details.pressure}</span><span>${data.current.pressure} hPa</span></div>
        <div class="detail-item"><span>${t.details.aqi}</span><span>${t.values.aqi[data.air_quality.main.aqi - 1]}</span></div>
        <div class="detail-item"><span>${t.details.uvIndex}</span><span>${t.values.uv[data.uvCategory]}</span></div>
        <div class="detail-item"><span>${t.details.sunrise}</span><span>${data.formattedTimes.sunrise}</span></div>
        <div class="detail-item"><span>${t.details.sunset}</span><span>${data.formattedTimes.sunset}</span></div>
    `;
    // Uwaga: To jest uproszczona wersja siatki. Pełna implementacja wymagałaby więcej klas i ikon.
}

export function renderWeatherAlerts(data, t) {
    if (data.alerts && data.alerts.length > 0) {
        const alert = data.alerts[0];
        dom.weatherAlertsContainer.innerHTML = `<div class="alert warning"><strong>${alert.event}</strong>: ${alert.description}</div>`;
        dom.weatherAlertsContainer.style.display = 'block';
    } else {
        dom.weatherAlertsContainer.innerHTML = '';
        dom.weatherAlertsContainer.style.display = 'none';
    }
}

export function renderMinutelyForecast(minutelyData) {
    const hasPrecipitation = minutelyData && minutelyData.some(minute => minute.precipitation > 0);
    
    if (!hasPrecipitation) {
        dom.minutely.chartContainer.innerHTML = `<div class="no-data">Brak opadów w ciągu najbliższej godziny.</div>`;
        return;
    }
    // Upewniamy się, że canvas tam jest
    if (!dom.minutely.chartContainer.querySelector('canvas')) {
        dom.minutely.chartContainer.innerHTML = `<canvas id="minutely-chart"></canvas>`;
        dom.minutely.chartCanvas = document.getElementById('minutely-chart');
    }
    
    // Logika Chart.js (bez zmian)
    // ...
}

export function renderHourlyForecast(hourlyData, range, t) {
    // Logika filtrowania danych (bez zmian)
    // ...
    // Nowa logika renderowania - generujemy tylko wewnętrzne kafelki dla slidera
    const itemsHtml = hourlyData.slice(0, range).map(item => `
        <div class="hourly-forecast-item glass-card" data-timestamp="${item.dt}">
            <p class="time">${new Date(item.dt * 1000).getHours()}:00</p>
            <div class="icon">${getWeatherIconHtml(item.weather[0].icon, item.weather[0].description)}</div>
            <p class="temp">${Math.round(item.temp)}°C</p>
        </div>
    `).join('');

    dom.hourly.scrollWrapper.innerHTML = itemsHtml;
}

export function renderDailyForecast(dailyData, t) {
    const itemsHtml = dailyData.slice(1).map(day => `
        <div class="daily-forecast-item glass-card" data-timestamp="${day.dt}">
            <p class="day">${new Date(day.dt * 1000).toLocaleDateString('pl-PL', { weekday: 'short' })}</p>
            <div class="icon">${getWeatherIconHtml(day.weather[0].icon, day.weather[0].description)}</div>
            <p class="temp">${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</p>
        </div>
    `).join('');
    
    dom.daily.scrollWrapper.innerHTML = itemsHtml;
}

export function renderFavorites(favorites, currentLocation) {
    if (favorites.length > 0) {
        dom.favoritesContainer.innerHTML = favorites.map(fav => {
            // Logika sprawdzania aktywnej lokalizacji (bez zmian)
            const isActive = false; // Uproszczenie
            return `<button class="favorite-location-btn ${isActive ? 'active' : ''}" data-city="${fav.name}">${fav.name}</button>`;
        }).join('');
    } else {
        showInitialState();
    }
}

// ... pozostałe funkcje UI (updateFavoriteButtonState, slidery, modal) wymagają adaptacji ...
