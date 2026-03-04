import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from openai import OpenAI
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

# Load environment variables
load_dotenv()

app = FastAPI(title="AI-Assisted Compliance Copilot API")

# Configure CORS so the frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, adjust for production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Configure xAI (Grok) API via OpenAI SDK
API_KEY = os.getenv("XAI_API_KEY")

if not API_KEY:
    print("Warning: XAI_API_KEY not found in environment variables.")

# Initialize the OpenAI client pointing to xAI
client = OpenAI(
    api_key=API_KEY or "missing_key",
    base_url="https://api.xai.com/v1",
)

# Define the request model
class SimulationRequest(BaseModel):
    region: str
    industry: str
    pollutant: str
    reduction_percentage: float
    current_risk_score: float  # Example current metric

@app.post("/api/simulate-risk")
async def simulate_risk(request: SimulationRequest):
    """
    Simulates the environmental risk score based on proposed pollutant reductions.
    Uses Grok API for advanced "What-if" analysis if available, 
    otherwise falls back to a simple calculation.
    """
    
    # 1. Simple Fallback Calculation
    reduction_factor = request.reduction_percentage / 100.0
    pollutant_weight = 0.40 
    
    estimated_new_score = request.current_risk_score * (1 - (reduction_factor * pollutant_weight))
    
    # 2. Advanced Analysis using Grok API
    ai_analysis = "AI analysis not available. Please verify XAI_API_KEY is configured."
    
    current_api_key = os.getenv("XAI_API_KEY")
    
    if current_api_key:
        try:
            # The User provided a Groq API key (starts with gsk_), not an xAI key. 
            # We connect to the Groq OpenAI-compatible endpoint.
            client = OpenAI(
                api_key=current_api_key,
                base_url="https://api.groq.com/openai/v1",
            )
            
            prompt_content = f"""
            Current Scenario:
            - Region: {request.region}
            - Industry Focus: {request.industry}
            - Current Overall Risk Score: {request.current_risk_score}/100
            
            Proposed Action:
            - The {request.industry} industry proposes to reduce {request.pollutant} emissions by {request.reduction_percentage}%.
            
            Task:
            1. Provide a brief analysis of how this specific reduction might impact the regional environmental health.
            2. Estimate the new risk score based on this action.
            3. Highlight any potential secondary benefits or compliance challenges.
            
            Keep the response concise, formatted in Markdown, and clearly state the simulated new risk score.
            """

            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are an expert environmental compliance analyst."},
                    {"role": "user", "content": prompt_content},
                ],
            )
            
            if response.choices and len(response.choices) > 0:
                ai_analysis = response.choices[0].message.content
                 
        except Exception as e:
            print(f"Error calling Grok API: {e}")
            ai_analysis = f"Error generating AI analysis: {str(e)}"
            
    return {
        "scenario": request.dict(),
        "baseline_calculation": {
            "estimated_new_score": round(estimated_new_score, 2),
            "note": "Based on a simplified regression weight model."
        },
        "ai_analysis": ai_analysis
    }

class SensorReading(BaseModel):
    id: str
    sensor_type: str
    value: float
    timestamp: str 

class AnomalyDetectionRequest(BaseModel):
    readings: List[SensorReading]

@app.post("/api/detect-anomalies")
async def detect_anomalies(request: AnomalyDetectionRequest):
    """
    Analyzes an array of sensor readings and uses an Isolation Forest model
    to detect statistical outliers/anomalies (e.g., impossible 0 emissions).
    """
    if not request.readings:
        raise HTTPException(status_code=400, detail="No readings provided")
    
    # Convert to DataFrame
    data = [{"id": r.id, "value": r.value} for r in request.readings]
    df = pd.DataFrame(data)
    
    # We need a 2D array for sklearn
    values = df['value'].values.reshape(-1, 1)
    
    # Initialize IsolationForest
    # contamination is the assumed proportion of outliers in the data set
    clf = IsolationForest(contamination=0.1, random_state=42)
    
    try:
        if len(values) < 5:
            # Too little data for meaningful ML anomaly detection, return none to be safe
            preds = [1] * len(values) 
        else:
            preds = clf.fit_predict(values)
            
        anomalies = []
        for i, pred in enumerate(preds):
            if pred == -1:
                anomalies.append({
                    "id": df.iloc[i]['id'],
                    "value": float(df.iloc[i]['value']),
                    "reason": "Statistical Outlier (Isolation Forest)"
                })
                
        return {
            "total_analyzed": len(values),
            "anomalies_detected": len(anomalies),
            "anomalies": anomalies
        }
    except Exception as e:
        print(f"Error in anomaly detection: {e}")
        raise HTTPException(status_code=500, detail="Error processing anomalies")

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI-Assisted Compliance Copilot API"}
