export type DevicePlatform =
  | 'IOS'
  | 'ANDROID'
  | 'WINDOWS'
  | 'MACOS'
  | 'LINUX'
  | 'OTHER'

export interface DeviceInfo {
  deviceName: string
  platform: DevicePlatform
}

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent

  let platform: DevicePlatform = 'OTHER'
  let device = 'Unknown device'
  let osVersion = ''
  let browser = 'Browser'
  let browserVersion = ''

  // Определяем устройство и операционную систему.
  const iphone = ua.match(/iPhone OS ([\d_]+)/i)
  const ipad = ua.match(/CPU OS ([\d_]+)/i)
  const android = ua.match(/Android\s+([\d.]+)/i)

  if (/iPhone/i.test(ua)) {
    platform = 'IOS'
    device = 'iPhone'
    osVersion = iphone?.[1]?.replace(/_/g, '.') ?? ''
  } else if (/iPad/i.test(ua)) {
    platform = 'IOS'
    device = 'iPad'
    osVersion = ipad?.[1]?.replace(/_/g, '.') ?? ''
  } else if (/Android/i.test(ua)) {
    platform = 'ANDROID'
    device = 'Android'
    osVersion = android?.[1] ?? ''
  } else if (/Windows/i.test(ua)) {
    platform = 'WINDOWS'
    device = 'Windows computer'
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    platform = 'MACOS'
    device = 'Mac'
  } else if (/Linux/i.test(ua)) {
    platform = 'LINUX'
    device = 'Linux computer'
  }

  // Определяем браузер. Порядок важен.
  const edge = ua.match(/Edg\/([\d.]+)/)
  const opera = ua.match(/OPR\/([\d.]+)/)
  const firefox = ua.match(/Firefox\/([\d.]+)/)
  const chrome = ua.match(/Chrome\/([\d.]+)/)
  const criOS = ua.match(/CriOS\/([\d.]+)/)
  const fxios = ua.match(/FxiOS\/([\d.]+)/)
  const safari = ua.match(/Version\/([\d.]+).*Safari\//)

  if (edge) {
    browser = 'Edge'
    browserVersion = edge[1]
  } else if (opera) {
    browser = 'Opera'
    browserVersion = opera[1]
  } else if (fxios) {
    browser = 'Firefox'
    browserVersion = fxios[1]
  } else if (criOS) {
    browser = 'Chrome'
    browserVersion = criOS[1]
  } else if (firefox) {
    browser = 'Firefox'
    browserVersion = firefox[1]
  } else if (chrome) {
    browser = 'Chrome'
    browserVersion = chrome[1]
  } else if (safari) {
    browser = 'Safari'
    browserVersion = safari[1]
  }

  const details = [
    device,
    osVersion ? `iOS ${osVersion}` : '',
    browserVersion ? `${browser} ${browserVersion}` : browser,
  ].filter(Boolean)

  return {
    deviceName: details.join(' — '),
    platform,
  }
}