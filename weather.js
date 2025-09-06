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
        hourlyContainer: document.getElementById('hourly-forecast-container'),
        forecastContainer: document.getElementById('forecast-container'),
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
        domElements.forecastsContainer.classList.remove('collapsed');
    }

    function showError(message) {
        clearUI();
        domElements.resultContainer.innerHTML = `<div class="weather-app__error">${message}</div>`;
    }

    function buildApiUrl(query, endpoint = 'forecast') {
        const lang = 'pl';
        let baseUrl = `/.netlify/functions/weather?endpoint=${endpoint}&`;
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
    function updateCurrentWeather(weatherData, airData, uvData) {
        const current = weatherData.list[0];
        const { city } = weatherData;

        // Dane podstawowe
        const sunrise = new Date((city.sunrise + city.timezone) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        const sunset = new Date((city.sunset + city.timezone) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        
        // Stan nawierzchni
        const roadCondition = current.main.temp > 2 && !['Rain', 'Snow', 'Drizzle'].includes(current.weather[0].main)
            ? { text: "Sucha", class: 'roadDry' }
            : (current.main.temp <= 2 ? { text: "Możliwe oblodzenie", class: 'roadIcy' } : { text: "Mokra", class: 'roadWet' });

        // Jakość powietrza (AQI)
        const aqi = airData.list[0].main.aqi;
        const aqiLevels = { 1: 'Dobra', 2: 'Umiarkowana', 3: 'Średnia', 4: 'Zła', 5: 'Bardzo zła' };
        
        // Indeks UV
        const uvi = Math.round(uvData.value);
        let uvLevel, uvCssClass;
        if (uvi <= 2) { uvLevel = 'Niski'; uvCssClass = 'low'; }
        else if (uvi <= 5) { uvLevel = 'Umiarkowany'; uvCssClass = 'moderate'; }
        else if (uvi <= 7) { uvLevel = 'Wysoki'; uvCssClass = 'high'; }
        else if (uvi <= 10) { uvLevel = 'B. wysoki'; uvCssClass = 'very-high'; }
        else { uvLevel = 'Ekstremalny'; uvCssClass = 'extreme'; }

        domElements.resultContainer.innerHTML = `
            <h3 class="current-weather__city">${city.name}, ${city.country}</h3>
            <div class="current-weather__main">
                <div class="current-weather__icon">${getWeatherIcon(current.weather[0].icon)}</div>
                <div class="current-weather__details">
                    <span class="current-weather__temp">${Math.round(current.main.temp)}°C</span>
                    <span>${current.weather[0].description}</span>
                </div>
            </div>
            <div class="current-weather__extra-details">
                <div class="current-weather__detail-item detail-item--wind"><span>Wiatr</span><span class="detail-item-value">${current.wind.speed.toFixed(1)} m/s</span></div>
                <div class="current-weather__detail-item detail-item--pressure"><span>Ciśnienie</span><span class="detail-item-value">${current.main.pressure} hPa</span></div>
                <div class="current-weather__detail-item detail-item--sunrise"><span>Wschód słońca</span><span class="detail-item-value">${sunrise}</span></div>
                <div class="current-weather__detail-item detail-item--sunset"><span>Zachód słońca</span><span class="detail-item-value">${sunset}</span></div>
                <div class="current-weather__detail-item detail-item--road"><span>Stan nawierzchni</span><span class="detail-item-value value-color--${roadCondition.class}">${roadCondition.text}</span></div>
                <div class="current-weather__detail-item detail-item--aqi"><span>Jakość powietrza</span><span class="detail-item-value value-color--aqi-${aqi}">${aqiLevels[aqi]}</span></div>
                <div class="current-weather__detail-item detail-item--uv"><span>Indeks UV</span><span class="detail-item-value value-color--uv-${uvCssClass}">${uvLevel}</span></div>
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

    async function handleWeatherSearch(query, buttonToLoad) {
        if (!query || (typeof query === 'string' && !query.trim())) return;

        if(buttonToLoad) toggleButtonLoading(buttonToLoad, true);
        clearUI();
        domElements.resultContainer.innerHTML = `<div class="weather-app__skeleton"><div class="skeleton" style="width: 200px; height: 2.2rem; margin-bottom: 1rem;"></div><div class="skeleton" style="width: 150px; height: 4rem;"></div></div>`;
        
        try {
            const weatherUrl = buildApiUrl(query);
            if (!weatherUrl) throw new Error("Nieprawidłowe zapytanie.");
            
            const weatherData = await fetchData(weatherUrl);
            const coords = { latitude: weatherData.city.coord.lat, longitude: weatherData.city.coord.lon };

            const airQualityUrl = buildApiUrl(coords, 'air_pollution');
            const uvIndexUrl = buildApiUrl(coords, 'uvi');
            
            const [airQualityData, uvIndexData] = await Promise.all([
                fetchData(airQualityUrl),
                fetchData(uvIndexUrl)
            ]);

            // Aktualizacja UI
            updateCurrentWeather(weatherData, airQualityData, uvIndexData);
            updateMap(coords.latitude, coords.longitude, weatherData.city.name);
            updateForecasts(weatherData);

            // Logika zwijania prognozy w widoku pionowym na mobile
            if (window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches) {
                domElements.forecastsContainer.classList.add('collapsed');
            } else {
                domElements.forecastsContainer.classList.remove('collapsed');
            }

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
        domElements.cityInput?.addEventListener('keyup', e => { if (e.key === 'Enter') handleWeatherSearch(domElements.cityInput.value, domElements.searchBtn); });
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

            domElements.forecastsContainer.classList.remove('collapsed');

            const forecastType = button.dataset.forecast;
            if (domElements.forecastsContainer) {
                if (forecastType === 'hourly') {
                    domElements.forecastsContainer.classList.add('show-hourly');
                    domElements.forecastsContainer.classList.remove('show-daily');
                } else {
                    domElements.forecastsContainer.classList.add('show-daily');
                    domElements.forecastsContainer.classList.remove('show-hourly');
                }

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

    function getWeatherIcon(iconCode) {
        const iconBaseUrl = 'https://basmilius.github.io/weather-icons/production/fill/all/';
        const iconMap = { '01d': 'clear-day.svg', '01n': 'clear-night.svg', '02d': 'partly-cloudy-day.svg', '02n': 'partly-cloudy-night.svg', '03d': 'cloudy.svg', '03n': 'cloudy.svg', '04d': 'overcast-day.svg', '04n': 'overcast-night.svg', '09d': 'rain.svg', '09n': 'rain.svg', '10d': 'partly-cloudy-day-rain.svg', '10n': 'partly-cloudy-night-rain.svg', '11d': 'thunderstorms-day.svg', '11n': 'thunderstorms-night.svg', '13d': 'snow.svg', '13n': 'snow.svg', '50d': 'fog-day.svg', '50n': 'fog-night.svg' };
        return `<img src="${iconBaseUrl}${iconMap[iconCode] || 'not-available.svg'}" alt="Ikona pogody" class="weather-icon-img">`;
    }

    init();
});

