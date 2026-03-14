import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAICopilot, type ChatMessage, type AlertContext } from "@/context/AICopilotContext";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  Sparkles,
  Minimize2,
  Maximize2,
  Trash2,
} from "lucide-react";

interface ResponsePattern {
  keywords: string[];
  responses: string[];
}

const RESPONSE_PATTERNS: ResponsePattern[] = [
  // Greetings
  {
    keywords: ["hi", "hey", "hello", "hyy", "greetings", "good morning", "good afternoon", "good evening"],
    responses: [
      "Hello! I'm Prithvi Copilot, your CECB compliance assistant. I can help with: Air/Water/Noise standards, EPA penalties, SOPs, compliance requirements, monitoring data, and dashboard features. What do you need?",
      "Hey there! I'm your environmental compliance AI. Ask me about: pollution limits, violation procedures, legal penalties, monitoring stations, heatmap data, or how to file reports.",
    ],
  },

  // Air Quality Standards
  {
    keywords: ["pm10", "pm 10", "particulate matter 10"],
    responses: [
      "PM10 (Particulate Matter ≤10 micrometers): CECB safe limit is 100 µg/m³ (24-hour average). Critical above 250 µg/m³. Sources: dust, vehicle emissions, industrial processes. Health impact: respiratory issues, cardiovascular problems.",
      "PM10 Standards: Good (0-50), Satisfactory (51-100), Moderate (101-250), Poor (251-350), Severe (351-430), Hazardous (>430). Current alert at Siltara shows 285 µg/m³ - nearly 3x the safe limit!",
    ],
  },
  {
    keywords: ["pm2.5", "pm 2.5", "particulate matter 2.5"],
    responses: [
      "PM2.5 (fine particles ≤2.5 micrometers): CECB limit is 60 µg/m³. These particles penetrate deep into lungs and bloodstream. Major sources: combustion, vehicles, industrial emissions, biomass burning.",
      "PM2.5 is more dangerous than PM10 as it can enter the bloodstream. Safe limit: 60 µg/m³. Current readings in industrial zones often exceed 100 µg/m³ during peak hours.",
    ],
  },
  {
    keywords: ["aqi", "air quality index", "air quality"],
    responses: [
      "AQI (Air Quality Index) combines PM10, PM2.5, NO2, SO2, CO, and O3. CECB monitors 32 stations across Chhattisgarh. Good (0-50), Satisfactory (51-100), Moderately Polluted (101-200), Poor (201-300), Very Poor (301-400), Severe (>400).",
      "PrithviNet tracks real-time AQI from 25 air monitoring stations. Current violations: 5 stations reporting poor air quality. Check the Heatmap view for spatial distribution of pollution levels.",
    ],
  },
  {
    keywords: ["no2", "nitrogen dioxide", "so2", "sulfur dioxide", "co", "carbon monoxide", "o3", "ozone"],
    responses: [
      "CECB monitors multiple pollutants: NO2 (vehicles/industry), SO2 (power plants), CO (incomplete combustion), O3 (photochemical smog). Each has specific safe limits under the Air (Prevention & Control of Pollution) Act.",
      "NO2 safe limit: 80 µg/m³ | SO2 safe limit: 80 µg/m³ | CO safe limit: 2 mg/m³ | O3 safe limit: 100 µg/m³. Exceeding these triggers automatic alerts and violation notices.",
    ],
  },

  // Water Quality Standards
  {
    keywords: ["ph", "water ph", "ph level", "acidic", "alkaline"],
    responses: [
      "pH measures water acidity/alkalinity. CECB safe range: 6.5 to 8.5. Below 6.5 = acidic (harmful to aquatic life). Above 8.5 = alkaline (scale formation, poor disinfection). Korba River currently at 4.2 - CRITICAL acidification!",
      "pH violations require immediate neutralization. Treatment: add lime for acidic water, add CO2/acids for alkaline water. Must report pH deviations to CECB within 4 hours of detection.",
    ],
  },
  {
    keywords: ["bod", "biochemical oxygen demand"],
    responses: [
      "BOD measures organic pollution in water. Safe limit: <3 mg/L (drinking), <15 mg/L (industrial discharge). Higher BOD = more organic matter = less oxygen for aquatic life. Korba showing elevated BOD at 18.5 mg/L.",
      "BOD Levels: Clean (<3), Moderately Polluted (3-15), Heavily Polluted (>15). Treatment requires biological processes - activated sludge, trickling filters, or constructed wetlands.",
    ],
  },
  {
    keywords: ["cod", "chemical oxygen demand"],
    responses: [
      "COD measures total chemical pollutants (organic + inorganic). Safe discharge limit: 250 mg/L. Industrial effluent often has COD 500-2000 mg/L requiring primary, secondary, and tertiary treatment before discharge.",
      "COD vs BOD: COD includes all oxidizable matter, BOD only biological. COD/BOD ratio >3 indicates significant industrial pollution. Must treat to <250 mg/L before discharge to rivers.",
    ],
  },
  {
    keywords: ["dissolved oxygen", "do", "oxygen in water"],
    responses: [
      "Dissolved Oxygen (DO) is essential for aquatic life. Safe minimum: 4 mg/L. Fish kills occur below 2 mg/L. High BOD/COD reduces DO. Current reading at Korba: 2.1 mg/L - DANGERously low for fish survival.",
      "DO Levels: Excellent (>6), Good (4-6), Fair (2-4), Poor (<2). Industrial discharge must not reduce receiving water DO by >0.5 mg/L. Aeration required for wastewater treatment.",
    ],
  },
  {
    keywords: ["turbidity", "water clarity", "suspended solids"],
    responses: [
      "Turbidity measures water cloudiness from suspended particles. Safe limit: <5 NTU (drinking), <10 NTU (industrial). High turbidity reduces disinfection effectiveness and indicates erosion/pollution.",
    ],
  },
  {
    keywords: ["coliform", "fecal coliform", "bacteria in water"],
    responses: [
      "Coliform bacteria indicate fecal contamination. Safe limit: 0 MPN/100mL (drinking), <50 MPN/100mL (recreational). Presence indicates sewage contamination - immediate health risk for drinking water.",
    ],
  },

  // Noise Pollution
  {
    keywords: ["noise", "decibel", "db", "sound pollution", "noise level"],
    responses: [
      "Noise limits (dB): Residential zone - 55 day / 45 night | Commercial - 65 day / 55 night | Industrial - 75 day / 70 night. Jindal Industrial showing 112 dB - 37 dB OVER the limit!",
      "Health effects: >85 dB causes hearing damage, >70 dB causes stress/sleep disruption. Continuous exposure above limits requires: noise barriers, equipment maintenance, operational time restrictions.",
    ],
  },
  {
    keywords: ["noise standards", "noise limits", "db limits"],
    responses: [
      "CPCB Noise Standards (dB): Industrial Zone - Day 75, Night 70 | Commercial - Day 65, Night 55 | Residential - Day 55, Night 45 | Silence Zone - Day 50, Night 40. Violation = penalty under EPA.",
    ],
  },

  // Legal Framework & Penalties
  {
    keywords: ["epa", "environment protection act", "section 15"],
    responses: [
      "Environment (Protection) Act, 1986: Section 15 - General Penalty = Up to 5 years imprisonment + ₹1 Lakh fine + ₹5,000/day for continuing violations. Section 16 - Companies liable for violations by officers.",
      "EPA 1986 is India's umbrella environmental law. It empowers CECB to: set standards, monitor compliance, issue closure orders, levy penalties. Recent amendments increased penalties 10x for repeat offenders.",
    ],
  },
  {
    keywords: ["water act", "water prevention act", "1974"],
    responses: [
      "Water (Prevention & Control of Pollution) Act, 1974: Prohibits discharge of pollutants into water bodies without CECB consent. Penalties: 3 years imprisonment + ₹10,000 fine. CECB can issue closure orders for violations.",
    ],
  },
  {
    keywords: ["air act", "air prevention act", "1981"],
    responses: [
      "Air (Prevention & Control of Pollution) Act, 1981: Requires CECB consent for industrial emissions. Penalties: 6 years imprisonment + ₹5,000/day for continuing violations. Mandates use of pollution control equipment.",
    ],
  },
  {
    keywords: ["penalty", "fine", "punishment", "what is the penalty", "how much fine"],
    responses: [
      "EPA Section 15: Up to 5 years imprisonment OR ₹1 Lakh fine OR both. Continuing violations: additional ₹5,000/day. Company directors/officers personally liable. Recent cases show actual imprisonment for severe violations.",
      "Penalties vary by violation severity: Minor (₹10,000-50,000) | Major (₹50,000-1 Lakh + imprisonment) | Critical (closure order + prosecution). Repeat offenders face 2x penalties.",
    ],
  },

  // Compliance & SOPs
  {
    keywords: ["compliance", "how to comply", "requirements", "what should i do", "steps to follow"],
    responses: [
      "CECB Compliance Roadmap: (1) Obtain consent to establish/operate, (2) Install pollution control equipment, (3) Conduct self-monitoring daily, (4) Submit monthly returns, (5) Allow CECB inspections, (6) Maintain 5-year records.",
      "For immediate violation compliance: STOP the process → Contain the pollution → Notify CECB (4 hrs) → Submit incident report (24 hrs) → Implement corrective action (48 hrs) → Request compliance verification.",
    ],
  },
  {
    keywords: ["sop", "standard operating procedure", "protocol", "procedure"],
    responses: [
      "CECB Critical Violation SOP - 5 Phases: (1) Immediate Containment (0-2 hrs) - Stop source, deploy emergency response, (2) Notification (2-4 hrs) - Alert CECB, Regional Officer, (3) Assessment (4-24 hrs) - Root cause analysis, mitigation plan, (4) Verification (24-72 hrs) - Monitoring, third-party audit, (5) Closure - Compliance certificate, incident closure.",
    ],
  },
  {
    keywords: ["consent", "consent to establish", "consent to operate", "cto", "cte"],
    responses: [
      "Consent to Establish (CTE): Required BEFORE setting up industry. Valid 5 years. Consent to Operate (CTO): Required BEFORE starting operations. Valid 5 years (Red category), 10 years (Orange), 15 years (Green). Both require renewal applications 120 days before expiry.",
    ],
  },
  {
    keywords: ["timeline", "deadline", "how long", "when", "time limit"],
    responses: [
      "CECB Critical Response Timelines: Alert detection → 30 min acknowledgment → 2 hrs initial containment → 4 hrs CECB notification → 24 hrs incident report → 48 hrs corrective action → 72 hrs compliance verification → 7 days full remediation.",
    ],
  },

  // Dashboard & App Features
  {
    keywords: ["heatmap", "map", "environmental intelligence map", "monitoring stations"],
    responses: [
      "The Heatmap shows real-time pollution across Chhattisgarh with 32 monitoring stations. Red zones = Critical violations, Orange = High alerts, Yellow = Medium. Click any hotspot for station details. Use filters for Air/Water/Noise layers.",
      "Heatmap Features: (1) 32 live stations across 5 regions, (2) 4 crisis zones currently active, (3) Toggle Air/Water/Noise layers, (4) Click markers for real-time readings, (5) Historical data view, (6) Focus on specific violations like Raigarh.",
    ],
  },
  {
    keywords: ["alerts", "violation alerts", "critical alerts", "notification"],
    responses: [
      "Alert System: Bell icon shows active violations. Critical alerts trigger: (1) Dashboard notification, (2) Email to Regional Officer, (3) SMS to industry contact, (4) Escalation timer (2-4-24 hr). Current: 5 Air, 3 Water, 4 Noise violations active.",
    ],
  },
  {
    keywords: ["dashboard", "overview", "prithvinet features", "what can this app do"],
    responses: [
      "PrithviNet Features: (1) Real-time monitoring - 32 stations, (2) Heatmap visualization, (3) AI-powered alert system, (4) Industry compliance tracking, (5) Automated reporting, (6) Citizen grievance portal, (7) Inspection priority ranking, (8) CECB document management.",
    ],
  },
  {
    keywords: ["industries", "industry list", "violating industries", "compliant industries"],
    responses: [
      "Industry Dashboard tracks: Total industries, Compliance status (Compliant/Violating/Suspended), Region-wise breakdown, Violation history, Contact details. Currently tracking steel plants, power plants, cement factories across Chhattisgarh.",
    ],
  },
  {
    keywords: ["reports", "daily report", "compliance report", "generate report"],
    responses: [
      "Report Types: (1) Daily summary - active alerts, readings summary, (2) Industry compliance - violation status, corrective actions, (3) Regional - zone-wise pollution trends, (4) Custom date range with CSV/PDF export. Auto-generated at midnight daily.",
    ],
  },
  {
    keywords: ["citizen portal", "public portal", "file complaint", "grievance"],
    responses: [
      "Citizen Portal (prithvinet.gov.in/public): (1) View real-time AQI in your area, (2) File pollution complaints with photo evidence, (3) Track complaint status, (4) Access environmental advisories, (5) View industry compliance ratings. Anonymous complaints accepted.",
    ],
  },
  {
    keywords: ["ai tools", "predictive", "anomaly detection", "inspection priority"],
    responses: [
      "AI Tools: (1) Predictive analytics - forecast violations 48hrs ahead, (2) Anomaly detection - ML identifies unusual readings, (3) Inspection Priority - AI ranks industries by risk score, (4) Cases to Act - auto-generated enforcement recommendations, (5) What-if simulation - model compliance scenarios.",
    ],
  },

  // Documentation
  {
    keywords: ["report", "documentation", "forms", "submit", "paperwork"],
    responses: [
      "Required Documentation: (1) Form CECB-01: Incident Report (within 24 hrs), (2) Form CECB-02: Monthly Returns, (3) Form CECB-03: Consent Applications, (4) Monitoring Data: 72-hour continuous logs, (5) Photographic evidence, (6) Corrective action completion proof.",
    ],
  },

  // Regional Information
  {
    keywords: ["chhattisgarh", "raipur", "bilaspur", "korba", "raigarh", "bhilai", "jagdalpur"],
    responses: [
      "Chhattisgarh Industrial Regions: Raipur (Steel, Cement), Bilaspur (Power, Mining), Korba (Power Plants - NTPC, BALCO), Raigarh (Steel, Sponge Iron), Bhilai (SAIL Steel Plant). Each has dedicated CECB Regional Office and monitoring stations.",
    ],
  },

  // Emergency Response
  {
    keywords: ["emergency", "spill", "leak", "accident", "immediate action"],
    responses: [
      "EMERGENCY RESPONSE: (1) Evacuate personnel if toxic, (2) Contain at source - valves, barriers, absorbents, (3) Alert emergency services - 108 (ambulance), 101 (fire), (4) Notify CECB Emergency Hotline: +91-XXXXX-XXXXX (24/7), (5) Document with photos/videos, (6) Do NOT hide incident - criminal liability under EPA.",
    ],
  },

  // Pollution Definitions
  {
    keywords: ["what is noise pollution", "what is air pollution", "what is water pollution", "define pollution"],
    responses: [
      "Air Pollution: Presence of substances in atmosphere at concentrations harmful to humans, animals, vegetation, or property. Major pollutants: PM10, PM2.5, NO2, SO2, CO, O3, NH3, Pb.",
      "Water Pollution: Contamination of water bodies making them unsafe for intended use. Parameters: pH, BOD, COD, DO, TSS, heavy metals, pathogens. Sources: industrial discharge, sewage, agricultural runoff.",
      "Noise Pollution: Unwanted sound that interferes with normal activities or causes adverse health effects. Measured in decibels (dB). Sources: industrial machinery, vehicles, construction, mining.",
    ],
  },

  // Community & Grievances
  {
    keywords: ["industry pollution", "my area", "polluted", "affecting my", "pollution in my"],
    responses: [
      "Community Action Steps: (1) Document pollution - photos, videos, timestamps, (2) Note specific health effects - respiratory issues, water contamination, (3) Collect signatures from 10+ affected residents, (4) File complaint: CECB Citizen Portal, email grievance@cecb.gov.in, or toll-free 1800-XXX-XXXX, (5) Request public hearing under EPA Section 19, (6) Escalate to National Green Tribunal if no action in 60 days.",
    ],
  },

  // Contact Information
  {
    keywords: ["who to contact", "contact", "helpline", "phone", "email", "officer"],
    responses: [
      "CECB Contact Directory: Toll-free: 1800-XXX-XXXX | Email: grievance@cecb.gov.in | Emergency (24/7): +91-XXXXX-XXXXX | Raipur RO: ro-raipur@cecb.gov.in | Bilaspur RO: ro-bilaspur@cecb.gov.in | Korba RO: ro-korba@cecb.gov.in",
    ],
  },

  // Help/Capabilities
  {
    keywords: ["help", "what can you do", "capabilities", "features", "how to use"],
    responses: [
      "I am Prithvi Copilot, trained on CECB regulations and PrithviNet features. I can answer: (1) Pollution standards (Air/Water/Noise), (2) EPA/Water Act/Air Act provisions, (3) Penalties and legal consequences, (4) Compliance procedures and SOPs, (5) Dashboard features and navigation, (6) Emergency response protocols, (7) Documentation requirements. Just ask your question!",
    ],
  },

  // Thank you/Goodbye
  {
    keywords: ["thank you", "thanks", "bye", "goodbye", "ok", "okay", "got it"],
    responses: [
      "You're welcome! I'm here 24/7 for any CECB compliance questions. Stay compliant, stay safe!",
      "Glad I could help! Feel free to ask about pollution standards, SOPs, or dashboard features anytime.",
      "Happy to assist! For urgent violations, remember: 2 hours containment, 4 hours notification to CECB.",
    ],
  },
];

