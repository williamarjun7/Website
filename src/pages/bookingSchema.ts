import { z } from 'zod';

export const bookingSchema = z.object({
  guest_name: z.string().min(2, 'Name must be at least 2 characters'),
  guest_email: z.string().email('Please enter a valid email address'),
  guest_phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\d{7,15}$/, 'Please enter a valid phone number'),
  paymentMethod: z.enum(['pay_at_property', 'fonepay_qr', 'fonepay_web']),
  special_requests: z.string().max(1000, 'Special requests must be under 1000 characters').optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
