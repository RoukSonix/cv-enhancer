import { Resend } from "resend";

interface RewriteOrderInfo {
  id: string;
  email: string;
  tier: string;
  notes: string | null;
}

export async function sendAdminOrderNotification(order: RewriteOrderInfo): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;

  if (!adminEmail || !apiKey) {
    console.warn("Skipping admin notification: ADMIN_EMAIL or RESEND_API_KEY not set");
    return;
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: "Resume Roaster <noreply@resumeroaster.com>",
      to: adminEmail,
      subject: `New Rewrite Order: ${order.tier.toUpperCase()} — ${order.email}`,
      html: `
        <h2>New Rewrite Order</h2>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Customer:</strong> ${order.email}</p>
        <p><strong>Tier:</strong> ${order.tier}</p>
        ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ""}
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://resumeroaster.com"}/admin/orders">View Orders Dashboard</a></p>
      `,
    });
  } catch (err) {
    console.error("Failed to send admin order notification:", err);
  }
}
