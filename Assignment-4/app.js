/* ═══════════════════════════════════════════════════════════════
   WeatherView — app.js
   API: Open-Meteo (no key) + Open-Meteo Geocoding
   Charts: Chart.js
   ═══════════════════════════════════════════════════════════════ */

// ── Chart.js global defaults ──────────────────────────────────────────────────
Chart.defaults.color         = "#64748b";
Chart.defaults.borderColor   = "#1e304d";
Chart.defaults.font.family   = "'Segoe UI', system-ui, Arial, sans-serif";

// ── WMO weather code → { label, emoji } ──────────────────────────────────────
const WMO = {
  0:  { label: "Clear Sky",           emoji: "☀️"  },
  1:  { label: "Mainly Clear",        emoji: "🌤️"  },
  2:  { label: "Partly Cloudy",       emoji: "⛅"  },
  3:  { label: "Overcast",            emoji: "☁️"  },
  45: { label: "Foggy",               emoji: "🌫️"  },
  48: { label: "Icy Fog",             emoji: "🌫️"  },
  51: { label: "Light Drizzle",       emoji: "🌦️"  },
  53: { label: "Moderate Drizzle",    emoji: "🌦️"  },
  55: { label: "Heavy Drizzle",       emoji: "🌧️"  },
  61: { label: "Slight Rain",         emoji: "🌧️"  },
  63: { label: "Moderate Rain",       emoji: "🌧️"  },
  65: { label: "Heavy Rain",          emoji: "🌧️"  },
  71: { label: "Slight Snow",         emoji: "🌨️"  },
  73: { label: "Moderate Snow",       emoji: "❄️"  },
  75: { label: "Heavy Snow",          emoji: "❄️"  },
  77: { label: "Snow Grains",         emoji: "🌨️"  },
  80: { label: "Slight Showers",      emoji: "🌦️"  },
  81: { label: "Moderate Showers",    emoji: "🌧️"  },
  82: { label: "Violent Showers",     emoji: "⛈️"  },
  85: { label: "Slight Snow Shower",  emoji: "🌨️"  },
  86: { label: "Heavy Snow Shower",   emoji: "❄️"  },
  95: { label: "Thunderstorm",        emoji: "⛈️"  },
  96: { label: "Thunderstorm + Hail", emoji: "⛈️"  },
  99: { label: "Heavy Thunderstorm",  emoji: "🌩️"  },
};

function wmo(code) {
  return WMO[code] || { label: "Unknown", emoji: "🌡️" };
}

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const cityInput    = $("cityInput");
const searchBtn    = $("searchBtn");
const refreshBtn   = $("refreshBtn");
const loadingEl    = $("loading");
const errorEl      = $("errorState");
const errorMsg     = $("errorMsg");
const dashboardEl  = $("dashboard");
const lastUpdated  = $("lastUpdated");
const quickCities  = $("quickCities");

// ── State ─────────────────────────────────────────────────────────────────────
let currentCoords = null;   // { lat, lon, name, country }
let charts        = {};     // Chart.js instances keyed by name
let tempMode      = "temp"; // "temp" | "feels"

// ── Geocoding — Open-Meteo Geocoding API ──────────────────────────────────────
async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed.");
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error(`City "${city}" not found.`);
  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country, admin: r.admin1 || "" };
}

// ── Weather — Open-Meteo Forecast API ────────────────────────────────────────
async function fetchWeather({ lat, lon }) {
  const params = [
    "hourly=temperature_2m,apparent_temperature,precipitation,windspeed_10m,relative_humidity_2m,visibility",
    "daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max,windgusts_10m_max",
    "current_weather=true",
    "forecast_days=7",
    "timezone=auto",
  ].join("&");

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&${params}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed.");
  return res.json();
}

// ── Main load flow ────────────────────────────────────────────────────────────
async function loadCity(city) {
  showLoading();
  try {
    const coords = await geocode(city);
    currentCoords = coords;
    const data = await fetchWeather(coords);
    renderDashboard(coords, data);
    cityInput.value = "";
  } catch (err) {
    showError(err.message);
  }
}

