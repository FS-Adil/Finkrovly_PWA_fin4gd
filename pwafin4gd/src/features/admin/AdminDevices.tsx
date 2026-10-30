import { useCallback, useEffect, useState } from 'react'
import {
  approveDevice,
  getPendingDevices,
  type RegisteredDevice,
} from './api'

interface AdminDevicesProps {
  onBack: () => void
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getPlatformName(platform: RegisteredDevice['platform']): string {
  switch (platform) {
    case 'IOS':
      return 'iOS'
    case 'ANDROID':
      return 'Android'
    default:
      return 'Браузер / другое'
  }
}

export default function AdminDevices({ onBack }: AdminDevicesProps) {
  const [devices, setDevices] = useState<RegisteredDevice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadDevices = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await getPendingDevices()
      setDevices(result)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Не удалось загрузить устройства:', err)
      }

      setError(
        'Не удалось загрузить список устройств. Проверьте права администратора и доступность сервера.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  async function handleApprove(device: RegisteredDevice) {
    const confirmed = window.confirm(
      `Одобрить устройство «${device.deviceName}»?`,
    )

    if (!confirmed) return

    setApprovingId(device.id)
    setError('')
    setNotice('')

    try {
      await approveDevice(device.id)

      setDevices((current) =>
        current.filter((item) => item.id !== device.id),
      )

      setNotice(`Устройство «${device.deviceName}» одобрено.`)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Не удалось одобрить устройство:', err)
      }

      setError(
        'Не удалось одобрить устройство. Возможно, его статус уже изменился.',
      )
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7f5] px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#38745b]">
              FinDigTech · Администрирование
            </p>

            <h1 className="mt-2 text-2xl font-semibold text-gray-900 sm:text-3xl">
              Подтверждение устройств
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Управление запросами на доступ к системе.
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

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Ожидают одобрения
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {isLoading
                  ? 'Загружаем список…'
                  : `Устройств в списке: ${devices.length}`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadDevices()}
              disabled={isLoading || approvingId !== null}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Обновить список
            </button>
          </div>

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

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#123c2f]" />
            </div>
          ) : devices.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-base font-medium text-gray-800">
                Нет устройств, ожидающих одобрения
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Новые запросы появятся здесь после регистрации устройств.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="px-3 py-3 font-medium">Устройство</th>
                    <th className="px-3 py-3 font-medium">Платформа</th>
                    <th className="px-3 py-3 font-medium">Дата регистрации</th>
                    <th className="px-3 py-3 font-medium">Статус</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Действие
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {devices.map((device) => (
                    <tr
                      key={device.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-4">
                        <div className="font-medium text-gray-900">
                          {device.deviceName}
                        </div>

                        <div className="mt-1 text-xs text-gray-400">
                          ID: {device.id}
                        </div>
                      </td>

                      <td className="px-3 py-4 text-gray-600">
                        {getPlatformName(device.platform)}
                      </td>

                      <td className="px-3 py-4 text-gray-600">
                        {formatDate(device.createdAt)}
                      </td>

                      <td className="px-3 py-4">
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                          Ожидает
                        </span>
                      </td>

                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleApprove(device)}
                          disabled={approvingId !== null}
                          className="rounded-lg bg-[#123c2f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1b5140] disabled:cursor-wait disabled:opacity-50"
                        >
                          {approvingId === device.id
                            ? 'Одобряем…'
                            : 'Одобрить'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}