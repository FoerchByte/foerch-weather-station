// Ten plik jest przykładem koncepcyjnym.
// This file is a conceptual example.
// Do działania wymaga skonfigurowania i podłączenia klienta bazy danych (np. Upstash, FaunaDB).
// It requires configuring and connecting a database client (e.g., Upstash, FaunaDB) to work.

// const { db } = require('./database-client'); // Przykładowy import klienta bazy danych

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Funkcja do pobrania dzisiejszej daty w formacie YYYY-MM-DD
// Function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

exports.handler = async function (event) {
    const apiKey = process.env.WEATHER_API_KEY;
    const DAILY_LIMIT = 1000;
    const today = getTodayDate();
    const counterKey = `api_calls_${today}`;

    // --- KROK 1: Sprawdzenie limitu API ---
    // --- STEP 1: Check API limit ---
    try {
        // const currentCount = await db.get(counterKey) || 0; // Pobranie aktualnej liczby zapytań
        const currentCount = 0; // Symulacja - zakładamy, że limit nie jest przekroczony

        if (currentCount >= DAILY_LIMIT) {
            return {
                statusCode: 429, // Too Many Requests
                body: JSON.stringify({ message: 'Przekroczono dzienny limit zapytań.' }),
            };
        }
        
        // Zwiększenie licznika - ta operacja powinna być atomowa w prawdziwej bazie danych
        // Increment counter - this operation should be atomic in a real database
        // await db.set(counterKey, currentCount + 1, { expiresIn: 86400 }); // Ustawienie licznika z czasem życia 24h

    } catch (dbError) {
        console.error("Błąd połączenia z bazą danych do sprawdzania limitu:", dbError);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Błąd wewnętrzny serwera podczas sprawdzania limitu API.' }),
        };
    }

    // --- KROK 2: Wykonanie zapytania do OpenWeatherMap ---
    // --- STEP 2: Execute the request to OpenWeatherMap ---
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Klucz API nie jest skonfigurowany.' }),
        };
    }

    const { city, lat, lon } = event.queryStringParameters;
    let latitude = lat;
    let longitude = lon;
    let locationName = '';

    try {
        if (city) {
            // Geokodowanie: nazwa miasta -> współrzędne
            // Geocoding: city name -> coordinates
            const geocodingUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;
            const geoResponse = await fetch(geocodingUrl);
            const geoData = await geoResponse.json();
            
            if (!geoResponse.ok || geoData.length === 0) {
                throw new Error('Nie znaleziono miasta.');
            }
            latitude = geoData[0].lat;
            longitude = geoData[0].lon;
            locationName = `${geoData[0].name}, ${geoData[0].country}`;
        } else if (lat && lon) {
            // NOWA LOGIKA: Geokodowanie odwrotne dla wyszukiwania po lokalizacji
            // NEW LOGIC: Reverse Geocoding for location-based search
            const reverseGeocodingUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
            const reverseGeoResponse = await fetch(reverseGeocodingUrl);
            const reverseGeoData = await reverseGeoResponse.json();
            if (reverseGeoResponse.ok && reverseGeoData.length > 0) {
                locationName = `${reverseGeoData[0].name}, ${reverseGeoData[0].country}`;
            }
        }

        if (!latitude || !longitude) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Brak współrzędnych do wyszukania pogody.' }) };
        }
        
        const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely&appid=${apiKey}&units=metric&lang=pl`;
        const airPollutionUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;

        const [oneCallResponse, airPollutionResponse] = await Promise.all([
            fetch(oneCallUrl),
            fetch(airPollutionUrl)
        ]);

        if (!oneCallResponse.ok) throw new Error('Błąd pobierania danych pogodowych.');
        if (!airPollutionResponse.ok) throw new Error('Błąd pobierania danych o jakości powietrza.');

        const oneCallData = await oneCallResponse.json();
        const airPollutionData = await airPollutionResponse.json();

        // Lepsza logika zastępcza: Jeśli nie udało się znaleźć nazwy, użyj nazwy miasta ze strefy czasowej
        // Better fallback logic: If a name couldn't be found, use the city name from the timezone
        if (!locationName && oneCallData.timezone) {
            locationName = oneCallData.timezone.replace(/_/g, ' ').split('/').pop() || 'Twoja lokalizacja';
        }
        
        const combinedData = {
            ...oneCallData,
            airQuality: airPollutionData.list[0],
            locationName: locationName,
        };

        return {
            statusCode: 200,
            body: JSON.stringify(combinedData),
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message || 'Wystąpił wewnętrzny błąd funkcji bezserwerowej.' }),
        };
    }
};

