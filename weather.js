document.addEventListener('DOMContentLoaded', () => {
    // --- Zmienne globalne i referencje DOM ---
    let map = null;
    let marker = null;
    let hourlyForecastData = [];
    let currentHourlyRange = 24;

    const dom = {
        searchBtn: document.getElementById('search-weather-btn'),
        cityInput: document.getElementById('city-input'),
        geoBtn: document.getElementById('geolocation-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        weatherResultContainer: document.getElementById('weather-result-container'),
        forecastsContainer: document.getElementById('forecasts-container'),
        mapContainer: document.getElementById('map-container'),
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

    // --- Funkcje pomocnicze ---
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
    }

    // --- Obsługa mapy ---
    let lightTileLayer, darkTileLayer;
    function initializeMap() {
        if (!map) {
            map = L.map('map').setView([51.75, 19.45], 10);
            lightTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' });
            darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO' });
            updateMapTileLayer();
        }
    }

    function updateMapTileLayer() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const targetLayer = isDarkMode ? darkTileLayer : lightTileLayer;
        const otherLayer = isDarkMode ? lightTileLayer : darkTileLayer;
        if (map.hasLayer(otherLayer)) map.removeLayer(otherLayer);
        if (!map.hasLayer(targetLayer)) map.addLayer(targetLayer);
    }

    function updateMap(lat, lon, cityName) {
        if (map) {
            map.setView([lat, lon], 13);
            if (marker) map.removeLayer(marker);
            marker = L.marker([lat, lon]).addTo(map).bindPopup(cityName).openPopup();
        }
    }

    // --- Pobieranie danych pogodowych ---
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
            throw new Error(data.message || "Błąd serwera");
        }
        return data;
    }

    // --- Renderowanie UI ---
    const weatherIcons = {
        getIcon: (iconCode) => `https://basemilius.github.io/weather-icons/production/fill/all/${{
            '01d': 'clear-day.svg', '01n': 'clear-night.svg', '02d': 'partly-cloudy-day.svg', 
            '02n': 'partly-cloudy-night.svg', '03d': 'cloudy.svg', '03n': 'cloudy.svg', 
            '04d': 'overcast-day.svg', '04n': 'overcast-night.svg', '09d': 'rain.svg', 
            '09n': 'rain.svg', '10d': 'partly-cloudy-day-rain.svg', '10n': 'partly-cloudy-night-rain.svg',
            '11d': 'thunderstorms-day.svg', '11n': 'thunderstorms-night.svg', '13d': 'snow.svg', 
            '13n': 'snow.svg', '50d': 'fog-day.svg', '50n': 'fog-night.svg'
        }[iconCode] || 'not-available.svg'}`
    };
    
    function updateCurrentWeather(data) {
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

        dom.weatherResultContainer.innerHTML = `
            <h3 class="current-weather__city">${location.name}</h3>
            <div class="current-weather__main">
                <div class="current-weather__icon"><img src="${weatherIcons.getIcon(current.weather[0].icon)}" alt="Weather icon" class="weather-icon-img"></div>
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
                    <div class="current-weather__detail-item"><span class="detail-item-header"><span>Zachód księżyca</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18V6"/><path d="M6 12h6"/><path d="M12 6s-4 3-4 6 4 6 4 6"/><path d="M12 18s4-3 4-6-4-6-4-6"/></svg></span><span class="detail-item-value">${formatTime(today.moonset)}</span></div>
                </div>
            </div>`;
    }

    function renderHourlyForecast() {
        const now = new Date();
        const range = window.innerWidth > 1024 ? 48 : currentHourlyRange;
        
        // ZMIANA: Zawsze pobieramy 'range' godzin od teraz.
        // CHANGE: Always fetch 'range' hours from now.
        const forecastToShow = hourlyForecastData.slice(1, range + 1);

        dom.hourly.container.innerHTML = ''; 

        let lastDate = '';
        const today = new Date().toLocaleDateString('pl-PL');
        const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString('pl-PL');
        
        forecastToShow.forEach((item, index) => {
            const itemDateObj = new Date(item.dt * 1000);
            const itemDate = itemDateObj.toLocaleDateString('pl-PL');

            if (itemDate !== lastDate) {
                let dayLabel = itemDateObj.toLocaleDateString('pl-PL', { weekday: 'long' });
                if (itemDate === today) dayLabel = 'Dziś';
                if (itemDate === tomorrow) dayLabel = 'Jutro';
                
                if(index > 0) {
                     dom.hourly.container.innerHTML += `<div class="hourly-forecast__day-separator">${dayLabel}</div>`;
                }
                lastDate = itemDate;
            }
            
            dom.hourly.container.innerHTML += `
            <div class="hourly-forecast__item">
                <p class="hourly-forecast__time">${itemDateObj.getHours()}:00</p>
                <div class="hourly-forecast__icon"><img src="${weatherIcons.getIcon(item.weather[0].icon)}" alt="" class="weather-icon-img"></div>
                <p class="hourly-forecast__temp">${Math.round(item.temp)}°C</p>
                <div class="hourly-forecast__pop">
                    <svg class="hourly-forecast__pop-icon" viewBox="0 0 24 24"><path d="M12.7,1.3c-0.1,0-0.2,0-0.3,0.1C12.3,1.4,12.3,1.5,12.3,1.6l0.2,2.3c2.9,0.5,5.2,2.8,5.7,5.7l2.3,0.2c0.1,0,0.2,0.1,0.3,0.2c0,0.1,0,0.2-0.1,0.3l-2,1.3c-0.1,0-0.2,0-0.3-0.1l-2-1.3c-0.1,0-0.1-0.2-0.1-0.3c0-0.1,0.1-0.2,0.2-0.2l0.8-0.1c-0.4-2.1-2.2-3.9-4.4-4.4l-0.1,0.8c0,0.1,0,0.2-0.1,0.3c-0.1,0-0.2,0-0.3-0.1l-1.3-2C12.9,1.4,12.8,1.3,12.7,1.3z M6,12.2c0.1,0,0.2,0,0.3,0.1l1.3,2c0.1,0.1,0.1,0.2,0.1,0.3c0,0.1-0.1,0.2-0.2,0.2l-0.8,0.1c0.5,2.1,2.2,3.8,4.4,4.3l0.1-0.8c0-0.1,0.1-0.2,0.2-0.3c0.1,0,0.2,0,0.3,0.1l2,1.3c0.1,0.1,0.1,0.2,0.1,0.3c0,0.1-0.1,0.2-0.2,0.2l-2.3-0.2c-2.9-0.5-5.2-2.8-5.7-5.7L3.5,15c-0.1,0-0.2-0.1-0.3-0.2c0-0.1,0-0.2,0.1-0.3L5.3,13c0.1-0.1,0.2,0,0.3,0.1L6,12.2z"/></svg>
                    <span>${Math.round(item.pop * 100)}%</span>
                </div>
            </div>`;
        });
        
        setTimeout(updateSliderButtons, 0);
    }
    
    function updateDailyForecast(data) {
        dom.daily.container.innerHTML = data.daily.slice(1, 6).map(day => `
            <div class="weather-app__forecast-day">
                <h4>${new Date(day.dt * 1000).toLocaleDateString('pl-PL', { weekday: 'long' })}</h4>
                <div class="weather-app__forecast-icon"><img src="${weatherIcons.getIcon(day.weather[0].icon)}" alt="" class="weather-icon-img"></div>
                <p>${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</p>
            </div>`).join('');
    }

    // --- Główna logika aplikacji ---
    async function handleWeatherSearch(query, buttonToLoad) {
        if (!query) return;
        dom.weatherResultContainer.innerHTML = `<div class="weather-app__skeleton"><div class="skeleton" style="width: 200px; height: 2.2rem;"></div><div class="skeleton" style="width: 150px; height: 4rem;"></div></div>`;
        dom.forecastsContainer.style.display = 'none';
        dom.mapContainer.style.display = 'none';
        if (buttonToLoad) toggleButtonLoading(buttonToLoad, true);

        try {
            const data = await getWeatherData(query);
            if (!data) { showError("Wpisz miasto lub zezwól na geolokalizację."); return; }
            
            if (typeof query === 'string') localStorage.setItem('lastCity', query.trim());
            hourlyForecastData = data.hourly;
            
            updateCurrentWeather(data);
            updateDailyForecast(data);
            renderHourlyForecast();
            
            dom.mapContainer.style.display = 'block';
            updateMap(data.location.lat, data.location.lon, data.location.name);
            setTimeout(() => map.invalidateSize(), 200);

            dom.forecastsContainer.style.display = 'block';
            if (isMobilePortrait()) dom.forecastsContainer.classList.add('collapsed');

        } catch (error) {
            showError(`Błąd: ${error.message}`);
        } finally {
            if (buttonToLoad) toggleButtonLoading(buttonToLoad, false);
        }
    }

    // --- Obsługa slidera ---
    function updateSliderButtons() {
        if (isMobilePortrait() || !dom.hourly.scrollWrapper) return;
        requestAnimationFrame(() => {
            const { scrollLeft, scrollWidth, clientWidth } = dom.hourly.scrollWrapper;
            dom.hourly.sliderPrevBtn.disabled = scrollLeft <= 0;
            dom.hourly.sliderNextBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 1;
        });
    }

    function handleSliderScroll(direction) {
        const item = dom.hourly.container.querySelector('.hourly-forecast__item');
        if (!item) return;
        const scrollAmount = (item.offsetWidth + 12) * 8 * direction;
        dom.hourly.scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    
    // --- Inicjalizacja i event listenery ---
    function setupEventListeners() {
        dom.themeToggle.addEventListener('click', () => setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark'));
        dom.searchBtn?.addEventListener('click', () => handleWeatherSearch(dom.cityInput.value.trim(), dom.searchBtn));
        dom.cityInput?.addEventListener('keyup', e => { if (e.key === 'Enter') handleWeatherSearch(dom.cityInput.value.trim(), dom.searchBtn); });
        dom.geoBtn?.addEventListener('click', () => {
            if (navigator.geolocation) {
                toggleButtonLoading(dom.geoBtn, true);
                navigator.geolocation.getCurrentPosition(
                    pos => handleWeatherSearch({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, dom.geoBtn),
                    () => { showError("Nie udało się pobrać lokalizacji."); toggleButtonLoading(dom.geoBtn, false); }
                );
            }
        });
        
        document.getElementById('forecast-switcher')?.addEventListener('click', function(e) {
            const btn = e.target.closest('button');
            if (!btn) return;
            dom.forecastsContainer.className = `show-${btn.dataset.forecast}`;
            this.querySelector('.active').classList.remove('active');
            btn.classList.add('active');
            dom.forecastsContainer.classList.remove('collapsed');
        });

        dom.hourly.rangeSwitcher?.addEventListener('click', function(e) {
            const btn = e.target.closest('button');
            if (!btn || btn.classList.contains('active')) return;
            currentHourlyRange = parseInt(btn.dataset.range, 10);
            this.querySelector('.active').classList.remove('active');
            btn.classList.add('active');
            renderHourlyForecast();
        });

        dom.hourly.sliderPrevBtn.addEventListener('click', () => handleSliderScroll(-1));
        dom.hourly.sliderNextBtn.addEventListener('click', () => handleSliderScroll(1));
        dom.hourly.scrollWrapper.addEventListener('scroll', updateSliderButtons, { passive: true });
        window.addEventListener('resize', updateSliderButtons);
    }

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

