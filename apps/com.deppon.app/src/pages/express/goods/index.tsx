import { Input, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useMemo, useRef, useState } from 'react'

import { createExpressDraft, expressDraftStorage, expressGoodsBridge } from '@/services/express'
import type { ExpressGoods } from '@/services/express'
import { EXPRESS_GOODS_LIMITS, resolveExpressGoodsInput } from '@/services/express/goodsEditor.rules'
import { expressGoodsHistory } from '@/services/express/goodsHistory'
import { goodsQueryService } from '@/services/goods'
import { AppPage, AppPressable, AppSwitch } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { getNativeCapabilityErrorMessage, shareWithApp } from '@/shared/platform'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ExpressNavBar } from '../components/ExpressNavBar'
import { GoodsMediaUploader } from './components/GoodsMediaUploader'
import { GoodsStepper } from './components/GoodsStepper'
import { useGoodsNameSuggestions } from './hooks/useGoodsNameSuggestions'

import './index.scss'
import './content.scss'

const WEIGHT_MIN = EXPRESS_GOODS_LIMITS.minWeight
const WEIGHT_MAX = EXPRESS_GOODS_LIMITS.maxWeight
const WEIGHT_STEP = 1
const COUNT_MIN = EXPRESS_GOODS_LIMITS.minCount
const COUNT_MAX = EXPRESS_GOODS_LIMITS.maxCount
// 「给快递员捎话」计数为 0/100。
const REMARK_MAX_LENGTH = 100

