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

        // POPRAWKA: Struktura obiektowa dla poprawnej odmiany gramatycznej
        // FIX: Object structure for correct grammatical declension
        overview: {
            // --- Szablony zdań / Sentence templates ---
            'expect': 'Spodziewaj się',
            'throughout the day': 'przez cały dzień',
            
            // --- Tłumaczenia zjawisk pogodowych / Weather phenomena translations ---
            'bezchmurnie': { nominative: 'bezchmurne niebo', genitive: 'bezchmurnego nieba' },
            'niewielkie zachmurzenie': { nominative: 'niewielkie zachmurzenie', genitive: 'niewielkiego zachmurzenia' },
            'rozproszone chmury': { nominative: 'rozproszone chmury', genitive: 'rozproszonych chmur' },
            'przejaśnienia': { nominative: 'przejaśnienia', genitive: 'przejaśnień' },
            'zachmurzenie umiarkowane': { nominative: 'zachmurzenie umiarkowane', genitive: 'zachmurzenia umiarkowanego' },
            'zachmurzenie duże': { nominative: 'zachmurzenie duże', genitive: 'dużego zachmurzenia' },
            'całkowite zachmurzenie': { nominative: 'całkowite zachmurzenie', genitive: 'całkowitego zachmurzenia' },
            'lekkie opady deszczu': { nominative: 'lekkie opady deszczu', genitive: 'lekkich opadów deszczu' },
            'umiarkowane opady deszczu': { nominative: 'umiarkowane opady deszczu', genitive: 'umiarkowanych opadów deszczu' },
            'intensywne opady deszczu': { nominative: 'intensywne opady deszczu', genitive: 'intensywnych opadów deszczu' },
            'bardzo intensywne opady deszczu': { nominative: 'bardzo intensywne opady deszczu', genitive: 'bardzo intensywnych opadów deszczu' },
            'ekstremalne opady deszczu': { nominative: 'ekstremalne opady deszczu', genitive: 'ekstremalnych opadów deszczu' },
            'marznący deszcz': { nominative: 'marznący deszcz', genitive: 'marznącego deszczu' },
            'lekkie opady śniegu': { nominative: 'lekkie opady śniegu', genitive: 'lekkich opadów śniegu' },
            'opady śniegu': { nominative: 'opady śniegu', genitive: 'opadów śniegu' },
            'śnieg': { nominative: 'opady śniegu', genitive: 'opadów śniegu' },
            'intensywne opady śniegu': { nominative: 'intensywne opady śniegu', genitive: 'intensywnych opadów śniegu' },
            'deszcz ze śniegiem': { nominative: 'deszcz ze śniegiem', genitive: 'deszczu ze śniegiem' },
            'przelotne opady deszczu': { nominative: 'przelotne opady deszczu', genitive: 'przelotnych opadów deszczu' },
            'burza': { nominative: 'burza', genitive: 'burzy' },
            'burza z lekkimi opadami deszczu': { nominative: 'burza z lekkim deszczem', genitive: 'burzy z lekkim deszczem' },
            'burza z deszczem': { nominative: 'burza z deszczem', genitive: 'burzy z deszczem' },
            'burza z ulewnym deszczem': { nominative: 'burza z ulewnym deszczem', genitive: 'burzy z ulewnym deszczem' },
            'zamglenie': { nominative: 'zamglenie', genitive: 'zamglenia' },
            'zadymienie': { nominative: 'zadymienie', genitive: 'zadymienia' },
            'mgiełka': { nominative: 'mgiełka', genitive: 'mgiełki' },
            'wiry piaskowe/pyłowe': { nominative: 'wiry piaskowe/pyłowe', genitive: 'wirów piaskowych/pyłowych' },
            'mgła': { nominative: 'mgła', genitive: 'mgły' },
            'piasek': { nominative: 'piasek', genitive: 'piasku' },
            'pył': { nominative: 'pył', genitive: 'pyłu' },
            'pył wulkaniczny': { nominative: 'pył wulkaniczny', genitive: 'pyłu wulkanicznego' },
            'nawałnice': { nominative: 'nawałnice', genitive: 'nawałnic' },
            'tornado': { nominative: 'tornado', genitive: 'tornada' }
        }
    },
    en: {
        // --- English translations... ---
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
        overview: {
            'expect': 'Expect',
            'throughout the day': 'throughout the day',
            'clear sky': { nominative: 'clear sky', genitive: 'clear sky' },
            'few clouds': { nominative: 'few clouds', genitive: 'few clouds' },
            'scattered clouds': { nominative: 'scattered clouds', genitive: 'scattered clouds' },
            'broken clouds': { nominative: 'broken clouds', genitive: 'broken clouds' },
            'overcast clouds': { nominative: 'overcast clouds', genitive: 'overcast clouds' },
            'light rain': { nominative: 'light rain', genitive: 'light rain' },
            'moderate rain': { nominative: 'moderate rain', genitive: 'moderate rain' },
            'heavy intensity rain': { nominative: 'heavy intensity rain', genitive: 'heavy intensity rain' },
            'very heavy rain': { nominative: 'very heavy rain', genitive: 'very heavy rain' },
            'extreme rain': { nominative: 'extreme rain', genitive: 'extreme rain' },
            'freezing rain': { nominative: 'freezing rain', genitive: 'freezing rain' },
            'light snow': { nominative: 'light snow', genitive: 'light snow' },
            'snow': { nominative: 'snow', genitive: 'snow' },
            'heavy snow': { nominative: 'heavy snow', genitive: 'heavy snow' },
            'sleet': { nominative: 'sleet', genitive: 'sleet' },
            'shower rain': { nominative: 'shower rain', genitive: 'shower rain' },
            'thunderstorm': { nominative: 'thunderstorm', genitive: 'a thunderstorm' },
            'thunderstorm with light rain': { nominative: 'thunderstorm with light rain', genitive: 'a thunderstorm with light rain' },
            'thunderstorm with rain': { nominative: 'thunderstorm with rain', genitive: 'a thunderstorm with rain' },
            'thunderstorm with heavy rain': { nominative: 'thunderstorm with heavy rain', genitive: 'a thunderstorm with heavy rain' },
            'mist': { nominative: 'mist', genitive: 'mist' },
            'smoke': { nominative: 'smoke', genitive: 'smoke' },
            'haze': { nominative: 'haze', genitive: 'haze' },
            'sand/ dust whirls': { nominative: 'sand/dust whirls', genitive: 'sand/dust whirls' },
            'fog': { nominative: 'fog', genitive: 'fog' },
            'sand': { nominative: 'sand', genitive: 'sand' },
            'dust': { nominative: 'dust', genitive: 'dust' },
            'volcanic ash': { nominative: 'volcanic ash', genitive: 'volcanic ash' },
            'squalls': { nominative: 'squalls', genitive: 'squalls' },
            'tornado': { nominative: 'a tornado', genitive: 'a tornado' }
        }
    }
};

