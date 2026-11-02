import axios from 'axios'

const BFF_URL = import.meta.env.VITE_BFF_URL;
const BASE = `${BFF_URL}/`;

export const http = axios.create({
//   baseURL: '/',
  baseURL: BASE,
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