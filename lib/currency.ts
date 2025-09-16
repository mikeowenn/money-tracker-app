// Currency utilities and exchange rate management

export interface Currency {
  code: string
  name: string
  symbol: string
  flag: string
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬" },
]

export function getCurrencyByCode(code: string): Currency | undefined {
  return SUPPORTED_CURRENCIES.find((currency) => currency.code === code)
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrencyByCode(currencyCode)
  if (!currency) return `${amount.toFixed(2)} ${currencyCode}`

  return `${currency.symbol}${amount.toFixed(2)}`
}

// Fetch live exchange rates from a free API
export async function fetchExchangeRates(baseCurrency = "USD"): Promise<Record<string, number>> {
  try {
    // Using exchangerate-api.com free tier (1500 requests/month)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`)

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates")
    }

    const data = await response.json()
    return data.rates || {}
  } catch (error) {
    console.error("Error fetching exchange rates:", error)
    // Return default rates if API fails
    return getDefaultRates(baseCurrency)
  }
}

// Fallback exchange rates (approximate)
function getDefaultRates(baseCurrency: string): Record<string, number> {
  const defaultRates: Record<string, Record<string, number>> = {
    USD: {
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.0,
      CAD: 1.25,
      AUD: 1.35,
      CHF: 0.92,
      CNY: 6.45,
      INR: 74.5,
      SGD: 1.35,
    },
    EUR: {
      USD: 1.18,
      GBP: 0.86,
      JPY: 129.5,
      CAD: 1.47,
      AUD: 1.59,
      CHF: 1.08,
      CNY: 7.6,
      INR: 87.8,
      SGD: 1.59,
    },
  }

  return defaultRates[baseCurrency] || defaultRates.USD
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return amount

  try {
    const rates = await fetchExchangeRates(fromCurrency)
    const rate = rates[toCurrency]

    if (!rate) {
      console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`)
      return amount
    }

    return amount * rate
  } catch (error) {
    console.error("Currency conversion error:", error)
    return amount
  }
}
