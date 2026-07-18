import { createContactAddressCheckRequest } from './contact.addressIntegrity'
import { contactApi } from './contact.api'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'

import type {
  Contact,
  ContactAnalysis,
  ContactAnalysis4,
  ContactAddressHint,
  ContactListOptions,
  ContactValidationResult
} from './types'

const DEFAULT_PAGE_SIZE = 20

export function createEmptyContact(role: Contact['type'] = 0): Contact {
  return {
    name: '',
    telephone: '',
    province: '',
    city: '',
    county: '',
    address: '',
    company: '',
    type: role,
    defaultAddress: '0',
    regionType: ''
  }
}

function getChineseLength(value: string) {
  return (value.match(/[\u4e00-\u9fa5]/g) ?? []).length
}

type ContactAddressParts = Pick<
  Contact,
  'province' | 'city' | 'county' | 'address' | 'town'
>

function normalizeAddressPart(value?: string | null) {
  const text = (value ?? '').trim()

  return text && text !== 'null' ? text : ''
}

function removeRepeatedPrefix(value: string, prefix: string) {
  let nextValue = value

  while (prefix && nextValue.startsWith(prefix)) {
    nextValue = nextValue.slice(prefix.length)
  }

  return nextValue
}

export function getContactFullAddress(contact: ContactAddressParts) {
  return [
    contact.province,
    contact.city,
    contact.county,
    contact.town,
    contact.address
  ]
    .filter(Boolean)
    .join('')
}

export function parseAddressHint(raw: string): ContactAddressHint {
  const [province = '', city = '', county = '', town = '', ...addressParts] =
    raw.split(',')

  return {
    province: normalizeAddressPart(province),
    city: normalizeAddressPart(city),
    county: normalizeAddressPart(county),
    town: normalizeAddressPart(town),
    address: normalizeAddressPart(addressParts.join(',')),
    raw
  }
}

export function getAddressHintLabel(hint: ContactAddressHint) {
  const town = normalizeAddressPart(hint.town)

  return (
    [
      hint.province,
      hint.city,
      hint.county,
      town,
      removeRepeatedPrefix(normalizeAddressPart(hint.address), town)
    ]
      .filter(Boolean)
      .join('') || hint.raw
  )
}

export function applyAddressHintToContact(
  contact: Contact,
  hint: ContactAddressHint
): Contact {
  const town = normalizeAddressPart(hint.town)
  const detailAddress = removeRepeatedPrefix(
    normalizeAddressPart(hint.address),
    town
  )

  return {
    ...contact,
    province: hint.province || contact.province,
    city: hint.city || contact.city,
    county: hint.county || contact.county,
    town: town || contact.town,
    address: detailAddress || contact.address
  }
}

function parseProCityName(value?: string | null) {
  if (!value?.includes('-')) {
    return {
      province: '',
      city: '',
      county: ''
    }
  }

  const [province = '', city = '', county = ''] = value.split('-')

  return {
    province: normalizeAddressPart(province),
    city: normalizeAddressPart(city),
    county: normalizeAddressPart(county)
  }
}

function normalizeAnalysisPhone(value?: string | null) {
  return (value ?? '').replace(/[^\d]/g, '').slice(0, 11)
}

export function applyAnalysisToContact(
  contact: Contact,
  analysis: ContactAnalysis
): Contact {
  const region = parseProCityName(analysis.proCityName)
  const telephone = normalizeAnalysisPhone(analysis.telephone)
  const town = normalizeAddressPart(analysis.town)
  const detailAddress = removeRepeatedPrefix(
    normalizeAddressPart(analysis.address),
    town
  )
  const canFillRegion = !!(region.province || region.city || region.county)
  const address = canFillRegion
    ? detailAddress || contact.address
    : `${normalizeAddressPart(analysis.proCityName)}${town}${detailAddress}`

  return {
    ...contact,
    name: normalizeAddressPart(analysis.name) || contact.name,
    telephone: telephone || contact.telephone,
    extension: normalizeAddressPart(analysis.extension) || contact.extension,
    province: region.province || contact.province,
    city: region.city || contact.city,
    county: region.county || contact.county,
    town: town || contact.town,
    address: address || contact.address
  }
}

