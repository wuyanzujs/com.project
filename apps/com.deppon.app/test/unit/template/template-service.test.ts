import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EXPRESS_TEMPLATE_LIMIT, templateService } from '@/services/template/template.service'

import type { ExpressDraft } from '@/services/express/core/types'
import type { ExpressTemplateDraftMeta, ExpressTemplateView } from '@/services/template/types'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  stage: vi.fn(),
  consume: vi.fn(),
  carryFromTemplate: vi.fn(),
  validateDraft: vi.fn(),
  validateMeta: vi.fn(),
  normalizeTemplate: vi.fn(),
  mapToDraft: vi.fn(),
  metadataChanged: vi.fn(),
  buildSave: vi.fn(),
  buildMetaSave: vi.fn()
}))

vi.mock('@/services/template/template.api', () => ({
  templateApi: { query: mocks.query, save: mocks.save, delete: mocks.remove }
}))

vi.mock('@/services/template/template.bridge', () => ({
  templateDraftBridge: { stage: mocks.stage, consume: mocks.consume }
}))

vi.mock('@/services/express/draft/draftBridge', () => ({
  expressDraftBridge: { carryFromTemplate: mocks.carryFromTemplate }
}))

vi.mock('@/services/template/template.mapper', () => ({
  validateTemplateDraft: mocks.validateDraft,
  validateTemplateMeta: mocks.validateMeta,
  normalizeExpressTemplate: mocks.normalizeTemplate,
  mapTemplateToExpressDraft: mocks.mapToDraft,
  isTemplateMetadataChanged: mocks.metadataChanged,
  buildTemplateSaveRequest: mocks.buildSave,
  buildTemplateMetadataSaveRequest: mocks.buildMetaSave
}))


const draft = { goods: { name: '', weight: 1 } } as unknown as ExpressDraft
const meta = { name: '模板', defaultFlag: 1 } as ExpressTemplateDraftMeta
const template = { id: 'T1', name: '旧名字', isDefault: false, raw: { id: 'T1' } } as unknown as ExpressTemplateView

beforeEach(() => {
  vi.clearAllMocks()
  mocks.validateDraft.mockReturnValue('')
  mocks.validateMeta.mockReturnValue('')
  mocks.metadataChanged.mockReturnValue(true)
  mocks.consume.mockReturnValue(draft)
  mocks.buildSave.mockReturnValue({ id: '', name: '模板' })
  mocks.buildMetaSave.mockReturnValue({ id: 'T1' })
})

describe('templateService.queryList', () => {
  it('normalizes, drops empty ids and puts the default template first', async () => {
    const first = { id: 'A', isDefault: false }
    const second = { id: 'B', isDefault: true }
    const dropped = { id: '', isDefault: true }
    mocks.query.mockResolvedValue({ status: true, message: '', result: [first, second, dropped] })
    mocks.normalizeTemplate.mockImplementation((item: ExpressTemplateView) => item)

    const response = await templateService.queryList()

    expect(mocks.query).toHaveBeenCalledWith({ id: '' })
    expect(response.result).toEqual([second, first])
  })

  it('falls back to the service failure copy', async () => {
    mocks.query.mockResolvedValue({ status: false, message: '', result: null })
    await expect(templateService.queryList()).resolves.toEqual({ status: false, message: '暂未获取到寄件模板', result: null })

    mocks.query.mockResolvedValue({ status: false, message: '后端说不行', result: null })
    await expect(templateService.queryList()).resolves.toEqual({ status: false, message: '后端说不行', result: null })
  })
})

