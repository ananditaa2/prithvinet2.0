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


# Penalty bands (₹ lakhs) by risk score — indicative, EPA §15 framework
def _estimate_penalty_range(risk_score: float) -> tuple[float, float]:
    if risk_score >= 90:
        return (15.0, 50.0)
    if risk_score >= 75:
        return (5.0, 15.0)
    if risk_score >= 60:
        return (1.0, 5.0)
    if risk_score >= 40:
        return (0.5, 1.0)
    return (0.0, 0.5)


async def simulate_risk(region: str, industry: str, pollutant: str,
                        reduction_pct: float, current_score: float) -> dict:
    """Risk simulation with penalty estimates and CPCB law references."""
    reduction_factor = reduction_pct / 100.0
    estimated_new = round(current_score * (1 - (reduction_factor * 0.40)), 2)
    estimated_new = max(0, min(100, estimated_new))

    curr_lo, curr_hi = _estimate_penalty_range(current_score)
    new_lo, new_hi = _estimate_penalty_range(estimated_new)
    penalty_reduction = (curr_lo + curr_hi) / 2 - (new_lo + new_hi) / 2

    # CPCB law reference for pollutant
    cpcb_refs = {
        "PM2.5": "CPCB National AQI (2014) — PM2.5 24h limit 60 µg/m³ (industrial)",
        "PM10": "CPCB National AQI (2014) — PM10 24h limit 100 µg/m³ (industrial)",
        "SO2": "CPCB Ambient Air Quality — SO2 24h limit 80 µg/m³",
        "NO2": "CPCB Ambient Air Quality — NO2 24h limit 80 µg/m³",
        "CO": "CPCB Ambient Air Quality — CO 8h limit 4 mg/m³",
        "O3": "CPCB Ambient Air Quality — O3 8h limit 100 µg/m³",
    }
    law_ref = cpcb_refs.get(pollutant.upper().replace(" ", ""), "Environment (Protection) Act 1986 §5 & §15")

    system = (
        "You are a concise expert environmental compliance analyst for Indian regulations. "
        "Mention CPCB/EPA where relevant. Respond in Markdown. Keep under 200 words."
    )
    prompt = f"""Current Scenario:
- Region: {region}
- Industry: {industry}
- Current Risk Score: {current_score}/100
- Law: {law_ref}

Proposed Action: Reduce {pollutant} emissions by {reduction_pct}%.

Tasks:
1. Brief environmental impact analysis.
2. Estimated new risk score ({estimated_new}).
3. Penalty exposure reduction (current vs post-reduction).
4. Key compliance benefits.

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
        "penalty_impact": {
            "current_risk_band": f"{curr_lo:.1f}–{curr_hi:.1f} lakh ₹",
            "new_risk_band": f"{new_lo:.1f}–{new_hi:.1f} lakh ₹",
            "estimated_reduction_lakh": round(max(0, penalty_reduction), 1),
            "cpcb_reference": law_ref,
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


async def generate_aqi_suggestions(aqi: float, region: str, role: str) -> str:
    """
    Generate targeted, role-specific AI action suggestions based on current AQI.
    Role can be: industry, government, citizen, environment_team
    """
    aqi_label = (
        "Good" if aqi <= 50 else
        "Satisfactory" if aqi <= 100 else
        "Moderate" if aqi <= 150 else
        "Poor" if aqi <= 200 else
        "Very Poor" if aqi <= 300 else
        "Severe"
    )

    role_descriptions = {
        "industry": "industrial plant operators and factory compliance officers",
        "government": "regional government officers, CECB inspectors, and pollution control board officials",
        "citizen": "the general public, residents, and citizens",
        "environment_team": "environmental monitoring teams and field scientists",
    }
    role_desc = role_descriptions.get(role, role_descriptions["government"])

    system = (
        "You are an AI environmental advisor for PrithviNet, India's environmental compliance platform. "
        "You specialize in CPCB standards, EPA 1986, and Indian pollution law. "
        "Give 3 specific, actionable, numbered steps for immediate action. "
        "Be concise and direct. Use Markdown. Max 200 words."
    )
    prompt = (
        f"Current AQI in {region}: **{aqi:.0f} ({aqi_label})**\n\n"
        f"Generate 3 immediate action points specifically for {role_desc}.\n"
        f"Reference Indian environmental law (CPCB/EPA 1986) where relevant.\n"
        f"Focus on actions that can be taken RIGHT NOW given this AQI level."
    )
    try:
        return await asyncio.to_thread(_call_groq, system, prompt, 350)
    except Exception as e:
        return f"AI suggestions unavailable: {e}"
