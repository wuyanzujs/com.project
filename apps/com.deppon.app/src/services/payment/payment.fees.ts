import type {
  PaymentChargeItem,
  PaymentFeeRow,
  PaymentFeeSummary,
  PaymentItem
} from './types'

const PAYMENT_SERVICE_FEE_FIELDS: Array<{
  key: keyof PaymentItem
  label: string
}> = [
  { key: 'transferFee', label: '转寄/拦截费' },
  { key: 'appointmentDeliverFee', label: '预约派送费' },
  { key: 'insurance', label: '保价服务费' },
  { key: 'signBackCharge', label: '签收回单费用' },
  { key: 'refundFee', label: '代收服务费' },
  { key: 'consignCharge', label: '提货费' },
  { key: 'deliveryCharge', label: '送货费' },
  { key: 'pickCharge', label: '包装费' },
  { key: 'storageFee', label: '保管费' }
]

function toFiniteAmount(value: unknown) {
  const amount = Number(value)

  return Number.isFinite(amount) ? amount : null
}

function toPaymentAmount(value: unknown) {
  const amount = toFiniteAmount(value)

  return amount && amount > 0 ? amount : 0
}

function roundPaymentAmount(value: number) {
  return Math.round(value * 100) / 100
}

function createPaymentFeeRow(
  key: string,
  label: string,
  amount: number,
  tone?: PaymentFeeRow['tone']
): PaymentFeeRow | null {
  const normalizedAmount = roundPaymentAmount(amount)

  if (normalizedAmount <= 0) {
    return null
  }

  return {
    key,
    label,
    amount: normalizedAmount,
    tone
  }
}

function getChargeItemRow(item: PaymentChargeItem) {
  return createPaymentFeeRow(
    item.feeAttribute,
    item.feeName,
    toPaymentAmount(item.feeMoney)
  )
}

export function createPaymentFeeSummary(
  item: PaymentItem
): PaymentFeeSummary {
  const serviceRows: PaymentFeeRow[] = []
  const favorFeeFromDetail =
    item.basicFeeDetail?.find((detail) => detail.feeAttribute === 'favorFee')
      ?.feeMoney ?? item.favorFee

  for (const field of PAYMENT_SERVICE_FEE_FIELDS) {
    const row = createPaymentFeeRow(
      field.key,
      field.label,
      toPaymentAmount(item[field.key])
    )

    if (row) {
      serviceRows.push(row)
    }
  }

  const interceptFee = item.incrementFeeDetail?.find(
    (detail) => detail.feeAttribute === 'interceptFee'
  )
  const interceptAmount = toPaymentAmount(interceptFee?.feeMoney)

  if (interceptAmount > 0) {
    const transferIndex = serviceRows.findIndex(
      (row) => row.key === 'transferFee'
    )

    if (transferIndex >= 0) {
      serviceRows[transferIndex] = {
        ...serviceRows[transferIndex],
        amount: roundPaymentAmount(
          serviceRows[transferIndex].amount + interceptAmount
        )
      }
    } else {
      serviceRows.unshift({
        key: 'transferFee',
        label: '转寄/拦截费',
        amount: roundPaymentAmount(interceptAmount)
      })
    }
  }

  for (const detail of item.incrementFeeDetail ?? []) {
    if (
      detail.feeAttribute === 'returnFee' ||
      detail.feeAttribute === 'transferFee' ||
      detail.feeAttribute === 'interceptFee'
    ) {
      continue
    }

    const row = getChargeItemRow(detail)

    if (row) {
      serviceRows.push(row)
    }
  }

  const serviceAmount = roundPaymentAmount(
    serviceRows.reduce((total, row) => total + row.amount, 0)
  )
  const totalCharge = toPaymentAmount(item.totalCharge)
  const otherAmount = roundPaymentAmount(
    totalCharge -
      toPaymentAmount(item.dshk) -
      toPaymentAmount(item.releasePriceFee) -
      serviceAmount
  )

  if (otherAmount > 0) {
    serviceRows.push({
      key: 'otherPayment',
      label: '其他费用',
      amount: otherAmount
    })
  }

  const baseAmount = toPaymentAmount(item.publishCharge)
  const discountAmount = toPaymentAmount(favorFeeFromDetail)
  const paidAmount = toPaymentAmount(item.writeoffAmount)
  const rows = [
    createPaymentFeeRow('publishCharge', '基础运费', baseAmount),
    ...serviceRows,
    createPaymentFeeRow('favorFee', '减免费用', discountAmount, 'discount'),
    createPaymentFeeRow('writeoffAmount', '已支付费用', paidAmount, 'paid')
  ].filter((row): row is PaymentFeeRow => Boolean(row))

  return {
    baseAmount,
    serviceAmount: roundPaymentAmount(
      serviceRows.reduce((total, row) => total + row.amount, 0)
    ),
    discountAmount,
    paidAmount,
    rows,
    serviceRows
  }
}
