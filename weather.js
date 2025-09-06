document.addEventListener('DOMContentLoaded', () => {
    // --- Zmienne globalne i referencje DOM ---
    // PL: Zmienne globalne i odwołania do elementów DOM
    // EN: Global variables and DOM references
    let map = null;
    let marker = null;
    let hourlyForecastData = [];
    let currentHourlyRange = 24; // Domyślny zakres: 24h / Default range: 24h

    const dom = {
        searchBtn: document.getElementById('search-weather-btn'),
        cityInput: document.getElementById('city-input'),
        geoBtn: document.getElementById('geolocation-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        weatherResultContainer: document.getElementById('weather-result-container'),
        forecastsContainer: document.getElementById('forecasts-container'),
        mapContainer: document.getElementById('map-container'),
        alertsContainer: document.getElementById('weather-alerts-container'),
        hourly: {
            container: document.getElementById('hourly-forecast-container'),
            rangeToggleBtn: document.getElementById('hourly-range-toggle'),
            sliderPrevBtn: document.getElementById('hourly-slider-prev'),
            sliderNextBtn: document.getElementById('hourly-slider-next'),
            scrollWrapper: document.querySelector('.hourly-forecast__scroll-wrapper'),
        },
        daily: {
            container: document.getElementById('forecast-container'),
        },
    };

    // --- Funkcje pomocnicze / Helper Functions ---
    const isMobilePortrait = () => window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;

    function setTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        localStorage.setItem('theme', theme);
        if (map) updateMapTileLayer();
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

    function showError(message) {
        dom.weatherResultContainer.innerHTML = `<div class="weather-app__error">${message}</div>`;
        dom.forecastsContainer.style.display = 'none';
        dom.mapContainer.style.display = 'none';
        dom.alertsContainer.style.display = 'none';
    }

    // --- Inicjalizacja i obsługa mapy / Map Initialization and Handling ---
    let lightTileLayer, darkTileLayer;
    function initializeMap() {
        if (!map) {
            map = L.map('map').setView([51.75, 19.45], 10);
            lightTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });
            darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            });
            updateMapTileLayer();
        }
    }

    function updateMapTileLayer() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const targetLayer = isDarkMode ? darkTileLayer : lightTileLayer;
        const otherLayer = isDarkMode ? lightTileLayer : darkTileLayer;

        if (map.hasLayer(otherLayer)) {
            map.removeLayer(otherLayer);
        }
        if (!map.hasLayer(targetLayer)) {
            map.addLayer(targetLayer);
        }
    }

    function updateMap(lat, lon, cityName) {
        if (map) {
            map.setView([lat, lon], 13);
            if (marker) map.removeLayer(marker);
            marker = L.marker([lat, lon]).addTo(map).bindPopup(cityName).openPopup();
        }
    }

    // --- Pobieranie i przetwarzanie danych pogodowych / Weather Data Fetching and Processing ---
    async function getWeatherData(query) {
        let url;

        if (typeof query === 'string' && query) {
            url = `/.netlify/functions/weather?city=${encodeURIComponent(query.trim())}`;
        } else if (typeof query === 'object' && query.latitude) {
            url = `/.netlify/functions/weather?lat=${query.latitude}&lon=${query.longitude}`;
        } else {
            return null;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            const errorMessage = response.status === 429 ? 
                "Przekroczono dzienny limit zapytań. Spróbuj ponownie jutro." :
                (data.message || "Błąd serwera");
            throw new Error(errorMessage);
        }
        return data;
    }

    // --- Renderowanie komponentów UI / UI Components Rendering ---
    const weatherIcons = {
        getIcon: function(iconCode) {
            const iconBaseUrl = 'https://basmilius.github.io/weather-icons/production/fill/all/';
            const iconMap = {
                '01d': 'clear-day.svg', '01n': 'clear-night.svg', '02d': 'partly-cloudy-day.svg', 
                '02n': 'partly-cloudy-night.svg', '03d': 'cloudy.svg', '03n': 'cloudy.svg', 
                '04d': 'overcast-day.svg', '04n': 'overcast-night.svg', '09d': 'rain.svg', 
                '09n': 'rain.svg', '10d': 'partly-cloudy-day-rain.svg', '10n': 'partly-cloudy-night-rain.svg',
                '11d': 'thunderstorms-day.svg', '11n': 'thunderstorms-night.svg', '13d': 'snow.svg', 
                '13n': 'snow.svg', '50d': 'fog-day.svg', '50n': 'fog-night.svg',
            };
            return `${iconBaseUrl}${iconMap[iconCode] || 'not-available.svg'}`;
        }
    };
    
    function updateCurrentWeather(data) {
        if (!data || !data.location || !data.location.name) {
            throw new Error("Otrzymano niekompletne dane z serwera.");
        }

        const roadCondition = data.current.temp > 2 && !['Rain', 'Snow', 'Drizzle'].includes(data.current.weather[0].main)
            ? { text: "Sucha", class: 'roadDry' }
            : (data.current.temp <= 2 ? { text: "Możliwe oblodzenie", class: 'roadIcy' } : { text: "Mokra", class: 'roadWet' });

        const aqiMap = { 1: "Dobra", 2: "Umiarkowana", 3: "Średnia", 4: "Zła", 5: "Bardzo zła" };
        const uvMap = { low: "Niski", moderate: "Umiarkowany", high: "Wysoki", "very-high": "Bardzo wysoki", extreme: "Ekstremalny" };
        const uvIndex = Math.round(data.current.uvi);
        let uvCategory = 'low';
        if (uvIndex >= 11) uvCategory = 'extreme';
        else if (uvIndex >= 8) uvCategory = 'very-high';
        else if (uvIndex >= 6) uvCategory = 'high';
        else if (uvIndex >= 3) uvCategory = 'moderate';
        
        const today = data.daily[0];
        const moonrise = new Date(today.moonrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const moonset = new Date(today.moonset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        dom.weatherResultContainer.innerHTML = `
            <h3 class="current-weather__city">${data.location.name}, ${data.location.country}</h3>
            <div class="current-weather__main">
                <div class="current-weather__icon"><img src="${weatherIcons.getIcon(data.current.weather[0].icon)}" alt="Weather icon" class="weather-icon-img"></div>
                <div class="current-weather__details">
                    <span class="current-weather__temp">${Math.round(data.current.temp)}°C</span>
                    <span>${data.current.weather[0].description}</span>
                </div>
            </div>
            <div id="weather-alerts-container"></div>
            <div class="current-weather__extra-details">
                <div class="current-weather__detail-item detail-item--wind"><span class="detail-item-header"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1-3.54 3.54l-6.85 6.85a2.5 2.5 0 1 1-3.54-3.54l6.85-6.85a2.5 2.5 0 1 1 3.54 3.54z"/></svg>Wiatr</span><span class="detail-item-value">${data.current.wind_speed.toFixed(1)} m/s</span></div>
                <div class="current-weather__detail-item detail-item--pressure"><span class="detail-item-header"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 12H19a2.5 2.5 0 0 0-5 0H2.5"/><path d="M21.5 12v-6a2.5 2.5 0 0 0-5 0v6"/><path d="M2.5 12v6a2.5 2.5 0 0 0 5 0v-6"/></svg>Ciśnienie</span><span class="detail-item-value">${data.current.pressure} hPa</span></div>
                <div class="current-weather__detail-item detail-item--road"><span class="detail-item-header"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0-4.4-3.6-8-8-8s-8 3.6-8 8c0 2 .8 3.8 2 5l-3 7h18l-3-7c1.2-1.2 2-3 2-5Z"/><path d="M12 10h.01"/></svg>Stan nawierzchni</span><span class="detail-item-value value-color--${roadCondition.class}">${roadCondition.text}</span></div>
                <div class="current-weather__detail-item detail-item--sunrise"><span class="detail-item-header"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>Wschód słońca</span><span class="detail-item-value">${new Date(data.current.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div class="current-weather__detail-item detail-item--sunset"><span class="detail-item-header"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4-4-4 4"/><path d="M16 18a4 4 0 0 1-8 0"/></svg>Zachód słońca</span><span class="detail-item-value">${new Date(data.current.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div class="current-weather__detail-item detail-item--aqi"><span class="detail-item-header"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 4.5a8.45 8.45 0 0 0-5.04 1.94 8.45 8.45 0 0 0-2.02 5.07 8.45 8.45 0 0 0 .5 3.51 8.45 8.45 0 0 0 3.51 .5h8.55a8.45 8.45 0 0 0 2.02-5.07 8.45 8.45 0 0 0-5.04-1.94Z"/><path d="M12.5 4.5a8.45 8.45 0 0 1 5.04 1.94 8.45 8.45 0 0 1 2.02 5.07 8.45 8.45 0 0 1-.5 3.51 8.45 8.45 0 0 1-3.51 .5h-8.55a8.45 8.45 0 0 1-2.02-5.07 8.45 8.45 0 0 1 5.04-1.94Z"/><path d="M8 15h8"/><path d="M8 12h3"/><path d="M13 12h3"/></svg>Jakość powietrza</span><span class="detail-item-value value-color--aqi-${data.air_quality.main.aqi}">${aqiMap[data.air_quality.main.aqi]}</span></div>
                <div class="current-weather__detail-item detail-item--uv"><span class="detail-item-header"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v1"/><path d="M12 20v1"/><path d="M3 12h1"/><path d="M20 12h1"/><path d="m19.07 4.93-1.41 1.41"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 19.07-1.41-1.41"/><path d="m6.34 6.34-1.41-1.41"/><circle cx="12" cy="12" r="4"/><path d="M12 16a4 4 0 0 0 4-4"/></svg>Indeks UV</span><span class="detail-item-value value-color--uv-${uvCategory}">${uvMap[uvCategory]}</span></div>
                <div class="current-weather__detail-item detail-item--moonrise"><span class="detail-item-header"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M18 12h-6"/><path d="M12 18s-4-3-4-6 4-6 4-6"/><path d="M12 6s4 3 4 6-4 6-4 6"/></svg>Wschód księżyca</span><span class="detail-item-value">${moonrise}</span></div>
                <div class="current-weather__detail-item detail-item--moonset"><span class="detail-item-header"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18V6"/><path d="M6 12h6"/><path d="M12 6s-4 3-4 6 4 6 4 6"/><path d="M12 18s4-3 4-6-4-6-4-6"/></svg>Zachód księżyca</span><span class="detail-item-value">${moonset}</span></div>
            </div>
        `;
        updateWeatherAlerts(data.alerts);
    }

    function updateWeatherAlerts(alerts) {
        const container = document.getElementById('weather-alerts-container');
        if (!alerts || alerts.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }
        container.innerHTML = alerts.map(alert => `
            <div class="weather-alert">
                <div class="weather-alert__icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <div class="weather-alert__content">
                    <h4 class="weather-alert__title">${alert.event}</h4>
                    <p class="weather-alert__sender">Wydane przez: ${alert.sender_name}</p>
                </div>
            </div>
        `).join('');
        container.style.display = 'block';
    }

    function renderHourlyForecast() {
        const range = isMobilePortrait() ? currentHourlyRange : 48;
        dom.hourly.container.innerHTML = hourlyForecastData.slice(0, range).map(item => `
            <div class="hourly-forecast__item">
                <p class="hourly-forecast__time">${new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit' })}:00</p>
                <div class="hourly-forecast__icon"><img src="${weatherIcons.getIcon(item.weather[0].icon)}" alt="" class="weather-icon-img"></div>
                <p class="hourly-forecast__temp">${Math.round(item.temp)}°C</p>
                <div class="hourly-forecast__pop">
                     <svg class="hourly-forecast__pop-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1.68a10.32 10.32 0 0 1 10.32 10.32c0 5.7-4.62 10.32-10.32 10.32S1.68 17.7 1.68 12 6.3 1.68 12 1.68zM12 7.44v5.76M12 16.8h.01"/></svg>
                    <span>${Math.round(item.pop * 100)}%</span>
                </div>
            </div>
        `).join('');
        updateSliderButtons();
    }
    
    function updateDailyForecast(data) {
        dom.daily.container.innerHTML = data.daily.slice(1, 6).map(day => `
            <div class="weather-app__forecast-day">
                <h4>${new Date(day.dt * 1000).toLocaleDateString('pl-PL', { weekday: 'long' })}</h4>
                <div class="weather-app__forecast-icon"><img src="${weatherIcons.getIcon(day.weather[0].icon)}" alt="" class="weather-icon-img"></div>
                <p>${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</p>
            </div>
        `).join('');
    }

    // --- Główna funkcja aplikacji / Main Application Logic ---
    async function handleWeatherSearch(query, buttonToLoad) {
        if (!query) {
            // Cicha obsługa - nie pokazuj błędu na starcie, jeśli nie ma miasta
            // Silent handling - don't show an error on start if there's no city
            return;
        }
        const skeletonHTML = `<div class="weather-app__skeleton"><div class="skeleton" style="width: 200px; height: 2.2rem; margin-bottom: 1rem;"></div><div class="skeleton" style="width: 150px; height: 4rem;"></div></div>`;
        dom.weatherResultContainer.innerHTML = skeletonHTML;
        dom.forecastsContainer.style.display = 'none';
        dom.mapContainer.style.display = 'none';
        if (buttonToLoad) toggleButtonLoading(buttonToLoad, true);

        try {
            const data = await getWeatherData(query);
            if (!data) {
                showError("Wpisz miasto lub zezwól na geolokalizację.");
                return;
            }
            
            if (typeof query === 'string' && query) {
                localStorage.setItem('lastCity', query.trim());
            }

            hourlyForecastData = data.hourly;
            updateCurrentWeather(data);
            updateDailyForecast(data);

            if (isMobilePortrait()) {
                currentHourlyRange = 24;
                dom.hourly.rangeToggleBtn.textContent = 'Pokaż 48h';
                dom.hourly.rangeToggleBtn.style.display = 'block';
            } else {
                currentHourlyRange = 48;
                 dom.hourly.rangeToggleBtn.style.display = 'none';
            }
            renderHourlyForecast();
            
            dom.mapContainer.style.display = 'block';
            updateMap(data.location.lat, data.location.lon, data.location.name);
            
            dom.forecastsContainer.style.display = 'block';
            if (isMobilePortrait()) {
                dom.forecastsContainer.classList.add('collapsed');
            }

        } catch (error) {
            showError(`Błąd: ${error.message}`);
        } finally {
            if (buttonToLoad) toggleButtonLoading(buttonToLoad, false);
        }
    }

    // --- Obsługa slidera prognozy godzinowej / Hourly Forecast Slider Handling ---
    function updateSliderButtons() {
        if(isMobilePortrait() || !dom.hourly.scrollWrapper) return;
        const { scrollLeft, scrollWidth, clientWidth } = dom.hourly.scrollWrapper;
        dom.hourly.sliderPrevBtn.disabled = scrollLeft <= 0;
        // Dodano mały bufor (1px), aby uniknąć problemów z zaokrąglaniem
        // Added a small buffer (1px) to avoid rounding issues
        dom.hourly.sliderNextBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 1;
    }

    function handleSliderScroll(direction) {
        const itemWidth = dom.hourly.container.querySelector('.hourly-forecast__item')?.offsetWidth || 100;
        const scrollAmount = (itemWidth + 12) * 4 * direction; // Przewijaj o 4 elementy / Scroll by 4 items
        dom.hourly.scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    
    // --- Inicjalizacja i event listenery / Initialization and Event Listeners ---
    function setupEventListeners() {
        dom.themeToggle.addEventListener('click', () => {
            const current = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            setTheme(current === 'light' ? 'dark' : 'light');
        });
        
        dom.searchBtn?.addEventListener('click', () => handleWeatherSearch(dom.cityInput.value.trim(), dom.searchBtn));
        dom.cityInput?.addEventListener('keyup', e => { if (e.key === 'Enter') handleWeatherSearch(dom.cityInput.value.trim(), dom.searchBtn); });
        dom.geoBtn?.addEventListener('click', () => {
            if (navigator.geolocation) {
                toggleButtonLoading(dom.geoBtn, true);
                navigator.geolocation.getCurrentPosition(
                    position => handleWeatherSearch({ latitude: position.coords.latitude, longitude: position.coords.longitude }, dom.geoBtn),
                    () => { 
                        showError("Nie udało się pobrać lokalizacji. Sprawdź ustawienia przeglądarki.");
                        toggleButtonLoading(dom.geoBtn, false);
                    }
                );
            }
        });
        
        document.getElementById('forecast-switcher')?.addEventListener('click', function(e) {
            const button = e.target.closest('button');
            if (!button) return;
            const forecastType = button.dataset.forecast;
            dom.forecastsContainer.className = `show-${forecastType}`;
            this.querySelector('.active').classList.remove('active');
            button.classList.add('active');
            dom.forecastsContainer.classList.remove('collapsed');
        });

        dom.hourly.sliderPrevBtn.addEventListener('click', () => handleSliderScroll(-1));
        dom.hourly.sliderNextBtn.addEventListener('click', () => handleSliderScroll(1));
        dom.hourly.scrollWrapper.addEventListener('scroll', updateSliderButtons);

        dom.hourly.rangeToggleBtn.addEventListener('click', () => {
            currentHourlyRange = currentHourlyRange === 24 ? 48 : 24;
            dom.hourly.rangeToggleBtn.textContent = currentHourlyRange === 24 ? 'Pokaż 48h' : 'Pokaż 24h';
            renderHourlyForecast();
        });
    }

    // --- Start aplikacji / App Start ---
    function initializeApp() {
        setTheme(localStorage.getItem('theme') || 'light');
        initializeMap();
        setupEventListeners();

        const lastCity = localStorage.getItem('lastCity');
        if (lastCity) {
            dom.cityInput.value = lastCity;
            handleWeatherSearch(lastCity, dom.searchBtn);
        }
    }

    initializeApp();
});

