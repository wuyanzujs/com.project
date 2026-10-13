import {
  applyExpressScanContext,
  createExpressDraft
} from '../express/express.draft'

/**
 *
 * @param courierNo 快递员工号
 * @description 用快递员工号创建寄件草稿
 */
export function createCourierExpressDraft(courierNo: string) {
  const normalizedCourierNo = courierNo.trim()

  if (!normalizedCourierNo) {
    return null
  }

  return applyExpressScanContext(createExpressDraft(), {
    role: 'pickupManId',
    value: normalizedCourierNo
  })
}
