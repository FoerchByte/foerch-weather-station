/**
 * --- PL ---
 * Moduł UI (Interfejsu Użytkownika) dla wersji 2.0.
 * Odpowiada za wszelkie manipulacje w drzewie DOM - renderowanie danych,
 * aktualizowanie widoków, pokazywanie/ukrywanie elementów, zarządzanie klasami CSS.
 * Operuje na istniejącej strukturze HTML zdefiniowanej w index.html.
 * Wersja zaktualizowana o pełne renderowanie danych i obsługę modala.
 * --- EN ---
 * UI (User Interface) Module for version 2.0.
 * Responsible for all DOM manipulations - rendering data, updating views,
 * showing/hiding elements, managing CSS classes.
 * Operates on the existing HTML structure defined in index.html.
 * Updated version with full data rendering and modal handling.
 */

// --- Referencje do elementów DOM / DOM Element References ---
const dom = {};
let activeModalTrigger = null; 
let minutelyChart = null;

/**
 * --- PL --- Inicjalizuje moduł UI, pobierając referencje do kluczowych elementów.
 * --- EN --- Initializes the UI module by caching key element references.
 */
export function initUI() {
    dom.weatherResultContainer = document.getElementById('weather-result-container');
    dom.favoritesContainer = document.getElementById('favorites-container');
    dom.cityName = document.getElementById('city-name');
    dom.addFavoriteBtn = document.getElementById('add-favorite-btn');
    dom.currentTemp = document.getElementById('current-temp');
    dom.weatherDescription = document.getElementById('weather-description');
    dom.weatherIcon = document.getElementById('current-weather-icon');
    dom.weatherOverview = document.getElementById('weather-overview');
    dom.weatherAlertsContainer = document.getElementById('weather-alerts-container');
    dom.hourly = {
        scrollWrapper: document.getElementById('hourly-forecast-content'),
    };
    dom.daily = {
        grid: document.getElementById('daily-forecast-content'),
    };
    dom.minutely = {
        container: document.getElementById('minutely-chart-container'),
    };
    dom.modal = {
        overlay: document.getElementById('details-modal'),
        title: document.getElementById('modal-title'),
        body: document.getElementById('modal-body'),
        closeBtn: document.getElementById('modal-close-btn'),
    };
}

// --- Funkcje Pomocnicze / Helper Functions ---

/**
 * --- PL --- Konwertuje metry na sekundę na kilometry na godzinę.
 * --- EN --- Converts meters per second to kilometers per hour.
 */
function convertMsToKmh(ms) {
    return Math.round(ms * 3.6);
}

/**
 * --- PL --- Zwraca pełny HTML dla ikony pogody.
 * --- EN --- Returns the full HTML for the weather icon.
 */
function getWeatherIconHtml(iconCode, description) {
    const iconBaseUrl = 'https://basmilius.github.io/weather-icons/production/fill/all/';
    const iconMap = { '01d': 'clear-day.svg', '01n': 'clear-night.svg', '02d': 'partly-cloudy-day.svg', '02n': 'partly-cloudy-night.svg', '03d': 'cloudy.svg', '03n': 'cloudy.svg', '04d': 'overcast-day.svg', '04n': 'overcast-night.svg', '09d': 'rain.svg', '09n': 'rain.svg', '10d': 'partly-cloudy-day-rain.svg', '10n': 'partly-cloudy-night-rain.svg', '11d': 'thunderstorms-day.svg', '11n': 'thunderstorms-night.svg', '13d': 'snow.svg', '13n': 'snow.svg', '50d': 'fog-day.svg', '50n': 'fog-night.svg', };
    const iconName = iconMap[iconCode] || 'not-available.svg';
    return `<img src="${iconBaseUrl}${iconName}" alt="${description}" class="weather-icon-img" style="width: 100%; height: 100%;">`;
}

/**
 * --- PL --- Tłumaczy opis pogody (summary) na zdanie w dopełniaczu.
 * --- EN --- Translates the weather summary into a genitive sentence.
 */