const GENERIC_RESPONSES = [
  "I understand you're asking about '{topic}'. I specialize in CECB compliance procedures, penalties, and SOPs. Could you clarify if this relates to air quality, water discharge, noise, or hazardous waste violations?",
  "Thanks for your query about '{topic}'. I can provide: penalty information under EPA 1986, step-by-step SOPs, documentation requirements, and contact details. Which aspect would be most helpful?",
  "Regarding '{topic}' - this falls under environmental compliance regulations. I can guide you through: required timelines, penalty structures, documentation needs, or corrective actions.",
];

const getRandomResponse = (responses: string[]): string => {
  return responses[Math.floor(Math.random() * responses.length)];
};

const generateAIResponse = (userMessage: string, context: AlertContext | null): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  for (const pattern of RESPONSE_PATTERNS) {
    const hasMatch = pattern.keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
    if (hasMatch) {
      const response = getRandomResponse(pattern.responses);
      return context 
        ? response.replace(/{location}/g, context.location).replace(/{pollutant}/g, context.pollutant || "pollutant")
        : response;
    }
  }
  
  const topic = userMessage.slice(0, 30) + (userMessage.length > 30 ? "..." : "");
  return getRandomResponse(GENERIC_RESPONSES).replace(/{topic}/g, topic);
};

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <Avatar className={`w-8 h-8 flex-shrink-0 ${isUser ? "bg-blue-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
        <AvatarFallback className="text-white text-xs">
          {isUser ? "YOU" : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3">
      <Avatar className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600">
        <AvatarFallback className="text-white text-xs"><Bot className="w-4 h-4" /></AvatarFallback>
      </Avatar>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-blue-400" />
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 rounded-full bg-blue-400" />
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 rounded-full bg-blue-400" />
        </div>
      </div>
    </motion.div>
  );
}

export function FloatingAICopilot() {
  const { isOpen, toggleCopilot, closeCopilot, messages, addMessage, clearMessages, alertContext } = useAICopilot();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userContent = inputValue.trim();
    setInputValue("");

    addMessage({ role: "user", content: userContent });
    setIsTyping(true);

    const processingTime = Math.min(1500 + userContent.length * 20, 3000);

    setTimeout(() => {
      setIsTyping(false);
      const response = generateAIResponse(userContent, alertContext);
      addMessage({ role: "assistant", content: response });
    }, processingTime);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleCopilot}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:shadow-blue-500/50 transition-shadow"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-6 right-6 z-50 w-[380px] bg-white rounded-2xl shadow-2xl shadow-blue-900/20 border border-gray-200 overflow-hidden ${isMinimized ? "h-14" : "h-[500px]"}`}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Prithvi Copilot</h3>
                  <p className="text-[10px] text-blue-100">
                    {alertContext ? `Context: ${alertContext.location}` : "AI Compliance Assistant"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="w-7 h-7 text-white/80 hover:text-white hover:bg-white/20" onClick={() => setIsMinimized(!isMinimized)}>
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-white/80 hover:text-white hover:bg-white/20" onClick={clearMessages} title="Clear chat">
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-white/80 hover:text-white hover:bg-white/20" onClick={closeCopilot}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <ScrollArea ref={scrollRef} className="h-[380px] px-4 py-4 bg-slate-50">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <ChatBubble key={message.id} message={message} />
                    ))}
                    {isTyping && <TypingIndicator />}
                  </div>
                </ScrollArea>

                <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about compliance, penalties, SOPs..."
                      className="flex-1 h-10 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isTyping}
                      size="icon"
                      className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">Powered by CECB Compliance Intelligence</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default FloatingAICopilot;
