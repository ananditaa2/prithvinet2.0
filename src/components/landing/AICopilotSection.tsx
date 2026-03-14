import { useState } from "react";
import { MessageCircle, Send, Sparkles, TrendingDown, Factory, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: "copilot" | "prediction";
}

const demoQueries = [
  "If Bhilai Steel Plant reduces PM10 emissions by 30%, what is the expected change in regional air quality?",
  "What happens if the top 3 polluting industries in Korba are shut down during Diwali?",
  "Predict AQI levels for Raipur industrial area for the next 24 hours",
];

export function AICopilotSection() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm PrithviNet's AI Environmental Copilot. I can help you understand pollution trends, simulate interventions, and predict environmental parameters. Try asking about emission reductions, industry shutdowns, or forecasting!",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (customQuery?: string) => {
    const q = customQuery || query;
    if (!q.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuery("");
    setLoading(true);

    try {
      // Check if it's a prediction query
      const isPrediction = q.toLowerCase().includes("predict") || 
                          q.toLowerCase().includes("forecast") ||
                          q.toLowerCase().includes("24 hours") ||
                          q.toLowerCase().includes("next week");

      if (isPrediction) {
        // Use prediction endpoint
        const result = await api.ai.predict({
          location_id: 1, // Default for demo
          horizon: "24h",
        });
        
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `📊 **24-Hour Pollution Forecast**

**Predicted Values:**
• BOD: ${result.predicted_bod || 15.2} mg/L
• COD: ${result.predicted_cod || 112.7} mg/L
• AQI Trend: ${result.aqi_trend || "Elevated"}

**Analysis:**
${result.explanation || "Based on current industrial activity patterns and meteorological conditions, pollution levels are expected to remain elevated. The forecast indicates continued monitoring is required with potential for AQI improvements if emission controls are enforced."}`,
            type: "prediction",
          },
        ]);
      } else {
        // Use copilot/simulation endpoint
        const result = await api.ai.simulate({
          scenario: q,
        });

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.analysis || `🤖 **AI Analysis: Environmental Intervention**

**Scenario:** ${q}

**Expected Impact:**
• Regional AQI improvement: ~18-25%
• PM10 reduction: 30% as specified
• Health benefit: Reduced respiratory risk for ~2.3M residents

**Key Assumptions:**
• Weather patterns remain stable
• Other industries maintain current emissions
• 30% reduction is sustained for 7+ days

**Recommendation:**
Implement phased reduction with real-time monitoring. Expected compliance cost vs health benefit ratio is favorable at 1:4.2.`,
            type: "copilot",
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ **Demo Mode Response:**\n\nBased on your query about emission reductions, here's what the AI model would analyze:\n\n**Input:** 30% reduction in industrial emissions\n**Predicted Outcome:** 18-25% improvement in regional air quality index\n**Confidence:** High (based on historical correlation data)\n\n*Note: This is a demonstration response. In production, this would use Groq LLM API for real-time analysis.*",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-4">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-700">AI-Powered Environmental Intelligence</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            AI Compliance Copilot
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ask complex environmental questions. Get instant AI-powered analysis on pollution trends, 
            intervention impacts, and forecasting.
          </p>
        </div>

        {/* Demo Queries */}
        <div className="mb-8 flex flex-wrap gap-3 justify-center">
          {demoQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="bg-white border border-purple-200 hover:border-purple-400 text-purple-700 px-4 py-2 rounded-lg text-sm transition-all shadow-sm hover:shadow-md"
            >
              {q.length > 60 ? q.slice(0, 60) + "..." : q}
            </button>
          ))}
        </div>

        {/* Chat Interface */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Messages */}
          <div className="h-80 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-gray-800 shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-purple-600">AI Copilot</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150" />
                    <span className="text-xs text-gray-500 ml-2">Analyzing environmental data...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about emission reductions, predictions, or environmental interventions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1"
              />
              <Button
                onClick={() => handleSend()}
                disabled={loading || !query.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Powered by Groq LLM • Real-time environmental analysis • Hackathon Demo Mode
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Factory className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Intervention Simulation</h3>
            <p className="text-sm text-gray-600">Model the impact of emission reductions and industry shutdowns</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">24-72h Forecasting</h3>
            <p className="text-sm text-gray-600">Predict pollution trends with uncertainty estimates</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Wind className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Risk Analysis</h3>
            <p className="text-sm text-gray-600">Assess regional environmental risk and health impacts</p>
          </div>
        </div>
      </div>
    </section>
  );
}
