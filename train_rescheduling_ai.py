import pandas as pd
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
import pickle

def train_model():
    # Load 11 mines dataset
    df = pd.read_csv('moil_final_rescheduling_dataset.csv')
    
    # We need to encode Mine_Type as well
    mine_type_encoder = LabelEncoder()
    df['Mine_Type_Encoded'] = mine_type_encoder.fit_transform(df['Mine_Type'])
    
    # Define features and target
    features = [
        'Mine_Type_Encoded',
        'temperature_2m', 
        'precipitation', 
        'soil_moisture_0_to_7cm', 
        'Rolling_72h_Rainfall', 
        'Pending_Target_Tons', 
        'Days_To_Deadline', 
        'Daily_Extraction_Capacity',
        'Overtime_Capacity_hrs'
    ]
    
    X = df[features]
    y_raw = df['Recommended_Action']
    
    # Encode target variable
    action_encoder = LabelEncoder()
    y = action_encoder.fit_transform(y_raw)
    
    # Train model
    print("Training XGBoost Classifier...")
    model = XGBClassifier(random_state=42, use_label_encoder=False, eval_metric='mlogloss')
    model.fit(X, y)
    
    # Save model and encoders
    with open('prescriptive_rescheduling_model.pkl', 'wb') as f:
        pickle.dump(model, f)
        
    with open('action_encoder.pkl', 'wb') as f:
        pickle.dump(action_encoder, f)
        
    with open('mine_type_encoder.pkl', 'wb') as f:
        pickle.dump(mine_type_encoder, f)
        
    print("Model saved to prescriptive_rescheduling_model.pkl")
    print("Action Encoder saved to action_encoder.pkl")
    print("Mine Type Encoder saved to mine_type_encoder.pkl")
    
    print("\nActions mapped:")
    for i, class_name in enumerate(action_encoder.classes_):
        print(f"{i} -> {class_name}")
        
    print("\nMine Types mapped:")
    for i, class_name in enumerate(mine_type_encoder.classes_):
        print(f"{i} -> {class_name}")

if __name__ == "__main__":
    train_model()
