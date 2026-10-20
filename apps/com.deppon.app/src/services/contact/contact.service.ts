import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

import { createContactAddressCheckRequest } from './contact.addressIntegrity'
import { contactApi } from './contact.api'

import type { Contact, ContactAnalysis, ContactAnalysis4, ContactAddressHint, ContactListOptions, ContactValidationResult } from './types'

const DEFAULT_PAGE_SIZE = 20

/**
 *
 * @param role 联系人类型
 * @description 创建空的联系人对象
 */
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

/**
 *
 * @param value 待统计文本
 * @description 统计文本中的汉字个数
 */
function getChineseLength(value: string) {
  return (value.match(/[\u4e00-\u9fa5]/g) ?? []).length
}

type ContactAddressParts = Pick<Contact, 'province' | 'city' | 'county' | 'address' | 'town'>

/**
 *
 * @param value 地址片段，可为空
 * @description 归一地址片段，null 文本返回空
 */
function normalizeAddressPart(value?: string | null) {
  const text = (value ?? '').trim()

  return text && text !== 'null' ? text : ''
}

/**
 *
 * @param value 地址文本
 * @param prefix 重复前缀
 * @description 去除地址文本开头重复的前缀
 */
function removeRepeatedPrefix(value: string, prefix: string) {
  let nextValue = value

  while (prefix && nextValue.startsWith(prefix)) {
    nextValue = nextValue.slice(prefix.length)
  }

  return nextValue
}

/**
 *
 * @param contact 省市区与详细地址
 * @description 拼接联系人展示地址：地址簿卡片为「省市区,乡镇+详址」，
 * 乡镇只出现一次（后端 address 常已带乡镇前缀），因此在拼接前先去掉重复前缀。
 */
export function getContactFullAddress(contact: ContactAddressParts) {
  const region = [normalizeAddressPart(contact.province), normalizeAddressPart(contact.city), normalizeAddressPart(contact.county)].filter(Boolean).join('')
  const town = normalizeAddressPart(contact.town)
  const detail = [town, removeRepeatedPrefix(normalizeAddressPart(contact.address), town)].filter(Boolean).join('')

  return [region, detail].filter(Boolean).join(',')
}

/**
 *
 * @param raw 逗号分隔的地址提示
 * @description 解析地址提示为省市区字段
 */
export function parseAddressHint(raw: string): ContactAddressHint {
  const [province = '', city = '', county = '', town = '', ...addressParts] = raw.split(',')

  return {
    province: normalizeAddressPart(province),
    city: normalizeAddressPart(city),
    county: normalizeAddressPart(county),
    town: normalizeAddressPart(town),
    address: normalizeAddressPart(addressParts.join(',')),
    raw
  }
}

/**
 *
 * @param hint 地址提示
 * @description 生成地址提示展示文案
 */
export function getAddressHintLabel(hint: ContactAddressHint) {
  const town = normalizeAddressPart(hint.town)

  return [hint.province, hint.city, hint.county, town, removeRepeatedPrefix(normalizeAddressPart(hint.address), town)].filter(Boolean).join('') || hint.raw
}

/**
 *
 * @param contact 联系人
 * @param hint 地址提示
 * @description 将地址提示写入联系人
 */
export function applyAddressHintToContact(contact: Contact, hint: ContactAddressHint): Contact {
  const town = normalizeAddressPart(hint.town)
  const detailAddress = removeRepeatedPrefix(normalizeAddressPart(hint.address), town)

  return {
    ...contact,
    province: hint.province || contact.province,
    city: hint.city || contact.city,
    county: hint.county || contact.county,
    town: town || contact.town,
    address: detailAddress || contact.address
  }
}

/**
 *
 * @param value 省市区文本，可为空
 * @description 解析横线分隔的省市区文本
 */
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

/**
 *
 * @param value 电话号码，可为空
 * @description 归一电话号码，仅保留数字前 11 位
 */
function normalizeAnalysisPhone(value?: string | null) {
  return (value ?? '').replace(/[^\d]/g, '').slice(0, 11)
}

/**
 *
 * @param contact 联系人
 * @param analysis 智能识别结果
 * @description 将智能识别结果写入联系人
 */
