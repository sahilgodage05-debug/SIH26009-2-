import pandas as pd
import numpy as np
import random

def generate_optimization_dataset(num_rows=1000):
    data = []
    disruption_types = ['Heavy Rain', 'Extreme Heat', 'None']
    
    for _ in range(num_rows):
        disruption_type = random.choice(disruption_types)
        
        if disruption_type == 'None':
            start_hour = random.randint(0, 23)
            duration = 0
        else:
            start_hour = random.randint(6, 18) # Assuming disruptions happen during active hours
            duration = random.randint(1, 8)
            
        pending_tons = random.randint(100, 500)
        days_deadline = random.randint(1, 10)
        overtime_cap = random.randint(0, 4)
        
        # Logic for Recommended Action
        action = "Normal Operations"
        suggested_ot = 0
        
        if disruption_type == 'None' or duration == 0:
            action = "Normal Operations"
        elif overtime_cap == 0:
            action = "Shift to Indoor/Maintenance tasks"
        elif days_deadline < 3 and duration > 3:
            action = "Pre-emptive Overtime Previous Day"
            suggested_ot = min(overtime_cap, duration) # Recommend up to available capacity
        elif start_hour >= 13: # 1 PM or later considered late afternoon/afternoon
            action = "Front-load Morning Shift"
            suggested_ot = 0 # No overtime needed, just reallocating within the day
        else:
            # Fallback action if there is a disruption but doesn't meet above criteria
            action = "Shift to Indoor/Maintenance tasks"
            
        start_time_str = f"{start_hour:02d}:00"
        
        data.append({
            'Predicted_Disruption_Start': start_time_str,
            'Predicted_Disruption_Duration_hrs': duration,
            'Disruption_Type': disruption_type,
            'Pending_Target_Tons': pending_tons,
            'Days_To_Deadline': days_deadline,
            'Available_Overtime_Capacity_hrs': overtime_cap,
            'Recommended_Action': action,
            'Suggested_Overtime_hrs': suggested_ot
        })
        
    df = pd.DataFrame(data)
    return df

if __name__ == "__main__":
    df = generate_optimization_dataset(1000)
    
    # Save to CSV
    csv_filename = 'optimization_rescheduling_dataset.csv'
    df.to_csv(csv_filename, index=False)
    
    print(f"Dataset with 1000 rows generated and saved to {csv_filename}")
    
    print("\n--- Sample of dataset where Disruption_Type is 'Heavy Rain' ---")
    heavy_rain_sample = df[df['Disruption_Type'] == 'Heavy Rain'].head(10)
    print(heavy_rain_sample.to_string())
