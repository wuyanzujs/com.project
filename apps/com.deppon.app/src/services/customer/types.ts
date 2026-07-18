export interface CustomerInfoRaw {
  cusCode?: string | null
  custName?: string | null
  isMainLinkman?: string | null
  privateBill?: '' | 'Y' | 'N' | string | null
}

export interface CustomerCenterView {
  code: string
  name: string
  statusText: string
  summary: string
  mainContactText: string
  privateBillText: string
  hasBoundCustomer: boolean
}

export interface CustomerCapabilityRaw {
  custNumber?: string | null
  teanLimit?: number | string | null
  insuredPriceCap?: number | string | null
  exPayWay?: boolean | null
  ifExistContract?: '0' | '1' | string | null
}

export interface CustomerCapabilityView {
  customerCode: string
  collectionLimit: number | null
  insuranceLimit: number | null
  hasBoundCustomer: boolean
  monthlyEnabled: boolean
  contractEnabled: boolean
}

export interface CustomerCapabilitySummaryView {
  available: boolean
  collectionLimitText: string
  contractText: string
  customerCode: string
  monthlyPaymentText: string
}

export interface CustomerCenterOverviewView {
  capability: CustomerCapabilitySummaryView | null
  customer: CustomerCenterView | null
  warning: string
}
