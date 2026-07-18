import type { ExpressInsuranceRuleType } from './types'

export interface ExpressInsuranceRuleTableRow {
  cells: string[]
  tone?: 'normal' | 'warning'
}

export interface ExpressInsuranceRuleTable {
  title: string
  headers: string[]
  rows: ExpressInsuranceRuleTableRow[]
  note?: string
}

export interface ExpressInsuranceRuleSection {
  title: string
  content: string[]
  table?: ExpressInsuranceRuleTable
}

export interface ExpressInsuranceRuleView {
  type: ExpressInsuranceRuleType
  title: string
  summary: string
  badgeText: string
  sections: ExpressInsuranceRuleSection[]
}
