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
