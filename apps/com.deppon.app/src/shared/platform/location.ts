import { NativeCapabilityError, ensureNativeCapability } from './capabilities'

export type AppCoordinateSystem = 'gcj02' | 'wgs84' | 'bd09' | 'unknown'

export interface AppLocationOptions {
  source: string
  highAccuracy?: boolean
  coordinateSystem?: AppCoordinateSystem
}

export interface AppLocationResult {
  source: string
  latitude: number
  longitude: number
  coordinateSystem: AppCoordinateSystem
  accuracy?: number
  altitude?: number
  speed?: number
  address?: string
}

export async function getCurrentAppLocation(
  _options: AppLocationOptions
): Promise<AppLocationResult> {
  ensureNativeCapability('location')

  throw new NativeCapabilityError('location')
}
