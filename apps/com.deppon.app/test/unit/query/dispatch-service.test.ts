import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryDispatchRange, resolveDispatchAddress } from '@/services/query/query.dispatch'

import type { DispatchAddressQuery } from '@/services/query/types'

const mocks = vi.hoisted(() => ({
  queryExpressDispatch: vi.fn(),
  queryLogisticsDispatch: vi.fn(),
  queryDispatchStreet: vi.fn(),
  analyze4: vi.fn()
}))

vi.mock('@/services/query/query.api', () => ({
  queryApi: {
    queryExpressDispatch: mocks.queryExpressDispatch,
    queryLogisticsDispatch: mocks.queryLogisticsDispatch,
    queryDispatchStreet: mocks.queryDispatchStreet
  }
}))

vi.mock('@/services/contact', () => ({
  contactService: { analyze4: mocks.analyze4 }
}))

const query: DispatchAddressQuery = {
  province: '上海市',
  city: '上海市',
  county: '青浦区',
  address: '华徐公路 1 号'
}

const analysis = {
  province: '上海市',
  provinceCode: '31',
  city: '上海市',
  cityCode: '3101',
  county: '青浦区',
  countyCode: '310118',
  town: '徐泾镇',
  townCode: '310118001',
  detailAddress: '华徐公路 1 号'
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.analyze4.mockResolvedValue({ status: true, message: '', result: analysis })
  mocks.queryExpressDispatch.mockResolvedValue({ status: true, message: '', result: { deliveryList: [] } })
  mocks.queryLogisticsDispatch.mockResolvedValue({ status: true, message: '', result: {} })
  mocks.queryDispatchStreet.mockResolvedValue({ status: true, message: '', result: '' })
})

describe('resolveDispatchAddress', () => {
  it('requires some address text', async () => {
    await expect(resolveDispatchAddress({ province: ' ', city: '', county: '', address: '' })).resolves.toEqual({
      status: false,
      message: '请输入省市区和详细地址，或粘贴完整地址',
      result: null
    })
    expect(mocks.analyze4).not.toHaveBeenCalled()
  })

  it('prefers the pasted raw text over the joined fields', async () => {
    await resolveDispatchAddress({ ...query, rawText: ' 上海市青浦区华徐公路 1 号 ' })

    expect(mocks.analyze4).toHaveBeenCalledWith('上海市青浦区华徐公路 1 号', {
      province: '上海市',
      city: '上海市',
      county: '青浦区'
    })
  })

  it('joins the structured fields when no raw text is pasted', async () => {
    await resolveDispatchAddress(query)

    expect(mocks.analyze4).toHaveBeenCalledWith('上海市上海市青浦区华徐公路 1 号', expect.anything())
  })

  it('reports recognition failures', async () => {
    mocks.analyze4.mockResolvedValue({ status: false, message: '', result: null })
    await expect(resolveDispatchAddress(query)).resolves.toEqual({ status: false, message: '地址识别失败，请补全省市区', result: null })

    mocks.analyze4.mockResolvedValue({ status: false, message: '识别服务超时', result: null })
    await expect(resolveDispatchAddress(query)).resolves.toEqual({ status: false, message: '识别服务超时', result: null })
  })

  it('requires city and county codes before continuing', async () => {
    mocks.analyze4.mockResolvedValue({ status: true, message: '', result: { ...analysis, countyCode: '' } })

    await expect(resolveDispatchAddress(query)).resolves.toEqual({
      status: false,
      message: '缺少城市编码，请粘贴更完整的省市区地址',
      result: null
    })
  })

  it('merges analysis over the query and rebuilds the full address', async () => {
    const response = await resolveDispatchAddress(query)

    expect(response.result).toEqual({
      province: '上海市',
      provinceCode: '31',
      city: '上海市',
      cityCode: '3101',
      county: '青浦区',
      countyCode: '310118',
      town: '徐泾镇',
      townCode: '310118001',
      address: '华徐公路 1 号',
      fullAddress: '上海市上海市青浦区徐泾镇华徐公路 1 号'
    })
  })

  it('falls back to the query for fields the analysis leaves empty', async () => {
    mocks.analyze4.mockResolvedValue({
      status: true,
      message: '',
      result: { cityCode: '3101', countyCode: '310118', detailAddress: '' }
    })

    const response = await resolveDispatchAddress(query)

    expect(response.result).toMatchObject({
      province: '上海市',
      city: '上海市',
      county: '青浦区',
      address: '华徐公路 1 号',
      town: ''
    })
  })
})

