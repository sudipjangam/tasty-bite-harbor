/**
 * Smart WhatsApp Invoice Template Resolver
 *
 * Picks the right Meta template + builds exact variables & buttons
 * based on what social links the restaurant has configured.
 *
 * Template matrix:
 *   Both Instagram + Google Review  → invoice_with_review        (5 body + 2 buttons)
 *   Only Google Review              → invoice_with_review_only   (5 body + 1 button)
 *   Only Instagram                  → invoice_with_instagram     (4 body + 2 buttons)
 *   Neither                         → invoice_with_contact       (5 body + 1 button)
 */

export interface InvoiceTemplateResult {
  templateName: string;
  /** Named variables — edge function resolves positional order via TEMPLATE_VAR_MAPS */
  variables: Record<string, string>;
  /** URL button parameters (index-ordered) */
  buttons: Array<{ type: string; value: string }>;
}

export interface ResolveInvoiceParams {
  customerName: string;
  restaurantName: string;
  amount: string;
  billDate: string;
  /** Short suffix after base URL (e.g. "2dc0d840"), NOT full URL */
  billUrlSuffix: string;
  /** Extracted Instagram handle (e.g. "_brewbites_") or "" */
  igHandle: string;
  /** Full Google Review URL or "" */
  googleReviewUrl: string;
  /** Restaurant phone number for fallback template */
  contactNumber: string;
}

export function resolveInvoiceTemplate(
  params: ResolveInvoiceParams,
): InvoiceTemplateResult {
  const {
    customerName,
    restaurantName,
    amount,
    billDate,
    billUrlSuffix,
    igHandle,
    googleReviewUrl,
    contactNumber,
  } = params;

  const hasInstagram = !!igHandle;
  const hasGoogleReview = !!googleReviewUrl && googleReviewUrl !== "-";

  // ── Case 1: Both Instagram + Google Review ──────────────────────
  if (hasInstagram && hasGoogleReview) {
    return {
      templateName: "invoice_with_review",
      variables: {
        customer_name: customerName || "Customer",
        restaurant_name: restaurantName || "Restaurant",
        amount,
        order_date: billDate,
        contact_number: googleReviewUrl,  // {{5}} = Google Review URL in body
      },
      buttons: [
        { type: "url", value: billUrlSuffix || "pending" },   // Button 0: View Bill
        { type: "url", value: igHandle },                     // Button 1: Instagram
      ],
    };
  }

  // ── Case 2: Only Google Review (no Instagram) ───────────────────
  if (!hasInstagram && hasGoogleReview) {
    return {
      templateName: "invoice_with_review_only",
      variables: {
        customer_name: customerName || "Customer",
        restaurant_name: restaurantName || "Restaurant",
        amount,
        order_date: billDate,
        contact_number: googleReviewUrl,  // {{5}} = Google Review URL in body
      },
      buttons: [
        { type: "url", value: billUrlSuffix || "pending" },   // Button 0: View Bill
      ],
    };
  }

  // ── Case 3: Only Instagram (no Google Review) ───────────────────
  if (hasInstagram && !hasGoogleReview) {
    return {
      templateName: "invoice_with_instagram",
      variables: {
        customer_name: customerName || "Customer",
        restaurant_name: restaurantName || "Restaurant",
        amount,
        order_date: billDate,
      },
      buttons: [
        { type: "url", value: billUrlSuffix || "pending" },   // Button 0: View Bill
        { type: "url", value: igHandle },                     // Button 1: Instagram
      ],
    };
  }

  // ── Case 4: Neither — default fallback ──────────────────────────
  return {
    templateName: "invoice_with_contact",
    variables: {
      customer_name: customerName || "Customer",
      restaurant_name: restaurantName || "Restaurant",
      amount,
      order_date: billDate,
      contact_number: contactNumber || "-",
    },
    buttons: [
      { type: "url", value: billUrlSuffix || "pending" },     // Button 0: View Bill
    ],
  };
}
