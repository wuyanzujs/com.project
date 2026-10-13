require('../support/register.cjs')

function createOrderDetail(patch = {}) {
  return {
    isSender: 'Y',
    isReceiver: 'N',
    orderNumber: 'ORDER_001',
    waybillNumber: 'DPK123456789',
    orderClassification: '1',
    orderClassName: '运输中',
    orderStatus: '运输中',
    orderTime: '2026-07-09 10:00:00',
    contactMobile: '13800138000',
    receiverMobile: '13900139000',
    beginAcceptTime: '2026-07-15 10:00:00',
    modifyFlag: true,
    isDlyNotified: 'N',
    canBeVoided: 'Y',
    orderTableType: 'EXPRESS',
    ...patch
  }
}

function getActionKinds(actions) {
  return actions.map(item => item.kind)
}

module.exports = { createOrderDetail, getActionKinds }
