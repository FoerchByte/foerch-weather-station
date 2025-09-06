document.addEventListener('DOMContentLoaded', () => {

    let currentTheme = localStorage.getItem('theme') || 'light';
    let map = null;
    let marker = null;

    const domElements = {
        searchBtn: document.getElementById('search-weather-btn'),
        cityInput: document.getElementById('city-input'),
        geoBtn: document.getElementById('geolocation-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        resultContainer: document.getElementById('weather-result-container'),
        forecastsContainer: document.getElementById('forecasts-container'),
        mapContainer: document.getElementById('map-container'),
        additionalInfoContainer: document.getElementById('additional-info-grid'),
        hourlyContainer: document.getElementById('hourly-forecast-container'),
        forecastContainer: document.getElementById('forecast-container'),
        airQualityContainer: document.getElementById('air-quality-container'),
        uvIndexContainer: document.getElementById('uv-index-container'),
        forecastSwitcher: document.getElementById('forecast-switcher')
    };

    function setTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        localStorage.setItem('theme', theme);
        currentTheme = theme;
    }

    function initializeMap() {
        if (!map) {
            map = L.map('map').setView([51.75, 19.45], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }
    }
    
    function toggleButtonLoading(button, isLoading) {
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
    
    function clearUI() {
        domElements.resultContainer.innerHTML = '';
        domElements.forecastsContainer.style.display = 'none';
        domElements.mapContainer.style.display = 'none';
        domElements.additionalInfoContainer.style.display = 'none';
    }

    function showError(message) {
        clearUI();
        domElements.resultContainer.innerHTML = `<div class="weather-app__error">${message}</div>`;
    }

    function buildApiUrl(query) {
        const lang = 'pl';
        let baseUrl = '/.netlify/functions/weather?';
        if (typeof query === 'string' && query) {
            return `${baseUrl}city=${encodeURIComponent(query)}&lang=${lang}`;
        } else if (typeof query === 'object' && query.latitude) {
            return `${baseUrl}lat=${query.latitude}&lon=${query.longitude}&lang=${lang}`;
        }
        return null;
    }
    
    async function fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            const data = await response.json().catch(() => ({ message: `Błąd HTTP: ${response.status}` }));
            throw new Error(data.message || `Błąd HTTP: ${response.status}`);
        }
        return response.json();
    }

    // --- Funkcje aktualizujące UI ---
    function updateCurrentWeather(data) {
        const current = data.list[0];
        const sunrise = new Date((data.city.sunrise + data.city.timezone) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        const sunset = new Date((data.city.sunset + data.city.timezone) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        const roadCondition = current.main.temp > 2 && !['Rain', 'Snow', 'Drizzle'].includes(current.weather[0].main)
            ? { text: "Sucha", class: 'roadDry' }
            : (current.main.temp <= 2 ? { text: "Możliwe oblodzenie", class: 'roadIcy' } : { text: "Mokra", class: 'roadWet' });

        domElements.resultContainer.innerHTML = `
            <h3 class="current-weather__city">${data.city.name}, ${data.city.country}</h3>
            <div class="current-weather__main">
                <div class="current-weather__icon">${getWeatherIcon(current.weather[0].icon)}</div>
                <div class="current-weather__details">
                    <span class="current-weather__temp">${Math.round(current.main.temp)}°C</span>
                    <span>${current.weather[0].description}</span>
                </div>
            </div>
            <div class="current-weather__extra-details">
                <div class="current-weather__detail-item detail-item--wind"><span>Wiatr</span><span>${current.wind.speed.toFixed(1)} m/s</span></div>
                <div class="current-weather__detail-item detail-item--sunrise"><span>Wschód słońca</span><span>${sunrise}</span></div>
                <div class="current-weather__detail-item detail-item--pressure"><span>Ciśnienie</span><span>${current.main.pressure} hPa</span></div>
                <div class="current-weather__detail-item detail-item--sunset"><span>Zachód słońca</span><span>${sunset}</span></div>
                <div class="road-condition__item"><span>Stan nawierzchni</span><span class="road-condition-value road-condition--${roadCondition.class}">${roadCondition.text}</span></div>
            </div>`;
    }

    function updateForecasts(data) {
        domElements.hourlyContainer.innerHTML = data.list.slice(0, 8).map(item => `
            <div class="hourly-forecast__item">
                <p class="hourly-forecast__time">${new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <div class="hourly-forecast__icon">${getWeatherIcon(item.weather[0].icon)}</div>
                <p class="hourly-forecast__temp">${Math.round(item.main.temp)}°C</p>
            </div>`).join('');

        domElements.forecastContainer.innerHTML = data.list.filter(item => item.dt_txt.includes("12:00:00")).slice(0, 5).map(item => `
            <div class="weather-app__forecast-day">
                <h4>${new Date(item.dt * 1000).toLocaleDateString('pl', { weekday: 'long' })}</h4>
                <div class="weather-app__forecast-icon">${getWeatherIcon(item.weather[0].icon)}</div>
                <p>${Math.round(item.main.temp)}°C</p>
            </div>`).join('');
        domElements.forecastsContainer.style.display = 'block';
    }

    function updateMap(lat, lon, cityName) {
        if (map) {
            domElements.mapContainer.style.display = 'block';
            map.invalidateSize();
            map.setView([lat, lon], 13);
            if (marker) {
                map.removeLayer(marker);
            }
            marker = L.marker([lat, lon]).addTo(map).bindPopup(cityName).openPopup();
        }
    }

    function updateAirQuality(data) {
        const aqi = data.list[0].main.aqi;
        const levels = { 1: 'Dobra', 2: 'Umiarkowana', 3: 'Średnia', 4: 'Zła', 5: 'Bardzo zła' };
        domElements.airQualityContainer.innerHTML = `
            <div class="aqi-value">${aqi}</div>
            <div class="aqi-label aqi-label-${aqi}">${levels[aqi]}</div>`;
    }
    
    function updateUvIndex(data) {
        const uvi = Math.round(data.value);
        let level, cssClass;
        if (uvi <= 2) { level = 'Niski'; cssClass = 'low'; }
        else if (uvi <= 5) { level = 'Umiarkowany'; cssClass = 'moderate'; }
        else if (uvi <= 7) { level = 'Wysoki'; cssClass = 'high'; }
        else if (uvi <= 10) { level = 'Bardzo wysoki'; cssClass = 'very-high'; }
        else { level = 'Ekstremalny'; cssClass = 'extreme'; }
        
        domElements.uvIndexContainer.innerHTML = `
            <div class="uv-value">${uvi}</div>
            <div class="uv-label uv-label-${cssClass}">${level}</div>`;
    }


    async function handleWeatherSearch(query, buttonToLoad) {
        if (!query || (typeof query === 'string' && !query.trim())) return;

        if(buttonToLoad) toggleButtonLoading(buttonToLoad, true);
        domElements.resultContainer.innerHTML = `<div class="weather-app__skeleton"><div class="skeleton" style="width: 200px; height: 2.2rem; margin-bottom: 1rem;"></div><div class="skeleton" style="width: 150px; height: 4rem;"></div></div>`;
        domElements.forecastsContainer.style.display = 'none';
        domElements.mapContainer.style.display = 'none';
        domElements.additionalInfoContainer.style.display = 'none';

        try {
            const weatherUrl = buildApiUrl(query);
            if (!weatherUrl) throw new Error("Nieprawidłowe zapytanie.");
            
            const weatherData = await fetchData(weatherUrl);
            const { lat, lon } = weatherData.city.coord;

            // Równoległe pobieranie dodatkowych danych
            const airQualityUrl = `/.netlify/functions/weather?endpoint=air_pollution&lat=${lat}&lon=${lon}`;
            const uvIndexUrl = `/.netlify/functions/weather?endpoint=uvi&lat=${lat}&lon=${lon}`;
            
            const [airQualityData, uvIndexData] = await Promise.all([
                fetchData(airQualityUrl),
                fetchData(uvIndexUrl)
            ]);

            // Aktualizacja UI
            updateCurrentWeather(weatherData);
            updateAirQuality(airQualityData);
            updateUvIndex(uvIndexData);
            updateMap(lat, lon, weatherData.city.name);
            updateForecasts(weatherData);
            domElements.additionalInfoContainer.style.display = 'grid';
            document.title = `Pogoda dla ${weatherData.city.name}`;

            if (typeof query === 'string') localStorage.setItem('lastCity', query.trim());
            else localStorage.removeItem('lastCity');

        } catch (error) {
            showError(`Błąd: ${error.message}`);
        } finally {
            if(buttonToLoad) toggleButtonLoading(buttonToLoad, false);
        }
    }
    
    // --- Inicjalizacja i nasłuchiwanie zdarzeń ---
    
    function setupEventListeners() {
        domElements.themeToggle.addEventListener('click', () => setTheme(currentTheme === 'light' ? 'dark' : 'light'));
        
        domElements.searchBtn?.addEventListener('click', () => handleWeatherSearch(domElements.cityInput.value, domElements.searchBtn));
        
        domElements.cityInput?.addEventListener('keyup', e => { 
            if (e.key === 'Enter') handleWeatherSearch(domElements.cityInput.value, domElements.searchBtn); 
        });
        
        domElements.geoBtn?.addEventListener('click', () => {
            if (navigator.geolocation) {
                toggleButtonLoading(domElements.geoBtn, true);
                navigator.geolocation.getCurrentPosition(
                    position => handleWeatherSearch({ latitude: position.coords.latitude, longitude: position.coords.longitude }, domElements.geoBtn),
                    () => { 
                        showError("Nie udało się pobrać lokalizacji. Sprawdź ustawienia przeglądarki.");
                        toggleButtonLoading(domElements.geoBtn, false);
                    }
                );
            }
        });
        
        domElements.forecastSwitcher?.addEventListener('click', function(e) {
            const button = e.target.closest('button');
            if (!button) return;
            const forecastType = button.dataset.forecast;
            if (domElements.forecastsContainer) {
                domElements.forecastsContainer.className = `show-${forecastType}`;
                domElements.forecastSwitcher.querySelector('.active').classList.remove('active');
                button.classList.add('active');
            }
        });
    }

    function init() {
        setTheme(currentTheme);
        initializeMap();
        setupEventListeners();
        const lastCity = localStorage.getItem('lastCity');
        if (lastCity) {
            domElements.cityInput.value = lastCity;
            handleWeatherSearch(lastCity, domElements.searchBtn);
        }
    }

    // --- Funkcje pomocnicze (pozostają bez zmian) ---
    function getWeatherIcon(iconCode) {
        const iconBaseUrl = 'https://basmilius.github.io/weather-icons/production/fill/all/';
        const iconMap = { '01d': 'clear-day.svg', '01n': 'clear-night.svg', '02d': 'partly-cloudy-day.svg', '02n': 'partly-cloudy-night.svg', '03d': 'cloudy.svg', '03n': 'cloudy.svg', '04d': 'overcast-day.svg', '04n': 'overcast-night.svg', '09d': 'rain.svg', '09n': 'rain.svg', '10d': 'partly-cloudy-day-rain.svg', '10n': 'partly-cloudy-night-rain.svg', '11d': 'thunderstorms-day.svg', '11n': 'thunderstorms-night.svg', '13d': 'snow.svg', '13n': 'snow.svg', '50d': 'fog-day.svg', '50n': 'fog-night.svg' };
        return `<img src="${iconBaseUrl}${iconMap[iconCode] || 'not-available.svg'}" alt="Ikona pogody" class="weather-icon-img">`;
    }

    init();
});
