import type { ApiInvoice } from "./api";

export const apiClientLabel = (c: ApiInvoice["client"]) =>
  c.type === "PERSON" ? `${c.person?.prenom ?? ""} ${c.person?.nom ?? ""}`.trim() : (c.entreprise?.nom ?? "");

export const apiInvoiceNumberLabel = (inv: Pick<ApiInvoice, "type" | "year" | "number">) =>
  `${inv.type === "Proforma" ? "PRO-" : ""}${inv.number}/${inv.year}`;
