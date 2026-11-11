import Dexie, { type Table } from 'dexie'
import type { MoneyOverview, MoneyPeriod } from '../api/moneyApi'

export interface MoneyCacheRecord {
  userId: string
  overview: MoneyOverview
  period: MoneyPeriod
  updatedAt: number
}

class MoneyCacheDatabase extends Dexie {
  moneyOverview!: Table<MoneyCacheRecord, string>

  constructor() {
    super('fin4gd-money-cache')

    this.version(1).stores({
      moneyOverview: '&userId',
    })

    // Формат записи изменился — старый кеш очищаем.
    this.version(3)
      .stores({ moneyOverview: '&userId' })
      .upgrade((tx) => tx.table('moneyOverview').clear())
  }
}

export const moneyDatabase = new MoneyCacheDatabase()

export async function getMoneyCache(
  userId: string,
): Promise<MoneyCacheRecord | undefined> {
  return moneyDatabase.moneyOverview.get(userId)
}

export async function saveMoneyCache(
  record: MoneyCacheRecord,
): Promise<void> {
  await moneyDatabase.moneyOverview.put(record)
}

export async function deleteMoneyCache(userId: string): Promise<void> {
  await moneyDatabase.moneyOverview.delete(userId)
}
