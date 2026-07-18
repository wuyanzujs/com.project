import { Text, Textarea, View } from '@tarojs/components'

import {
  ORDER_EVALUATION_LEVELS,
  ORDER_EVALUATION_SUGGESTION_MAX_LENGTH,
  ORDER_EVALUATION_TITLES,
  getOrderEvaluationLabels
} from '../../../../services/order'
import { AppPressable } from '../../../../shared/components'
import { AppIcon } from '../../../../shared/components/AppIcon'
import { APP_STYLE_COLORS } from '../../../../styles/nativeTokens'

import type {
  OrderEvaluationDraft,
  OrderEvaluationLevel,
  OrderEvaluationRecordType,
  OrderEvaluationValidation
} from '../../../../services/order'

import './OrderEvaluationForm.scss'

export function OrderEvaluationForm(props: {
  draft: OrderEvaluationDraft
  recordType: OrderEvaluationRecordType
  validation: OrderEvaluationValidation
  onLevelChange: (level: OrderEvaluationLevel) => void
  onLabelToggle: (label: string) => void
  onSuggestionChange: (suggestion: string) => void
}) {
  const labels = getOrderEvaluationLabels(
    props.recordType,
    props.draft.level
  )

  return (
    <>
      <View className='order-evaluation-section'>
        <View className='order-evaluation-section__head'>
          <Text className='order-evaluation-section__title'>服务评分</Text>
          <Text className='order-evaluation-section__hint'>
            {ORDER_EVALUATION_TITLES[props.draft.level]}
          </Text>
        </View>
        <View className='order-evaluation-stars'>
          {ORDER_EVALUATION_LEVELS.map(level => {
            const selected = level <= props.draft.level

            return (
              <AppPressable
                accessibilityLabel={`${level} 星`}
                className={[
                  'order-evaluation-star',
                  selected && 'order-evaluation-star--selected',
                  level === 5 && 'order-evaluation-star--last'
                ]
                  .filter(Boolean)
                  .join(' ')}
                flex
                key={level}
                selected={selected}
                onPress={() => props.onLevelChange(level)}
              >
                <AppIcon
                  color={
                    selected
                      ? APP_STYLE_COLORS.status.warningAccent
                      : APP_STYLE_COLORS.text.placeholder
                  }
                  name='star'
                  size={26}
                />
                <Text className='order-evaluation-star__label'>{level}</Text>
              </AppPressable>
            )
          })}
        </View>
      </View>

      <View className='order-evaluation-section'>
        <View className='order-evaluation-section__head'>
          <Text className='order-evaluation-section__title'>评价标签</Text>
          <Text className='order-evaluation-section__hint'>至少选择一项</Text>
        </View>
        <View className='order-evaluation-labels'>
          {labels.map(label => {
            const selected = props.draft.selectedLabels.includes(label)

            return (
              <AppPressable
                accessibilityLabel={label}
                className={
                  selected
                    ? 'order-evaluation-label order-evaluation-label--selected'
                    : 'order-evaluation-label'
                }
                key={label}
                selected={selected}
                onPress={() => props.onLabelToggle(label)}
              >
                <Text
                  className={
                    selected
                      ? 'order-evaluation-label__text order-evaluation-label__text--selected'
                      : 'order-evaluation-label__text'
                  }
                >
                  {label}
                </Text>
              </AppPressable>
            )
          })}
        </View>
      </View>

      <View className='order-evaluation-section'>
        <View className='order-evaluation-section__head'>
          <Text className='order-evaluation-section__title'>补充建议</Text>
          <Text className='order-evaluation-section__hint'>
            {props.draft.suggestion.length}/
            {ORDER_EVALUATION_SUGGESTION_MAX_LENGTH}
          </Text>
        </View>
        <Textarea
          className='order-evaluation-suggestion'
          maxlength={ORDER_EVALUATION_SUGGESTION_MAX_LENGTH}
          placeholder='你的建议会帮助我们持续改善服务'
          value={props.draft.suggestion}
          onInput={event => props.onSuggestionChange(event.detail.value)}
        />
        {!props.validation.valid && (
          <Text className='order-evaluation-validation'>
            {props.validation.message}
          </Text>
        )}
      </View>
    </>
  )
}
