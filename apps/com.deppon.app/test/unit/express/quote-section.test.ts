import { describe, expect, it, vi } from 'vitest'

import { ExpressQuoteSection } from '@/pages/express/components/ExpressQuoteSection'
import { ExpressSubmitBar } from '@/pages/express/components/ExpressSubmitBar'

import type { ExpressProductQuote } from '@/services/express/core/types'

import { findElement, textOf } from '../support/react-runtime'

vi.mock('@tarojs/components', () => ({ Image: 'Image', ScrollView: 'ScrollView', Text: 'Text', View: 'View' }))
vi.mock('@/services/express', async () =>
  vi.importActual<typeof import('@/services/express/core/express.quoteView')>('@/services/express/core/express.quoteView')
)
vi.mock('@/shared/components', () => ({ AppPressable: 'AppPressable' }))
vi.mock('@/shared/native', () => ({ AppLinearGradient: 'AppLinearGradient' }))
vi.mock('@/shared/components/AppIcon', () => ({ APP_IMAGE_ICONS: { arrowUpGrey: 'arrow.png' } }))
vi.mock('@/pages/express/components/ExpressSection', () => ({ ExpressSection: 'ExpressSection' }))
vi.mock('@/pages/express/components/ExpressQuoteSection/index.scss', () => ({}))
vi.mock('@/pages/express/components/ExpressSubmitBar/index.scss', () => ({}))

const product: ExpressProductQuote = {
  productName: '标准快递',
  omsProductCode: 'PACKAGE',
  totalfee: 12,
  days: null,
  arriveDate: null,
  message: null,
  label: '',
  detail: null,
  billWeight: 1
}

describe('automatic quote presentation', () => {
  it('hides the section until a quote is available', () => {
    expect(
      ExpressQuoteSection({
        quotes: [],
        selectedProduct: null,
        onSelectProduct: vi.fn()
      })
    ).toBeNull()
  })

  it('keeps the current cards visible while the quote is refreshing', () => {
    const view = ExpressQuoteSection({
      quotes: [product],
      selectedProduct: product,
      onSelectProduct: vi.fn()
    })

    expect(view).not.toBeNull()
    expect(textOf(view)).toContain('标准快递')
  })

  it('shows prices as output and disables details until a quote is available', () => {
    const view = ExpressSubmitBar({
      detailAvailable: false,
      detailVisible: false,
      priceText: '¥--',
      quoteLoading: true,
      submitting: false,
      onSubmit: vi.fn(),
      onToggleDetail: vi.fn()
    })
    const price = findElement(view, element => element.props?.className === 'express-submit__quote')
    const details = findElement(view, element => element.props?.className === 'express-submit__detail-toggle')

    expect(price.type).toBe('View')
    expect(price.props.onPress).toBeUndefined()
    expect(textOf(price)).toContain('计算中')
    expect(details.props.disabled).toBe(true)
  })

  it('opens available price details without fetching another quote', () => {
    const onToggleDetail = vi.fn()
    const view = ExpressSubmitBar({
      detailAvailable: true,
      detailVisible: false,
      priceText: '¥12',
      quoteLoading: false,
      submitting: false,
      onSubmit: vi.fn(),
      onToggleDetail
    })
    const details = findElement(view, element => element.props?.className === 'express-submit__detail-toggle')

    expect(details.props.disabled).toBe(false)
    details.props.onPress()
    expect(onToggleDetail).toHaveBeenCalledOnce()
  })
})
