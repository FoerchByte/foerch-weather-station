/**
 * --- PL ---
 * Moduł UI (Interfejsu Użytkownika) dla wersji 2.0.
 * Odpowiada za wszelkie manipulacje w drzewie DOM - renderowanie danych,
 * aktualizowanie widoków, pokazywanie/ukrywanie elementów, zarządzanie klasami CSS.
 * Operuje na istniejącej strukturze HTML zdefiniowanej w index.html.
 * Wersja zaktualizowana o pełne renderowanie danych, obsługę modala i i18n.
 * --- EN ---
 * UI (User Interface) Module for version 2.0.
 * Responsible for all DOM manipulations - rendering data, updating views,
 * showing/hiding elements, managing CSS classes.
 * Operates on the existing HTML structure defined in index.html.
 * Updated version with full data rendering, modal handling, and i18n.
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

function convertMsToKmh(ms) { return Math.round(ms * 3.6); }

function getWeatherIconHtml(iconCode, description) {
    const iconBaseUrl = 'https://basmilius.github.io/weather-icons/production/fill/all/';
    const iconMap = { '01d': 'clear-day.svg', '01n': 'clear-night.svg', '02d': 'partly-cloudy-day.svg', '02n': 'partly-cloudy-night.svg', '03d': 'cloudy.svg', '03n': 'cloudy.svg', '04d': 'overcast-day.svg', '04n': 'overcast-night.svg', '09d': 'rain.svg', '09n': 'rain.svg', '10d': 'partly-cloudy-day-rain.svg', '10n': 'partly-cloudy-night-rain.svg', '11d': 'thunderstorms-day.svg', '11n': 'thunderstorms-night.svg', '13d': 'snow.svg', '13n': 'snow.svg', '50d': 'fog-day.svg', '50n': 'fog-night.svg', };
    const iconName = iconMap[iconCode] || 'not-available.svg';
    return `<img src="${iconBaseUrl}${iconName}" alt="${description}" class="weather-icon-img" style="width: 100%; height: 100%;">`;
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

// POPRAWKA: Funkcja odporna na wielkość liter (Warning vs warning)
function translateAlertEvent(eventName, t) {
    if (!eventName || !t.alertEvents) return eventName || '';

    // 1. Próba dokładnego dopasowania (najszybsza)
    if (t.alertEvents[eventName]) return t.alertEvents[eventName];

    // 2. Próba dopasowania bez względu na wielkość liter (wolniejsza, ale bezpieczniejsza)
    const lowerEventName = eventName.toLowerCase();
    for (const key in t.alertEvents) {
        if (key.toLowerCase() === lowerEventName) {
            return t.alertEvents[key];
        }
    }

    // 3. Fallback: częściowe dopasowanie dla nieznanych kombinacji kolorów
    for (const key in t.alertEvents) {
         // Ignorujemy klucze z konkretnymi kolorami, szukamy tylko bazowych (np. "Thunderstorm warning")
         if (!key.includes('Yellow') && !key.includes('Orange') && !key.includes('Red')) {
             if (lowerEventName.includes(key.toLowerCase())) {
                 return t.alertEvents[key];
             }
         }
    }

    return eventName;
}

function convertWindDirection(deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
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

export function updateStaticElements(t) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t.uiElements[key]) {
            el.textContent = t.uiElements[key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t.uiElements[key]) {
            el.placeholder = t.uiElements[key];
        }
    });

    document.documentElement.lang = t.uiElements.appTitle === 'Stacja Pogody' ? 'pl' : 'en';
}

export function showInitialState(t) {
    dom.favoritesContainer.innerHTML = `<p class="favorites-empty-state">${t.uiElements.favoritesEmpty}</p>`;
    hideContent();
}

export function showLoadingState() { hideContent(); }

export function showError(message) { 
    alert(message); 
    hideContent(); 
}

function hideContent() { if (dom.weatherResultContainer) dom.weatherResultContainer.style.display = 'none'; }
export function showContent() { if (dom.weatherResultContainer) dom.weatherResultContainer.style.display = 'block'; }

// --- Renderowanie Komponentów / Component Rendering ---

function renderDetailRow(containerId, icon, label, value, valueClass = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
        <div class="label-container">${icon}<span class="label">${label}</span></div>
        <span class="value ${valueClass}">${value}</span>`;
}

/**
 * --- PL --- Wypełnia całą główną kartę pogody i wszystkie kafelki detali.
 * --- EN --- Populates the entire main weather card and all detail tiles.
 */
