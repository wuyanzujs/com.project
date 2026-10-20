import { Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { createAppWebUrl } from '@/shared/webview/appWeb'

import { ExpressSheet } from '../ExpressSheet'

import './index.scss'

interface ExpressAgreementSheetProps {
  visible: boolean
  onAgree: () => void
  onClose: () => void
}

/**
 * @description 电子运单服务协议首次勾选确认弹层：与生产端一致，先阅读协议说明再确认勾选。
 */
export function ExpressAgreementSheet({ onAgree, onClose, visible }: ExpressAgreementSheetProps) {
  return (
    <ExpressSheet
      bodyClassName='express-agreement-sheet__body'
      title='电子运单服务协议'
      titleSize={42}
      visible={visible}
      footer={
        <AppPressable accessibilityLabel='同意电子运单服务协议' block className='express-agreement-sheet__confirm' onPress={onAgree}>
          <Text className='express-agreement-sheet__confirm-text'>同意本协议，下次不用提醒我</Text>
        </AppPressable>
      }
      onClose={onClose}
    >
      <Text className='express-agreement-sheet__intro'>
        为反映德邦服务内容的变动，德邦可能会不时修订或更新本服务协议，并将修订或更新版本内容进行发布，您阅读并完成后续操作视为认可本服务协议。
      </Text>

      <View className='express-agreement-sheet__links'>
        <AppPressable
          accessibilityLabel='查看电子运单服务协议全文'
          block
          className='express-agreement-sheet__link'
          layout='row-start'
          onPress={() => navigateToAppRoute(createAppWebUrl({ source: 'EXPRESS_SERVICE_PROTOCOL' }))}
        >
          <Text className='express-agreement-sheet__link-text'>《电子运单服务协议》全文</Text>
          <Text className='express-agreement-sheet__link-arrow'>›</Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel='查看电子运单服务协议历史版本'
          block
          className='express-agreement-sheet__link'
          layout='row-start'
          onPress={() => navigateToAppRoute(createAppWebUrl({ source: 'PROTOCOL_RECORD' }))}
        >
          <Text className='express-agreement-sheet__link-text'>历史版本记录</Text>
          <Text className='express-agreement-sheet__link-arrow'>›</Text>
        </AppPressable>
      </View>
    </ExpressSheet>
  )
}
