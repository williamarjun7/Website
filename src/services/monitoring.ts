export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
    error?: { name: string; message: string; stack?: string };
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const LOG_PREFIX = '[Highlands]';

class MonitoringService {
    private minLevel: LogLevel = 'info';
    private buffer: LogEntry[] = [];
    private readonly MAX_BUFFER = 200;
    private listeners: Array<(entry: LogEntry) => void> = [];

    setMinLevel(level: LogLevel) {
        this.minLevel = level;
    }

    onEntry(callback: (entry: LogEntry) => void) {
        this.listeners.push(callback);
    }

    private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
        if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            error: error instanceof Error
                ? { name: error.name, message: error.message, stack: error.stack }
                : undefined,
        };

        this.buffer.push(entry);
        if (this.buffer.length > this.MAX_BUFFER) {
            this.buffer.shift();
        }

        const prefix = `${LOG_PREFIX} [${level.toUpperCase()}]`;
        switch (level) {
            case 'debug': console.debug(prefix, message, context || ''); break;
            case 'info': console.info(prefix, message, context || ''); break;
            case 'warn': console.warn(prefix, message, context || ''); break;
            case 'error': console.error(prefix, message, error || '', context || ''); break;
        }

        this.listeners.forEach(fn => fn(entry));
    }

    debug(message: string, context?: Record<string, unknown>) { this.log('debug', message, context); }
    info(message: string, context?: Record<string, unknown>) { this.log('info', message, context); }
    warn(message: string, context?: Record<string, unknown>) { this.log('warn', message, context); }
    error(message: string, error?: unknown, context?: Record<string, unknown>) { this.log('error', message, context, error); }

    getRecentLogs(count = 50): LogEntry[] {
        return this.buffer.slice(-count);
    }

    getErrors(): LogEntry[] {
        return this.buffer.filter(e => e.level === 'error');
    }

    clear(): void {
        this.buffer = [];
        this.listeners = [];
    }

    trackAsync<T>(label: string, promise: Promise<T>, context?: Record<string, unknown>): Promise<T> {
        const start = performance.now();
        this.debug(`[PERF] ${label}: started`, context);
        return promise
            .then(result => {
                const elapsed = (performance.now() - start).toFixed(2);
                this.info(`[PERF] ${label}: completed in ${elapsed}ms`, { ...context, elapsedMs: elapsed });
                return result;
            })
            .catch(err => {
                const elapsed = (performance.now() - start).toFixed(2);
                this.error(`[PERF] ${label}: failed after ${elapsed}ms`, err, { ...context, elapsedMs: elapsed });
                throw err;
            });
    }

    trackServiceCall<T>(service: string, operation: string, fn: () => Promise<T>): Promise<T> {
        return this.trackAsync(`${service}.${operation}`, fn(), { service, operation });
    }
}

export const monitoring = new MonitoringService();
export default monitoring;
