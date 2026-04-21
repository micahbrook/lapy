import { formatAUD, formatDate, daysOverdue } from "@/lib/utils";

interface InvoiceEmailProps {
  invoice: any;
  user: any;
  customer: any;
  appUrl: string;
}

export function buildInvoiceEmail({ invoice, user, customer, appUrl }: InvoiceEmailProps): {
  subject: string;
  html: string;
} {
  const brand = user.brandColour ?? "#f97316";
  const businessName = user.businessName ?? user.name;
  const viewUrl = `${appUrl}/invoice/${invoice.publicToken}`;
  const dueDateStr = invoice.dueDate ? formatDate(invoice.dueDate) : null;

  const subject = `Invoice ${invoice.invoiceNumber} from ${businessName} — ${formatAUD(Number(invoice.total))} AUD due ${dueDateStr ?? "on receipt"}`;

  const isOverdue = invoice.dueDate && daysOverdue(invoice.dueDate) > 0;
  const overdueDays = isOverdue ? daysOverdue(invoice.dueDate) : 0;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

          <tr><td style="background:${brand};height:6px;"></td></tr>

          ${isOverdue ? `
          <tr>
            <td style="background:#fee2e2;padding:12px 40px;">
              <p style="margin:0;color:#dc2626;font-size:14px;font-weight:bold;">
                ⚠ This invoice is ${overdueDays} day${overdueDays !== 1 ? "s" : ""} overdue. Please arrange payment immediately.
              </p>
            </td>
          </tr>` : ""}

          <tr>
            <td style="padding:32px 40px 16px;">
              ${user.logoUrl
                ? `<img src="${user.logoUrl}" alt="${businessName}" style="height:48px;object-fit:contain;" />`
                : `<h2 style="margin:0;color:${brand};font-size:22px;">${businessName}</h2>`
              }
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px;">
              <p style="color:#374151;font-size:16px;margin:0 0 16px;">Hi ${customer?.name ?? "there"},</p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Thank you for your business! Please find your tax invoice from <strong>${businessName}</strong> attached.
              </p>

              <!-- Invoice summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">
                    <strong style="color:#111827;">Invoice:</strong> ${invoice.invoiceNumber}
                  </td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">
                    <strong style="color:#111827;">Issue Date:</strong> ${formatDate(invoice.createdAt)}
                  </td>
                </tr>
                ${dueDateStr ? `
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">
                    <strong style="color:${isOverdue ? "#dc2626" : "#111827"};">Due Date:</strong>
                    <span style="color:${isOverdue ? "#dc2626" : "inherit"};">${dueDateStr}${isOverdue ? " (OVERDUE)" : ""}</span>
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="padding-top:12px;border-top:1px solid #e5e7eb;">
                    <span style="font-size:22px;font-weight:bold;color:${brand};">${formatAUD(Number(invoice.total))} AUD</span>
                  </td>
                </tr>
              </table>

              <!-- Payment details -->
              ${(user.bankBsb || user.bankAccount) ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px;padding:16px;margin-bottom:24px;">
                <tr><td style="font-size:12px;font-weight:bold;color:#15803d;text-transform:uppercase;padding-bottom:8px;">Payment Details</td></tr>
                ${user.bankName ? `<tr><td style="font-size:13px;color:#374151;padding-bottom:4px;"><strong>Account Name:</strong> ${user.bankName}</td></tr>` : ""}
                ${user.bankBsb ? `<tr><td style="font-size:13px;color:#374151;padding-bottom:4px;"><strong>BSB:</strong> ${user.bankBsb}</td></tr>` : ""}
                ${user.bankAccount ? `<tr><td style="font-size:13px;color:#374151;padding-bottom:4px;"><strong>Account:</strong> ${user.bankAccount}</td></tr>` : ""}
                <tr><td style="font-size:12px;color:#6b7280;font-style:italic;padding-top:8px;">Please reference ${invoice.invoiceNumber} when paying.</td></tr>
              </table>` : ""}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:${brand};border-radius:6px;">
                    <a href="${viewUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
                      View Invoice →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#6b7280;font-size:13px;margin:0;">
                Questions? Reply to this email or call ${user.phone ?? "us"}.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                ${businessName}${user.abn ? ` · ABN ${user.abn}` : ""}${user.phone ? ` · ${user.phone}` : ""}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
