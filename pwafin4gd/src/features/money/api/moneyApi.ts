import { http } from '../../../shared/api/http'

export interface CashFlowItemMoney {
  itemId: string | null
  itemName: string | null
  income: number
  expense: number
  balance: number
  documents: MoneyDocument[]
}

export interface CashDeskMoney {
  cashDeskId: string
  cashDeskName: string
  items: CashFlowItemMoney[]
  openingBalance: number
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface OrganizationMoney {
  organizationId: string | null
  organizationCode: string | null
  dataLoaded: boolean
  loadingError: string | null
  cashDesks: CashDeskMoney[]
  openingBalance: number
  totalIncome: number
  totalExpense: number
  balance: number
}


export interface MoneyOverview {
  organizations: OrganizationMoney[]
  openingBalance: number
  totalIncome: number
  totalExpense: number
  balance: number
  partialData: boolean
}

export interface MoneyPeriod {
  from: string // ISO, UTC
  to: string
}

export interface MoneyDocument {
  documentId: string | null
  documentNumber: string | null
  documentDate: string | null
  documentType: string | null
  description: string | null
  income: number
  expense: number
}

const pad = (n: number) => String(n).padStart(2, '0')

const mskParts = () => {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000)
  return {
    y: d.getUTCFullYear(),
    mo: pad(d.getUTCMonth() + 1),
    d: pad(d.getUTCDate()),
    h: pad(d.getUTCHours()),
    mi: pad(d.getUTCMinutes()),
  }
}

export const defaultMoneyPeriod = () => {
  const { y, mo, d, h, mi } = mskParts()
  return {
    from: `${y}-${mo}-${d}T00:00:00+03:00`,
    to:   `${y}-${mo}-${d}T${h}:${mi}:00+03:00`,
  }
}

export const moneyApi = {
  getOverview: async (period: MoneyPeriod): Promise<MoneyOverview> => {
    const { data } = await http.get<MoneyOverview>('/api/money/overview', {
      params: { from: period.from, to: period.to },
    })

    return data
  },
}
