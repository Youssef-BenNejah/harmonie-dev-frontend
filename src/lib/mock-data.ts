// Types mirror the exact fields of the original Zouhair-facture backend models
// (backend/models/appmodel/*.js and backend/models/coreModel/*.js) so this UI
// reflects the real data shape, even though everything here is mock/local state.
//
// Field shapes follow the more complete reference implementation found in
// old/TreeFacture (Invoice: per-item taxes, timbre fiscal, document-type status;
// Person/Entreprise: adresse; EntrepriseSetting: matriculefisc), not the older
// root backend/frontend snapshot.

// "status" on an Invoice is the printed DOCUMENT TYPE (what the PDF title reads),
// not a workflow state — matches old/TreeFacture's Invoice.status enum exactly.
export type InvoiceStatus = "Facture" | "Devis" | "Bon de livraison";
export type PaymentStatus = "impayé" | "Partiellement payé" | "Payé" | "Retard";
export type InvoiceType = "Standard" | "Proforma";

// models/appmodel/Person.js
export type Person = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  pays: string;
  cin: string;
  adresse: string;
  isClient: boolean;
  entreprise?: { id: string; nom: string } | null;
  createdBy: string;
  created: string;
};

// models/appmodel/Entreprise.js
export type Entreprise = {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  pays: string;
  siteweb: string;
  rib: string;
  fisc: string;
  adresse: string;
  isClient: boolean;
  mainContact?: { id: string; prenom: string; nom: string } | null;
  createdBy: string;
  created: string;
};

// models/appmodel/Client.js — wraps either a Person or an Entreprise
export type ClientType = "Company" | "Person";
export type Client = {
  id: string;
  type: ClientType;
  person?: Pick<Person, "id" | "prenom" | "nom" | "email" | "telephone" | "cin" | "adresse"> | null;
  entreprise?: Pick<Entreprise, "id" | "nom" | "email" | "telephone" | "fisc" | "adresse"> | null;
  createdBy: string;
  created: string;
};

export const clientLabel = (c: Client) =>
  c.type === "Person" ? `${c.person?.prenom ?? ""} ${c.person?.nom ?? ""}`.trim() : (c.entreprise?.nom ?? "");
export const clientEmail = (c: Client) => (c.type === "Person" ? c.person?.email : c.entreprise?.email) ?? "";
export const clientPhone = (c: Client) => (c.type === "Person" ? c.person?.telephone : c.entreprise?.telephone) ?? "";
export const clientTypeLabel = (t: ClientType) => (t === "Person" ? "Personne" : "Entreprise");

// models/appmodel/ProductCategory.js
export type ProductCategory = {
  id: string;
  name: string;
  description?: string;
  color: string;
  enabled: boolean;
  createdBy: string;
};

// models/appmodel/Product.js (categoryId is a UI-only link to ProductCategory)
export type Product = {
  id: string;
  name: string;
  currency: string;
  price: number;
  description?: string;
  reference?: string;
  categoryId?: string;
  createdBy: string;
  created: string;
};

// models/appmodel/Currency.js
export type Currency = {
  id: string;
  name: string;
  code: string;
  symbol: string;
  createdBy: string;
};

// models/appmodel/Taxes.js
export type Tax = {
  id: string;
  name: string;
  taxvalue: number;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
};

// models/appmodel/DepenseCategory.js
export type DepenseCategory = {
  id: string;
  name: string;
  description?: string;
  color: string;
  enabled: boolean;
  createdBy: string;
};

// models/appmodel/Depense.js
export type DepenseCurrency = "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "INR";
export type Depense = {
  id: string;
  name: string;
  depenseCategory: { id: string; name: string; color: string };
  currency: DepenseCurrency;
  price: number;
  description?: string;
  reference?: string;
  createdBy: string;
  created: string;
};

// models/appmodel/Invoice.js — item sub-schema: each line carries its own tax
// (taxRate/taxAmount/taxName snapshot from the selected Tax), matching
// old/TreeFacture where invoice-level tax is per-line, not a single flat rate.
export type InvoiceItem = {
  id: string;
  ref?: string;
  article: string;
  description?: string;
  quantity: number;
  price: number;
  taxId: string; // empty string means no tax selected
  taxRate: number;
  taxAmount: number;
  taxName: string;
  total: number; // tax-inclusive line total: quantity*price + taxAmount
};

export type Invoice = {
  id: string;
  client: Client;
  number: number;
  year: number;
  currency: Currency;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  type: InvoiceType;
  isConverted: boolean;
  date: string;
  expirationDate: string;
  note?: string;
  items: InvoiceItem[];
  timbre: number; // Timbre fiscal — flat Tunisian stamp duty added to the total
  subtotal: number; // tax-inclusive sum of items (+ timbre) — i.e. the TTC grand total
  taxAmount: number; // sum of all item-level tax amounts
  total: number; // subtotal + timbre
  paidAmount: number;
  createdBy: string;
  created: string;
  factureImage?: string | null;
};

