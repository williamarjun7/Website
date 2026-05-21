interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(data: EmailData): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email notification");
    return;
  }

  const from = Deno.env.get("EMAIL_FROM") || "Highlands Motel <noreply@highlands-motel.com>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: data.to,
      subject: data.subject,
      html: data.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Email send failed: ${res.status} ${err}`);
  }
}

export function buildBookingConfirmationHtml(params: {
  guestName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  bookingId: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;padding:24px;max-width:600px">
  <h2 style="color:#92400e">Booking Confirmed — Highlands Motel & Cafe</h2>
  <p>Dear ${params.guestName},</p>
  <p>Your booking at Highlands Motel & Cafe has been confirmed.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Room</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${params.roomName}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Check-in</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${params.checkIn}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Check-out</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${params.checkOut}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Total</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>NPR ${params.totalPrice.toLocaleString()}</strong></td></tr>
    <tr><td style="padding:8px;color:#666">Booking ID</td><td style="padding:8px"><code>${params.bookingId}</code></td></tr>
  </table>
  <p style="color:#666;font-size:14px">If you have any questions, contact us at the property.</p>
  <p style="font-size:12px;color:#999">— Highlands Motel & Cafe</p>
</body>
</html>`;
}
