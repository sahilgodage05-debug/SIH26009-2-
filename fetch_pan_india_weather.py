import pandas as pd
import requests
import time
from datetime import datetime, timedelta

PAN_INDIA_MINES = {
    "Nagpur_MOIL": {"lat": 21.1458, "lon": 79.0882},
    "Balaghat_MOIL": {"lat": 21.8050, "lon": 80.1840},
    "Dhanbad_Coal": {"lat": 23.7957, "lon": 86.4304},
    "Keonjhar_Iron": {"lat": 21.6289, "lon": 85.5817},
    "Udaipur_Zinc": {"lat": 24.5854, "lon": 73.7125},
    "Bellary_Iron": {"lat": 15.1394, "lon": 76.9214},
    "Korba_Coal": {"lat": 22.3595, "lon": 82.6824}
}

def fetch_weather_data(lat, lon, start_date, end_date):
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "soil_moisture_0_to_7cm_mean"],
        "timezone": "auto"
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    
    df = pd.DataFrame({
        "Date": pd.to_datetime(data["daily"]["time"]),
        "Temp_Max": data["daily"]["temperature_2m_max"],
        "Temp_Min": data["daily"]["temperature_2m_min"],
        "Rainfall_mm": data["daily"]["precipitation_sum"],
        "Soil_Moisture": data["daily"]["soil_moisture_0_to_7cm_mean"]
    })
    return df

def main():
    end_date = datetime.now().date() - timedelta(days=5) # 5 days ago to ensure data availability
    start_date = end_date - timedelta(days=3 * 365)
    
    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = end_date.strftime("%Y-%m-%d")
    
    print(f"Fetching data from {start_date_str} to {end_date_str}")
    
    all_data = []
    
    for location, coords in PAN_INDIA_MINES.items():
        print(f"Fetching data for {location}...")
        try:
            df = fetch_weather_data(coords["lat"], coords["lon"], start_date_str, end_date_str)
            df["Mine_Location"] = location
            all_data.append(df)
            time.sleep(1) # Sleep to avoid rate limits
        except Exception as e:
            print(f"Failed to fetch data for {location}: {e}")
            
    if all_data:
        master_df = pd.concat(all_data, ignore_index=True)
        # Drop rows with NaN values if any
        master_df = master_df.dropna()
        
        output_file = "pan_india_weather_master.csv"
        master_df.to_csv(output_file, index=False)
        print(f"Successfully saved combined data to {output_file}")
        print(f"Total records: {len(master_df)}")
    else:
        print("No data fetched.")

if __name__ == "__main__":
    main()
