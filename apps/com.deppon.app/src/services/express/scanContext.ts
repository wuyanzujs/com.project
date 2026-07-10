import type { ExpressScanContext, ExpressScanRole } from './types'

export type ExpressScanContextTone = 'info' | 'success'

export interface ExpressScanContextView {
  title: string
  tag: string
  summary: string
  actionText: string
  tone: ExpressScanContextTone
}

const EXPRESS_SCAN_ROLE_LABELS: Record<ExpressScanRole, string> = {
  pickupManId: '快递员二维码',
  driverId: '司机二维码',
  acceptDept: '营业部二维码',
  businessCode: '服务点二维码',
  shipperNumber: '客户编码二维码'
}

function getScanContextSummary(context: ExpressScanContext) {
  const meta = [
    context.sceneId ? `场景 ${context.sceneId}` : '',
    context.expressRole === 'PARTNER' ? '合作伙伴' : ''
  ].filter(Boolean)
  const metaText = meta.length ? `，${meta.join('，')}` : ''

  switch (context.role) {
    case 'pickupManId':
    case 'driverId':
      return `已带入揽收人员 ${context.value}${metaText}，下单时会作为 pickupManId 提交。`
    case 'shipperNumber':
      return `已带入客户编码 ${context.value}${metaText}，下单时会作为 shipperNumber 提交；月结和合同权限仍以后端校验为准。`
    case 'acceptDept':
    case 'businessCode':
      return `已带入网点编码 ${context.value}${metaText}，下单时会作为 acceptDept 提交。`
  }
}

export function createExpressScanContextView(
  context?: ExpressScanContext
): ExpressScanContextView | null {
  if (!context) {
    return null
  }

  return {
    title: '扫码寄件信息',
    tag: EXPRESS_SCAN_ROLE_LABELS[context.role],
    summary: getScanContextSummary(context),
    actionText: '移除',
    tone: context.role === 'shipperNumber' ? 'success' : 'info'
  }
}
