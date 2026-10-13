import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useMemo, useState } from 'react'

import {
  createExpressDraft,
  expressDraftStorage,
  expressGoodsBridge
} from '@/services/express'
import type { ExpressGoods } from '@/services/express'
import { goodsQueryService } from '@/services/goods'
import { AppPage, AppPressable, AppSwitch } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'

import { ExpressNavBar } from '../components/ExpressNavBar'
import { useGoodsNameSuggestions } from './hooks/useGoodsNameSuggestions'

import './index.scss'
import './content.scss'

const WEIGHT_MIN = 1
const WEIGHT_MAX = 10000
const WEIGHT_STEP = 1
const COUNT_MIN = 1
const COUNT_MAX = 999

function parseAmount(value: string) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface GoodsStepperProps {
  unit: string
  value: string
  max: number
  min: number
  step: number
  onChange: (next: string) => void
}

// 生产端总重量/货物件数是胶囊步进器：灰轨道两端 − +，中间白色输入 pill，
// 单位（kg/件）显示在白色 pill 内右侧。
function GoodsStepper({
  max,
  min,
  onChange,
  step,
  unit,
  value
}: GoodsStepperProps) {
  const amount = parseAmount(value)
  const disabledMinus = amount <= min
  const disabledPlus = amount >= max

  const stepTo = (direction: 1 | -1) => {
    const base = Number.isFinite(amount) && amount > 0 ? amount : min

    onChange(String(clamp(base + direction * step, min, max)))
  }

  return (
    <View className='express-goods-stepper'>
      <AppPressable
        accessibilityLabel='减少'
        className={
          disabledMinus
            ? 'express-goods-stepper__button express-goods-stepper__button--disabled'
            : 'express-goods-stepper__button'
        }
        disabled={disabledMinus}
        onPress={() => stepTo(-1)}
      >
        <Text className='express-goods-stepper__symbol'>−</Text>
      </AppPressable>
      <View className='express-goods-stepper__field'>
        <Input
          className='express-goods-stepper__input'
          type='digit'
          value={value}
          onBlur={event => {
            const next = parseAmount(event.detail.value)

            onChange(String(clamp(next || min, min, max)))
          }}
          onInput={event => onChange(event.detail.value)}
        />
        <Text className='express-goods-stepper__unit'>{unit}</Text>
      </View>
      <AppPressable
        accessibilityLabel='增加'
        className={
          disabledPlus
            ? 'express-goods-stepper__button express-goods-stepper__button--disabled'
            : 'express-goods-stepper__button'
        }
        disabled={disabledPlus}
        onPress={() => stepTo(1)}
      >
        <Text className='express-goods-stepper__symbol'>＋</Text>
      </AppPressable>
    </View>
  )
}