export function renderCurrentWeather(data, t) {
    if(!dom.cityName) initUI();

    dom.cityName.textContent = data.location.name;
    dom.currentTemp.textContent = `${Math.round(data.current.temp)}°C`;
    dom.weatherDescription.textContent = data.current.weather[0].description;
    dom.weatherIcon.innerHTML = getWeatherIconHtml(data.current.weather[0].icon, data.current.weather[0].description);
    
    const translatedOverview = translateOverview(data.generatedOverview, t);
    if (translatedOverview && dom.weatherOverview) {
        dom.weatherOverview.innerHTML = `<p>${translatedOverview}</p>`;
        dom.weatherOverview.style.display = 'block';
    } else if (dom.weatherOverview) {
        dom.weatherOverview.style.display = 'none';
    }

    // Ikony dla kafelków detali
    const icons = {
        feelsLike: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h-2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="M4 12h2.5"/><path d="M17.5 12H20"/></svg>`,
        humidity: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
        wind: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1-5 0"/><path d="M19.6 21H4.4a2 2 0 0 1-1.76-2.9L8.8 3.5a2 2 0 0 1 3.4 0l6.16 14.6a2 2 0 0 1-1.76 2.9z"/></svg>`,
        pressure: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14-4-4h8l-4 4Z"/><path d="m12 20-4-4h8l-4 4Z"/><path d="M12 2v2"/><path d="M12 8v2"/><path d="m21 12-2 0"/><path d="m5 12-2 0"/><path d="m18.36 18.36-.7.7"/><path d="m6.34 6.34-.7-.7"/></svg>`,
        aqi: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12v-2a4 4 0 0 0-4-4H4"/><path d="M12 16H8a4 4 0 0 1-4-4v-2"/><path d="M20 12h-2a4 4 0 0 0-4-4v-2"/><path d="M20 12v4a4 4 0 0 1-4 4h-2"/></svg>`,
        uv: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12.5a4.5 4.5 0 1 1 4.5-4.5 4.5 4.5 0 0 1-4.5 4.5z"/><path d="M12 3V1"/><path d="M12 23v-2"/><path d="M20.66 18.34l-1.41-1.41"/><path d="M4.75 6.16 3.34 4.75"/><path d="M20.66 5.66l-1.41 1.41"/><path d="M4.75 17.84l-1.41 1.41"/><path d="M23 12h-2"/><path d="M3 12H1"/></svg>`,
        sunrise: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4-4-4 4"/></svg>`,
        sunset: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 18-4 4-4-4"/></svg>`,
        road: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v2H6.5a2.5 2.5 0 0 1 0-5H20V9H6.5a2.5 2.5 0 0 1 0-5H20V6H6.5a2.5 2.5 0 0 1-2.5 2.5V19.5z"/></svg>`,
        moonrise: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 1 0 10 10 9 9 0 1 1-10-10z"/><path d="M22 22H2"/><path d="m16 6-4-4-4 4"/></svg>`,
        moonset: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 1 0 10 10 9 9 0 1 1-10-10z"/><path d="M22 22H2"/><path d="m16 18-4 4-4-4"/></svg>`,
    };

    renderDetailRow('detail-feels-like', icons.feelsLike, t.details.feelsLike, `${Math.round(data.current.feels_like)}°C`);
    renderDetailRow('detail-wind', icons.wind, t.details.wind, `${convertMsToKmh(data.current.wind_speed)} km/h`);
    renderDetailRow('detail-pressure', icons.pressure, t.details.pressure, `${data.current.pressure} hPa`);
    renderDetailRow('detail-humidity', icons.humidity, t.details.humidity, `${data.current.humidity}%`);
    renderDetailRow('detail-aqi', icons.aqi, t.details.aqi, t.values.aqi[data.air_quality.main.aqi - 1], `aqi-${data.air_quality.main.aqi}`);
    renderDetailRow('detail-uv', icons.uv, t.details.uvIndex, t.values.uv[data.uvCategory], `uv-${data.uvCategory}`);
    renderDetailRow('detail-road', icons.road, t.details.roadSurface, t.values.road[data.roadCondition.key], `road-${data.roadCondition.key}`);
    renderDetailRow('detail-sunrise', icons.sunrise, t.details.sunrise, data.formattedTimes.sunrise);
    renderDetailRow('detail-sunset', icons.sunset, t.details.sunset, data.formattedTimes.sunset);
    renderDetailRow('detail-moonrise', icons.moonrise, t.details.moonrise, data.formattedTimes.moonrise);
    renderDetailRow('detail-moonset', icons.moonset, t.details.moonset, data.formattedTimes.moonset);
}

