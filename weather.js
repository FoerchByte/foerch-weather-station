/**
 * @class WeatherApp
 * --- PL ---
 * Główna klasa zarządzająca logiką aplikacji pogodowej.
 * Odpowiada za stan, interakcje z DOM, pobieranie danych i renderowanie UI.
 * --- EN ---
 * The main class for managing the weather application's logic.
 * It is responsible for state, DOM interactions, data fetching, and UI rendering.
 */
class WeatherApp {
    constructor() {
        // --- Stan aplikacji / Application State ---
        this.map = null;
        this.marker = null;
        this.precipitationLayer = null;
        this.hourlyForecastData = [];
        this.dailyForecastData = [];
        this.minutelyData = [];
        this.currentHourlyRange = 24;
        this.favorites = [];
        this.currentLocation = null;
        this.minutelyChart = null;
        this.lastFocusedElement = null; // Dla dostępności modala / For modal accessibility

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
            forecastSwitcher: document.getElementById('forecast-switcher'),
            favoritesContainer: document.getElementById('favorites-container'),
            addFavoriteBtn: null,
            minutely: {
                wrapper: document.querySelector('.minutely-forecast__wrapper'),
                chartCanvas: document.getElementById('minutely-chart'),
            },
            hourly: {
                container: document.getElementById('hourly-forecast-container'),
                rangeSwitcher: document.getElementById('hourly-range-switcher'),
                sliderPrevBtn: document.getElementById('hourly-slider-prev'),
                sliderNextBtn: document.getElementById('hourly-slider-next'),
                scrollWrapper: document.querySelector('.hourly-forecast__scroll-wrapper'),
            },
            daily: {
                container: document.getElementById('daily-forecast-container'),
            },
            modal: {
                container: document.getElementById('details-modal'),
                title: document.getElementById('modal-title'),
                body: document.getElementById('modal-body'),
                closeBtn: document.querySelector('.modal__close-btn'),
            }
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
            this.handleSearch(lastCity);
        } else if (this.favorites.length > 0) {
            this.handleSearch(this.favorites[0].name);
        } else {
             this.dom.favoritesContainer.innerHTML = `<p class="favorites-empty-state">Dodaj swoje ulubione lokalizacje za pomocą ikony gwiazdki ⭐</p>`;
        }
    }

    // --- Powiązanie Eventów / Event Binding ---
    bindEvents() {
        this.dom.themeToggle.addEventListener('click', () => this.setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark'));
        this.dom.searchBtn?.addEventListener('click', () => this.handleSearch(this.dom.cityInput.value.trim()));
        this.dom.cityInput?.addEventListener('keyup', e => { if (e.key === 'Enter') this.handleSearch(this.dom.cityInput.value.trim()); });
        this.dom.geoBtn?.addEventListener('click', () => this.handleGeolocation());
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
        this.dom.hourly.container.addEventListener('click', (e) => this.handleHourlyItemClick(e));
        this.dom.daily.container.addEventListener('click', (e) => this.handleDailyItemClick(e));
        
        // Zdarzenia dla modala / Modal events
        this.dom.modal.container.addEventListener('click', (e) => {
            if (e.target.closest('[data-close-modal]')) {
                this.hideDetailsModal();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.dom.modal.container.classList.contains('is-visible')) {
                this.hideDetailsModal();
            }
        });
    }

    // --- Główna Logika / Main Logic ---
    async handleSearch(query) {
        if (!query) return;
        
        const buttonToLoad = (typeof query === 'object' && query.latitude) ? this.dom.geoBtn : this.dom.searchBtn;
        this.toggleButtonLoading(buttonToLoad, true);
        this.showSkeletonLoader();

        try {
            const rawData = await this.getWeatherData(query);
            if (!rawData) { 
                this.showError("Wpisz miasto lub zezwól na geolokalizację."); 
                return; 
            }
            
            if (typeof query === 'string') localStorage.setItem('lastCity', query.trim());
            
            this.currentLocation = rawData.location;
            this.hourlyForecastData = rawData.hourly;
            this.dailyForecastData = rawData.daily;
            this.minutelyData = rawData.minutely;

            const processedData = this.processWeatherData(rawData);
            this.updateUI(processedData);

        } catch (error) {
            this.showError(`Błąd: ${error.message}`);
        } finally {
            this.toggleButtonLoading(buttonToLoad, false);
        }
    }

    handleGeolocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => this.handleSearch({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                () => { this.showError("Nie udało się pobrać lokalizacji."); }
            );
        }
    }
    
    // --- Przetwarzanie Danych / Data Processing ---
    processWeatherData(data) {
        return {
            ...data,
            overview: data.overview,
            roadCondition: this.getRoadCondition(data.current),
            uvCategory: this.getUvCategory(data.current.uvi),
            formattedTimes: {
                sunrise: this.formatTime(data.current.sunrise),
                sunset: this.formatTime(data.current.sunset),
                moonrise: this.formatTime(data.daily[0].moonrise),
                moonset: this.formatTime(data.daily[0].moonset),
            }
        };
    }
    
    // --- Renderowanie UI / UI Rendering ---
    updateUI(processedData) {
        this.renderCurrentWeather(processedData);
        this.renderFavorites();
        this.updateFavoriteButtonState();
        this.renderWeatherAlerts(processedData);
        this.renderMinutelyForecast();
        this.renderDailyForecast();
        this.renderHourlyForecast();
        
        this.dom.forecastsContainer.style.display = 'block';
        this.dom.mapContainer.style.display = 'block';
        
        const isGeoSearch = typeof processedData.query === 'object' && processedData.query.latitude;
        const zoomLevel = isGeoSearch ? 17 : 13;

        // Opóźnienie dla poprawnego przerysowania mapy / Delay for correct map invalidation
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
                this.updateMap(processedData.location.lat, processedData.location.lon, processedData.location.name, zoomLevel);
            }
        }, 0);
    }
    
    showSkeletonLoader() {
        this.dom.weatherResultContainer.innerHTML = `<div class="weather-app__skeleton"><div class="skeleton" style="width: 200px; height: 2.2rem;"></div><div class="skeleton" style="width: 150px; height: 4rem;"></div></div>`;
        this.dom.forecastsContainer.style.display = 'none';
        this.dom.mapContainer.style.display = 'none';
    }

    renderCurrentWeather(data) {
        const { location } = data;
        const headerHtml = `
            <div class="current-weather__header">
                <h3 class="current-weather__city">${location.name}</h3>
                <button id="add-favorite-btn" class="favorite-btn" aria-label="Dodaj do ulubionych">
                    <svg class="star-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </button>
            </div>`;
        const translatedOverview = this.translateOverview(data.overview);
        const overviewHtml = translatedOverview ? `<div class="weather-overview"><p class="weather-overview__text">${translatedOverview}</p></div>` : '';
        const detailsHtml = this.buildDetailsHtml(data);

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
    
    // --- POPRAWKA: Przywrócenie ikon SVG / FIX: Restoring SVG icons ---
    buildDetailsHtml(data) {
        return `<div class="current-weather__extra-details">
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
    }

    renderWeatherAlerts({ alerts }) {
        const container = this.dom.weatherAlertsContainer;
        if (!container) return;
        if (alerts && alerts.length > 0) {
            const alert = alerts[0];
            const translatedEventName = this.translateAlertEvent(alert.event);
            container.className = 'weather-alert weather-alert--warning';
            container.innerHTML = `<div class="alert__header"><strong>${translatedEventName}</strong></div><p class="alert__source">Wydane przez: ${alert.sender_name}</p><p class="alert__time">Obowiązuje od ${this.formatTime(alert.start)} do ${this.formatTime(alert.end)}</p>`;
        } else {
            container.className = 'weather-alert weather-alert--safe';
            container.innerHTML = `<span>Brak alertów pogodowych w bieżącej lokalizacji</span>`;
        }
    }

    renderMinutelyForecast() {
        const hasPrecipitation = this.minutelyData.some(minute => minute.precipitation > 0);
        if (!hasPrecipitation) {
            this.dom.minutely.wrapper.innerHTML = `<div class="minutely-forecast__no-data">Brak opadów w ciągu najbliższej godziny.</div>`;
            return;
        }

        if (!document.getElementById('minutely-chart')) {
            this.dom.minutely.wrapper.innerHTML = `<h3 class="minutely-forecast__title">Prognoza na najbliższą godzinę</h3><div class="minutely-forecast__chart-container"><canvas id="minutely-chart"></canvas></div>`;
            this.dom.minutely.chartCanvas = document.getElementById('minutely-chart');
        }

        const labels = this.minutelyData.map((_, index) => (index % 10 === 0 ? `${index}'` : ''));
        const chartData = this.minutelyData.map(minute => minute.precipitation);
        
        if (this.minutelyChart) this.minutelyChart.destroy();
        
        this.minutelyChart = new Chart(this.dom.minutely.chartCanvas, this.getChartConfig(labels, chartData));
    }

    renderHourlyForecast() {
        let forecastToShow = (this.currentHourlyRange === 48) ? this.hourlyForecastData.slice(0, 48) : this.hourlyForecastData.filter(item => new Date(item.dt * 1000) > new Date());
        const groupedByDay = this.groupForecastByDay(forecastToShow.slice(0,48));
        this.dom.hourly.container.innerHTML = Object.entries(groupedByDay).map(([day, items]) => this.buildDayGroupHtml(day, items)).join('');
        setTimeout(() => this.updateSliderButtons(), 0);
    }
    
    renderDailyForecast() {
        this.dom.daily.container.innerHTML = this.dailyForecastData.map(day => {
            const dayDate = new Date(day.dt * 1000);
            return `
            <div class="daily-forecast__day" data-timestamp="${day.dt}">
                <h4>${this.getRelativeDayName(dayDate)}</h4>
                <div class="daily-forecast__icon">${this.getWeatherIconHtml(day.weather[0].icon, day.weather[0].description)}</div>
                <p>${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</p>
            </div>`;
        }).join('');
    }

    // --- Logika Ulubionych / Favorites Logic ---
    loadFavorites() { this.favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || []; this.renderFavorites(); }
    saveFavorites() { localStorage.setItem('weatherFavorites', JSON.stringify(this.favorites)); }
    renderFavorites() {
        if (this.favorites.length > 0) {
            this.dom.favoritesContainer.innerHTML = this.favorites.map(fav => `<button class="favorite-location-btn" data-city="${fav.name}">${fav.name}</button>`).join('');
            this.updateActiveFavoriteButton();
        } else {
            this.dom.favoritesContainer.innerHTML = `<p class="favorites-empty-state">Dodaj swoje ulubione lokalizacje za pomocą ikony gwiazdki ⭐</p>`;
        }
    }
    updateActiveFavoriteButton() {
        const buttons = this.dom.favoritesContainer.querySelectorAll('.favorite-location-btn');
        buttons.forEach(btn => {
            const isActive = this.currentLocation && btn.dataset.city.toLowerCase() === this.currentLocation.name.toLowerCase();
            btn.classList.toggle('active', isActive);
        });
    }
    toggleFavorite() {
        if (!this.currentLocation) return;
        const index = this.favorites.findIndex(fav => fav.lat.toFixed(4) === this.currentLocation.lat.toFixed(4) && fav.lon.toFixed(4) === this.currentLocation.lon.toFixed(4));
        if (index > -1) { this.favorites.splice(index, 1); } 
        else {
            if (this.favorites.length >= 5) { alert("Możesz dodać maksymalnie 5 ulubionych lokalizacji."); return; }
            this.favorites.push(this.currentLocation);
        }
        this.saveFavorites(); this.renderFavorites(); this.updateFavoriteButtonState();
    }
    updateFavoriteButtonState() {
        if (!this.currentLocation || !this.dom.addFavoriteBtn) return;
        const isFav = this.favorites.some(fav => fav.lat.toFixed(4) === this.currentLocation.lat.toFixed(4) && fav.lon.toFixed(4) === this.currentLocation.lon.toFixed(4));
        this.dom.addFavoriteBtn.classList.toggle('is-favorite', isFav);
        this.dom.addFavoriteBtn.setAttribute('aria-label', isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych');
        this.dom.addFavoriteBtn.disabled = !isFav && this.favorites.length >= 5;
    }

    // --- Handlery Zdarzeń UI / UI Event Handlers ---
    handleFavoriteClick(event) {
        const btn = event.target.closest('.favorite-location-btn');
        if (!btn) return;
        this.dom.cityInput.value = btn.dataset.city;
        this.handleSearch(btn.dataset.city);
    }
    handleForecastSwitch(event) {
        const btn = event.target.closest('button');
        if (!btn) return;
        this.dom.forecastsContainer.className = `show-${btn.dataset.forecast}`;
        this.dom.forecastSwitcher.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    handleHourlyRangeSwitch(event) {
        const btn = event.target.closest('button');
        if (!btn || btn.classList.contains('active')) return;
        this.currentHourlyRange = parseInt(btn.dataset.range, 10);
        this.dom.hourly.rangeSwitcher.querySelector('.active').classList.remove('active');
        btn.classList.add('active');
        this.renderHourlyForecast();
    }
    updateSliderButtons() {
        if (!this.dom.hourly.scrollWrapper) return;
        requestAnimationFrame(() => {
            const { scrollLeft, scrollWidth, clientWidth } = this.dom.hourly.scrollWrapper;
            this.dom.hourly.sliderPrevBtn.disabled = scrollLeft <= 0;
            this.dom.hourly.sliderNextBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 1;
        });
    }
    handleSliderScroll(direction) {
        const item = this.dom.hourly.container.querySelector('.hourly-forecast__item');
        if (!item) return;
        const scrollAmount = (item.offsetWidth + 8) * 8 * direction;
        this.dom.hourly.scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    
    // --- Logika okna modalnego / Modal Logic ---
    handleHourlyItemClick(event) {
        const itemEl = event.target.closest('.hourly-forecast__item');
        if (!itemEl) return;
        this.lastFocusedElement = itemEl;
        const hourData = this.hourlyForecastData.find(item => item.dt === parseInt(itemEl.dataset.timestamp, 10));
        if (hourData) this.showDetailsModal(hourData, 'hourly');
    }
    handleDailyItemClick(event) {
        const itemEl = event.target.closest('.daily-forecast__day');
        if (!itemEl) return;
        this.lastFocusedElement = itemEl;
        const dayData = this.dailyForecastData.find(item => item.dt === parseInt(itemEl.dataset.timestamp, 10));
        if (dayData) this.showDetailsModal(dayData, 'daily');
    }
    showDetailsModal(data, type) {
        const date = new Date(data.dt * 1000);
        this.dom.modal.title.textContent = (type === 'hourly') ? `Prognoza na ${date.toLocaleDateString('pl-PL', { weekday: 'long' })}, ${date.getHours()}:00` : `Prognoza na ${date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}`;
        this.dom.modal.body.innerHTML = (type === 'hourly') ? this.buildHourlyModalBody(data) : this.buildDailyModalBody(data);
        this.dom.modal.container.removeAttribute('hidden');
        setTimeout(() => {
            this.dom.modal.container.classList.add('is-visible');
            this.dom.modal.closeBtn.focus();
        }, 10);
    }
    hideDetailsModal() {
        this.dom.modal.container.classList.remove('is-visible');
        this.dom.modal.container.addEventListener('transitionend', () => {
            this.dom.modal.container.setAttribute('hidden', true);
            if (this.lastFocusedElement) this.lastFocusedElement.focus();
        }, { once: true });
    }

    // --- Funkcje Pomocnicze i Narzędziowe / Helper & Utility Functions ---
    async getWeatherData(query) { let url; if (typeof query === 'string' && query) { url = `/.netlify/functions/weather?city=${encodeURIComponent(query.trim())}`; } else if (typeof query === 'object' && query.latitude) { url = `/.netlify/functions/weather?lat=${query.latitude}&lon=${query.longitude}`; } else { return null; } const response = await fetch(url); const data = await response.json(); if (!response.ok) { throw new Error(data.message || "Błąd serwera"); } return data; }
    getWeatherIconHtml(iconCode, description) { const iconMap = { '01d': 'clear-day', '01n': 'clear-night', '02d': 'partly-cloudy-day', '02n': 'partly-cloudy-night', '03d': 'cloudy', '03n': 'cloudy', '04d': 'overcast-day', '04n': 'overcast-night', '09d': 'rain', '09n': 'rain', '10d': 'partly-cloudy-day-rain', '10n': 'partly-cloudy-night-rain', '11d': 'thunderstorms-day', '11n': 'thunderstorms-night', '13d': 'snow', '13n': 'snow', '50d': 'fog-day', '50n': 'fog-night', }; return `<img src="https://basmilius.github.io/weather-icons/production/fill/all/${iconMap[iconCode] || 'not-available'}.svg" alt="${description}" class="weather-icon-img">`; }
    toggleButtonLoading(button, isLoading) { if(!button) return; const span = button.querySelector('span'); if (isLoading) { span.style.display = 'none'; if (!button.querySelector('.loader')) { button.insertAdjacentHTML('beforeend', '<div class="loader"></div>'); } button.disabled = true; } else { span.style.display = 'inline'; const loader = button.querySelector('.loader'); if (loader) loader.remove(); button.disabled = false; } }
    showError(message) { this.dom.weatherResultContainer.innerHTML = `<div class="weather-app__error">${message}</div>`; this.dom.forecastsContainer.style.display = 'none'; this.dom.mapContainer.style.display = 'none'; }
    formatTime(timestamp) { return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    setTheme(theme) { document.body.classList.toggle('dark-mode', theme === 'dark'); localStorage.setItem('theme', theme); if (this.map) this.updateMapTileLayer(); if (this.minutelyChart) { this.minutelyChart.destroy(); this.renderMinutelyForecast(); } }
    initMap() { if (!this.map) { this.map = L.map('map').setView([51.75, 19.45], 10); this.lightTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'); this.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'); this.updateMapTileLayer(); } }
    updateMapTileLayer() { const isDarkMode = document.body.classList.contains('dark-mode'); const targetLayer = isDarkMode ? this.darkTileLayer : this.lightTileLayer; const otherLayer = isDarkMode ? this.lightTileLayer : this.darkTileLayer; if (this.map.hasLayer(otherLayer)) this.map.removeLayer(otherLayer); if (!this.map.hasLayer(targetLayer)) this.map.addLayer(targetLayer); }
    updateMap(lat, lon, name, zoom) { if (this.map) { this.map.flyTo([lat, lon], zoom); if (this.marker) this.map.removeLayer(this.marker); this.marker = L.marker([lat, lon]).addTo(this.map).bindPopup(name).openPopup(); } }
    getRoadCondition({ temp, weather }) { if (temp > 2 && !['Rain', 'Snow', 'Drizzle'].includes(weather[0].main)) { return { text: "Sucha", class: 'roadDry' }; } return (temp <= 2) ? { text: "Możliwe oblodzenie", class: 'roadIcy' } : { text: "Mokra", class: 'roadWet' }; }
    getUvCategory(uvi) { const uv = Math.round(uvi); if (uv >= 11) return 'extreme'; if (uv >= 8) return 'very-high'; if (uv >= 6) return 'high'; if (uv >= 3) return 'moderate'; return 'low'; }
    translateAlertEvent(event) { const translations = { 'Rain': 'Opady deszczu', 'Snow': 'Opady śniegu', 'Wind': 'Silny wiatr', 'Thunderstorm': 'Burze', 'Fog': 'Mgła', 'High temperature': 'Upał', 'Low temperature': 'Mróz' }; return Object.entries(translations).reduce((acc, [key, value]) => acc.replace(key, value), event); }
    translateOverview(overview) { if (!overview) return ''; const translations = { 'Expect a day of ': 'Spodziewaj się dnia z ', 'partly cloudy with rain': 'częściowym zachmurzeniem i deszczem', 'partly cloudy': 'częściowym zachmurzeniem', 'light rain': 'lekkimi opadami deszczu', 'heavy rain': 'intensywnymi opadami deszczu', 'rain': 'deszczem', 'clear sky': 'bezchmurnym niebem', 'snow': 'opadami śniegu', 'thunderstorms': 'burzami', 'fog': 'mgłą' }; let translated = Object.entries(translations).reduce((acc, [key, value]) => acc.replace(new RegExp(key, 'gi'), value), overview); translated = translated.charAt(0).toUpperCase() + translated.slice(1); return translated.endsWith('.') ? translated : `${translated}.`; }
    getChartConfig(labels, data) { const isDarkMode = document.body.classList.contains('dark-mode'); const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'; const fontColor = isDarkMode ? '#e9ecef' : '#212529'; return { type: 'line', data: { labels, datasets: [{ data, borderColor: 'rgba(0, 123, 255, 0.8)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, backgroundColor: 'rgba(0, 123, 255, 0.1)' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: fontColor } }, x: { grid: { color: gridColor }, ticks: { color: fontColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } } }, plugins: { legend: { display: false }, tooltip: { enabled: false } } } }; }
    groupForecastByDay(forecastData) { return forecastData.reduce((acc, item) => { const dayKey = new Date(item.dt * 1000).toLocaleDateString('pl-PL', { weekday: 'long' }); if (!acc[dayKey]) acc[dayKey] = []; acc[dayKey].push(item); return acc; }, {}); }
    getRelativeDayName(date) { const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1); today.setHours(0,0,0,0); tomorrow.setHours(0,0,0,0); date.setHours(0,0,0,0); if(date.getTime() === today.getTime()) return 'Dzisiaj'; if(date.getTime() === tomorrow.getTime()) return 'Jutro'; return date.toLocaleDateString('pl-PL', { weekday: 'long' }); }
    buildDayGroupHtml(day, items) { return `<div class="hourly-forecast__day-group"><h4 class="hourly-forecast__day-heading">${this.getRelativeDayName(new Date(items[0].dt * 1000))}</h4><div class="hourly-forecast__items">${items.map(item => `<div class="hourly-forecast__item" data-timestamp="${item.dt}"><p class="hourly-forecast__time">${this.formatTime(item.dt).substring(0,5)}</p><div class="hourly-forecast__icon">${this.getWeatherIconHtml(item.weather[0].icon, item.weather[0].description)}</div><p class="hourly-forecast__temp">${Math.round(item.temp)}°C</p><div class="hourly-forecast__pop"><span>${Math.round(item.pop * 100)}%</span></div></div>`).join('')}</div></div>`; }
    buildHourlyModalBody(data) { const details = { "Temperatura odczuwalna": `${Math.round(data.feels_like)}°C`, "Wilgotność": `${data.humidity}%`, "Ciśnienie": `${data.pressure} hPa`, "Zachmurzenie": `${data.clouds}%`, "Wiatr": `${data.wind_speed.toFixed(1)} m/s`, "Porywy wiatru": `${(data.wind_gust || 0).toFixed(1)} m/s`, "Indeks UV": Math.round(data.uvi), "Widoczność": `${data.visibility / 1000} km` }; return Object.entries(details).map(([label, value]) => `<div class="modal-detail"><span class="modal-detail__label">${label}</span><span class="modal-detail__value">${value}</span></div>`).join(''); }
    buildDailyModalBody(data) { const details = { "Opis": data.summary, "Szansa opadów": `${Math.round(data.pop * 100)}%`, "Temperatura": `<div class="modal-detail__value modal-detail__value--temp-grid"><span>Rano:</span><span>${Math.round(data.temp.morn)}°C</span><span>Dzień:</span><span>${Math.round(data.temp.day)}°C</span><span>Wieczór:</span><span>${Math.round(data.temp.eve)}°C</span><span>Noc:</span><span>${Math.round(data.temp.night)}°C</span></div>`, "Wiatr": `${data.wind_speed.toFixed(1)} m/s`, "Wschód / Zachód słońca": `${this.formatTime(data.sunrise)} / ${this.formatTime(data.sunset)}`, "Indeks UV": Math.round(data.uvi) }; return Object.entries(details).map(([label, value]) => `<div class="modal-detail"><span class="modal-detail__label">${label}</span><span class="modal-detail__value">${value}</span></div>`).join(''); }
}

// Inicjalizacja aplikacji po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    const app = new WeatherApp();
    app.init();
});

