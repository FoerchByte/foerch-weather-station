/**
 * --- PL ---
 * Moduł UI (Interfejsu Użytkownika).
 * Odpowiada za wszelkie manipulacje w drzewie DOM - renderowanie danych,
 * aktualizowanie widoków, pokazywanie/ukrywanie elementów, zarządzanie klasami CSS.
 * Nie zawiera logiki biznesowej ani zapytań API.
 * --- EN ---
 * UI (User Interface) Module.
 * Responsible for all DOM manipulations - rendering data, updating views,
 * showing/hiding elements, managing CSS classes.
 * Contains no business logic or API calls.
 */

// --- Referencje do elementów DOM / DOM Element References ---
const dom = {};

// --- Stan wewnętrzny modułu UI / Internal UI Module State ---
let minutelyChart = null;
let activeModalTrigger = null; // Przechowuje element, który otworzył modal

/**
 * --- PL --- Inicjalizuje moduł, pobierając referencje do elementów DOM.
 * --- EN --- Initializes the module by caching DOM element references.
 */
export function initUI() {
    dom.searchBtn = document.getElementById('search-weather-btn');
    dom.cityInput = document.getElementById('city-input');
    dom.geoBtn = document.getElementById('geolocation-btn');
    dom.themeToggle = document.getElementById('theme-toggle');
    dom.weatherResultContainer = document.getElementById('weather-result-container');
    dom.forecastsContainer = document.getElementById('forecasts-container');
    dom.mapContainer = document.getElementById('map-container');
    dom.forecastSwitcher = document.getElementById('forecast-switcher');
    dom.favoritesContainer = document.getElementById('favorites-container');
    dom.minutely = {
        wrapper: document.querySelector('.minutely-forecast__wrapper'),
    };
    dom.hourly = {
        wrapper: document.querySelector('.hourly-forecast__wrapper'),
        container: document.getElementById('hourly-forecast-container'),
        rangeSwitcher: document.getElementById('hourly-range-switcher'),
        sliderPrevBtn: document.getElementById('hourly-slider-prev'),
        sliderNextBtn: document.getElementById('hourly-slider-next'),
        scrollWrapper: document.querySelector('.hourly-forecast__scroll-wrapper'),
    };
    dom.daily = {
        wrapper: document.querySelector('.daily-forecast__wrapper'),
        container: document.getElementById('daily-forecast-container'),
        sliderPrevBtn: document.getElementById('daily-slider-prev'),
        sliderNextBtn: document.getElementById('daily-slider-next'),
        scrollWrapper: document.querySelector('.daily-forecast__scroll-wrapper'),
    };
    dom.modal = {
        container: document.getElementById('details-modal'),
        title: document.getElementById('modal-title'),
        body: document.getElementById('modal-body'),
        closeBtns: document.querySelectorAll('[data-close-modal]'),
    };
    
    dom.weatherAlertsContainer = null; 
    dom.addFavoriteBtn = null;
}

// --- Funkcje pomocnicze / Helper Functions ---

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

function translateAlertEvent(eventName) {
    const alertTranslations = {
        'Yellow Rain warning': 'Ostrzeżenie: Intensywne opady deszczu',
        'Orange Rain warning': 'Ostrzeżenie 2. stopnia: Ulewne opady deszczu',
        'Red Rain warning': 'Ostrzeżenie 3. stopnia: Ekstremalne opady deszczu',
        'Yellow Snow warning': 'Ostrzeżenie: Intensywne opady śniegu',
        'Orange Snow warning': 'Ostrzeżenie 2. stopnia: Zamiecie/zawieje śnieżne',
        'Red Snow warning': 'Ostrzeżenie 3. stopnia: Ekstremalne opady śniegu',
        'Yellow Wind warning': 'Ostrzeżenie: Silny wiatr',
        'Orange Wind warning': 'Ostrzeżenie 2. stopnia: Bardzo silny wiatr',
        'Red Wind warning': 'Ostrzeżenie 3. stopnia: Ekstremalnie silny wiatr',
        'Yellow Thunderstorm warning': 'Ostrzeżenie: Burze z gradem',
        'Orange Thunderstorm warning': 'Ostrzeżenie 2. stopnia: Gwałtowne burze',
        'Red Thunderstorm warning': 'Ostrzeżenie 3. stopnia: Ekstremalne zjawiska burzowe',
        'Yellow Fog warning': 'Ostrzeżenie: Gęsta mgła',
        'Orange Fog warning': 'Ostrzeżenie 2. stopnia: Bardzo gęsta mgła',
        'Yellow High temperature warning': 'Ostrzeżenie: Upał',
        'Orange High temperature warning': 'Ostrzeżenie 2. stopnia: Upał',
        'Red High temperature warning': 'Ostrzeżenie 3. stopnia: Ekstremalny upał',
        'Yellow Low temperature warning': 'Ostrzeżenie: Mróz',
        'Orange Low temperature warning': 'Ostrzeżenie 2. stopnia: Silny mróz',
        'Red Low temperature warning': 'Ostrzeżenie 3. stopnia: Ekstremalny mróz',
    };
    return alertTranslations[eventName] || eventName;
}


