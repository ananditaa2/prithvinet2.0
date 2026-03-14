import React, { createContext, useContext, useState, useCallback } from "react";

export interface AlertContext {
  id: string;
  title: string;
  location: string;
  severity: "critical" | "high" | "medium" | "low";
  pollutant?: string;
  value?: string;
  message?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Context-aware greetings for different pollutant types
const CONTEXTUAL_GREETINGS: Record<string, string[]> = {
  PM10: [
    "🚨 Critical PM10 breach detected at {location}! Levels at {value} are nearly 3x the safe limit (100 µg/m³). This poses serious respiratory health risks to nearby communities. Let me guide you through immediate containment procedures.",
    "Alert: PM10 particulate matter at {location} has reached hazardous levels of {value}. We need to act within 2 hours to avoid escalation. What's your current containment status?",
  ],
  pH: [
    "⚠️ Water pH at {location} is critically {value} - this is severe acidification (normal: 6.5-8.5). Aquatic ecosystems are at immediate risk. pH must be normalized within 6 hours. Let's discuss neutralization strategies now.",
  ],
  Decibel: [
    "🔊 Noise violation at {location}: {value} exceeds the 75 dB daytime industrial limit. This affects nearby residential zones. Noise barriers or immediate operational schedule changes needed. Want me to pull up the noise mitigation SOP?",
  ],
  default: [
    "🚨 I see a critical {severity} alert at {location} involving {pollutant}. The measured value of {value} requires immediate action per CECB protocols. Response window is 2 hours. How can I assist with containment?",
  ],
};

const generateContextualGreeting = (context: AlertContext): string => {
  const greetings = CONTEXTUAL_GREETINGS[context.pollutant || "default"] || CONTEXTUAL_GREETINGS.default;
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  return greeting
    .replace(/{location}/g, context.location)
    .replace(/{pollutant}/g, context.pollutant || "pollutant")
    .replace(/{value}/g, context.value || "measured value")
    .replace(/{severity}/g, context.severity.toUpperCase());
};

interface AICopilotContextType {
  isOpen: boolean;
  openCopilot: (alertContext?: AlertContext) => void;
  closeCopilot: () => void;
  toggleCopilot: () => void;
  alertContext: AlertContext | null;
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  triggerSimulatedConversation: (alert: AlertContext) => void;
  isTyping: boolean;
}

const AICopilotContext = createContext<AICopilotContextType | undefined>(undefined);

export function AICopilotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [alertContext, setAlertContext] = useState<AlertContext | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm Prithvi Copilot, your AI assistant for environmental compliance. How can I help you today?",
      timestamp: new Date(),
    },
  ]);

  const openCopilot = useCallback((context?: AlertContext) => {
    if (context) {
      setAlertContext(context);
    }
    setIsOpen(true);
  }, []);

  const closeCopilot = useCallback(() => {
    setIsOpen(false);
    setAlertContext(null);
  }, []);

  const toggleCopilot = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm Prithvi Copilot, your AI assistant for environmental compliance. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Trigger simulated conversation from notification
  const triggerSimulatedConversation = useCallback((alert: AlertContext) => {
    setAlertContext(alert);
    setIsOpen(true);
    
    // Clear previous messages and start fresh
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm Prithvi Copilot, your AI assistant for environmental compliance. How can I help you today?",
        timestamp: new Date(),
      },
    ]);

    // Add user message after a short delay
    setTimeout(() => {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: `What is the SOP and penalty for the critical ${alert.pollutant} breach at ${alert.location}?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      
      // Show typing indicator
      setIsTyping(true);
      
      // Add bot response after 1.5 seconds
      setTimeout(() => {
        setIsTyping(false);
        const botResponse: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: `🚨 ${alert.location} ${alert.pollutant} Breach SOP:\n1. Immediate Action: Dispatch Regional Officer for site inspection.\n2. Compliance Directive: Issue a Show Cause Notice under Section 21 of the Air Act.\n3. Penalty: Maximum penalty is ₹1 Lakh and/or up to 5 years imprisonment.\nWould you like me to draft the Show Cause Notice PDF?`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botResponse]);
      }, 1500);
    }, 300);
  }, []);

  return (
    <AICopilotContext.Provider
      value={{
        isOpen,
        openCopilot,
        closeCopilot,
        toggleCopilot,
        alertContext,
        messages,
        addMessage,
        clearMessages,
        triggerSimulatedConversation,
        isTyping,
      }}
    >
      {children}
    </AICopilotContext.Provider>
  );
}

export function useAICopilot() {
  const context = useContext(AICopilotContext);
  if (context === undefined) {
    throw new Error("useAICopilot must be used within an AICopilotProvider");
  }
  return context;
}
