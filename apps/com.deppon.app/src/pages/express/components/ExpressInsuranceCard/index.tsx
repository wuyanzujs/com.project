import { Image, Text, View } from '@tarojs/components'

import { useMemo, useState, type PropsWithChildren } from 'react'

import { createExpressInsurancePanelView, getExpressQuoteInsurancePremium } from '@/services/express'
import type { ExpressDraft, ExpressInsurancePanelTierView, ExpressProductQuote } from '@/services/express'
import { AppPressable, AppRadio } from '@/shared/components'
import { APP_IMAGE_ICONS, AppIcon } from '@/shared/components/AppIcon'
import { AppLinearGradient } from '@/shared/native'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ExpressInsuranceValueSheet } from '../ExpressInsuranceValueSheet'

import type { ExpressInsuranceController } from '../../hooks/useExpressInsurance'

import './index.scss'

interface ExpressInsuranceCardProps extends PropsWithChildren {
  controller: ExpressInsuranceController
  draft: ExpressDraft
  selectedProduct: ExpressProductQuote | null
}

interface ExpressInsuranceRowProps {
  tier: ExpressInsurancePanelTierView
  selected: boolean
  amount: number
  free: boolean
  premium: number | null
  modifier: string
  onOpenEditor: (tier: ExpressInsurancePanelTierView) => void
}

/** 「免费赠送」角标阈值：2000 元内免费的产品才展示。 */
const FREE_BADGE_AMOUNT_LIMIT = 2000

/**
 * @description 保价价值行：未填时展示「自定义物品价值 / 填写实际价值」，已填展示金额、保费与选中圆。
 */
function renderInsuranceRow({ amount, free, modifier, onOpenEditor, premium, selected, tier }: ExpressInsuranceRowProps) {
  const freeBadgeVisible = free && (!selected || amount <= FREE_BADGE_AMOUNT_LIMIT)

  return (
    <AppPressable
      accessibilityLabel={`填写${tier.title}物品价值`}
      block
      className={`express-insurance-row express-insurance-row--${modifier}`}
      onPress={() => onOpenEditor(tier)}
    >
      <View className='express-insurance-row__lead'>
        {selected ? (
          <>
            <Text className='express-insurance-row__label'>保价金额</Text>
            <Text className='express-insurance-row__amount'>¥{amount}</Text>
          </>
        ) : (
          <Text className='express-insurance-row__label'>自定义物品价值</Text>
        )}
      </View>
      <View className='express-insurance-row__side'>
        {freeBadgeVisible ? (
          <View className='express-insurance-row__badge'>
            <Text className='express-insurance-row__badge-text'>免费赠送</Text>
          </View>
        ) : null}
        {selected ? (
          <>
            {premium !== null && premium > 0 ? <Text className='express-insurance-row__premium'>¥{premium}</Text> : null}
            <AppRadio checked size={32} />
          </>
        ) : free ? (
          <>
            <Text className='express-insurance-row__gift'>2000元</Text>
            <Image className='express-insurance-row__arrow' mode='aspectFit' src={APP_IMAGE_ICONS.arrowRightGrey} />
          </>
        ) : (
          <>
            <Text className='express-insurance-row__hint'>填写实际价值</Text>
            <Image className='express-insurance-row__arrow' mode='aspectFit' src={APP_IMAGE_ICONS.arrowRightGrey} />
          </>
        )}
      </View>
    </AppPressable>
  )
}

/**
 * @description 寄件页保价面板：高档横幅（全额保/省心保/易碎保）+ 基础保两档，点击价值行弹物品价值编辑。
 */
