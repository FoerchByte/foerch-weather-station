// Importujemy 'node-fetch' dynamicznie, aby zapewnić kompatybilność
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async function (event, context) {
    const apiKey = process.env.WEATHER_API_KEY;
    
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Klucz API nie jest skonfigurowany.' }) };
    }

    const { city, lat, lon, lang, endpoint } = event.queryStringParameters;
    
    let apiUrl;
    const base = 'https://api.openweathermap.org/data/2.5/';

    // Dynamiczne budowanie URL na podstawie 'endpoint'
    switch(endpoint) {
        case 'air_pollution':
            apiUrl = `${base}air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
            break;
        case 'uvi':
             apiUrl = `${base}uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`;
            break;
        default: // Domyślnie pobieramy prognozę
            if (city) {
                apiUrl = `${base}forecast?q=${city}&appid=${apiKey}&units=metric&lang=${lang || 'pl'}`;
            } else if (lat && lon) {
                apiUrl = `${base}forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=${lang || 'pl'}`;
            } else {
                return { statusCode: 400, body: JSON.stringify({ message: 'Brak miasta lub współrzędnych.' }) };
            }
    }

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
             return { statusCode: response.status, body: JSON.stringify(data) };
        }

        return { statusCode: 200, body: JSON.stringify(data) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Błąd wewnętrzny funkcji bezserwerowej.' }) };
    }
};
