import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useExpressAutoQuote } from '@/pages/express/hooks/useExpressAutoQuote'
import { useExpressQuote } from '@/pages/express/hooks/useExpressQuote'
import { createExpressDraft } from '@/services/express/core/express.draft'
import {
  selectExpressProduct,
  setExpressContact,
  swapExpressContacts,
  updateExpressCouponNumber,
  updateExpressGoods,
  updateExpressPickup,
  updateExpressService
} from '@/services/express/core/express.mutations'
import { createExpressQuoteRequestKey } from '@/services/express/core/requestKey'
import { updateExpressInsurance } from '@/services/express/insurance/insurance.rules'
import { createExpressProductAvailability } from '@/services/express/product/productAvailability.rules'

import type { Dispatch, SetStateAction } from 'react'
import type { DepponResponse } from '@/request/deppon'
import type { ExpressDraft, ExpressProductQuote, ExpressQuoteResult } from '@/services/express/core/types'

import { reactRuntime } from '../support/react-runtime'

const mocks = vi.hoisted(() => ({ quote: vi.fn(), showToast: vi.fn(), productChanged: vi.fn() }))

vi.mock('react', () => ({
  get useCallback() {
    return reactRuntime.react.useCallback
  },
  get useEffect() {
    return reactRuntime.react.useEffect
  },
  get useRef() {
    return reactRuntime.react.useRef
  },
  get useState() {
    return reactRuntime.react.useState
  }
}))

vi.mock('@tarojs/taro', () => ({ default: { showToast: mocks.showToast } }))

vi.mock('@/services/express', async () => ({
  ...(await vi.importActual<typeof import('@/services/express/core/express.draft')>('@/services/express/core/express.draft')),
  ...(await vi.importActual<typeof import('@/services/express/core/requestKey')>('@/services/express/core/requestKey')),
  ...(await vi.importActual<typeof import('@/services/express/insurance/insurance.rules')>('@/services/express/insurance/insurance.rules')),
  ...(await vi.importActual<typeof import('@/services/express/product/productAvailability.rules')>('@/services/express/product/productAvailability.rules')),
  expressService: { quote: mocks.quote }
}))

const product: ExpressProductQuote = {
  productName: '标准快递',
  omsProductCode: 'PACKAGE',
  days: null,
  arriveDate: null,
  message: null,
  label: '',
  totalfee: 12,
  detail: null,
  billWeight: 1
}

function createValidDraft(): ExpressDraft {
  return {
    ...createExpressDraft(),
    sender: { name: '张三', mobile: '13800000000', province: '上海', city: '上海市', county: '青浦区', address: '明珠路100号' },
    consignee: { name: '李四', mobile: '13900000000', province: '广东', city: '深圳市', county: '南山区', address: '科技园200号' },
    goods: { count: 1, insuredAmount: 0, name: '文件', volume: 0, weight: 1 }
  }
}

function success(products = [product]): DepponResponse<ExpressQuoteResult> {
  const availability = createExpressProductAvailability(createValidDraft(), {
    customerCode: '',
    monthlyEnabled: false,
    contractEnabled: false,
    insuranceLimit: null
  })

  return { status: true, message: '', result: { products, availability } }
}

function deferredQuote() {
  let resolve!: (response: DepponResponse<ExpressQuoteResult>) => void
  const promise = new Promise<DepponResponse<ExpressQuoteResult>>(done => {
    resolve = done
  })

  return { promise, resolve }
}

let draft: ExpressDraft
const setDraft: Dispatch<SetStateAction<ExpressDraft>> = next => {
  draft = typeof next === 'function' ? next(draft) : next
}

function render() {
  return reactRuntime.render(() => {
    const controller = useExpressQuote({ draft, setDraft, onProductChange: mocks.productChanged })

    useExpressAutoQuote({ draft, quotes: controller.quotes, quoteStatus: controller.status, onQuote: controller.onQuery })
    return controller
  })
}

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  reactRuntime.reset()
  vi.resetAllMocks()
  draft = createValidDraft()
  mocks.quote.mockResolvedValue(success())
})