export function ExpressInsuranceCard({ children, controller, draft, selectedProduct }: ExpressInsuranceCardProps) {
  const view = useMemo(() => createExpressInsurancePanelView(draft), [draft])
  const premium = useMemo(() => (selectedProduct ? getExpressQuoteInsurancePremium(selectedProduct) : null), [selectedProduct])
  const [editingTier, setEditingTier] = useState<ExpressInsurancePanelTierView | null>(null)

  const basicTier = useMemo<ExpressInsurancePanelTierView>(() => ({ limit: view.basicLimit, slogan: '', title: '基础保', type: 'NORMAL' }), [view.basicLimit])

  const closeEditor = () => setEditingTier(null)

  const handleConfirm = (amount: number) => {
    if (editingTier) {
      controller.onCommit(editingTier.type, amount)
    }

    closeEditor()
  }

  const handleDecline = () => {
    if (editingTier) {
      controller.onCommit(editingTier.type, 0)
    }

    closeEditor()
  }

  return (
    <View className='express-insurance-card'>
      <View className='express-insurance-head'>
        <Text className='express-insurance-head__title'>保价</Text>
        <AppPressable
          accessibilityLabel='查看保价说明'
          className='express-insurance-head__rules'
          compact
          hitSlop={8}
          onPress={() => controller.onOpenRules(view.disabled ? 'NORMAL' : view.selectedType)}
        >
          <Text className='express-insurance-head__tip'>{view.disabled ? '当前货物暂不支持保价' : '未保价物品最高赔付3倍运费'}</Text>
          {view.disabled ? null : <AppIcon color={APP_STYLE_COLORS.text.subdued} name='info' size={28} strokeWidth={1.5} />}
        </AppPressable>
      </View>

      {view.disabled ? null : (
        <>
          {view.banner ? (
            <View className='express-insurance-banner'>
              <View className='express-insurance-banner__hero'>
                <AppLinearGradient
                  className='express-insurance-banner__hero-bg'
                  colors={[APP_STYLE_COLORS.insurance.bannerGradientStart, APP_STYLE_COLORS.insurance.bannerGradientEnd]}
                  end={{ x: 0, y: 1 }}
                  start={{ x: 0, y: 0 }}
                />
                <View className='express-insurance-banner__branding'>
                  <Image className='express-insurance-banner__shield' mode='aspectFit' src={APP_IMAGE_ICONS.insuranceFullShield} />
                  <Text className='express-insurance-banner__name'>{view.banner.title}</Text>
                  <Text className='express-insurance-banner__slogan'>{view.banner.slogan}</Text>
                </View>
              </View>
              <View className='express-insurance-banner__tray' />
              {renderInsuranceRow({
                amount: view.amount,
                free: view.free,
                modifier: 'raised',
                premium,
                selected: view.selectedType === view.banner.type && view.amount > 0,
                tier: view.banner,
                onOpenEditor: setEditingTier
              })}
            </View>
          ) : null}

          {view.basicAvailable ? (
            <View className='express-insurance-basic'>
              <View className='express-insurance-basic__head'>
                <Image className='express-insurance-basic__shield' mode='aspectFit' src={APP_IMAGE_ICONS.insuranceBasicShield} />
                <Text className='express-insurance-basic__title'>基础保</Text>
                <AppPressable
                  accessibilityLabel='查看基础保说明'
                  className='express-insurance-head__rules'
                  compact
                  hitSlop={8}
                  onPress={() => controller.onOpenRules('NORMAL')}
                >
                  <Text className='express-insurance-head__tip'>未保价物品最高赔付3倍运费</Text>
                  <AppIcon color={APP_STYLE_COLORS.text.subdued} name='info' size={28} strokeWidth={1.5} />
                </AppPressable>
              </View>
              {renderInsuranceRow({
                amount: view.amount,
                free: view.free,
                modifier: 'flat',
                premium,
                selected: view.selectedType === 'NORMAL' && view.amount > 0,
                tier: basicTier,
                onOpenEditor: setEditingTier
              })}
            </View>
          ) : null}
        </>
      )}

      {children}

      <ExpressInsuranceValueSheet
        initialAmount={view.amount}
        insured={view.amount > 0}
        limit={editingTier?.limit ?? view.basicLimit}
        tierTitle={editingTier?.title ?? '保价'}
        visible={Boolean(editingTier)}
        onClose={closeEditor}
        onConfirm={handleConfirm}
        onDecline={handleDecline}
      />
    </View>
  )
}
