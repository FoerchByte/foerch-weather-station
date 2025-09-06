document.addEventListener('DOMContentLoaded', () => {

    let currentTheme = localStorage.getItem('theme') || 'light';
    let map = null;
    let marker = null;
    let currentTileLayer = null; // Zmienna do przechowywania warstwy mapy / Variable to store the map layer

    // Obiekty konfiguracyjne dla warstw mapy / Configuration objects for map layers
    const tileLayers = {
        light: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        },
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }
    };

    const domElements = {
        searchBtn: document.getElementById('search-weather-btn'),
        cityInput: document.getElementById('city-input'),
        geoBtn: document.getElementById('geolocation-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        resultContainer: document.getElementById('weather-result-container'),
        alertsContainer: document.getElementById('weather-alerts-container'),
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
        updateMapTheme(theme); // Aktualizuj motyw mapy przy zmianie / Update map theme on change
    }

    function updateMapTheme(theme) {
        if (!map) return;
        const layerConfig = tileLayers[theme] || tileLayers.light;

        if (currentTileLayer) {
            map.removeLayer(currentTileLayer);
        }
        currentTileLayer = L.tileLayer(layerConfig.url, {
            attribution: layerConfig.attribution
        }).addTo(map);
    }

    function initializeMap() {
        if (!map) {
            map = L.map('map').setView([51.75, 19.45], 10);
            updateMapTheme(currentTheme); // Ustaw początkową warstwę mapy / Set the initial map layer
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
        if (domElements.alertsContainer) domElements.alertsContainer.innerHTML = '';
        domElements.forecastsContainer.style.display = 'none';
        domElements.mapContainer.style.display = 'none';
        domElements.forecastsContainer.classList.remove('collapsed');
    }

    function showError(message) {
        clearUI();
        domElements.resultContainer.innerHTML = `<div class="weather-app__error">${message}</div>`;
    }
    
    function normalizeCityName(city) {
        if (city.toLowerCase() === 'łódź') {
            return 'Lodz';
        }
        return city;
    }

    // Buduje URL do naszej funkcji Netlify
    // Builds the URL to our Netlify function
    function buildApiUrl(query) {
        let baseUrl = `/.netlify/functions/weather?`;
        if (typeof query === 'string' && query) {
            const normalizedCity = normalizeCityName(query);
            return `${baseUrl}city=${encodeURIComponent(normalizedCity)}`;
        } else if (typeof query === 'object' && query.latitude) {
            return `${baseUrl}lat=${query.latitude}&lon=${query.longitude}`;
        }
        return null;
    }
    
    // Pobiera wszystkie dane za pomocą jednego zapytania do naszej funkcji serwerless
    // Fetches all data with a single request to our serverless function
    async function fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error("Osiągnięto dzienny limit zapytań do serwisu pogodowego. Spróbuj ponownie jutro.");
            }
            const data = await response.json().catch(() => ({ message: `Błąd HTTP: ${response.status}` }));
            throw new Error(data.message || `Błąd HTTP: ${response.status}`);
        }
        return response.json();
    }

    // --- Funkcje aktualizujące UI (dostosowane do One Call API) ---
    // --- UI Update Functions (adapted for One Call API) ---
    function updateWeatherAlerts(alerts) {
        const container = domElements.alertsContainer;
        if (!container) return;

        container.innerHTML = ''; // Wyczyść poprzednie alerty / Clear previous alerts
        if (!alerts || alerts.length === 0) {
            container.style.display = 'none';
            return;
        }

        const alertHTML = alerts.map(alert => {
            const startTime = new Date(alert.start * 1000).toLocaleString('pl-PL');
            const endTime = new Date(alert.end * 1000).toLocaleString('pl-PL');

            return `
            <div class="weather-alert">
                <div class="weather-alert__icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path></svg>
                </div>
                <div class="weather-alert__content">
                    <h4 class="weather-alert__title">${alert.event}</h4>
                    <p class="weather-alert__sender">Wydane przez: ${alert.sender_name}</p>
                    <p>Ważne od ${startTime} do ${endTime}.</p>
                </div>
            </div>
            `;
        }).join('');

        container.innerHTML = alertHTML;
        container.style.display = 'block';
    }

    function updateCurrentWeather(data) {
        const { current, airQuality, locationName } = data;
        
        // Dane podstawowe z obiektu 'current'
        // Basic data from the 'current' object
        const sunrise = new Date(current.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sunset = new Date(current.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Stan nawierzchni
        // Road condition
        const roadCondition = current.temp > 2 && !['Rain', 'Snow', 'Drizzle'].includes(current.weather[0].main)
            ? { text: "Sucha", class: 'roadDry' }
            : (current.temp <= 2 ? { text: "Możliwe oblodzenie", class: 'roadIcy' } : { text: "Mokra", class: 'roadWet' });

        // Jakość powietrza (AQI) z dołączonego obiektu 'airQuality'
        // Air quality (AQI) from the attached 'airQuality' object
        const aqi = airQuality.main.aqi;
        const aqiLevels = { 1: 'Dobra', 2: 'Umiarkowana', 3: 'Średnia', 4: 'Zła', 5: 'Bardzo zła' };
        
        // Indeks UV z obiektu 'current'
        // UV index from the 'current' object
        const uvi = Math.round(current.uvi);
        let uvLevel, uvCssClass;
        if (uvi <= 2) { uvLevel = 'Niski'; uvCssClass = 'low'; }
        else if (uvi <= 5) { uvLevel = 'Umiarkowany'; uvCssClass = 'moderate'; }
        else if (uvi <= 7) { uvLevel = 'Wysoki'; uvCssClass = 'high'; }
        else if (uvi <= 10) { uvLevel = 'B. wysoki'; uvCssClass = 'very-high'; }
        else { uvLevel = 'Ekstremalny'; uvCssClass = 'extreme'; }

        domElements.resultContainer.innerHTML = `
            <h3 class="current-weather__city">${locationName}</h3>
            <div class="current-weather__main">
                <div class="current-weather__icon">${getWeatherIcon(current.weather[0].icon)}</div>
                <div class="current-weather__details">
                    <span class="current-weather__temp">${Math.round(current.temp)}°C</span>
                    <span>${current.weather[0].description}</span>
                </div>
            </div>

            <!-- Kontener na alerty, zostanie wypełniony przez JS -->
            <!-- Container for alerts, will be populated by JS -->
            <div id="weather-alerts-container" style="display: none;"></div>

            <div class="current-weather__extra-details">
                <div class="current-weather__detail-item detail-item--wind"><span>Wiatr</span><span class="detail-item-value">${current.wind_speed.toFixed(1)} m/s</span></div>
                <div class="current-weather__detail-item detail-item--pressure"><span>Ciśnienie</span><span class="detail-item-value">${current.pressure} hPa</span></div>
                <div class="current-weather__detail-item detail-item--sunrise"><span>Wschód słońca</span><span class="detail-item-value">${sunrise}</span></div>
                <div class="current-weather__detail-item detail-item--sunset"><span>Zachód słońca</span><span class="detail-item-value">${sunset}</span></div>
                <div class="current-weather__detail-item detail-item--road"><span>Stan nawierzchni</span><span class="detail-item-value value-color--${roadCondition.class}">${roadCondition.text}</span></div>
                <div class="current-weather__detail-item detail-item--aqi"><span>Jakość powietrza</span><span class="detail-item-value value-color--aqi-${aqi}">${aqiLevels[aqi]}</span></div>
                <div class="current-weather__detail-item detail-item--uv"><span>Indeks UV</span><span class="detail-item-value value-color--uv-${uvCssClass}">${uvLevel}</span></div>
            </div>`;
    }

    function updateForecasts(data) {
        // Prognoza godzinowa z tablicy 'hourly'
        // Hourly forecast from the 'hourly' array
        domElements.hourlyContainer.innerHTML = data.hourly.slice(0, 8).map(item => `
            <div class="hourly-forecast__item">
                <p class="hourly-forecast__time">${new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <div class="hourly-forecast__icon">${getWeatherIcon(item.weather[0].icon)}</div>
                <p class="hourly-forecast__temp">${Math.round(item.temp)}°C</p>
            </div>`).join('');

        // Prognoza 5-dniowa z tablicy 'daily'
        // 5-day forecast from the 'daily' array
        domElements.forecastContainer.innerHTML = data.daily.slice(0, 5).map(item => `
            <div class="weather-app__forecast-day">
                <h4>${new Date(item.dt * 1000).toLocaleDateString('pl', { weekday: 'long' })}</h4>
                <div class="weather-app__forecast-icon">${getWeatherIcon(item.weather[0].icon)}</div>
                <p>${Math.round(item.temp.day)}°C</p>
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
            const apiUrl = buildApiUrl(query);
            if (!apiUrl) throw new Error("Nieprawidłowe zapytanie.");
            
            // Pojedyncze, zunifikowane zapytanie
            // Single, unified request
            const data = await fetchData(apiUrl);
            
            // Aktualizacja UI
            updateCurrentWeather(data);
            updateWeatherAlerts(data.alerts); 
            updateMap(data.lat, data.lon, data.locationName);
            updateForecasts(data);

            // Logika zwijania prognozy w widoku pionowym na mobile
            if (window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches) {
                domElements.forecastsContainer.classList.add('collapsed');
            } else {
                domElements.forecastsContainer.classList.remove('collapsed');
            }

            document.title = `Pogoda dla ${data.locationName}`;

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

