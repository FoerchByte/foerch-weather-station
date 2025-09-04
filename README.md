About The Project

Weather Station is a fully responsive, standalone web application built with Vanilla JavaScript, HTML5, and CSS3. The application uses a serverless function (Netlify Function) to securely query the OpenWeatherMap API to provide real-time weather information, an hourly forecast, and a 5-day forecast.

This project demonstrates skills in integrating with external APIs, handling geolocation, building a modern user interface, and securing API keys on the server-side.

Portfolio Context
This application was originally created as a module for my main flagship project - Foerch-dev-folio, which is an advanced Single Page Application (SPA). Separating it as a mini-project is intended to make the code easier to review and to showcase specific skills in a more focused format.

Features
Secure API Requests: The API key is protected on the server-side using a serverless function.

City Search: Fetch weather data for any city in the world.

Geolocation: Automatically detect the user's location.

Current Conditions: Display temperature, description, icon, wind speed, pressure, and sunrise/sunset times.

Hourly and 5-Day Forecasts: Detailed weather predictions.

Road Condition: A unique feature that estimates road conditions (dry, wet, icy).

Fully Responsive: An intelligent interface that adapts to the screen size and orientation.

Light/Dark Theme: A toggle to switch between color themes.

Technologies
Frontend:

HTML5

CSS3 (Variables, Flexbox, Grid, Media Queries)

Vanilla JavaScript (ES6+, Async/Await, Fetch API, Geolocation API)

Backend (Serverless):

Netlify Functions (Node.js)

API:

OpenWeatherMap API

Deployment and Setup
This application is designed to be deployed on Netlify to take full advantage of serverless functions.

Clone this repository and create your own on GitHub.

Get an API key from OpenWeatherMap.

Deploy to Netlify by connecting your GitHub repository to your Netlify account.

Set the environment variable:

In your project settings on Netlify, go to: Site configuration > Build & deploy > Environment.

Add a new variable named WEATHER_API_KEY and paste your API key there.

Done! After re-deploying, your application will be live.
