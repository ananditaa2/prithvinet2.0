import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="AI-Assisted Compliance Copilot API")

# Configure CORS so the frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# Initialize the Groq client ONCE at startup (not per-request)
# This avoids re-establishing connections on every API call.
# ─────────────────────────────────────────────────────────────
API_KEY = os.getenv("XAI_API_KEY")

if not API_KEY:
    print("WARNING: XAI_API_KEY not found. AI analysis will be unavailable.")

groq_client = OpenAI(
    api_key=API_KEY or "missing_key",
    base_url="https://api.groq.com/openai/v1",
    timeout=15.0,   # 15-second hard timeout — avoids hanging forever
    max_retries=1,
) if API_KEY else None


class SimulationRequest(BaseModel):
    region: str
    industry: str
    pollutant: str
    reduction_percentage: float
    current_risk_score: float


def _call_groq(prompt_content: str) -> str:
    """Synchronous Groq call — runs in a thread pool via asyncio.to_thread."""
    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a concise expert environmental compliance analyst. "
                    "Respond in Markdown. Keep answers under 200 words."
                ),
            },
            {"role": "user", "content": prompt_content},
        ],
        max_tokens=350,   # Cap tokens so it returns quickly
        temperature=0.4,
    )
    return response.choices[0].message.content


@app.post("/api/simulate-risk")
async def simulate_risk(request: SimulationRequest):
    """
    Simulates environmental risk score based on proposed pollutant reductions.
    Uses Groq (llama-3.1-8b-instant) for AI analysis, run non-blocking.
    """

    # 1. Quick fallback calculation (always fast)
    reduction_factor = request.reduction_percentage / 100.0
    pollutant_weight = 0.40
    estimated_new_score = round(
        request.current_risk_score * (1 - (reduction_factor * pollutant_weight)), 2
    )

    # 2. AI analysis via Groq (non-blocking — runs in thread pool)
    ai_analysis = "AI analysis unavailable: XAI_API_KEY not configured."

    if groq_client:
        prompt_content = f"""Current Scenario:
- Region: {request.region}
- Industry: {request.industry}
- Current Risk Score: {request.current_risk_score}/100

Proposed Action: Reduce {request.pollutant} emissions by {request.reduction_percentage}%.

Tasks:
1. Brief environmental impact analysis.
2. Estimated new risk score.
3. Key secondary benefits or compliance risks.

Be concise and use Markdown."""

        try:
            # asyncio.to_thread keeps FastAPI's event loop free while waiting for Groq
            ai_analysis = await asyncio.to_thread(_call_groq, prompt_content)
        except asyncio.TimeoutError:
            ai_analysis = "⏱️ AI analysis timed out. The servers may be busy — please try again."
        except Exception as e:
            print(f"Groq API error: {e}")
            ai_analysis = f"Error generating AI analysis: {str(e)}"

    return {
        "scenario": request.dict(),
        "baseline_calculation": {
            "estimated_new_score": estimated_new_score,
            "note": "Based on a simplified regression weight model.",
        },
        "ai_analysis": ai_analysis,
    }


@app.get("/")
def read_root():
    return {"message": "Welcome to the AI-Assisted Compliance Copilot API"}
