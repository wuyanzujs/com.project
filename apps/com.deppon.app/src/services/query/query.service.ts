import {
  queryDispatchRange,
  resolveDispatchAddress
} from './query.dispatch'
import {
  createStationDetailRoute,
  createStationFeedbackWebUri,
  getStationPrimaryPhone,
  queryStationDetail,
  queryStations
} from './query.station'

export const queryService = {
  resolveDispatchAddress,
  queryDispatchRange,
  queryStations,
  queryStationDetail,
  createStationDetailRoute,
  createStationFeedbackWebUri,
  getStationPrimaryPhone
}
