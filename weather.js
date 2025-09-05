document.addEventListener('DOMContentLoaded', () => {

    let currentTheme = localStorage.getItem('theme') || 'light';

    // Elementy DOM
    const searchBtn = document.getElementById('search-weather-btn');
    const cityInput = document.getElementById('city-input');
    const geoBtn = document.getElementById('geolocation-btn');
    const themeToggle = document.getElementById('theme-toggle');

    function setTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        localStorage.setItem('theme', theme);
        currentTheme = theme;
    }

    function getWeatherIcon(iconCode) {
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
        return `<img src="${iconBaseUrl}${iconName}" alt="Weather icon" class="weather-icon-img">`;
    }

    // ZMIANA: Dodano funkcję pomocniczą do zarządzania stanem ładowania przycisków
    // EN: Added a helper function to manage the loading state of buttons
    function setButtonLoadingState(button, isLoading, originalText) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `<span class="loader"></span>`;
        } else {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    async function handleWeatherSearch(query) {
        const resultContainer = document.getElementById('weather-result-container');
        const forecastsContainer = document.getElementById('forecasts-container');
        const skeletonHTML = `
            <div class="weather-app__skeleton">
                <div class="skeleton" style="width: 200px; height: 2.2rem; margin-bottom: 1rem;"></div>
                <div class="skeleton" style="width: 150px; height: 4rem;"></div>
            </div>`;

        resultContainer.innerHTML = skeletonHTML;
        forecastsContainer.style.display = 'none';

        const currentLang = 'pl';
        let url;
        if (typeof query === 'string' && query) {
            url = `/.netlify/functions/weather?city=${encodeURIComponent(query)}&lang=${currentLang}`;
            localStorage.setItem('lastCity', query);
        } else if (typeof query === 'object' && query.latitude) {
            url = `/.netlify/functions/weather?lat=${query.latitude}&lon=${query.longitude}&lang=${currentLang}`;
            localStorage.removeItem('lastCity');
        } else {
            return;
        }

        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok) {
                const errorMessage = data.message || "Błąd serwera";
                throw new Error(errorMessage);
            }

            const current = data.list[0];
            const sunrise = new Date((data.city.sunrise + data.city.timezone) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
            const sunset = new Date((data.city.sunset + data.city.timezone) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
            const roadCondition = current.main.temp > 2 && !['Rain', 'Snow', 'Drizzle'].includes(current.weather[0].main)
                ? { text: "Sucha", class: 'roadDry' }
                : (current.main.temp <= 2 ? { text: "Możliwe oblodzenie", class: 'roadIcy' } : { text: "Mokra", class: 'roadWet' });

            resultContainer.innerHTML = `
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
            
            const hourlyContainer = document.getElementById('hourly-forecast-container');
            hourlyContainer.innerHTML = data.list.slice(0, 8).map(item => `
                <div class="hourly-forecast__item">
                    <p class="hourly-forecast__time">${new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <div class="hourly-forecast__icon">${getWeatherIcon(item.weather[0].icon)}</div>
                    <p class="hourly-forecast__temp">${Math.round(item.main.temp)}°C</p>
                </div>
            `).join('');

            const forecastContainer = document.getElementById('forecast-container');
            forecastContainer.innerHTML = data.list.filter(item => item.dt_txt.includes("12:00:00")).slice(0, 5).map(item => `
                <div class="weather-app__forecast-day">
                    <h4>${new Date(item.dt * 1000).toLocaleDateString(currentLang, { weekday: 'long' })}</h4>
                    <div class="weather-app__forecast-icon">${getWeatherIcon(item.weather[0].icon)}</div>
                    <p>${Math.round(item.main.temp)}°C</p>
                </div>
            `).join('');
            
            forecastsContainer.style.display = 'block';

        } catch (error) {
            resultContainer.innerHTML = `<p>Błąd: ${error.message}. Sprawdź, czy projekt został wdrożony na Netlify i czy klucz API jest poprawnie skonfigurowany.</p>`;
        }
    }

    function setupForecastSwitcher() {
        const switcher = document.getElementById('forecast-switcher');
        switcher?.addEventListener('click', function(e) {
            const button = e.target.closest('button');
            if (!button) return;

            const forecastType = button.dataset.forecast;
            const forecastsContainer = document.getElementById('forecasts-container');
            
            if (forecastsContainer) {
                forecastsContainer.className = `show-${forecastType}`;
                switcher.querySelector('.active').classList.remove('active');
                button.classList.add('active');
            }
        });
    }

    // Inicjalizacja
    setTheme(currentTheme);
    themeToggle.addEventListener('click', () => setTheme(currentTheme === 'light' ? 'dark' : 'light'));
    
    searchBtn?.addEventListener('click', () => handleWeatherSearch(cityInput.value.trim()));
    cityInput?.addEventListener('keyup', e => { if (e.key === 'Enter') handleWeatherSearch(cityInput.value.trim()); });
    
    // ZMIANA: Ulepszona obsługa kliknięcia przycisku geolokalizacji
    // EN: Improved handling of the geolocation button click
    geoBtn?.addEventListener('click', () => {
        if (navigator.geolocation) {
            const originalText = geoBtn.innerHTML;
            setButtonLoadingState(geoBtn, true, originalText); // Pokaż loader

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    handleWeatherSearch({ latitude: position.coords.latitude, longitude: position.coords.longitude })
                        .finally(() => setButtonLoadingState(geoBtn, false, originalText)); // Ukryj loader po zakończeniu
                },
                () => {
                    document.getElementById('weather-result-container').innerHTML = `<p>Nie udało się pobrać lokalizacji.</p>`;
                    setButtonLoadingState(geoBtn, false, originalText); // Ukryj loader w przypadku błędu
                }
            );
        }
    });
    
    setupForecastSwitcher();

    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        cityInput.value = lastCity;
        handleWeatherSearch(lastCity);
    }
});
