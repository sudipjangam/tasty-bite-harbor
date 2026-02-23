import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  CloudDrizzle,
  CloudFog,
  RefreshCw,
} from "lucide-react";

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  description: string;
  weatherCode: number;
  city: string;
}

interface ForecastDay {
  date: string;
  dayName: string;
  temp_max: number;
  temp_min: number;
  weatherCode: number;
}

// WMO Weather Codes → description
const getWeatherDescription = (code: number): string => {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
};

const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="h-10 w-10 text-amber-400" />;
  if (code <= 3) return <Cloud className="h-10 w-10 text-gray-400" />;
  if (code <= 49) return <CloudFog className="h-10 w-10 text-gray-300" />;
  if (code <= 59) return <CloudDrizzle className="h-10 w-10 text-blue-400" />;
  if (code <= 69) return <CloudRain className="h-10 w-10 text-blue-500" />;
  if (code <= 79) return <CloudSnow className="h-10 w-10 text-blue-200" />;
  if (code <= 82) return <CloudRain className="h-10 w-10 text-blue-600" />;
  if (code <= 86) return <CloudSnow className="h-10 w-10 text-blue-300" />;
  if (code >= 95)
    return <CloudLightning className="h-10 w-10 text-yellow-500" />;
  return <Cloud className="h-10 w-10 text-gray-400" />;
};

const getSmallWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="h-5 w-5 text-amber-400" />;
  if (code <= 3) return <Cloud className="h-5 w-5 text-gray-400" />;
  if (code <= 49) return <CloudFog className="h-5 w-5 text-gray-300" />;
  if (code <= 59) return <CloudDrizzle className="h-5 w-5 text-blue-400" />;
  if (code <= 69) return <CloudRain className="h-5 w-5 text-blue-500" />;
  if (code <= 79) return <CloudSnow className="h-5 w-5 text-blue-200" />;
  if (code <= 82) return <CloudRain className="h-5 w-5 text-blue-600" />;
  if (code <= 86) return <CloudSnow className="h-5 w-5 text-blue-300" />;
  if (code >= 95) return <CloudLightning className="h-5 w-5 text-yellow-500" />;
  return <Cloud className="h-5 w-5 text-gray-400" />;
};

// Get coordinates: browser geolocation → IP-based fallback → Pune default
const getCoordinates = async (): Promise<{
  latitude: number;
  longitude: number;
}> => {
  // Try browser geolocation first
  try {
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation not supported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false,
        });
      },
    );
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    // Browser geolocation failed — try IP-based geolocation
  }

  // Fallback: IP-based geolocation
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const ipData = await res.json();
      if (ipData.latitude && ipData.longitude) {
        return { latitude: ipData.latitude, longitude: ipData.longitude };
      }
    }
  } catch {
    // IP geolocation also failed
  }

  // Final fallback: Pune, India
  return { latitude: 18.5204, longitude: 73.8567 };
};

