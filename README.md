Stacja Pogody v2.1 / Weather Station v2.1 ☀️🌍

🇵🇱 [Wersja po polsku](#polski) | 🇺🇸 [English version](#english)

<a name="english"></a>

🇺🇸 English Version

About The Project

Weather Station v2.1 is a fully responsive, standalone web application built with pure Vanilla JavaScript, HTML5, and modern CSS3.

This project represents a major evolution from its predecessors, introducing a complete UI overhaul based on the "Glassmorphism" design trend. It goes beyond simple data display by providing a rich, interactive user experience complete with real-time data, visualizations, and full internationalization.

The application leverages Serverless Functions (Netlify Functions) to act as a secure proxy for the OpenWeatherMap API, ensuring API keys never leak to the client-side while delivering comprehensive weather data (current, minutely, hourly, daily, and alerts).

What's New in v2.1?

🌐 Full Internationalization (i18n): Seamless, instant language switching between English (EN) and Polish (PL), persisting user preference.

🗺️ Interactive Weather Radar: A dynamic precipitation map powered by Leaflet.js and OpenWeatherMap tile layers.

⚠️ Localized Alerts: Weather warnings are now properly formatted and translated to the selected language.

Core Features

🔒 Secure Architecture: 100% server-side API key protection using Netlify Functions (proxy pattern).

🎨 Modern "Glassmorphism" UI: A clean, translucent aesthetic with dynamic background gradients and blurred elements.

📱 Advanced Responsiveness: A mobile-first approach with pixel-perfect adaptations for various viewports (including specific optimizations for mobile landscape mode).

🔎 Flexible Search & Geolocation: Support for city-name search and automatic browser-based geolocation.

⭐ Favorites Manager: Save up to 5 favorite cities to localStorage for quick access.

📊 Complete Forecasts:

Real-time current conditions.

Minutely precipitation chart (Chart.js).

Hourly forecast slider (switchable 24h/48h range).

7-Day Daily forecast grid.

🌓 Dark/Light Theme: User-toggled visual theme persisted in local storage.

🚗 Unique Indicators: Custom-calculated metrics like "Road Conditions" (Dry/Wet/Icy) based on multiple weather parameters.

Modular Architecture (Separation of Concerns)

The codebase follows strict engineering principles without relying on frameworks:

main.js (Orchestrator): The central brain managing application state, event listeners, and module coordination.

ui.js (View Layer): Handles all DOM manipulations, rendering logic, and UI state updates. Zero business logic.

api.js (Network Layer): Encapsulates all fetch requests to the serverless backend.

translations.js (i18n Layer): A dedicated dictionary containing all static and dynamic text strings for supported languages.

Technology Stack

Frontend: HTML5, CSS3 (CSS Variables, Flexbox, Grid, Glassmorphism effects), Vanilla ES6+ JavaScript.

Libraries:

Leaflet.js: For rendering the interactive precipitation map.

Chart.js: For visualizing minutely precipitation data.

Backend (Serverless): Netlify Functions (Node.js environment).

External API: OpenWeatherMap (One Call API 3.0, Maps 2.0, Geocoding, Air Pollution).

Deployment and Setup

This project is optimized for deployment on Netlify to utilize its serverless function capabilities.

Clone this repository to your GitHub account.

Create a new site on Netlify from your Git repository.

Configure Environment Variables in Netlify (Site Settings > Build & deploy > Environment):

Key: WEATHER_API_KEY

Value: Your_OpenWeatherMap_API_Key

Deploy: Netlify will automatically build and deploy the site along with the functions.



<a name="polski"></a>

🇵🇱 Wersja Polska

O Projekcie

Stacja Pogody v2.1 to w pełni responsywna, samodzielna aplikacja webowa zbudowana w czystym Vanilla JavaScript, HTML5 i nowoczesnym CSS3.

Ten projekt stanowi znaczącą ewolucję względem poprzednich wersji, wprowadzając całkowicie nowy interfejs użytkownika oparty o styl "Glassmorphism". Aplikacja wykracza poza proste wyświetlanie danych, oferując bogate, interaktywne doświadczenie użytkownika, kompletne dane w czasie rzeczywistym, wizualizacje oraz pełną internacjonalizację.

Wykorzystuje ona Funkcje Serverless (Netlify Functions) jako bezpieczne proxy do API OpenWeatherMap. Gwarantuje to, że klucze API nigdy nie wyciekną do klienta, jednocześnie dostarczając kompleksowe dane pogodowe (aktualne, minutowe, godzinowe, dzienne oraz alerty).

Co nowego w wersji v2.1?

🌐 Pełna Internacjonalizacja (i18n): Płynne, natychmiastowe przełączanie języka między polskim (PL) i angielskim (EN) z zapamiętywaniem preferencji użytkownika.

🗺️ Interaktywny Radar Pogodowy: Dynamiczna mapa opadów zasilana przez Leaflet.js i warstwy kafelków OpenWeatherMap.Wido⚠️ k): Odpowiada za wszelkie manipulacje DOM i renderowanie.

api.js (Sieć): Hermetyzuje logikę komunikacji z API.

translations.js (i18n): Zawiera wszystkie teksty statyczne i dynamiczne dla PL/EN.

Stos Technologiczny

Frontend: HTML5, CSS3 (Zmienne, Flexbox, Grid), Vanilla JS (ES6+ Modules)

Biblioteki: Leaflet.js (Mapa), Chart.js (Wykres opadów)

Backend: Netlify Functions (Node.js)

API: OpenWeatherMap (One Call 3.0, Maps, Geocoding, Air Pollution)


#### Skontaktuj się ze mną / Connect with me
- **Email:** [Napisz do mnie e-maila](mailto:michal.herbich@gmail.com)
- **LinkedIn:** [Mój profil na LinkedIn](www.linkedin.com/in/michal-herbich-dev)
- **Portfolio:** [Zobacz moje Portfolio](https://foerch-dev-folio.netlify.app)
- **GitHub:** [Mój profil na GitHub](https://github.com/FoerchByte)
