import React, { useEffect, useState } from 'react';
import { 
  getWeatherByCoordinates, 
  getUserLocation, 
  WeatherData, 
  ForecastResponse,
  getForecast5Day,
  getCurrentWeather
} from '../../api/weather/weatherApi';
import 'bootstrap-icons/font/bootstrap-icons.css';


const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's location
      const location = await getUserLocation();
      
      // Fetch current weather data
      const weatherData = await getWeatherByCoordinates(location.lat, location.lon);
      
      if (weatherData) {
        setWeather(weatherData);
        
        // Fetch 5-day forecast using city name
        if (weatherData.name) {
          try {
            const forecastData = await getForecast5Day(weatherData.name);
            setForecast(forecastData);
          } catch (forecastErr) {
            console.error('Forecast fetch error:', forecastErr);
            // Don't show error if only forecast fails
          }
        }
      } else {
        setError('Không thể lấy thông tin thời tiết');
      }
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      if (err.message && err.message.includes('Geolocation')) {
        setError('Vui lòng cho phép truy cập vị trí');
      } else {
        setError('Không thể tải thời tiết');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCity = async (cityName: string) => {
    if (!cityName.trim()) return;
    
    try {
      setIsSearching(true);
      setError(null);

      // Fetch weather by city name
      const weatherData = await getCurrentWeather(cityName);
      
      if (weatherData) {
        setWeather(weatherData);
        
        // Fetch 5-day forecast
        try {
          const forecastData = await getForecast5Day(cityName);
          setForecast(forecastData);
        } catch (forecastErr) {
          console.error('Forecast fetch error:', forecastErr);
        }
      } else {
        setError('Không tìm thấy thành phố');
      }
    } catch (err: any) {
      console.error('City weather fetch error:', err);
      setError('Không tìm thấy thành phố này');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCity.trim()) {
      fetchWeatherByCity(searchCity);
    }
  };

  const getWeatherIcon = (icon?: string) => {
    if (icon) {
      return `http://openweathermap.org/img/wn/${icon}@2x.png`;
    }
    return '';
  };

  const getDailyForecasts = () => {
    if (!forecast || !forecast.list) return [];
    
    // Group forecasts by date and get one forecast per day (around noon)
    const dailyMap = new Map<string, typeof forecast.list[0]>();
    
    forecast.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toLocaleDateString('vi-VN');
      const hour = date.getHours();
      
      // Take forecast around noon (12:00) for each day
      if (!dailyMap.has(dateKey) || Math.abs(hour - 12) < Math.abs(new Date(dailyMap.get(dateKey)!.dt * 1000).getHours() - 12)) {
        dailyMap.set(dateKey, item);
      }
    });
    
    // Return only first 5 days
    return Array.from(dailyMap.values()).slice(0, 5);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateStr = date.toLocaleDateString('vi-VN');
    const todayStr = today.toLocaleDateString('vi-VN');
    const tomorrowStr = tomorrow.toLocaleDateString('vi-VN');
    
    if (dateStr === todayStr) return 'Hôm nay';
    if (dateStr === tomorrowStr) return 'Ngày mai';
    
    return date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
  };

  if (loading) {
    return (
      <div className="weather-widget">
        <div className="weather-loading">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <span className="ms-2">Đang tải thời tiết...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget">
        <div className="weather-error">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <span>{error}</span>
          <button 
            className="btn btn-sm btn-link p-0 ms-2" 
            onClick={fetchWeather}
            title="Thử lại"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>
    );
  }

  if (!weather || !weather.main) {
    return null;
  }

  const currentWeather = weather.weather?.[0];
  const temp = Math.round(weather.main.temp);
  const feelsLike = Math.round(weather.main.feels_like);
  const humidity = weather.main.humidity;
  const windSpeed = weather.wind ? Math.round(weather.wind.speed * 3.6) : 0; // Convert m/s to km/h
  const pressure = weather.main.pressure;
  const description = currentWeather?.description || 'N/A';
  const icon = currentWeather?.icon;
  const cityName = weather.name || 'Vị trí của bạn';
  
  const dailyForecasts = getDailyForecasts();

  return (
    <div className="weather-widget">
      <h3 className="weather-title">
        <i className="bi bi-cloud-sun me-2"></i>
        Thời tiết
      </h3>

      <div className="weather-content">
        {/* Search City Form */}
        <form onSubmit={handleSearchSubmit} className="weather-search">
          <div className="weather-search-wrapper">
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="Tìm kiếm thành phố..."
              className="weather-search-input"
              disabled={isSearching}
            />
            <button 
              type="submit" 
              className="weather-search-btn"
              disabled={isSearching || !searchCity.trim()}
              title="Tìm kiếm"
            >
              <i className="bi bi-search"></i>
            </button>
            <button 
              type="button" 
              className="weather-location-btn"
              onClick={fetchWeather}
              disabled={loading}
              title="Vị trí của tôi"
            >
              <i className="bi bi-geo-alt-fill"></i>
            </button>
          </div>
        </form>

        <div className="weather-main">
          <div className="weather-location">
            <i className="bi bi-geo-alt me-1"></i>
            {cityName}
          </div>
          
          <div className="weather-display">
            {icon && (
              <img 
                src={getWeatherIcon(icon)} 
                alt={description} 
                className="weather-icon"
              />
            )}
            <div className="weather-temp-main">
              <div className="temp-value">{temp}°C</div>
              <div className="temp-description">{description}</div>
            </div>
          </div>
        </div>
        
        <div className="weather-details">
          <div className="detail-item">
            <i className="bi bi-thermometer-half"></i>
            <span>Cảm giác: {feelsLike}°C</span>
          </div>
          <div className="detail-item">
            <i className="bi bi-droplet"></i>
            <span>Độ ẩm: {humidity}%</span>
          </div>
          <div className="detail-item">
            <i className="bi bi-wind"></i>
            <span>Gió: {windSpeed} km/h</span>
          </div>
          <div className="detail-item">
            <i className="bi bi-speedometer"></i>
            <span>Áp suất: {pressure} hPa</span>
          </div>
        </div>
        
        {/* 5-Day Forecast Toggle */}
        {dailyForecasts.length > 0 && (
          <>
            <button 
              className="btn btn-sm btn-outline-secondary w-100 mt-2" 
              onClick={() => setShowForecast(!showForecast)}
            >
              <i className={`bi bi-chevron-${showForecast ? 'up' : 'down'} me-1`}></i>
              {showForecast ? 'Ẩn' : 'Xem'} dự báo 5 ngày
            </button>
            
            {showForecast && (
              <div className="forecast-container">
                {dailyForecasts.map((day, index) => (
                  <div key={day.dt} className="forecast-day">
                    <div className="forecast-date">{formatDate(day.dt)}</div>
                    <img 
                      src={getWeatherIcon(day.weather[0]?.icon)} 
                      alt={day.weather[0]?.description}
                      className="forecast-icon"
                    />
                    <div className="forecast-temp">
                      {Math.round(day.main.temp)}°C
                    </div>
                    <div className="forecast-desc">{day.weather[0]?.description}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        <button 
          className="btn btn-sm btn-outline-primary w-100 mt-2" 
          onClick={fetchWeather}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Cập nhật
        </button>
      </div>

      <style>{`
        .weather-widget {
          background: #fff;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .weather-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 12px;
          color: #1c1e21;
          display: flex;
          align-items: center;
        }

        .weather-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .weather-search {
          width: 100%;
        }

        .weather-search-wrapper {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .weather-search-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e4e6eb;
          border-radius: 20px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .weather-search-input:focus {
          border-color: #1877f2;
        }

        .weather-search-input:disabled {
          background: #f0f2f5;
          cursor: not-allowed;
        }

        .weather-search-btn,
        .weather-location-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #1877f2;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .weather-search-btn:hover:not(:disabled),
        .weather-location-btn:hover:not(:disabled) {
          background: #0f5aca;
        }

        .weather-search-btn:disabled,
        .weather-location-btn:disabled {
          background: #e4e6eb;
          color: #65676b;
          cursor: not-allowed;
        }

        .weather-location-btn {
          background: #42b72a;
        }

        .weather-location-btn:hover:not(:disabled) {
          background: #36a420;
        }

        .weather-main {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .weather-location {
          font-size: 0.9rem;
          color: #65676b;
          display: flex;
          align-items: center;
        }

        .weather-display {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .weather-icon {
          width: 64px;
          height: 64px;
          object-fit: contain;
        }

        .weather-temp-main {
          flex: 1;
        }

        .temp-value {
          font-size: 2rem;
          font-weight: bold;
          color: #1c1e21;
          line-height: 1;
        }

        .temp-description {
          font-size: 0.9rem;
          color: #65676b;
          text-transform: capitalize;
          margin-top: 4px;
        }

        .weather-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid #e4e6eb;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: #65676b;
        }

        .detail-item i {
          font-size: 1rem;
          color: #1877f2;
        }

        .weather-loading,
        .weather-error {
          display: flex;
          align-items: center;
          font-size: 0.9rem;
          color: #65676b;
        }

        .weather-error {
          color: #e4405f;
        }

        .weather-error .btn-link {
          color: #1877f2;
          text-decoration: none;
        }

        .weather-error .btn-link:hover {
          opacity: 0.8;
        }

        .forecast-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e4e6eb;
          max-height: 400px;
          overflow-y: auto;
        }

        .forecast-day {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          background: #f0f2f5;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .forecast-day:hover {
          background: #e4e6eb;
        }

        .forecast-date {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1c1e21;
          min-width: 80px;
        }

        .forecast-icon {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }

        .forecast-temp {
          font-size: 1.1rem;
          font-weight: bold;
          color: #1877f2;
          min-width: 50px;
        }

        .forecast-desc {
          font-size: 0.85rem;
          color: #65676b;
          text-transform: capitalize;
          flex: 1;
        }

        @media (max-width: 768px) {
          .weather-widget {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default WeatherWidget;
