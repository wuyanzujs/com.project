import { Input, Text, Textarea, View } from '@tarojs/components'

import { getBatchContactKey } from '../../../services/batch'
import { AppPressable } from '../../../shared/components'

import type {
  BatchAddressRecognitionResult,
  BatchConsigneeDraft,
  BatchContact,
  BatchDraft,
  BatchGoodsDraft
} from '../../../services/batch'

import './BatchSections.scss'

interface BatchSenderSectionProps {
  sender: BatchContact | null
  onSelect: () => void
}

interface BatchRecognitionSectionProps {
  recognition: BatchAddressRecognitionResult
  text: string
  onAdd: () => void
  onTextChange: (value: string) => void
}

interface BatchConsigneeSectionProps {
  consignees: BatchConsigneeDraft[]
  maxCount: number
  onGoodsChange: (index: number, patch: Partial<BatchGoodsDraft>) => void
  onRemove: (index: number) => void
}

interface BatchSettingsSectionProps {
  needContact: BatchDraft['needContact']
  pickup: BatchDraft['pickup']
  onDispatchChange: (value: BatchDraft['pickup']['dispatch']) => void
  onNeedContactChange: (value: BatchDraft['needContact']) => void
}

interface BatchFooterProps {
  count: number
  quoteLoading: boolean
  submitting: boolean
  onQuote: () => void
  onSubmit: () => void
}

export function BatchSenderSection({
  sender,
  onSelect
}: BatchSenderSectionProps) {
  return (
    <View className='batch-section'>
      <View className='batch-section__head'>
        <Text className='batch-section__title'>发货人</Text>
        <Text className='batch-section__hint'>地址簿</Text>
      </View>
      {sender ? (
        <View className='batch-sender'>
          <View className='batch-sender__content'>
            <Text className='batch-sender__name'>
              {sender.name} {sender.mobile}
            </Text>
            <Text className='batch-sender__address'>
              {sender.province} {sender.city} {sender.county} {sender.address}
            </Text>
          </View>
          <AppPressable
            contentElement='text'
            className='batch-inline-action'
            onPress={onSelect}
          >
            更换
          </AppPressable>
        </View>
      ) : (
        <AppPressable
          className='batch-sender batch-sender--empty'
          onPress={onSelect}
        >
          <Text className='batch-sender__empty-text'>选择发货人地址</Text>
          <Text className='batch-inline-action'>去选择</Text>
        </AppPressable>
      )}
    </View>
  )
}

