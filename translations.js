/**
 * --- PL ---
 * Moduł internacjonalizacji (i18n).
 * Eksportuje obiekt zawierający wszystkie teksty używane w aplikacji
 * w różnych językach. Umożliwia łatwe zarządzanie tłumaczeniami i dodawanie
 * nowych języków bez modyfikacji głównej logiki aplikacji.
 * --- EN ---
 * Internationalization (i18n) module.
 * Exports an object containing all texts used in the application
 * in various languages. It allows for easy management of translations and
 * addition of new languages without modifying the main application logic.
 */
export const translations = {
    pl: {
        // --- Alerty i błędy ---
        alerts: {
            noAlerts: 'Brak alertów pogodowych w bieżącej lokalizacji',
            issuedBy: 'Wydane przez',
            effective: 'Obowiązuje od',
            to: 'do',
        },
        errors: {
            default: 'Wpisz miasto lub zezwól na geolokalizację.',
            location: 'Nie udało się pobrać lokalizacji.',
            serverError: 'Błąd serwera',
        },
        
        // --- Główne detale pogody ---
        details: {
            feelsLike: 'Temperatura odczuwalna',
            humidity: 'Wilgotność',
            pressure: 'Ciśnienie',
            clouds: 'Zachmurzenie',
            wind: 'Wiatr',
            windGust: 'Porywy wiatru',
            uvIndex: 'Indeks UV',
            visibility: 'Widoczność',
            aqi: 'Jakość pow.',
            roadSurface: 'Nawierzchnia',
            sunrise: 'Wschód słońca',
            sunset: 'Zachód słońca',
            moonrise: 'Wschód księżyca',
            moonset: 'Zachód księżyca',
        },

        // --- Prognozy ---
        forecast: {
            precipChance: 'Szansa opadów',
            today: 'Dzisiaj',
            tomorrow: 'Jutro',
            temp: 'Temperatura',
            morn: 'Rano',
            day: 'Dzień',
            eve: 'Wieczór',
            night: 'Noc',
        },

        // --- Wartości (np. dla AQI, UV) ---
        values: {
            aqi: ['Dobra', 'Umiark.', 'Średnia', 'Zła', 'B. zła'],
            uv: {
                low: 'Niski',
                moderate: 'Umiark.',
                high: 'Wysoki',
                'very-high': 'B. wysoki',
                extreme: 'Ekstremalny'
            },
            road: {
                dry: 'Sucha',
                wet: 'Mokra',
                icy: 'Możliwe oblodzenie'
            }
        },

        // --- Tłumaczenia podsumowania dnia z API ---
        overview: {
            // Klucze są celowo po angielsku, aby pasowały do danych z API
            'light intensity drizzle': 'lekka mżawka',
            'drizzle': 'mżawka',
            'heavy intensity drizzle': 'intensywna mżawka',
            'light intensity drizzle rain': 'lekka mżawka z deszczem',
            'drizzle rain': 'mżawka z deszczem',
            'heavy intensity drizzle rain': 'intensywna mżawka z deszczem',
            'shower rain and drizzle': 'przelotny deszcz z mżawką',
            'heavy shower rain and drizzle': 'intensywny przelotny deszcz z mżawką',
            'shower drizzle': 'przelotna mżawka',
            'light rain': 'lekkie opady deszczu',
            'moderate rain': 'umiarkowane opady deszczu',
            'heavy intensity rain': 'intensywne opady deszczu',
            'very heavy rain': 'bardzo intensywne opady deszczu',
            'extreme rain': 'ekstremalne opady deszczu',
            'freezing rain': 'marznący deszcz',
            'light intensity shower rain': 'lekkie opady deszczu przelotnego',
            'shower rain': 'deszcz przelotny',
            'heavy intensity shower rain': 'intensywny deszcz przelotny',
            'ragged shower rain': 'przelotne opady deszczu',
            'light snow': 'lekkie opady śniegu',
            'snow': 'opady śniegu',
            'heavy snow': 'intensywne opady śniegu',
            'sleet': 'deszcz ze śniegiem',
            'light shower sleet': 'lekkie przelotne opady deszczu ze śniegiem',
            'shower sleet': 'przelotne opady deszczu ze śniegiem',
            'light rain and snow': 'słabe opady deszczu ze śniegiem',
            'rain and snow': 'deszcz ze śniegiem',
            'light shower snow': 'lekkie przelotne opady śniegu',
            'shower snow': 'przelotne opady śniegu',
            'heavy shower snow': 'intensywne przelotne opady śniegu',
            'mist': 'zamglenie',
            'smoke': 'zadymienie',
            'haze': 'mgiełka',
            'sand/ dust whirls': 'wiry piaskowe/pyłowe',
            'fog': 'mgła',
            'sand': 'piasek',
            'dust': 'pył',
            'volcanic ash': 'pył wulkaniczny',
            'squalls': 'nawałnice',
            'tornado': 'tornado',
            'clear sky': 'bezchmurne niebo',
            'few clouds': 'niewielkie zachmurzenie',
            'scattered clouds': 'rozproszone chmury',
            'broken clouds': 'przejaśnienia',
            'overcast clouds': 'całkowite zachmurzenie',
            'thunderstorm with light rain': 'burza z lekkimi opadami deszczu',
            'thunderstorm with rain': 'burza z deszczem',
            'thunderstorm with heavy rain': 'burza z ulewnym deszczem',
            'light thunderstorm': 'słaba burza',
            'thunderstorm': 'burza',
            'heavy thunderstorm': 'silna burza',
            'ragged thunderstorm': 'przelotna burza',
            'thunderstorm with light drizzle': 'burza z lekką mżawką',
            'thunderstorm with drizzle': 'burza z mżawką',
            'thunderstorm with heavy drizzle': 'burza z intensywną mżawką',
            // --- szablony ---
            'expect': 'Spodziewaj się',
            'throughout the day': 'przez cały dzień',
            'and': 'i'
        }
    },
    en: {
        // --- Alerts and errors ---
        alerts: {
            noAlerts: 'No weather alerts for the current location',
            issuedBy: 'Issued by',
            effective: 'Effective from',
            to: 'to',
        },
        errors: {
            default: 'Enter a city or allow geolocation.',
            location: 'Could not retrieve location.',
            serverError: 'Server error',
        },
        
        // --- Main weather details ---
        details: {
            feelsLike: 'Feels like',
            humidity: 'Humidity',
            pressure: 'Pressure',
            clouds: 'Cloudiness',
            wind: 'Wind',
            windGust: 'Wind gust',
            uvIndex: 'UV Index',
            visibility: 'Visibility',
            aqi: 'Air Quality',
            roadSurface: 'Road Surface',
            sunrise: 'Sunrise',
            sunset: 'Sunset',
            moonrise: 'Moonrise',
            moonset: 'Moonset',
        },

        // --- Forecasts ---
        forecast: {
            precipChance: 'Chance of precipitation',
            today: 'Today',
            tomorrow: 'Tomorrow',
            temp: 'Temperature',
            morn: 'Morning',
            day: 'Day',
            eve: 'Evening',
            night: 'Night',
        },

        // --- Values (for AQI, UV etc.) ---
        values: {
            aqi: ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'],
            uv: {
                low: 'Low',
                moderate: 'Moderate',
                high: 'High',
                'very-high': 'Very High',
                extreme: 'Extreme'
            },
            road: {
                dry: 'Dry',
                wet: 'Wet',
                icy: 'Icy conditions possible'
            }
        },
        
        // --- English versions for API summaries (mostly 1:1) ---
        overview: {
            'light intensity drizzle': 'light intensity drizzle',
            'drizzle': 'drizzle',
            'heavy intensity drizzle': 'heavy intensity drizzle',
            'light intensity drizzle rain': 'light intensity drizzle rain',
            'drizzle rain': 'drizzle rain',
            'heavy intensity drizzle rain': 'heavy intensity drizzle rain',
            'shower rain and drizzle': 'shower rain and drizzle',
            'heavy shower rain and drizzle': 'heavy shower rain and drizzle',
            'shower drizzle': 'shower drizzle',
            'light rain': 'light rain',
            'moderate rain': 'moderate rain',
            'heavy intensity rain': 'heavy intensity rain',
            'very heavy rain': 'very heavy rain',
            'extreme rain': 'extreme rain',
            'freezing rain': 'freezing rain',
            'light intensity shower rain': 'light intensity shower rain',
            'shower rain': 'shower rain',
            'heavy intensity shower rain': 'heavy intensity shower rain',
            'ragged shower rain': 'ragged shower rain',
            'light snow': 'light snow',
            'snow': 'snow',
            'heavy snow': 'heavy snow',
            'sleet': 'sleet',
            'light shower sleet': 'light shower sleet',
            'shower sleet': 'shower sleet',
            'light rain and snow': 'light rain and snow',
            'rain and snow': 'rain and snow',
            'light shower snow': 'light shower snow',
            'shower snow': 'shower snow',
            'heavy shower snow': 'heavy shower snow',
            'mist': 'mist',
            'smoke': 'smoke',
            'haze': 'haze',
            'sand/ dust whirls': 'sand/ dust whirls',
            'fog': 'fog',
            'sand': 'sand',
            'dust': 'dust',
            'volcanic ash': 'volcanic ash',
            'squalls': 'squalls',
            'tornado': 'tornado',
            'clear sky': 'clear sky',
            'few clouds': 'few clouds',
            'scattered clouds': 'scattered clouds',
            'broken clouds': 'broken clouds',
            'overcast clouds': 'overcast clouds',
            'thunderstorm with light rain': 'thunderstorm with light rain',
            'thunderstorm with rain': 'thunderstorm with rain',
            'thunderstorm with heavy rain': 'thunderstorm with heavy rain',
            'light thunderstorm': 'light thunderstorm',
            'thunderstorm': 'thunderstorm',
            'heavy thunderstorm': 'heavy thunderstorm',
            'ragged thunderstorm': 'ragged thunderstorm',
            'thunderstorm with light drizzle': 'thunderstorm with light drizzle',
            'thunderstorm with drizzle': 'thunderstorm with drizzle',
            'thunderstorm with heavy drizzle': 'thunderstorm with heavy drizzle',
            // --- templates ---
            'expect': 'Expect',
            'throughout the day': 'throughout the day',
            'and': 'and'
        }
    }
};