export function renderWeatherAlerts(data, t) {
    if (data.alerts && data.alerts.length > 0) {
        const alert = data.alerts[0];
        const locale = t.uiElements.appTitle === 'Stacja Pogody' ? 'pl-PL' : 'en-US';
        const startTime = new Date(alert.start * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(alert.end * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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

export function renderMinutelyForecast(minutelyData, t) {
    const container = dom.minutely.container;
    if (!container) return;

    if (minutelyChart) {
        minutelyChart.destroy();
        minutelyChart = null;
    }

    const hasPrecipitation = minutelyData && minutelyData.some(minute => minute.precipitation > 0);
    if (!hasPrecipitation) {
        const noDataText = t.uiElements.headerPrecipitation === 'Opady w najbliższej godzinie' 
            ? 'Brak opadów w ciągu najbliższej godziny.' 
            : 'No precipitation within the next hour.';
        container.innerHTML = `<div class="no-data">${noDataText}</div>`;
        return;
    }

    if (!container.querySelector('#minutely-chart')) {
        container.innerHTML = `<canvas id="minutely-chart"></canvas>`;
    }
    const ctx = container.querySelector('#minutely-chart').getContext('2d');
    
    const nowLabel = t.forecast.today === 'Dzisiaj' ? 'Teraz' : 'Now';
    const labels = minutelyData.map((_, index) => (index % 10 === 0 && index > 0) ? `${index}m` : (index === 0 ? nowLabel : ''));
    const data = minutelyData.map(minute => minute.precipitation);

    minutelyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: t.forecast.precipChance,
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
                y: { display: false, beginAtZero: true },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)', autoSkip: false }
                }
            }
        }
    });
}

export function renderHourlyForecast(hourlyData, range, t) {
    const forecastToShow = hourlyData.slice(0, range);
    const locale = t.uiElements.appTitle === 'Stacja Pogody' ? 'pl-PL' : 'en-US';
    
    const groupedByDay = forecastToShow.reduce((acc, item) => {
        const dayKey = new Date(item.dt * 1000).toLocaleDateString(locale, { weekday: 'long' });
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(item);
        return acc;
    }, {});
    
    const todayKey = new Date().toLocaleDateString(locale, { weekday: 'long' });
    const tomorrowKey = new Date(Date.now() + 864e5).toLocaleDateString(locale, { weekday: 'long' });

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

export function renderDailyForecast(dailyData, t) {
    const locale = t.uiElements.appTitle === 'Stacja Pogody' ? 'pl-PL' : 'en-US';
    const itemsHtml = dailyData.slice(1, 8).map(day => `
        <div class="daily-forecast-item glass-card" data-timestamp="${day.dt}" role="button" tabindex="0">
            <p class="day">${new Date(day.dt * 1000).toLocaleDateString(locale, { weekday: 'short' })}</p>
            <div class="icon">${getWeatherIconHtml(day.weather[0].icon, day.weather[0].description)}</div>
            <p class="temp">${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</p>
        </div>
    `).join('');
    if(dom.daily.grid) dom.daily.grid.innerHTML = itemsHtml;
}

export function renderFavorites(favorites, currentLocation, t) {
    const container = dom.favoritesContainer;
    if (!container) return;

    if (favorites.length > 0) {
        container.innerHTML = favorites.map(fav => {
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
        container.innerHTML = `<p class="favorites-empty-state">${t.uiElements.favoritesEmpty}</p>`;
    }
}

export function updateFavoriteButtonState(isFavorite, favoritesCount) {
    if (dom.addFavoriteBtn) {
        dom.addFavoriteBtn.classList.toggle('is-favorite', isFavorite);
        dom.addFavoriteBtn.setAttribute('aria-label', isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych');
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
    const locale = t.uiElements.appTitle === 'Stacja Pogody' ? 'pl-PL' : 'en-US';
    const sunrise = new Date(data.sunrise * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(data.sunset * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const translatedSummary = data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1);
    
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
    const locale = t.uiElements.appTitle === 'Stacja Pogody' ? 'pl-PL' : 'en-US';
    let title = '', bodyHtml = '';
    
    if (type === 'hourly') {
        const prefix = t.uiElements.appTitle === 'Stacja Pogody' ? 'Prognoza na' : 'Forecast for';
        title = `${prefix} ${date.toLocaleDateString(locale, { weekday: 'long' })}, ${date.getHours()}:00`;
        bodyHtml = buildHourlyModalBody(data, t);
    } else if (type === 'daily') {
        const prefix = t.uiElements.appTitle === 'Stacja Pogody' ? 'Prognoza na' : 'Forecast for';
        title = `${prefix} ${date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}`;
        bodyHtml = buildDailyModalBody(data, t);
    }
    
    dom.modal.title.textContent = title;
    dom.modal.body.innerHTML = bodyHtml;
    
    activeModalTrigger = document.activeElement;
    dom.modal.overlay.hidden = false;
    setTimeout(() => { dom.modal.closeBtn.focus(); }, 10);
}

export function hideDetailsModal() {
    dom.modal.overlay.hidden = true;
    if (activeModalTrigger) {
        activeModalTrigger.focus();
        activeModalTrigger = null;
    }
}
