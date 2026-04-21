import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatAUD, formatDate } from "@/lib/utils";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      job: { include: { customer: true } },
      user: true,
    },
  });

  if (!invoice) notFound();

  const lineItems = invoice.lineItems as any[];
  const user = invoice.user;
  const customer = invoice.job?.customer ?? null;
  const brand = user.brandColour ?? "#f97316";
  const businessName = user.businessName ?? user.name;
  const isPaid = invoice.status === "PAID";
  const isOverdue =
    invoice.dueDate &&
    !isPaid &&
    new Date(invoice.dueDate) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
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
        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 font-medium text-center">
            ✓ Invoice Paid — Thank you!
          </div>
        )}
        {isOverdue && !isPaid && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 font-medium text-center">
            ⚠ This invoice is overdue. Please arrange payment as soon as possible.
          </div>
        )}

        {/* Invoice header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tax Invoice</h2>
              <p className="text-lg font-semibold mt-1" style={{ color: brand }}>
                {invoice.invoiceNumber}
              </p>
            </div>
            <div className="text-right text-sm text-gray-600 space-y-1">
              <p>
                <span className="text-gray-400">Issued:</span> {formatDate(invoice.createdAt)}
              </p>
              {invoice.dueDate && (
                <p>
                  <span className="text-gray-400">Due:</span>{" "}
                  <span className={isOverdue && !isPaid ? "text-red-600 font-semibold" : ""}>
                    {formatDate(invoice.dueDate)}
                  </span>
                </p>
              )}
            </div>
          </div>

          {customer && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Bill To</p>
              <p className="font-semibold">{customer.name}</p>
              {customer.email && <p className="text-gray-600">{customer.email}</p>}
              {customer.suburb && (
                <p className="text-gray-600">
                  {customer.suburb}
                  {customer.state ? `, ${customer.state}` : ""}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Items</h3>

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
              <span>{formatAUD(Number(invoice.subtotal))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">GST (10%)</span>
              <span>{formatAUD(Number(invoice.gst))}</span>
            </div>
            {invoice.depositAmount && Number(invoice.depositAmount) > 0 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>Deposit Required</span>
                <span>{formatAUD(Number(invoice.depositAmount))}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold border-t pt-3">
              <span>Total Due</span>
              <span style={{ color: brand }}>{formatAUD(Number(invoice.total))}</span>
            </div>
          </div>
        </div>

        {/* Payment details */}
        {(user.bankBsb || user.bankAccount) && !isPaid && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
              {user.bankName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Name</span>
                  <span className="font-medium">{user.bankName}</span>
                </div>
              )}
              {user.bankBsb && (
                <div className="flex justify-between">
                  <span className="text-gray-500">BSB</span>
                  <span className="font-medium">{user.bankBsb}</span>
                </div>
              )}
              {user.bankAccount && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Number</span>
                  <span className="font-medium">{user.bankAccount}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 pt-1">
                Reference: {invoice.invoiceNumber}
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        {(invoice.notes || user.invoiceFooter) && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {invoice.notes ?? user.invoiceFooter}
            </p>
          </div>
        )}

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
