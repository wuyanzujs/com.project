import type { Contact } from './types'

export type ContactSelectionTarget = 'sender' | 'consignee'
export type ContactSelectionMode = 'select' | 'manage'
export type ContactSelectionSource = 'EXPRESS' | 'QUERY_PRICE' | 'INVOICE_DETAIL' | 'BATCH'
export type ContactSelectionReturnDelta = '1' | '2'

export interface ContactSelectionParams {
  [key: string]: string
  mode: ContactSelectionMode
  target: ContactSelectionTarget
  source: ContactSelectionSource
  returnDelta: ContactSelectionReturnDelta
}

export interface ContactSelectionResult {
  target: ContactSelectionTarget
  source: ContactSelectionSource
  contact: Contact
  selectedAt: number
}

let pendingSelection: ContactSelectionResult | null = null
let pendingEditingContact: Contact | null = null

/**
 *
 * @param value 待判定值
 * @description 判定是否为联系人选择目标
 */
function isContactSelectionTarget(value: unknown): value is ContactSelectionTarget {
  return value === 'sender' || value === 'consignee'
}

/**
 *
 * @param value 待判定值
 * @description 判定是否为联系人选择模式
 */
function isContactSelectionMode(value: unknown): value is ContactSelectionMode {
  return value === 'select' || value === 'manage'
}

/**
 *
 * @param value 待判定值
 * @description 判定是否为联系人选择来源
 */
function isContactSelectionSource(value: unknown): value is ContactSelectionSource {
  return value === 'EXPRESS' || value === 'QUERY_PRICE' || value === 'INVOICE_DETAIL' || value === 'BATCH'
}

/**
 *
 * @param value 待判定值
 * @description 判定是否为返回增量标识
 */
function isContactSelectionReturnDelta(value: unknown): value is ContactSelectionReturnDelta {
  return value === '1' || value === '2'
}

export const contactSelection = {
  /**
   *
   * @param target 选择目标
   * @param mode 选择模式
   * @param source 选择来源
   * @param options 返回增量配置
   * @description 创建路由 query 参数
   */
  createParams(
    target: ContactSelectionTarget,
    mode: ContactSelectionMode = 'select',
    source: ContactSelectionSource = 'EXPRESS',
    options: { returnDelta?: ContactSelectionReturnDelta } = {}
  ): ContactSelectionParams {
    return {
      mode,
      target,
      source,
      returnDelta: options.returnDelta ?? '2'
    }
  },

  /**
   *
   * @param params 路由 query 参数
   * @description 解析并归一路由 query 参数
   */
  parseParams(params: Record<string, string | undefined> = {}): ContactSelectionParams {
    return {
      mode: isContactSelectionMode(params.mode) ? params.mode : 'manage',
      target: isContactSelectionTarget(params.target) ? params.target : 'sender',
      source: isContactSelectionSource(params.source) ? params.source : 'EXPRESS',
      returnDelta: isContactSelectionReturnDelta(params.returnDelta) ? params.returnDelta : '2'
    }
  },

  /**
   *
   * @param target 选择目标
   * @param contact 选中的联系人
   * @param source 选择来源
   * @description 暂存选中的联系人
   */
  select(target: ContactSelectionTarget, contact: Contact, source: ContactSelectionSource = 'EXPRESS') {
    pendingSelection = {
      target,
      source,
      contact,
      selectedAt: Date.now()
    }
  },

  /**
   *
   * @param target 选择目标，可选
   * @param source 选择来源，可选
   * @description 取出并清空暂存的选中联系人
   */
  consumeSelection(target?: ContactSelectionTarget, source?: ContactSelectionSource) {
    if (!pendingSelection) {
      return null
    }

    if (target && pendingSelection.target !== target) {
      return null
    }

    if (source && pendingSelection.source !== source) {
      return null
    }

    const nextSelection = pendingSelection

    pendingSelection = null

    return nextSelection
  },

  /**
   *
   * @param contact 待编辑的联系人
   * @description 暂存待编辑的联系人
   */
  setEditingContact(contact: Contact) {
    pendingEditingContact = contact
  },

  /**
   *
   * @description 取出并清空暂存的待编辑联系人
   */
  consumeEditingContact() {
    const nextContact = pendingEditingContact

    pendingEditingContact = null

    return nextContact
  }
}
