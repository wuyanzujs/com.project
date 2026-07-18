import { invoiceApplyService } from './invoice.apply.service'
import { invoiceCenterService } from './invoice.center.service'
import { invoiceTaxpayerService } from './invoice.taxpayer.service'

export const invoiceService = {
  ...invoiceApplyService,
  ...invoiceCenterService,
  ...invoiceTaxpayerService
}
