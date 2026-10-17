import { NativeModules, Platform } from 'react-native'

interface CookieManager {
  get: (url: string, useWebKit?: boolean) => Promise<Record<string, { name: string; value: string }>>
  set: (url: string, cookie: Record<string, unknown>, useWebKit?: boolean) => Promise<boolean>
  flush: () => Promise<void>
}

function getCookieManager(): CookieManager | null {
  if (Platform.OS === 'ios') {
    return (NativeModules.RNCookieManagerIOS as CookieManager | undefined) ?? null
  }

  if (Platform.OS === 'android') {
    return (NativeModules.RNCookieManagerAndroid as CookieManager | undefined) ?? null
  }

  return null
}

const SESSION_COOKIE_NAME = 'ECO_TOKEN'
const SESSION_COOKIE_EXPIRES = '1970-01-01T00:00:00.000Z'

function normalizeCookieUrl(url: string) {
  return url.trim().match(/^https?:\/\/[^/?#]+/i)?.[0] ?? ''
}

function normalizeCookieUrls(urls: string[]) {
  return Array.from(new Set(urls.map(normalizeCookieUrl).filter(Boolean)))
}

function extractSessionToken(cookie: string) {
  return cookie.match(/(?:^|[;,\r\n]\s*)ECO_TOKEN=([^;,\r\n]+)/)?.[1] ?? ''
}

async function readCookieStore(url: string, useWebKit: boolean) {
  const manager = getCookieManager()

  if (!manager) {
    return ''
  }

  try {
    const cookies = await manager.get(url, useWebKit)
    const sessionCookie = cookies[SESSION_COOKIE_NAME] ?? Object.values(cookies).find(cookie => cookie.name === SESSION_COOKIE_NAME)

    return sessionCookie?.value ? `${SESSION_COOKIE_NAME}=${sessionCookie.value};` : ''
  } catch {
    return ''
  }
}

export function createAppSessionCookieRuntime(urls: string[]) {
  const cookieUrls = normalizeCookieUrls(urls)

  return {
    async read(url: string) {
      const cookieUrl = normalizeCookieUrl(url)

      if (!cookieUrl) {
        return ''
      }

      return (await readCookieStore(cookieUrl, false)) || (await readCookieStore(cookieUrl, true))
    },

    async write(cookie: string) {
      const value = extractSessionToken(cookie)
      const manager = getCookieManager()

      if (!value || !cookieUrls.length || !manager) {
        return false
      }

      const results = await Promise.allSettled(
        cookieUrls.flatMap(url =>
          [false, true].map(useWebKit =>
            manager.set(
              url,
              {
                name: SESSION_COOKIE_NAME,
                value,
                path: '/',
                secure: url.startsWith('https://'),
                httpOnly: true
              },
              useWebKit
            )
          )
        )
      )

      await manager.flush().catch(() => undefined)

      return results.some(result => result.status === 'fulfilled' && result.value)
    },

    async clear() {
      const manager = getCookieManager()

      if (!manager) {
        return true
      }

      const expiredCookieWrites = cookieUrls.flatMap(url =>
        [false, true].map(useWebKit =>
          manager.set(
            url,
            {
              name: SESSION_COOKIE_NAME,
              value: '',
              path: '/',
              expires: SESSION_COOKIE_EXPIRES,
              secure: url.startsWith('https://')
            },
            useWebKit
          )
        )
      )
      const results = await Promise.allSettled([...expiredCookieWrites])

      await manager.flush().catch(() => undefined)

      return results.every(result => result.status === 'fulfilled')
    }
  }
}
