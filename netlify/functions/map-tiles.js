// --- PL ---
// Funkcja bezserwerowa działająca jako bezpieczne proxy dla kafelków mapy opadów z OpenWeatherMap.
// Przechwytuje zapytania od klienta, dodaje sekretny klucz API po stronie serwera i przekazuje
// zapytanie dalej, ukrywając klucz przed przeglądarką użytkownika.
// --- EN ---
// A serverless function that acts as a secure proxy for OpenWeatherMap precipitation map tiles.
// It intercepts requests from the client, adds the secret API key on the server side, and forwards
// the request, thus hiding the key from the user's browser.

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

exports.handler = async function (event, context) {
    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: 'Klucz API nie jest skonfigurowany po stronie serwera. / API key is not configured on the server side.',
        };
    }

    // --- PL ---
    // Ścieżka zapytania będzie wyglądać np. tak: `/.netlify/functions/map-tiles/10/535/334`
    // Musimy wyodrębnić z niej poszczególne części (z, x, y).
    // --- EN ---
    // The request path will look like: `/.netlify/functions/map-tiles/10/535/334`
    // We need to extract the individual parts (z, x, y).
    const pathParts = event.path.split("/").filter(Boolean);
    if (pathParts.length < 4) {
        return { statusCode: 400, body: "Nieprawidłowa ścieżka zapytania. / Invalid request path." };
    }
    const [z, x, y] = pathParts.slice(-3);
    
    const tileUrl = `https://tile.openweathermap.org/map/precipitation_new/${z}/${x}/${y}.png?appid=${apiKey}`;

    try {
        const response = await fetch(tileUrl);

        if (!response.ok) {
            return { statusCode: response.status, body: response.statusText };
        }

        // --- PL ---
        // Pobieramy obrazek jako bufor (dane binarne), a następnie konwertujemy go do formatu Base64.
        // Jest to wymagane przez Netlify Functions do zwracania odpowiedzi innych niż tekstowe.
        // --- EN ---
        // We fetch the image as a buffer (binary data) and then convert it to a Base64 string.
        // This is required by Netlify Functions for returning non-textual responses.
        const imageBuffer = await response.buffer();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'image/png',
            },
            body: imageBuffer.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Błąd podczas pobierania kafelka mapy. / Error fetching map tile.' }),
        };
    }
};
