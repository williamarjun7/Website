import { useState, useRef, useEffect } from 'react';

const POLLING_INTERVAL_MS = 8000;
const POLLING_TIMEOUT_MS = 15 * 60 * 1000;

export const usePolling = (
    isActive: boolean,
    paymentPrn: string,
    step: number,
    verifyFn: (prn: string) => Promise<{ data?: { success?: boolean } }>,
    onSuccess: () => void,
    onTimeout: () => void
) => {
    const [pollingActive, setPollingActive] = useState(false);
    const pollingStartRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isActive || !paymentPrn || step !== 3) return;
        if (!pollingStartRef.current) pollingStartRef.current = Date.now();

        const interval = setInterval(async () => {
            if (pollingStartRef.current && Date.now() - pollingStartRef.current > POLLING_TIMEOUT_MS) {
                setPollingActive(false);
                onTimeout();
                return;
            }

            const { data } = await verifyFn(paymentPrn);
            if (data?.success) {
                setPollingActive(false);
                pollingStartRef.current = null;
                onSuccess();
            }
        }, POLLING_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [isActive, paymentPrn, step, verifyFn, onSuccess, onTimeout]);

    return { pollingActive, setPollingActive };
};
