import { APP_ROUTES } from '../../shared/navigation/routes'
import { APP_NATIVE_CAPABILITIES } from '../../shared/platform/capabilities'

import type {
  PrintCenterOptions,
  PrintCenterView,
  PrintSelectionResult,
  PrintSelectionState
} from './types'

export const PRINT_API_ENDPOINTS = [
  '/gwapi/onlineService/eco/online/print/order/secure/queryNewOrderPrintList',
  '/gwapi/onlineService/eco/online/print/order/secure/blueToothPrintCode',
  '/gwapi/onlineService/eco/online/print/secure/queryPrintConfig',
  '/gwapi/onlineService/eco/online/print/secure/userPrintConfig',
  '/gwapi/onlineService/eco/online/print/order/secure/updatePrintStatus'
]

function createResult(
  step: PrintSelectionResult['step'],
  message: string
): PrintSelectionResult {
  return {
    canPrint: step === 'ready',
    step,
    message
  }
}

export function validatePrintSelection(
  state: PrintSelectionState
): PrintSelectionResult {
  if (!state.deviceConnected) {
    return createResult('device', '请先连接打印机')
  }

  if (state.totalOrders <= 0) {
    return createResult('orders', '暂无待打印订单')
  }

  if (!state.selectedWaybillNumbers.length) {
    return createResult('selection', '请选择打印运单后再打印')
  }

  return createResult('ready', '')
}

function createCloudCodeView(options: PrintCenterOptions) {
  const printId = options.printId?.trim()

  if (!printId) {
    return undefined
  }

  return {
    printId,
    source: options.source || 'UNKNOWN',
    title: '已识别云打印码',
    summary:
      '该二维码来自旧版云打印链路。App 首期仅识别并收口到面单打印中心，真实云打印下单待后续接入。',
    statusText: '待接入',
    disabledReason: '云打印码下单后续单独建模'
  }
}

export const printService = {
  getCenterView(options: PrintCenterOptions = {}): PrintCenterView {
    const nativeReady = APP_NATIVE_CAPABILITIES.print === 'ready'

    return {
      title: '面单打印',
      summary:
        '首期承接打印中心入口、打印前置规则和能力边界；蓝牙设备、模板下发和打印状态回写后续通过 App 原生打印 facade 接入。',
      nativeReady,
      cloudCode: createCloudCodeView(options),
      actions: [
        {
          key: 'orderList',
          title: '查看订单',
          summary: '先查看寄件订单，确认需要打印的运单。',
          status: 'ready',
          statusText: 'App',
          route: APP_ROUTES.orderList
        },
        {
          key: 'printOrders',
          title: '待打印面单',
          summary: '旧项目可查询待打印和已打印列表，App 后续接打印列表接口。',
          status: 'pending',
          statusText: '待接入',
          disabledReason: '待打印列表后续接入'
        },
        {
          key: 'printerDevice',
          title: '打印机管理',
          summary: '蓝牙扫描、连接和设备缓存依赖 App 原生打印模块。',
          status: nativeReady ? 'ready' : 'pending',
          statusText: nativeReady ? 'App' : '待接入',
          disabledReason: nativeReady ? undefined : '打印能力待接入 App 原生模块'
        },
        {
          key: 'printConfig',
          title: '打印设置',
          summary: '打印份数和设备偏好后续由打印配置接口承接。',
          status: 'pending',
          statusText: '待接入',
          disabledReason: '打印设置后续接入'
        },
        {
          key: 'cloudPrintCode',
          title: '云打印码',
          summary: '旧版云打印码在小程序中提示升级，App 端保留受控说明入口。',
          status: 'pending',
          statusText: '待接入',
          disabledReason: '云打印码下单后续单独建模'
        }
      ],
      apiEndpoints: PRINT_API_ENDPOINTS,
      rules: [
        '打印前必须先连接打印机',
        '没有待打印订单时不能发起打印',
        '必须选择至少一个运单后才能打印',
        '模板下发和状态回写必须在原生打印成功链路中执行'
      ]
    }
  },

  validateSelection: validatePrintSelection
}