// --- Zarządzanie stanem UI / UI State Management ---

export function toggleButtonLoading(button, isLoading) {
    if (!button) return;
    const span = button.querySelector('span');
    if (isLoading) {
        span.style.display = 'none';
        if (!button.querySelector('.loader')) {
            button.insertAdjacentHTML('beforeend', '<div class="loader"></div>');
        }
        button.disabled = true;
    } else {
        span.style.display = 'inline';
        const loader = button.querySelector('.loader');
        if (loader) loader.remove();
        button.disabled = false;
    }
}

export function showInitialState() {
    dom.favoritesContainer.innerHTML = `<p class="favorites-empty-state">Dodaj swoje ulubione lokalizacje za pomocą ikony gwiazdki ⭐</p>`;
    hideContent();
}

export function showLoadingState() {
    dom.weatherResultContainer.innerHTML = `<div class="weather-app__skeleton"><div class="skeleton" style="width: 200px; height: 2.2rem;"></div><div class="skeleton" style="width: 150px; height: 4rem;"></div></div>`;
    hideContent();
}

export function showError(message) {
    dom.weatherResultContainer.innerHTML = `<div class="weather-app__error">${message}</div>`;
    hideContent();
}

function hideContent() {
    dom.forecastsContainer.style.display = 'none';
    dom.mapContainer.style.display = 'none';
}

export function showContent() {
    dom.forecastsContainer.style.display = 'block';
    dom.mapContainer.style.display = 'block';
}

// --- Renderowanie komponentów / Component Rendering ---

