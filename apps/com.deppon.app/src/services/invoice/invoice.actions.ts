import { invoiceApi } from './invoice.api'
import { normalizeText } from './invoice.shared'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type { Contact } from '../contact'
import type { InvoiceBasicRequest, InvoiceModifyAddressRequest } from './types'
import type { DepponResponse } from '../../request/deppon'

type InvoiceAddressContact = Pick<
  Contact,
  'name' | 'telephone' | 'province' | 'city' | 'county' | 'town' | 'address'
>

async function requestInvoiceBasicAction(
  path: 'cancelInvoiceApply' | 'toRedRush',
  applyNo: string,
  failureMessage: string
): Promise<DepponResponse<null>> {
  const normalizedApplyNo = normalizeText(applyNo)

  if (!normalizedApplyNo) {
    return createFailure('缺少发票申请号')
  }

  const response = await invoiceApi.request<null, InvoiceBasicRequest>(
    path,
    {
      applyNo: normalizedApplyNo
    },
    true,
    30000
  )

  if (!response.status) {
    return createFailure(response.message || failureMessage)
  }

  return {
    ...response,
    result: null
  }
}

export function cancelInvoiceApply(applyNo: string) {
  return requestInvoiceBasicAction(
    'cancelInvoiceApply',
    applyNo,
    '撤销失败，请稍后再试'
  )
}

export function reverseInvoice(applyNo: string) {
  return requestInvoiceBasicAction('toRedRush', applyNo, '作废失败，请稍后再试')
}

function getInvoiceAddressDetail(contact: InvoiceAddressContact) {
  const town = normalizeText(contact.town)
  const address = normalizeText(contact.address)

  if (town && address && !address.startsWith(town)) {
    return `${town}${address}`
  }

  return address || town
}

export function createInvoiceModifyAddressPayload(
  applyNo: string,
  contact: InvoiceAddressContact
): InvoiceModifyAddressRequest {
  return {
    applyNo: normalizeText(applyNo),
    acceptCustomer: normalizeText(contact.name),
    acceptPhone: normalizeText(contact.telephone),
    acceptAddress: [
      contact.province,
      contact.city,
      contact.county,
      getInvoiceAddressDetail(contact)
    ]
      .map(normalizeText)
      .join('|')
  }
}

function validateInvoiceModifyAddressPayload(
  payload: InvoiceModifyAddressRequest
) {
  const addressParts = payload.acceptAddress.split('|')

  if (!payload.applyNo) {
    return '缺少发票申请号'
  }

  if (!payload.acceptCustomer) {
    return '请选择收票人'
  }

  if (!/^1[3-9]\d{9}$/.test(payload.acceptPhone)) {
    return '请选择正确的收票手机号'
  }

  if (
    addressParts.length < 4 ||
    addressParts.some(item => !normalizeText(item))
  ) {
    return '请选择完整的收票地址'
  }

  return ''
}

export async function modifyInvoiceAddress(
  applyNo: string,
  contact: InvoiceAddressContact
): Promise<DepponResponse<null>> {
  const payload = createInvoiceModifyAddressPayload(applyNo, contact)
  const validationMessage = validateInvoiceModifyAddressPayload(payload)

  if (validationMessage) {
    return createFailure(validationMessage)
  }

  const response = await invoiceApi.request<null, InvoiceModifyAddressRequest>(
    'alterSendAdress',
    payload,
    true,
    30000
  )

  if (!response.status) {
    return createFailure(response.message || '修改收票地址失败，请稍后再试')
  }

  return {
    ...response,
    result: null
  }
}
