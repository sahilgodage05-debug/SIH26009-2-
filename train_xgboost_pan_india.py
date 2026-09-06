import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pickle

def main():
    print("Loading pan_india_weather_master.csv...")
    try:
        df = pd.read_csv("pan_india_weather_master.csv")
    except FileNotFoundError:
        print("Dataset not found. Please run fetch_pan_india_weather.py first.")
        return

    # Feature Engineering
    print("Engineering features...")
    df["Date"] = pd.to_datetime(df["Date"])
    df["Month"] = df["Date"].dt.month
    
    # Target Variable: High_Risk_Weather
    # Let's say risk is high if Rainfall > 20mm OR Temp_Max > 40 OR Soil_Moisture > 0.9
    df["High_Risk_Weather"] = ((df["Rainfall_mm"] > 20) | 
                               (df["Temp_Max"] > 40) | 
                               (df["Soil_Moisture"] > 0.9)).astype(int)

    features = ["Temp_Max", "Temp_Min", "Soil_Moisture", "Month", "Rainfall_mm"]
    target = "High_Risk_Weather"

    X = df[features]
    y = df[target]

    print(f"Class distribution:\n{y.value_counts(normalize=True)}")

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("Training XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=100, 
        max_depth=5, 
        learning_rate=0.1, 
        random_state=42,
        eval_metric='logloss'
    )
    
    model.fit(X_train, y_train)

    # Evaluate
    print("Evaluating model...")
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    # Save model
    model_filename = "xgboost_pan_india_model.pkl"
    with open(model_filename, "wb") as f:
        pickle.dump(model, f)
    
    print(f"Successfully saved model to {model_filename}")

if __name__ == "__main__":
    main()
