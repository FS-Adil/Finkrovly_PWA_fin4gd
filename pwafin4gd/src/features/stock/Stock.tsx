
import { useStock } from './hooks/useStock'
import {
//   stockApi,
//   type StockOverview,
  type QuantityByUnit,
  type ProductStock,
} from './api/stockApi'

interface StockProps {
  onBack: () => void
}

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

function formatMoney(value: number): string {
  return currencyFormatter.format(value)
}

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

function QuantityList({
  quantities,
}: {
  quantities: QuantityByUnit[]
}) {
  if (!quantities.length) {
    return <span className="text-gray-400">Нет данных</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {quantities.map((item) => (
        <span
          key={item.unitOfMeasureCode}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700"
        >
          {formatNumber(item.quantity)} {item.unitOfMeasureName}
        </span>
      ))}
    </div>
  )
}

function ProductRow({ product }: { product: ProductStock }) {
  return (
    <div className="grid gap-3 border-b border-gray-100 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="font-medium text-gray-900">
          {product.productName}
        </p>

        <p className="mt-1 text-xs text-gray-400">
          ID: {product.productId}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm sm:flex sm:items-center sm:gap-8">
        <div>
          <p className="text-xs text-gray-400">Количество</p>
          <p className="mt-1 font-medium text-gray-800">
            {formatNumber(product.quantity)} {product.unitOfMeasureName}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400">Себестоимость за ед.</p>
          <p className="mt-1 font-medium text-gray-800">
            {formatMoney(product.unitCost)}
          </p>
        </div>

        <div className="col-span-2 sm:min-w-36">
          <p className="text-xs text-gray-400">Общая стоимость</p>
          <p className="mt-1 font-semibold text-[#123c2f]">
            {formatMoney(product.totalCost)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Stock({ onBack, userId }: StockProps) {
  const {
    overview,
    isLoading,
    isRefreshing,
    error,
    cacheUpdatedAt,
    refresh,
  } = useStock(userId)

// export default function Stock({ onBack }: StockProps) {
//   const [overview, setOverview] = useState<StockOverview | null>(null)
//   const [isLoading, setIsLoading] = useState(true)
//   const [error, setError] = useState('')

//   const loadStock = useCallback(async () => {
//     setIsLoading(true)
//     setError('')

//     try {
//       const result = await stockApi.getOverview()
//       setOverview(result)
//     } catch (err) {
//       if (import.meta.env.DEV) {
//         console.error('Не удалось загрузить складские данные:', err)
//       }

//       setError(
//         'Не удалось загрузить складские данные. Проверьте подключение к серверу.',
//       )
//     } finally {
//       setIsLoading(false)
//     }
//   }, [])

//   useEffect(() => {
//     void loadStock()
//   }, [loadStock])

  return (
    <main className="min-h-screen bg-[#f5f7f5] px-4 py-6 pb-12 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
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

        {/* <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void loadStock()}
            disabled={isLoading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? 'Загрузка…' : '↻ Обновить'}
          </button>
        </div> */}

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
            //   onClick={() => void loadStock()}
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

            <section className="mt-5 rounded-2xl bg-[#123c2f] p-6 text-white sm:p-8">
              <p className="text-sm text-white/70">
                Общая стоимость товаров
              </p>

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
                  <p className="text-sm text-white/60">
                    Нет данных о количестве
                  </p>
                )}
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-900">
                  Организации
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Складские остатки отдельно по каждой организации.
                </p>
              </div>

              {overview.organizations.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center">
                  <p className="font-medium text-gray-800">
                    Организации не найдены
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Для вашей учётной записи пока нет доступных организаций.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {overview.organizations.map((organization) => (
                    <article
                      key={organization.organizationId}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="border-b border-gray-100 p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {organization.organizationCode}
                            </h3>

                            <p className="mt-1 text-xs text-gray-400">
                              ID: {organization.organizationId}
                            </p>
                          </div>

                          {organization.dataLoaded ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                              Данные загружены
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                              Данные не загружены
                            </span>
                          )}
                        </div>

                        {!organization.dataLoaded ? (
                          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                            {organization.loadingError ||
                              'Не удалось получить данные этой организации.'}
                          </p>
                        ) : (
                          <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-gray-400">
                                Стоимость товаров
                              </p>
                              <p className="mt-1 text-xl font-semibold text-[#123c2f]">
                                {formatMoney(organization.totalCost)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-400">
                                Количество
                              </p>
                              <div className="mt-2">
                                <QuantityList
                                  quantities={organization.totalQuantities}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {organization.dataLoaded && (
                        <div className="p-5 sm:p-6">
                          {organization.warehouses.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              На складах этой организации пока нет товаров.
                            </p>
                          ) : (
                            <div className="space-y-5">
                              {organization.warehouses.map((warehouse) => (
                                <section
                                  key={warehouse.warehouseId}
                                  className="rounded-xl border border-gray-100 bg-[#fafbfa] p-4 sm:p-5"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <h4 className="font-semibold text-gray-900">
                                        {warehouse.warehouseName}
                                      </h4>

                                      <p className="mt-1 text-xs text-gray-400">
                                        ID: {warehouse.warehouseId}
                                      </p>
                                    </div>

                                    <p className="font-semibold text-[#123c2f]">
                                      {formatMoney(warehouse.totalCost)}
                                    </p>
                                  </div>

                                  <div className="mt-4">
                                    <p className="mb-2 text-xs text-gray-400">
                                      Количество на складе
                                    </p>
                                    <QuantityList
                                      quantities={warehouse.totalQuantities}
                                    />
                                  </div>

                                  <div className="mt-4 border-t border-gray-200">
                                    {warehouse.products.map((product) => (
                                      <ProductRow
                                        key={product.productId}
                                        product={product}
                                      />
                                    ))}
                                  </div>
                                </section>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
