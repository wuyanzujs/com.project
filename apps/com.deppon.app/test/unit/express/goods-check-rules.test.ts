import { describe, expect, it } from 'vitest'

import { getBlockingExpressGoodsLabel, normalizeExpressGoodsCheckResult } from '@/services/express/goods/goodsCheck.rules'

import type { ExpressGoodsLabel } from '@/services/express/core/types'

const createLabel = (overrides: Partial<ExpressGoodsLabel> = {}): ExpressGoodsLabel => ({
  tip: '',
  goodsRemarkCode: 'other_category',
  displayType: 'tips',
  ...overrides
})

describe('getBlockingExpressGoodsLabel', () => {
  it('returns the first forbidden label', () => {
    const blocked = createLabel({ displayType: 'forbid', tip: '禁寄' })
    const later = createLabel({ displayType: 'forbid', tip: '另一个禁寄' })

    expect(getBlockingExpressGoodsLabel([createLabel(), blocked, later])).toBe(blocked)
  })

  it('returns undefined when nothing is forbidden', () => {
    expect(getBlockingExpressGoodsLabel([])).toBeUndefined()
    expect(getBlockingExpressGoodsLabel([createLabel({ displayType: 'alert' })])).toBeUndefined()
  })
})

describe('normalizeExpressGoodsCheckResult', () => {
  it('treats an empty label list as expressible', () => {
    const result = normalizeExpressGoodsCheckResult('文件', [])

    expect(result.status).toBe('ok')
    expect(result.canExpress).toBe(true)
    expect(result.title).toBe('可正常寄递')
    expect(result.message).toBe('未命中禁寄或特殊风险规则。')
    expect(result.labels).toEqual([])
  })

  it('blocks express when a forbid label exists', () => {
    const labels = [createLabel({ displayType: 'forbid', tip: '该货物禁止寄递' })]
    const result = normalizeExpressGoodsCheckResult('锂电池', labels)

    expect(result.status).toBe('forbid')
    expect(result.canExpress).toBe(false)
    expect(result.title).toBe('暂不支持寄递')
    expect(result.message).toBe('该货物禁止寄递')
  })

  it('marks unknown categories for manual confirmation', () => {
    const result = normalizeExpressGoodsCheckResult('杂项', [createLabel({ goodsRemarkCode: 'unknow_category', displayType: 'alert' })])

    expect(result.status).toBe('unknown')
    expect(result.canExpress).toBe(true)
    expect(result.title).toBe('需要人工确认')
    expect(result.message).toBe('暂未识别到明确品类，寄件前建议补充准确名称。')
  })

  it('treats any other display type as a risk hint', () => {
    const result = normalizeExpressGoodsCheckResult('显示器', [createLabel({ displayType: 'addprice', tip: '需加收包装费' })])

    expect(result.status).toBe('risk')
    expect(result.title).toBe('存在寄递提示')
    expect(result.message).toBe('需加收包装费')
  })

  it('keeps the most severe status across labels', () => {
    const risk = createLabel({ displayType: 'alert' })
    const unknown = createLabel({ goodsRemarkCode: 'unknow_category' })
    const forbid = createLabel({ displayType: 'forbid' })

    expect(normalizeExpressGoodsCheckResult('a', [risk, unknown]).status).toBe('unknown')
    expect(normalizeExpressGoodsCheckResult('a', [risk]).status).toBe('risk')
    expect(normalizeExpressGoodsCheckResult('a', [unknown, forbid]).status).toBe('forbid')
    expect(normalizeExpressGoodsCheckResult('a', [forbid, unknown, risk]).status).toBe('forbid')
  })

  it('prefers the first non blank tip and falls back to the status copy', () => {
    const withTips = normalizeExpressGoodsCheckResult('a', [createLabel({ tip: '   ' }), createLabel({ tip: ' 实际提示 ' }), createLabel({ tip: '后续提示' })])
    const withoutTips = normalizeExpressGoodsCheckResult('a', [createLabel({ displayType: 'alert', tip: '   ' })])

    expect(withTips.message).toBe('实际提示')
    expect(withoutTips.message).toBe('该货物存在包装、保价或收寄限制提示，请按页面提示确认。')
  })

  it('keeps the original label list on the result', () => {
    const labels = [createLabel()]
    const result = normalizeExpressGoodsCheckResult('a', labels)

    expect(result.labels).toBe(labels)
    expect(result.goodsName).toBe('a')
  })
})
