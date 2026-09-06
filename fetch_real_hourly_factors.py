import pandas as pd
import requests
import datetime
from dateutil.relativedelta import relativedelta

def fetch_historical_weather():
    # Balaghat Location
    lat = 21.8050
    lon = 80.1840
    
    # Dates for the last 1 year
    end_date = datetime.date.today()
    start_date = end_date - relativedelta(years=1)
    
    # Open-Meteo Historical API URL
    url = "https://archive-api.open-meteo.com/v1/archive"
    
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "hourly": ["temperature_2m", "precipitation", "soil_moisture_0_to_7cm", "wind_gusts_10m"],
        "timezone": "auto"
    }
    
    print(f"Fetching data from {start_date} to {end_date}...")
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    
    # Parse into pandas DataFrame
    hourly = data['hourly']
    df = pd.DataFrame({
        "time": pd.to_datetime(hourly['time']),
        "temperature_2m": hourly['temperature_2m'],
        "precipitation": hourly['precipitation'],
        "soil_moisture_0_to_7cm": hourly['soil_moisture_0_to_7cm'],
        "wind_gusts_10m": hourly['wind_gusts_10m']
    })
    
    # Feature Engineering: Natural Disaster Indicators
    # Calculate Rolling_72h_Rainfall to proxy Landslide/Flood Risk
    # Since data is precisely hourly, a rolling window of 72 rows equals 72 hours.
    df['Rolling_72h_Rainfall'] = df['precipitation'].rolling(window=72, min_periods=1).sum()
    
    # Save to CSV
    csv_filename = "real_hourly_factors.csv"
    df.to_csv(csv_filename, index=False)
    
    print(f"\nSuccessfully saved {len(df)} hourly records to {csv_filename}")
    print("\n--- Sample of Fetched Data ---")
    print(df.tail(15).to_string()) # Print tail to show calculated rolling rainfall

if __name__ == "__main__":
    fetch_historical_weather()