// Reverse geocode to get city name
const getCityName = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`,
    );
    // Open-Meteo geocoding doesn't support reverse lookup natively,
    // so we use a simpler approach
  } catch {}
  // Use ipapi for city instead
  try {
    const res = await fetch("https://ipapi.co/city/", {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return await res.text();
  } catch {}
  return "Your Location";
};

const WeatherWidget: React.FC = () => {
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["weather-widget"],
    queryFn: async () => {
      const { latitude, longitude } = await getCoordinates();

      // Open-Meteo API — completely FREE, no API key required!
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`,
      );

      if (!res.ok) {
        throw new Error(`Weather API error: ${res.status}`);
      }

      const apiData = await res.json();
      const cityName = await getCityName(latitude, longitude);

      const current: WeatherData = {
        temp: Math.round(apiData.current.temperature_2m),
        feels_like: Math.round(apiData.current.apparent_temperature),
        humidity: apiData.current.relative_humidity_2m,
        wind_speed: Math.round(apiData.current.wind_speed_10m),
        description: getWeatherDescription(apiData.current.weather_code),
        weatherCode: apiData.current.weather_code,
        city: cityName,
      };

      // Get 3-day forecast (skip today)
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const forecast: ForecastDay[] = [];

      for (
        let i = 1;
        i < (apiData.daily?.time?.length || 0) && forecast.length < 3;
        i++
      ) {
        const date = apiData.daily.time[i];
        const dayDate = new Date(date + "T00:00:00");
        forecast.push({
          date,
          dayName: dayNames[dayDate.getDay()],
          temp_max: Math.round(apiData.daily.temperature_2m_max[i]),
          temp_min: Math.round(apiData.daily.temperature_2m_min[i]),
          weatherCode: apiData.daily.weather_code[i],
        });
      }

      return { current, forecast };
    },
    staleTime: 1000 * 60 * 30, // 30 min
    retry: 2,
    retryDelay: 1000,
  });

  const handleRetry = async () => {
    setRetrying(true);
    await queryClient.invalidateQueries({ queryKey: ["weather-widget"] });
    setTimeout(() => setRetrying(false), 2000);
  };

  if (isLoading || retrying) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] animate-pulse gap-2">
        <Cloud className="h-12 w-12 text-gray-300" />
        <p className="text-xs text-gray-400">Fetching weather...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-gray-400 text-sm gap-3">
        <Cloud className="h-8 w-8" />
        <p>Unable to load weather</p>
        <p className="text-xs text-center px-4">
          Check your internet connection
        </p>
        <button
          onClick={handleRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  const { current, forecast } = data;

  // Food truck suggestions based on weather
  const getSuggestion = () => {
    if (current.temp > 35) return "🔥 Hot day — push cold drinks & ice cream!";
    if (current.temp > 30) return "☀️ Warm — cold beverages will sell well";
    if (current.temp < 15)
      return "❄️ Cold — soups & hot drinks are popular today";
    if (
      current.description.includes("rain") ||
      current.description.includes("Rain")
    )
      return "🌧️ Rain expected — expect lower footfall";
    if (current.wind_speed > 30) return "💨 Windy — secure your setup properly";
    return "👍 Good weather for food truck business!";
  };

  return (
    <div className="space-y-3">
      {/* Current Weather */}
      <div className="flex items-center gap-4">
        <div className="shrink-0">{getWeatherIcon(current.weatherCode)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {current.temp}°C
            </span>
            <span className="text-sm text-gray-400 capitalize">
              {current.description}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            📍 {current.city}
          </p>
        </div>
      </div>

      {/* Weather details */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
          <Thermometer className="h-3.5 w-3.5 text-orange-400 mx-auto mb-0.5" />
          <p className="text-xs text-gray-500">Feels</p>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {current.feels_like}°
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
          <Droplets className="h-3.5 w-3.5 text-blue-400 mx-auto mb-0.5" />
          <p className="text-xs text-gray-500">Humidity</p>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {current.humidity}%
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
          <Wind className="h-3.5 w-3.5 text-cyan-400 mx-auto mb-0.5" />
          <p className="text-xs text-gray-500">Wind</p>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {current.wind_speed} km/h
          </p>
        </div>
      </div>

      {/* Suggestion */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-2.5 border border-blue-100 dark:border-blue-800/30">
        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
          {getSuggestion()}
        </p>
      </div>

      {/* 3-Day Forecast */}
      {forecast.length > 0 && (
        <div className="flex gap-2">
          {forecast.map((day) => (
            <div
              key={day.date}
              className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2 text-center"
            >
              <p className="text-[10px] font-semibold text-gray-500 uppercase">
                {day.dayName}
              </p>
              <div className="flex justify-center my-1">
                {getSmallWeatherIcon(day.weatherCode)}
              </div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {day.temp_max}°
              </p>
              <p className="text-[10px] text-gray-400">{day.temp_min}°</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;