describe('queryDispatchRange for express products', () => {
  it('returns the address failure instead of querying ranges', async () => {
    mocks.analyze4.mockResolvedValue({ status: false, message: '', result: null })

    await expect(queryDispatchRange('EXPRESS', query)).resolves.toEqual({ status: false, message: '地址识别失败，请补全省市区', result: null })
    expect(mocks.queryExpressDispatch).not.toHaveBeenCalled()
  })

  it('queries by city and county code, and asks the street endpoint for town plus detail', async () => {
    await queryDispatchRange('EXPRESS', query)

    expect(mocks.queryExpressDispatch).toHaveBeenCalledWith({ cityCode: '3101', countyCode: '310118' })
    expect(mocks.queryDispatchStreet).toHaveBeenCalledWith({
      province: '上海市',
      city: '上海市',
      county: '青浦区',
      address: '徐泾镇华徐公路 1 号'
    })
  })

  it('reports range lookup failures with the default copy', async () => {
    mocks.queryExpressDispatch.mockResolvedValue({ status: false, message: '', result: null })

    await expect(queryDispatchRange('EXPRESS', query)).resolves.toEqual({ status: false, message: '暂未获取到收派范围', result: null })
  })

  it('normalizes express groups and keeps the backend naming when present', async () => {
    mocks.queryExpressDispatch.mockResolvedValue({
      status: true,
      message: '',
      result: {
        deliveryList: [
          { rangeTypeCode: 'DELIVERY_NATURE_QJPS', rangeTypeName: '', rangeTypeDesc: [{ streetName: '徐泾镇', streetCode: 'S1' }] },
          { rangeTypeCode: 'DELIVERY_NATURE_FQJPS', rangeTypeName: '网点自提范围', rangeTypeDesc: [{ streetName: '华新镇', streetCode: 'S2' }] },
          { rangeTypeCode: 'DELIVERY_NATURE_ZTBPS', rangeTypeName: '', rangeTypeDesc: [] }
        ]
      }
    })

    const response = await queryDispatchRange('EXPRESS', query)

    expect(response.result?.groups).toEqual([
      { name: '全境派送', code: 'DELIVERY_NATURE_QJPS', streetList: [{ streetName: '徐泾镇', streetCode: 'S1' }] },
      { name: '网点自提范围', code: 'DELIVERY_NATURE_FQJPS', streetList: [{ streetName: '华新镇', streetCode: 'S2' }] }
    ])
    expect(response.result?.hint).toBe('当前区域可寄收，可继续预约寄件')
    expect(response.result?.canCreateExpress).toBe(true)
  })
})