// Total HT (pre-tax, pre-stamp) is always derived, never stored — matches how
// the PDF generator computes it: subtotal - taxAmount - timbre.
export const invoiceTotalHT = (inv: Pick<Invoice, "subtotal" | "taxAmount" | "timbre">) =>
  inv.subtotal - inv.taxAmount - inv.timbre;

// models/coreModel/EntrepriseSetting.js ("Ma entreprise")
export type CompanySettings = {
  name: string;
  matriculefisc: string;
  address: string;
  state: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  taxNumber: string;
  vatNumber: string;
  registrationNumber: string;
  logo: string | null;
};

// models/coreModel/Admin.js — trial/subscription fields (état enum matches
// old/TreeFacture's French, capitalized values, driven by the SuperAdmin panel)
export type AdminEtat = "Active" | "Suspendue" | "Désactivé" | "expiré";
export type AdminProfile = {
  name: string;
  surname: string;
  email: string;
  role: "owner";
  photo: string | null;
  etat: AdminEtat;
  planExpiration: string;
};

// models/appmodel/payment.js
export type PaymentMethod = "Virement bancaire" | "Espèces" | "Autres";
export type Payment = {
  id: string;
  invoice: Pick<Invoice, "id" | "number" | "year" | "type" | "total" | "currency">;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  createdBy: string;
};

// SuperAdmin platform — Admin facture app: manages every tenant Admin account.
export type TenantAdmin = {
  id: string;
  name: string;
  surname: string;
  email: string;
  etat: AdminEtat;
  planExpiration: string;
  created: string;
  renewalRequested: boolean;
};

// Public "join the platform" request — submitted from the marketing landing page,
// reviewed by the Super Admin, who can convert it into a real TenantAdmin account.
export type JoinRequestStatus = "En attente" | "Contacté" | "Converti" | "Rejeté";
export type JoinRequest = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  entreprise: string;
  message: string;
  status: JoinRequestStatus;
  created: string;
};

// ---------- Seed data ----------

export const personnes: Person[] = [
  { id: "p1", prenom: "Amine", nom: "Ben Salah", email: "amine.bensalah@mail.tn", telephone: "+216 22 145 908", pays: "Tunisie", cin: "08451223", adresse: "12 Rue de Marseille, Tunis", isClient: true, entreprise: null, createdBy: "admin1", created: "2026-06-02" },
  { id: "p2", prenom: "Sonia", nom: "Trabelsi", email: "sonia.trabelsi@mail.tn", telephone: "+216 98 445 210", pays: "Tunisie", cin: "07332190", adresse: "5 Avenue Habib Bourguiba, Sfax", isClient: true, entreprise: null, createdBy: "admin1", created: "2026-06-14" },
  { id: "p3", prenom: "Karim", nom: "Gharbi", email: "k.gharbi@mail.tn", telephone: "+216 55 320 774", pays: "Tunisie", cin: "09982314", adresse: "18 Rue Ibn Khaldoun, Sousse", isClient: false, entreprise: { id: "e2", nom: "Atlas Logistique" }, createdBy: "admin1", created: "2026-07-01" },
  { id: "p4", prenom: "Camille", nom: "Lefèvre", email: "camille.lefevre@mail.fr", telephone: "+33 6 12 44 87 90", pays: "France", cin: "", adresse: "22 Rue de Lyon, Lyon", isClient: true, entreprise: null, createdBy: "admin1", created: "2026-07-09" },
  { id: "p5", prenom: "Nadia", nom: "Bouazizi", email: "nadia.b@mail.tn", telephone: "+216 21 887 002", pays: "Tunisie", cin: "06678812", adresse: "3 Rue de la Liberté, Bizerte", isClient: false, entreprise: null, createdBy: "admin1", created: "2026-07-20" },
  { id: "p6", prenom: "Julien", nom: "Moreau", email: "j.moreau@mail.fr", telephone: "+33 7 88 21 45 03", pays: "France", cin: "", adresse: "9 Quai de la Fosse, Nantes", isClient: false, entreprise: { id: "e5", nom: "Nordic Cloud SAS" }, createdBy: "admin1", created: "2026-08-02" },
  { id: "p7", prenom: "Yassine", nom: "Hammami", email: "y.hammami@mail.tn", telephone: "+216 27 445 118", pays: "Tunisie", cin: "05512309", adresse: "40 Avenue Taïeb Mhiri, Nabeul", isClient: true, entreprise: null, createdBy: "admin1", created: "2026-08-11" },
  { id: "p8", prenom: "Élise", nom: "Dupont", email: "elise.dupont@mail.fr", telephone: "+33 6 45 90 12 77", pays: "France", cin: "", adresse: "14 Rue de Rivoli, Paris", isClient: false, entreprise: null, createdBy: "admin1", created: "2026-08-27" },
];

