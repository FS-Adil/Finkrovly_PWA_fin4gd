import { useState } from 'react'
import { useStock } from './hooks/useStock'
import {
  type QuantityByUnit,
  type ProductStock,
} from './api/stockApi'

interface StockProps {
  userId: string
  onBack: () => void
}

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 3,
})

const formatMoney = (v: number) => currencyFormatter.format(v)
const formatNumber = (v: number) => numberFormatter.format(v)

/* ---------- Количества ---------- */
function QuantityList({ quantities }: { quantities: QuantityByUnit[] }) {
  if (!quantities.length) {
    return <span className="text-gray-400">Нет данных</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {quantities.map((item) => (
        <span
          key={item.unitOfMeasureCode}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm text-gray-700"
        >
          <span className="font-medium text-gray-900">
            {formatNumber(item.quantity)}
          </span>
          <span className="text-gray-500">{item.unitOfMeasureName}</span>
        </span>
      ))}
    </div>
  )
}

/* ---------- Таблица товаров ---------- */
function ProductsTable({ products }: { products: ProductStock[] }) {
  if (!products.length) {
    return (
      <p className="px-4 py-6 text-sm text-gray-500">
        Ничего не найдено на этом складе.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="whitespace-nowrap border-b border-gray-200 px-4 py-2 font-medium">
              Товар
            </th>
            <th className="whitespace-nowrap border-b border-gray-200 px-4 py-2 font-medium">
              Количество
            </th>
            <th className="whitespace-nowrap border-b border-gray-200 px-4 py-2 font-medium">
              Себестоимость за ед.
            </th>
            <th className="whitespace-nowrap border-b border-gray-200 px-4 py-2 text-right font-medium">
              Общая стоимость
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.productId}
              className="border-b border-gray-100 transition last:border-0 hover:bg-gray-50/70"
            >
              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                {product.productName}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-800">
                {formatNumber(product.quantity)}{' '}
                <span className="text-gray-500">
                  {product.unitOfMeasureName}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-800">
                {formatMoney(product.unitCost)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#123c2f]">
                {formatMoney(product.totalCost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- Основной компонент ---------- */
export default function Stock({ onBack, userId }: StockProps) {
  const {
    overview,
    isLoading,
    isRefreshing,
    error,
    cacheUpdatedAt,
    refresh,
  } = useStock(userId)

  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(
    new Set(),
  )

  const [searchQuery] = useState('')

  const toggleOrg = (id: string) => {
    setExpandedOrgs((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleWarehouse = (id: string) => {
    setExpandedWarehouses((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const expandAll = () => {
    if (!overview) return
    setExpandedOrgs(new Set(overview.organizations.map((o) => o.organizationId)))
    setExpandedWarehouses(
      new Set(
        overview.organizations.flatMap((o) =>
          o.warehouses.map((w) => w.warehouseId),
        ),
      ),
    )
  }

  const collapseAll = () => {
    setExpandedOrgs(new Set())
    setExpandedWarehouses(new Set())
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0
  const matches = (value: string) => value.toLowerCase().includes(normalizedQuery)

  const filteredOrganizations = overview
    ? overview.organizations
        .map((org) => {
          const orgMatches =
            matches(org.organizationCode) || matches(org.organizationId)

          const warehouses = org.warehouses
            .map((wh) => {
              const whMatches =
                matches(wh.warehouseName) || matches(wh.warehouseId)

              const products = wh.products.filter(
                (p) =>
                  matches(p.productName) ||
                  matches(String(p.productId)) ||
                  whMatches ||
                  orgMatches,
              )

              const visible = whMatches || products.length > 0 || orgMatches
              return { ...wh, visible, products }
            })
            .filter((wh) => wh.visible)

          const visible = orgMatches || warehouses.length > 0
          return { ...org, visible, warehouses }
        })
        .filter((org) => org.visible)
    : []

  const isOrgExpanded = (orgId: string) =>
    isSearching ? true : expandedOrgs.has(orgId)
  const isWarehouseExpanded = (whId: string) =>
    isSearching ? true : expandedWarehouses.has(whId)

  return (
    <main className="min-h-screen bg-[#f5f7f5] px-4 py-6 pb-12 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#38745b]">
              FinDigTech · Учёт товаров
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Товары и склад
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Остатки товаров и их стоимость по себестоимости.
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ← На главную
          </button>
        </header>

        {/* Meta / refresh */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            {cacheUpdatedAt
              ? `Обновлено: ${new Intl.DateTimeFormat('ru-RU', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(cacheUpdatedAt)}`
              : 'Данные ещё не загружены'}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isLoading || isRefreshing}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {isRefreshing ? 'Обновление…' : '↻ Обновить'}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ml-3 font-semibold underline"
            >
              Повторить
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#123c2f]" />
          </div>
        ) : overview && (
          <>
            {overview.partialData && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
              >
                Часть складских данных не загружена. Общий итог учитывает
                только успешно загруженные организации.
              </div>
            )}

            {/* Total */}
            <section className="mt-5 rounded-2xl bg-[#123c2f] p-6 text-white sm:p-8">
              <p className="text-sm text-white/70">Общая стоимость товаров</p>
              <p className="mt-3 text-3xl font-semibold sm:text-4xl">
                {formatMoney(overview.totalCost)}
              </p>
              <div className="mt-6">
                <p className="mb-3 text-sm text-white/70">
                  Общее количество по единицам измерения
                </p>
                {overview.totalQuantities.length ? (
                  <div className="flex flex-wrap gap-2">
                    {overview.totalQuantities.map((item) => (
                      <span
                        key={item.unitOfMeasureCode}
                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm"
                      >
                        {formatNumber(item.quantity)} {item.unitOfMeasureName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/60">Нет данных о количестве</p>
                )}
              </div>
            </section>

            {/* Organizations */}
            <section className="mt-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Организации
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Складские остатки отдельно по каждой организации.
                  </p>
                </div>

                {!isSearching && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={expandAll}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Раскрыть всё
                    </button>
                    <button
                      type="button"
                      onClick={collapseAll}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Скрыть всё
                    </button>
                  </div>
                )}
              </div>

              {filteredOrganizations.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center">
                  {isSearching ? (
                    <>
                      <p className="font-medium text-gray-800">Ничего не найдено</p>
                      <p className="mt-2 text-sm text-gray-500">
                        Попробуйте изменить запрос «{searchQuery}».
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-gray-800">Организации не найдены</p>
                      <p className="mt-2 text-sm text-gray-500">
                        Для вашей учётной записи пока нет доступных организаций.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredOrganizations.map((organization) => {
                    const orgExpanded = isOrgExpanded(organization.organizationId)

                    return (
                      <article
                        key={organization.organizationId}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                      >
                        {/* ===== ORG HEADER ===== */}
                        <button
                          type="button"
                          onClick={() => toggleOrg(organization.organizationId)}
                          className="flex w-full flex-wrap items-center justify-between gap-3 bg-[#1f5a44] px-5 py-4 text-left text-white transition hover:bg-[#194a38] sm:px-6"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-white/70 transition-transform ${
                                orgExpanded ? 'rotate-90' : ''
                              }`}
                            >
                              ▶
                            </span>
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-white/50">
                                Организация
                              </p>
                              <h3 className="text-base font-semibold sm:text-lg">
                                {organization.organizationCode}
                              </h3>
                            </div>
                          </div>

                          {organization.dataLoaded ? (
                            <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                              {formatMoney(organization.totalCost)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-medium text-amber-100">
                              Данные не загружены
                            </span>
                          )}
                        </button>

                        {/* ===== ORG CONTENT ===== */}
                        {orgExpanded && (
                          <>
                            {!organization.dataLoaded ? (
                              <div className="p-5 sm:p-6">
                                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                                  {organization.loadingError ||
                                    'Не удалось получить данные этой организации.'}
                                </p>
                              </div>
                            ) : (
                              <div className="bg-[#f7f9f7] p-4 sm:p-6">
                                {/* Org summary */}
                                <div className="mb-4 grid gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
                                  <div>
                                    <p className="text-xs text-gray-400">
                                      Стоимость товаров
                                    </p>
                                    <p className="mt-1 text-xl font-semibold text-[#123c2f]">
                                      {formatMoney(organization.totalCost)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">Количество</p>
                                    <div className="mt-2">
                                      <QuantityList
                                        quantities={organization.totalQuantities}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {organization.warehouses.length === 0 ? (
                                  <p className="text-sm text-gray-500">
                                    {isSearching
                                      ? 'Ничего не найдено в этой организации.'
                                      : 'На складах этой организации пока нет товаров.'}
                                  </p>
                                ) : (
                                  <div className="space-y-4">
                                    {organization.warehouses.map((warehouse) => {
                                      const whExpanded = isWarehouseExpanded(
                                        warehouse.warehouseId,
                                      )

                                      return (
                                        <section
                                          key={warehouse.warehouseId}
                                          className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                                        >
                                          {/* ===== WAREHOUSE HEADER ===== */}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              toggleWarehouse(warehouse.warehouseId)
                                            }
                                            className="flex w-full flex-wrap items-center justify-between gap-3 border-l-4 border-[#38745b] bg-white px-4 py-3 text-left transition hover:bg-gray-50 sm:px-5"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`text-gray-400 transition-transform ${
                                                  whExpanded ? 'rotate-90' : ''
                                                }`}
                                              >
                                                ▶
                                              </span>
                                              <div>
                                                <p className="text-[11px] uppercase tracking-wider text-gray-400">
                                                  Склад
                                                </p>
                                                <h4 className="font-semibold text-gray-900">
                                                  {warehouse.warehouseName}
                                                </h4>
                                                <p className="mt-0.5 text-xs text-gray-400">
                                                  {warehouse.products.length} поз.
                                                </p>
                                              </div>
                                            </div>

                                            <p className="font-semibold text-[#123c2f]">
                                              {formatMoney(warehouse.totalCost)}
                                            </p>
                                          </button>

                                          {/* ===== WAREHOUSE CONTENT ===== */}
                                          {whExpanded && (
                                            <div className="border-t border-gray-200">
                                              <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3 sm:px-5">
                                                <p className="mb-2 text-xs text-gray-400">
                                                  Количество на складе
                                                </p>
                                                <QuantityList
                                                  quantities={warehouse.totalQuantities}
                                                />
                                              </div>

                                              {/* ===== PRODUCTS TABLE ===== */}
                                              <ProductsTable
                                                products={warehouse.products}
                                              />
                                            </div>
                                          )}
                                        </section>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}