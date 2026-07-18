import { Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useMemo, useState } from 'react'

import {
  ORDER_NPS_CONTENT_MAX_LENGTH,
  ORDER_NPS_SCORE_VALUES,
  createOrderNpsDraft,
  getOrderNpsCatalog,
  toggleOrderNpsReason,
  updateOrderNpsCategory,
  updateOrderNpsContent,
  updateOrderNpsScore
} from '../../../../services/order'
import {
  AppButton,
  AppPressable
} from '../../../../shared/components'

import type { OrderNpsDraft } from '../../../../services/order'

import './OrderSceneSurveyForm.scss'

export function OrderNpsSurveyForm(props: {
  submitting: boolean
  onSubmit: (draft: OrderNpsDraft) => void
}) {
  const [draft, setDraft] = useState(() => createOrderNpsDraft())
  const catalog = useMemo(
    () => getOrderNpsCatalog(draft.score),
    [draft.score]
  )
  const category = catalog?.options.find(
    option => option.text === draft.category
  )

  const toggleReason = (reason: string) => {
    setDraft(current => {
      const next = toggleOrderNpsReason(current, reason)

      if (next === current && !current.reasons.includes(reason) && category) {
        Taro.showToast({
          title: `最多选择${category.maxSelections}项`,
          icon: 'none'
        })
      }

      return next
    })
  }

  return (
    <View className='order-scene-survey__form'>
      <View className='order-scene-survey__nps-scale-head'>
        <Text>非常不愿意</Text>
        <Text>非常愿意</Text>
      </View>
      <View className='order-scene-survey__nps-scores'>
        {ORDER_NPS_SCORE_VALUES.map(score => {
          const selected = draft.score === score

          return (
            <AppPressable
              accessibilityLabel={`推荐评分 ${score}`}
              className={
                selected
                  ? 'order-scene-survey__nps-score order-scene-survey__nps-score--selected'
                  : 'order-scene-survey__nps-score'
              }
              disabled={props.submitting}
              key={score}
              selected={selected}
              onPress={() =>
                setDraft(current => updateOrderNpsScore(current, score))
              }
            >
              <Text
                className={
                  selected
                    ? 'order-scene-survey__nps-score-text order-scene-survey__nps-score-text--selected'
                    : 'order-scene-survey__nps-score-text'
                }
              >
                {score}
              </Text>
            </AppPressable>
          )
        })}
      </View>

      {catalog ? (
        <>
          <Text className='order-scene-survey__subquestion'>
            {catalog.title}
          </Text>
          <View className='order-scene-survey__chips'>
            {catalog.options.map(option => {
              const selected = draft.category === option.text

              return (
                <AppPressable
                  accessibilityLabel={option.text}
                  className={
                    selected
                      ? 'order-scene-survey__chip order-scene-survey__chip--selected'
                      : 'order-scene-survey__chip'
                  }
                  disabled={props.submitting}
                  key={option.text}
                  selected={selected}
                  onPress={() =>
                    setDraft(current =>
                      updateOrderNpsCategory(current, option.text)
                    )
                  }
                >
                  <Text
                    className={
                      selected
                        ? 'order-scene-survey__chip-text order-scene-survey__chip-text--selected'
                        : 'order-scene-survey__chip-text'
                    }
                  >
                    {option.text}
                  </Text>
                </AppPressable>
              )
            })}
          </View>
        </>
      ) : null}

      {category ? (
        <>
          <Text className='order-scene-survey__subquestion'>
            {category.title}
          </Text>
          <View className='order-scene-survey__chips'>
            {category.options.map(reason => {
              const selected = draft.reasons.includes(reason)

              return (
                <AppPressable
                  accessibilityLabel={reason}
                  className={
                    selected
                      ? 'order-scene-survey__chip order-scene-survey__chip--selected'
                      : 'order-scene-survey__chip'
                  }
                  disabled={props.submitting}
                  key={reason}
                  selected={selected}
                  onPress={() => toggleReason(reason)}
                >
                  <Text
                    className={
                      selected
                        ? 'order-scene-survey__chip-text order-scene-survey__chip-text--selected'
                        : 'order-scene-survey__chip-text'
                    }
                  >
                    {reason}
                  </Text>
                </AppPressable>
              )
            })}
          </View>
        </>
      ) : null}

      <View className='order-scene-survey__field-head'>
        <Text className='order-scene-survey__field-title'>更多想说的</Text>
        <Text className='order-scene-survey__field-count'>
          {draft.content.length}/{ORDER_NPS_CONTENT_MAX_LENGTH}
        </Text>
      </View>
      <Textarea
        className='order-scene-survey__textarea'
        disabled={props.submitting}
        maxlength={ORDER_NPS_CONTENT_MAX_LENGTH}
        placeholder='输入补充说明'
        value={draft.content}
        onInput={event =>
          setDraft(current =>
            updateOrderNpsContent(current, event.detail.value)
          )
        }
      />
      <AppButton
        disabled={draft.score === null}
        label='匿名提交'
        loading={props.submitting}
        loadingLabel='正在提交'
        onPress={() => props.onSubmit(draft)}
      />
    </View>
  )
}
