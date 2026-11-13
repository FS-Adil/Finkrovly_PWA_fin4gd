import { Fragment, useState } from 'react'
import { useMoney } from './hooks/useMoney'
import {
  defaultMoneyPeriod,
  type CashFlowItemMoney,
  type MoneyDocument,
  type OrganizationMoney,
} from './api/moneyApi'

interface MoneyProps {
  userId: string
  onBack: () => void
}

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const formatMoney = (value: number) => currencyFormatter.format(value)

const balanceColor = (value: number) =>
  value < 0 ? 'text-red-600' : 'text-[#123c2f]'

const pad = (n: number) => String(n).padStart(2, '0')

// ISO (UTC) с сервера -> "YYYY-MM-DDTHH:mm" в МСК (для <input>)
const toInputValue = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 3 * 60 * 60 * 1000)
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  )
}

// "YYYY-MM-DDTHH:mm" из инпута (МСК) -> "YYYY-MM-DDTHH:mm:00+03:00"
const fromInputValue = (value: string) => `${value}:00+03:00`

function toggleSetValue(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)

  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }

  return next
}

/* ---------- На начало / поступления / расход ---------- */
function FlowSummary({
  opening,
  income,
  expense,
}: {
  opening: number
  income: number
  expense: number
}) {
  const chip =
    'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm'

  return (
    <div className="flex flex-wrap gap-2">
      <span className={chip}>
        <span className="text-gray-500">На начало</span>
        <span className={`font-medium ${balanceColor(opening)}`}>
          {formatMoney(opening)}
        </span>
      </span>

      <span className={chip}>
        <span className="text-gray-500">Поступления</span>
        <span className="font-medium text-emerald-700">
          {formatMoney(income)}
        </span>
      </span>

      <span className={chip}>
        <span className="text-gray-500">Расход</span>
        <span className="font-medium text-red-600">
          {formatMoney(expense)}
        </span>
      </span>
    </div>
  )
}

