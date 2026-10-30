import { useState } from 'react'
import type { CurrentUser } from '../../shared/api/http'

interface DashboardProps {
  user: CurrentUser
  onLogout: () => void
  onOpenAdminDevices?: () => void
}

type TabId = 'home' | 'finance' | 'reports' | 'goods' | 'history' | 'devices'

interface Tab {
  id: TabId
  label: string
  shortLabel: string
  icon: string
  adminOnly?: boolean
}

const tabs: Tab[] = [
  {
    id: 'home',
    label: 'Главная',
    shortLabel: 'Главная',
    icon: '⌂',
  },
  {
    id: 'finance',
    label: 'Финансы',
    shortLabel: 'Финансы',
    icon: '₽',
  },
  {
    id: 'reports',
    label: 'Отчётность',
    shortLabel: 'Отчёты',
    icon: '▤',
  },
  {
    id: 'goods',
    label: 'Товары и склад',
    shortLabel: 'Товары',
    icon: '▣',
  },
//   {
//     id: 'history',
//     label: 'История сделок',
//     shortLabel: 'История',
//     icon: '↻',
//   },
  {
    id: 'devices',
    label: 'Устройства',
    shortLabel: 'Устройства',
    icon: '⌘',
    adminOnly: true,
  },
]

const sections = [
  {
    id: 'finance' as const,
    number: '01',
    title: 'Финансовые потоки',
    description: 'Поступления, выплаты и движение денежных средств.',
  },
  {
    id: 'reports' as const,
    number: '02',
    title: 'Финансовая отчётность',
    description: 'Сводные показатели и отчёты организации.',
  },
  {
    id: 'goods' as const,
    number: '03',
    title: 'Товары и склад',
    description: 'Учёт товаров и контроль состояния запасов.',
  },
  {
    id: 'history' as const,
    number: '04',
    title: 'История сделок',
    description: 'Хронология операций и подтверждение действий.',
  },
]

export default function Dashboard({
  user,
  onLogout,
  onOpenAdminDevices,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('home')

//   const visibleTabs = tabs.filter(
//     (tab) => !tab.adminOnly || user.role === 'ADMIN',
//   )
    const normalizedRole = user.role
    ?.trim()
    .toUpperCase()
    .replace(/^ROLE_/, '')

    const visibleTabs = tabs.filter(
    (tab) => !tab.adminOnly || normalizedRole === 'ADMIN',
    )

  const activeSection = sections.find(
    (section) => section.id === activeTab,
  )

//   function handleTabClick(tabId: TabId) {
//     if (tabId === 'devices') {
//       onOpenAdminDevices?.()
//       return
//     }

//     setActiveTab(tabId)
//   }

    function handleTabClick(tabId: TabId) {
    if (tabId === 'devices') {
        if (!onOpenAdminDevices) {
        console.error(
            'Не передан обработчик onOpenAdminDevices из App.tsx',
        )
        return
        }

        onOpenAdminDevices()
        return
    }

    setActiveTab(tabId)
    }

  return (
    <main className="min-h-screen bg-[#f5f7f5] pb-24 md:pb-8">
      {/* Верхняя панель */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#123c2f] text-lg font-semibold text-white">
              A
            </div>

            <div className="min-w-0">
              <p className="truncate font-semibold text-[#123c2f]">
                FinDigTech
              </p>
              <p className="text-xs text-gray-500">
                Рабочее пространство
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95 sm:px-4"
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Основное содержимое */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
        {activeTab === 'home' && (
          <>
            <section className="overflow-hidden rounded-3xl bg-[#123c2f] p-6 text-white sm:p-10">
              <p className="text-sm text-white/70">
                Рабочая панель
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Добро пожаловать!
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                Единое пространство для финансовых операций,
                управления товарами и проверки истории сделок.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4 sm:p-5">
                  <p className="text-sm text-white/65">
                    Пользователь
                  </p>
                  <p className="mt-2 break-words font-medium">
                    {user.username}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/5 p-4 sm:p-5">
                  <p className="text-sm text-white/65">
                    Роль в системе
                  </p>
                  <p className="mt-2 font-medium">
                    {user.role}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-8 sm:mt-10">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-900">
                  Разделы системы
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Выберите раздел в нижнем меню.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveTab(section.id)}
                    className="rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-[#b7cfc2] hover:shadow-sm active:scale-[0.99] sm:p-6"
                  >
                    <span className="text-sm font-semibold text-[#38745b]">
                      {section.number}
                    </span>

                    <h3 className="mt-4 font-semibold text-gray-900">
                      {section.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {section.description}
                    </p>

                    <span className="mt-4 inline-flex text-sm font-medium text-[#38745b]">
                      Открыть →
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {activeSection && (
          <section>
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              ← На главную
            </button>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10">
              <p className="text-sm font-semibold text-[#38745b]">
                Раздел {activeSection.number}
              </p>

              <h1 className="mt-3 text-2xl font-semibold text-gray-900 sm:text-3xl">
                {activeSection.title}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                {activeSection.description}
              </p>

              <div className="mt-8 rounded-2xl bg-[#f5f7f5] p-5 sm:p-6">
                <p className="font-medium text-gray-900">
                  Раздел готовится к запуску
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Здесь появятся инструменты FinDigTech для работы
                  с этим направлением.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Нижняя панель вкладок */}
      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-1 pt-2 sm:px-3">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition active:scale-95 sm:py-2.5 ${
                  isActive
                    ? 'text-[#123c2f]'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <span
                  className={`flex h-8 w-10 items-center justify-center rounded-xl text-xl transition sm:h-9 sm:w-12 ${
                    isActive
                      ? 'bg-[#e7f0ea] font-semibold'
                      : 'bg-transparent'
                  }`}
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>

                <span
                  className={`max-w-full truncate text-[10px] sm:text-xs ${
                    isActive ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </main>
  )
}