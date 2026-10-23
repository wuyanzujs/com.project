import { isValidCoordinate } from '@/shared/geo/coordinates'

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

export async function openMapLocation(options: OpenMapLocationOptions) {
  ensureNativeCapability('map')

  if (!isValidCoordinate(options.location.latitude, options.location.longitude)) {
    throw new Error('请输入正确的经纬度')
  }

  throw new NativeCapabilityError('map')
}

export async function chooseMapLocation(_options: ChooseMapLocationOptions): Promise<ChooseMapLocationResult> {
  ensureNativeCapability('map')

  throw new NativeCapabilityError('map')
}
