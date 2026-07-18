import { trimText } from './express.draft'

import type {
  ExpressGoodsCheckResult,
  ExpressGoodsCheckStatus,
  ExpressGoodsLabel
} from './types'

export function getBlockingExpressGoodsLabel(labels: ExpressGoodsLabel[]) {
  return labels.find(label => label.displayType === 'forbid')
}

function getGoodsLabelStatus(
  label: ExpressGoodsLabel
): ExpressGoodsCheckStatus {
  if (label.displayType === 'forbid') {
    return 'forbid'
  }

  if (label.goodsRemarkCode === 'unknow_category') {
    return 'unknown'
  }

  return 'risk'
}

function compareGoodsStatus(
  current: ExpressGoodsCheckStatus,
  next: ExpressGoodsCheckStatus
) {
  const rank: Record<ExpressGoodsCheckStatus, number> = {
    ok: 0,
    risk: 1,
    unknown: 2,
    forbid: 3
  }

  return rank[next] > rank[current] ? next : current
}

function getGoodsCheckStatus(labels: ExpressGoodsLabel[]) {
  return labels.reduce<ExpressGoodsCheckStatus>(
    (status, label) => compareGoodsStatus(status, getGoodsLabelStatus(label)),
    'ok'
  )
}

function getGoodsCheckTitle(status: ExpressGoodsCheckStatus) {
  switch (status) {
    case 'forbid':
      return '暂不支持寄递'
    case 'unknown':
      return '需要人工确认'
    case 'risk':
      return '存在寄递提示'
    default:
      return '可正常寄递'
  }
}

function getGoodsCheckMessage(
  status: ExpressGoodsCheckStatus,
  labels: ExpressGoodsLabel[]
) {
  const message = labels.map(label => trimText(label.tip)).find(Boolean)

  if (message) {
    return message
  }

  switch (status) {
    case 'forbid':
      return '该货物当前不支持寄递，请更换货物名称或咨询客服。'
    case 'unknown':
      return '暂未识别到明确品类，寄件前建议补充准确名称。'
    case 'risk':
      return '该货物存在包装、保价或收寄限制提示，请按页面提示确认。'
    default:
      return '未命中禁寄或特殊风险规则。'
  }
}

export function normalizeExpressGoodsCheckResult(
  goodsName: string,
  labels: ExpressGoodsLabel[]
): ExpressGoodsCheckResult {
  const status = getGoodsCheckStatus(labels)

  return {
    goodsName,
    status,
    canExpress: status !== 'forbid',
    title: getGoodsCheckTitle(status),
    message: getGoodsCheckMessage(status, labels),
    labels
  }
}
