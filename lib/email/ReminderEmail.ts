import { formatAUD, formatDate } from "@/lib/utils";

interface ReminderEmailProps {
  invoice: any;
  user: any;
  customer: any;
  message: string;
  tone: "friendly" | "firm" | "final";
  appUrl: string;
}

export function buildReminderEmail({
  invoice,
  user,
  customer,
  message,
  tone,
  appUrl,
}: ReminderEmailProps): {
  subject: string;
  html: string;
} {
  const brand = user.brandColour ?? "#f97316";
  const businessName = user.businessName ?? user.name;
  const viewUrl = `${appUrl}/invoice/${invoice.publicToken}`;

  const subjectMap = {
    friendly: `Friendly reminder: Invoice ${invoice.invoiceNumber} — ${formatAUD(Number(invoice.total))} due`,
    firm: `Action required: Invoice ${invoice.invoiceNumber} — ${formatAUD(Number(invoice.total))} overdue`,
    final: `Final notice: Invoice ${invoice.invoiceNumber} — ${formatAUD(Number(invoice.total))} OVERDUE`,
  };

  const bannerMap = {
    friendly: { bg: "#eff6ff", color: "#1d4ed8", text: "Payment Reminder" },
    firm: { bg: "#fef9c3", color: "#a16207", text: "Payment Required" },
    final: { bg: "#fee2e2", color: "#dc2626", text: "Final Notice" },
  };

  const banner = bannerMap[tone];

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subjectMap[tone]}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

          <tr><td style="background:${brand};height:6px;"></td></tr>

          <tr>
            <td style="background:${banner.bg};padding:12px 40px;">
              <p style="margin:0;color:${banner.color};font-size:14px;font-weight:bold;">${banner.text}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 16px;">
              ${user.logoUrl
                ? `<img src="${user.logoUrl}" alt="${businessName}" style="height:40px;object-fit:contain;" />`
                : `<h2 style="margin:0;color:${brand};font-size:20px;">${businessName}</h2>`
              }
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px;">
              <div style="white-space:pre-line;color:#374151;font-size:15px;line-height:1.7;margin-bottom:24px;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>

              <!-- Invoice summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">
                    <strong style="color:#111827;">Invoice:</strong> ${invoice.invoiceNumber}
                  </td>
                </tr>
                ${invoice.dueDate ? `
                <tr>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">
                    <strong style="color:#111827;">Due:</strong> ${formatDate(invoice.dueDate)}
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="padding-top:10px;border-top:1px solid #e5e7eb;">
                    <span style="font-size:20px;font-weight:bold;color:${banner.color};">${formatAUD(Number(invoice.total))} AUD</span>
                  </td>
                </tr>
              </table>

              <!-- Payment details -->
              ${(user.bankBsb || user.bankAccount) ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px;padding:14px;margin-bottom:24px;">
                ${user.bankName ? `<tr><td style="font-size:13px;color:#374151;padding-bottom:3px;"><strong>Account Name:</strong> ${user.bankName}</td></tr>` : ""}
                ${user.bankBsb ? `<tr><td style="font-size:13px;color:#374151;padding-bottom:3px;"><strong>BSB:</strong> ${user.bankBsb}</td></tr>` : ""}
                ${user.bankAccount ? `<tr><td style="font-size:13px;color:#374151;padding-bottom:3px;"><strong>Account:</strong> ${user.bankAccount}</td></tr>` : ""}
                <tr><td style="font-size:12px;color:#6b7280;font-style:italic;padding-top:6px;">Ref: ${invoice.invoiceNumber}</td></tr>
              </table>` : ""}

              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${brand};border-radius:6px;">
                    <a href="${viewUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
                      View Invoice →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                ${businessName}${user.abn ? ` · ABN ${user.abn}` : ""}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: subjectMap[tone], html };
}