export const entreprises: Entreprise[] = [
  { id: "e1", nom: "Medina Digital SARL", email: "contact@medinadigital.tn", telephone: "+216 71 220 440", pays: "Tunisie", siteweb: "medinadigital.tn", rib: "08 006 0123456789012 34", fisc: "1425879/B", adresse: "Immeuble Tej, Les Berges du Lac, Tunis", isClient: true, mainContact: { id: "p1", prenom: "Amine", nom: "Ben Salah" }, createdBy: "admin1", created: "2026-05-12" },
  { id: "e2", nom: "Atlas Logistique", email: "info@atlaslog.tn", telephone: "+216 74 410 220", pays: "Tunisie", siteweb: "atlaslogistique.tn", rib: "07 104 0456789012345 21", fisc: "9982210/A", adresse: "Zone Industrielle Sidi Salem, Sfax", isClient: true, mainContact: { id: "p3", prenom: "Karim", nom: "Gharbi" }, createdBy: "admin1", created: "2026-05-20" },
  { id: "e3", nom: "Groupe Céleste", email: "hello@celeste.fr", telephone: "+33 1 44 22 90 10", pays: "France", siteweb: "groupeceleste.fr", rib: "FR76 3000 4000 0112 3456 7890 143", fisc: "FR8890124", adresse: "8 Boulevard Haussmann, Paris", isClient: true, mainContact: null, createdBy: "admin1", created: "2026-06-04" },
  { id: "e4", nom: "Sahara Énergie", email: "contact@saharaenergie.tn", telephone: "+216 75 330 118", pays: "Tunisie", siteweb: "saharaenergie.tn", rib: "10 007 0345678901234 09", fisc: "3341290/C", adresse: "Route de Gabès km 5, Gabès", isClient: false, mainContact: null, createdBy: "admin1", created: "2026-06-28" },
  { id: "e5", nom: "Nordic Cloud SAS", email: "team@nordiccloud.eu", telephone: "+33 4 90 11 22 30", pays: "France", siteweb: "nordiccloud.eu", rib: "FR76 1820 6002 0112 3456 7890 187", fisc: "FR4412008", adresse: "45 Rue de la République, Marseille", isClient: false, mainContact: { id: "p6", prenom: "Julien", nom: "Moreau" }, createdBy: "admin1", created: "2026-07-15" },
  { id: "e6", nom: "Carthage Textile", email: "sales@carthagetextile.tn", telephone: "+216 73 555 019", pays: "Tunisie", siteweb: "carthagetextile.tn", rib: "09 005 0234567890123 56", fisc: "2214980/D", adresse: "Zone Industrielle Khezama, Monastir", isClient: true, mainContact: null, createdBy: "admin1", created: "2026-08-06" },
];

export const clients: Client[] = [
  { id: "c1", type: "Company", entreprise: { id: "e1", nom: "Medina Digital SARL", email: "contact@medinadigital.tn", telephone: "+216 71 220 440", fisc: "1425879/B", adresse: "Immeuble Tej, Les Berges du Lac, Tunis" }, createdBy: "admin1", created: "2026-05-12" },
  { id: "c2", type: "Person", person: { id: "p1", prenom: "Amine", nom: "Ben Salah", email: "amine.bensalah@mail.tn", telephone: "+216 22 145 908", cin: "08451223", adresse: "12 Rue de Marseille, Tunis" }, createdBy: "admin1", created: "2026-06-02" },
  { id: "c3", type: "Company", entreprise: { id: "e3", nom: "Groupe Céleste", email: "hello@celeste.fr", telephone: "+33 1 44 22 90 10", fisc: "FR8890124", adresse: "8 Boulevard Haussmann, Paris" }, createdBy: "admin1", created: "2026-06-04" },
  { id: "c4", type: "Person", person: { id: "p2", prenom: "Sonia", nom: "Trabelsi", email: "sonia.trabelsi@mail.tn", telephone: "+216 98 445 210", cin: "07332190", adresse: "5 Avenue Habib Bourguiba, Sfax" }, createdBy: "admin1", created: "2026-06-14" },
  { id: "c5", type: "Company", entreprise: { id: "e2", nom: "Atlas Logistique", email: "info@atlaslog.tn", telephone: "+216 74 410 220", fisc: "9982210/A", adresse: "Zone Industrielle Sidi Salem, Sfax" }, createdBy: "admin1", created: "2026-05-20" },
  { id: "c6", type: "Person", person: { id: "p4", prenom: "Camille", nom: "Lefèvre", email: "camille.lefevre@mail.fr", telephone: "+33 6 12 44 87 90", cin: "", adresse: "22 Rue de Lyon, Lyon" }, createdBy: "admin1", created: "2026-07-09" },
  { id: "c7", type: "Company", entreprise: { id: "e6", nom: "Carthage Textile", email: "sales@carthagetextile.tn", telephone: "+216 73 555 019", fisc: "2214980/D", adresse: "Zone Industrielle Khezama, Monastir" }, createdBy: "admin1", created: "2026-08-06" },
  { id: "c8", type: "Person", person: { id: "p7", prenom: "Yassine", nom: "Hammami", email: "y.hammami@mail.tn", telephone: "+216 27 445 118", cin: "05512309", adresse: "40 Avenue Taïeb Mhiri, Nabeul" }, createdBy: "admin1", created: "2026-08-11" },
];