describe('templateService.saveDraft', () => {
  it('stops at draft or meta validation without touching the api', async () => {
    mocks.validateDraft.mockReturnValue('请先填写货物名称')
    await expect(templateService.saveDraft(draft, meta)).resolves.toEqual({ status: false, message: '请先填写货物名称', result: null })

    mocks.validateDraft.mockReturnValue('')
    mocks.validateMeta.mockReturnValue('请输入模板名称')
    await expect(templateService.saveDraft(draft, meta)).resolves.toEqual({ status: false, message: '请输入模板名称', result: null })
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('reports the list lookup failure before saving', async () => {
    mocks.query.mockResolvedValue({ status: false, message: '', result: null })

    await expect(templateService.saveDraft(draft, meta)).resolves.toEqual({ status: false, message: '暂未获取到模板数量，请稍后再试', result: null })
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('enforces the template limit', async () => {
    mocks.query.mockResolvedValue({ status: true, message: '', result: Array.from({ length: EXPRESS_TEMPLATE_LIMIT }, () => ({ id: 'X' })) })

    await expect(templateService.saveDraft(draft, meta)).resolves.toEqual({ status: false, message: `最多只能添加${EXPRESS_TEMPLATE_LIMIT}个模板`, result: null })
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('treats status false and result false as failures', async () => {
    mocks.query.mockResolvedValue({ status: true, message: '', result: [] })

    mocks.save.mockResolvedValue({ status: false, message: '', result: true })
    await expect(templateService.saveDraft(draft, meta)).resolves.toEqual({ status: false, message: '保存失败，请稍后再试', result: null })

    mocks.save.mockResolvedValue({ status: true, message: '', result: false })
    await expect(templateService.saveDraft(draft, meta)).resolves.toEqual({ status: false, message: '保存失败，请稍后再试', result: null })
  })

  it('returns the backend response with a null result on success', async () => {
    mocks.query.mockResolvedValue({ status: true, message: '', result: [] })
    mocks.save.mockResolvedValue({ status: true, message: 'ok', result: true })

    await expect(templateService.saveDraft(draft, meta)).resolves.toEqual({ status: true, message: 'ok', result: null })
    expect(mocks.buildSave).toHaveBeenCalledWith(draft, meta, 'TEST_SYSTEM_CODE')
  })
})

describe('templateService.updateMetadata', () => {
  it('guards invalid meta, blank id and untouched metadata', async () => {
    mocks.validateMeta.mockReturnValue('模板名称不能超过5个字')
    await expect(templateService.updateMetadata(template, meta)).resolves.toMatchObject({ status: false })

    mocks.validateMeta.mockReturnValue('')
    await expect(templateService.updateMetadata({ ...template, id: '  ' } as ExpressTemplateView, meta)).resolves.toEqual({
      status: false,
      message: '缺少模板编号',
      result: null
    })

    mocks.metadataChanged.mockReturnValue(false)
    await expect(templateService.updateMetadata(template, meta)).resolves.toEqual({ status: false, message: '您还没有修改模板信息', result: null })
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('saves the change and reports backend failures', async () => {
    mocks.save.mockResolvedValue({ status: true, message: '', result: true })
    await expect(templateService.updateMetadata(template, meta)).resolves.toEqual({ status: true, message: '', result: null })
    expect(mocks.buildMetaSave).toHaveBeenCalledWith(template, meta, 'TEST_SYSTEM_CODE')

    mocks.save.mockResolvedValue({ status: true, message: '', result: false })
    await expect(templateService.updateMetadata(template, meta)).resolves.toEqual({ status: false, message: '修改失败，请稍后再试', result: null })
  })
})

describe('templateService.setDefault', () => {
  it('flips the default flag instead of trusting the current one', async () => {
    mocks.save.mockResolvedValue({ status: true, message: '', result: true })
    await templateService.setDefault(template)
    expect(mocks.save).toHaveBeenCalledWith({ id: 'T1', defaultFlag: 1, sysCode: 'TEST_SYSTEM_CODE' })

    await templateService.setDefault({ ...template, isDefault: true } as ExpressTemplateView)
    expect(mocks.save).toHaveBeenLastCalledWith({ id: 'T1', defaultFlag: 2, sysCode: 'TEST_SYSTEM_CODE' })
  })

  it('surfaces the failure message', async () => {
    mocks.save.mockResolvedValue({ status: false, message: '该模板不存在', result: false })
    await expect(templateService.setDefault(template)).resolves.toEqual({ status: false, message: '该模板不存在', result: null })
  })
})

describe('templateService.delete', () => {
  it('requires an id and reports failures', async () => {
    await expect(templateService.delete('  ')).resolves.toEqual({ status: false, message: '缺少模板编号', result: null })
    expect(mocks.remove).not.toHaveBeenCalled()

    mocks.remove.mockResolvedValue({ status: false, message: '', result: false })
    await expect(templateService.delete(' T1 ')).resolves.toEqual({ status: false, message: '删除失败，请稍后再试', result: null })
    expect(mocks.remove).toHaveBeenCalledWith({ id: 'T1' })
  })

  it('returns success with a null result', async () => {
    mocks.remove.mockResolvedValue({ status: true, message: '', result: true })
    await expect(templateService.delete('T1')).resolves.toEqual({ status: true, message: '', result: null })
  })
})

describe('templateService draft bridges', () => {
  it('does not stage an invalid draft', () => {
    mocks.validateDraft.mockReturnValue('请先填写寄件人')
    expect(templateService.stageDraft(draft)).toBe('请先填写寄件人')
    expect(mocks.stage).not.toHaveBeenCalled()
  })

  it('stages a valid draft and consumes the staged copy', () => {
    expect(templateService.stageDraft(draft)).toBe('')
    expect(mocks.stage).toHaveBeenCalledWith(draft)
    expect(templateService.consumeStagedDraft()).toBe(draft)
  })

  it('carries the mapped draft into the express flow', () => {
    const mapped = { goods: { name: '文件' } }
    mocks.mapToDraft.mockReturnValue(mapped)

    templateService.prepareExpress(template)

    expect(mocks.mapToDraft).toHaveBeenCalledWith(template.raw)
    expect(mocks.carryFromTemplate).toHaveBeenCalledWith(mapped)
  })
})
