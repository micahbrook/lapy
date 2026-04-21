import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatAUD, formatDate } from "@/lib/utils";
import { QuoteAcceptClient } from "./quote-accept-client";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: {
      customer: true,
      user: true,
    },
  });

  if (!quote) notFound();

  const lineItems = quote.lineItems as any[];
  const user = quote.user;
  const brand = user.brandColour ?? "#f97316";
  const businessName = user.businessName ?? user.name;
  const isExpired =
    quote.validUntil && new Date(quote.validUntil) < new Date() && quote.status === "DRAFT";
  const isAccepted = quote.status === "ACCEPTED";
  const isDeclined = quote.status === "DECLINED";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: brand }} className="h-1.5" />
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            {user.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.logoUrl} alt={businessName} className="h-10 object-contain" />
            ) : (
              <h1 className="text-xl font-bold" style={{ color: brand }}>
                {businessName}
              </h1>
            )}
          </div>
          <div className="text-right text-sm text-gray-500">
            {user.abn && <p>ABN: {user.abn}</p>}
            {user.phone && <p>{user.phone}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Status banner */}
        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 font-medium text-center">
            ✓ Quote Accepted — {businessName} will be in touch to confirm scheduling.
          </div>
        )}
        {isDeclined && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 font-medium text-center">
            Quote Declined
          </div>
        )}
        {isExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 font-medium text-center">
            ⚠ This quote has expired. Please contact {businessName} for an updated quote.
          </div>
        )}

        {/* Quote header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quote</h2>
              <p className="text-lg font-semibold mt-1" style={{ color: brand }}>
                {quote.quoteNumber}
              </p>
            </div>
            <div className="text-right text-sm text-gray-600 space-y-1">
              <p>
                <span className="text-gray-400">Issued:</span> {formatDate(quote.createdAt)}
              </p>
              {quote.validUntil && (
                <p>
                  <span className="text-gray-400">Valid until:</span>{" "}
                  {formatDate(quote.validUntil)}
                </p>
              )}
            </div>
          </div>

          {/* Prepared for */}
          {quote.customer && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Prepared for</p>
              <p className="font-semibold">{quote.customer.name}</p>
              {quote.customer.email && <p className="text-gray-600">{quote.customer.email}</p>}
              {quote.customer.suburb && (
                <p className="text-gray-600">
                  {quote.customer.suburb}
                  {quote.customer.state ? `, ${quote.customer.state}` : ""}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Line Items</h3>

          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-400 font-semibold uppercase mb-2 px-1">
            <span className="col-span-5">Description</span>
            <span className="col-span-2 text-right">Qty</span>
            <span className="col-span-2 text-right">Unit Price</span>
            <span className="col-span-1 text-center">GST</span>
            <span className="col-span-2 text-right">Total</span>
          </div>

          {lineItems.map((item: any, i: number) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 py-3 border-b last:border-0 text-sm"
            >
              <div className="col-span-12 sm:col-span-5 font-medium">{item.description}</div>
              <div className="col-span-4 sm:col-span-2 text-gray-500 sm:text-right">
                {item.quantity} {item.unit}
              </div>
              <div className="col-span-4 sm:col-span-2 text-gray-500 sm:text-right">
                {formatAUD(item.unitPrice)}
              </div>
              <div className="col-span-1 text-center text-gray-400 text-xs">
                {item.includeGst ? "✓" : "—"}
              </div>
              <div className="col-span-3 sm:col-span-2 text-right font-semibold">
                {formatAUD(item.total)}
              </div>
            </div>
          ))}

          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatAUD(Number(quote.subtotal))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">GST (10%)</span>
              <span>{formatAUD(Number(quote.gst))}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-3">
              <span>Total</span>
              <span style={{ color: brand }}>{formatAUD(Number(quote.total))}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Notes &amp; Terms</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Accept / Decline actions */}
        {!isAccepted && !isDeclined && !isExpired && (
          <QuoteAcceptClient token={token} quoteNumber={quote.quoteNumber} brand={brand} />
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-8">
          <p>
            {businessName}
            {user.abn ? ` · ABN ${user.abn}` : ""}
            {user.licenceNumber ? ` · Licence ${user.licenceNumber}` : ""}
          </p>
          <p className="mt-1">Powered by TradieMate</p>
        </div>
      </main>
    </div>
  );
}
