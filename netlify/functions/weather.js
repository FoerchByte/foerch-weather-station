// Importujemy 'node-fetch' dynamicznie, aby zapewnić kompatybilność
// Import 'node-fetch' dynamically for compatibility
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// --- Koncept licznika zapytań / API Call Counter Concept ---
// W przyszłości można to podłączyć do bazy danych (np. Redis, FaunaDB)
// In the future, this can be connected to a database (e.g., Redis, FaunaDB)
const API_CALL_LIMIT = 1000;
let apiCallCount = 0; // W prostym przykładzie, resetuje się przy każdym wdrożeniu / In a simple example, resets on each deployment

async function checkApiLimit() {
    // W rzeczywistej implementacji, tutaj byłoby zapytanie do bazy danych
    // In a real implementation, a database query would be here
    return apiCallCount < API_CALL_LIMIT;
}

async function incrementApiCount() {
    // Tutaj byłoby zaktualizowanie wartości w bazie danych
    // Here, the value in the database would be updated
    apiCallCount++;
}

// --- Główna funkcja serwerless / Main Serverless Function ---
exports.handler = async function (event, context) {
    // 1. Sprawdzenie klucza API / Check for API Key
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Klucz API nie jest skonfigurowany.' }) };
    }

    // 2. Sprawdzenie limitu zapytań / Check API Call Limit
    const withinLimit = await checkApiLimit();
    if (!withinLimit) {
        return { statusCode: 429, body: JSON.stringify({ message: 'Przekroczono dzienny limit zapytań.' }) };
    }

    // 3. Pobranie parametrów / Get Parameters
    const { city, lat: latParam, lon: lonParam } = event.queryStringParameters;
    let lat, lon, locationName, locationCountry;

    try {
        // 4. Geokodowanie (jeśli podano miasto) / Geocoding (if city is provided)
        if (city) {
            // ZMIANA: Dodajemy kod kraju 'PL' do zapytania, aby zwiększyć precyzję geokodowania dla polskich miast.
            // CHANGE: We add the country code 'PL' to the query to increase geocoding precision for Polish cities.
            const geoQuery = `${city.trim()},PL`;
            const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(geoQuery)}&limit=1&appid=${apiKey}`;
            const geoResponse = await fetch(geoUrl);
            if (!geoResponse.ok) throw new Error(`Błąd geokodowania: ${geoResponse.statusText}`);
            
            const geoData = await geoResponse.json();
            if (!geoData || geoData.length === 0) throw new Error(`Nie znaleziono miasta: ${city}`);
            
            lat = geoData[0].lat;
            lon = geoData[0].lon;
            locationName = geoData[0].local_names?.pl || geoData[0].name;
            locationCountry = geoData[0].country;

        } else if (latParam && lonParam) {
            lat = latParam;
            lon = lonParam;
            // Geokodowanie odwrotne / Reverse Geocoding
            const reverseGeoUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
            const reverseGeoResponse = await fetch(reverseGeoUrl);
            if (!reverseGeoResponse.ok) throw new Error(`Błąd geokodowania odwrotnego: ${reverseGeoResponse.statusText}`);
            
            const reverseGeoData = await reverseGeoResponse.json();
            if (reverseGeoData && reverseGeoData.length > 0) {
                locationName = reverseGeoData[0].local_names?.pl || reverseGeoData[0].name;
                locationCountry = reverseGeoData[0].country;
            } else {
                 throw new Error('Nie udało się ustalić nazwy dla podanych współrzędnych.');
            }
        } else {
            return { statusCode: 400, body: JSON.stringify({ message: 'Brak miasta lub współrzędnych.' }) };
        }

        // 5. Równoległe zapytania o pogodę i jakość powietrza / Parallel requests for weather and air quality
        const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely&appid=${apiKey}&units=metric&lang=pl`;
        const airPollutionUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

        const [oneCallResponse, airPollutionResponse] = await Promise.all([
            fetch(oneCallUrl),
            fetch(airPollutionUrl)
        ]);

        if (!oneCallResponse.ok) throw new Error(`Błąd pobierania danych pogodowych: ${oneCallResponse.statusText}`);
        if (!airPollutionResponse.ok) throw new Error(`Błąd pobierania danych o jakości powietrza: ${airPollutionResponse.statusText}`);

        const oneCallData = await oneCallResponse.json();
        const airPollutionData = await airPollutionResponse.json();

        // 6. Inkrementacja licznika (tylko przy sukcesie) / Increment counter (only on success)
        await incrementApiCount();

        // 7. Zbudowanie i zwrócenie finalnej odpowiedzi / Build and return the final response
        const responsePayload = {
            location: { name: locationName, country: locationCountry, lat, lon },
            current: oneCallData.current,
            hourly: oneCallData.hourly,
            daily: oneCallData.daily,
            alerts: oneCallData.alerts,
            air_quality: airPollutionData.list[0]
        };

        return {
            statusCode: 200,
            body: JSON.stringify(responsePayload),
        };

    } catch (error) {
        // Centralna obsługa błędów / Centralized error handling
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message || 'Wystąpił wewnętrzny błąd serwera.' }),
        };
    }
};