export const productCategories: ProductCategory[] = [
  { id: "pc1", name: "Développement", description: "Prestations de développement logiciel", color: "#1565C6", enabled: true, createdBy: "admin1" },
  { id: "pc2", name: "Design", description: "Identité visuelle et UI/UX", color: "#4FA3DE", enabled: true, createdBy: "admin1" },
  { id: "pc3", name: "Conseil", description: "Accompagnement et audit", color: "#0B2E73", enabled: true, createdBy: "admin1" },
  { id: "pc4", name: "Hébergement", description: "Infrastructure et cloud", color: "#5AA9E6", enabled: true, createdBy: "admin1" },
  { id: "pc5", name: "Formation", description: "Sessions et ateliers", color: "#071233", enabled: true, createdBy: "admin1" },
];

export const products: Product[] = [
  { id: "s1", name: "Site vitrine sur mesure", price: 4500, currency: "TND", description: "Conception et intégration complète", reference: "DEV-001", categoryId: "pc1", createdBy: "admin1", created: "2026-04-02" },
  { id: "s2", name: "Application web SaaS", price: 15800, currency: "TND", description: "Développement full-stack", reference: "DEV-002", categoryId: "pc1", createdBy: "admin1", created: "2026-04-10" },
  { id: "s3", name: "Identité visuelle", price: 2600, currency: "TND", description: "Logo, charte graphique, déclinaisons", reference: "DES-001", categoryId: "pc2", createdBy: "admin1", created: "2026-04-18" },
  { id: "s4", name: "Maquettes UI/UX", price: 3200, currency: "TND", description: "Parcours utilisateur et prototypes", reference: "DES-002", categoryId: "pc2", createdBy: "admin1", created: "2026-05-02" },
  { id: "s5", name: "Audit technique", price: 1800, currency: "TND", description: "Analyse de performance et sécurité", reference: "CON-001", categoryId: "pc3", createdBy: "admin1", created: "2026-05-14" },
  { id: "s6", name: "Accompagnement stratégique", price: 2400, currency: "EUR", description: "Sessions mensuelles", reference: "CON-002", categoryId: "pc3", createdBy: "admin1", created: "2026-06-01" },
  { id: "s7", name: "Hébergement Cloud Pro", price: 89, currency: "TND", description: "Par mois, supervision incluse", reference: "HEB-001", categoryId: "pc4", createdBy: "admin1", created: "2026-06-09" },
  { id: "s8", name: "Formation React avancée", price: 1200, currency: "EUR", description: "3 jours en présentiel", reference: "FOR-001", categoryId: "pc5", createdBy: "admin1", created: "2026-06-20" },
];

export const devises: Currency[] = [
  { id: "d1", code: "TND", name: "Dinar", symbol: "DT", createdBy: "admin1" },
  { id: "d2", code: "EUR", name: "Euro", symbol: "€", createdBy: "admin1" },
  { id: "d3", code: "USD", name: "Dollar américain", symbol: "$", createdBy: "admin1" },
  { id: "d4", code: "GBP", name: "Livre sterling", symbol: "£", createdBy: "admin1" },
];

export const taxes: Tax[] = [
  { id: "t1", name: "TVA standard", taxvalue: 19, isActive: true, isDefault: true, createdBy: "admin1" },
  { id: "t2", name: "TVA réduite", taxvalue: 13, isActive: true, isDefault: false, createdBy: "admin1" },
  { id: "t3", name: "TVA super réduite", taxvalue: 7, isActive: true, isDefault: false, createdBy: "admin1" },
  { id: "t4", name: "Exonéré", taxvalue: 0, isActive: true, isDefault: false, createdBy: "admin1" },
];

