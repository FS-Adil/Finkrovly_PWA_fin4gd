import { useEffect, useState, type FormEvent } from 'react'
import {
  login,
  restoreSession,
  logout,
  DeviceApprovalPendingError,
} from './features/auth/api'
import type { CurrentUser } from './shared/api/http'
import Dashboard from './features/dashboard/Dashboard'
import AdminDevices from './features/admin/AdminDevices'

type AppView = 'login' | 'pending'

function isAdminRole(role: string | undefined): boolean {
  return role?.trim().toUpperCase().replace(/^ROLE_/, '') === 'ADMIN'
}

function App() {
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [view, setView] = useState<AppView>('login')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  const [showAdminDevices, setShowAdminDevices] = useState(false)

  useEffect(() => {
  let cancelled = false

  async function checkSession() {
    try {
      const user = await restoreSession()

      if (!cancelled) {
        setCurrentUser(user)
        setView('login')
      }
    } catch (error) {
      if (cancelled) return

      setCurrentUser(null)

      if (error instanceof DeviceApprovalPendingError) {
        setView('pending')
        setMessage(error.message)
      } else {
        setView('login')

        if (import.meta.env.DEV) {
          console.error('Не удалось восстановить сессию:', error)
        }
      }
    } finally {
      if (!cancelled) {
        setIsCheckingSession(false)
      }
    }
  }

  void checkSession()

  return () => {
    cancelled = true
  }
}, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setMessage('')
    setIsLoading(true)

    try {
      const user = await login(username.trim(), password)

      setCurrentUser(user)
      setPassword('')
      setView('login')
    } catch (error) {
      if (error instanceof DeviceApprovalPendingError) {
        setView('pending')
        setPassword('')
        setMessage(error.message)
      } else {
        if (import.meta.env.DEV) {
          console.error('Ошибка авторизации:', error)
        }

        setMessage(
          'Не удалось войти. Проверьте логин и пароль или доступность сервера.',
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLogout() {
    setIsLoading(true)
    setMessage('')

    try {
      await logout()
      setCurrentUser(null)
      setPassword('')
      setView('login')
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Ошибка выхода:', error)
      }

      setMessage(
        'Не удалось подтвердить выход на сервере. Повторите попытку.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7f5]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#123c2f]" />
          <p className="mt-4 text-sm text-gray-500">
            Проверяем сессию…
          </p>
        </div>
      </main>
    )
  }

  // if (currentUser) {
  //   return <Dashboard user={currentUser} onLogout={handleLogout} />
  // }

  // if (currentUser) {
  //   if (showAdminDevices && currentUser.role === 'ADMIN') {
  //     return (
  //       <AdminDevices
  //         onBack={() => setShowAdminDevices(false)}
  //       />
  //     )
  //   }

  //   return (
  //     <Dashboard
  //       user={currentUser}
  //       onLogout={handleLogout}
  //       onOpenAdminDevices={() => setShowAdminDevices(true)}
  //     />
  //   )
  // }
  if (currentUser) {
    if (showAdminDevices && isAdminRole(currentUser.role)) {
      return (
        <AdminDevices
          onBack={() => setShowAdminDevices(false)}
        />
      )
    }

    return (
      <Dashboard
        user={currentUser}
        onLogout={handleLogout}
        onOpenAdminDevices={() => {
          if (isAdminRole(currentUser.role)) {
            setShowAdminDevices(true)
          } else {
            console.error(
              'Доступ запрещён. Роль пользователя:',
              currentUser.role,
            )
          }
        }}
      />
    )
  }

  if (view === 'pending') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7f5] px-5 py-12">
        <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M12 7V12L15 14"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            Ожидается подтверждение
          </h1>

          <p className="mt-3 text-center text-sm leading-6 text-gray-600">
            Устройство зарегистрировано. Администратор должен подтвердить
            доступ перед началом работы.
          </p>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
            >
              {message}
            </p>
          )}

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setView('login')
              setMessage('')
            }}
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#123c2f] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1b5140] disabled:opacity-60"
          >
            Вернуться ко входу
          </button>

          <p className="mt-6 text-center text-xs text-gray-400">
            FinDigTech · Защищённый доступ
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f7f5]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#123c2f] px-6 py-8 text-white sm:px-12 sm:py-12 lg:px-16 lg:py-14">
          <div className="pointer-events-none absolute -right-32 top-32 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-20 top-44 h-56 w-56 rounded-full border border-white/10" />

          <a href="/" className="relative z-10 flex w-fit items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#123c2f]">
              <svg
                viewBox="0 0 40 40"
                fill="none"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path
                  d="M20 3L35 12V28L20 37L5 28V12L20 3Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <path
                  d="M13 25V15L20 22L27 15V25"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <div className="text-lg font-semibold tracking-wide">
                FinDigTech
              </div>
              <div className="text-xs text-white/65">
                Прозрачность в каждой сделке
              </div>
            </div>
          </a>

          <div className="relative z-10 my-12 max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs text-white/80">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Финансовая платформа нового поколения
            </div>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl xl:text-6xl">
              Доверие начинается с прозрачности.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-white/75 sm:text-lg">
              Единая цифровая среда для управления финансами, товарами и
              подтверждённой историей сделок.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3L19 6V11C19 15.5 16 19 12 21C8 19 5 15.5 5 11V6L12 3Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M9 12L11 14L15 10"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className="font-medium">Контроль операций</h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Последовательность действий и подтверждение каждой сделки.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 7H20M4 12H16M4 17H12"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="19"
                      cy="17"
                      r="2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                </div>
                <h2 className="font-medium">История сделок</h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Основа для проверяемого и прозрачного учёта операций.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-xs text-white/50">
            FinDigTech · Цифровая инфраструктура торговли
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="text-xl font-semibold text-[#123c2f]">
                FinDigTech
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Прозрачность в каждой сделке
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-[#38745b]">
                Добро пожаловать
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
                Вход в систему
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                Введите данные своей учётной записи для продолжения работы.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Логин
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Введите логин"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    setMessage('')
                  }}
                  required
                  disabled={isLoading}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#38745b] focus:ring-4 focus:ring-[#38745b]/10 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Пароль
                  </label>
                  <span className="text-xs text-gray-400">
                    Восстановление подключим позже
                  </span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setMessage('')
                  }}
                  required
                  disabled={isLoading}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#38745b] focus:ring-4 focus:ring-[#38745b]/10 disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-xl bg-[#123c2f] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1b5140] focus:outline-none focus:ring-4 focus:ring-[#38745b]/20 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoading ? 'Выполняется вход…' : 'Войти в систему'}
                {!isLoading && (
                  <span className="ml-2" aria-hidden="true">
                    →
                  </span>
                )}
              </button>

              {message && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
                >
                  {message}
                </div>
              )}
            </form>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex items-start gap-3 text-sm leading-6 text-gray-500">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#38745b]"
                  aria-hidden="true"
                >
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M8 10V7A4 4 0 0116 7V10"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                <p>
                  Защищённый доступ к рабочему пространству. Авторизация и
                  проверка прав доступа выполняются сервером.
                </p>
              </div>
            </div>

            <p className="mt-10 text-center text-xs text-gray-400">
              © {new Date().getFullYear()} FinDigTech
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App