function translateOverview(apiDescription, t) {
    if (!apiDescription) return '';
    const translationEntry = t.overview[apiDescription.toLowerCase()];
    if (translationEntry && translationEntry.genitive) {
        let sentence = `${t.overview.expect} ${translationEntry.genitive} ${t.overview['throughout the day']}.`;
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
    }
    // Fallback na zwykły opis
    return apiDescription.charAt(0).toUpperCase() + apiDescription.slice(1);
}

/**
 * --- PL --- Tłumaczy nazwy alertów pogodowych.
 * --- EN --- Translates weather alert event names.
 */
function translateAlertEvent(eventName, t) {
    // Prosta implementacja, w przyszłości można rozbudować
    const translations = {
        'Yellow Rain warning': 'Ostrzeżenie: Intensywne opady deszczu',
        'Orange Rain warning': 'Ostrzeżenie 2. stopnia: Ulewne opady deszczu',
        'Yellow Wind warning': 'Ostrzeżenie: Silny wiatr',
        'Orange Wind warning': 'Ostrzeżenie 2. stopnia: Bardzo silny wiatr',
        'Yellow Thunderstorm warning': 'Ostrzeżenie: Burze z gradem',
        'Yellow High temperature warning': 'Ostrzeżenie: Upał',
        'Orange High temperature warning': 'Ostrzeżenie 2. stopnia: Upał',
        'Yellow Low temperature warning': 'Ostrzeżenie: Mróz',
        'Orange Low temperature warning': 'Ostrzeżenie 2. stopnia: Silny mróz',
    };
    return translations[eventName] || eventName;
}


/**
 * --- PL --- Konwertuje stopnie na kierunek wiatru.
 * --- EN --- Converts degrees to wind direction.
 */
function convertWindDirection(deg) {
    const directions = ['Pn', 'Pn-Wsch', 'Wsch', 'Pd-Wsch', 'Pd', 'Pd-Zach', 'Zach', 'Pn-Zach'];
    return directions[Math.round(deg / 45) % 8];
}

// --- Zarządzanie Stanem UI / UI State Management ---

export function toggleButtonLoading(button, isLoading) {
    if (!button) return;
    const span = button.querySelector('span');
    if (isLoading) {
        if(span) span.style.display = 'none';
        if (!button.querySelector('.loader-in-button')) {
             button.insertAdjacentHTML('beforeend', '<div class="loader-in-button"></div>');
        }
        button.disabled = true;
    } else {
        if(span) span.style.display = 'inline';
        const loader = button.querySelector('.loader-in-button');
        if (loader) loader.remove();
        button.disabled = false;
    }
}

export function showInitialState() {
    dom.favoritesContainer.innerHTML = `<p class="favorites-empty-state">Dodaj swoje ulubione lokalizacje za pomocą ikony gwiazdki ⭐</p>`;
    hideContent();
}

export function showLoadingState() { 
    // Na razie tylko ukrywamy stary kontener. Można dodać skeleton.
    hideContent(); 
}

export function showError(message) { 
    // Używamy alertu systemowego, można zastąpić ładniejszym modalem
    alert(message); 
    hideContent(); 
}

function hideContent() { 
    if (dom.weatherResultContainer) dom.weatherResultContainer.style.display = 'none'; 
}

export function showContent() { 
    if (dom.weatherResultContainer) dom.weatherResultContainer.style.display = 'block'; 
}

// --- Renderowanie Komponentów / Component Rendering ---

/**
 * --- PL --- Wypełnia pojedynczy wiersz detali w kafelku.
 * --- EN --- Populates a single detail row in a tile.
 */