export const depenseCategories: DepenseCategory[] = [
  { id: "dc1", name: "Bureau", description: "Loyer, fournitures", color: "#0B2E73", enabled: true, createdBy: "admin1" },
  { id: "dc2", name: "Logiciels", description: "Abonnements SaaS", color: "#1565C6", enabled: true, createdBy: "admin1" },
  { id: "dc3", name: "Déplacement", description: "Transport et hébergement", color: "#4FA3DE", enabled: true, createdBy: "admin1" },
  { id: "dc4", name: "Marketing", description: "Publicité et communication", color: "#5AA9E6", enabled: true, createdBy: "admin1" },
  { id: "dc5", name: "Salaires", description: "Rémunérations équipe", color: "#071233", enabled: true, createdBy: "admin1" },
];

export const depenses: Depense[] = [
  { id: "x1", name: "Loyer bureau Tunis", depenseCategory: { id: "dc1", name: "Bureau", color: "#0B2E73" }, currency: "USD", price: 720, description: "Loyer mensuel", reference: "EXP-001", createdBy: "admin1", created: "2026-09-01" },
  { id: "x2", name: "Abonnements SaaS", depenseCategory: { id: "dc2", name: "Logiciels", color: "#1565C6" }, currency: "USD", price: 210, description: "Outils internes", reference: "EXP-002", createdBy: "admin1", created: "2026-09-03" },
  { id: "x3", name: "Déplacement Paris", depenseCategory: { id: "dc3", name: "Déplacement", color: "#4FA3DE" }, currency: "EUR", price: 460, description: "Vol + hôtel", reference: "EXP-003", createdBy: "admin1", created: "2026-08-27" },
  { id: "x4", name: "Campagne LinkedIn", depenseCategory: { id: "dc4", name: "Marketing", color: "#5AA9E6" }, currency: "EUR", price: 300, description: "Sponsoring de posts", reference: "EXP-004", createdBy: "admin1", created: "2026-08-22" },
  { id: "x5", name: "Salaires équipe", depenseCategory: { id: "dc5", name: "Salaires", color: "#071233" }, currency: "USD", price: 5900, description: "Paie du mois", reference: "EXP-005", createdBy: "admin1", created: "2026-08-31" },
  { id: "x6", name: "Matériel informatique", depenseCategory: { id: "dc1", name: "Bureau", color: "#0B2E73" }, currency: "USD", price: 1050, description: "2 ordinateurs portables", reference: "EXP-006", createdBy: "admin1", created: "2026-08-12" },
];

const findClient = (id: string) => clients.find((c) => c.id === id)!;
const findCurrency = (id: string) => devises.find((c) => c.id === id)!;
const findTax = (id: string) => taxes.find((t) => t.id === id)!;

// Builds an invoice line item with its own tax snapshot (taxRate/taxAmount/taxName),
// matching how old/TreeFacture stores tax per line rather than once per invoice.
const item = (
  id: string,
  ref: string,
  article: string,
  description: string,
  quantity: number,
  price: number,
  taxId = "",
): InvoiceItem => {
  const tax = taxId ? findTax(taxId) : undefined;
  const base = quantity * price;
  const taxAmount = tax ? Math.round(((base * tax.taxvalue) / 100) * 100) / 100 : 0;
  return {
    id,
    ref,
    article,
    description,
    quantity,
    price,
    taxId,
    taxRate: tax?.taxvalue ?? 0,
    taxAmount,
    taxName: tax?.name ?? "",
    total: base + taxAmount,
  };
};

const buildInvoiceTotals = (items: InvoiceItem[], timbre: number) => {
  const taxAmount = Math.round(items.reduce((s, it) => s + it.taxAmount, 0) * 100) / 100;
  const subtotal = Math.round(items.reduce((s, it) => s + it.total, 0) * 100) / 100 + timbre;
  return { taxAmount, subtotal, total: subtotal };
};

const makeInvoice = (
  id: string,
  clientId: string,
  number: number,
  year: number,
  currencyId: string,
  status: InvoiceStatus,
  paymentStatus: PaymentStatus,
  type: InvoiceType,
  isConverted: boolean,
  date: string,
  expirationDate: string,
  note: string,
  items: InvoiceItem[],
  timbre: number,
  paidAmount: number,
): Invoice => {
  const { taxAmount, subtotal, total } = buildInvoiceTotals(items, timbre);
  return {
    id,
    client: findClient(clientId),
    number,
    year,
    currency: findCurrency(currencyId),
    status,
    paymentStatus,
    type,
    isConverted,
    date,
    expirationDate,
    note,
    items,
    timbre,
    subtotal,
    taxAmount,
    total,
    paidAmount,
    createdBy: "admin1",
    created: date,
  };
};

