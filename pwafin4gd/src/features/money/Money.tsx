import { useState } from 'react'
import { useMoney } from './hooks/useMoney'
import {
  defaultMoneyPeriod,
  type CashFlowItemMoney,
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

const formatMoney = (v: number) => currencyFormatter.format(v)

const balanceColor = (v: number) =>
  v < 0 ? 'text-red-600' : 'text-[#123c2f]'

// ISO (UTC) -> значение для <input type="datetime-local">
const toInputValue = (iso: string) => {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

// Значение поля (локальное время) -> ISO (UTC)
const fromInputValue = (value: string) => new Date(value).toISOString()

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
        <span className="font-medium text-red-600">{formatMoney(expense)}</span>
      </span>
    </div>
  )
}

/* ---------- Таблица статей ---------- */
function ItemsTable({ items }: { items: CashFlowItemMoney[] }) {
  if (!items.length) {
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
          {items.map((item) => (
            <tr
              key={item.itemId}
              className="border-b border-gray-100 transition last:border-0 hover:bg-gray-50/70"
            >
              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                {item.itemName}
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
          ))}
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
    // loadedPeriod,
    refresh,
  } = useMoney(userId)

  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())
  const [expandedCashDesks, setExpandedCashDesks] = useState<Set<string>>(
    new Set(),
  )

  // Ключ кассы составной: одна и та же касса может встретиться
  // в разных организациях.
  const cashDeskKey = (orgId: string, cashDeskId: string) =>
    `${orgId}:${cashDeskId}`

  // Ключ организации: если id нет (некорректные данные), используем индекс.
  const orgKey = (org: OrganizationMoney, index: number) =>
    org.organizationId ?? `invalid-${index}`

  const toggle = (prev: Set<string>, id: string) => {
    const next = new Set(prev)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    return next
  }

  const toggleOrg = (id: string) => setExpandedOrgs((prev) => toggle(prev, id))

  const toggleCashDesk = (key: string) =>
    setExpandedCashDesks((prev) => toggle(prev, key))

  const expandAll = () => {
    if (!overview) return
    setExpandedOrgs(
      new Set(overview.organizations.map((o, i) => orgKey(o, i))),
    )
    setExpandedCashDesks(
      new Set(
        overview.organizations.flatMap((o, i) =>
          o.cashDesks.map((c) => cashDeskKey(orgKey(o, i), c.cashDeskId)),
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
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#38745b]">
              FinDigTech · Учёт денег
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Денежные средства
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Остатки денег по организациям, кассам и статьям.
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

        {/* Period */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-gray-500">
              Начало периода (включительно)
              <input
                type="datetime-local"
                value={toInputValue(period.from)}
                onChange={(e) =>
                  e.target.value &&
                  setPeriod({ ...period, from: fromInputValue(e.target.value) })
                }
                className={dateInput}
              />
            </label>
            <label className="text-xs text-gray-500">
              Конец периода (не включая)
              <input
                type="datetime-local"
                value={toInputValue(period.to)}
                onChange={(e) =>
                  e.target.value &&
                  setPeriod({ ...period, to: fromInputValue(e.target.value) })
                }
                className={dateInput}
              />
            </label>
            <button
              type="button"
              onClick={() => setPeriod(defaultMoneyPeriod())}
            // onClick={() => {
            //     const now = new Date()
            //     const start = new Date(now)
            //     start.setHours(0, 0, 0, 0)

            //     const end = new Date(start)
            //     end.setDate(end.getDate() + 1)

            //     setPeriod({
            //         from: start.toISOString(),
            //         to: end.toISOString(),
            //     })
            // }}
              className={`${outlineButton} py-2`}
            >
              На Сегодня
            </button>
          </div>
          {/* <p className="mt-2 text-xs text-gray-400">
            Период [С, По): движения точно в момент «По» попадают в следующий период.
          </p> */}
        </div>

        {/* Meta / refresh */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            {cacheUpdatedAt
              ? `Обновлено: ${dateFormatter.format(cacheUpdatedAt)}`
              : 'Данные ещё не загружены'}
            {/* {loadedPeriod && (
              <div className="mt-1">
                Данные за период:{' '}
                {dateFormatter.format(new Date(loadedPeriod.from))} —{' '}
                {dateFormatter.format(new Date(loadedPeriod.to))}
              </div>
            )} */}
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
        ) : overview && (
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

            {/* Total */}
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

            {/* Organizations */}
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
                    const orgExpanded = expandedOrgs.has(id)

                    return (
                      <article
                        key={id}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                      >
                        {/* ===== ORG HEADER ===== */}
                        <button
                          type="button"
                          onClick={() => toggleOrg(id)}
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

                        {/* ===== ORG CONTENT ===== */}
                        {orgExpanded &&
                          (!organization.dataLoaded ? (
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
                                    const cdExpanded =
                                      expandedCashDesks.has(key)

                                    return (
                                      <section
                                        key={key}
                                        className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                                      >
                                        {/* ===== CASH DESK HEADER ===== */}
                                        <button
                                          type="button"
                                          onClick={() => toggleCashDesk(key)}
                                          className="flex w-full flex-wrap items-center justify-between gap-3 border-l-4 border-[#38745b] bg-white px-4 py-3 text-left transition hover:bg-gray-50 sm:px-5"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`text-gray-400 transition-transform ${
                                                cdExpanded ? 'rotate-90' : ''
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

                                        {/* ===== CASH DESK CONTENT ===== */}
                                        {cdExpanded && (
                                          <div className="border-t border-gray-200">
                                            <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3 sm:px-5">
                                              <p className="mb-2 text-xs text-gray-400">
                                                Движение по кассе
                                              </p>
                                              <FlowSummary
                                                opening={cashDesk.openingBalance}
                                                income={cashDesk.totalIncome}
                                                expense={cashDesk.totalExpense}
                                              />
                                            </div>

                                            {/* ===== ITEMS TABLE ===== */}
                                            <ItemsTable items={cashDesk.items} />
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
        )}
      </div>
    </main>
  )
}
