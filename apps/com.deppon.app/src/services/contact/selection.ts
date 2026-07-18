import type { Contact } from './types'

export type ContactSelectionTarget = 'sender' | 'consignee'
export type ContactSelectionMode = 'select' | 'manage'
export type ContactSelectionSource =
  'EXPRESS' | 'QUERY_PRICE' | 'INVOICE_DETAIL' | 'BATCH'
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

function isContactSelectionTarget(
  value: unknown
): value is ContactSelectionTarget {
  return value === 'sender' || value === 'consignee'
}

function isContactSelectionMode(value: unknown): value is ContactSelectionMode {
  return value === 'select' || value === 'manage'
}

function isContactSelectionSource(
  value: unknown
): value is ContactSelectionSource {
  return (
    value === 'EXPRESS' ||
    value === 'QUERY_PRICE' ||
    value === 'INVOICE_DETAIL' ||
    value === 'BATCH'
  )
}

function isContactSelectionReturnDelta(
  value: unknown
): value is ContactSelectionReturnDelta {
  return value === '1' || value === '2'
}

export const contactSelection = {
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

  parseParams(
    params: Record<string, string | undefined> = {}
  ): ContactSelectionParams {
    return {
      mode: isContactSelectionMode(params.mode) ? params.mode : 'manage',
      target: isContactSelectionTarget(params.target)
        ? params.target
        : 'sender',
      source: isContactSelectionSource(params.source)
        ? params.source
        : 'EXPRESS',
      returnDelta: isContactSelectionReturnDelta(params.returnDelta)
        ? params.returnDelta
        : '2'
    }
  },

  select(
    target: ContactSelectionTarget,
    contact: Contact,
    source: ContactSelectionSource = 'EXPRESS'
  ) {
    pendingSelection = {
      target,
      source,
      contact,
      selectedAt: Date.now()
    }
  },

  consumeSelection(
    target?: ContactSelectionTarget,
    source?: ContactSelectionSource
  ) {
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

  setEditingContact(contact: Contact) {
    pendingEditingContact = contact
  },

  consumeEditingContact() {
    const nextContact = pendingEditingContact

    pendingEditingContact = null

    return nextContact
  }
}
