// Importujemy 'node-fetch' dynamicznie, aby zapewnić kompatybilność
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async function (event, context) {
    const apiKey = process.env.WEATHER_API_KEY;
    
    // Sprawdzenie, czy klucz API jest skonfigurowany na serwerze
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Klucz API nie jest skonfigurowany po stronie serwera.' }),
        };
    }

    const { city, lat, lon, lang } = event.queryStringParameters;

    let apiUrl;
    if (city) {
        apiUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=${lang || 'pl'}`;
    } else if (lat && lon) {
        apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=${lang || 'pl'}`;
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Brak miasta lub współrzędnych.' }),
        };
    }

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
             return {
                statusCode: response.status,
                body: JSON.stringify(data),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Wystąpił wewnętrzny błąd funkcji bezserwerowej.' }),
        };
    }
};