export function renderCurrentWeather(data, t) {
    const headerHtml = `
        <div class="current-weather__header">
            <h3 class="current-weather__city">${data.location.name}</h3>
            <button id="add-favorite-btn" class="favorite-btn" aria-label="Dodaj do ulubionych">
                <svg class="star-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </button>
        </div>`;
    
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

export function renderWeatherAlerts(data, t) {
    const container = dom.weatherAlertsContainer;
    if (!container) return;
    
    if (data.alerts && data.alerts.length > 0) {
        container.style.display = 'flex';
        const alert = data.alerts[0];
        const startTime = new Date(alert.start * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(alert.end * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        
        const translatedEventName = translateAlertEvent(alert.event);
        
        container.className = 'weather-alert weather-alert--warning';
        container.innerHTML = `
            <div class="alert__header">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <strong>${translatedEventName}</strong>
            </div>
            <p class="alert__source">${t.alerts.issuedBy}: ${alert.sender_name}</p>
            <p class="alert__time">${t.alerts.effective} ${startTime} ${t.alerts.to} ${endTime}</p>
        `;
    } else {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

export function renderMinutelyForecast(minutelyData) {
    const hasPrecipitation = minutelyData && minutelyData.some(minute => minute.precipitation > 0);
    
    if (!hasPrecipitation) {
        dom.minutely.wrapper.innerHTML = `<div class="minutely-forecast__no-data">Brak opadów w ciągu najbliższej godziny.</div>`;
        return;
    }

    if (!dom.minutely.wrapper.querySelector('#minutely-chart')) {
        dom.minutely.wrapper.innerHTML = `
            <h3 class="minutely-forecast__title">Intensywność opadów w najbliższej godzinie</h3>
            <div class="minutely-forecast__chart-container">
                <canvas id="minutely-chart"></canvas>
            </div>`;
    }
    const chartCanvas = dom.minutely.wrapper.querySelector('#minutely-chart');

    const labels = minutelyData.map((_, index) => {
        if (index === 0) return 'Teraz';
        if (index === 59) return "60'";
        if ((index + 1) % 15 === 0) return `${index + 1}'`;
        return '';
    });
    const precipitationData = minutelyData.map(minute => minute.precipitation);

    const maxPrecip = Math.max(...precipitationData);
    const yAxisMax = maxPrecip > 1 ? Math.ceil(maxPrecip) + 1 : 1;

    const chartConfig = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Intensywność opadów',
                data: precipitationData,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 1.0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true,
                    max: yAxisMax,
                    ticks: {
                        callback: function(value) { return value + ' mm'; }
                    }
                },
                x: { 
                    grid: { display: false },
                    ticks: { 
                        maxRotation: 0,
                        autoSkip: false,
                    } 
                }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2) + ' mm';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };
    
    if (minutelyChart) minutelyChart.destroy();
    minutelyChart = new Chart(chartCanvas, chartConfig);
}

export function renderHourlyForecast(hourlyData, range, t) {
    const now = new Date();
    let forecastToShow;
    if (range === 24) {
        const endOfTomorrow = new Date(); endOfTomorrow.setDate(now.getDate() + 1); endOfTomorrow.setHours(23, 59, 59, 999);
        forecastToShow = hourlyData.filter(item => new Date(item.dt * 1000) > now && new Date(item.dt * 1000) <= endOfTomorrow);
    } else {
        forecastToShow = hourlyData.slice(0, 48);
    }
    
    const groupedByDay = forecastToShow.reduce((acc, item) => {
        const dayKey = new Date(item.dt * 1000).toLocaleDateString('pl-PL', { weekday: 'long' });
        if (!acc[dayKey]) acc[dayKey] = []; acc[dayKey].push(item); return acc;
    }, {});
    
    const todayKey = new Date().toLocaleDateString('pl-PL', { weekday: 'long' });
    const tomorrowKey = new Date(Date.now() + 864e5).toLocaleDateString('pl-PL', { weekday: 'long' });

    dom.hourly.container.innerHTML = Object.entries(groupedByDay).map(([day, items]) => {
        let dayLabel = day;
        if (day === todayKey) dayLabel = t.forecast.today; if (day === tomorrowKey) dayLabel = t.forecast.tomorrow;
        const itemsHtml = items.map(item => `
            <div class="hourly-forecast__item" data-timestamp="${item.dt}" tabindex="0" role="button">
                <p class="hourly-forecast__time">${new Date(item.dt * 1000).getHours()}:00</p>
                <div class="hourly-forecast__icon">${getWeatherIconHtml(item.weather[0].icon, item.weather[0].description)}</div>
                <div class="hourly-forecast__item-right">
                    <p class="hourly-forecast__temp">${Math.round(item.temp)}°C</p>
                    <div class="hourly-forecast__pop">
                        <svg class="hourly-forecast__pop-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a5.53 5.53 0 0 0-5.43 6.05L8 16l5.43-9.95A5.53 5.53 0 0 0 8 0zm0 8.87A2.87 2.87 0 1 1 10.87 6 2.87 2.87 0 0 1 8 8.87z"/></svg>
                        <span>${Math.round(item.pop * 100)}%</span>
                    </div>
                </div>
            </div>`).join('');
        return `<div class="hourly-forecast__day-group"><h4 class="hourly-forecast__day-heading">${dayLabel}</h4><div class="hourly-forecast__items">${itemsHtml}</div></div>`;
    }).join('');
    
    setTimeout(() => updateSliderButtons(), 0);
}

export function renderDailyForecast(dailyData, t) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    dom.daily.container.innerHTML = dailyData.map(day => {
        const dayDate = new Date(day.dt * 1000);
        let dayLabel = dayDate.toLocaleDateString('pl-PL', { weekday: 'long' });
        if (dayDate.getTime() === today.getTime()) dayLabel = t.forecast.today;
        
        return `
        <div class="daily-forecast__day" data-timestamp="${day.dt}" tabindex="0" role="button">
            <h4>${dayLabel}</h4>
            <div class="daily-forecast__icon">${getWeatherIconHtml(day.weather[0].icon, day.weather[0].description)}</div>
            <p>${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</p>
            <div class="daily-forecast__pop">
                <svg class="daily-forecast__pop-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a5.53 5.53 0 0 0-5.43 6.05L8 16l5.43-9.95A5.53 5.53 0 0 0 8 0zm0 8.87A2.87 2.87 0 1 1 10.87 6 2.87 2.87 0 0 1 8 8.87z"/></svg>
                <span>${Math.round(day.pop * 100)}%</span>
            </div>
        </div>`;
    }).join('');
}

export function renderFavorites(favorites, currentLocation) {
    if (favorites.length > 0) {
        dom.favoritesContainer.innerHTML = favorites.map(fav => {
            const clat = currentLocation ? parseFloat(currentLocation.lat) : NaN;
            const clon = currentLocation ? parseFloat(currentLocation.lon) : NaN;
            const flat = parseFloat(fav.lat);
            const flon = parseFloat(fav.lon);
            const isActive = !isNaN(clat) && !isNaN(clon) && !isNaN(flat) && !isNaN(flon) &&
                             flat.toFixed(4) === clat.toFixed(4) &&
                             flon.toFixed(4) === clon.toFixed(4);
            return `<button class="favorite-location-btn ${isActive ? 'active' : ''}" data-city="${fav.name}">${fav.name}</button>`;
        }).join('');
    } else {
        showInitialState();
    }
}

export function updateFavoriteButtonState(isFavorite, favoritesCount) {
    if (!dom.addFavoriteBtn) return;
    dom.addFavoriteBtn.classList.toggle('is-favorite', isFavorite);
    dom.addFavoriteBtn.setAttribute('aria-label', isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych');
    dom.addFavoriteBtn.disabled = !isFavorite && favoritesCount >= 5;
}

export function updateSliderButtons() {
    if (!dom.hourly.scrollWrapper) return;
    requestAnimationFrame(() => {
        const { scrollLeft, scrollWidth, clientWidth } = dom.hourly.scrollWrapper;
        if(dom.hourly.sliderPrevBtn) dom.hourly.sliderPrevBtn.disabled = scrollLeft <= 0;
        if(dom.hourly.sliderNextBtn) dom.hourly.sliderNextBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 1;
    });
}

export function updateDailySliderButtons() {
    if (!dom.daily.scrollWrapper) return;
    requestAnimationFrame(() => {
        const { scrollLeft, scrollWidth, clientWidth } = dom.daily.scrollWrapper;
        if(dom.daily.sliderPrevBtn) dom.daily.sliderPrevBtn.disabled = scrollLeft <= 0;
        if(dom.daily.sliderNextBtn) dom.daily.sliderNextBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 1;
    });
}

// --- Logika okna modalnego / Modal Logic ---

function buildHourlyModalBody(data, t) {
    return `
        <div class="modal-detail"><span class="modal-detail__label">${t.details.feelsLike}</span><span class="modal-detail__value">${Math.round(data.feels_like)}°C</span></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.details.humidity}</span><span class="modal-detail__value">${data.humidity}%</span></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.details.pressure}</span><span class="modal-detail__value">${data.pressure} hPa</span></div>
         <div class="modal-detail"><span class="modal-detail__label">${t.details.clouds}</span><span class="modal-detail__value">${data.clouds}%</span></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.details.wind}</span><span class="modal-detail__value">${data.wind_speed.toFixed(1)} m/s, ${convertWindDirection(data.wind_deg)}</span></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.details.windGust}</span><span class="modal-detail__value">${(data.wind_gust || 0).toFixed(1)} m/s</span></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.details.uvIndex}</span><span class="modal-detail__value">${Math.round(data.uvi)}</span></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.details.visibility}</span><span class="modal-detail__value">${data.visibility / 1000} km</span></div>
    `;
}

function buildDailyModalBody(data, t) {
    const sunrise = new Date(data.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(data.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // POPRAWKA: Użycie `weather[0].description` do tłumaczenia i klucza 'description'
    // FIX: Using `weather[0].description` for translation and the 'description' key
    const translatedSummary = translateOverview(data.weather[0].description, t);

    return `
        <div class="modal-detail"><span class="modal-detail__label">${t.details.description}</span><span class="modal-detail__value">${translatedSummary}</span></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.forecast.precipChance}</span><span class="modal-detail__value">${Math.round(data.pop * 100)}%</span></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.forecast.temp}</span><div class="modal-detail__value modal-detail__value--temp-grid">
            <span>${t.forecast.morn}:</span><span>${Math.round(data.temp.morn)}°C</span>
            <span>${t.forecast.day}:</span><span>${Math.round(data.temp.day)}°C</span>
            <span>${t.forecast.eve}:</span><span>${Math.round(data.temp.eve)}°C</span>
            <span>${t.forecast.night}:</span><span>${Math.round(data.temp.night)}°C</span>
        </div></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.details.wind}</span><span class="modal-detail__value">${data.wind_speed.toFixed(1)} m/s, ${convertWindDirection(data.wind_deg)}</span></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.details.sunrise} / ${t.details.sunset}</span><span class="modal-detail__value">${sunrise} / ${sunset}</span></div>
        <div class="modal-detail"><span class="modal-detail__label">${t.details.uvIndex}</span><span class="modal-detail__value">${Math.round(data.uvi)}</span></div>
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

    dom.modal.container.removeAttribute('hidden');
    setTimeout(() => {
        dom.modal.container.classList.add('is-visible');
        dom.modal.container.querySelector('button, a, input, [tabindex]').focus();
    }, 10);
    
    activeModalTrigger = document.activeElement;
}

export function hideDetailsModal() {
    dom.modal.container.classList.remove('is-visible');
    
    if (activeModalTrigger) {
        activeModalTrigger.focus();
        activeModalTrigger = null;
    }

    setTimeout(() => {
        dom.modal.container.setAttribute('hidden', true);
    }, 300);
}

