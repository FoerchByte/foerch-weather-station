/**
 * --- PL ---
 * Moduł API do komunikacji z funkcją serwerless Netlify.
 * Odpowiada za konstruowanie zapytań i pobieranie danych pogodowych.
 * Hermetyzuje logikę zapytań sieciowych.
 * --- EN ---
 * API module for communication with the Netlify serverless function.
 * Responsible for constructing requests and fetching weather data.
 * Encapsulates the network request logic.
 */

/**
 * --- PL ---
 * Pobiera dane pogodowe na podstawie zapytania (nazwa miasta lub współrzędne).
 * --- EN ---
 * Fetches weather data based on a query (city name or coordinates).
 *
 * @param {string|{latitude: number, longitude: number}} query - Nazwa miasta lub obiekt ze współrzędnymi. / The city name or an object with coordinates.
 * @returns {Promise<Object>} Obietnica, która zwraca przetworzone dane pogodowe w formacie JSON. / A promise that resolves with the processed weather data as JSON.
 * @throws {Error} Rzuca błąd w przypadku problemów z siecią lub odpowiedzią API. / Throws an error in case of network or API response issues.
 */
export async function getWeatherData(query) {
    let url;

    if (typeof query === 'string' && query) {
        url = `/.netlify/functions/weather?city=${encodeURIComponent(query.trim())}`;
    } else if (typeof query === 'object' && query.latitude) {
        url = `/.netlify/functions/weather?lat=${query.latitude}&lon=${query.longitude}`;
    } else {
        // --- PL --- Rzucamy błąd, jeśli zapytanie jest nieprawidłowe, zamiast zwracać null.
        // --- EN --- Throw an error if the query is invalid, instead of returning null.
        throw new Error("Invalid query provided to getWeatherData.");
    }

    const response = await fetch(url);
    
    if (!response.ok) {
        // --- PL --- Próbujemy odczytać treść błędu z odpowiedzi API.
        // --- EN --- Attempt to read the error message from the API response.
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || "Błąd serwera");
    }

    return response.json();
}
