import { formatAUD, formatDate } from "@/lib/utils";

interface QuoteEmailProps {
  quote: any;
  user: any;
  customer: any;
  appUrl: string;
}

export function buildQuoteEmail({ quote, user, customer, appUrl }: QuoteEmailProps): {
  subject: string;
  html: string;
} {
  const brand = user.brandColour ?? "#f97316";
  const businessName = user.businessName ?? user.name;
  const viewUrl = `${appUrl}/quote/${quote.publicToken}`;

  const subject = `Quote ${quote.quoteNumber} from ${businessName} — ${formatAUD(Number(quote.total))} AUD`;

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

          <!-- Header bar -->
          <tr><td style="background:${brand};height:6px;"></td></tr>

          <!-- Logo / Business name -->
          <tr>
            <td style="padding:32px 40px 16px;">
              ${user.logoUrl
                ? `<img src="${user.logoUrl}" alt="${businessName}" style="height:48px;object-fit:contain;" />`
                : `<h2 style="margin:0;color:${brand};font-size:22px;">${businessName}</h2>`
              }
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="color:#374151;font-size:16px;margin:0 0 16px;">Hi ${customer?.name ?? "there"},</p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Please find your quote from <strong>${businessName}</strong> below.
                We'd love the opportunity to complete this work for you.
              </p>

              <!-- Quote summary box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">
                    <strong style="color:#111827;">Quote Number:</strong> ${quote.quoteNumber}
                  </td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">
                    <strong style="color:#111827;">Issue Date:</strong> ${formatDate(quote.createdAt)}
                  </td>
                </tr>
                ${quote.validUntil ? `
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">
                    <strong style="color:#111827;">Valid Until:</strong> ${formatDate(quote.validUntil)}
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="padding-top:12px;border-top:1px solid #e5e7eb;">
                    <span style="font-size:22px;font-weight:bold;color:${brand};">${formatAUD(Number(quote.total))} AUD</span>
                    <span style="color:#6b7280;font-size:13px;margin-left:8px;">(inc. GST)</span>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:${brand};border-radius:6px;">
                    <a href="${viewUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
                      View &amp; Accept Quote →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Or copy this link: <a href="${viewUrl}" style="color:${brand};">${viewUrl}</a>
              </p>

              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">
                This quote is valid for ${user.defaultQuoteValidity ?? 30} days. If you have any questions, feel free to reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
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
