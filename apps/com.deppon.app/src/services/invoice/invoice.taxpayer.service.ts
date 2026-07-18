import { invoiceApi } from './invoice.api'
import {
  createFormFromTaxpayer,
  createTaxpayerPayload,
  normalizeTaxpayer,
  validateTaxpayer
} from './invoice.taxpayer'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  InvoiceTaxpayerDeleteRequest,
  InvoiceTaxpayerForm,
  InvoiceTaxpayerMatch,
  InvoiceTaxpayerMatchRequest,
  InvoiceTaxpayerRaw,
  InvoiceTaxpayerSaveRequest,
  InvoiceTaxpayerType,
  InvoiceTaxpayerView
} from './types'
import type { DepponResponse } from '../../request/deppon'

export const invoiceTaxpayerService = {
  createTaxpayerForm: createFormFromTaxpayer,

  validateTaxpayer,

  async queryTaxpayers(): Promise<DepponResponse<InvoiceTaxpayerView[]>> {
    const response = await invoiceApi.request<InvoiceTaxpayerRaw[]>(
      'queryTaxpayerInfo',
      undefined,
      false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到发票抬头')
    }

    return {
      ...response,
      result: response.result.map(normalizeTaxpayer)
    }
  },

  async queryTaxpayerMatches(
    taxName: string,
    customerType: InvoiceTaxpayerType
  ): Promise<DepponResponse<InvoiceTaxpayerMatch[]>> {
    const keyword = taxName.trim()

    if (!keyword || keyword.length <= 3 || customerType !== '1') {
      return {
        status: true,
        message: '',
        result: []
      }
    }

    const response = await invoiceApi.request<
      InvoiceTaxpayerMatch[],
      InvoiceTaxpayerMatchRequest
    >(
      'queryCustomerTaxName',
      {
        taxName: keyword,
        customerType
      },
      false,
      3000
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未匹配到企业抬头')
    }

    return response
  },

  async saveTaxpayer(
    form: InvoiceTaxpayerForm
  ): Promise<DepponResponse<unknown>> {
    const message = validateTaxpayer(form)

    if (message) {
      return createFailure(message)
    }

    const path = form.id ? 'alterTaxpayerInfo' : 'addTaxpayerInfo'
    const response = await invoiceApi.request<
      unknown,
      InvoiceTaxpayerSaveRequest
    >(path, createTaxpayerPayload(form))

    if (!response.status) {
      return createFailure(response.message || '保存失败，请稍后再试')
    }

    return response
  },

  async deleteTaxpayer(id: number): Promise<DepponResponse<unknown>> {
    const response = await invoiceApi.request<
      unknown,
      InvoiceTaxpayerDeleteRequest
    >('deleteTaxpayerInfo', { id: [id] })

    if (!response.status) {
      return createFailure(response.message || '删除失败，请稍后再试')
    }

    return response
  }
}