export const invoices: Invoice[] = [
  makeInvoice("f1", "c1", 142, 2026, "d1", "Facture", "Partiellement payé", "Standard", false, "2026-09-02", "2026-09-30", "", [
    item("l1", "DEV-002", "Application web SaaS", "Phase 1 — socle technique", 1, 15800, "t1"),
    item("l2", "CON-001", "Audit technique", "Revue de sécurité", 1, 2800, "t1"),
  ], 1, 9000),
  makeInvoice("f2", "c3", 141, 2026, "d2", "Facture", "Payé", "Standard", false, "2026-08-28", "2026-09-27", "", [
    item("l1", "CON-002", "Accompagnement stratégique", "Trimestre 3", 2, 2400, "t4"),
    item("l2", "FOR-001", "Formation React avancée", "Session équipe produit", 2, 1300, "t4"),
  ], 0, 7400),
  makeInvoice("f3", "c4", 140, 2026, "d1", "Facture", "Retard", "Standard", false, "2026-08-21", "2026-09-04", "", [
    item("l1", "DES-002", "Maquettes UI/UX", "Refonte boutique", 1, 3200, "t2"),
  ], 1, 0),
  makeInvoice("f4", "c5", 139, 2026, "d1", "Devis", "impayé", "Standard", false, "2026-08-14", "2026-09-14", "", [
    item("l1", "DEV-001", "Site vitrine sur mesure", "Version bilingue", 1, 4500, "t1"),
    item("l2", "HEB-001", "Hébergement Cloud Pro", "12 mois", 12, 75, "t4"),
  ], 1, 0),
  makeInvoice("f5", "c7", 138, 2026, "d1", "Facture", "Payé", "Standard", false, "2026-08-05", "2026-09-05", "", [
    item("l1", "DEV-002", "Application web SaaS", "Module stock", 1, 9800, "t1"),
  ], 1, 9800),
  makeInvoice("f6", "c6", 137, 2026, "d2", "Bon de livraison", "impayé", "Standard", false, "2026-07-29", "2026-08-29", "Projet reporté", [
    item("l1", "DES-001", "Identité visuelle", "Projet reporté", 1, 2400, "t4"),
  ], 0, 0),
  makeInvoice("f7", "c1", 64, 2026, "d2", "Devis", "impayé", "Proforma", false, "2026-09-01", "2026-09-21", "", [
    item("l1", "", "Infrastructure cloud", "Abonnement annuel", 1, 4100, "t4"),
  ], 0, 0),
  makeInvoice("f8", "c5", 63, 2026, "d1", "Facture", "Partiellement payé", "Proforma", false, "2026-08-19", "2026-09-19", "", [
    item("l1", "", "Fourniture énergie", "Site Tunis", 1, 6700, "t1"),
  ], 1, 3350),
  makeInvoice("f9", "c5", 62, 2026, "d1", "Facture", "Payé", "Proforma", true, "2026-08-08", "2026-09-08", "", [
    item("l1", "", "Transport matériel", "Sfax — Tunis", 3, 750, "t4"),
  ], 0, 2250),
  makeInvoice("f10", "c1", 61, 2026, "d1", "Bon de livraison", "impayé", "Proforma", false, "2026-07-30", "2026-08-30", "Annulé", [
    item("l1", "", "Sous-traitance design", "Annulé", 1, 1500, "t4"),
  ], 0, 0),
];

export const payments: Payment[] = [
  { id: "pay1", invoice: { id: "f1", number: 142, year: 2026, type: "Standard", total: invoices[0]!.total, currency: invoices[0]!.currency }, amountPaid: 9000, paymentMethod: "Virement bancaire", paymentDate: "2026-09-05", createdBy: "admin1" },
  { id: "pay2", invoice: { id: "f2", number: 141, year: 2026, type: "Standard", total: invoices[1]!.total, currency: invoices[1]!.currency }, amountPaid: 7400, paymentMethod: "Virement bancaire", paymentDate: "2026-08-30", createdBy: "admin1" },
  { id: "pay3", invoice: { id: "f5", number: 138, year: 2026, type: "Standard", total: invoices[4]!.total, currency: invoices[4]!.currency }, amountPaid: 9800, paymentMethod: "Espèces", paymentDate: "2026-08-06", createdBy: "admin1" },
  { id: "pay4", invoice: { id: "f8", number: 63, year: 2026, type: "Proforma", total: invoices[7]!.total, currency: invoices[7]!.currency }, amountPaid: 3350, paymentMethod: "Autres", paymentDate: "2026-08-21", createdBy: "admin1" },
  { id: "pay5", invoice: { id: "f9", number: 62, year: 2026, type: "Proforma", total: invoices[8]!.total, currency: invoices[8]!.currency }, amountPaid: 2250, paymentMethod: "Virement bancaire", paymentDate: "2026-08-09", createdBy: "admin1" },
];

