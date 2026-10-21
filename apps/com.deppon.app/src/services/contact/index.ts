export { contactApi } from './contact.api'
export { createContactAddressCheckRequest, resolveContactAddressIntegrity } from './contact.addressIntegrity'
export type { ContactAddressIntegrityOutcome, ContactAddressIntegrityKind } from './contact.addressIntegrity'
export {
  contactService,
  createEmptyContact,
  getContactFullAddress,
  parseAddressHint,
  getAddressHintLabel,
  applyAddressHintToContact,
  applyAnalysisToContact,
  applyAnalysis4ToContact,
  validateContact
} from './contact.service'
export { fetchRegionTree, clearRegionTreeCache } from './region.api'
export { REGION_DATA_URL, REGION_HOT_CITIES, normalizeRegionTree, formatRegionLabel, createRegionSelection, searchRegions, findHotCity } from './region.rules'
export { regionService } from './region.service'
export * from './region.types'
export { contactSelection } from './selection'
export type {
  ContactSelectionParams,
  ContactSelectionResult,
  ContactSelectionTarget,
  ContactSelectionMode,
  ContactSelectionSource,
  ContactSelectionReturnDelta
} from './selection'
export * from './types'
