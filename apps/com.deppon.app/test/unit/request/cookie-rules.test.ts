import { describe, expect, it } from 'vitest'

import { createEcoSessionCookie, extractEcoToken, getSetCookieFromHeaders, normalizeCookieList } from '@/request/cookie.rules'

describe('getSetCookieFromHeaders', () => {
  it('joins the array returned by the modern getSetCookie getter', () => {
    const headers = { getSetCookie: () => ['a=1; Path=/', 'b=2'] }

    expect(getSetCookieFromHeaders(headers)).toBe('a=1; Path=/;b=2')
  })

  it('serializes cookie objects into name=value pairs', () => {
    const headers = { getSetCookie: () => [{ name: 'ECO_TOKEN', value: 'token' }] }

    expect(getSetCookieFromHeaders(headers)).toBe('ECO_TOKEN=token')
  })

  it('falls back to headers.get when getSetCookie throws', () => {
    const headers = {
      getSetCookie: () => {
        throw new Error('unsupported')
      },
      get: (name: string) => (name === 'set-cookie' ? 'eco=1' : undefined)
    }

    expect(getSetCookieFromHeaders(headers)).toBe('eco=1')
  })

  it('falls back to raw() headers regardless of key casing', () => {
    const headers = { raw: () => ({ 'Set-Cookie': ['raw=1'] }) }

    expect(getSetCookieFromHeaders(headers)).toBe('raw=1')
  })

  it('falls back to a map style header bag', () => {
    const headers = { map: { 'SET-COOKIE': { name: 'mapped', value: '1' } } }

    expect(getSetCookieFromHeaders(headers)).toBe('mapped=1')
  })

  it('reads a plain header record', () => {
    expect(getSetCookieFromHeaders({ 'set-cookie': 'plain=1' })).toBe('plain=1')
  })

  it('returns an empty string when no set-cookie header exists', () => {
    expect(getSetCookieFromHeaders({ 'content-type': 'application/json' })).toBe('')
    expect(getSetCookieFromHeaders(null)).toBe('')
    expect(getSetCookieFromHeaders('set-cookie')).toBe('')
  })

  it('survives every accessor throwing', () => {
    const headers = {
      getSetCookie: () => {
        throw new Error('a')
      },
      get: () => {
        throw new Error('b')
      },
      raw: () => {
        throw new Error('c')
      }
    }

    expect(getSetCookieFromHeaders(headers)).toBe('')
  })
})

describe('normalizeCookieList', () => {
  it('returns an empty string for non arrays and empty arrays', () => {
    expect(normalizeCookieList(undefined)).toBe('')
    expect(normalizeCookieList('a=1')).toBe('')
    expect(normalizeCookieList([])).toBe('')
  })

  it('joins cookie objects', () => {
    expect(normalizeCookieList([{ name: 'a', value: '1' }, { name: 'b', value: '2' }])).toBe('a=1;b=2')
  })
})

describe('extractEcoToken', () => {
  it('extracts the token after any cookie separator', () => {
    expect(extractEcoToken('ECO_TOKEN=abc; Path=/; HttpOnly')).toBe('abc')
    expect(extractEcoToken('foo=1; ECO_TOKEN=xyz')).toBe('xyz')
    expect(extractEcoToken('foo=1,ECO_TOKEN=next')).toBe('next')
  })

  it('returns an empty string when the token is missing or lowercase', () => {
    expect(extractEcoToken('foo=1')).toBe('')
    expect(extractEcoToken('eco_token=abc')).toBe('')
  })
})

describe('createEcoSessionCookie', () => {
  it('rebuilds a cookie header only when a token exists', () => {
    expect(createEcoSessionCookie('ECO_TOKEN=abc; Path=/')).toBe('ECO_TOKEN=abc;')
    expect(createEcoSessionCookie('foo=1')).toBe('')
  })
})
