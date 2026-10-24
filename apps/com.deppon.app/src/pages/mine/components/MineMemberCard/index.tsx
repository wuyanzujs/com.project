import { Image, Text, View } from '@tarojs/components'

import type { MemberOverviewView } from '@/services/member'
import { AppPressable } from '@/shared/components'
import { AppLinearGradient } from '@/shared/native'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { getExpireCouponBadgeText, getMemberLevelAsset, getMemberRightsCount } from '../../mine.model'

import './index.scss'

interface MineMemberCardProps {
  levelCode: number
  member: MemberOverviewView | null
  couponCount?: number
  /** 即将过期优惠券数量；> 0 时在「优惠券」上方显示「N张快过期啦」角标 */
  expireCouponCount?: number
  /** 储值卡数量；null/undefined 表示未知（加载中或查询失败），此时不显示数字，避免把未知渲染成 0 */
  storedCardCount?: number | null
  onOpen: () => void
}

export function MineMemberCard({ levelCode, member, couponCount = 0, expireCouponCount = 0, storedCardCount, onOpen }: MineMemberCardProps) {
  const expireBadgeText = getExpireCouponBadgeText(expireCouponCount)

  return (
    <AppPressable accessibilityLabel='打开会员中心' className='mine-member-card' onPress={onOpen}>
      <View className='mine-member-card__body'>
        <Image className='mine-member-card__background' mode='scaleToFill' src={getMemberLevelAsset(levelCode)} />
        <View className='mine-member-card__top'>
          <View>
            <View className='mine-member-card__level-row'>
              <Text className='mine-member-card__level'>{member?.levelName || '普通会员'}</Text>
              <Text className='mine-member-card__rights'>{getMemberRightsCount(levelCode)}项权益 ›</Text>
            </View>
            <Text className='mine-member-card__growth'>
              当前成长值 {member?.growthValue ?? 0}/{member?.maxGrowthValue || '--'}
            </Text>
          </View>
        </View>
        <View className='mine-member-card__benefits'>
          <View className='mine-member-card__benefit'>
            {expireBadgeText ? (
              <View className='mine-member-card__benefit-badge mine-member-card__benefit-badge--expire'>
                <Text className='mine-member-card__benefit-badge-text'>{expireBadgeText}</Text>
              </View>
            ) : null}
            <Image className='mine-member-card__benefit-icon' mode='aspectFit' src='https://ca.deppon.com.cn/ows/assets/center2412/40.png' />
            <Text className='mine-member-card__benefit-text'>
              优惠券
              <Text className='mine-member-card__benefit-num'>{couponCount}</Text>
            </Text>
          </View>
          <View className='mine-member-card__benefit'>
            <View className='mine-member-card__benefit-badge'>
              <Text className='mine-member-card__benefit-badge-text'>原德邦E卡</Text>
            </View>
            <Image className='mine-member-card__benefit-icon' mode='aspectFit' src='https://ca.deppon.com.cn/ows/assets/center2412/39.png' />
            <Text className='mine-member-card__benefit-text'>
              储值卡
              <Text className='mine-member-card__benefit-num'>{storedCardCount ?? ''}</Text>
            </Text>
          </View>
          <View className='mine-member-card__benefit'>
            <Text className='mine-member-card__benefit-text'>
              我的积分
              <Text className='mine-member-card__benefit-num'>{member?.points ?? 0}</Text>
            </Text>
          </View>
        </View>
      </View>
      <View className='mine-member-card__svip'>
        <Image className='mine-member-card__svip-background' mode='scaleToFill' src='https://ca.deppon.com.cn/ows/assets/center2412/6.png' />
        <Image className='mine-member-card__svip-logo' mode='aspectFit' src='https://ca.deppon.com.cn/ows/assets/center2412/50.png' />
        <Text className='mine-member-card__svip-text'>{member?.svipMessage || 'SVIP 专属权益'}</Text>
        <View className='mine-member-card__svip-button'>
          <AppLinearGradient
            className='mine-member-card__svip-button-gradient'
            colors={[APP_STYLE_COLORS.member.svipGradientStart, APP_STYLE_COLORS.member.svipGradientMid, APP_STYLE_COLORS.member.svipGradientEnd]}
            locations={[0, 0.53, 1]}
          />
          <Text className='mine-member-card__svip-button-text'>{member?.svipButtonText || '立即开通'}</Text>
        </View>
      </View>
    </AppPressable>
  )
}