export function applyAnalysisToContact(contact: Contact, analysis: ContactAnalysis): Contact {
  const region = parseProCityName(analysis.proCityName)
  const telephone = normalizeAnalysisPhone(analysis.telephone)
  const town = normalizeAddressPart(analysis.town)
  const detailAddress = removeRepeatedPrefix(normalizeAddressPart(analysis.address), town)
  const canFillRegion = !!(region.province || region.city || region.county)
  const address = canFillRegion ? detailAddress || contact.address : `${normalizeAddressPart(analysis.proCityName)}${town}${detailAddress}`

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

/**
 *
 * @param contact 联系人
 * @param analysis 智能识别结果 4
 * @description 将智能识别结果 4 写入联系人
 */
export function applyAnalysis4ToContact(contact: Contact, analysis: ContactAnalysis4): Contact {
  const town = normalizeAddressPart(analysis.town)
  const detailAddress = removeRepeatedPrefix(normalizeAddressPart(analysis.detailAddress), town)

  return {
    ...contact,
    province: normalizeAddressPart(analysis.province) || contact.province,
    city: normalizeAddressPart(analysis.city) || contact.city,
    county: normalizeAddressPart(analysis.county) || contact.county,
    town: town || contact.town,
    address: detailAddress || contact.address
  }
}

/**
 *
 * @param contact 联系人
 * @description 校验联系人必填项与格式
 */
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
  /**
   *
   * @param options 分页与关键字
   * @description 分页查询联系人列表
   */
  queryList(options: ContactListOptions = {}) {
    return contactApi.queryContact({
      pageIndex: options.pageIndex ?? 1,
      pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
      filterContent: options.keyword ?? '',
      regionType: options.regionType ?? '',
      sysCode: APP_RUNTIME_CONFIG.systemCode
    })
  },

  /**
   *
   * @param contact 联系人
   * @description 校验通过后保存联系人
   */
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

  /**
   *
   * @param id 地址 ID
   * @description 删除单个联系人地址
   */
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

  /**
   *
   * @param ids 地址 ID 列表
   * @description 批量删除联系人地址
   */
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

  /**
   *
   * @param contact 联系人
   * @description 将联系人设为默认地址
   */
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

  /**
   *
   * @description 查询默认联系人地址
   */
  queryDefault() {
    return contactApi.queryDefaultContact()
  },

  /**
   *
   * @param address 地址文本
   * @description 调用接口做地址智能识别
   */
  analyze(address: string) {
    return contactApi.analyzeAddress(address)
  },

  /**
   *
   * @param detailAddress 详细地址
   * @param contact 省市区，可选
   * @description 调用接口做地址智能识别 4
   */
  analyze4(detailAddress: string, contact?: Partial<Contact>) {
    return contactApi.analyzeAddress4({
      province: contact?.province,
      city: contact?.city,
      county: contact?.county,
      detailAddress
    })
  },

  /**
   *
   * @param contact 省市区与详细地址
   * @description 查询地址提示列表
   */
  queryAddressHints(contact: Pick<Contact, 'province' | 'city' | 'county' | 'address'>) {
    return contactApi.queryAddressHints({
      province: contact.province,
      city: contact.city,
      county: contact.county,
      address: contact.address
    })
  },

  /**
   *
   * @param contact 省市区
   * @description 查询街道列表
   */
  queryTownList(contact: Pick<Contact, 'province' | 'city' | 'county'>) {
    return contactApi.queryTownList({
      provinceName: contact.province,
      cityName: contact.city,
      countyName: contact.county
    })
  },

  /**
   *
   * @param contact 省市区与详细地址
   * @description 校验地址详细程度
   */
  checkAddressDetail(contact: Pick<Contact, 'province' | 'city' | 'county' | 'address'>) {
    return contactApi.checkAddressDetail(createContactAddressCheckRequest(contact))
  },

  /**
   *
   * @description 查询联系人地址数量
   */
  queryCount() {
    return contactApi.queryContactCount()
  },

  parseAddressHint,
  getAddressHintLabel,
  applyAddressHintToContact,
  applyAnalysisToContact,
  applyAnalysis4ToContact
}
