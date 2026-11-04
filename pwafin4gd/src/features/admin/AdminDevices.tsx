import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  approveDevice,
  blockDevice,
  getAllDevices,
  unblockDevice,
  type RegisteredDevice,
  type DeviceStatus,
  type DevicePlatform,
} from './api'

interface AdminDevicesProps {
  onBack: () => void
}

type DevicesTab = 'ALL' | 'PENDING' | 'BLOCKED'

type ActionType = 'approve' | 'block' | 'unblock'

function formatDate(value?: string | null): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getPlatformName(platform: DevicePlatform): string {
  switch (platform) {
    case 'IOS':
      return 'iOS'
    case 'ANDROID':
      return 'Android'
    case 'WINDOWS':
      return 'Windows'
    case 'MACOS':
      return 'macOS'
    case 'LINUX':
      return 'Linux'
    default:
      return 'Другое'
  }
}

function getStatusName(status: DeviceStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Ожидает'
    case 'ACTIVE':
      return 'Активно'
    case 'BLOCKED':
      return 'Заблокировано'
    case 'REVOKED':
      return 'Отозвано'
  }
}

function getStatusClass(status: DeviceStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'BLOCKED':
      return 'bg-red-50 text-red-800 ring-red-200'
    case 'REVOKED':
      return 'bg-gray-100 text-gray-600 ring-gray-200'
  }
}

function getActionName(action: ActionType): string {
  switch (action) {
    case 'approve':
      return 'Одобрить'
    case 'block':
      return 'Заблокировать'
    case 'unblock':
      return 'Разблокировать'
  }
}

function getActionDescription(
  action: ActionType,
  device: RegisteredDevice,
): string {
  switch (action) {
    case 'approve':
      return `Одобрить устройство «${device.deviceName}»? После одобрения оно получит доступ к системе.`

    case 'block':
      return `Заблокировать устройство «${device.deviceName}»? Его текущие сессии будут отозваны, а доступ к защищённым разделам прекращён.`

    case 'unblock':
      return `Разблокировать устройство «${device.deviceName}»? Оно снова сможет получить доступ после проверки сессии.`
  }
}