export function applyAnalysis4ToContact(
  contact: Contact,
  analysis: ContactAnalysis4
): Contact {
  const town = normalizeAddressPart(analysis.town)
  const detailAddress = removeRepeatedPrefix(
    normalizeAddressPart(analysis.detailAddress),
    town
  )

  return {
    ...contact,
    province: normalizeAddressPart(analysis.province) || contact.province,
    city: normalizeAddressPart(analysis.city) || contact.city,
    county: normalizeAddressPart(analysis.county) || contact.county,
    town: town || contact.town,
    address: detailAddress || contact.address
  }
}

export function validateContact(contact: Contact): ContactValidationResult {
  const messages: string[] = []
  const name = contact.name.trim()
  const telephone = contact.telephone.trim()
  const address = contact.address.trim()

  if (!name) {
    messages.push('请填写联系人姓名')
  } else if (name.length > 20) {
    messages.push('联系人姓名不能超过20个字符')
  }

  if (!/^1[3-9]\d{9}$/.test(telephone)) {
    messages.push('请填写正确的手机号')
  }

  if (contact.fixedPhone && !/^[0-9-]{6,20}$/.test(contact.fixedPhone)) {
    messages.push('请填写正确的固定电话')
  }

  if (!contact.province || !contact.city || !contact.county) {
    messages.push('请选择省市区')
  }

  if (!address) {
    messages.push('请填写详细地址')
  } else if (address.length < 4 || address.length > 100) {
    messages.push('详细地址需为4到100个字符')
  } else if (getChineseLength(address) < 4) {
    messages.push('详细地址至少包含4个汉字')
  }

  return {
    valid: messages.length === 0,
    messages
  }
}

export const contactService = {
  queryList(options: ContactListOptions = {}) {
    return contactApi.queryContact({
      pageIndex: options.pageIndex ?? 1,
      pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
      filterContent: options.keyword ?? '',
      regionType: options.regionType ?? '',
      sysCode: APP_RUNTIME_CONFIG.systemCode
    })
  },

  save(contact: Contact) {
    const validation = validateContact(contact)

    if (!validation.valid) {
      return Promise.resolve({
        status: false,
        message: validation.messages[0],
        result: null
      })
    }

    return contactApi.saveContact(contact)
  },

  remove(id: string) {
    if (!id) {
      return Promise.resolve({
        status: false,
        message: '缺少地址 ID，无法删除',
        result: null
      })
    }

    return contactApi.deleteContacts([id])
  },

  removeMany(ids: string[]) {
    if (!ids.length) {
      return Promise.resolve({
        status: false,
        message: '请选择需要删除的地址',
        result: null
      })
    }

    return contactApi.deleteContacts(ids)
  },

  setDefault(contact: Contact) {
    if (!contact.id) {
      return Promise.resolve({
        status: false,
        message: '缺少地址 ID，无法设置默认地址',
        result: null
      })
    }

    return contactApi.saveContact({
      ...contact,
      defaultAddress: '1'
    })
  },

  queryDefault() {
    return contactApi.queryDefaultContact()
  },

  analyze(address: string) {
    return contactApi.analyzeAddress(address)
  },

  analyze4(detailAddress: string, contact?: Partial<Contact>) {
    return contactApi.analyzeAddress4({
      province: contact?.province,
      city: contact?.city,
      county: contact?.county,
      detailAddress
    })
  },

  queryAddressHints(contact: Pick<Contact, 'province' | 'city' | 'county' | 'address'>) {
    return contactApi.queryAddressHints({
      province: contact.province,
      city: contact.city,
      county: contact.county,
      address: contact.address
    })
  },

  queryTownList(contact: Pick<Contact, 'province' | 'city' | 'county'>) {
    return contactApi.queryTownList({
      provinceName: contact.province,
      cityName: contact.city,
      countyName: contact.county
    })
  },

  checkAddressDetail(contact: Pick<Contact, 'province' | 'city' | 'county' | 'address'>) {
    return contactApi.checkAddressDetail(
      createContactAddressCheckRequest(contact)
    )
  },

  queryCount() {
    return contactApi.queryContactCount()
  },

  parseAddressHint,
  getAddressHintLabel,
  applyAddressHintToContact,
  applyAnalysisToContact,
  applyAnalysis4ToContact
}
