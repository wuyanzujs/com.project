/**
 *
 * @param latitude 纬度（允许字符串形式的后端字段）
 * @param longitude 经度（允许字符串形式的后端字段）
 * @description 判断经纬度是否落在合法范围内；非法、缺失或非数字都返回 false。
 */
export function isValidCoordinate(latitude: unknown, longitude: unknown) {
  const safeLatitude = Number(latitude)
  const safeLongitude = Number(longitude)

  return Number.isFinite(safeLatitude) && Number.isFinite(safeLongitude) && Math.abs(safeLatitude) <= 90 && Math.abs(safeLongitude) <= 180
}
