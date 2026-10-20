import { queryExpressPowerMachineCategoriesRaw } from './valueAdded.api'

/** 空、失败或非法列表不提供验机品类；页面仅消费归一后的服务结果。 */
export async function queryExpressPowerMachineCategories() {
  const response = await queryExpressPowerMachineCategoriesRaw()
  const categories =
    response.status && Array.isArray(response.result)
      ? [
          ...new Set(
            response.result
              .filter((item): item is string => typeof item === 'string')
              .map(item => item.trim())
              .filter(Boolean)
          )
        ]
      : []
  return { ...response, result: categories }
}
