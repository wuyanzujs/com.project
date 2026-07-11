import { ScrollView, Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { expressInsuranceRules } from '../../../services/express'

import type {
  ExpressInsuranceRuleTable,
  ExpressInsuranceRuleTableRow,
  ExpressInsuranceRuleType
} from '../../../services/express'

import './index.scss'

function decodeParam(value?: string) {
  if (!value) {
    return ''
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeType(value?: string): ExpressInsuranceRuleType {
  if (value === 'QEB' || value === 'SXB') {
    return value
  }

  return 'NORMAL'
}

function getRuleOptionClassName(
  type: ExpressInsuranceRuleType,
  activeType: ExpressInsuranceRuleType
) {
  return type === activeType
    ? 'insurance-rule-option insurance-rule-option--active'
    : 'insurance-rule-option'
}

function getRuleOptionTextClassName(
  type: ExpressInsuranceRuleType,
  activeType: ExpressInsuranceRuleType
) {
  return type === activeType
    ? 'insurance-rule-option__text insurance-rule-option__text--active'
    : 'insurance-rule-option__text'
}

function getTableRowClassName(row: ExpressInsuranceRuleTableRow) {
  return row.tone === 'warning'
    ? 'insurance-rule-table__row insurance-rule-table__row--warning'
    : 'insurance-rule-table__row'
}

function renderTable(table: ExpressInsuranceRuleTable) {
  return (
    <View className='insurance-rule-table'>
      <Text className='insurance-rule-table__title'>{table.title}</Text>
      <View className='insurance-rule-table__head'>
        {table.headers.map(header => (
          <Text className='insurance-rule-table__head-cell' key={header}>
            {header}
          </Text>
        ))}
      </View>
      {table.rows.map((row, rowIndex) => (
        <View className={getTableRowClassName(row)} key={`${rowIndex}`}>
          {row.cells.map((cell, cellIndex) => (
            <Text
              className='insurance-rule-table__cell'
              key={`${rowIndex}-${cellIndex}`}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
      {!!table.note && (
        <Text className='insurance-rule-table__note'>{table.note}</Text>
      )}
    </View>
  )
}

const ExpressInsurancePage = () => {
  const router = useRouter()
  const initialType = useMemo(
    () => normalizeType(decodeParam(router.params.type)),
    [router.params.type]
  )
  const [activeType, setActiveType] =
    useState<ExpressInsuranceRuleType>(initialType)
  const options = useMemo(() => expressInsuranceRules.getRuleTypes(), [])
  const rule = expressInsuranceRules.getRule(activeType)

  return (
    <ScrollView className='insurance-rule-page' scrollY>
      <View className='insurance-rule-tabs'>
        {options.map(option => (
          <View
            className={getRuleOptionClassName(option.type, activeType)}
            key={option.type}
            onClick={() => setActiveType(option.type)}
          >
            <Text
              className={getRuleOptionTextClassName(option.type, activeType)}
            >
              {option.title}
            </Text>
          </View>
        ))}
      </View>

      <View className='insurance-rule-card insurance-rule-card--hero'>
        <View>
          <Text className='insurance-rule-card__badge'>{rule.badgeText}</Text>
          <Text className='insurance-rule-card__title'>{rule.title}</Text>
        </View>
        <Text className='insurance-rule-card__summary'>{rule.summary}</Text>
      </View>

      {rule.sections.map(section => (
        <View className='insurance-rule-card' key={section.title}>
          <Text className='insurance-rule-section__title'>{section.title}</Text>
          {section.content.map((item, index) => (
            <Text
              className='insurance-rule-section__text'
              key={`${section.title}-${index}`}
            >
              {item}
            </Text>
          ))}
          {section.table && renderTable(section.table)}
        </View>
      ))}

      <View className='insurance-rule-notice'>
        <Text className='insurance-rule-notice__text'>
          具体可保范围、保价上限、费率和赔付结论以后端、网点开单及正式协议为准。
        </Text>
      </View>
    </ScrollView>
  )
}

export default ExpressInsurancePage
