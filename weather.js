class WeatherApp {
    constructor() {
        // --- Stan aplikacji / Application State ---
        this.map = null;
        this.marker = null;
        this.precipitationLayer = null;
        this.hourlyForecastData = [];
        this.currentHourlyRange = 24;
        this.favorites = [];
        this.currentLocation = null;
        this.minutelyChart = null;
        this.minutelyData = [];

        // --- Referencje DOM / DOM References ---
        this.dom = {
            searchBtn: document.getElementById('search-weather-btn'),
            cityInput: document.getElementById('city-input'),
            geoBtn: document.getElementById('geolocation-btn'),
            themeToggle: document.getElementById('theme-toggle'),
            weatherResultContainer: document.getElementById('weather-result-container'),
            weatherAlertsContainer: null, 
            forecastsContainer: document.getElementById('forecasts-container'),
            mapContainer: document.getElementById('map-container'),
            precipitationToggle: document.getElementById('precipitation-toggle'),
            forecastSwitcher: document.getElementById('forecast-switcher'),
            favoritesContainer: document.getElementById('favorites-container'),
            addFavoriteBtn: null,
            minutely: {
                wrapper: document.querySelector('.minutely-forecast__wrapper'),
                chartCanvas: document.getElementById('minutely-chart'),
            },
            hourly: {
                wrapper: document.querySelector('.hourly-forecast__wrapper'),
                container: document.getElementById('hourly-forecast-container'),
                rangeSwitcher: document.getElementById('hourly-range-switcher'),
                sliderPrevBtn: document.getElementById('hourly-slider-prev'),
                sliderNextBtn: document.getElementById('hourly-slider-next'),
                scrollWrapper: document.querySelector('.hourly-forecast__scroll-wrapper'),
            },
            daily: {
                wrapper: document.querySelector('.daily-forecast__wrapper'),
                container: document.getElementById('forecast-container'),
            },
        };
    }

    // --- Inicjalizacja Aplikacji / Application Initialization ---
    init() {
        this.setTheme(localStorage.getItem('theme') || 'light');
        this.initMap();
        this.loadFavorites();
        this.bindEvents();
        const lastCity = localStorage.getItem('lastCity');
        if (lastCity) {
            this.dom.cityInput.value = lastCity;
            this.handleSearch(lastCity, this.dom.searchBtn);
        } else if (this.favorites.length > 0) {
            this.handleSearch(this.favorites[0].name, this.dom.searchBtn);
        } else {
             // Inicjalizacja pustego widoku, jeśli nie ma ostatniego miasta ani ulubionych
             this.dom.favoritesContainer.innerHTML = `<p class="favorites-empty-state">Dodaj swoje ulubione lokalizacje za pomocą ikony gwiazdki ⭐</p>`;
        }
    }

    // --- Powiązanie Eventów / Event Binding ---
    bindEvents() {
        this.dom.themeToggle.addEventListener('click', () => this.setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark'));
        this.dom.searchBtn?.addEventListener('click', () => this.handleSearch(this.dom.cityInput.value.trim(), this.dom.searchBtn));
        this.dom.cityInput?.addEventListener('keyup', e => { if (e.key === 'Enter') this.handleSearch(this.dom.cityInput.value.trim(), this.dom.searchBtn); });
        this.dom.geoBtn?.addEventListener('click', () => this.handleGeolocation());
        this.dom.precipitationToggle?.addEventListener('change', () => this.togglePrecipitationLayer());
        this.dom.forecastSwitcher?.addEventListener('click', (e) => this.handleForecastSwitch(e));
        this.dom.hourly.rangeSwitcher?.addEventListener('click', (e) => this.handleHourlyRangeSwitch(e));
        this.dom.hourly.sliderPrevBtn.addEventListener('click', () => this.handleSliderScroll(-1));
        this.dom.hourly.sliderNextBtn.addEventListener('click', () => this.handleSliderScroll(1));
        this.dom.hourly.scrollWrapper.addEventListener('scroll', () => this.updateSliderButtons(), { passive: true });
        window.addEventListener('resize', () => {
            this.renderHourlyForecast();
            this.updateSliderButtons();
        });
        this.dom.favoritesContainer.addEventListener('click', (e) => this.handleFavoriteClick(e));
    }

    // --- Logika Ulubionych / Favorites Logic ---
    loadFavorites() {
        this.favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
        this.renderFavorites();
    }

    saveFavorites() {
        localStorage.setItem('weatherFavorites', JSON.stringify(this.favorites));
    }

    renderFavorites() {
        if (this.favorites.length > 0) {
            this.dom.favoritesContainer.innerHTML = this.favorites.map(fav => 
                `<button class="favorite-location-btn" data-city="${fav.name}">${fav.name}</button>`
            ).join('');
        } else {
            this.dom.favoritesContainer.innerHTML = `<p class="favorites-empty-state">Dodaj swoje ulubione lokalizacje za pomocą ikony gwiazdki ⭐</p>`;
        }
    }

    toggleFavorite() {
        if (!this.currentLocation) return;

        const locationId = `${this.currentLocation.lat},${this.currentLocation.lon}`;
        const index = this.favorites.findIndex(fav => `${fav.lat},${fav.lon}` === locationId);
        
        if (index > -1) {
            this.favorites.splice(index, 1);
        } else {
            if (this.favorites.length >= 5) {
                alert("Możesz dodać maksymalnie 5 ulubionych lokalizacji.");
                return;
            }
            this.favorites.push(this.currentLocation);
        }
        
        this.saveFavorites();
        this.renderFavorites();
        this.updateFavoriteButtonState();
    }

    updateFavoriteButtonState() {
        if (!this.currentLocation || !this.dom.addFavoriteBtn) return;
        const locationId = `${this.currentLocation.lat},${this.currentLocation.lon}`;
        const isFav = this.favorites.some(fav => `${fav.lat},${fav.lon}` === locationId);
        this.dom.addFavoriteBtn.classList.toggle('is-favorite', isFav);
        this.dom.addFavoriteBtn.setAttribute('aria-label', isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych');
        this.dom.addFavoriteBtn.disabled = !isFav && this.favorites.length >= 5;
    }

    handleFavoriteClick(event) {
        const btn = event.target.closest('.favorite-location-btn');
        if (!btn) return;
        const cityName = btn.dataset.city;
        if (cityName) {
            this.dom.cityInput.value = cityName;
            this.handleSearch(cityName, null);
        }
    }

    translateAlertEvent(eventName) {
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

    translateOverview(overview) {
        if (!overview) return '';
        const translations = {
            'Expect a day of ': 'Spodziewaj się dnia z ',
            'partly cloudy with rain': 'częściowym zachmurzeniem i deszczem',
            'partly cloudy': 'częściowym zachmurzeniem',
            'light rain': 'lekkimi opadami deszczu',
            'heavy rain': 'intensywnymi opadami deszczu',
            'rain': 'deszczem',
            'clear sky': 'bezchmurnym niebem',
            'snow': 'opadami śniegu',
            'thunderstorms': 'burzami',
            'fog': 'mgłą',
        };
        let translated = overview;
        for (const [key, value] of Object.entries(translations)) {
            translated = translated.replace(new RegExp(key, 'gi'), value);
        }
        translated = translated.charAt(0).toUpperCase() + translated.slice(1);
        if (!translated.endsWith('.')) {
            translated += '.';
        }
        return translated;
    }


    // --- Renderowanie UI / UI Rendering ---
    renderCurrentWeather(data) {
        const { location } = data;
        
        const headerHtml = `
            <div class="current-weather__header">
                <h3 class="current-weather__city">${location.name}</h3>
                <button id="add-favorite-btn" class="favorite-btn" aria-label="Dodaj do ulubionych">
                    <svg class="star-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
            </div>`;

        const translatedOverview = this.translateOverview(data.overview);
        const overviewHtml = translatedOverview ? `
            <div class="weather-overview">
                <svg class="weather-overview__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L12 2C17.5228 2 22 6.47715 22 12V12C22 17.5228 17.5228 22 12 22V22C6.47715 22 2 17.5228 2 12V12C2 6.47715 6.47715 2 12 2V2Z"></path><path d="M13.8284 9.17157L12 11L10.1716 9.17157"></path><path d="M9.17157 13.8284L11 12L9.17157 10.1716"></path><path d="M13.8284 14.8284L12 13L10.1716 14.8284"></path><path d="M14.8284 10.1716L13 12L14.8284 13.8284"></path></svg>
                <p class="weather-overview__text">${translatedOverview}</p>
            </div>
        ` : '';

        const detailsHtml = `
            <div class="current-weather__extra-details">
                <div class="detail-col detail-col--1">
                    <div class="current-weather__detail-item value-color--neutral-info"><span class="detail-item-header"><span>Wiatr</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 6H6C4.89543 6 4 6.89543 4 8C4 9.10457 4.89543 10 6 10H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 12H7C5.34315 12 4 13.3431 4 15C4 16.6569 5.34315 18 7 18H14" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 14H16C14.8954 14 14 14.8954 14 16C14 17.1046 14.8954 18 16 18H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.current.wind_speed.toFixed(1)} m/s</span></div>
                    <div class="current-weather__detail-item value-color--neutral-info"><span class="detail-item-header"><span>Ciśnienie</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 12L15 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.current.pressure} hPa</span></div>
                </div>
                <div class="detail-col detail-col--2">
                    <div class="current-weather__detail-item value-color--aqi-${data.air_quality.main.aqi}"><span class="detail-item-header"><span>Jakość pow.</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12C21 7.9242 18.2323 4.56213 14.5 3.5C14.5 3.5 12.5 2 10 3.5C6.5 5.5 4.5 9.5 5.5 13C6.5 16.5 12.5 17 14.5 15.5" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 15.5C20.5 15.5 21 17.5 20 18.5C19 19.5 17 19.5 16.5 17.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${["Dobra", "Umiark.", "Średnia", "Zła", "B. zła"][data.air_quality.main.aqi - 1]}</span></div>
                    <div class="current-weather__detail-item value-color--uv-${data.uvCategory}"><span class="detail-item-header"><span>Indeks UV</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 21V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.05025 7.05025L5.63604 5.63604" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.364 18.364L16.9497 16.9497" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.05025 16.9497L5.63604 18.364" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.364 5.63604L16.9497 7.05025" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${{"low": "Niski", "moderate": "Umiark.", "high": "Wysoki", "very-high": "B. wysoki", "extreme": "Ekstrem."}[data.uvCategory]}</span></div>
                </div>
                <div class="detail-col detail-col--3">
                    <div class="current-weather__detail-item value-color--${data.roadCondition.class}"><span class="detail-item-header"><span>Nawierzchnia</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 17.5C6 16.1193 7.11929 15 8.5 15C9.88071 15 11 16.1193 11 17.5V21H6V17.5Z" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 17.5C13 16.1193 14.1193 15 15.5 15C16.8807 15 18 16.1193 18 17.5V21H13V17.5Z" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15V8.44444C4 7.22849 4 6.62051 4.29828 6.16201C4.59656 5.70351 5.09916 5.37833 5.60436 5.05315L6.5 4.5L17.5 4.5L18.3956 5.05315C18.9008 5.37833 19.4034 5.70351 19.7017 6.16201C20 6.62051 20 7.22849 20 8.44444V15H4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.roadCondition.text}</span></div>
                </div>
                <div class="detail-col detail-col--4">
                    <div class="current-weather__detail-item value-color--sun"><span class="detail-item-header"><span>Wschód słońca</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17H21" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.63604 5.63604L6.34315 6.34315" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 10H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.364 5.63604L17.6569 6.34315" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.formattedTimes.sunrise}</span></div>
                    <div class="current-weather__detail-item value-color--sun"><span class="detail-item-header"><span>Zachód słońca</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17H21" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.63604 5.63604L6.34315 6.34315" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 10H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.364 5.63604L17.6569 6.34315" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.formattedTimes.sunset}</span></div>
                </div>
                <div class="detail-col detail-col--5">
                    <div class="current-weather__detail-item value-color--moon"><span class="detail-item-header"><span>Wschód księżyca</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 17H22" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14C15.3137 14 18 11.3137 18 8C18 4.68629 15.3137 2 12 2C8.68629 2 6 4.68629 6 8C6 11.3137 8.68629 14 12 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14C13.6569 14 15 11.3137 15 8C15 4.68629 13.6569 2 12 2" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.formattedTimes.moonrise}</span></div>
                    <div class="current-weather__detail-item value-color--moon"><span class="detail-item-header"><span>Zachód księżyca</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 17H22" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14C15.3137 14 18 11.3137 18 8C18 4.68629 15.3137 2 12 2C8.68629 2 6 4.68629 6 8C6 11.3137 8.68629 14 12 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14C13.6569 14 15 11.3137 15 8C15 4.68629 13.6569 2 12 2" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="detail-item-value">${data.formattedTimes.moonset}</span></div>
                </div>
            </div>`;

        this.dom.weatherResultContainer.innerHTML = `
            ${headerHtml}
            <div class="current-weather__main">
                <div class="current-weather__icon">${this.getWeatherIconHtml(data.current.weather[0].icon, data.current.weather[0].description)}</div>
                <div class="current-weather__details">
                    <span class="current-weather__temp">${Math.round(data.current.temp)}°C</span>
                    <span>${data.current.weather[0].description}</span>
                </div>
            </div>
            ${overviewHtml}
            <div id="weather-alerts-container"></div>
            ${detailsHtml}
        `;
        this.dom.weatherAlertsContainer = document.getElementById('weather-alerts-container');
        this.dom.addFavoriteBtn = document.getElementById('add-favorite-btn');
        this.dom.addFavoriteBtn.addEventListener('click', () => this.toggleFavorite());
    }
    
    // NOWA METODA: Renderowanie prognozy minutowej / NEW METHOD: Rendering minutely forecast
    renderMinutelyForecast(data) {
        this.minutelyData = data.minutely || [];
        const hasPrecipitation = this.minutelyData.some(minute => minute.precipitation > 0);
        
        // POPRAWKA: Ukryj warstwę opadów na mapie, jeśli prognoza ich nie przewiduje
        // FIX: Hide precipitation layer on the map if the forecast doesn't predict any
        if (!hasPrecipitation) {
            this.dom.minutely.wrapper.innerHTML = `<div class="minutely-forecast__no-data">Brak opadów w ciągu najbliższej godziny.</div>`;
            this.dom.precipitationToggle.checked = false;
            this.togglePrecipitationLayer(); // Wywołaj funkcję, aby ukryć warstwę
            return;
        }

        // Przywrócenie canvas, jeśli został usunięty / Restore canvas if it was removed
        if (!document.getElementById('minutely-chart')) {
            this.dom.minutely.wrapper.innerHTML = `
                <h3 class="minutely-forecast__title">Prognoza opadów w ciągu najbliższej godziny</h3>
                <div class="minutely-forecast__chart-container">
                    <canvas id="minutely-chart"></canvas>
                </div>`;
            this.dom.minutely.chartCanvas = document.getElementById('minutely-chart');
        }

        const labels = this.minutelyData.map((minute, index) => {
            return index % 10 === 0 ? `${index}'` : '';
        });
        const precipitationData = this.minutelyData.map(minute => minute.precipitation);
        
        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Intensywność opadów (mm/h)',
                data: precipitationData,
                borderColor: 'rgba(0, 123, 255, 0.8)',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            }]
        };

        if (this.minutelyChart) {
            this.minutelyChart.destroy();
        }

        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const fontColor = isDarkMode ? '#e9ecef' : '#212529';

        this.minutelyChart = new Chart(this.dom.minutely.chartCanvas, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: fontColor }
                    },
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: fontColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    renderWeatherAlerts(data) {
        const container = this.dom.weatherAlertsContainer;
        if (!container) return;

        if (data.alerts && data.alerts.length > 0) {
            const alert = data.alerts[0];
            const startTime = new Date(alert.start * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(alert.end * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            
            const translatedEventName = this.translateAlertEvent(alert.event);

            container.className = 'weather-alert weather-alert--warning';
            container.innerHTML = `
                <div class="alert__header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <strong>${translatedEventName}</strong>
                </div>
                <p class="alert__source">Wydane przez: ${alert.sender_name}</p>
                <p class="alert__time">Obowiązuje od ${startTime} do ${endTime}</p>
            `;
        } else {
            container.className = 'weather-alert weather-alert--safe';
            container.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <span>Brak alertów pogodowych w bieżącej lokalizacji</span>
            `;
        }
    }
    
    renderHourlyForecast() {
        const now = new Date();
        let forecastToShow;

        if (this.currentHourlyRange === 24) {
            const endOfTomorrow = new Date();
            endOfTomorrow.setDate(now.getDate() + 1);
            endOfTomorrow.setHours(23, 59, 59, 999);
            
            forecastToShow = this.hourlyForecastData.filter(item => {
                const itemDate = new Date(item.dt * 1000);
                return itemDate > now && itemDate <= endOfTomorrow;
            });
        } else {
            forecastToShow = this.hourlyForecastData.slice(0, 48);
        }
        
        const groupedByDay = forecastToShow.reduce((acc, item) => {
            const dayKey = new Date(item.dt * 1000).toLocaleDateString('pl-PL', { weekday: 'long' });
            if (!acc[dayKey]) acc[dayKey] = [];
            acc[dayKey].push(item);
            return acc;
        }, {});

        const todayKey = new Date().toLocaleDateString('pl-PL', { weekday: 'long' });
        const tomorrowKey = new Date(Date.now() + 864e5).toLocaleDateString('pl-PL', { weekday: 'long' });
        
        this.dom.hourly.container.innerHTML = Object.entries(groupedByDay).map(([day, items]) => {
            let dayLabel = day;
            if (day === todayKey) dayLabel = 'Dzisiaj';
            if (day === tomorrowKey) dayLabel = 'Jutro';

            const itemsHtml = items.map(item => `
                <div class="hourly-forecast__item">
                    <p class="hourly-forecast__time">${new Date(item.dt * 1000).getHours()}:00</p>
                    <div class="hourly-forecast__icon">${this.getWeatherIconHtml(item.weather[0].icon, item.weather[0].description)}</div>
                    <div class="hourly-forecast__item-right">
                        <p class="hourly-forecast__temp">${Math.round(item.temp)}°C</p>
                        <div class="hourly-forecast__pop">
                            <svg class="hourly-forecast__pop-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a5.53 5.53 0 0 0-5.43 6.05L8 16l5.43-9.95A5.53 5.53 0 0 0 8 0zm0 8.87A2.87 2.87 0 1 1 10.87 6 2.87 2.87 0 0 1 8 8.87z"/></svg>
                            <span>${Math.round(item.pop * 100)}%</span>
                        </div>
                    </div>
                </div>
            `).join('');

            return `
                <div class="hourly-forecast__day-group">
                    <h4 class="hourly-forecast__day-heading">${dayLabel}</h4>
                    <div class="hourly-forecast__items">${itemsHtml}</div>
                </div>
            `;
        }).join('');
        
        setTimeout(() => this.updateSliderButtons(), 0);
    }
    
    renderDailyForecast(data) {
        this.dom.daily.container.innerHTML = data.daily.slice(0, 8).map(day => `
            <div class="weather-app__forecast-day">
                <h4>${new Date(day.dt * 1000).toLocaleDateString('pl-PL', { weekday: 'long' })}</h4>
                <div class="weather-app__forecast-icon">${this.getWeatherIconHtml(day.weather[0].icon, day.weather[0].description)}</div>
                <p>${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</p>
            </div>`).join('');
    }

    // --- Główna Logika / Main Logic ---
    async handleSearch(query, buttonToLoad) {
        if (!query) return;
        this.dom.weatherResultContainer.innerHTML = `<div class="weather-app__skeleton"><div class="skeleton" style="width: 200px; height: 2.2rem;"></div><div class="skeleton" style="width: 150px; height: 4rem;"></div></div>`;
        this.dom.forecastsContainer.style.display = 'none';
        this.dom.mapContainer.style.display = 'none';
        if (buttonToLoad) this.toggleButtonLoading(buttonToLoad, true);

        try {
            const data = await this.getWeatherData(query);
            if (!data) { this.showError("Wpisz miasto lub zezwól na geolokalizację."); return; }
            
            if (typeof query === 'string') {
                localStorage.setItem('lastCity', query.trim());
            }

            this.currentLocation = data.location;
            this.hourlyForecastData = data.hourly;
            
            const processedData = {
                ...data,
                overview: data.overview,
                roadCondition: data.current.temp > 2 && !['Rain', 'Snow', 'Drizzle'].includes(data.current.weather[0].main)
                    ? { text: "Sucha", class: 'roadDry' }
                    : (data.current.temp <= 2 ? { text: "Możliwe oblodzenie", class: 'roadIcy' } : { text: "Mokra", class: 'roadWet' }),
                uvCategory: (() => {
                    const uvIndex = Math.round(data.current.uvi);
                    if (uvIndex >= 11) return 'extreme'; if (uvIndex >= 8) return 'very-high';
                    if (uvIndex >= 6) return 'high'; if (uvIndex >= 3) return 'moderate';
                    return 'low';
                })(),
                formattedTimes: {
                    sunrise: new Date(data.current.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    sunset: new Date(data.current.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    moonrise: new Date(data.daily[0].moonrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    moonset: new Date(data.daily[0].moonset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }
            };

            this.renderCurrentWeather(processedData);
            this.updateFavoriteButtonState();
            this.renderWeatherAlerts(processedData);
            this.renderMinutelyForecast(processedData);
            this.renderDailyForecast(processedData);
            this.renderHourlyForecast();
            
            this.dom.forecastsContainer.style.display = 'block';
            this.handleForecastSwitch({ target: this.dom.forecastSwitcher.querySelector('[data-forecast="minutely"]') });

            
            this.dom.mapContainer.style.display = 'block';
            const isGeoSearch = typeof query === 'object' && query.latitude;
            const zoomLevel = isGeoSearch ? 17 : 13;
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                    this.updateMap(data.location.lat, data.location.lon, data.location.name, zoomLevel);
                }
            }, 0);

        } catch (error) {
            this.showError(`Błąd: ${error.message}`);
        } finally {
            if (buttonToLoad) this.toggleButtonLoading(buttonToLoad, false);
        }
    }
    
    // --- Pozostałe metody (bez istotnych zmian) ---
    getWeatherIconHtml(iconCode, description) {
        const iconBaseUrl = 'https://basmilius.github.io/weather-icons/production/fill/all/';
        const iconMap = { '01d': 'clear-day.svg', '01n': 'clear-night.svg', '02d': 'partly-cloudy-day.svg', '02n': 'partly-cloudy-night.svg', '03d': 'cloudy.svg', '03n': 'cloudy.svg', '04d': 'overcast-day.svg', '04n': 'overcast-night.svg', '09d': 'rain.svg', '09n': 'rain.svg', '10d': 'partly-cloudy-day-rain.svg', '10n': 'partly-cloudy-night-rain.svg', '11d': 'thunderstorms-day.svg', '11n': 'thunderstorms-night.svg', '13d': 'snow.svg', '13n': 'snow.svg', '50d': 'fog-day.svg', '50n': 'fog-night.svg', };
        const iconName = iconMap[iconCode] || 'not-available.svg';
        return `<img src="${iconBaseUrl}${iconName}" alt="${description}" class="weather-icon-img">`;
    }
    isMobile = () => window.matchMedia("(max-width: 1024px)").matches;
    isMobilePortrait = () => window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
    setTheme(theme) { 
        document.body.classList.toggle('dark-mode', theme === 'dark'); 
        localStorage.setItem('theme', theme); 
        if (this.map) this.updateMapTileLayer(); 
        if (this.minutelyChart) this.renderMinutelyForecast({ minutely: this.minutelyData });
    }
    toggleButtonLoading(button, isLoading) { const span = button.querySelector('span'); if (isLoading) { span.style.display = 'none'; if (!button.querySelector('.loader')) { button.insertAdjacentHTML('beforeend', '<div class="loader"></div>'); } button.disabled = true; } else { span.style.display = 'inline'; const loader = button.querySelector('.loader'); if (loader) loader.remove(); button.disabled = false; } }
    showError(message) { this.dom.weatherResultContainer.innerHTML = `<div class="weather-app__error">${message}</div>`; this.dom.forecastsContainer.style.display = 'none'; this.dom.mapContainer.style.display = 'none'; }
    getPrecipitationLayer() { const proxyUrl = `/.netlify/functions/map-tiles/{z}/{x}/{y}`; return L.tileLayer(proxyUrl, { attribution: '&copy; OpenWeatherMap' }); }
    togglePrecipitationLayer() { if (!this.map) return; if (this.dom.precipitationToggle.checked) { if (!this.precipitationLayer) { this.precipitationLayer = this.getPrecipitationLayer(); } this.map.addLayer(this.precipitationLayer); } else { if (this.precipitationLayer && this.map.hasLayer(this.precipitationLayer)) { this.map.removeLayer(this.precipitationLayer); } } }
    initMap() { if (!this.map) { this.map = L.map('map').setView([51.75, 19.45], 10); this.lightTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }); this.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO' }); this.updateMapTileLayer(); } }
    updateMapTileLayer() { const isDarkMode = document.body.classList.contains('dark-mode'); const targetLayer = isDarkMode ? this.darkTileLayer : this.lightTileLayer; const otherLayer = isDarkMode ? this.lightTileLayer : this.darkTileLayer; if (this.map.hasLayer(otherLayer)) this.map.removeLayer(otherLayer); if (!this.map.hasLayer(targetLayer)) this.map.addLayer(targetLayer); }
    updateMap(lat, lon, cityName, zoomLevel = 13) { if (this.map) { this.map.flyTo([lat, lon], zoomLevel); if (this.marker) this.map.removeLayer(this.marker); this.marker = L.marker([lat, lon]).addTo(this.map).bindPopup(cityName).openPopup(); } }
    async getWeatherData(query) { let url; if (typeof query === 'string' && query) { url = `/.netlify/functions/weather?city=${encodeURIComponent(query.trim())}`; } else if (typeof query === 'object' && query.latitude) { url = `/.netlify/functions/weather?lat=${query.latitude}&lon=${query.longitude}`; } else { return null; } const response = await fetch(url); const data = await response.json(); if (!response.ok) { throw new Error(data.message || "Błąd serwera"); } return data; }
    handleGeolocation() { if (navigator.geolocation) { this.toggleButtonLoading(this.dom.geoBtn, true); navigator.geolocation.getCurrentPosition( pos => this.handleSearch({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, this.dom.geoBtn), () => { this.showError("Nie udało się pobrać lokalizacji."); this.toggleButtonLoading(this.dom.geoBtn, false); } ); } }
    handleForecastSwitch(event) {
        const btn = event.target.closest('button');
        if (!btn) return;
        
        const forecastType = btn.dataset.forecast;
        this.dom.forecastsContainer.className = `show-${forecastType}`;

        const currentActive = this.dom.forecastSwitcher.querySelector('.active');
        if(currentActive) currentActive.classList.remove('active');
        btn.classList.add('active');
    }
    handleHourlyRangeSwitch(event) { const btn = event.target.closest('button'); if (!btn || btn.classList.contains('active')) return; this.currentHourlyRange = parseInt(btn.dataset.range, 10); this.dom.hourly.rangeSwitcher.querySelector('.active').classList.remove('active'); btn.classList.add('active'); this.renderHourlyForecast(); }
    updateSliderButtons() { if (this.isMobilePortrait() || !this.dom.hourly.scrollWrapper) return; requestAnimationFrame(() => { const { scrollLeft, scrollWidth, clientWidth } = this.dom.hourly.scrollWrapper; this.dom.hourly.sliderPrevBtn.disabled = scrollLeft <= 0; this.dom.hourly.sliderNextBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 1; }); }
    handleSliderScroll(direction) { const item = this.dom.hourly.container.querySelector('.hourly-forecast__item'); if (!item) return; const itemWidth = item.offsetWidth; const gap = 8; const scrollAmount = (itemWidth + gap) * 8 * direction; this.dom.hourly.scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' }); }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new WeatherApp();
    app.init();
});

