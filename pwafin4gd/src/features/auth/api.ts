import { http, type CsrfResponse, type CurrentUser } from '../../shared/api/http'
import { getDeviceInfo } from '../../shared/api/deviceInfo'

export type DeviceStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'REVOKED'

export interface RegisteredDevice {
  id: string
  deviceName: string
  platform: 'IOS' | 'ANDROID' | 'OTHER'
  status: DeviceStatus
  createdAt: string
}

export class DeviceApprovalPendingError extends Error {
  constructor() {
    super('Устройство зарегистрировано и ожидает одобрения администратора.')
    this.name = 'DeviceApprovalPendingError'
  }
}

async function getCsrfToken(): Promise<CsrfResponse> {
  const response = await http.get<CsrfResponse>('/api/auth/csrf')
  return response.data
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await http.get<CurrentUser>('/api/auth/me')
  return response.data
}

export async function registerDevice(): Promise<RegisteredDevice> {
  const csrf = await getCsrfToken()
  const deviceInfo = getDeviceInfo()

  const response = await http.post<RegisteredDevice>(
    '/api/devices/register',
    deviceInfo,
    {
      headers: {
        [csrf.headerName]: csrf.token,
      },
    },
  )

  return response.data
}

export type CurrentDeviceStatus =
  | 'UNREGISTERED'
  | 'PENDING'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'REVOKED'

export async function getCurrentDeviceStatus(): Promise<CurrentDeviceStatus> {
  const response = await http.get<{ status: CurrentDeviceStatus }>(
    '/api/devices/current-status',
  )

  return response.data.status
}

export async function restoreSession(): Promise<CurrentUser> {
  const status = await getCurrentDeviceStatus()

  if (status === 'PENDING') {
    throw new DeviceApprovalPendingError()
  }

  if (status !== 'ACTIVE') {
    throw new Error(
      `Устройство не может получить доступ. Статус: ${status}`,
    )
  }

  return getCurrentUser()
}

export async function login(
  username: string,
  password: string,
): Promise<CurrentUser> {
  const csrf = await getCsrfToken()

  await http.post(
    '/api/auth/login',
    { username, password },
    {
      headers: { [csrf.headerName]: csrf.token },
    },
  )

  // После авторизации получаем актуальный CSRF-токен.
  await getCsrfToken()

  let status = await getCurrentDeviceStatus()

  // Регистрируем устройство только при отсутствии привязки к сессии.
  if (status === 'UNREGISTERED') {
    const device = await registerDevice()
    status = device.status
  }

  if (status === 'PENDING') {
    throw new DeviceApprovalPendingError()
  }

  if (status !== 'ACTIVE') {
    throw new Error(
      `Устройство не может получить доступ. Статус: ${status}`,
    )
  }

  return getCurrentUser()
}

export async function logout(): Promise<void> {
  const csrf = await getCsrfToken()

  await http.post(
    '/api/auth/logout',
    {},
    {
      headers: {
        [csrf.headerName]: csrf.token,
      },
    },
  )
}