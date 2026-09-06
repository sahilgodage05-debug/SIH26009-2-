import pandas as pd
import requests
import datetime
from dateutil.relativedelta import relativedelta
import time

MOIL_MINES = {
    # Maharashtra
    "Dongri Buzurg": {"lat": 21.53, "lon": 79.69, "type": "Opencast"},
    "Chikla": {"lat": 21.54, "lon": 79.74, "type": "Underground"},
    "Kandri": {"lat": 21.41, "lon": 79.28, "type": "Underground"},
    "Munsar": {"lat": 21.40, "lon": 79.29, "type": "Underground"},
    "Beldongri": {"lat": 21.39, "lon": 79.31, "type": "Underground"},
    "Gumgaon": {"lat": 21.36, "lon": 78.96, "type": "Underground"},
    "Parsoda": {"lat": 21.38, "lon": 79.30, "type": "Opencast"},
    # Madhya Pradesh
    "Balaghat": {"lat": 21.80, "lon": 80.18, "type": "Underground"},
    "Ukwa": {"lat": 21.97, "lon": 80.46, "type": "Underground"},
    "Tirodi": {"lat": 21.69, "lon": 79.70, "type": "Opencast"},
    "Sitapatore": {"lat": 21.68, "lon": 79.72, "type": "Opencast"}
}

def fetch_all_mines():
    end_date = datetime.date.today()
    start_date = end_date - relativedelta(years=1)
    url = "https://archive-api.open-meteo.com/v1/archive"
    
    all_data = []
    
    for mine_name, info in MOIL_MINES.items():
        print(f"Fetching data for {mine_name} ({info['type']})...")
        
        params = {
            "latitude": info["lat"],
            "longitude": info["lon"],
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "hourly": ["temperature_2m", "precipitation", "soil_moisture_0_to_7cm", "wind_gusts_10m"],
            "timezone": "auto"
        }
        
        # Open-Meteo API sometimes limits rapid requests, so we pause slightly
        time.sleep(1)
        
        response = requests.get(url, params=params)
        if not response.ok:
            print(f"Failed to fetch data for {mine_name}")
            continue
            
        data = response.json()
        hourly = data['hourly']
        
        df = pd.DataFrame({
            "time": pd.to_datetime(hourly['time']),
            "temperature_2m": hourly['temperature_2m'],
            "precipitation": hourly['precipitation'],
            "soil_moisture_0_to_7cm": hourly['soil_moisture_0_to_7cm'],
            "wind_gusts_10m": hourly['wind_gusts_10m']
        })
        
        # Rolling Rain (Proxy for Flood/Landslide Risk)
        df['Rolling_72h_Rainfall'] = df['precipitation'].rolling(window=72, min_periods=1).sum()
        
        # Add Location Context
        df['Mine_Name'] = mine_name
        df['Mine_Type'] = info['type']
        
        all_data.append(df)
        
    combined_df = pd.concat(all_data, ignore_index=True)
    
    csv_filename = "moil_11mines_weather.csv"
    combined_df.to_csv(csv_filename, index=False)
    
    print(f"\nSuccessfully saved {len(combined_df)} hourly records across {len(MOIL_MINES)} mines to {csv_filename}")

if __name__ == "__main__":
    fetch_all_mines()
