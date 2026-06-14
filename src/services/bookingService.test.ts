import { describe, it, expect } from 'vitest';
import { calculateTotalPrice, calculateAdvanceAmount, calculateBalanceAmount } from './bookingService';

describe('bookingService', () => {
    describe('calculateTotalPrice', () => {
        it('calculates 1 night correctly', () => {
            expect(calculateTotalPrice(2000, '2026-06-01', '2026-06-02')).toBe(2000);
        });

        it('calculates multiple nights correctly', () => {
            expect(calculateTotalPrice(1700, '2026-06-01', '2026-06-05')).toBe(6800);
        });

        it('handles zero nights', () => {
            expect(calculateTotalPrice(2000, '2026-06-01', '2026-06-01')).toBe(0);
        });

        it('handles same-day checkout gracefully', () => {
            expect(calculateTotalPrice(2500, '2026-06-01', '2026-06-01')).toBe(0);
        });
    });

    describe('calculateAdvanceAmount', () => {
        it('returns 60% of total', () => {
            expect(calculateAdvanceAmount(1000)).toBe(600);
        });

        it('handles rounding correctly', () => {
            expect(calculateAdvanceAmount(1667)).toBe(1000.2);
        });

        it('handles zero', () => {
            expect(calculateAdvanceAmount(0)).toBe(0);
        });
    });

    describe('calculateBalanceAmount', () => {
        it('returns 40% of total', () => {
            expect(calculateBalanceAmount(1000)).toBe(400);
        });

        it('advance + balance equals total', () => {
            const total = 5678;
            expect(calculateAdvanceAmount(total) + calculateBalanceAmount(total)).toBe(total);
        });
    });
});