describe('queryDispatchRange hints and express eligibility', () => {
  const runWith = async (deliveryList: unknown[], matchedStreet = '') => {
    mocks.queryExpressDispatch.mockResolvedValue({ status: true, message: '', result: { deliveryList } })
    mocks.queryDispatchStreet.mockResolvedValue({ status: true, message: '', result: matchedStreet })
    return queryDispatchRange('EXPRESS', query)
  }

  it('explains an empty range result and blocks ordering', async () => {
    const response = await runWith([])

    expect(response.result?.hint).toBe('暂未查询到当前区域的收派范围')
    expect(response.result?.canCreateExpress).toBe(false)
  })

  it('recommends self pickup when the matched street is pickup only', async () => {
    const response = await runWith(
      [{ rangeTypeCode: 'DELIVERY_NATURE_FQJPS', rangeTypeName: '', rangeTypeDesc: [{ streetName: '华新镇', streetCode: 'S2' }] }],
      '华新镇'
    )

    expect(response.result?.matchedStreet).toBe('华新镇')
    expect(response.result?.hint).toBe('当前详细地址建议选择德邦网点自提')
    expect(response.result?.canCreateExpress).toBe(false)
  })

  it('warns when the matched street is unserviceable', async () => {
    const response = await runWith(
      [
        { rangeTypeCode: 'DELIVERY_NATURE_QJPS', rangeTypeName: '', rangeTypeDesc: [{ streetName: '徐泾镇', streetCode: 'S1' }] },
        { rangeTypeCode: 'DELIVERY_NATURE_ZTBPS', rangeTypeName: '', rangeTypeDesc: [{ streetName: '白鹤镇', streetCode: 'S3' }] }
      ],
      '白鹤镇'
    )

    expect(response.result?.hint).toBe('当前详细地址可能暂不支持派送')
    expect(response.result?.canCreateExpress).toBe(false)
  })

  it('falls back to the generic special rule copy when nothing is serviceable', async () => {
    const response = await runWith([{ rangeTypeCode: 'DELIVERY_NATURE_ZTBPS', rangeTypeName: '', rangeTypeDesc: [{ streetName: '白鹤镇', streetCode: 'S3' }] }])

    expect(response.result?.hint).toBe('当前区域存在特殊收派规则，请以页面结果为准')
    expect(response.result?.canCreateExpress).toBe(false)
  })

  it('ignores the street lookup when it fails and keeps the group based hint', async () => {
    mocks.queryExpressDispatch.mockResolvedValue({
      status: true,
      message: '',
      result: { deliveryList: [{ rangeTypeCode: 'DELIVERY_NATURE_GBQYBS', rangeTypeName: '', rangeTypeDesc: [{ streetName: '徐泾镇', streetCode: 'S1' }] }] }
    })
    mocks.queryDispatchStreet.mockResolvedValue({ status: false, message: '街道服务不可用', result: null })

    const response = await queryDispatchRange('EXPRESS', query)

    expect(response.result?.matchedStreet).toBe('')
    expect(response.result?.canCreateExpress).toBe(true)
  })
})

describe('queryDispatchRange for logistics products', () => {
  it('queries by county code and maps the three logistics lists', async () => {
    mocks.queryLogisticsDispatch.mockResolvedValue({
      status: true,
      message: '',
      result: {
        normalFarDeliveryList: [{ villageName: '徐泾镇', villageCode: 'S1' }],
        specialDeliverList: [{ villageName: '赵巷镇', villageCode: 'S2' }],
        noDeliverList: [{ villageName: '白鹤镇', villageCode: 'S3' }]
      }
    })

    const response = await queryDispatchRange('LOGISTICS', query)

    expect(mocks.queryLogisticsDispatch).toHaveBeenCalledWith('310118')
    expect(mocks.queryExpressDispatch).not.toHaveBeenCalled()
    expect(response.result?.groups).toEqual([
      { name: '全境派送', code: 'DELIVERY_NATURE_QJPS', streetList: [{ streetName: '徐泾镇', streetCode: 'S1' }] },
      { name: '超远派送', code: 'DELIVERY_NATURE_GBQYBS', streetList: [{ streetName: '赵巷镇', streetCode: 'S2' }] },
      { name: '不派送', code: 'DELIVERY_NATURE_ZTBPS', streetList: [{ streetName: '白鹤镇', streetCode: 'S3' }] }
    ])
    expect(response.result?.productType).toBe('LOGISTICS')
  })

  it('skips empty logistics lists', async () => {
    mocks.queryLogisticsDispatch.mockResolvedValue({
      status: true,
      message: '',
      result: { normalFarDeliveryList: [], specialDeliverList: [{ villageName: '赵巷镇', villageCode: 'S2' }] }
    })

    const response = await queryDispatchRange('LOGISTICS', query)

    expect(response.result?.groups).toEqual([
      { name: '超远派送', code: 'DELIVERY_NATURE_GBQYBS', streetList: [{ streetName: '赵巷镇', streetCode: 'S2' }] }
    ])
  })
})