export function BatchRecognitionSection({
  recognition,
  text,
  onAdd,
  onTextChange
}: BatchRecognitionSectionProps) {
  return (
    <View className='batch-section'>
      <View className='batch-section__head'>
        <Text className='batch-section__title'>批量识别</Text>
        <Text className='batch-section__hint'>
          可用 {recognition.acceptedCount} 条
        </Text>
      </View>
      <Textarea
        className='batch-recognition__input'
        maxlength={2000}
        placeholder={'每行一票，例如：\n李四 13900139000 广东省 深圳市 南山区 科技园科苑路200号 文件'}
        value={text}
        onInput={event => onTextChange(event.detail.value)}
      />
      <View className='batch-recognition__summary'>
        <Text className='batch-recognition__summary-text'>
          共 {recognition.totalLines} 行，可用 {recognition.acceptedCount} 行，异常{' '}
          {recognition.rejectedCount}
          {recognition.ignoredCount
            ? `，超出上限忽略 ${recognition.ignoredCount} 行`
            : ''}
        </Text>
      </View>
      <AppPressable
        className={
          recognition.acceptedCount
            ? 'batch-recognition__carry'
            : 'batch-recognition__carry batch-recognition__carry--disabled'
        }
        onPress={onAdd}
      >
        <Text
          className={
            recognition.acceptedCount
              ? 'batch-recognition__carry-text'
              : 'batch-recognition__carry-text batch-recognition__carry-text--disabled'
          }
        >
          加入批量清单
        </Text>
      </AppPressable>
      {recognition.items.map(item => (
        <View
          className={
            item.status === 'ready'
              ? 'batch-recognized'
              : 'batch-recognized batch-recognized--error'
          }
          key={`${item.lineNumber}-${item.rawText}`}
        >
          <View className='batch-recognized__head'>
            <Text className='batch-recognized__title'>
              第 {item.lineNumber} 行
            </Text>
            <Text
              className={
                item.status === 'ready'
                  ? 'batch-recognized__status'
                  : 'batch-recognized__status batch-recognized__status--error'
              }
            >
              {item.message}
            </Text>
          </View>
          <Text className='batch-recognized__text'>
            {item.contact
              ? `${item.contact.name} ${item.contact.mobile} ${item.goodsName}`
              : item.rawText}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function BatchConsigneeSection({
  consignees,
  maxCount,
  onGoodsChange,
  onRemove
}: BatchConsigneeSectionProps) {
  return (
    <View className='batch-section'>
      <View className='batch-section__head'>
        <Text className='batch-section__title'>收货清单</Text>
        <Text className='batch-section__hint'>
          {consignees.length}/{maxCount} 票
        </Text>
      </View>
      {consignees.map((item, index) => (
        <View
          className='batch-consignee'
          key={`${getBatchContactKey(item)}-${index}`}
        >
          <View className='batch-consignee__head'>
            <Text className='batch-consignee__title'>
              {index + 1}. {item.contact?.name || '未选择收货人'}
            </Text>
            <AppPressable
              contentElement='text'
              className='batch-inline-action batch-inline-action--danger'
              onPress={() => onRemove(index)}
            >
              移除
            </AppPressable>
          </View>
          <Text className='batch-consignee__address'>
            {item.contact?.mobile} {item.contact?.province} {item.contact?.city}{' '}
            {item.contact?.county} {item.contact?.address}
          </Text>
          <View className='batch-consignee__quote'>
            <Text className='batch-consignee__quote-name'>
              {item.productName || '尚未获取产品价格'}
            </Text>
            <Text className='batch-consignee__quote-fee'>
              {item.estimatedFee === null ? '--' : `¥${item.estimatedFee}`}
            </Text>
          </View>
          <Input
            className='batch-consignee__input'
            placeholder='货物名称'
            value={item.goods.name}
            onInput={event =>
              onGoodsChange(index, { name: event.detail.value })
            }
          />
          <View className='batch-consignee__metrics'>
            <Input
              className='batch-consignee__metric'
              type='number'
              placeholder='件数'
              value={String(item.goods.count)}
              onInput={event =>
                onGoodsChange(index, { count: Number(event.detail.value) })
              }
            />
            <Input
              className='batch-consignee__metric batch-consignee__metric--last'
              type='number'
              placeholder='重量(kg)'
              value={String(item.goods.weight)}
              onInput={event =>
                onGoodsChange(index, { weight: Number(event.detail.value) })
              }
            />
          </View>
        </View>
      ))}
      {!consignees.length && (
        <Text className='batch-recognition__empty'>
          先通过上方批量识别添加收货人，再确认每票货物信息。
        </Text>
      )}
    </View>
  )
}

export function BatchSettingsSection({
  needContact,
  pickup,
  onDispatchChange,
  onNeedContactChange
}: BatchSettingsSectionProps) {
  return (
    <View className='batch-section'>
      <View className='batch-section__head'>
        <Text className='batch-section__title'>寄件设置</Text>
      </View>
      <View className='batch-setting'>
        <Text className='batch-setting__label'>取件方式</Text>
        <View className='batch-setting__options'>
          <AppPressable
            className='batch-setting__option'
            selected={pickup.dispatch === 'Y'}
            onPress={() => onDispatchChange('Y')}
          >
            <Text className='batch-setting__option-text'>上门取件</Text>
          </AppPressable>
          <AppPressable
            className='batch-setting__option'
            selected={pickup.dispatch === 'N'}
            onPress={() => onDispatchChange('N')}
          >
            <Text className='batch-setting__option-text'>自行送达</Text>
          </AppPressable>
        </View>
      </View>
      <View className='batch-setting'>
        <Text className='batch-setting__label'>联系快递员</Text>
        <View className='batch-setting__options'>
          <AppPressable
            className='batch-setting__option'
            selected={needContact === 'Y'}
            onPress={() => onNeedContactChange('Y')}
          >
            <Text className='batch-setting__option-text'>需要联系</Text>
          </AppPressable>
          <AppPressable
            className='batch-setting__option'
            selected={needContact === 'N'}
            onPress={() => onNeedContactChange('N')}
          >
            <Text className='batch-setting__option-text'>无需联系</Text>
          </AppPressable>
        </View>
      </View>
    </View>
  )
}

export function BatchFooter({
  count,
  quoteLoading,
  submitting,
  onQuote,
  onSubmit
}: BatchFooterProps) {
  return (
    <View className='batch-footer'>
      <View className='batch-footer__summary'>
        <Text className='batch-footer__count'>{count} 票</Text>
        <Text className='batch-footer__hint'>提交前请确认每票货物信息</Text>
      </View>
      <View className='batch-footer__actions'>
        <AppPressable
          accessibilityLabel='获取批量价格'
          className='batch-footer__quote'
          disabled={quoteLoading || submitting}
          onPress={onQuote}
        >
          <Text className='batch-footer__quote-text'>
            {quoteLoading ? '计价中...' : '获取价格'}
          </Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel='提交批量订单'
          className='batch-footer__submit'
          disabled={quoteLoading || submitting}
          onPress={onSubmit}
        >
          <Text className='batch-footer__submit-text'>
            {submitting ? '提交中...' : '提交订单'}
          </Text>
        </AppPressable>
      </View>
    </View>
  )
}
