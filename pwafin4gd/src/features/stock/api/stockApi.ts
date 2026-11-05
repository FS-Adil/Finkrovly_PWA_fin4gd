
import { http } from '../../../shared/api/http'

export interface QuantityByUnit {
  unitOfMeasureCode: string
  unitOfMeasureName: string
  quantity: number
}

export interface ProductStock {
  productId: string
  productName: string
  quantity: number
  unitOfMeasureCode: string
  unitOfMeasureName: string
  unitCost: number
  totalCost: number
}

export interface WarehouseStock {
  warehouseId: string
  warehouseName: string
  products: ProductStock[]
  totalQuantities: QuantityByUnit[]
  totalCost: number
}

export interface OrganizationStock {
  organizationId: string
  organizationCode: string
  dataLoaded: boolean
  loadingError: string | null
  warehouses: WarehouseStock[]
  totalQuantities: QuantityByUnit[]
  totalCost: number
}

export interface StockOverview {
  organizations: OrganizationStock[]
  totalQuantities: QuantityByUnit[]
  totalCost: number
  partialData: boolean
}

export const stockApi = {
  getOverview: async (): Promise<StockOverview> => {
    const { data } = await http.get<StockOverview>(
      '/api/stock/overview',
    )

    return data
  },
}