function renderDetailRow(containerId, icon, label, value, valueClass = '') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Nie znaleziono kontenera: ${containerId}`);
        return;
    }
    container.innerHTML = `
        <div class="label-container">${icon}<span class="label">${label}</span></div>
        <span class="value ${valueClass}">${value}</span>`;
}

function getCelestialPosition(progress) {
    const angle = Math.PI - (progress / 100) * Math.PI; // Od 180 do 0 stopni
    const radius = 100; // Promień półokręgu
    const centerX = 100;
    const centerY = 100;
    
    const x = centerX + radius * Math.cos(angle);
    const y = centerY - radius * Math.sin(angle); // Odejmujemy, bo oś Y rośnie w dół
    
    return { x, y };
}

function renderSunPathComponent(data, t) {
    if (isNaN(data.sunPathProgress)) return '';
    
    const isDay = data.sunPathProgress >= 0 && data.sunPathProgress <= 100;
    const { x, y } = getCelestialPosition(data.sunPathProgress);
    const style = `left: ${x}px; top: ${y}px; opacity: ${isDay ? 1 : 0.3};`;

    return `
        <div class="sun-path-container">
            <h4 class="celestial-path__title">${t.details.daylightHours}</h4>
            <div class="celestial-path ${!isDay ? 'is-night' : ''}">
                <div class="celestial-path__icon" style="${style}">☀️</div>
            </div>
            <div class="celestial-path__times">
                <span>${data.formattedTimes.sunrise}</span>
                <span>${data.formattedTimes.sunset}</span>
            </div>
        </div>
    `;
}

function renderMoonPathComponent(data, t) {
    if (isNaN(data.moonPathProgress)) return '';
    
    const isMoonVisible = data.moonPathProgress >= 0 && data.moonPathProgress <= 100;
    const { x, y } = getCelestialPosition(data.moonPathProgress);
    const style = `left: ${x}px; top: ${y}px; opacity: ${isMoonVisible ? 1 : 0.3};`;

    return `
        <div class="moon-path-container">
            <h4 class="celestial-path__title">${t.details.moonPhase}</h4>
            <div class="celestial-path ${!isMoonVisible ? 'is-night' : ''}">
                 <div class="celestial-path__icon" style="${style}">🌙</div>
            </div>
            <div class="celestial-path__times">
                <span>${data.formattedTimes.moonrise}</span>
                <span>${data.formattedTimes.moonset}</span>
            </div>
        </div>
    `;
}

export function renderCurrentWeather(data, t) {
    if(!dom.cityName) initUI(); // Upewnij się, że DOM jest zainicjowany

    dom.cityName.textContent = data.location.name;
    dom.currentTemp.textContent = `${Math.round(data.current.temp)}°C`;
    dom.weatherDescription.textContent = data.current.weather[0].description;
    dom.weatherIcon.innerHTML = getWeatherIconHtml(data.current.weather[0].icon, data.current.weather[0].description);
    
    // ZMIANA: Przywrócenie renderowania podsumowania
    const translatedOverview = translateOverview(data.generatedOverview, t);
    const overviewHtml = translatedOverview ? `
        <div class="weather-overview">
            <svg class="weather-overview__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L12 2C17.5228 2 22 6.47715 22 12V12C22 17.5228 17.5228 22 12 22V22C6.47715 22 2 17.5228 2 12V12C2 6.47715 6.47715 2 12 2V2Z"></path><path d="M13.8284 9.17157L12 11L10.1716 9.17157"></path><path d="M9.17157 13.8284L11 12L9.17157 10.1716"></path><path d="M13.8284 14.8284L12 13L10.1716 14.8284"></path><path d="M14.8284 10.1716L13 12L14.8284 13.8284"></path></svg>
            <p class="weather-overview__text">${translatedOverview}</p>
        </div>
    ` : '';
    
    const detailsHtml = `
        <div class="current-weather__extra-details">
             <div class="detail-col detail-col--1">
                <div class="current-weather__detail-item value-color--neutral-info"><span class="detail-item-header"><span>${t.details.wind}</span><svg width="24" height="24" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 6H6C4.89543 6 4 6.89543 4 8C4 9.10457 4.89543 10 6 10H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 12H7C5.34315 12 4 13.3431 4 15C4 16.6569 5.34315 18 7 18H14" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 14H16C14.8954 14 14 14.8954 14 16C14 17.1046 14.8954 18 16 18H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.current.wind_speed.toFixed(1)} m/s</span></div>
                <div class="current-weather__detail-item value-color--neutral-info"><span class="detail-item-header"><span>${t.details.pressure}</span><svg width="24" height="24" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 12L15 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.current.pressure} hPa</span></div>
            </div>
            <div class="detail-col detail-col--2">
                <div class="current-weather__detail-item value-color--aqi-${data.air_quality.main.aqi}"><span class="detail-item-header"><span>${t.details.aqi}</span><svg width="24" height="24" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12C21 7.9242 18.2323 4.56213 14.5 3.5C14.5 3.5 12.5 2 10 3.5C6.5 5.5 4.5 9.5 5.5 13C6.5 16.5 12.5 17 14.5 15.5" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 15.5C20.5 15.5 21 17.5 20 18.5C19 19.5 17 19.5 16.5 17.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${t.values.aqi[data.air_quality.main.aqi - 1]}</span></div>
                <div class="current-weather__detail-item value-color--uv-${data.uvCategory}"><span class="detail-item-header"><span>${t.details.uvIndex}</span><svg width="24" height="24" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 21V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.05025 7.05025L5.63604 5.63604" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.364 18.364L16.9497 16.9497" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.05025 16.9497L5.63604 18.364" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.364 5.63604L16.9497 7.05025" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${t.values.uv[data.uvCategory]}</span></div>
            </div>
            <div class="detail-col detail-col--3">
                <div class="current-weather__detail-item value-color--${data.roadCondition.class}"><span class="detail-item-header"><span>${t.details.roadSurface}</span><svg width="24" height="24" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 17.5C6 16.1193 7.11929 15 8.5 15C9.88071 15 11 16.1193 11 17.5V21H6V17.5Z" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 17.5C13 16.1193 14.1193 15 15.5 15C16.8807 15 18 16.1193 18 17.5V21H13V17.5Z" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15V8.44444C4 7.22849 4 6.62051 4.29828 6.16201C4.59656 5.70351 5.09916 5.37833 5.60436 5.05315L6.5 4.5L17.5 4.5L18.3956 5.05315C18.9008 5.37833 19.4034 5.70351 19.7017 6.16201C20 6.62051 20 7.22849 20 8.44444V15H4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${t.values.road[data.roadCondition.key]}</span></div>
            </div>
            <div class="detail-col detail-col--4">
                <div class="current-weather__detail-item value-color--sun"><span class="detail-item-header"><span>${t.details.sunrise}</span><svg width="24" height="24" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17H21" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.63604 5.63604L6.34315 6.34315" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 10H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.364 5.63604L17.6569 6.34315" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.formattedTimes.sunrise}</span></div>
                <div class="current-weather__detail-item value-color--sun"><span class="detail-item-header"><span>${t.details.sunset}</span><svg width="24" height="24" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17H21" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.63604 5.63604L6.34315 6.34315" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 10H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.364 5.63604L17.6569 6.34315" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.formattedTimes.sunset}</span></div>
            </div>
            <div class="detail-col detail-col--5">
                <div class="current-weather__detail-item value-color--moon"><span class="detail-item-header"><span>${t.details.moonrise}</span><svg width="24" height="24" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 17H22" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14C15.3137 14 18 11.3137 18 8C18 4.68629 15.3137 2 12 2C8.68629 2 6 4.68629 6 8C6 11.3137 8.68629 14 12 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14C13.6569 14 15 11.3137 15 8C15 4.68629 13.6569 2 12 2" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.formattedTimes.moonrise}</span></div>
                <div class="current-weather__detail-item value-color--moon"><span class="detail-item-header"><span>${t.details.moonset}</span><svg width="24" height="24" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 17H22" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14C15.3137 14 18 11.3137 18 8C18 4.68629 15.3137 2 12 2C8.68629 2 6 4.68629 6 8C6 11.3137 8.68629 14 12 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14C13.6569 14 15 11.3137 15 8C15 4.68629 13.6569 2 12 2" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.formattedTimes.moonset}</span></div>
            </div>
            <div class="sun-moon-paths-container">
                ${renderSunPathComponent(data, t)}
                ${renderMoonPathComponent(data, t)}
            </div>
        </div>`;
    
    dom.weatherResultContainer.innerHTML = `
        ${headerHtml}
        <div class="current-weather__main">
            <div class="current-weather__icon">${getWeatherIconHtml(data.current.weather[0].icon, data.current.weather[0].description)}</div>
            <div class="current-weather__details">
                <span class="current-weather__temp">${Math.round(data.current.temp)}°C</span>
                <span>${data.current.weather[0].description}</span>
            </div>
        </div>
        ${overviewHtml}
        <div id="weather-alerts-container"></div>
        ${detailsHtml}
    `;
    
    dom.weatherAlertsContainer = document.getElementById('weather-alerts-container');
    dom.addFavoriteBtn = document.getElementById('add-favorite-btn');
}

/**
 * --- PL --- Renderuje sekcję alertów pogodowych.
 * --- EN --- Renders the weather alerts section.
 */
export function renderWeatherAlerts(data, t) {
    if (data.alerts && data.alerts.length > 0) {
        const alert = data.alerts[0];
        const startTime = new Date(alert.start * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(alert.end * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const translatedEventName = translateAlertEvent(alert.event, t);
        
        dom.weatherAlertsContainer.innerHTML = `
            <div class="weather-alert">
                <div class="alert-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <strong>${translatedEventName}</strong>
                </div>
                <div class="alert-details">
                    <p>${t.alerts.issuedBy}: ${alert.sender_name}</p>
                    <p>${t.alerts.effective} ${startTime} ${t.alerts.to} ${endTime}</p>
                </div>
            </div>`;
        dom.weatherAlertsContainer.style.display = 'block';
    } else {
        dom.weatherAlertsContainer.innerHTML = '';
        dom.weatherAlertsContainer.style.display = 'none';
    }
}

/**
 * --- PL --- Renderuje wykres opadów na najbliższą godzinę.
 * --- EN --- Renders the precipitation chart for the next hour.
 */
export function renderMinutelyForecast(minutelyData, t) {
    const container = dom.minutely.container;
    if (!container) return;

    if (minutelyChart) {
        minutelyChart.destroy();
        minutelyChart = null;
    }

    const hasPrecipitation = minutelyData && minutelyData.some(minute => minute.precipitation > 0);
    if (!hasPrecipitation) {
        container.innerHTML = `<div class="no-data">Brak opadów w ciągu najbliższej godziny.</div>`;
        return;
    }

    // Upewnij się, że canvas istnieje przed użyciem
    if (!container.querySelector('#minutely-chart')) {
        container.innerHTML = `<canvas id="minutely-chart"></canvas>`;
    }
    const ctx = container.querySelector('#minutely-chart').getContext('2d');
    
    const labels = minutelyData.map((_, index) => (index % 10 === 0 && index > 0) ? `${index}m` : (index === 0 ? 'Teraz' : ''));
    const data = minutelyData.map(minute => minute.precipitation);

    minutelyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Intensywność opadów',
                data: data,
                backgroundColor: 'rgba(56, 189, 248, 0.6)',
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 1.0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false }, 
                tooltip: { 
                    enabled: true,
                    callbacks: {
                        label: (context) => `${context.parsed.y.toFixed(2)} mm/h`
                    }
                } 
            },
            scales: {
                y: { 
                    display: false, 
                    beginAtZero: true 
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: 'rgba(255, 255, 255, 0.7)',
                        autoSkip: false,
                    }
                }
            }
        }
    });
}

/**
 * --- PL --- Renderuje prognozę godzinową w sliderze, grupując po dniach.
 * --- EN --- Renders the hourly forecast in a slider, grouped by day.
 */
export function renderHourlyForecast(hourlyData, range, t) {
    const forecastToShow = hourlyData.slice(0, range);
    
    const groupedByDay = forecastToShow.reduce((acc, item) => {
        const dayKey = new Date(item.dt * 1000).toLocaleDateString('pl-PL', { weekday: 'long' });
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(item);
        return acc;
    }, {});
    
    const todayKey = new Date().toLocaleDateString('pl-PL', { weekday: 'long' });
    const tomorrowKey = new Date(Date.now() + 864e5).toLocaleDateString('pl-PL', { weekday: 'long' });

    let finalHtml = '';
    for (const [day, items] of Object.entries(groupedByDay)) {
        let dayLabel = day;
        if (day === todayKey) dayLabel = t.forecast.today;
        if (day === tomorrowKey) dayLabel = t.forecast.tomorrow;

        const itemsHtml = items.map(item => `
            <div class="hourly-forecast-item glass-card" data-timestamp="${item.dt}" role="button" tabindex="0">
                <p class="time">${new Date(item.dt * 1000).getHours()}:00</p>
                <div class="icon">${getWeatherIconHtml(item.weather[0].icon, item.weather[0].description)}</div>
                <p class="temp">${Math.round(item.temp)}°C</p>
            </div>`).join('');
        
        finalHtml += `
            <div class="hourly-day-group">
                <h5 class="hourly-day-group-header">${dayLabel}</h5>
                <div class="items-wrapper">${itemsHtml}</div>
            </div>`;
    }
    
    if(dom.hourly.scrollWrapper) dom.hourly.scrollWrapper.innerHTML = finalHtml;
}


/**
 * --- PL --- Renderuje prognozę dzienną (7 dni) w siatce.
 * --- EN --- Renders the daily forecast (7 days) in a grid.
 */
export function renderDailyForecast(dailyData, t) {
    // Pomiń dzisiejszy dzień (indeks 0) i weź 7 kolejnych
    const itemsHtml = dailyData.slice(1, 8).map(day => `
        <div class="daily-forecast-item glass-card" data-timestamp="${day.dt}" role="button" tabindex="0">
            <p class="day">${new Date(day.dt * 1000).toLocaleDateString('pl-PL', { weekday: 'short' })}</p>
            <div class="icon">${getWeatherIconHtml(day.weather[0].icon, day.weather[0].description)}</div>
            <p class="temp">${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</p>
        </div>
    `).join('');
    if(dom.daily.grid) dom.daily.grid.innerHTML = itemsHtml;
}

/**
 * --- PL --- Renderuje listę ulubionych lokalizacji.
 * --- EN --- Renders the list of favorite locations.
 */
export function renderFavorites(favorites, currentLocation) {
    const container = dom.favoritesContainer;
    if (!container) return;

    if (favorites.length > 0) {
        container.innerHTML = favorites.map(fav => {
            const clat = currentLocation ? parseFloat(currentLocation.lat) : NaN;
            const clon = currentLocation ? parseFloat(currentLocation.lon) : NaN;
            const flat = parseFloat(fav.lat);
            const flon = parseFloat(fav.lon);
            // Precyzyjne porównanie, aby uniknąć błędów zmiennoprzecinkowych
            const isActive = !isNaN(clat) && !isNaN(clon) && !isNaN(flat) && !isNaN(flon) &&
                             flat.toFixed(4) === clat.toFixed(4) &&
                             flon.toFixed(4) === clon.toFixed(4);
            return `<button class="favorite-location-btn ${isActive ? 'active' : ''}" data-city="${fav.name}">${fav.name}</button>`;
        }).join('');
    } else {
        container.innerHTML = `<p class="favorites-empty-state">Dodaj swoje ulubione lokalizacje za pomocą ikony gwiazdki ⭐</p>`;
    }
}

/**
 * --- PL --- Aktualizuje stan wizualny przycisku "Ulubione".
 * --- EN --- Updates the visual state of the "Favorite" button.
 */
export function updateFavoriteButtonState(isFavorite, favoritesCount) {
    if (dom.addFavoriteBtn) {
        dom.addFavoriteBtn.classList.toggle('is-favorite', isFavorite);
        dom.addFavoriteBtn.setAttribute('aria-label', isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych');
        // Zablokuj dodawanie, jeśli osiągnięto limit 5
        dom.addFavoriteBtn.disabled = !isFavorite && favoritesCount >= 5;
    }
}

// --- Logika Okna Modalnego / Modal Logic ---

function buildHourlyModalBody(data, t) {
    return `
        <div class="detail-row"><span class="label-container">${t.details.feelsLike}</span><span class="value">${Math.round(data.feels_like)}°C</span></div>
        <div class="detail-row"><span class="label-container">${t.details.humidity}</span><span class="value">${data.humidity}%</span></div>
        <div class="detail-row"><span class="label-container">${t.details.pressure}</span><span class="value">${data.pressure} hPa</span></div>
        <div class="detail-row"><span class="label-container">${t.details.clouds}</span><span class="value">${data.clouds}%</span></div>
        <div class="detail-row"><span class="label-container">${t.details.wind}</span><span class="value">${convertMsToKmh(data.wind_speed)} km/h, ${convertWindDirection(data.wind_deg)}</span></div>
        <div class="detail-row"><span class="label-container">${t.details.windGust}</span><span class="value">${convertMsToKmh(data.wind_gust || 0)} km/h</span></div>
        <div class="detail-row"><span class="label-container">${t.details.uvIndex}</span><span class="value">${Math.round(data.uvi)}</span></div>
        <div class="detail-row"><span class="label-container">${t.details.visibility}</span><span class="value">${data.visibility / 1000} km</span></div>
    `;
}

function buildDailyModalBody(data, t) {
    const sunrise = new Date(data.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(data.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // ZMIANA: Użycie 'description' zamiast 'summary' dla spójności
    const translatedSummary = translateOverview(data.weather[0].description, t);
    return `
        <div class="detail-row"><span class="label-container">${t.details.description}</span><span class="value">${translatedSummary}</span></div>
        <div class="detail-row"><span class="label-container">${t.forecast.precipChance}</span><span class="value">${Math.round(data.pop * 100)}%</span></div>
        <div class="detail-row detail-row--temp-grid"><span class="label-container">${t.forecast.temp}</span><div class="value modal-detail-value--temp-grid">
            <span>${t.forecast.morn}:</span><span>${Math.round(data.temp.morn)}°C</span>
            <span>${t.forecast.day}:</span><span>${Math.round(data.temp.day)}°C</span>
            <span>${t.forecast.eve}:</span><span>${Math.round(data.temp.eve)}°C</span>
            <span>${t.forecast.night}:</span><span>${Math.round(data.temp.night)}°C</span>
        </div></div>
        <div class="detail-row"><span class="label-container">${t.details.wind}</span><span class="value">${convertMsToKmh(data.wind_speed)} km/h, ${convertWindDirection(data.wind_deg)}</span></div>
        <div class="detail-row"><span class="label-container">${t.details.sunrise} / ${t.details.sunset}</span><span class="value">${sunrise} / ${sunset}</span></div>
        <div class="detail-row"><span class="label-container">${t.details.uvIndex}</span><span class="value">${Math.round(data.uvi)}</span></div>
    `;
}

export function showDetailsModal(data, type, t) {
    const date = new Date(data.dt * 1000);
    let title = '', bodyHtml = '';
    if (type === 'hourly') {
        title = `Prognoza na ${date.toLocaleDateString('pl-PL', { weekday: 'long' })}, ${date.getHours()}:00`;
        bodyHtml = buildHourlyModalBody(data, t);
    } else if (type === 'daily') {
        title = `Prognoza na ${date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}`;
        bodyHtml = buildDailyModalBody(data, t);
    }
    
    dom.modal.title.textContent = title;
    dom.modal.body.innerHTML = bodyHtml;
    
    activeModalTrigger = document.activeElement; // Zapisz, co miało focus
    dom.modal.overlay.hidden = false;
    
    // Po krótkim opóźnieniu, aby umożliwić renderowanie, ustaw focus
    setTimeout(() => { 
        dom.modal.closeBtn.focus();
    }, 10);
}

export function hideDetailsModal() {
    dom.modal.overlay.hidden = true;
    if (activeModalTrigger) {
        activeModalTrigger.focus(); // Przywróć focus
        activeModalTrigger = null;
    }
}

