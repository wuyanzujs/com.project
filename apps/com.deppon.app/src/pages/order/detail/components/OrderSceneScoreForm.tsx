import { Text, Textarea, View } from '@tarojs/components'

import { useMemo, useState } from 'react'

import {
  ORDER_SCENE_SURVEY_CONTENT_MAX_LENGTH,
  ORDER_SCENE_SURVEY_SCORES,
  ORDER_SCENE_SURVEY_SCORE_TITLES,
  getOrderSceneScoreLabels,
  validateOrderSceneScoreDraft
} from '../../../../services/order'
import {
  AppButton,
  AppPressable
} from '../../../../shared/components'
import { AppIcon } from '../../../../shared/components/AppIcon'
import { APP_STYLE_COLORS } from '../../../../styles/nativeTokens'

import type {
  OrderSceneScoreDraft,
  OrderSceneSurveyItem,
  OrderSceneSurveyScore
} from '../../../../services/order'

import './OrderSceneSurveyForm.scss'

export function OrderSceneScoreForm(props: {
  item: OrderSceneSurveyItem
  submitting: boolean
  onSubmit: (draft: OrderSceneScoreDraft) => void
}) {
  const [draft, setDraft] = useState<OrderSceneScoreDraft>({
    score: null,
    selectedLabelIds: [],
    content: ''
  })
  const labels = useMemo(
    () => getOrderSceneScoreLabels(props.item, draft.score),
    [draft.score, props.item]
  )
  const validation = validateOrderSceneScoreDraft(props.item, draft)

  const selectScore = (score: OrderSceneSurveyScore) => {
    setDraft(current => ({
      ...current,
      score,
      selectedLabelIds: []
    }))
  }

  const toggleLabel = (labelId: string) => {
    setDraft(current => ({
      ...current,
      selectedLabelIds: current.selectedLabelIds.includes(labelId)
        ? current.selectedLabelIds.filter(id => id !== labelId)
        : [...current.selectedLabelIds, labelId]
    }))
  }

  return (
    <View className='order-scene-survey__form'>
      <View className='order-scene-survey__score-options'>
        {ORDER_SCENE_SURVEY_SCORES.map((score, index) => {
          const selected = draft.score === score

          return (
            <AppPressable
              accessibilityLabel={`${score} 星`}
              className={[
                'order-scene-survey__score',
                selected && 'order-scene-survey__score--selected',
                index === ORDER_SCENE_SURVEY_SCORES.length - 1 &&
                  'order-scene-survey__score--last'
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={props.submitting}
              flex
              key={score}
              selected={selected}
              onPress={() => selectScore(score)}
            >
              <AppIcon
                color={
                  selected
                    ? APP_STYLE_COLORS.status.warningAccent
                    : APP_STYLE_COLORS.text.placeholder
                }
                name='star'
                size={24}
              />
              <Text className='order-scene-survey__score-value'>{score}</Text>
            </AppPressable>
          )
        })}
      </View>

      {draft.score !== null ? (
        <Text className='order-scene-survey__score-title'>
          {ORDER_SCENE_SURVEY_SCORE_TITLES[draft.score]}
        </Text>
      ) : null}

      {labels.length ? (
        <View className='order-scene-survey__chips'>
          {labels.map(label => {
            const selected = draft.selectedLabelIds.includes(label.id)

            return (
              <AppPressable
                accessibilityLabel={label.name}
                className={
                  selected
                    ? 'order-scene-survey__chip order-scene-survey__chip--selected'
                    : 'order-scene-survey__chip'
                }
                disabled={props.submitting}
                key={label.id}
                selected={selected}
                onPress={() => toggleLabel(label.id)}
              >
                <Text
                  className={
                    selected
                      ? 'order-scene-survey__chip-text order-scene-survey__chip-text--selected'
                      : 'order-scene-survey__chip-text'
                  }
                >
                  {label.name}
                </Text>
              </AppPressable>
            )
          })}
        </View>
      ) : null}

      <View className='order-scene-survey__field-head'>
        <Text className='order-scene-survey__field-title'>更多想说的</Text>
        <Text className='order-scene-survey__field-count'>
          {draft.content.length}/{ORDER_SCENE_SURVEY_CONTENT_MAX_LENGTH}
        </Text>
      </View>
      <Textarea
        className='order-scene-survey__textarea'
        disabled={props.submitting}
        maxlength={ORDER_SCENE_SURVEY_CONTENT_MAX_LENGTH}
        placeholder='输入补充说明'
        value={draft.content}
        onInput={event =>
          setDraft(current => ({
            ...current,
            content: event.detail.value
          }))
        }
      />
      <Text className='order-scene-survey__validation'>
        {validation || '评价将以匿名方式提交'}
      </Text>
      <AppButton
        disabled={Boolean(validation)}
        label='匿名提交'
        loading={props.submitting}
        loadingLabel='正在提交'
        onPress={() => props.onSubmit(draft)}
      />
    </View>
  )
}
