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
  createdAt: string
}

async function getCsrfToken(): Promise<CsrfResponse> {
  const response = await http.get<CsrfResponse>('/api/auth/csrf')
  return response.data
}

/**
 * Получает список устройств, ожидающих одобрения администратора.
 */
export async function getPendingDevices(): Promise<RegisteredDevice[]> {
  const response = await http.get<RegisteredDevice[]>(
    '/api/admin/devices/pending',
  )

  return response.data
}

/**
 * Одобряет зарегистрированное устройство.
 */
export async function approveDevice(
  deviceId: string,
): Promise<RegisteredDevice> {
  const csrf = await getCsrfToken()

  const response = await http.post<RegisteredDevice>(
    `/api/admin/devices/${encodeURIComponent(deviceId)}/approve`,
    {},
    {
      headers: {
        [csrf.headerName]: csrf.token,
      },
    },
  )

  return response.data
}