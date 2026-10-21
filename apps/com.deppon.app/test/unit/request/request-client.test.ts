import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RequestError, configureRequest, http, request, setRequestBaseURL, setRequestTokenGetter } from '@/request'

const taroRequest = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: { request: taroRequest }
}))

function createResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: { ok: true },
    header: { 'content-type': 'application/json' },
    statusCode: 200,
    ...overrides
  }
}

beforeEach(() => {
  taroRequest.mockReset()
  taroRequest.mockResolvedValue(createResponse())
  setRequestBaseURL('')
  configureRequest({ authHeaderName: 'Authorization', timeout: 15000 })
  setRequestTokenGetter(async () => '')
})

describe('request credentials', () => {
  it('always sends native cookies unless the caller opts out', async () => {
    await request({ url: '/gwapi/example' })
    expect(taroRequest).toHaveBeenCalledWith(expect.objectContaining({ credentials: 'include', method: 'GET', timeout: 15000 }))

    await request({ url: '/gwapi/example', credentials: 'omit' })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ credentials: 'omit' }))
  })

  it('merges request options into the native call', async () => {
    await request({
      data: { id: 1 },
      dataType: 'json',
      method: 'POST',
      responseType: 'text',
      timeout: 3000,
      url: '/gwapi/example'
    })

    expect(taroRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { id: 1 },
        dataType: 'json',
        method: 'POST',
        responseType: 'text',
        timeout: 3000
      })
    )
  })
})

describe('request url and headers', () => {
  it('joins the runtime base url and keeps absolute urls untouched', async () => {
    setRequestBaseURL('https://owstest.deppon.com/')
    await request({ url: '/gwapi/example' })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ url: 'https://owstest.deppon.com/gwapi/example' }))

    await request({ baseURL: 'https://other.example.com', url: 'gwapi/example' })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ url: 'https://other.example.com/gwapi/example' }))

    await request({ url: 'https://absolute.example.com/gwapi/example' })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ url: 'https://absolute.example.com/gwapi/example' }))
  })

  it('normalizes the token into an Authorization header', async () => {
    configureRequest({ authHeaderName: 'X-Token', getToken: async () => 'plain-token' })
    await request({ url: '/gwapi/example' })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ header: expect.objectContaining({ 'X-Token': 'Bearer plain-token' }) }))

    configureRequest({ getToken: async () => 'Bearer ready-token' })
    await request({ url: '/gwapi/example' })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ header: expect.objectContaining({ 'X-Token': 'Bearer ready-token' }) }))
  })

  it('skips auth for public calls and empty tokens', async () => {
    setRequestTokenGetter(async () => 'token')
    await request({ skipAuth: true, url: '/gwapi/example' })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ header: { 'content-type': 'application/json' } }))

    await request({ url: '/gwapi/example' })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ header: { 'content-type': 'application/json', Authorization: 'Bearer token' } }))
  })

  it('lets callers override the default json content type', async () => {
    await request({ headers: { 'content-type': 'application/x-www-form-urlencoded' }, url: '/gwapi/example' })
    expect(taroRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ header: { 'content-type': 'application/x-www-form-urlencoded' } })
    )
  })

  it('keeps runtime settings when configureRequest receives an empty patch', async () => {
    configureRequest({})
    setRequestBaseURL('https://owstest.deppon.com')
    await request({ url: '/gwapi/example' })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ url: 'https://owstest.deppon.com/gwapi/example' }))
  })
})

describe('request response handling', () => {
  it('normalizes fallback headers and cookies', async () => {
    taroRequest.mockResolvedValueOnce({
      cookies: [{ name: 'ECO_TOKEN', value: '1' }],
      data: null,
      headers: { 'set-cookie': 'ECO_TOKEN=1' },
      statusCode: 204
    })

    const response = await request({
      transformResponse: value => value,
      url: '/gwapi/example'
    })

    expect(response).toMatchObject({
      cookies: [{ name: 'ECO_TOKEN', value: '1' }],
      fallbackHeaders: { 'set-cookie': 'ECO_TOKEN=1' },
      headers: { 'set-cookie': 'ECO_TOKEN=1' },
      method: 'GET',
      statusCode: 204,
      url: '/gwapi/example'
    })
  })

  it('returns response data by default and the transformed value when asked', async () => {
    await expect(request({ url: '/gwapi/example' })).resolves.toEqual({ ok: true })

    await expect(
      request({
        transformResponse: response => ({ statusCode: response.statusCode }),
        url: '/gwapi/example'
      })
    ).resolves.toEqual({ statusCode: 200 })
  })

  it('accepts a custom status validator', async () => {
    taroRequest.mockResolvedValueOnce(createResponse({ statusCode: 404 }))

    await expect(request({ url: '/gwapi/example', validateStatus: status => status === 404 })).resolves.toEqual({ ok: true })
  })

  it('wraps network and http failures in RequestError', async () => {
    taroRequest.mockRejectedValueOnce(new Error('offline'))

    const networkError = await request({ method: 'POST', url: '/gwapi/example' }).catch(error => error)

    expect(networkError).toBeInstanceOf(RequestError)
    expect(networkError).toMatchObject({ type: 'NETWORK_ERROR', url: '/gwapi/example', method: 'POST' })

    taroRequest.mockResolvedValueOnce(createResponse({ statusCode: 500 }))
    const httpError = await request({ url: '/gwapi/example' }).catch(error => error)

    expect(httpError).toBeInstanceOf(RequestError)
    expect(httpError).toMatchObject({ type: 'HTTP_ERROR', statusCode: 500 })
  })
})

describe('http shortcuts', () => {
  it('maps helper methods onto the native request', async () => {
    await http.get('/get')
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ method: 'GET', url: '/get' }))

    await http.post('/post', { id: 1 })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ data: { id: 1 }, method: 'POST', url: '/post' }))

    await http.put('/put', { id: 2 })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ data: { id: 2 }, method: 'PUT', url: '/put' }))

    await http.patch('/patch', { id: 3 })
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ data: { id: 3 }, method: 'PATCH', url: '/patch' }))

    await http.delete('/delete')
    expect(taroRequest).toHaveBeenLastCalledWith(expect.objectContaining({ method: 'DELETE', url: '/delete' }))
  })
})
