import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { expressDraftBridge } from '../express/draftBridge'
import { createServiceFailure } from '../serviceResponse'
import { templateApi } from './template.api'
import { templateDraftBridge } from './template.bridge'
import {
  buildTemplateMetadataSaveRequest,
  buildTemplateSaveRequest,
  isTemplateMetadataChanged,
  mapTemplateToExpressDraft,
  normalizeExpressTemplate,
  validateTemplateDraft,
  validateTemplateMeta
} from './template.mapper'

import type { DepponResponse } from '../../request/deppon'
import type { ExpressDraft } from '../express'
import type { ExpressTemplateDraftMeta, ExpressTemplateView } from './types'

export const EXPRESS_TEMPLATE_LIMIT = 5

export const templateService = {
  async queryList(): Promise<DepponResponse<ExpressTemplateView[]>> {
    const response = await templateApi.query({ id: '' })

    if (!response.status || !response.result) {
      return createServiceFailure(response.message || '暂未获取到寄件模板')
    }

    return {
      ...response,
      result: response.result
        .map(normalizeExpressTemplate)
        .filter(item => item.id)
        .sort((left, right) => Number(right.isDefault) - Number(left.isDefault))
    }
  },

  stageDraft(draft: ExpressDraft) {
    const message = validateTemplateDraft(draft)

    if (message) {
      return message
    }

    templateDraftBridge.stage(draft)
    return ''
  },

  consumeStagedDraft() {
    return templateDraftBridge.consume()
  },

  prepareExpress(template: ExpressTemplateView) {
    expressDraftBridge.carryFromTemplate(
      mapTemplateToExpressDraft(template.raw)
    )
  },

  async saveDraft(
    draft: ExpressDraft,
    meta: ExpressTemplateDraftMeta
  ): Promise<DepponResponse<null>> {
    const message = validateTemplateDraft(draft) || validateTemplateMeta(meta)

    if (message) {
      return createServiceFailure(message)
    }

    const listResponse = await templateApi.query({ id: '' })

    if (!listResponse.status || !listResponse.result) {
      return createServiceFailure(
        listResponse.message || '暂未获取到模板数量，请稍后再试'
      )
    }

    if (listResponse.result.length >= EXPRESS_TEMPLATE_LIMIT) {
      return createServiceFailure(`最多只能添加${EXPRESS_TEMPLATE_LIMIT}个模板`)
    }

    const response = await templateApi.save(
      buildTemplateSaveRequest(draft, meta, APP_RUNTIME_CONFIG.systemCode)
    )

    if (!response.status || response.result === false) {
      return createServiceFailure(response.message || '保存失败，请稍后再试')
    }

    return {
      ...response,
      result: null
    }
  },

  async updateMetadata(
    template: ExpressTemplateView,
    meta: ExpressTemplateDraftMeta
  ): Promise<DepponResponse<null>> {
    const message = validateTemplateMeta(meta)

    if (message) {
      return createServiceFailure(message)
    }

    if (!template.id.trim()) {
      return createServiceFailure('缺少模板编号')
    }

    if (!isTemplateMetadataChanged(template, meta)) {
      return createServiceFailure('您还没有修改模板信息')
    }

    const response = await templateApi.save(
      buildTemplateMetadataSaveRequest(
        template,
        meta,
        APP_RUNTIME_CONFIG.systemCode
      )
    )

    if (!response.status || response.result === false) {
      return createServiceFailure(response.message || '修改失败，请稍后再试')
    }

    return {
      ...response,
      result: null
    }
  },

  async setDefault(
    template: ExpressTemplateView
  ): Promise<DepponResponse<null>> {
    const response = await templateApi.save({
      ...template.raw,
      defaultFlag: template.isDefault ? 2 : 1,
      sysCode: APP_RUNTIME_CONFIG.systemCode
    })

    if (!response.status || response.result === false) {
      return createServiceFailure(response.message || '修改失败，请稍后再试')
    }

    return {
      ...response,
      result: null
    }
  },

  async delete(id: string): Promise<DepponResponse<null>> {
    const normalizedId = id.trim()

    if (!normalizedId) {
      return createServiceFailure('缺少模板编号')
    }

    const response = await templateApi.delete({ id: normalizedId })

    if (!response.status || response.result === false) {
      return createServiceFailure(response.message || '删除失败，请稍后再试')
    }

    return {
      ...response,
      result: null
    }
  }
}