const ExpressGoodsPage = () => {
  const initialDraft = useMemo(() => expressDraftStorage.restore(), [])
  const initialGoods = useMemo<ExpressGoods>(() => initialDraft?.goods ?? createExpressDraft().goods, [initialDraft])
  const [name, setName] = useState(initialGoods.name)
  const [nameSelected, setNameSelected] = useState(Boolean(initialGoods.name.trim()))
  const [history, setHistory] = useState(() => expressGoodsHistory.get())
  // 「给快递员捎话」在货物信息页维护，最多 100 字；这里与寄件页共用 draft.remark。
  const [remark, setRemark] = useState(initialDraft?.remark ?? '')
  const [weightText, setWeightText] = useState(String(initialGoods.weight > 0 ? initialGoods.weight : WEIGHT_MIN))
  const [countText, setCountText] = useState(String(initialGoods.count >= COUNT_MIN ? initialGoods.count : COUNT_MIN))
  const [volumeOn, setVolumeOn] = useState(initialGoods.volume > 0)
  const [volumeText, setVolumeText] = useState(initialGoods.volume > 0 ? String(initialGoods.volume) : '')
  const hotGoods = useMemo(() => goodsQueryService.getHotGoods(), [])
  const nameSuggestion = useGoodsNameSuggestions()
  const confirming = useRef(false)

  const handleSelectName = (nextName: string) => {
    setName(nextName)
    setNameSelected(true)
    nameSuggestion.clearSuggestions()
  }

  const handleClearHistory = async () => {
    if (await expressGoodsHistory.clear()) {
      setHistory([])
    } else {
      Taro.showToast({ title: '清空失败，请稍后重试', icon: 'none' })
    }
  }

  // 语音录入尚未接入 shared/platform，使用统一降级提示。
  const handleVoiceInput = () => {
    Taro.showToast({ title: '语音录入待接入，请先手动填写', icon: 'none' })
  }

  // 输入框右侧为图片识别入口，同样先给统一降级提示。
  const handleImageInput = () => {
    Taro.showToast({ title: '图片识别待接入，请先手动填写', icon: 'none' })
  }

  const handleShare = () => {
    shareWithApp({
      source: 'EXPRESS_GOODS',
      title: '德邦快递寄件',
      description: '在线寄快递，1小时上门取件'
    }).catch(error => {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    })
  }

  const handleConfirm = async () => {
    if (confirming.current) {
      return
    }

    const result = resolveExpressGoodsInput(initialGoods, {
      name,
      weight: weightText,
      count: countText,
      volume: volumeText,
      volumeEnabled: volumeOn
    })

    if (!result.goods) {
      Taro.showToast({ title: result.message, icon: 'none' })
      return
    }

    // 确认后回传货物并返回寄件页，由寄件页重算价格时效。
    confirming.current = true

    try {
      await expressGoodsHistory.save(result.goods.name)
      expressGoodsBridge.save(result.goods, remark.trim())
      await Taro.navigateBack()
    } finally {
      confirming.current = false
    }
  }

  return (
    <AppPage
      footer={
        <View className='express-goods-footer'>
          <AppPressable
            accessibilityLabel='语音录入货物信息'
            className='express-goods-footer__button express-goods-footer__button--voice'
            onPress={handleVoiceInput}
          >
            <AppIcon color={APP_STYLE_COLORS.text.ink} name='microphone' size={40} />
            <Text className='express-goods-footer__text express-goods-footer__text--voice'>语音填写</Text>
          </AppPressable>
          <AppPressable
            accessibilityLabel='确认货物信息'
            className='express-goods-footer__button express-goods-footer__button--confirm'
            onPress={handleConfirm}
          >
            <Text className='express-goods-footer__text'>确定</Text>
          </AppPressable>
        </View>
      }
      header={<ExpressNavBar title='货物信息' onShare={handleShare} />}
      keyboardAvoiding
      safeArea='both'
      statusBar='dark'
      surface='page'
    >
      <ScrollView className='express-goods-scroll' scrollY style={{ flex: 1 }}>
        <View className='express-goods-card'>
          <View className='express-goods-card__head'>
            <Text className='express-goods-card__title'>物品名称</Text>
            <Text className='express-goods-card__hint'>必填</Text>
            <AppPressable accessibilityLabel='违禁品查询' className='express-goods-check' onPress={() => navigateToAppRoute(APP_ROUTES.goodsQuery)}>
              <Text className='express-goods-check__text'>违禁品查询 ›</Text>
            </AppPressable>
          </View>
          {nameSelected ? (
            <View className='express-goods-name-pill'>
              <Text className='express-goods-name-pill__text'>{name}</Text>
              <AppPressable
                accessibilityLabel='清除物品名称'
                className='express-goods-name-pill__clear'
                onPress={() => {
                  setName('')
                  setNameSelected(false)
                  nameSuggestion.clearSuggestions()
                }}
              >
                <Text className='express-goods-name-pill__clear-text'>×</Text>
              </AppPressable>
            </View>
          ) : (
            <>
              <View className='express-goods-input-row'>
                <AppIcon color={APP_STYLE_COLORS.text.placeholder} name='search' size={34} />
                <Input
                  className='express-goods-input-row__field'
                  placeholder='请输入物品名称'
                  value={name}
                  onBlur={event => setName(event.detail.value)}
                  onInput={event => {
                    setName(event.detail.value)
                    nameSuggestion.handleNameInput(event.detail.value)
                  }}
                />
                <AppPressable accessibilityLabel='图片识别物品名称' className='express-goods-input-row__camera' onPress={handleImageInput}>
                  <AppIcon color={APP_STYLE_COLORS.text.faint} name='camera' size={38} />
                </AppPressable>
              </View>
              {nameSuggestion.suggestions.length > 0 && (
                <View className='express-goods-suggestions'>
                  {nameSuggestion.suggestions.map((item, index) => (
                    <AppPressable
                      accessibilityLabel={`选择品名${item.productKeyWord}`}
                      className='express-goods-suggestion'
                      key={`${item.productKeyWord}-${item.secondCategory}-${index}`}
                      onPress={() => handleSelectName(item.productKeyWord)}
                    >
                      <Text className='express-goods-suggestion__name'>{item.productKeyWord}</Text>
                      <Text className='express-goods-suggestion__desc'>
                        {[item.firstCategory, item.secondCategory].filter(Boolean).join(' / ') || '常用品名'}
                      </Text>
                    </AppPressable>
                  ))}
                </View>
              )}
              {(nameSuggestion.loading || nameSuggestion.message) && (
                <Text className='express-goods-message'>{nameSuggestion.loading ? '推荐查询中' : nameSuggestion.message}</Text>
              )}
              {!name.trim() && history.length > 0 ? (
                <>
                  <View className='express-goods-card__head'>
                    <Text className='express-goods-card__title'>最近使用</Text>
                    <AppPressable accessibilityLabel='清空最近使用的物品名称' className='express-goods-check' onPress={handleClearHistory}>
                      <Text className='express-goods-check__text'>清空</Text>
                    </AppPressable>
                  </View>
                  <View className='express-goods-chips'>
                    {history.map(item => (
                      <AppPressable accessibilityLabel={`最近使用${item}`} className='express-goods-chip' key={item} onPress={() => handleSelectName(item)}>
                        <Text className='express-goods-chip__text'>{item}</Text>
                      </AppPressable>
                    ))}
                  </View>
                </>
              ) : null}
              <Text className='express-goods-subtitle'>热门寄件</Text>
              <View className='express-goods-chips'>
                {hotGoods.map(item => (
                  <AppPressable
                    accessibilityLabel={`热门品名${item.name}`}
                    className='express-goods-chip'
                    key={item.name}
                    onPress={() => handleSelectName(item.name)}
                  >
                    <Text className='express-goods-chip__text'>{item.name}</Text>
                  </AppPressable>
                ))}
              </View>
            </>
          )}
        </View>

        <View className='express-goods-card'>
          <View className='express-goods-notice'>
            <Text className='express-goods-notice__text'>填写重量/体积计费更准确</Text>
          </View>
          <View className='express-goods-card__head express-goods-card__head--stepper'>
            <Text className='express-goods-card__title'>总重量</Text>
            <GoodsStepper max={WEIGHT_MAX} min={WEIGHT_MIN} step={WEIGHT_STEP} unit='kg' value={weightText} onChange={setWeightText} />
          </View>

          <View className='express-goods-card__head express-goods-card__head--field'>
            <Text className='express-goods-card__title'>总体积</Text>
            {/* RN 样式不支持后代选择器，使用包裹层设置开关左间距。 */}
            <View className='express-goods-card__switch'>
              <AppSwitch accessibilityLabel='是否填写体积' checked={volumeOn} onChange={setVolumeOn} />
            </View>
            <Text className='express-goods-card__switch-hint'>
              添加货物较大时，补充
              <Text className='express-goods-card__switch-hint-accent'>体积</Text>
              预估费用更准确
            </Text>
          </View>
          {volumeOn ? (
            <Input
              className='express-goods-input'
              placeholder='选填，如 0.02'
              type='digit'
              value={volumeText}
              onInput={event => setVolumeText(event.detail.value)}
            />
          ) : null}

          <View className='express-goods-card__head express-goods-card__head--field express-goods-card__head--stepper'>
            <Text className='express-goods-card__title'>货物件数</Text>
            <GoodsStepper max={COUNT_MAX} min={COUNT_MIN} step={1} unit='件' value={countText} onChange={setCountText} />
          </View>

          <View className='express-goods-info'>
            <Text className='express-goods-info__text'>
              包裹体积较大但重量较轻时（如行李包裹等），会根据包裹外箱尺寸换算为计费重量。实际重量以快递员包装后测量为准。
              <Text className='express-goods-info__link'>了解计费规则 ›</Text>
            </Text>
          </View>
        </View>

        <View className='express-goods-card'>
          <View className='express-goods-card__head'>
            <Text className='express-goods-card__title'>给快递员捎话</Text>
            <Text className='express-goods-card__link'>纸箱、缓冲物等需额外收费 ›</Text>
          </View>
          <View className='express-goods-media-row'>
            <View className='express-goods-remark'>
              <Textarea
                className='express-goods-remark__input'
                maxlength={REMARK_MAX_LENGTH}
                placeholder='其他需求可以留言告诉快递小哥哦~'
                value={remark}
                onInput={event => setRemark(event.detail.value)}
              />
              <Text className='express-goods-remark__counter'>{`${remark.length}/${REMARK_MAX_LENGTH}`}</Text>
            </View>
            <GoodsMediaUploader />
          </View>
        </View>
      </ScrollView>
    </AppPage>
  )
}

export default ExpressGoodsPage
