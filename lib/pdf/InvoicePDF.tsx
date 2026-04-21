import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { sharedStyles as s } from "./sharedPDFStyles";
import { formatAUD, formatDate, daysOverdue } from "@/lib/utils";

const styles = StyleSheet.create({
  overdueBanner: {
    backgroundColor: "#fee2e2",
    borderRadius: 4,
    padding: "8 12",
    marginBottom: 14,
  },
  overdueText: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#dc2626" },
  depositRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3, width: 200 },
  depositLabel: { flex: 1, fontSize: 9, color: "#2563eb", textAlign: "right", paddingRight: 12 },
  depositValue: { width: 80, fontSize: 9, color: "#2563eb", textAlign: "right" },
  paymentBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    borderLeft: "3 solid #22c55e",
  },
  paymentTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#15803d",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  paymentRow: { flexDirection: "row", marginBottom: 3 },
  paymentLabel: { fontSize: 9, color: "#6b7280", width: 90 },
  paymentValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  paymentNote: { fontSize: 8, color: "#6b7280", marginTop: 6, fontStyle: "italic" },
});

interface InvoicePDFProps {
  invoice: any;
  user: any;
  customer: any;
}

export function InvoicePDF({ invoice, user, customer }: InvoicePDFProps) {
  const brand = user.brandColour ?? "#f97316";
  const lineItems = (invoice.lineItems ?? []) as any[];
  const isOverdue =
    invoice.dueDate && invoice.status !== "PAID" && daysOverdue(invoice.dueDate) > 0;
  const overdueDays = isOverdue ? daysOverdue(invoice.dueDate) : 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={[s.headerBar, { backgroundColor: brand }]} />

        <View style={s.headerRow}>
          <View>
            {user.logoUrl ? (
              <Image src={user.logoUrl} style={s.logo} />
            ) : (
              <Text style={[s.businessName, { color: brand }]}>
                {user.businessName ?? user.name}
              </Text>
            )}
          </View>
          <View style={s.businessInfo}>
            {user.logoUrl && (
              <Text style={s.businessName}>{user.businessName ?? user.name}</Text>
            )}
            {user.abn && <Text style={s.businessDetail}>ABN: {user.abn}</Text>}
            {user.licenceNumber && (
              <Text style={s.businessDetail}>Licence: {user.licenceNumber}</Text>
            )}
            {user.phone && <Text style={s.businessDetail}>{user.phone}</Text>}
            {user.email && <Text style={s.businessDetail}>{user.email}</Text>}
            {user.state && <Text style={s.businessDetail}>{user.state}, Australia</Text>}
          </View>
        </View>

        <View style={s.titleRow}>
          <Text style={s.documentTitle}>TAX INVOICE</Text>
          <View style={s.documentMeta}>
            <Text style={s.metaLabel}>Invoice Number</Text>
            <Text style={[s.metaValue, { color: brand }]}>{invoice.invoiceNumber}</Text>
            <Text style={s.metaLabel}>Issue Date</Text>
            <Text style={s.metaValue}>{formatDate(invoice.createdAt)}</Text>
            {invoice.dueDate && (
              <>
                <Text style={s.metaLabel}>Due Date</Text>
                <Text style={[s.metaValue, isOverdue ? { color: "#dc2626" } : {}]}>
                  {formatDate(invoice.dueDate)}
                </Text>
              </>
            )}
          </View>
        </View>

        {isOverdue && (
          <View style={styles.overdueBanner}>
            <Text style={styles.overdueText}>
              ⚠ OVERDUE — This invoice is {overdueDays} day{overdueDays !== 1 ? "s" : ""} overdue.
              Please arrange payment immediately.
            </Text>
          </View>
        )}

        {customer && (
          <View style={s.billToRow}>
            <View style={s.billToBox}>
              <Text style={s.billToLabel}>Bill To</Text>
              <Text style={s.billToName}>{customer.name}</Text>
              {customer.email && <Text style={s.billToDetail}>{customer.email}</Text>}
              {customer.phone && <Text style={s.billToDetail}>{customer.phone}</Text>}
              {customer.address && <Text style={s.billToDetail}>{customer.address}</Text>}
              {customer.suburb && (
                <Text style={s.billToDetail}>
                  {customer.suburb}
                  {customer.state ? `, ${customer.state}` : ""}
                  {customer.postcode ? ` ${customer.postcode}` : ""}
                </Text>
              )}
            </View>
          </View>
        )}

        <View>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colDescription]}>Description</Text>
            <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
            <Text style={[s.tableHeaderText, s.colUnit]}>Unit</Text>
            <Text style={[s.tableHeaderText, s.colPrice]}>Unit Price</Text>
            <Text style={[s.tableHeaderText, s.colGst]}>GST</Text>
            <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
          </View>
          {lineItems.map((item: any, i: number) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.cellText, s.colDescription]}>{item.description}</Text>
              <Text style={[s.cellText, s.colQty]}>{item.quantity}</Text>
              <Text style={[s.cellText, s.colUnit]}>{item.unit}</Text>
              <Text style={[s.cellText, s.colPrice]}>{formatAUD(item.unitPrice)}</Text>
              <Text style={[s.cellText, s.colGst]}>{item.includeGst ? "✓" : "—"}</Text>
              <Text style={[s.cellBold, s.colTotal]}>{formatAUD(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalsSection}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{formatAUD(Number(invoice.subtotal))}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>GST (10%)</Text>
            <Text style={s.totalValue}>{formatAUD(Number(invoice.gst))}</Text>
          </View>
          {invoice.depositAmount && Number(invoice.depositAmount) > 0 && (
            <View style={styles.depositRow}>
              <Text style={styles.depositLabel}>Deposit Required</Text>
              <Text style={styles.depositValue}>{formatAUD(Number(invoice.depositAmount))}</Text>
            </View>
          )}
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Total Due (AUD)</Text>
            <Text style={[s.grandTotalValue, { color: brand }]}>
              {formatAUD(Number(invoice.total))}
            </Text>
          </View>
        </View>

        {(user.bankBsb || user.bankAccount) && (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Payment Details</Text>
            {user.bankName && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Account Name:</Text>
                <Text style={styles.paymentValue}>{user.bankName}</Text>
              </View>
            )}
            {user.bankBsb && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>BSB:</Text>
                <Text style={styles.paymentValue}>{user.bankBsb}</Text>
              </View>
            )}
            {user.bankAccount && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Account Number:</Text>
                <Text style={styles.paymentValue}>{user.bankAccount}</Text>
              </View>
            )}
            <Text style={styles.paymentNote}>
              Please reference {invoice.invoiceNumber} when making payment.
            </Text>
          </View>
        )}

        {(invoice.notes || user.invoiceFooter) && (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes ?? user.invoiceFooter}</Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {user.businessName ?? user.name}
            {user.abn ? ` · ABN ${user.abn}` : ""}
          </Text>
          <Text style={s.footerText}>{invoice.invoiceNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
