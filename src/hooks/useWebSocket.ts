import { useRef, useCallback, useState } from 'react';

type WsStatus = 'disconnected' | 'connecting' | 'connected';

export const useWebSocket = (onMessage: (data: string) => void) => {
    const wsRef = useRef<WebSocket | null>(null);
    const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected');

    const connect = useCallback((url: string, prn: string) => {
        if (wsRef.current) wsRef.current.close();
        try {
            setWsStatus('connecting');
            const ws = new WebSocket(`${url}?prn=${prn}`);
            ws.onopen = () => setWsStatus('connected');
            ws.onmessage = (event) => {
                onMessage(event.data);
                ws.close();
            };
            ws.onclose = () => setWsStatus('disconnected');
            ws.onerror = () => setWsStatus('disconnected');
            wsRef.current = ws;
        } catch {
            setWsStatus('disconnected');
        }
    }, [onMessage]);

    const cleanup = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setWsStatus('disconnected');
    }, []);

    return { wsStatus, connect, cleanup };
};