export const invoiceNumberLabel = (inv: Pick<Invoice, "type" | "year" | "number">) =>
  `${inv.type === "Standard" ? "FV" : "FA"}-${inv.year}-${String(inv.number).padStart(4, "0")}`;

export const revenueSeries = [
  { mois: "Jan", revenus: 21400, depenses: 14200 },
  { mois: "Fév", revenus: 26800, depenses: 15100 },
  { mois: "Mar", revenus: 24200, depenses: 16300 },
  { mois: "Avr", revenus: 31500, depenses: 17400 },
  { mois: "Mai", revenus: 29800, depenses: 16900 },
  { mois: "Juin", revenus: 36400, depenses: 19800 },
  { mois: "Juil", revenus: 34100, depenses: 18600 },
  { mois: "Août", revenus: 41200, depenses: 21300 },
  { mois: "Sep", revenus: 46800, depenses: 22400 },
];

export const statutDistribution = [
  { name: "Payé", value: 42 },
  { name: "Partiellement payé", value: 18 },
  { name: "impayé", value: 26 },
  { name: "Retard", value: 14 },
];

export const activities = [
  { id: "a1", titre: "Facture FV-2026-0142 envoyée", detail: "Medina Digital SARL", temps: "il y a 2 h" },
  { id: "a2", titre: "Paiement reçu — 7 400 €", detail: "Groupe Céleste", temps: "il y a 6 h" },
  { id: "a3", titre: "Nouveau client ajouté", detail: "Carthage Textile", temps: "hier" },
  { id: "a4", titre: "Facture en retard", detail: "Sonia Trabelsi — 3 200 DT", temps: "il y a 2 jours" },
  { id: "a5", titre: "Dépense enregistrée", detail: "Campagne LinkedIn — 300 €", temps: "il y a 3 jours" },
];

export const sparkA = [12, 18, 15, 24, 22, 30, 28, 36];
export const sparkB = [30, 26, 28, 22, 25, 18, 20, 16];
export const sparkC = [4, 6, 5, 8, 9, 11, 12, 14];
export const sparkD = [18, 14, 20, 17, 22, 19, 24, 21];

export const formatMoney = (value: number, devise = "TND") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise, maximumFractionDigits: 2 }).format(value);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));

// French amount-in-words, e.g. "dix-huit mille six cents Dinar et six cents millimes" —
// printed on every invoice PDF: "la présente facture est arrêtée à la somme de …"
const FR_UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const FR_TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function under100(n: number): string {
  if (n < 20) return FR_UNITS[n] ?? "";
  const dizaine = Math.floor(n / 10);
  const unite = n % 10;
  if (dizaine === 7 || dizaine === 9) {
    const base = dizaine - 1;
    if (unite === 0) return `${FR_TENS[base]}-dix`;
    if (unite === 1) return `${FR_TENS[base]}-et-${FR_UNITS[10 + unite]}`;
    return `${FR_TENS[base]}-${FR_UNITS[10 + unite]}`;
  }
  const tensWord = FR_TENS[dizaine] ?? "";
  if (unite === 0) return dizaine === 8 ? `${tensWord}s` : tensWord;
  if (unite === 1 && dizaine !== 8) return `${tensWord}-et-un`;
  return `${tensWord}-${FR_UNITS[unite]}`;
}

function under1000(n: number): string {
  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  let text = "";
  if (centaines > 0) {
    if (centaines > 1) text += `${FR_UNITS[centaines]} `;
    text += "cent";
    if (centaines > 1 && reste === 0) text += "s";
    if (reste > 0) text += " ";
  }
  if (reste > 0) text += under100(reste);
  return text.trim();
}

function numberToFrenchWords(n: number): string {
  if (n === 0) return "zéro";
  const milliards = Math.floor(n / 1_000_000_000);
  n %= 1_000_000_000;
  const millions = Math.floor(n / 1_000_000);
  n %= 1_000_000;
  const milliers = Math.floor(n / 1000);
  const reste = n % 1000;

  let text = "";
  if (milliards > 0) text += `${under1000(milliards)} ${milliards > 1 ? "milliards" : "milliard"} `;
  if (millions > 0) text += `${under1000(millions)} ${millions > 1 ? "millions" : "million"} `;
  if (milliers > 0) text += milliers === 1 ? "mille " : `${under1000(milliers)} mille `;
  if (reste > 0) text += under1000(reste);
  return text.trim();
}