async function reload() {
  if (!currentCoords) return;
  showLoading();
  try {
    const data = await fetchWeather(currentCoords);
    renderDashboard(currentCoords, data);
  } catch (err) {
    showError(err.message);
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderDashboard(coords, data) {
  const cw    = data.current_weather;
  const hrly  = data.hourly;
  const daily = data.daily;

  // Find the current hour index
  const now     = new Date();
  const curHour = now.getHours();

  // Slice 24 hours starting from current hour
  const hSlice  = (arr) => arr.slice(curHour, curHour + 24);
  const hLabels = hSlice(hrly.time).map(t => {
    const h = new Date(t).getHours();
    return h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
  });

  // ── City header ──────────────────────────────────────────────────────────────
  $("cityName").textContent  = coords.name;
  $("citySub").textContent   = [coords.admin, coords.country].filter(Boolean).join(", ");
  const curW                 = wmo(cw.weathercode);
  $("currentEmoji").textContent = curW.emoji;
  $("currentTemp").textContent  = `${Math.round(cw.temperature)}°C`;
  $("currentDesc").textContent  = curW.label;

  // ── Stat cards ───────────────────────────────────────────────────────────────
  const feels     = hrly.apparent_temperature[curHour];
  const humidity  = hrly.relative_humidity_2m[curHour];
  const wind      = cw.windspeed;
  const precip    = hrly.precipitation[curHour];
  const vis       = hrly.visibility[curHour];
  const uv        = daily.weathercode[0]; // using max day code as proxy

  $("statFeels").textContent    = `${Math.round(feels)}°C`;
  $("statHumidity").textContent = `${humidity}%`;
  $("statWind").textContent     = `${Math.round(wind)} km/h`;
  $("statPrecip").textContent   = `${precip} mm`;
  $("statUV").textContent       = daily.weathercode[0] <= 2 ? "Low" : daily.weathercode[0] <= 61 ? "Moderate" : "High";
  $("statVis").textContent      = vis >= 1000 ? `${(vis / 1000).toFixed(1)} km` : `${vis} m`;

  // ── Charts ───────────────────────────────────────────────────────────────────
  const tempData   = hSlice(hrly.temperature_2m);
  const feelsData  = hSlice(hrly.apparent_temperature);
  const precipData = hSlice(hrly.precipitation);
  const windData   = hSlice(hrly.windspeed_10m);

  drawTempChart(hLabels, tempData, feelsData);
  drawPrecipChart(hLabels, precipData);
  drawForecastChart(daily);
  drawWindChart(cw.windspeed, daily.windgusts_10m_max[0]);
  renderForecastCards(daily);

  // timestamp
  lastUpdated.textContent = `Updated ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  showDashboard();
}

// ── Chart: 24h Temperature line ───────────────────────────────────────────────
function drawTempChart(labels, temp, feels) {
  destroyChart("temp");
  const ctx = $("tempChart").getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0,   "rgba(59,130,246,.35)");
  grad.addColorStop(1,   "rgba(59,130,246,0)");

  charts.temp = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Temperature (°C)",
          data: temp,
          borderColor: "#3b82f6",
          backgroundColor: grad,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.4,
          fill: true,
        },
        {
          label: "Feels Like (°C)",
          data: feels,
          borderColor: "#f59e0b",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          fill: false,
          hidden: tempMode === "temp",
        },
      ],
    },
    options: commonLineOpts("°C"),
  });
}

// ── Chart: Hourly Precipitation bars ─────────────────────────────────────────
function drawPrecipChart(labels, precip) {
  destroyChart("precip");
  const ctx = $("precipChart").getContext("2d");
  charts.precip = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Precipitation (mm)",
        data: precip,
        backgroundColor: "rgba(96,165,250,.7)",
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      ...commonBarOpts("mm"),
      plugins: {
        ...commonBarOpts("mm").plugins,
        legend: { display: false },
      },
    },
  });
}

// ── Chart: 7-Day forecast bar ─────────────────────────────────────────────────
function drawForecastChart(daily) {
  destroyChart("forecast");
  const ctx    = $("forecastChart").getContext("2d");
  const labels = daily.time.map(t => {
    const d = new Date(t);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  });

  charts.forecast = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "High (°C)",
          data: daily.temperature_2m_max,
          backgroundColor: "rgba(239,68,68,.75)",
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: "Low (°C)",
          data: daily.temperature_2m_min,
          backgroundColor: "rgba(59,130,246,.65)",
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      ...commonBarOpts("°C"),
      plugins: {
        legend: {
          display: true,
          labels: { color: "#64748b", boxWidth: 12, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}°C`,
          },
        },
      },
    },
  });
}

