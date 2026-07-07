import { NativeCapabilityError, ensureNativeCapability } from './capabilities'

import type { AppCoordinateSystem } from './location'

export interface AppMapLocation {
  latitude: number
  longitude: number
  name?: string
  address?: string
  coordinateSystem?: AppCoordinateSystem
}

export interface OpenMapLocationOptions {
  source: string
  location: AppMapLocation
}

export interface ChooseMapLocationOptions {
  source: string
  keyword?: string
  initialLocation?: AppMapLocation
}

export interface ChooseMapLocationResult extends AppMapLocation {
  source: string
}

function isValidCoordinate(location: AppMapLocation) {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    Math.abs(location.latitude) <= 90 &&
    Math.abs(location.longitude) <= 180
  )
}

export async function openMapLocation(options: OpenMapLocationOptions) {
  ensureNativeCapability('map')

  if (!isValidCoordinate(options.location)) {
    throw new Error('请输入正确的经纬度')
  }

  throw new NativeCapabilityError('map')
}

export async function chooseMapLocation(
  _options: ChooseMapLocationOptions
): Promise<ChooseMapLocationResult> {
  ensureNativeCapability('map')

  throw new NativeCapabilityError('map')
}
