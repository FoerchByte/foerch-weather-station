Stacja Pogody v2.0 / Weather Station v2.0 ☀️

🇵🇱 [Wersja po polsku](#polski) | 🇺🇸 [English version](#english)

<a name="english"></a>

🇺🇸 English Version

About The Project

Weather Station v2.0 is a fully responsive, standalone web application built with Vanilla JavaScript, HTML5, and CSS3. This version introduces a major UI overhaul, migrating to a modern, clean "glassmorphism" interface.

The application uses a serverless function (Netlify Function) to securely query the OpenWeatherMap API, providing real-time weather information, precipitation radar, an hourly forecast, and a 7-day forecast.

This project demonstrates skills in:

Integrating with external APIs (REST)

Securing API keys on the server-side (Netlify Functions)

Building a modern, responsive UI with advanced CSS (Glassmorphism, Flexbox, Grid)

Writing clean, modular Vanilla JavaScript (Separation of Concerns)

Handling geolocation

Modular Architecture (Separation of Concerns)

This project was built without a framework, relying on a professional, modular architecture to keep the code clean, scalable, and maintainable:

main.js (Orchestrator): The "brain" of the application. Manages application state, binds all events, and coordinates communication between the other modules.

ui.js (UI Module): The "hands" of the application. Responsible for all DOM manipulation. It renders data, manages CSS classes, and handles the visual state (modals, loading, errors). It receives data but contains no business logic.

api.js (API Module): Encapsulates all network logic. Responsible for fetching data from the serverless functions.

translations.js (i18n Module): Isolates all UI strings, allowing for easy translation and management of text content.

Core Features

Secure API Requests: The API key is 100% protected on the server-side using Netlify Functions.

Modern "Glassmorphism" UI: A complete redesign moving away from v1.0's simple cards.

Precipitation Radar: An interactive map (Leaflet.js) showing upcoming precipitation.

City Search & Geolocation: Full support for both city name search and browser-based automatic geolocation.

Favorites Management: Ability to save (up to 5) favorite locations to localStorage.

Complete Forecasts: Current conditions, 1-hour precipitation chart (Chart.js), hourly forecast (24/48h), and a 7-day daily forecast.

Advanced Responsive UI: A pixel-perfect, mobile-first interface with custom CSS logic to handle different viewports, including special rules for portrait vs. landscape modes.

Light/Dark Theme: A user-toggled theme stored in localStorage.

Unique Indicators: The app calculates and displays derived data, like estimated Road Surface Condition (Dry, Wet, Icy).

Technology Stack

Frontend: HTML5, CSS3 (Glassmorphism, CSS Variables, Flexbox, Grid, Media Queries)

JavaScript: Vanilla JavaScript (ES6+, Modules, Async/Await, Fetch API, Geolocation API)

Libraries: Leaflet.js, Chart.js

Backend (Serverless): Netlify Functions (Node.js)

API: OpenWeatherMap (One Call API 3.0, Geocoding API, Air Pollution API)

Deployment and Setup

This application is designed to be deployed on Netlify to take full advantage of serverless functions.

Clone this repository and create your own on GitHub.

Get an API key from OpenWeatherMap.

Deploy to Netlify by connecting your GitHub repository to your Netlify account.

Set the environment variable:

In your project settings on Netlify, go to: Site configuration > Build & deploy > Environment.

Add a new variable named WEATHER_API_KEY and paste your API key there.

Done! After re-deploying, your application will be live.

<a name="polski"></a>

🇵🇱 Wersja Polska

O Projekcie

Stacja Pogody v2.0 to w pełni responsywna, samodzielna aplikacja webowa zbudowana przy użyciu Vanilla JavaScript, HTML5 i CSS3. Ta wersja wprowadza gruntowną przebudowę interfejsu użytkownika, migrując do nowoczesnego, czystego designu "glassmorphism".

Aplikacja wykorzystuje funkcje serwerless (Netlify Functions) do bezpiecznego odpytywania API OpenWeatherMap, dostarczając dane pogodowe w czasie rzeczywistym, radar opadów, prognozę godzinową i 7-dniową.

Ten projekt demonstruje umiejętności w zakresie:

Integracji z zewnętrznymi API (REST)

Zabezpieczania kluczy API po stronie serwera (Netlify Functions)

Budowania nowoczesnego, responsywnego interfejsu przy użyciu zaawansowanego CSS (Glassmorphism, Flexbox, Grid)

Pisania czystego, modularnego kodu Vanilla JavaScript (Separacja Odpowiedzialności)

Obsługi geolokalizacji

Architektura Modularna (Separation of Concerns)

Projekt ten został zbudowany bez frameworka, opierając się na profesjonalnej, modularnej architekturze, aby utrzymać kod w czystości, skalowalności i łatwości utrzymania:

main.js (Orkiestrator): "Mózg" aplikacji. Zarządza stanem, łączy wszystkie zdarzenia i koordynuje komunikację między modułami.

ui.js (Moduł UI): "Ręce" aplikacji. Odpowiedzialny wyłącznie za manipulację DOM. Renderuje dane, zarządza klasami CSS i obsługuje stan wizualny (okna modalne, ładowanie, błędy). Otrzymuje dane, ale nie zawiera logiki biznesowej.

api.js (Moduł API): Hermetyzuje całą logikę sieciową. Odpowiedzialny za pobieranie danych z funkcji serwerless.

translations.js (Moduł i18n): Izoluje wszystkie teksty interfejsu, pozwalając na łatwe tłumaczenie i zarządzanie treścią.

Kluczowe Funkcjonalności

Bezpieczne Zapytania API: Klucz API jest w 100% chroniony po stronie serwera przy użyciu Netlify Functions.

Nowoczesny Interfejs "Glassmorphism": Całkowity redesign w stosunku do prostych kart z v1.0.

Radar Opadów: Interaktywna mapa (Leaflet.js) pokazująca nadchodzące opady.

Wyszukiwanie i Geolokalizacja: Pełne wsparcie zarówno dla wyszukiwania po nazwie miasta, jak i automatycznej geolokalizacji przeglądarki.

Zarządzanie Ulubionymi: Możliwość zapisania (do 5) ulubionych lokalizacji w localStorage.

Kompletne Prognozy: Aktualne warunki, wykres opadów na 1 godzinę (Chart.js), prognoza godzinowa (z przełącznikiem 24/48h) i 7-dniowa prognoza dzienna.

Zaawansowany Interfejs Responsywny: Dopracowany co do piksela, mobilny interfejs z niestandardową logiką CSS do obsługi różnych widoków, w tym specjalnymi zasadami dla trybów portretowego i landscape.

Motyw Jasny/Ciemny: Przełącznik motywu zapisywany w localStorage.

Unikalne Wskaźniki: Aplikacja oblicza i wyświetla dane pochodne, takie jak szacowany Stan Nawierzchni (Sucha, Mokra, Oblodzona).

Stos Technologiczny

Frontend: HTML5, CSS3 (Glassmorphism, Zmienne CSS, Flexbox, Grid, Media Queries)

JavaScript: Vanilla JavaScript (ES6+, Moduły, Async/Await, Fetch API, Geolocation API)

Libraries: Leaflet.js, Chart.js

Backend (Serverless): Netlify Functions (Node.js)

API: OpenWeatherMap (One Call API 3.0, Geocoding API, Air Pollution API)

Wdrożenie i Konfiguracja

Aplikacja jest zaprojektowana do wdrożenia na Netlify, aby w pełni wykorzystać funkcje serwerless.

Sklonuj to repozytorium i stwórz własne na GitHubie.

Zdobądź klucz API z OpenWeatherMap.

Wdróż na Netlify, łącząc swoje repozytorium GitHub z kontem Netlify.

Ustaw zmienną środowiskową:

W ustawieniach projektu na Netlify przejdź do: Site configuration > Build & deploy > Environment.

Dodaj nową zmienną o nazwie WEATHER_API_KEY i wklej tam swój klucz API.

Gotowe! Po ponownym wdrożeniu aplikacja będzie działać.

#### Skontaktuj się ze mną / Connect with me
- **Email:** [Napisz do mnie e-maila](mailto:michal.herbich@gmail.com)
- **LinkedIn:** [Mój profil na LinkedIn](www.linkedin.com/in/michal-herbich-dev)
- **Portfolio:** [Zobacz moje Portfolio](https://foerch-dev-folio.netlify.app)
- **GitHub:** [Mój profil na GitHub](https://github.com/FoerchByte)
