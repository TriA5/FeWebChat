import axios from 'axios';

const API_BASE_URL = 'https://unpessimistically-unbewailed-christy.ngrok-free.dev/api/weathers';

export interface WeatherData {
  coord?: {
    lon: number;
    lat: number;
  };
  weather?: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base?: string;
  main?: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
  };
  visibility?: number;
  wind?: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds?: {
    all: number;
  };
  dt?: number;
  sys?: {
    type?: number;
    id?: number;
    country?: string;
    sunrise?: number;
    sunset?: number;
  };
  timezone?: number;
  id?: number;
  name?: string;
  cod?: number;
}

export interface ForecastItem {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
    temp_kf?: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  clouds: {
    all: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  visibility: number;
  pop: number;
  rain?: {
    '3h': number;
  };
  sys: {
    pod: string;
  };
  dt_txt: string;
}

export interface ForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: ForecastItem[];
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

/**
 * Get weather by coordinates (lat, lon)
 */
export const getWeatherByCoordinates = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/by-coordinates`, {
      params: { lat, lon }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching weather by coordinates:', error);
    throw error;
  }
};

/**
 * Get 5-day forecast by city name
 */
export const getForecast5Day = async (city: string): Promise<ForecastResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/forecast-5day`, {
      params: { city }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching 5-day forecast:', error);
    throw error;
  }
};

/**
 * Get current weather by city name
 */
export const getCurrentWeather = async (city: string): Promise<WeatherData> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/current`, {
      params: { city }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }
};

/**
 * Get user's geolocation using browser API
 */
export const getUserLocation = (): Promise<{ lat: number; lon: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
};
