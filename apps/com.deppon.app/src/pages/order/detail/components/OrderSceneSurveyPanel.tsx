import { Text, View } from '@tarojs/components'

import { OrderNpsSurveyForm } from './OrderNpsSurveyForm'
import { OrderSceneScoreForm } from './OrderSceneScoreForm'
import {
  AppButton,
  AppDialog,
  AppPressable
} from '../../../../shared/components'

import type {
  OrderSceneSurveyItem,
  OrderSceneSurveySubmitInput
} from '../../../../services/order'

import './OrderSceneSurveyPanel.scss'

function OrderSceneLabelForm(props: {
  item: OrderSceneSurveyItem
  submitting: boolean
  onSubmit: (input: OrderSceneSurveySubmitInput) => void
}) {
  return (
    <View className='order-scene-survey__label-options'>
      {props.item.labels.map(label => (
        <AppPressable
          accessibilityLabel={label.name}
          className='order-scene-survey__label-option'
          disabled={props.submitting}
          key={label.id}
          onPress={() =>
            props.onSubmit({
              kind: 'LABEL',
              labelId: label.id
            })
          }
        >
          <Text className='order-scene-survey__label-option-text'>
            {label.name}
          </Text>
        </AppPressable>
      ))}
    </View>
  )
}

export function OrderSceneSurveyPanel(props: {
  activeItem: OrderSceneSurveyItem | null
  completed: boolean
  failedCount: number
  position: number
  submitting: boolean
  total: number
  visible: boolean
  onClose: () => void
  onSubmit: (input: OrderSceneSurveySubmitInput) => void
}) {
  if (!props.visible || (!props.activeItem && !props.completed)) {
    return null
  }

  const progress = props.total > 1
    ? `第 ${props.position} 项，共 ${props.total} 项`
    : '匿名问卷'
  const unavailableHint = props.failedCount > 0
    ? `，另有 ${props.failedCount} 项暂未加载`
    : ''
  const description = props.completed
    ? `本次可填写的问卷已经完成${unavailableHint}`
    : `${progress}${unavailableHint}`

  return (
    <AppDialog
      closeOnBackdropPress={!props.submitting}
      contentSpacing={false}
      description={description}
      panelClassName='order-scene-survey'
      placement='bottom'
      title={props.completed ? '感谢您的反馈' : '服务体验反馈'}
      visible
      onClose={props.onClose}
    >
      {props.completed ? (
        <View className='order-scene-survey__completed'>
          <Text className='order-scene-survey__completed-title'>提交成功</Text>
          <Text className='order-scene-survey__completed-summary'>
            您的意见将帮助我们持续改善服务。
          </Text>
          <AppButton label='关闭' onPress={props.onClose} />
        </View>
      ) : props.activeItem ? (
        <View className='order-scene-survey__body'>
          <Text className='order-scene-survey__question'>
            {props.activeItem.title}
          </Text>
          {props.activeItem.kind === 'SCORE' ? (
            <OrderSceneScoreForm
              item={props.activeItem}
              key={props.activeItem.key}
              submitting={props.submitting}
              onSubmit={draft =>
                props.onSubmit({
                  kind: 'SCORE',
                  ...draft
                })
              }
            />
          ) : props.activeItem.kind === 'LABEL' ? (
            <OrderSceneLabelForm
              item={props.activeItem}
              submitting={props.submitting}
              onSubmit={props.onSubmit}
            />
          ) : (
            <OrderNpsSurveyForm
              key={props.activeItem.key}
              submitting={props.submitting}
              onSubmit={draft =>
                props.onSubmit({
                  kind: 'NPS',
                  draft
                })
              }
            />
          )}
        </View>
      ) : null}
    </AppDialog>
  )
}
