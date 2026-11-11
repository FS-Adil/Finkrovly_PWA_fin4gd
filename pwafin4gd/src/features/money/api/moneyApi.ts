import { http } from '../../../shared/api/http'

export interface CashFlowItemMoney {
  itemId: string
  itemName: string
  income: number
  expense: number
  balance: number
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

// По умолчанию: последний месяц до текущего момента.
export const defaultMoneyPeriod = () => {
  const to = new Date()
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
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