/* ---------- Таблица документов ---------- */
function DocumentsTable({ documents }: { documents: MoneyDocument[] }) {
  if (documents.length === 0) {
    return (
      <p className="px-4 py-4 text-sm text-gray-500">
        Документы по этой статье отсутствуют.
      </p>
    )
  }

  const th = 'whitespace-nowrap border-b border-gray-200 px-4 py-2 font-medium'

  return (
    <div className="overflow-x-auto border-t border-gray-100 bg-gray-50/60">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className={th}>Дата</th>
            <th className={th}>Номер</th>
            <th className={th}>Тип документа</th>
            <th className={th}>Описание</th>
            <th className={`${th} text-right`}>Поступления</th>
            <th className={`${th} text-right`}>Расход</th>
          </tr>
        </thead>

        <tbody>
          {documents.map((document, index) => (
            <tr
              key={
                document.documentId ??
                `${document.documentNumber ?? 'doc'}-${index}`
              }
              className="border-b border-gray-100 last:border-0"
            >
              <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                {document.documentDate
                  ? dateFormatter.format(new Date(document.documentDate))
                  : '—'}
              </td>

              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                {document.documentNumber || '—'}
              </td>

              <td className="px-4 py-3 text-gray-700">
                {document.documentType || '—'}
              </td>

              <td className="px-4 py-3 text-gray-600">
                {document.description || '—'}
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-right text-emerald-700">
                {formatMoney(document.income)}
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-right text-red-600">
                {formatMoney(document.expense)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ItemsTable({ items }: { items: CashFlowItemMoney[] }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-gray-500">
        По этой кассе нет движений за период.
      </p>
    )
  }

  const th = 'whitespace-nowrap border-b border-gray-200 px-4 py-2 font-medium'

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className={th}>Статья</th>
            <th className={`${th} text-right`}>Поступления</th>
            <th className={`${th} text-right`}>Расход</th>
            <th className={`${th} text-right`}>Сальдо за период</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => {
            const itemKey = item.itemId ?? `no-item-${index}`
            const documents = item.documents ?? []
            const itemExpanded = expandedItems.has(itemKey)

            return (
              <Fragment key={itemKey}>
                <tr className="border-b border-gray-100 transition last:border-0 hover:bg-gray-50/70">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-expanded={itemExpanded}
                      onClick={() =>
                        setExpandedItems((previous) =>
                          toggleSetValue(previous, itemKey),
                        )
                      }
                      className="flex items-center gap-2 text-left font-medium text-gray-900"
                    >
                      <span
                        className={`text-gray-400 transition-transform ${
                          itemExpanded ? 'rotate-90' : ''
                        }`}
                      >
                        ▶
                      </span>

                      {item.itemName || 'Без статьи'}

                      <span className="text-xs font-normal text-gray-400">
                        {documents.length} док.
                      </span>
                    </button>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right text-emerald-700">
                    {formatMoney(item.income)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right text-red-600">
                    {formatMoney(item.expense)}
                  </td>

                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${balanceColor(item.balance)}`}
                  >
                    {formatMoney(item.balance)}
                  </td>
                </tr>

                {itemExpanded && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <DocumentsTable documents={documents} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}


/* ---------- Основной компонент ---------- */
export default function Money({ onBack, userId }: MoneyProps) {
  const {
    overview,
    isLoading,
    isRefreshing,
    error,
    cacheUpdatedAt,
    period,
    setPeriod,
    refresh,
  } = useMoney(userId)

  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())
  const [expandedCashDesks, setExpandedCashDesks] = useState<Set<string>>(
    new Set(),
  )

  // Ключ кассы составной: одна касса может встретиться в разных организациях.
  const cashDeskKey = (organizationId: string, cashDeskId: string) =>
    `${organizationId}:${cashDeskId}`

  // Если ID организации отсутствует, используем индекс.
  const orgKey = (organization: OrganizationMoney, index: number) =>
    organization.organizationId ?? `invalid-${index}`

  const toggleOrg = (id: string) => {
    setExpandedOrgs((previous) => toggleSetValue(previous, id))
  }

  const toggleCashDesk = (id: string) => {
    setExpandedCashDesks((previous) => toggleSetValue(previous, id))
  }

  const expandAll = () => {
    if (!overview) return

    setExpandedOrgs(
      new Set(overview.organizations.map((organization, index) => orgKey(organization, index))),
    )

    setExpandedCashDesks(
      new Set(
        overview.organizations.flatMap((organization, index) =>
          organization.cashDesks.map((cashDesk) =>
            cashDeskKey(orgKey(organization, index), cashDesk.cashDeskId),
          ),
        ),
      ),
    )
  }

  const collapseAll = () => {
    setExpandedOrgs(new Set())
    setExpandedCashDesks(new Set())
  }

  const outlineButton =
    'rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50'

  const dateInput =
    'mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900'

  const totalChip =
    'rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm'

  return (
    <main className="min-h-screen bg-[#f5f7f5] px-4 py-6 pb-12 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#38745b]">
              FinDigTech · Учёт денег
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Денежные средства
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Остатки денег по организациям, кассам, статьям и документам.
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className={`${outlineButton} py-2.5`}
          >
            ← На главную
          </button>
        </header>

        {/* Период */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-gray-500">
              Начало периода (включительно)
              <input
                type="datetime-local"
                value={toInputValue(period.from)}
                onChange={(event) => {
                  if (event.target.value) {
                    setPeriod({
                      ...period,
                      from: fromInputValue(event.target.value),
                    })
                  }
                }}
                className={dateInput}
              />
            </label>

            <label className="text-xs text-gray-500">
              Конец периода (не включая)
              <input
                type="datetime-local"
                value={toInputValue(period.to)}
                onChange={(event) => {
                  if (event.target.value) {
                    setPeriod({
                      ...period,
                      to: fromInputValue(event.target.value),
                    })
                  }
                }}
                className={dateInput}
              />
            </label>

            <button
              type="button"
              onClick={() => setPeriod(defaultMoneyPeriod())}
              className={`${outlineButton} py-2`}
            >
              На Сегодня
            </button>
          </div>
        </div>

        {/* Обновление */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            {cacheUpdatedAt
              ? `Обновлено: ${dateFormatter.format(cacheUpdatedAt)}`
              : 'Данные ещё не загружены'}
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isLoading || isRefreshing}
            className={`${outlineButton} py-2.5 disabled:opacity-50`}
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
        ) : (
          overview && (
            <>
              {overview.partialData && (
                <div
                  role="status"
                  className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                >
                  Часть данных по кассам не загружена. Общий итог учитывает
                  только успешно загруженные организации.
                </div>
              )}

              {/* Общий итог */}
              <section className="mt-5 rounded-2xl bg-[#123c2f] p-6 text-white sm:p-8">
                <p className="text-sm text-white/70">
                  Всего денег на конец периода
                </p>

                <p className="mt-3 text-3xl font-semibold sm:text-4xl">
                  {formatMoney(overview.balance)}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className={totalChip}>
                    На начало периода: {formatMoney(overview.openingBalance)}
                  </span>

                  <span className={totalChip}>
                    Поступления: {formatMoney(overview.totalIncome)}
                  </span>

                  <span className={totalChip}>
                    Расход: {formatMoney(overview.totalExpense)}
                  </span>
                </div>
              </section>

              {/* Организации */}
              <section className="mt-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Организации
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Денежные средства отдельно по каждой организации.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={expandAll}
                      className={`${outlineButton} py-2`}
                    >
                      Раскрыть всё
                    </button>

                    <button
                      type="button"
                      onClick={collapseAll}
                      className={`${outlineButton} py-2`}
                    >
                      Скрыть всё
                    </button>
                  </div>
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
                  <div className="space-y-6">
                    {overview.organizations.map((organization, index) => {
                      const id = orgKey(organization, index)
                      const organizationExpanded = expandedOrgs.has(id)

                      return (
                        <article
                          key={id}
                          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                        >
                          {/* Заголовок организации */}
                          <button
                            type="button"
                            aria-expanded={organizationExpanded}
                            onClick={() => toggleOrg(id)}
                            className="flex w-full flex-wrap items-center justify-between gap-3 bg-[#1f5a44] px-5 py-4 text-left text-white transition hover:bg-[#194a38] sm:px-6"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-white/70 transition-transform ${
                                  organizationExpanded ? 'rotate-90' : ''
                                }`}
                              >
                                ▶
                              </span>

                              <div>
                                <p className="text-[11px] uppercase tracking-wider text-white/50">
                                  Организация
                                </p>

                                <h3 className="text-base font-semibold sm:text-lg">
                                  {organization.organizationCode ??
                                    'Организация без кода'}
                                </h3>
                              </div>
                            </div>

                            {organization.dataLoaded ? (
                              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                                {formatMoney(organization.balance)}
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-medium text-amber-100">
                                Данные не загружены
                              </span>
                            )}
                          </button>

                          {/* Содержимое организации */}
                          {organizationExpanded &&
                            (!organization.dataLoaded ? (
                              <div className="p-5 sm:p-6">
                                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                                  {organization.loadingError ||
                                    'Не удалось получить данные этой организации.'}
                                </p>
                              </div>
                            ) : (
                              <div className="bg-[#f7f9f7] p-4 sm:p-6">
                                <div className="mb-4 grid gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
                                  <div>
                                    <p className="text-xs text-gray-400">
                                      Денег в организации
                                    </p>

                                    <p
                                      className={`mt-1 text-xl font-semibold ${balanceColor(organization.balance)}`}
                                    >
                                      {formatMoney(organization.balance)}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-gray-400">
                                      Движение
                                    </p>

                                    <div className="mt-2">
                                      <FlowSummary
                                        opening={organization.openingBalance}
                                        income={organization.totalIncome}
                                        expense={organization.totalExpense}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {organization.cashDesks.length === 0 ? (
                                  <p className="text-sm text-gray-500">
                                    У этой организации пока нет касс.
                                  </p>
                                ) : (
                                  <div className="space-y-4">
                                    {organization.cashDesks.map((cashDesk) => {
                                      const key = cashDeskKey(
                                        id,
                                        cashDesk.cashDeskId,
                                      )
                                      const cashDeskExpanded =
                                        expandedCashDesks.has(key)

                                      return (
                                        <section
                                          key={key}
                                          className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                                        >
                                          {/* Заголовок кассы */}
                                          <button
                                            type="button"
                                            aria-expanded={cashDeskExpanded}
                                            onClick={() =>
                                              toggleCashDesk(key)
                                            }
                                            className="flex w-full flex-wrap items-center justify-between gap-3 border-l-4 border-[#38745b] bg-white px-4 py-3 text-left transition hover:bg-gray-50 sm:px-5"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`text-gray-400 transition-transform ${
                                                  cashDeskExpanded
                                                    ? 'rotate-90'
                                                    : ''
                                                }`}
                                              >
                                                ▶
                                              </span>

                                              <div>
                                                <p className="text-[11px] uppercase tracking-wider text-gray-400">
                                                  Касса
                                                </p>

                                                <h4 className="font-semibold text-gray-900">
                                                  {cashDesk.cashDeskName}
                                                </h4>

                                                <p className="mt-0.5 text-xs text-gray-400">
                                                  {cashDesk.items.length} ст.
                                                </p>
                                              </div>
                                            </div>

                                            <p
                                              className={`font-semibold ${balanceColor(cashDesk.balance)}`}
                                            >
                                              {formatMoney(cashDesk.balance)}
                                            </p>
                                          </button>

                                          {/* Содержимое кассы */}
                                          {cashDeskExpanded && (
                                            <div className="border-t border-gray-200">
                                              <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3 sm:px-5">
                                                <p className="mb-2 text-xs text-gray-400">
                                                  Движение по кассе
                                                </p>

                                                <FlowSummary
                                                  opening={
                                                    cashDesk.openingBalance
                                                  }
                                                  income={cashDesk.totalIncome}
                                                  expense={
                                                    cashDesk.totalExpense
                                                  }
                                                />
                                              </div>

                                              <ItemsTable
                                                items={cashDesk.items}
                                              />
                                            </div>
                                          )}
                                        </section>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            </>
          )
        )}
      </div>
    </main>
  )
}
