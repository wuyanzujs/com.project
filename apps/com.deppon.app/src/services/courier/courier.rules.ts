import {
  applyExpressScanContext,
  createExpressDraft
} from '../express/express.draft'

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
