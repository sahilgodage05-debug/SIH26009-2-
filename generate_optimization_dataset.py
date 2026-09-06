import pandas as pd
import numpy as np

def generate_final_dataset():
    # Load 11 mines real weather data
    df = pd.read_csv('moil_11mines_weather.csv')
    
    np.random.seed(42)
    n = len(df)
    
    # Add operational columns
    df['Pending_Target_Tons'] = np.random.randint(100, 1001, size=n)
    df['Days_To_Deadline'] = np.random.randint(1, 16, size=n)
    df['Daily_Extraction_Capacity'] = np.random.randint(100, 300, size=n)
    df['Overtime_Capacity_hrs'] = np.random.randint(0, 5, size=n)
    
    # Define Target Logic including Opencast vs Underground Logic
    def get_action(row):
        precip = row['precipitation']
        rolling_rain = row['Rolling_72h_Rainfall']
        temp = row['temperature_2m']
        days = row['Days_To_Deadline']
        overtime = row['Overtime_Capacity_hrs']
        mine_type = row['Mine_Type']
        capacity = row['Daily_Extraction_Capacity']
        target = row['Pending_Target_Tons']
        
        required_rate = target / days if days > 0 else target
        
        # Determine if weather is critical based on mine type
        is_weather_critical = False
        
        if mine_type == 'Opencast':
            # Opencast is sensitive to even moderate rain
            if precip > 2.0 or rolling_rain > 50:
                is_weather_critical = True
        else:
            # Underground is mostly insulated, only stops for heavy flooding risks
            if precip > 10.0 or rolling_rain > 120:
                is_weather_critical = True
                
        target_impossible_normal = required_rate > capacity
        
        if is_weather_critical:
            if target_impossible_normal and overtime > 0:
                return "Pre-emptive Overtime Prior Shift"
            else:
                return "Pause Operations & Maintain Equipment"
        else:
            if target_impossible_normal:
                if overtime > 0:
                    return "Pre-emptive Overtime Prior Shift"
                else:
                    return "Shift Heavy Extraction to Night/Early Morning"
            elif temp > 42.0:
                if mine_type == 'Opencast':
                    return "Shift Heavy Extraction to Night/Early Morning"
                else:
                    return "Normal Operations"
            else:
                return "Normal Operations"
            
    df['Recommended_Action'] = df.apply(get_action, axis=1)
    
    csv_filename = 'moil_final_rescheduling_dataset.csv'
    df.to_csv(csv_filename, index=False)
    
    print(f"Final dataset with {len(df)} rows saved to {csv_filename}")
    print("\nAction Distribution:")
    print(df['Recommended_Action'].value_counts())
    
    print("\nAction Distribution by Mine Type:")
    print(df.groupby('Mine_Type')['Recommended_Action'].value_counts())

if __name__ == "__main__":
    generate_final_dataset()