// ── Chart: Wind doughnut ──────────────────────────────────────────────────────
function drawWindChart(wind, gusts) {
  destroyChart("wind");
  const ctx = $("windChart").getContext("2d");
  charts.wind = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Wind Speed", "Gusts", "Calm"],
      datasets: [{
        data: [
          Math.round(wind),
          Math.max(0, Math.round(gusts - wind)),
          Math.max(0, 120 - Math.round(gusts)),
        ],
        backgroundColor: ["#3b82f6", "#f59e0b", "#1e304d"],
        borderColor: "#121c2e",
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#64748b", padding: 14, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} km/h`,
          },
        },
      },
    },
  });
}

// ── 7-Day forecast cards ──────────────────────────────────────────────────────
function renderForecastCards(daily) {
  const row = $("forecastRow");
  row.innerHTML = "";
  daily.time.forEach((t, i) => {
    const d     = new Date(t);
    const day   = d.toLocaleDateString("en-US", { weekday: "short" });
    const info  = wmo(daily.weathercode[i]);
    const hi    = Math.round(daily.temperature_2m_max[i]);
    const lo    = Math.round(daily.temperature_2m_min[i]);
    const rain  = daily.precipitation_sum[i];

    const card  = document.createElement("div");
    card.className = "forecast-day";
    card.innerHTML = `
      <span class="fc-day">${i === 0 ? "Today" : day}</span>
      <span class="fc-emoji">${info.emoji}</span>
      <span class="fc-hi">${hi}°</span>
      <span class="fc-lo">${lo}°</span>
      ${rain > 0 ? `<span class="fc-rain">&#9748; ${rain}mm</span>` : ""}
    `;
    row.appendChild(card);
  });
}

// ── Chart.js shared options ───────────────────────────────────────────────────
function commonLineOpts(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: { grid: { color: "#1e304d" }, ticks: { maxTicksLimit: 8 } },
      y: {
        grid: { color: "#1e304d" },
        ticks: { callback: v => `${v}${unit}` },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a2640",
        borderColor: "#1e304d",
        borderWidth: 1,
        padding: 10,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}${unit}` },
      },
    },
  };
}

function commonBarOpts(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: { grid: { color: "#1e304d" }, ticks: { maxTicksLimit: 8 } },
      y: {
        grid: { color: "#1e304d" },
        beginAtZero: true,
        ticks: { callback: v => `${v}${unit}` },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a2640",
        borderColor: "#1e304d",
        borderWidth: 1,
        padding: 10,
      },
    },
  };
}

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

// ── UI State helpers ──────────────────────────────────────────────────────────
function showLoading() {
  loadingEl.classList.remove("hidden");
  errorEl.classList.add("hidden");
  dashboardEl.classList.add("hidden");
}
function showError(msg) {
  loadingEl.classList.add("hidden");
  errorEl.classList.remove("hidden");
  dashboardEl.classList.add("hidden");
  errorMsg.textContent = msg;
}
function showDashboard() {
  loadingEl.classList.add("hidden");
  errorEl.classList.add("hidden");
  dashboardEl.classList.remove("hidden");
}

// ── Temp chart toggle ─────────────────────────────────────────────────────────
document.getElementById("tempToggle").addEventListener("click", e => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  document.querySelectorAll("#tempToggle .toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  tempMode = btn.dataset.key;
  if (charts.temp) {
    // show/hide the "Feels Like" dataset
    charts.temp.data.datasets[1].hidden = tempMode === "temp";
    charts.temp.update();
  }
});

// ── Search ────────────────────────────────────────────────────────────────────
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) {
    setActiveQuickCity(null);
    loadCity(city);
  }
});
cityInput.addEventListener("keydown", e => {
  if (e.key === "Enter") searchBtn.click();
});

// ── Quick city pills ──────────────────────────────────────────────────────────
quickCities.addEventListener("click", e => {
  const pill = e.target.closest(".city-pill");
  if (!pill) return;
  setActiveQuickCity(pill);
  loadCity(pill.dataset.city);
});
function setActiveQuickCity(activePill) {
  document.querySelectorAll(".city-pill").forEach(p => p.classList.remove("active"));
  if (activePill) activePill.classList.add("active");
}

// ── Refresh ───────────────────────────────────────────────────────────────────
refreshBtn.addEventListener("click", reload);

// ── Init: load default city ───────────────────────────────────────────────────
loadCity("Pune");
