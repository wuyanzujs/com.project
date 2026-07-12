import { Image, Text, View } from '@tarojs/components'

import { AppPressable } from '../../../shared/components'
import {
  getMemberLevelAsset,
  getMemberRightsCount
} from '../mine.model'

import type { MemberOverviewView } from '../../../services/member'

import './MineMemberCard.scss'

interface MineMemberCardProps {
  levelCode: number
  member: MemberOverviewView | null
  onOpen: () => void
}

export function MineMemberCard({
  levelCode,
  member,
  onOpen
}: MineMemberCardProps) {
  return (
    <AppPressable
      accessibilityLabel='打开会员中心'
      block
      className='mine-member-card'
      onPress={onOpen}
    >
      <View className='mine-member-card__body'>
        <Image
          className='mine-member-card__background'
          mode='scaleToFill'
          src={getMemberLevelAsset(levelCode)}
        />
        <View className='mine-member-card__top'>
          <View>
            <View className='mine-member-card__level-row'>
              <Text className='mine-member-card__level'>
                {member?.levelName || '普通会员'}
              </Text>
              <Text className='mine-member-card__rights'>
                {getMemberRightsCount(levelCode)}项权益 ›
              </Text>
            </View>
            <Text className='mine-member-card__growth'>
              当前成长值 {member?.growthValue ?? 0}/
              {member?.maxGrowthValue || '--'}
            </Text>
          </View>
        </View>
        <View className='mine-member-card__benefits'>
          <View className='mine-member-card__benefit'>
            <Image
              className='mine-member-card__benefit-icon'
              mode='aspectFit'
              src='https://ca.deppon.com.cn/ows/assets/center2412/40.png'
            />
            <Text className='mine-member-card__benefit-text'>优惠券</Text>
          </View>
          <View className='mine-member-card__benefit'>
            <Image
              className='mine-member-card__benefit-icon'
              mode='aspectFit'
              src='https://ca.deppon.com.cn/ows/assets/center2412/39.png'
            />
            <Text className='mine-member-card__benefit-text'>储值卡</Text>
          </View>
          <View className='mine-member-card__benefit'>
            <Text className='mine-member-card__benefit-text'>
              我的积分 {member?.points ?? 0}
            </Text>
          </View>
        </View>
      </View>
      <View className='mine-member-card__svip'>
        <Image
          className='mine-member-card__svip-background'
          mode='scaleToFill'
          src='https://ca.deppon.com.cn/ows/assets/center2412/6.png'
        />
        <Image
          className='mine-member-card__svip-logo'
          mode='aspectFit'
          src='https://ca.deppon.com.cn/ows/assets/center2412/50.png'
        />
        <Text className='mine-member-card__svip-text'>
          {member?.svipMessage || 'SVIP 专属权益'}
        </Text>
        <View className='mine-member-card__svip-button'>
          <Text className='mine-member-card__svip-button-text'>
            {member?.svipButtonText || '立即开通'}
          </Text>
        </View>
      </View>
    </AppPressable>
  )
}
