import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { sharedStyles as styles } from "./sharedPDFStyles";
import { formatAUD, formatDate } from "@/lib/utils";

interface QuotePDFProps {
  quote: any;
  user: any;
  customer: any;
}

export function QuotePDF({ quote, user, customer }: QuotePDFProps) {
  const brand = user.brandColour ?? "#f97316";
  const lineItems = (quote.lineItems ?? []) as any[];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.headerBar, { backgroundColor: brand }]} />

        <View style={styles.headerRow}>
          <View>
            {user.logoUrl ? (
              <Image src={user.logoUrl} style={styles.logo} />
            ) : (
              <Text style={[styles.businessName, { color: brand }]}>
                {user.businessName ?? user.name}
              </Text>
            )}
          </View>
          <View style={styles.businessInfo}>
            {user.logoUrl && (
              <Text style={styles.businessName}>{user.businessName ?? user.name}</Text>
            )}
            {user.abn && <Text style={styles.businessDetail}>ABN: {user.abn}</Text>}
            {user.licenceNumber && (
              <Text style={styles.businessDetail}>Licence: {user.licenceNumber}</Text>
            )}
            {user.phone && <Text style={styles.businessDetail}>{user.phone}</Text>}
            {user.email && <Text style={styles.businessDetail}>{user.email}</Text>}
            {user.state && <Text style={styles.businessDetail}>{user.state}, Australia</Text>}
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.documentTitle}>QUOTE</Text>
          <View style={styles.documentMeta}>
            <Text style={styles.metaLabel}>Quote Number</Text>
            <Text style={[styles.metaValue, { color: brand }]}>{quote.quoteNumber}</Text>
            <Text style={styles.metaLabel}>Issue Date</Text>
            <Text style={styles.metaValue}>{formatDate(quote.createdAt)}</Text>
            {quote.validUntil && (
              <>
                <Text style={styles.metaLabel}>Valid Until</Text>
                <Text style={styles.metaValue}>{formatDate(quote.validUntil)}</Text>
              </>
            )}
          </View>
        </View>

        {customer && (
          <View style={styles.billToRow}>
            <View style={styles.billToBox}>
              <Text style={styles.billToLabel}>Quote Prepared For</Text>
              <Text style={styles.billToName}>{customer.name}</Text>
              {customer.email && <Text style={styles.billToDetail}>{customer.email}</Text>}
              {customer.phone && <Text style={styles.billToDetail}>{customer.phone}</Text>}
              {customer.address && <Text style={styles.billToDetail}>{customer.address}</Text>}
              {customer.suburb && (
                <Text style={styles.billToDetail}>
                  {customer.suburb}
                  {customer.state ? `, ${customer.state}` : ""}
                  {customer.postcode ? ` ${customer.postcode}` : ""}
                </Text>
              )}
            </View>
          </View>
        )}

        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.colGst]}>GST</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>

          {lineItems.map((item: any, i: number) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellText, styles.colDescription]}>{item.description}</Text>
              <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cellText, styles.colUnit]}>{item.unit}</Text>
              <Text style={[styles.cellText, styles.colPrice]}>{formatAUD(item.unitPrice)}</Text>
              <Text style={[styles.cellText, styles.colGst]}>{item.includeGst ? "✓" : "—"}</Text>
              <Text style={[styles.cellBold, styles.colTotal]}>{formatAUD(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatAUD(Number(quote.subtotal))}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST (10%)</Text>
            <Text style={styles.totalValue}>{formatAUD(Number(quote.gst))}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total (AUD)</Text>
            <Text style={[styles.grandTotalValue, { color: brand }]}>
              {formatAUD(Number(quote.total))}
            </Text>
          </View>
        </View>

        {quote.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes &amp; Terms</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            This quote is valid for {user.defaultQuoteValidity ?? 30} days from issue date.
            Thank you for your business.
          </Text>
          <Text style={styles.footerText}>{quote.quoteNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
