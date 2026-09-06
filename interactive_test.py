import requests
import json

url = "http://localhost:8000/api/recommend-schedule"

print("\n==========================================")
print("   🤖 PRESCRIPTIVE AI - TESTING TOOL 🤖   ")
print("==========================================\n")
print("कृपया नीचे दी गई डिटेल्स भरें (आप चाहें तो बिना कुछ लिखे Enter भी दबा सकते हैं, जिससे डिफ़ॉल्ट वैल्यू ले ली जाएगी):\n")

try:
    mine_input = input("Mine Name (e.g., Balaghat, Dongri Buzurg, Tirodi) [Default: Dongri Buzurg]: ")
    mine_name = mine_input if mine_input else "Dongri Buzurg"

    temp_input = input("Temperature (तापमान) [Default: 30.5]: ")
    temp = float(temp_input) if temp_input else 30.5

    precip_input = input("Precipitation (बारिश mm में) [Default: 3.5]: ")
    precip = float(precip_input) if precip_input else 3.5

    soil_input = input("Soil Moisture (मिट्टी की नमी) [Default: 0.5]: ")
    soil = float(soil_input) if soil_input else 0.5

    rolling_input = input("Rolling 72h Rainfall (पिछले 72 घंटे की बारिश) [Default: 60.0]: ")
    rolling = float(rolling_input) if rolling_input else 60.0

    target_input = input("Pending Target Tons (बचा हुआ टारगेट) [Default: 500]: ")
    target = float(target_input) if target_input else 500.0

    days_input = input("Days To Deadline (डेडलाइन में बचे दिन) [Default: 3]: ")
    days = float(days_input) if days_input else 3.0

    capacity_input = input("Daily Extraction Capacity (प्रति दिन क्षमता Tons में) [Default: 150]: ")
    capacity = float(capacity_input) if capacity_input else 150.0

    overtime_input = input("Overtime Capacity (ओवरटाइम कितने घंटे कर सकते हैं) [Default: 4]: ")
    overtime = float(overtime_input) if overtime_input else 4.0

    data = {
        "Mine_Name": mine_name,
        "temperature_2m": temp,
        "precipitation": precip,
        "soil_moisture_0_to_7cm": soil,
        "Rolling_72h_Rainfall": rolling,
        "Pending_Target_Tons": target,
        "Days_To_Deadline": days,
        "Daily_Extraction_Capacity": capacity,
        "Overtime_Capacity_hrs": overtime
    }

    print("\nAI से संपर्क किया जा रहा है... ⏳")
    response = requests.post(url, json=data)
    response.raise_for_status()
    
    result = response.json()
    print("\n==========================================")
    print("      🎯 AI का सुझाव (RECOMMENDATION) 🎯    ")
    print("==========================================")
    print(f"👉 {result['Recommended_Action']}")
    print(f"📝 मैसेज: {result['Message']}")
    print("==========================================\n")

except requests.exceptions.ConnectionError:
    print("\n❌ Error: सर्वर चालू नहीं है! कृपया पहले 'python main.py' चलाकर सर्वर चालू करें।")
except Exception as e:
    print(f"\n❌ कोई त्रुटि हुई: {e}")
