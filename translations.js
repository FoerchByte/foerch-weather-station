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
            description: 'Opis', // ZMIANA: Dodano brakujący klucz
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
            'expect': 'Spodziewaj się',
            'throughout the day': 'przez cały dzień',
            'and': 'i',
            
            'lekka mżawka': { nominative: 'lekka mżawka', genitive: 'lekkiej mżawki' },
            'mżawka': { nominative: 'mżawka', genitive: 'mżawki' },
            'intensywna mżawka': { nominative: 'intensywna mżawka', genitive: 'intensywnej mżawki' },
            'lekkie opady deszczu': { nominative: 'lekkie opady deszczu', genitive: 'lekkich opadów deszczu' },
            'umiarkowane opady deszczu': { nominative: 'umiarkowane opady deszczu', genitive: 'umiarkowanych opadów deszczu' },
            'intensywne opady deszczu': { nominative: 'intensywne opady deszczu', genitive: 'intensywnych opadów deszczu' },
            'marznący deszcz': { nominative: 'marznący deszcz', genitive: 'marznącego deszczu' },
            'przelotne opady deszczu': { nominative: 'przelotne opady deszczu', genitive: 'przelotnych opadów deszczu' },
            'lekkie opady śniegu': { nominative: 'lekkie opady śniegu', genitive: 'lekkich opadów śniegu' },
            'śnieg': { nominative: 'śnieg', genitive: 'śniegu' },
            'intensywne opady śniegu': { nominative: 'intensywne opady śniegu', genitive: 'intensywnych opadów śniegu' },
            'deszcz ze śniegiem': { nominative: 'deszcz ze śniegiem', genitive: 'deszczu ze śniegiem' },
            'przelotne opady deszczu ze śniegiem': { nominative: 'przelotne opady deszczu ze śniegiem', genitive: 'przelotnych opadów deszczu ze śniegiem' },
            'zamglenie': { nominative: 'zamglenie', genitive: 'zamglenia' },
            'mgła': { nominative: 'mgła', genitive: 'mgły' },
            'zachmurzenie małe': { nominative: 'zachmurzenie małe', genitive: 'małego zachmurzenia' },
            'zachmurzenie umiarkowane': { nominative: 'zachmurzenie umiarkowane', genitive: 'umiarkowanego zachmurzenia' },
            'zachmurzenie duże': { nominative: 'zachmurzenie duże', genitive: 'dużego zachmurzenia' },
            'całkowite zachmurzenie': { nominative: 'całkowite zachmurzenie', genitive: 'całkowitego zachmurzenia' },
            'burza': { nominative: 'burza', genitive: 'burzy' },
            'burza z lekkimi opadami deszczu': { nominative: 'burza z lekkimi opadami deszczu', genitive: 'burzy z lekkimi opadami deszczu' },
            'burza z deszczem': { nominative: 'burza z deszczem', genitive: 'burzy z deszczem' },
            'silna burza': { nominative: 'silna burza', genitive: 'silnej burzy' },
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
            description: 'Description', // CHANGE: Added missing key
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
            'expect': 'Expect',
            'throughout the day': 'throughout the day',
            'and': 'and',

            'light intensity drizzle': { nominative: 'light intensity drizzle', genitive: 'light intensity drizzle' },
            'drizzle': { nominative: 'drizzle', genitive: 'drizzle' },
            'heavy intensity drizzle': { nominative: 'heavy intensity drizzle', genitive: 'heavy intensity drizzle' },
            'light rain': { nominative: 'light rain', genitive: 'light rain' },
            'moderate rain': { nominative: 'moderate rain', genitive: 'moderate rain' },
            'heavy intensity rain': { nominative: 'heavy intensity rain', genitive: 'heavy intensity rain' },
            'freezing rain': { nominative: 'freezing rain', genitive: 'freezing rain' },
            'shower rain': { nominative: 'shower rain', genitive: 'shower rain' },
            'light snow': { nominative: 'light snow', genitive: 'light snow' },
            'snow': { nominative: 'snow', genitive: 'snow' },
            'heavy snow': { nominative: 'heavy snow', genitive: 'heavy snow' },
            'sleet': { nominative: 'sleet', genitive: 'sleet' },
            'shower sleet': { nominative: 'shower sleet', genitive: 'shower sleet' },
            'mist': { nominative: 'mist', genitive: 'mist' },
            'fog': { nominative: 'fog', genitive: 'fog' },
            'few clouds': { nominative: 'few clouds', genitive: 'few clouds' },
            'scattered clouds': { nominative: 'scattered clouds', genitive: 'scattered clouds' },
            'broken clouds': { nominative: 'broken clouds', genitive: 'broken clouds' },
            'overcast clouds': { nominative: 'overcast clouds', genitive: 'overcast clouds' },
            'thunderstorm': { nominative: 'thunderstorm', genitive: 'a thunderstorm' },
            'thunderstorm with light rain': { nominative: 'thunderstorm with light rain', genitive: 'a thunderstorm with light rain' },
            'thunderstorm with rain': { nominative: 'thunderstorm with rain', genitive: 'a thunderstorm with rain' },
            'heavy thunderstorm': { nominative: 'heavy thunderstorm', genitive: 'a heavy thunderstorm' },
        }
    }
};