describe('express automatic pricing', () => {
  it.each([
    ['sender', (value: ExpressDraft) => ({ ...value, sender: null })],
    ['consignee', (value: ExpressDraft) => ({ ...value, consignee: null })],
    ['goods name', (value: ExpressDraft) => ({ ...value, goods: { ...value.goods, name: '' } })],
    ['weight', (value: ExpressDraft) => ({ ...value, goods: { ...value.goods, weight: 0 } })],
    ['finite weight', (value: ExpressDraft) => ({ ...value, goods: { ...value.goods, weight: NaN } })],
    ['region', (value: ExpressDraft) => ({ ...value, sender: { ...value.sender!, county: '' } })],
    ['package count', (value: ExpressDraft) => ({ ...value, goods: { ...value.goods, count: 0 } })]
  ])('waits for valid %s and prices automatically once it is complete', async (_label, incomplete) => {
    draft = incomplete(draft)
    render()
    expect(mocks.quote).not.toHaveBeenCalled()

    draft = createValidDraft()
    render()
    await flush()
    expect(render().status).toBe('done')
    expect(mocks.quote).toHaveBeenCalledTimes(1)
    expect(draft.selectedProduct).toEqual(product)
  })

  it.each([
    ['swapped addresses', swapExpressContacts],
    ['sender address', (value: ExpressDraft) => setExpressContact(value, 'sender', { ...value.sender!, address: '明珠路300号' })],
    ['consignee address', (value: ExpressDraft) => setExpressContact(value, 'consignee', { ...value.consignee!, address: '科技园300号' })],
    ['goods', (value: ExpressDraft) => updateExpressGoods(value, { weight: 5 })],
    ['delivery', (value: ExpressDraft) => updateExpressService(value, { deliveryMode: 'PICKSELF' })],
    ['pickup', (value: ExpressDraft) => updateExpressPickup(value, { dispatch: 'N' })],
    ['coupon', (value: ExpressDraft) => updateExpressCouponNumber(value, 'COUPON001')],
    ['insurance', (value: ExpressDraft) => updateExpressInsurance(value, { amount: 500 })]
  ])('automatically replaces the quote after changing %s', async (_label, change) => {
    render()
    await flush()
    expect(render().quotes).toEqual([product])

    draft = change(draft)
    expect(render().quotes).toEqual([])
    await flush()
    expect(render().status).toBe('done')
    expect(mocks.quote).toHaveBeenCalledTimes(2)
    expect(draft.quoteStaleReason).toBe('')
  })

  it('detects changed inputs even when the caller did not mark the quote stale', async () => {
    render()
    await flush()
    render()

    draft = { ...draft, goods: { ...draft.goods, weight: 2 } }
    render()
    await flush()
    expect(render().quotes).toEqual([product])
    expect(mocks.quote).toHaveBeenCalledTimes(2)
  })

  it('does not price again when quote results or availability are written back', async () => {
    const availability = createExpressProductAvailability(
      draft,
      {
        customerCode: '',
        monthlyEnabled: false,
        contractEnabled: false,
        insuranceLimit: 100000
      },
      { goodsLabels: [] }
    )

    mocks.quote.mockResolvedValue({ ...success(), result: { products: [product], availability } })
    render()
    await flush()
    render()
    render()
    expect(mocks.quote).toHaveBeenCalledTimes(1)
    expect(draft.insurance.limit).toBe(100000)
    expect(draft.service.transportMode).toBe('PACKAGE')

    const key = createExpressQuoteRequestKey(draft)

    expect(createExpressQuoteRequestKey({ ...draft, selectedProduct: { ...product, totalfee: 99 }, quoteStaleReason: '内部状态更新' })).toBe(key)
  })

  it('only applies the latest quote while inputs change during pending requests', async () => {
    const first = deferredQuote()
    const second = deferredQuote()
    const third = deferredQuote()

    mocks.quote.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(third.promise)
    render()
    draft = updateExpressGoods(draft, { weight: 2 })
    render()
    draft = updateExpressGoods(draft, { weight: 3 })
    render()
    expect(mocks.quote).toHaveBeenCalledTimes(3)

    second.resolve(success([{ ...product, totalfee: 20 }]))
    first.resolve(success([{ ...product, totalfee: 10 }]))
    await flush()
    expect(render().status).toBe('loading')
    expect(draft.selectedProduct).toBeNull()

    third.resolve(success([{ ...product, totalfee: 30 }]))
    await flush()
    expect(render().status).toBe('done')
    expect(draft.selectedProduct?.totalfee).toBe(30)
    expect(mocks.quote).toHaveBeenCalledTimes(3)
  })

  it('does not cancel a pending quote when agreement or remarks change', async () => {
    const request = deferredQuote()

    mocks.quote.mockReturnValueOnce(request.promise)
    render()
    draft = { ...draft, agreementAccepted: true, remark: '送达前联系' }
    render()
    request.resolve(success())
    await flush()
    expect(render().status).toBe('done')
    expect(draft.remark).toBe('送达前联系')
    expect(draft.agreementAccepted).toBe(true)
    expect(mocks.quote).toHaveBeenCalledTimes(1)
  })

  it('can return to the same inputs after they temporarily became incomplete', async () => {
    const request = deferredQuote()

    mocks.quote.mockReturnValueOnce(request.promise)
    render()
    draft = { ...draft, consignee: null }
    render()
    request.resolve(success())
    await flush()
    expect(render().quotes).toEqual([])

    draft = createValidDraft()
    render()
    await flush()
    expect(render().status).toBe('done')
    expect(mocks.quote).toHaveBeenCalledTimes(2)
  })

  it('keeps failures available for retry without repeatedly requesting automatically', async () => {
    mocks.quote.mockResolvedValueOnce({ status: false, message: '网络异常', result: null })
    render()
    await flush()
    const controller = render()

    render()
    expect(controller.status).toBe('error')
    expect(mocks.quote).toHaveBeenCalledTimes(1)
    await controller.onQuery()
    expect(render().status).toBe('done')
    expect(mocks.quote).toHaveBeenCalledTimes(2)
  })

  it('automatically retries changed inputs after a failed quote', async () => {
    mocks.quote.mockRejectedValueOnce(new Error('offline'))
    render()
    await flush()
    expect(render().status).toBe('error')

    draft = updateExpressGoods(draft, { weight: 2 })
    render()
    await flush()
    expect(render().status).toBe('done')
    expect(mocks.quote).toHaveBeenCalledTimes(2)
  })

  it('keeps valid quotes when selecting another returned product or restoring a carried draft', async () => {
    const otherProduct = { ...product, omsProductCode: 'DCZP' as const, totalfee: 25 }

    mocks.quote.mockResolvedValue(success([product, otherProduct]))
    render()
    await flush()
    render().onSelectProduct(otherProduct)
    expect(render().quotes).toHaveLength(2)
    expect(draft.selectedProduct).toEqual(otherProduct)
    expect(mocks.quote).toHaveBeenCalledTimes(1)

    const carried = selectExpressProduct(updateExpressGoods(draft, { weight: 5 }), otherProduct)

    render().restore([otherProduct], carried)
    draft = carried
    expect(render().quotes).toEqual([otherProduct])
    expect(mocks.quote).toHaveBeenCalledTimes(1)
  })

  it('keeps the user selected product when the same inputs are re-quoted', async () => {
    const otherProduct = { ...product, omsProductCode: 'DCZP' as const, totalfee: 25 }

    mocks.quote.mockResolvedValue(success([product, otherProduct]))
    render()
    await flush()
    render().onSelectProduct(otherProduct)

    await render().onQuery()
    await flush()

    expect(draft.selectedProduct?.omsProductCode).toBe('DCZP')
  })
})
