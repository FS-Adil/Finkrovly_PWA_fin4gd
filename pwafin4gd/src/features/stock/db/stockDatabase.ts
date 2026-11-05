import Dexie, { type Table } from 'dexie'
import type { StockOverview } from '../api/stockApi'

export interface StockCacheRecord {
  userId: string
  overview: StockOverview
  updatedAt: number
}

class StockCacheDatabase extends Dexie {
  stockOverview!: Table<StockCacheRecord, string>

  constructor() {
    super('fin4gd-stock-cache')

    this.version(1).stores({
      stockOverview: '&userId',
    })
  }
}

export const stockDatabase = new StockCacheDatabase()

export async function getStockCache(
  userId: string,
): Promise<StockCacheRecord | undefined> {
  return stockDatabase.stockOverview.get(userId)
}

export async function saveStockCache(
  record: StockCacheRecord,
): Promise<void> {
  await stockDatabase.stockOverview.put(record)
}

export async function deleteStockCache(
  userId: string,
): Promise<void> {
  await stockDatabase.stockOverview.delete(userId)
}