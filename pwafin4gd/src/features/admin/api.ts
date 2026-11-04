import { http, type CsrfResponse } from '../../shared/api/http'

export type DeviceStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'REVOKED'

export type DevicePlatform =
  | 'IOS'
  | 'ANDROID'
  | 'WINDOWS'
  | 'MACOS'
  | 'LINUX'
  | 'OTHER'

export interface RegisteredDevice {
  id: string
  deviceName: string
  platform: DevicePlatform
  status: DeviceStatus

  userId?: string
  username?: string
  email?: string
  organizationId?: string

  createdAt: string
  approvedAt?: string | null
  revokedAt?: string | null
  lastSeenAt?: string | null
}

async function getCsrfToken(): Promise<CsrfResponse> {
  const response = await http.get<CsrfResponse>('/api/auth/csrf')
  return response.data
}

async function postWithCsrf<T>(url: string): Promise<T> {
  const csrf = await getCsrfToken()

  const response = await http.post<T>(
    url,
    {},
    {
      headers: {
        [csrf.headerName]: csrf.token,
      },
    },
  )

  return response.data
}

/**
 * Получает все устройства всех пользователей и организаций.
 */
export async function getAllDevices(): Promise<RegisteredDevice[]> {
  const response = await http.get<RegisteredDevice[]>(
    '/api/admin/devices',
  )

  return response.data
}

/**
 * Получает устройства, ожидающие подтверждения.
 */
export async function getPendingDevices(): Promise<RegisteredDevice[]> {
  const response = await http.get<RegisteredDevice[]>(
    '/api/admin/devices/pending',
  )

  return response.data
}

/**
 * Одобряет устройство со статусом PENDING.
 */
export async function approveDevice(
  deviceId: string,
): Promise<RegisteredDevice> {
  return postWithCsrf<RegisteredDevice>(
    `/api/admin/devices/${encodeURIComponent(deviceId)}/approve`,
  )
}

/**
 * Блокирует активное устройство.
 */
export async function blockDevice(
  deviceId: string,
): Promise<RegisteredDevice> {
  return postWithCsrf<RegisteredDevice>(
    `/api/admin/devices/${encodeURIComponent(deviceId)}/block`,
  )
}

/**
 * Разблокирует устройство со статусом BLOCKED.
 */
export async function unblockDevice(
  deviceId: string,
): Promise<RegisteredDevice> {
  return postWithCsrf<RegisteredDevice>(
    `/api/admin/devices/${encodeURIComponent(deviceId)}/unblock`,
  )
}