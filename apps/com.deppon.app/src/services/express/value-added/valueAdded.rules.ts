import type { ExpressDraft, ExpressFreightRequest, ExpressOrderExtendField, ExpressValueAddedDraft } from '../core/types'

type ValueAddedInput = {
  doubleDelivery?: boolean
  powerMachine?: Partial<ExpressValueAddedDraft['powerMachine']> | null
  photo?: Partial<ExpressValueAddedDraft['photo']> | null
}

/** 三项服务默认关闭；旧草稿缺少该域时不推测用户选择。 */
export function createExpressValueAddedDraft(): ExpressValueAddedDraft {
  return {
    doubleDelivery: false,
    powerMachine: { enabled: false, category: '', count: 1, collect: false, delivery: false },
    photo: { sign: false, pickup: false }
  }
}

/** 禁用验机时清除配置；保留非法数量供提交校验，避免悄悄改数下单。 */
export function normalizeExpressValueAddedDraft(value?: ValueAddedInput | null): ExpressValueAddedDraft {
  const defaults = createExpressValueAddedDraft()
  const power = value?.powerMachine

  return {
    doubleDelivery: value?.doubleDelivery === true,
    powerMachine:
      power?.enabled === true
        ? {
            enabled: true,
            category: typeof power.category === 'string' ? power.category.trim() : '',
            count: power.count === undefined ? 1 : power.count,
            collect: power.collect === true,
            delivery: power.delivery === true
          }
        : defaults.powerMachine,
    photo: { sign: value?.photo?.sign === true, pickup: value?.photo?.pickup === true }
  }
}

/** 类别列表由服务端提供；调用方持有列表时同时校验成员资格。 */
export function validateExpressValueAdded(value?: ValueAddedInput | null, options: { categories?: readonly string[] } = {}) {
  const power = value?.powerMachine
  const messages: string[] = []

  if (power?.enabled !== true) {
    return messages
  }

  const category = typeof power.category === 'string' ? power.category.trim() : ''

  if (!category) {
    messages.push('请选择通电物品类型')
  } else if (options.categories && !options.categories.includes(category)) {
    messages.push('通电物品类型已失效，请重新选择')
  }

  if (power.collect !== true && power.delivery !== true) {
    messages.push('请选择收件或派送通电验机')
  }

  if (typeof power.count !== 'number' || !Number.isInteger(power.count) || power.count < 1 || power.count > 99) {
    messages.push('验机件数须为 1–99 的整数')
  }

  return messages
}

function getValidValueAdded(value?: ValueAddedInput | null) {
  const messages = validateExpressValueAdded(value)

  if (messages.length) {
    throw new Error(messages[0])
  }

  return normalizeExpressValueAddedDraft(value)
}

function getPowerMachineTypes(value: ExpressValueAddedDraft['powerMachine']) {
  return [value.collect ? 'collect' : '', value.delivery ? 'delivery' : ''].filter(Boolean).join(',')
}

/** 同体系小程序旧字段契约；未启用 HotPot waybillAvpList 分支。 */
export function createExpressValueAddedQuoteFields(value?: ValueAddedInput | null): Partial<ExpressFreightRequest> {
  const normalized = getValidValueAdded(value)
  const power = normalized.powerMachine

  return {
    ...(normalized.doubleDelivery ? { doubleDelivery: 'Y' as const } : {}),
    ...(normalized.photo.sign ? { isPhotoSigning: 'Y' as const } : {}),
    ...(normalized.photo.pickup ? { pickupPhoto: 'LSPZ' as const } : {}),
    ...(power.enabled ? { powerMachineTypes: getPowerMachineTypes(power), installationCategory: power.category, testMacHineQty: power.count } : {})
  }
}

/** 拍照签收报价用 isPhotoSigning，下单扩展字段用 photoSigning。 */
export function createExpressValueAddedOrderFields(value?: ValueAddedInput | null): ExpressOrderExtendField[] {
  const normalized = getValidValueAdded(value)
  const fields: ExpressOrderExtendField[] = []

  if (normalized.doubleDelivery) fields.push({ key: 'doubleDelivery', value: 'Y' })
  if (normalized.photo.sign) fields.push({ key: 'photoSigning', value: 'Y' })
  if (normalized.photo.pickup) fields.push({ key: 'pickupPhoto', value: 'LSPZ' })
  if (normalized.powerMachine.enabled) {
    fields.push(
      { key: 'installationCategory', value: normalized.powerMachine.category },
      { key: 'testMacHineQty', value: String(normalized.powerMachine.count) },
      { key: 'powerMachineTypes', value: getPowerMachineTypes(normalized.powerMachine) }
    )
  }

  return fields
}

export function updateExpressValueAdded(draft: ExpressDraft, patch: ValueAddedInput): ExpressDraft {
  const current = normalizeExpressValueAddedDraft(draft.valueAdded)
  const valueAdded = normalizeExpressValueAddedDraft({
    ...current,
    ...patch,
    powerMachine: { ...current.powerMachine, ...patch.powerMachine },
    photo: { ...current.photo, ...patch.photo }
  })

  if (JSON.stringify(current) === JSON.stringify(valueAdded)) {
    return draft
  }

  return { ...draft, valueAdded, selectedProduct: null, quoteStaleReason: '增值服务已变更，请重新获取价格' }
}
