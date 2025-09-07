class WeatherApp {
    constructor() {
        // --- Stan aplikacji / Application State ---
        this.map = null;
        this.marker = null;
        this.hourlyForecastData = [];
        this.currentHourlyRange = 24;

        // --- Referencje DOM / DOM References ---
        this.dom = {
            searchBtn: document.getElementById('search-weather-btn'),
            cityInput: document.getElementById('city-input'),
            geoBtn: document.getElementById('geolocation-btn'),
            themeToggle: document.getElementById('theme-toggle'),
            weatherResultContainer: document.getElementById('weather-result-container'),
            forecastsContainer: document.getElementById('forecasts-container'),
            mapContainer: document.getElementById('map-container'),
            forecastSwitcher: document.getElementById('forecast-switcher'),
            hourly: {
                container: document.getElementById('hourly-forecast-container'),
                rangeSwitcher: document.getElementById('hourly-range-switcher'),
                sliderPrevBtn: document.getElementById('hourly-slider-prev'),
                sliderNextBtn: document.getElementById('hourly-slider-next'),
                scrollWrapper: document.querySelector('.hourly-forecast__scroll-wrapper'),
            },
            daily: {
                container: document.getElementById('forecast-container'),
            },
        };
    }

    // --- Inicjalizacja Aplikacji / Application Initialization ---
    init() {
        this.setTheme(localStorage.getItem('theme') || 'light');
        this.initMap();
        this.bindEvents();
        const lastCity = localStorage.getItem('lastCity');
        if (lastCity) {
            this.dom.cityInput.value = lastCity;
            this.handleSearch(lastCity, this.dom.searchBtn);
        }
    }

    // --- Powiązanie Eventów / Event Binding ---
    bindEvents() {
        this.dom.themeToggle.addEventListener('click', () => this.setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark'));
        this.dom.searchBtn?.addEventListener('click', () => this.handleSearch(this.dom.cityInput.value.trim(), this.dom.searchBtn));
        this.dom.cityInput?.addEventListener('keyup', e => { if (e.key === 'Enter') this.handleSearch(this.dom.cityInput.value.trim(), this.dom.searchBtn); });
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
    }

    // --- Metoda do pobierania ikon SVG / Method for fetching SVG icons ---
    getWeatherIconHtml(iconCode, description) {
        const iconBaseUrl = 'https://basmilius.github.io/weather-icons/production/fill/all/';
        const iconMap = {
            '01d': 'clear-day.svg', '01n': 'clear-night.svg',
            '02d': 'partly-cloudy-day.svg', '02n': 'partly-cloudy-night.svg',
            '03d': 'cloudy.svg', '03n': 'cloudy.svg',
            '04d': 'overcast-day.svg', '04n': 'overcast-night.svg',
            '09d': 'rain.svg', '09n': 'rain.svg',
            '10d': 'partly-cloudy-day-rain.svg', '10n': 'partly-cloudy-night-rain.svg',
            '11d': 'thunderstorms-day.svg', '11n': 'thunderstorms-night.svg',
            '13d': 'snow.svg', '13n': 'snow.svg',
            '50d': 'fog-day.svg', '50n': 'fog-night.svg',
        };
        const iconName = iconMap[iconCode] || 'not-available.svg';
        return `<img src="${iconBaseUrl}${iconName}" alt="${description}" class="weather-icon-img">`;
    }

    // --- Funkcje Pomocnicze / Helper Functions ---
    isMobilePortrait = () => window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;

    setTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        localStorage.setItem('theme', theme);
        if (this.map) this.updateMapTileLayer();
    }

    toggleButtonLoading(button, isLoading) {
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

    showError(message) {
        this.dom.weatherResultContainer.innerHTML = `<div class="weather-app__error">${message}</div>`;
        this.dom.forecastsContainer.style.display = 'none';
        this.dom.mapContainer.style.display = 'none';
    }

    // --- Obsługa Mapy / Map Handling ---
    initMap() {
        if (!this.map) {
            this.map = L.map('map').setView([51.75, 19.45], 10);
            this.lightTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' });
            this.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO' });
            this.updateMapTileLayer();
        }
    }

    updateMapTileLayer() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const targetLayer = isDarkMode ? this.darkTileLayer : this.lightTileLayer;
        const otherLayer = isDarkMode ? this.lightTileLayer : this.darkTileLayer;
        if (this.map.hasLayer(otherLayer)) this.map.removeLayer(otherLayer);
        if (!this.map.hasLayer(targetLayer)) this.map.addLayer(targetLayer);
    }

    updateMap(lat, lon, cityName, zoomLevel = 13) {
        if (this.map) {
            this.map.flyTo([lat, lon], zoomLevel);
            if (this.marker) this.map.removeLayer(this.marker);
            this.marker = L.marker([lat, lon]).addTo(this.map).bindPopup(cityName).openPopup();
        }
    }

    // --- Pobieranie Danych / Data Fetching ---
    async getWeatherData(query) {
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
            throw new Error(data.message || "Błąd serwera");
        }
        return data;
    }

    // --- Renderowanie UI / UI Rendering ---
    renderCurrentWeather(data) {
        const { current, daily, air_quality, location } = data;
        const roadCondition = current.temp > 2 && !['Rain', 'Snow', 'Drizzle'].includes(current.weather[0].main)
            ? { text: "Sucha", class: 'roadDry' }
            : (current.temp <= 2 ? { text: "Możliwe oblodzenie", class: 'roadIcy' } : { text: "Mokra", class: 'roadWet' });
        const aqiMap = ["Dobra", "Umiark.", "Średnia", "Zła", "B. zła"];
        const uvMap = { low: "Niski", moderate: "Umiark.", high: "Wysoki", "very-high": "B. wysoki", extreme: "Ekstrem." };
        const uvIndex = Math.round(current.uvi);
        let uvCategory = 'low';
        if (uvIndex >= 11) uvCategory = 'extreme'; else if (uvIndex >= 8) uvCategory = 'very-high';
        else if (uvIndex >= 6) uvCategory = 'high'; else if (uvIndex >= 3) uvCategory = 'moderate';
        
        const today = daily[0];
        const formatTime = (timestamp) => new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        this.dom.weatherResultContainer.innerHTML = `
            <h3 class="current-weather__city">${location.name}</h3>
            <div class="current-weather__main">
                <div class="current-weather__icon">${this.getWeatherIconHtml(current.weather[0].icon, current.weather[0].description)}</div>
                <div class="current-weather__details">
                    <span class="current-weather__temp">${Math.round(current.temp)}°C</span>
                    <span>${current.weather[0].description}</span>
                </div>
            </div>
            <div class="current-weather__extra-details">
                 <div class="detail-col detail-col--1">
                    <div class="current-weather__detail-item"><span class="detail-item-header"><span>Wiatr</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1-3.54 3.54l-6.85 6.85a2.5 2.5 0 1 1-3.54-3.54l6.85-6.85a2.5 2.5 0 1 1 3.54 3.54z"/></svg></span><span class="detail-item-value">${current.wind_speed.toFixed(1)} m/s</span></div>
                    <div class="current-weather__detail-item"><span class="detail-item-header"><span>Ciśnienie</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 12H19a2.5 2.5 0 0 0-5 0H2.5"/><path d="M21.5 12v-6a2.5 2.5 0 0 0-5 0v6"/><path d="M2.5 12v6a2.5 2.5 0 0 0 5 0v-6"/></svg></span><span class="detail-item-value">${current.pressure} hPa</span></div>
                </div>
                <div class="detail-col detail-col--2">
                    <div class="current-weather__detail-item"><span class="detail-item-header"><span>Jakość pow.</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 4.5a8.45 8.45 0 0 0-5.04 1.94 8.45 8.45 0 0 0-2.02 5.07 8.45 8.45 0 0 0 .5 3.51 8.45 8.45 0 0 0 3.51 .5h8.55a8.45 8.45 0 0 0 2.02-5.07 8.45 8.45 0 0 0-5.04-1.94Z"/><path d="M8 15h8"/></svg></span><span class="detail-item-value value-color--aqi-${air_quality.main.aqi}">${aqiMap[air_quality.main.aqi - 1]}</span></div>
                    <div class="current-weather__detail-item"><span class="detail-item-header"><span>Indeks UV</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/></svg></span><span class="detail-item-value value-color--uv-${uvCategory}">${uvMap[uvCategory]}</span></div>
                </div>
                <div class="detail-col detail-col--3">
                    <div class="current-weather__detail-item"><span class="detail-item-header"><span>Nawierzchnia</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0-4.4-3.6-8-8-8s-8 3.6-8 8c0 2 .8 3.8 2 5l-3 7h18l-3-7c1.2-1.2 2-3 2-5Z"/><path d="M12 10h.01"/></svg></span><span class="detail-item-value value-color--${roadCondition.class}">${roadCondition.text}</span></div>
                </div>
                <div class="detail-col detail-col--4">
                    <div class="current-weather__detail-item"><span class="detail-item-header"><span>Wschód słońca</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg></span><span class="detail-item-value">${formatTime(current.sunrise)}</span></div>
                    <div class="current-weather__detail-item"><span class="detail-item-header"><span>Zachód słońca</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4-4-4 4"/><path d="M16 18a4 4 0 0 1-8 0"/></svg></span><span class="detail-item-value">${formatTime(current.sunset)}</span></div>
                </div>
                <div class="detail-col detail-col--5">
                    <div class="current-weather__detail-item"><span class="detail-item-header"><span>Wschód księżyca</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M18 12h-6"/><path d="M12 18s-4-3-4-6 4-6 4-6"/><path d="M12 6s4 3 4 6-4 6-4 6"/></svg></span><span class="detail-item-value">${formatTime(today.moonrise)}</span></div>
                    <div class="current-weather__detail-item"><span class="detail-item-header"><span>Zachód księżyca</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18V6"/><path d="M6 12h6"/><path d="M12 6s-4 3-4-6 4 6 4 6"/><path d="M12 18s4-3 4-6-4-6-4-6"/></svg></span><span class="detail-item-value">${formatTime(today.moonset)}</span></div>
                </div>
            </div>`;
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
                    <p class="hourly-forecast__temp">${Math.round(item.temp)}°C</p>
                    <div class="hourly-forecast__pop">
                        <svg class="hourly-forecast__pop-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a5.53 5.53 0 0 0-5.43 6.05L8 16l5.43-9.95A5.53 5.53 0 0 0 8 0zm0 8.87A2.87 2.87 0 1 1 10.87 6 2.87 2.87 0 0 1 8 8.87z"/></svg>
                        <span>${Math.round(item.pop * 100)}%</span>
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
        this.dom.daily.container.innerHTML = data.daily.slice(1, 6).map(day => `
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
            
            if (typeof query === 'string') localStorage.setItem('lastCity', query.trim());
            this.hourlyForecastData = data.hourly;
            
            this.renderCurrentWeather(data);
            this.renderDailyForecast(data);
            this.renderHourlyForecast();
            
            // ZMIANA: Logika wyświetlania prognoz po wyszukaniu
            // CHANGE: Forecast display logic after search
            this.dom.forecastsContainer.style.display = 'block'; // Zawsze pokazuj kontener ze switcherem

            if (this.isMobilePortrait()) {
                // W trybie portretowym, ukryj treść prognoz do czasu kliknięcia
                // In portrait mode, hide forecast content until clicked
                this.dom.forecastsContainer.className = '';
                const activeButton = this.dom.forecastSwitcher.querySelector('.active');
                if (activeButton) {
                    activeButton.classList.remove('active');
                }
            } else {
                // W innych trybach, domyślnie pokaż prognozę godzinową
                // In other modes, show the hourly forecast by default
                this.dom.forecastsContainer.className = 'show-hourly';
                // Upewnij się, że odpowiedni przycisk jest aktywny
                const dailyButton = this.dom.forecastSwitcher.querySelector('[data-forecast="daily"]');
                if (dailyButton) dailyButton.classList.remove('active');
                const hourlyButton = this.dom.forecastSwitcher.querySelector('[data-forecast="hourly"]');
                if (hourlyButton) hourlyButton.classList.add('active');
            }
            
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

    handleGeolocation() {
        if (navigator.geolocation) {
            this.toggleButtonLoading(this.dom.geoBtn, true);
            navigator.geolocation.getCurrentPosition(
                pos => this.handleSearch({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, this.dom.geoBtn),
                () => { 
                    this.showError("Nie udało się pobrać lokalizacji."); 
                    this.toggleButtonLoading(this.dom.geoBtn, false); 
                }
            );
        }
    }

    // --- Handlery Zdarzeń UI / UI Event Handlers ---
    handleForecastSwitch(event) {
        const btn = event.target.closest('button');
        if (!btn) return;
        this.dom.forecastsContainer.style.display = 'block';
        this.dom.forecastsContainer.className = `show-${btn.dataset.forecast}`;
        const currentActive = this.dom.forecastSwitcher.querySelector('.active');
        if(currentActive) currentActive.classList.remove('active');
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
        if (this.isMobilePortrait() || !this.dom.hourly.scrollWrapper) return;

        requestAnimationFrame(() => {
            const { scrollLeft, scrollWidth, clientWidth } = this.dom.hourly.scrollWrapper;
            this.dom.hourly.sliderPrevBtn.disabled = scrollLeft <= 0;
            this.dom.hourly.sliderNextBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 1;
        });
    }

    handleSliderScroll(direction) {
        const item = this.dom.hourly.container.querySelector('.hourly-forecast__item');
        if (!item) return;

        const itemWidth = item.offsetWidth;
        const gap = 8;
        
        const scrollAmount = (itemWidth + gap) * 8 * direction;
        
        this.dom.hourly.scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new WeatherApp();
    app.init();
});

