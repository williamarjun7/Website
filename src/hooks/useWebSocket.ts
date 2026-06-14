import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';

export const useWebSocket = (onPaymentReceived: (prn: string) => void) => {
    const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected');
    const wsRef = useRef<WebSocket | null>(null);
    const wsReconnectCount = useRef(0);
    const wsReconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wsUrlRef = useRef('');

    const cleanup = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (wsReconnectTimer.current) {
            clearTimeout(wsReconnectTimer.current);
            wsReconnectTimer.current = null;
        }
    }, []);

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    const connect = useCallback((url: string, prn: string) => {
        cleanup();
        wsReconnectCount.current = 0;
        wsUrlRef.current = url;
        setWsStatus('connecting');

        const doConnect = (wsUrl: string) => {
            try {
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    setWsStatus('connected');
                };

                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        const ts = msg.transactionStatus;
                        const paymentDone =
                            msg.status === 'success' ||
                            msg.paymentStatus === 'success' ||
                            msg.response_code === 'successful' ||
                            ts?.paymentSuccess === true ||
                            ts?.qrVerified === true ||
                            ts?.success === true;

                        if (paymentDone) {
                            onPaymentReceived(prn);
                        }
                    } catch {
                        if (typeof event.data === 'string' && (event.data.includes('success') || event.data.includes('SUCCESS'))) {
                            onPaymentReceived(prn);
                        }
                    }
                };

                ws.onerror = () => {
                    setWsStatus('disconnected');
                };

                ws.onclose = () => {
                    setWsStatus('disconnected');
                    wsRef.current = null;
                    if (wsReconnectCount.current < MAX_RECONNECT_ATTEMPTS) {
                        wsReconnectCount.current += 1;
                        wsReconnectTimer.current = setTimeout(() => doConnect(wsUrl), RECONNECT_DELAY_MS);
                    }
                };
            } catch {
                setWsStatus('disconnected');
                if (wsReconnectCount.current < MAX_RECONNECT_ATTEMPTS) {
                    wsReconnectCount.current += 1;
                    wsReconnectTimer.current = setTimeout(() => doConnect(wsUrl), RECONNECT_DELAY_MS);
                }
            }
        };

        doConnect(url);
    }, [onPaymentReceived, cleanup]);

    return { wsStatus, connect, cleanup };
};
