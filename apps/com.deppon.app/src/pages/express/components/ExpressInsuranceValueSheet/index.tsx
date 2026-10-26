import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useEffect, useState } from 'react'

import { expressRealPriceHistory } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { AppLinearGradient, AppNativeModalSheet, AppNativePressable } from '@/shared/native'
import { dialPhone } from '@/shared/platform'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

const INSURANCE_SERVICE_PHONE = '95353'

interface ExpressInsuranceValueSheetProps {
  visible: boolean
  /** 正在编辑的档位名（全额保/基础保等），仅用于无障碍标签。 */
  tierTitle: string
  /** 保价金额上限，超过时引导拨打 95353。 */
  limit: number
  /** 已填保价金额，重新打开时回显。 */
  initialAmount: number
  /** 当前是否已保价：未保价时展示风险提醒与「不保价」出口。 */
  insured: boolean
  onClose: () => void
  onConfirm: (amount: number) => void
  onDecline: () => void
}

function readPriceHistory() {
  return expressRealPriceHistory.get()
} /**
 * @description 物品价值编辑弹层：保价金额录入，含历史金额与未保价风险提醒。
 */
export function ExpressInsuranceValueSheet({
  initialAmount,
  insured,
  limit,
  onClose,
  onConfirm,
  onDecline,
  tierTitle,
  visible
}: ExpressInsuranceValueSheetProps) {
  const [price, setPrice] = useState('')
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    if (visible) {
      setPrice(initialAmount > 0 ? String(initialAmount) : '')
      setHistory(readPriceHistory())
    }
  }, [initialAmount, visible])

  const handleOpenRules = () => {
    Taro.showModal({
      title: '重要风险提醒',
      content:
        '您已知悉本次寄递的物品价值较高，为更好保障您的权益，建议选择保价服务。如您不选择保价服务，物品在寄递过程中发生损坏或遗失，我们将按照最高3倍运费向您赔偿，详见《电子运单服务协议》。',
      confirmText: '本人已知悉',
      showCancel: false
    })
  }

  const handleConfirm = async () => {
    const value = Number.parseInt(price, 10)

    if (!value) {
      Taro.showToast({ title: '建议您如实填写物品价值', icon: 'none' })
      return
    }

    if (value > limit) {
      const modal = await Taro.showModal({
        title: '保价金额超限',
        content: `实际货物价值上限为${limit}元，若实际货物价值大于${limit}元，请拨打${INSURANCE_SERVICE_PHONE}`,
        confirmText: '联系德邦',
        cancelText: '取消'
      })

      if (modal.confirm) {
        dialPhone(INSURANCE_SERVICE_PHONE).catch(() => {})
      }

      return
    }

    await expressRealPriceHistory.save(value)
    setHistory(readPriceHistory())
    onConfirm(value)
  }

  return (
    <AppNativeModalSheet accessibilityLabel={`关闭${tierTitle}物品价值弹窗`} visible={visible} onRequestClose={onClose}>
      <View className='express-insurance-sheet'>
        <View className='express-insurance-sheet__header'>
          <Text className='express-insurance-sheet__title'>物品价值</Text>
          <View className='express-insurance-sheet__required'>
            <Text className='express-insurance-sheet__required-text'>必填</Text>
          </View>
          <AppNativePressable accessibilityLabel='关闭物品价值弹窗' onPress={onClose}>
            <View className='express-insurance-sheet__close'>
              <AppIcon color={APP_STYLE_COLORS.text.subdued} name='close' size={36} strokeWidth={2} />
            </View>
          </AppNativePressable>
        </View>

        <ScrollView className='express-insurance-sheet__scroll' scrollY>
          <View className='express-insurance-sheet__body'>
            <Text className='express-insurance-sheet__notice'>
              根据国家《快递暂行条例》：寄件人交寄贵重物品应当事先声明。请您如实填写物品价值，并根据物品价值足额保价。物品价值超过上限请联系95353。温馨提示：勿按陌生人指示寄递银行卡/信用卡、身份证、黄金首饰等，谨防诈骗。
            </Text>

            <View className='express-insurance-sheet__field'>
              <Text className='express-insurance-sheet__currency'>¥</Text>
              <Input
                className='express-insurance-sheet__input'
                maxlength={10}
                placeholder='请输入物品价值'
                placeholderClass='express-insurance-sheet__placeholder'
                type='number'
                value={price}
                onBlur={event => setPrice(event.detail.value.replace(/\s/g, ''))}
                onInput={event => setPrice(event.detail.value)}
              />
              {price ? (
                <AppNativePressable accessibilityLabel='清空物品价值' onPress={() => setPrice('')}>
                  <View className='express-insurance-sheet__clear'>
                    <AppIcon color={APP_STYLE_COLORS.text.inverse} name='close' size={22} strokeWidth={2.5} />
                  </View>
                </AppNativePressable>
              ) : null}
            </View>

            {history.length > 0 ? (
              <View className='express-insurance-sheet__history'>
                <Text className='express-insurance-sheet__history-title'>最近使用</Text>
                <View className='express-insurance-sheet__history-list'>
                  {history.map(item => (
                    <AppNativePressable accessibilityLabel={`使用历史金额${item}元`} key={item} onPress={() => setPrice(item)}>
                      <View className='express-insurance-sheet__history-item'>
                        <Text className='express-insurance-sheet__history-item-text'>{item}元</Text>
                      </View>
                    </AppNativePressable>
                  ))}
                </View>
              </View>
            ) : null}

            {!insured ? (
              <View className='express-insurance-sheet__risk'>
                <View className='express-insurance-sheet__risk-head'>
                  <Text className='express-insurance-sheet__risk-title'>风险提醒</Text>
                </View>
                <Text className='express-insurance-sheet__risk-text'>
                  贵重物品建议保价以保障权益。如不保价，请务必查看《重要风险提醒》，知悉贵重物品不保价，丢失或损坏最高按照3倍运费赔偿。
                </Text>
                <AppPressable accessibilityLabel='查看重要风险提醒' block className='express-insurance-sheet__risk-entry' onPress={handleOpenRules}>
                  <Text className='express-insurance-sheet__risk-link'>查看《重要风险提醒》</Text>
                </AppPressable>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View className='express-insurance-sheet__footer'>
          {!insured ? (
            <AppPressable
              accessibilityLabel='知悉风险不保价'
              className='express-insurance-sheet__button express-insurance-sheet__button--ghost'
              compact
              contentElement='view'
              onPress={onDecline}
            >
              <Text className='express-insurance-sheet__button-text express-insurance-sheet__button-text--ghost'>知悉风险，不保价</Text>
            </AppPressable>
          ) : null}
          <AppPressable
            accessibilityLabel={insured ? '确定物品价值' : '确认保价'}
            className='express-insurance-sheet__button express-insurance-sheet__button--primary'
            compact
            contentElement='view'
            onPress={handleConfirm}
          >
            <AppLinearGradient
              className='express-insurance-sheet__gradient'
              colors={[APP_STYLE_COLORS.brand.gradientStart, APP_STYLE_COLORS.brand.gradientEnd]}
            />
            <Text className='express-insurance-sheet__button-text express-insurance-sheet__button-text--primary'>{insured ? '确定' : '保价'}</Text>
          </AppPressable>
        </View>
      </View>
    </AppNativeModalSheet>
  )
}
