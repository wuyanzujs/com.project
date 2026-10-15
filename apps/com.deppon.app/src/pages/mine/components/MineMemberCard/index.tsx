import { Image, Text, View } from '@tarojs/components'

import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg'

import type { MemberOverviewView } from '@/services/member'
import { AppPressable } from '@/shared/components'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { getMemberLevelAsset, getMemberRightsCount } from '../../mine.model'

import './index.scss'

interface MineMemberCardProps {
  levelCode: number
  member: MemberOverviewView | null
  couponCount?: number
  /** 储值卡数量；null/undefined 表示未知（加载中或查询失败），此时不显示数字，避免把未知渲染成 0 */
  storedCardCount?: number | null
  onOpen: () => void
}

export function MineMemberCard({ levelCode, member, couponCount = 0, storedCardCount, onOpen }: MineMemberCardProps) {
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
            <Image className='mine-member-card__benefit-icon' mode='aspectFit' src='https://ca.deppon.com.cn/ows/assets/center2412/40.png' />
            {/* 生产端数字加粗、标签常规字重，数字随文案连排 */}
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
          <View className='mine-member-card__svip-button-gradient'>
            <Svg width='100%' height='100%'>
              <Defs>
                <LinearGradient id='mineSvipButtonGradient' x1='0' x2='1' y1='0' y2='0'>
                  <Stop offset='0' stopColor={APP_STYLE_COLORS.member.svipGradientStart} />
                  <Stop offset='0.53' stopColor={APP_STYLE_COLORS.member.svipGradientMid} />
                  <Stop offset='1' stopColor={APP_STYLE_COLORS.member.svipGradientEnd} />
                </LinearGradient>
              </Defs>
              <Rect width='100%' height='100%' fill='url(#mineSvipButtonGradient)' />
            </Svg>
          </View>
          <Text className='mine-member-card__svip-button-text'>{member?.svipButtonText || '立即开通'}</Text>
        </View>
      </View>
    </AppPressable>
  )
}
