// --- PL ---
// Funkcja serwerless (Netlify Function) działająca jako bezpieczne proxy do API OpenWeatherMap.
// Pobiera zapytania od klienta, dodaje klucz API po stronie serwera i wykonuje
// równoległe zapytania o dane pogodowe i jakość powietrza, a następnie łączy wyniki.
// --- EN ---
// A serverless function (Netlify Function) that acts as a secure proxy to the OpenWeatherMap API.
// It receives requests from the client, adds the API key on the server side, performs
// parallel requests for weather data and air quality, and then combines the results.

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async function (event, context) {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Klucz API nie jest skonfigurowany. / API key is not configured.' }) };
    }

    const { city, lat: latParam, lon: lonParam } = event.queryStringParameters;
    let lat, lon;

    try {
        // Krok 1: Geokodowanie, jeśli potrzebne / Step 1: Geocoding, if needed
        if (city) {
            const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city.trim())}&limit=1&appid=${apiKey}`;
            const geoResponse = await fetch(geoUrl);
            if (!geoResponse.ok) throw new Error(`Błąd geokodowania: ${geoResponse.statusText}`);
            
            const geoData = await geoResponse.json();
            if (!geoData || geoData.length === 0) throw new Error(`Nie znaleziono miasta: ${city}`);
            
            lat = geoData[0].lat;
            lon = geoData[0].lon;
            locationName = geoData[0].local_names?.pl || geoData[0].name;

        } else if (latParam && lonParam) {
            lat = latParam;
            lon = lonParam;
            const reverseGeoUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
            const reverseGeoResponse = await fetch(reverseGeoUrl);
            if (!reverseGeoResponse.ok) throw new Error(`Błąd geokodowania odwrotnego: ${reverseGeoResponse.statusText}`);
            
            const reverseGeoData = await reverseGeoResponse.json();
            locationName = (reverseGeoData && reverseGeoData.length > 0) 
                ? (reverseGeoData[0].local_names?.pl || reverseGeoData[0].name) 
                : 'Nieznana lokalizacja';
        } else {
            return { statusCode: 400, body: JSON.stringify({ message: 'Brak miasta lub współrzędnych. / Missing city or coordinates.' }) };
        }

        // Krok 2: Równoległe zapytania do API / Step 2: Parallel API Requests
        const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pl`;
        const airPollutionUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

        const [oneCallResponse, airPollutionResponse] = await Promise.all([
            fetch(oneCallUrl),
            fetch(airPollutionUrl)
        ]);

        if (!oneCallResponse.ok) throw new Error(`Błąd danych pogodowych: ${oneCallResponse.statusText}`);
        if (!airPollutionResponse.ok) throw new Error(`Błąd danych o jakości powietrza: ${airPollutionResponse.statusText}`);

        const oneCallData = await oneCallResponse.json();
        const airPollutionData = await airPollutionResponse.json();

        // Krok 3: Zbudowanie odpowiedzi / Step 3: Build the response
        const responsePayload = {
            location: { name: locationName, lat, lon },
            current: oneCallData.current,
            minutely: oneCallData.minutely,
            hourly: oneCallData.hourly,
            daily: oneCallData.daily,
            alerts: oneCallData.alerts,
            air_quality: airPollutionData.list[0],
            overview: oneCallData.daily[0].summary
        };

        return {
            statusCode: 200,
            body: JSON.stringify(responsePayload),
        };

    } catch (error) {
        console.error("Błąd funkcji serwerless / Serverless function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message || 'Wystąpił wewnętrzny błąd serwera. / An internal server error occurred.' }),
        };
    }
};