export const amountInWords = (total: number, currencyName: string) => {
  const integerPart = Math.floor(total);
  const decimalPart = Math.round((total - integerPart) * 1000);
  let text = `${numberToFrenchWords(integerPart)} ${currencyName}`;
  if (decimalPart > 0) {
    const decimalWords = numberToFrenchWords(decimalPart);
    text += currencyName.trim() === "Dinar" ? ` et ${decimalWords} millimes` : ` et ${decimalWords}`;
  }
  return text.trim();
};

// ---------- Extra UI-only data (no backend equivalent) ----------

export type Plan = {
  id: string;
  nom: string;
  tagline: string;
  prixMensuel: number;
  prixAnnuel: number;
  populaire?: boolean;
  fonctionnalites: string[];
};

export const plans: Plan[] = [
  {
    id: "starter",
    nom: "Starter",
    tagline: "Pour démarrer sereinement",
    prixMensuel: 29,
    prixAnnuel: 290,
    fonctionnalites: ["Jusqu'à 20 factures / mois", "2 utilisateurs", "1 entreprise", "Support par e-mail"],
  },
  {
    id: "pro",
    nom: "Pro",
    tagline: "Pour les équipes en croissance",
    prixMensuel: 69,
    prixAnnuel: 690,
    populaire: true,
    fonctionnalites: ["Factures illimitées", "10 utilisateurs", "3 entreprises", "Rapports avancés", "Support prioritaire"],
  },
  {
    id: "entreprise",
    nom: "Entreprise",
    tagline: "Pour les organisations exigeantes",
    prixMensuel: 149,
    prixAnnuel: 1490,
    fonctionnalites: ["Tout Pro inclus", "Utilisateurs illimités", "Entreprises illimitées", "Accès API", "Accompagnement dédié"],
  },
];

export const companyProfile: CompanySettings = {
  name: "Zouhair Facture SARL",
  matriculefisc: "1892034/M",
  address: "12 Rue des Oliviers, Les Berges du Lac",
  state: "Tunis",
  country: "Tunisie",
  email: "contact@zouhairfacture.tn",
  phone: "+216 71 900 220",
  website: "www.zouhairfacture.tn",
  taxNumber: "1892034/M",
  vatNumber: "TN1892034M",
  registrationNumber: "B1234562026",
  logo: null,
};

export const adminProfile: AdminProfile = {
  name: "Zouhair",
  surname: "Bennajeh",
  email: "zouhair@facture.tn",
  role: "owner",
  photo: null,
  etat: "Active",
  planExpiration: "2026-09-20",
};

// ---------- SuperAdmin platform data (Admin facture app) ----------

export const tenantAdmins: TenantAdmin[] = [
  { id: "adm1", name: "Zouhair", surname: "Bennajeh", email: "zouhair@facture.tn", etat: "Active", planExpiration: "2026-09-20", created: "2026-08-27", renewalRequested: false },
  { id: "adm2", name: "Rania", surname: "Cherif", email: "rania.cherif@studio-r.tn", etat: "Active", planExpiration: "2026-10-02", created: "2026-07-14", renewalRequested: false },
  { id: "adm3", name: "Hedi", surname: "Mansour", email: "hedi@mansourconsult.tn", etat: "Suspendue", planExpiration: "2026-09-05", created: "2026-06-01", renewalRequested: true },
  { id: "adm4", name: "Farah", surname: "Ayadi", email: "farah@ayadidesign.tn", etat: "Désactivé", planExpiration: "2026-08-18", created: "2026-05-22", renewalRequested: false },
  { id: "adm5", name: "Mehdi", surname: "Sassi", email: "mehdi.sassi@buildwise.tn", etat: "expiré", planExpiration: "2026-08-01", created: "2026-04-10", renewalRequested: true },
  { id: "adm6", name: "Olfa", surname: "Trabelsi", email: "olfa@atelier-o.tn", etat: "Active", planExpiration: "2026-09-28", created: "2026-08-30", renewalRequested: false },
];

export const joinRequests: JoinRequest[] = [
  {
    id: "jr1",
    nom: "Khadraoui",
    prenom: "Sami",
    email: "sami.khadraoui@novacom.tn",
    telephone: "+216 24 118 903",
    entreprise: "NovaCom Agency",
    message: "Nous cherchons un outil de facturation pour notre agence de 8 personnes, avec suivi des devis.",
    status: "En attente",
    created: "2026-09-08",
  },
  {
    id: "jr2",
    nom: "Ferjani",
    prenom: "Lina",
    email: "lina.ferjani@atelierlf.tn",
    telephone: "+216 98 220 447",
    entreprise: "Atelier LF",
    message: "Intéressée par le plan Pro, souhaite une démo avant de démarrer.",
    status: "Contacté",
    created: "2026-09-03",
  },
];
