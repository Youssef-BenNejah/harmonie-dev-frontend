export type WorldCurrency = { code: string; name: string; symbol: string };

const names = new Intl.DisplayNames("fr", { type: "currency" });

function symbolFor(code: string): string {
  try {
    const part = new Intl.NumberFormat("fr-FR", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part?.value ?? code;
  } catch {
    return code;
  }
}

export const WORLD_CURRENCIES: WorldCurrency[] = Intl.supportedValuesOf("currency")
  .map((code) => ({ code, name: names.of(code) ?? code, symbol: symbolFor(code) }))
  .sort((a, b) => a.code.localeCompare(b.code));
