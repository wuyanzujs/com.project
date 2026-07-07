import { CACHE_KEYS, DPCacheExpireType, dpCache } from '../../cache'
import { expressService } from '../express'

import type { DepponResponse } from '../../request/deppon'
import type { ExpressGoodsItem } from '../express'
import type {
  GoodsCheckInput,
  GoodsCheckResult,
  GoodsHistoryItem,
  GoodsSuggestionView
} from './types'

const GOODS_HISTORY_LIMIT = 4
const GOODS_SEARCH_PAGE_SIZE = 20

const DEFAULT_HOT_GOODS: GoodsSuggestionView[] = [
  {
    name: '文件',
    category: '文件资料',
    firstCategory: '文件资料',
    secondCategory: '',
    labels: [],
    source: 'hot'
  },
  {
    name: '服饰',
    category: '日用品 / 服饰',
    firstCategory: '日用品',
    secondCategory: '服饰',
    labels: [],
    source: 'hot'
  },
  {
    name: '鞋帽',
    category: '日用品 / 鞋帽',
    firstCategory: '日用品',
    secondCategory: '鞋帽',
    labels: [],
    source: 'hot'
  },
  {
    name: '图书',
    category: '文化用品 / 图书',
    firstCategory: '文化用品',
    secondCategory: '图书',
    labels: [],
    source: 'hot'
  },
  {
    name: '日用品',
    category: '生活用品',
    firstCategory: '生活用品',
    secondCategory: '',
    labels: [],
    source: 'hot'
  },
  {
    name: '五金配件',
    category: '配件 / 五金',
    firstCategory: '配件',
    secondCategory: '五金',
    labels: [],
    source: 'hot'
  },
  {
    name: '电子配件',
    category: '配件 / 电子',
    firstCategory: '配件',
    secondCategory: '电子',
    labels: [],
    source: 'hot'
  },
  {
    name: '母婴用品',
    category: '日用品 / 母婴',
    firstCategory: '日用品',
    secondCategory: '母婴',
    labels: [],
    source: 'hot'
  }
]

function createFailure<TResult>(message: string): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function getGoodsCategory(item: ExpressGoodsItem) {
  return [item.firstCategory, item.secondCategory].filter(Boolean).join(' / ')
}

function normalizeSuggestion(item: ExpressGoodsItem): GoodsSuggestionView {
  return {
    name: normalizeText(item.productKeyWord),
    category: getGoodsCategory(item) || '常用品名',
    firstCategory: normalizeText(item.firstCategory),
    secondCategory: normalizeText(item.secondCategory),
    labels: item.goodsLabelList ?? [],
    source: 'search'
  }
}

function dedupeSuggestions(
  suggestions: GoodsSuggestionView[]
): GoodsSuggestionView[] {
  const seen = new Set<string>()

  return suggestions.filter((item) => {
    const key = item.name.toLowerCase()

    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function toHistoryItem(result: GoodsCheckResult): GoodsHistoryItem {
  return {
    goodsName: result.goodsName,
    status: result.status,
    title: result.title,
    message: result.message,
    checkedAt: result.checkedAt
  }
}

function getHistory() {
  return dpCache.get<GoodsHistoryItem[]>(CACHE_KEYS.goodsQueryHistory) ?? []
}

function saveHistoryItem(result: GoodsCheckResult) {
  const current = getHistory()
  const next = [
    toHistoryItem(result),
    ...current.filter((item) => item.goodsName !== result.goodsName)
  ].slice(0, GOODS_HISTORY_LIMIT)

  dpCache.set<GoodsHistoryItem[]>(CACHE_KEYS.goodsQueryHistory, {
    data: next,
    expire: {
      type: DPCacheExpireType.INFINITY
    }
  })

  return next
}

export const goodsQueryService = {
  getHotGoods() {
    return DEFAULT_HOT_GOODS
  },

  getHistory() {
    return getHistory()
  },

  clearHistory() {
    return dpCache.remove(CACHE_KEYS.goodsQueryHistory)
  },

  async searchGoods(
    keyword: string,
    pageSize = GOODS_SEARCH_PAGE_SIZE
  ): Promise<DepponResponse<GoodsSuggestionView[]>> {
    const keyWord = normalizeText(keyword)

    if (!keyWord) {
      return createFailure('请输入货物名称关键词')
    }

    const response = await expressService.queryGoodsNames(keyWord, 1, pageSize)

    if (!response.status) {
      return createFailure(response.message || '暂未获取到品名推荐')
    }

    const list = dedupeSuggestions(
      (response.result?.list ?? []).map(normalizeSuggestion)
    )

    return {
      ...response,
      result: list
    }
  },

  async checkGoods(
    input: GoodsCheckInput
  ): Promise<DepponResponse<GoodsCheckResult>> {
    const goodsName = normalizeText(input.goodsName)

    if (!goodsName) {
      return createFailure('请输入货物名称')
    }

    const response = await expressService.checkGoodsByName({
      ...input,
      goodsName
    })

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未完成货物校验')
    }

    const result: GoodsCheckResult = {
      ...response.result,
      checkedAt: Date.now()
    }

    saveHistoryItem(result)

    return {
      ...response,
      result
    }
  }
}
