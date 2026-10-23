import { Image, Text, View } from '@tarojs/components'

import { EXPRESS_AGREEMENT_HISTORY } from '@/services/express/draft/agreementHistory'
import { AppPressable } from '@/shared/components'
import { APP_IMAGE_ICONS } from '@/shared/components/AppIcon/images'
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
 * @description 电子运单服务协议首次勾选确认弹层：先阅读协议说明再确认勾选。
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
          <Image className='express-agreement-sheet__link-arrow' mode='aspectFit' src={APP_IMAGE_ICONS.arrowRightGrey} />
        </AppPressable>
        <Text className='express-agreement-sheet__history-title'>历史记录</Text>
        {EXPRESS_AGREEMENT_HISTORY.map(entry => (
          <AppPressable
            key={entry.url}
            accessibilityLabel={`查看${entry.title}`}
            block
            className='express-agreement-sheet__link'
            layout='row-start'
            onPress={() => navigateToAppRoute(createAppWebUrl({ source: 'EXPRESS_SERVICE_PROTOCOL', uri: entry.url, title: entry.title, auth: false }))}
          >
            <Text className='express-agreement-sheet__history-link'>{entry.title}</Text>
          </AppPressable>
        ))}
      </View>
    </ExpressSheet>
  )
}