export default function AdminDevices({ onBack }: AdminDevicesProps) {
  const [devices, setDevices] = useState<RegisteredDevice[]>([])

  const [activeTab, setActiveTab] = useState<DevicesTab>('ALL')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'ALL'>('ALL')
  const [platformFilter, setPlatformFilter] = useState<
    DevicePlatform | 'ALL'
  >('ALL')

  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadDevices = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await getAllDevices()

      setDevices(result)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Не удалось загрузить устройства:', err)
      }

      setError(
        'Не удалось загрузить устройства. Проверьте права администратора и доступность сервера.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  const counts = useMemo(() => {
    return {
      all: devices.length,
      pending: devices.filter((device) => device.status === 'PENDING').length,
      active: devices.filter((device) => device.status === 'ACTIVE').length,
      blocked: devices.filter((device) => device.status === 'BLOCKED').length,
      revoked: devices.filter((device) => device.status === 'REVOKED').length,
    }
  }, [devices])

  const filteredDevices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return devices.filter((device) => {
      if (activeTab === 'PENDING' && device.status !== 'PENDING') {
        return false
      }

      if (activeTab === 'BLOCKED' && device.status !== 'BLOCKED') {
        return false
      }

      if (statusFilter !== 'ALL' && device.status !== statusFilter) {
        return false
      }

      if (
        platformFilter !== 'ALL' &&
        device.platform !== platformFilter
      ) {
        return false
      }

      if (normalizedSearch) {
        const searchableValues = [
          device.deviceName,
          device.username,
          device.email,
          device.userId,
          device.organizationId,
          device.id,
        ]

        const matches = searchableValues.some((value) =>
          value?.toLowerCase().includes(normalizedSearch),
        )

        if (!matches) return false
      }

      return true
    })
  }, [devices, activeTab, statusFilter, platformFilter, search])

  async function handleAction(
    device: RegisteredDevice,
    action: ActionType,
  ) {
    const confirmed = window.confirm(
      getActionDescription(action, device),
    )

    if (!confirmed) return

    setProcessingId(device.id)
    setError('')
    setNotice('')

    try {
      let updatedDevice: RegisteredDevice

      switch (action) {
        case 'approve':
          updatedDevice = await approveDevice(device.id)
          break

        case 'block':
          updatedDevice = await blockDevice(device.id)
          break

        case 'unblock':
          updatedDevice = await unblockDevice(device.id)
          break
      }

      setDevices((current) =>
        current.map((item) =>
          item.id === device.id ? updatedDevice : item,
        ),
      )

      setNotice(
        `Операция «${getActionName(action)}» для устройства «${device.deviceName}» выполнена.`,
      )
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Не удалось изменить статус устройства:', err)
      }

      setError(
        'Не удалось выполнить операцию. Возможно, статус устройства уже изменился. Обновите список и попробуйте снова.',
      )
    } finally {
      setProcessingId(null)
    }
  }

  function renderAction(device: RegisteredDevice) {
    const isProcessing = processingId === device.id

    if (device.status === 'REVOKED') {
      return (
        <span className="text-xs text-gray-400">
          Нет доступных действий
        </span>
      )
    }

    // let action: ActionType
    let action: ActionType | null = null

    switch (device.status) {
      case 'PENDING':
        action = 'approve'
        break
      case 'ACTIVE':
        action = 'block'
        break
      case 'BLOCKED':
        action = 'unblock'
        break
    }

    if (!action) return null

    const buttonClass =
      action === 'block'
        ? 'border border-red-200 bg-white text-red-700 hover:bg-red-50'
        : action === 'unblock'
          ? 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
          : 'bg-[#123c2f] text-white hover:bg-[#1b5140]'

    return (
      <button
        type="button"
        disabled={processingId !== null}
        onClick={() => void handleAction(device, action)}
        className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50 ${buttonClass}`}
      >
        {isProcessing ? 'Выполняется…' : getActionName(action)}
      </button>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f7f5] px-4 py-6 pb-12 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Заголовок */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#38745b]">
              FinDigTech · Администрирование
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Управление устройствами
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Контроль устройств и доступа пользователей к системе.
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ← Назад в кабинет
          </button>
        </header>

        {/* Сводные показатели */}
        <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard title="Всего устройств" value={counts.all} />
          <StatCard
            title="Ожидают"
            value={counts.pending}
            valueClass="text-amber-700"
          />
          <StatCard
            title="Активные"
            value={counts.active}
            valueClass="text-emerald-700"
          />
          <StatCard
            title="Заблокированные"
            value={counts.blocked}
            valueClass="text-red-700"
          />
          <StatCard
            title="Отозванные"
            value={counts.revoked}
            valueClass="text-gray-500"
          />
        </section>

        {/* Основная панель */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Реестр устройств
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Все устройства зарегистрированных пользователей.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadDevices()}
                disabled={isLoading || processingId !== null}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                ↻ Обновить
              </button>
            </div>

            {/* Вкладки */}
            <div className="mt-6 flex gap-2 overflow-x-auto border-b border-gray-100">
              <TabButton
                active={activeTab === 'ALL'}
                onClick={() => setActiveTab('ALL')}
                label="Все устройства"
                count={counts.all}
              />

              <TabButton
                active={activeTab === 'PENDING'}
                onClick={() => setActiveTab('PENDING')}
                label="Ожидают"
                count={counts.pending}
              />

              <TabButton
                active={activeTab === 'BLOCKED'}
                onClick={() => setActiveTab('BLOCKED')}
                label="Заблокированные"
                count={counts.blocked}
              />
            </div>

            {/* Поиск и фильтры */}
            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_190px]">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по устройству, пользователю, ID…"
                aria-label="Поиск устройств"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#38745b] focus:ring-4 focus:ring-[#38745b]/10"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as DeviceStatus | 'ALL',
                  )
                }
                aria-label="Фильтр по статусу"
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#38745b]"
              >
                <option value="ALL">Все статусы</option>
                <option value="PENDING">Ожидает</option>
                <option value="ACTIVE">Активно</option>
                <option value="BLOCKED">Заблокировано</option>
                <option value="REVOKED">Отозвано</option>
              </select>

              <select
                value={platformFilter}
                onChange={(event) =>
                  setPlatformFilter(
                    event.target.value as DevicePlatform | 'ALL',
                  )
                }
                aria-label="Фильтр по платформе"
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#38745b]"
              >
                <option value="ALL">Все платформы</option>
                <option value="IOS">iOS</option>
                <option value="ANDROID">Android</option>
                <option value="WINDOWS">Windows</option>
                <option value="MACOS">macOS</option>
                <option value="LINUX">Linux</option>
                <option value="OTHER">Другое</option>
              </select>
            </div>
          </div>

          {/* Сообщения */}
          <div className="px-5 sm:px-7">
            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
              >
                {notice}
              </div>
            )}
          </div>

          {/* Список */}
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#123c2f]" />
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="text-base font-semibold text-gray-800">
                Устройства не найдены
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Попробуйте изменить фильтры или поисковый запрос.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-y border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-4 font-semibold">Устройство</th>
                    <th className="px-5 py-4 font-semibold">Владелец</th>
                    <th className="px-5 py-4 font-semibold">Организация</th>
                    <th className="px-5 py-4 font-semibold">Платформа</th>
                    <th className="px-5 py-4 font-semibold">Регистрация</th>
                    <th className="px-5 py-4 font-semibold">Последняя активность</th>
                    <th className="px-5 py-4 font-semibold">Статус</th>
                    <th className="px-5 py-4 text-right font-semibold">Действие</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDevices.map((device) => (
                    <tr
                      key={device.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">
                          {device.deviceName || 'Без названия'}
                        </div>

                        <div className="mt-1 max-w-48 truncate text-xs text-gray-400">
                          ID: {device.id}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-800">
                          {device.username || 'Не указано'}
                        </div>

                        <div className="mt-1 text-xs text-gray-400">
                          {device.email || device.userId || '—'}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        <span className="block max-w-40 truncate">
                          {device.organizationId || '—'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {getPlatformName(device.platform)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                        {formatDate(device.createdAt)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                        {formatDate(device.lastSeenAt)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusClass(device.status)}`}
                        >
                          {getStatusName(device.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {renderAction(device)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && filteredDevices.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-400 sm:px-7">
              Показано устройств: {filteredDevices.length}
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-gray-400">
          Управление устройствами не изменяет учётные записи пользователей.
          Блокировка применяется только к выбранному устройству.
        </p>
      </div>
    </main>
  )
}

interface StatCardProps {
  title: string
  value: number
  valueClass?: string
}

function StatCard({
  title,
  value,
  valueClass = 'text-gray-900',
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs leading-5 text-gray-500 sm:text-sm">
        {title}
      </p>

      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>
        {value}
      </p>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  label: string
  count: number
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
        active
          ? 'border-[#123c2f] text-[#123c2f]'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}

      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active
            ? 'bg-[#e7f0ea] text-[#123c2f]'
            : 'bg-gray-100 text-gray-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}