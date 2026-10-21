import { useCallback, useMemo, useRef, type ReactElement, type ReactNode } from 'react'

import { FlatList, StyleSheet, type ListRenderItem } from 'react-native'

import { designPxToDp } from './AppDesignUnits'

// 业务页面不能直接 import react-native（见 scripts/check-rn-boundaries.mjs），因此长列表
// 的虚拟化能力只能从这里出去。Taro 的 ScrollView 不做窗口化，分页追加的列表会全量渲染，
// 订单/支付/打印/消息这类「一直往下翻」的页面必须用 FlatList。

// 设计稿 px（750 基准），与 Sass 里的 $dp-space-md(20) / $dp-page-horizontal-padding(24) /
// $dp-space-2xl(40) 对齐；数字型 props 走不进 Sass，需要用 designPxToDp 换算。
const DEFAULT_PADDING = {
  horizontal: 24,
  top: 20,
  bottom: 40
} as const

const styles = StyleSheet.create({
  fill: {
    flex: 1
  }
})

export interface AppVirtualListProps<T> {
  /** 已经按页累加好的完整数据，虚拟化只负责渲染窗口，不负责取数。 */
  items: readonly T[]
  keyExtractor: (item: T, index: number) => string
  renderItem: (item: T, index: number) => ReactElement
  /**
   * 影响行内容的外部状态（筛选项、状态 tab 等）。FlatList 只按引用判断是否重渲染行，
   * 不传这里，页面里切换筛选后行内容不会更新。等价于 RN FlatList 的 extraData。
   */
  extraData?: unknown
  /** 触底回调。是否真正发请求由调用方根据 loading / 是否还有下一页判断。 */
  onEndReached?: () => void
  header?: ReactNode
  footer?: ReactNode
  /** items 为空时展示的内容，通常承接空态/错误态。 */
  empty?: ReactNode
  /** 设计稿 px，默认 24/20/40，与页面容器的通用内边距一致。 */
  paddingHorizontal?: number
  paddingTop?: number
  paddingBottom?: number
}

export function AppVirtualList<T>({
  items,
  keyExtractor,
  renderItem,
  extraData,
  onEndReached,
  header,
  footer,
  empty,
  paddingHorizontal = DEFAULT_PADDING.horizontal,
  paddingTop = DEFAULT_PADDING.top,
  paddingBottom = DEFAULT_PADDING.bottom
}: AppVirtualListProps<T>) {
  // 行渲染函数保持引用稳定，避免调用方传内联箭头时每次 setState 都重建可见行；
  // 内容更新交给 extraData。
  const renderItemRef = useRef(renderItem)
  const keyExtractorRef = useRef(keyExtractor)
  renderItemRef.current = renderItem
  keyExtractorRef.current = keyExtractor

  const renderRow = useCallback<ListRenderItem<T>>(({ item, index }) => renderItemRef.current(item, index), [])

  const renderKey = useCallback((item: T, index: number) => keyExtractorRef.current(item, index), [])

  const contentStyle = useMemo(
    () => ({
      paddingTop: designPxToDp(paddingTop),
      paddingHorizontal: designPxToDp(paddingHorizontal),
      paddingBottom: designPxToDp(paddingBottom)
    }),
    [paddingBottom, paddingHorizontal, paddingTop]
  )

  return (
    <FlatList<T>
      data={items}
      keyExtractor={renderKey}
      renderItem={renderRow}
      extraData={extraData}
      style={styles.fill}
      contentContainerStyle={contentStyle}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={header ? <>{header}</> : null}
      ListFooterComponent={footer ? <>{footer}</> : null}
      ListEmptyComponent={empty ? <>{empty}</> : null}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      windowSize={7}
      keyboardShouldPersistTaps='handled'
    />
  )
}
