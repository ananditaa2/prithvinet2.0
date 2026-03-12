import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

export type LiveEvent = {
    type: 'ANOMALY_ALERT' | 'SYSTEM_UPDATE' | 'DEVICE_OFFLINE';
    message: string;
    timestamp: string;
    data?: any;
};

interface WebSocketContextType {
    isConnected: boolean;
    lastEvent: LiveEvent | null;
    liveDataPayload: any | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
    isConnected: false,
    lastEvent: null,
    liveDataPayload: null,
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<LiveEvent | null>(null);
    const [liveDataPayload, setLiveDataPayload] = useState<any | null>(null);

    useEffect(() => {
        // Connect to FastAPI WebSocket backend
        const wsUrl = "ws://localhost:8000/ws/dashboard";
        let ws: WebSocket;
        let reconnectTimeout: NodeJS.Timeout;

        const connect = () => {
            try {
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    console.log("[WebSocket] Connected to PrithviNet live stream");
                    setIsConnected(true);
                };

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data) as LiveEvent;
                        console.log("[WebSocket] Received Event:", payload);
                        setLastEvent(payload);

                        if (payload.type === 'ANOMALY_ALERT') {
                            // Also store the raw data segment for charts to consume
                            if (payload.data) setLiveDataPayload(payload.data);
                            
                            // Trigger a beautiful toast notification
                            toast.error('LIVE ANOMALY DETECTED', {
                                description: payload.message,
                                duration: 10000,
                            });
                        }
                    } catch (e) {
                        console.error("Failed to parse WebSocket message", e);
                    }
                };

                ws.onclose = () => {
                    console.log("[WebSocket] Disconnected");
                    setIsConnected(false);
                    // Attempt to reconnect after 3 seconds
                    reconnectTimeout = setTimeout(connect, 3000);
                };

                ws.onerror = (err) => {
                    console.error("[WebSocket] Error:", err);
                    ws.close();
                };
            } catch (e) {
                console.error("WebSocket setup error:", e);
                reconnectTimeout = setTimeout(connect, 3000);
            }
        };

        connect();

        return () => {
            clearTimeout(reconnectTimeout);
            if (ws) ws.close();
        };
    }, []);

    return (
        <WebSocketContext.Provider value={{ isConnected, lastEvent, liveDataPayload }}>
            {children}
        </WebSocketContext.Provider>
    );
};
