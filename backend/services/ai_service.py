"""
AI Service — Groq-powered copilot, risk simulation, and pollution prediction.
"""
import asyncio
import numpy as np
from openai import OpenAI
from core.config import XAI_API_KEY, GROQ_BASE_URL, GROQ_MODEL

# ─── Client (singleton) ────────────────────────────────────────────────────────
groq_client = OpenAI(
    api_key=XAI_API_KEY or "missing_key",
    base_url=GROQ_BASE_URL,
    timeout=15.0,
    max_retries=1,
) if XAI_API_KEY else None


def _call_groq(system_prompt: str, user_prompt: str, max_tokens: int = 400) -> str:
    if not groq_client:
        return "⚠️ AI unavailable — XAI_API_KEY not configured."
    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=max_tokens,
        temperature=0.4,
    )
    return response.choices[0].message.content


async def simulate_risk(region: str, industry: str, pollutant: str,
                        reduction_pct: float, current_score: float) -> dict:
    """Existing risk simulation logic (migrated from original main.py)."""
    reduction_factor = reduction_pct / 100.0
    estimated_new = round(current_score * (1 - (reduction_factor * 0.40)), 2)

    system = (
        "You are a concise expert environmental compliance analyst. "
        "Respond in Markdown. Keep answers under 200 words."
    )
    prompt = f"""Current Scenario:
- Region: {region}
- Industry: {industry}
- Current Risk Score: {current_score}/100

Proposed Action: Reduce {pollutant} emissions by {reduction_pct}%.

Tasks:
1. Brief environmental impact analysis.
2. Estimated new risk score.
3. Key secondary benefits or compliance risks.

Be concise and use Markdown."""

    try:
        ai_analysis = await asyncio.to_thread(_call_groq, system, prompt)
    except Exception as e:
        ai_analysis = f"Error generating AI analysis: {e}"

    return {
        "scenario": {
            "region": region, "industry": industry,
            "pollutant": pollutant, "reduction_percentage": reduction_pct,
            "current_risk_score": current_score,
        },
        "baseline_calculation": {
            "estimated_new_score": estimated_new,
            "note": "Based on a simplified regression weight model.",
        },
        "ai_analysis": ai_analysis,
    }


async def predict_pollution(location_id: int, hours: int,
                            recent_readings: list[dict]) -> dict:
    """
    24–72 hour pollution prediction using numpy trend + Groq narrative.
    `recent_readings` is a list of dicts with 'pm25', 'pm10', 'aqi', 'recorded_at'.
    """
    predictions = {}

    # Numpy trend for each numeric pollutant we have data for
    fields = ["pm25", "pm10", "so2", "no2", "co", "o3", "aqi",
              "bod", "cod", "decibel_level"]

    for field in fields:
        values = [r.get(field) for r in recent_readings if r.get(field) is not None]
        if len(values) < 2:
            continue
        x = np.arange(len(values), dtype=float)
        coeffs = np.polyfit(x, values, 1)   # linear trend
        slope, intercept = coeffs
        future_x = len(values) + (hours / 24.0)
        predicted = round(float(slope * future_x + intercept), 2)
        predictions[field] = max(0.0, predicted)

    if not predictions:
        predictions = {"note": "Not enough historical data for trend analysis."}

    # Groq narrates the prediction
    system = (
        "You are an environmental data scientist. "
        "Give a professional 3-sentence forecast narrative in Markdown."
    )
    prompt = (
        f"Location #{location_id} | Forecast horizon: {hours} hours\n"
        f"Predicted values: {predictions}\n"
        "Describe the expected pollution trend and any health/environmental concerns."
    )
    try:
        narrative = await asyncio.to_thread(_call_groq, system, prompt, 300)
    except Exception as e:
        narrative = f"Narrative unavailable: {e}"

    return {
        "location_id": location_id,
        "horizon_hours": hours,
        "predictions": predictions,
        "narrative": narrative,
    }


async def answer_copilot(question: str, context: str = "") -> str:
    """General environmental Q&A copilot."""
    system = (
        "You are PrithviNet's AI Compliance Copilot — an expert in Indian environmental law, "
        "pollution standards (CPCB/MoEFCC), and industrial compliance. "
        "Answer concisely in Markdown. Max 250 words."
    )
    prompt = f"{context}\n\nUser question: {question}" if context else question
    try:
        return await asyncio.to_thread(_call_groq, system, prompt, 400)
    except Exception as e:
        return f"Error: {e}"
