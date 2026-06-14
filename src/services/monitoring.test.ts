import { describe, it, expect, vi, beforeEach } from 'vitest';
import monitoring from './monitoring';

describe('monitoring', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        monitoring.clear();
        monitoring.setMinLevel('debug');
    });

    describe('log levels', () => {
        it('logs debug messages when min level is debug', () => {
            const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
            monitoring.debug('test debug');
            expect(spy).toHaveBeenCalled();
        });

        it('filters debug messages when min level is info', () => {
            monitoring.setMinLevel('info');
            const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
            monitoring.debug('should not appear');
            expect(spy).not.toHaveBeenCalled();
        });

        it('logs error messages at any level', () => {
            monitoring.setMinLevel('error');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            monitoring.error('critical failure');
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('buffer management', () => {
        it('stores recent logs in buffer', () => {
            monitoring.info('message 1');
            monitoring.info('message 2');
            const logs = monitoring.getRecentLogs(2);
            expect(logs).toHaveLength(2);
            expect(logs[0].message).toBe('message 1');
        });

        it('returns errors only', () => {
            monitoring.info('not an error');
            monitoring.error('actual error');
            const errors = monitoring.getErrors();
            expect(errors).toHaveLength(1);
            expect(errors[0].message).toBe('actual error');
        });
    });

    describe('trackAsync', () => {
        it('tracks successful async operations', async () => {
            const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
            const result = await monitoring.trackAsync('test-op', Promise.resolve('done'));
            expect(result).toBe('done');
            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining('[Highlands]'),
                expect.stringContaining('[PERF] test-op: completed'),
                expect.any(Object)
            );
        });

        it('tracks failed async operations', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('oops');
            await expect(
                monitoring.trackAsync('test-op', Promise.reject(err))
            ).rejects.toThrow('oops');
            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining('[Highlands]'),
                expect.stringContaining('[PERF] test-op: failed'),
                expect.any(Error),
                expect.any(Object)
            );
        });
    });

    describe('entry listeners', () => {
        it('notifies listeners on new entries', () => {
            const listener = vi.fn();
            monitoring.onEntry(listener);
            monitoring.info('hello');
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ level: 'info', message: 'hello' })
            );
        });
    });
});
