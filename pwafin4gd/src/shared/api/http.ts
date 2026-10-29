import axios from 'axios'

export const http = axios.create({
  baseURL: '/',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
  timeout: 15000,
})

export interface CurrentUser {
  id: string
  organizationId: string
  username: string
  role: string
}

export interface CsrfResponse {
  headerName: string
  token: string
}