const ExpressGoodsPage = () => {
  const initialGoods = useMemo<ExpressGoods>(
    () => expressDraftStorage.restore()?.goods ?? createExpressDraft().goods,
    []
  )
  const [name, setName] = useState(initialGoods.name)
  const [weightText, setWeightText] = useState(
    String(initialGoods.weight > 0 ? initialGoods.weight : WEIGHT_MIN)
  )
  const [countText, setCountText] = useState(
    String(initialGoods.count >= COUNT_MIN ? initialGoods.count : COUNT_MIN)
  )
  const [volumeOn, setVolumeOn] = useState(initialGoods.volume > 0)
  const [volumeText, setVolumeText] = useState(
    initialGoods.volume > 0 ? String(initialGoods.volume) : ''
  )
  const hotGoods = useMemo(() => goodsQueryService.getHotGoods(), [])
  const nameSuggestion = useGoodsNameSuggestions()

  const handleSelectName = (nextName: string) => {
    setName(nextName)
    nameSuggestion.clearSuggestions()
  }

  // 语音录入的原生能力尚未接入 shared/platform，先给出统一降级提示。
  const handleVoiceInput = () => {
    Taro.showToast({ title: '语音录入待接入，请先手动填写', icon: 'none' })
  }

  const handleConfirm = () => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      Taro.showToast({ title: '请填写物品名称', icon: 'none' })
      return
    }

    const weight = parseAmount(weightText)

    if (weight < WEIGHT_MIN) {
      Taro.showToast({ title: `重量需不小于${WEIGHT_MIN}kg`, icon: 'none' })
      return
    }

    // 与生产端 handleSaveGoods 相同：确认后回传货物并返回寄件页，由寄件页
    // 重算价格时效。
    expressGoodsBridge.save({
      ...initialGoods,
      count: Math.floor(clamp(parseAmount(countText), COUNT_MIN, COUNT_MAX)),
      name: trimmedName,
      volume: volumeOn ? parseAmount(volumeText) : 0,
      weight: clamp(weight, WEIGHT_MIN, WEIGHT_MAX)
    })
    Taro.navigateBack()
  }

  return (
    <AppPage
      footer={
        <View className='express-goods-footer'>
          {/* 生产端底部为「语音 + 确定」双按钮，语音在左白底浅描边，确定蓝底右（量测宽度比 319:343） */}
          <AppPressable
            accessibilityLabel='语音录入货物信息'
            className='express-goods-footer__button express-goods-footer__button--voice'
            onPress={handleVoiceInput}
          >
            <Text className='express-goods-footer__text express-goods-footer__text--voice'>
              语音填写
            </Text>
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
      header={<ExpressNavBar title='货物信息' />}
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
            <AppPressable
              accessibilityLabel='违禁品查询'
              className='express-goods-check'
              onPress={() => navigateToAppRoute(APP_ROUTES.goodsQuery)}
            >
              <Text className='express-goods-check__text'>违禁品查询 ›</Text>
            </AppPressable>
          </View>
          {name ? (
            <View className='express-goods-name-pill'>
              <Text className='express-goods-name-pill__text'>{name}</Text>
              <AppPressable
                accessibilityLabel='清除物品名称'
                className='express-goods-name-pill__clear'
                onPress={() => setName('')}
              >
                <Text className='express-goods-name-pill__clear-text'>×</Text>
              </AppPressable>
            </View>
          ) : (
            <>
              <Input
                className='express-goods-input'
                placeholder='如文件、服饰、配件'
                value={name}
                onBlur={event => setName(event.detail.value)}
                onInput={event => {
                  setName(event.detail.value)
                  nameSuggestion.handleNameInput(event.detail.value)
                }}
              />
              {nameSuggestion.suggestions.length > 0 && (
                <View className='express-goods-suggestions'>
                  {nameSuggestion.suggestions.map((item, index) => (
                    <AppPressable
                      accessibilityLabel={`选择品名${item.productKeyWord}`}
                      className='express-goods-suggestion'
                      key={`${item.productKeyWord}-${item.secondCategory}-${index}`}
                      onPress={() => handleSelectName(item.productKeyWord)}
                    >
                      <Text className='express-goods-suggestion__name'>
                        {item.productKeyWord}
                      </Text>
                      <Text className='express-goods-suggestion__desc'>
                        {[item.firstCategory, item.secondCategory]
                          .filter(Boolean)
                          .join(' / ') || '常用品名'}
                      </Text>
                    </AppPressable>
                  ))}
                </View>
              )}
              {nameSuggestion.message && (
                <Text className='express-goods-message'>
                  {nameSuggestion.loading
                    ? '推荐查询中'
                    : nameSuggestion.message}
                </Text>
              )}
              <View className='express-goods-chips'>
                {hotGoods.map(item => (
                  <AppPressable
                    accessibilityLabel={`热门品名${item.name}`}
                    className='express-goods-chip'
                    key={item.name}
                    onPress={() => handleSelectName(item.name)}
                  >
                    <Text className='express-goods-chip__text'>
                      {item.name}
                    </Text>
                  </AppPressable>
                ))}
              </View>
            </>
          )}
        </View>

        <View className='express-goods-card'>
          {/* 生产端红气泡位于计费卡内右上角、贴总重量行上方 */}
          <View className='express-goods-notice'>
            <Text className='express-goods-notice__text'>
              填写重量/体积计费更准确
            </Text>
          </View>
          {/* 生产端标签与步进器同一行，步进器右对齐（量测宽 401、高 80 设计px） */}
          <View className='express-goods-card__head express-goods-card__head--stepper'>
            <Text className='express-goods-card__title'>总重量</Text>
            <GoodsStepper
              max={WEIGHT_MAX}
              min={WEIGHT_MIN}
              step={WEIGHT_STEP}
              unit='kg'
              value={weightText}
              onChange={setWeightText}
            />
          </View>

          <View className='express-goods-card__head express-goods-card__head--field'>
            <Text className='express-goods-card__title'>总体积</Text>
            {/* RN 样式不支持后代选择器，开关左间距用包一层实现（生产端量测标签→开关、开关→提示均≈20） */}
            <View className='express-goods-card__switch'>
              <AppSwitch
                accessibilityLabel='是否填写体积'
                checked={volumeOn}
                onChange={setVolumeOn}
              />
            </View>
            <Text className='express-goods-card__switch-hint'>
              添加货物较大时，补充
              <Text className='express-goods-card__switch-hint-accent'>
                体积
              </Text>
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
            <GoodsStepper
              max={COUNT_MAX}
              min={COUNT_MIN}
              step={1}
              unit='件'
              value={countText}
              onChange={setCountText}
            />
          </View>

          <View className='express-goods-info'>
            <Text className='express-goods-info__text'>
              包裹体积较大但重量较轻时（如行李包裹等），会根据包裹外箱尺寸换算为计费重量。实际重量以快递员包装后测量为准。
              <Text className='express-goods-info__link'>了解计费规则 ›</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppPage>
  )
}

export default ExpressGoodsPage
