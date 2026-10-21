import { beforeEach, describe, expect, it, vi } from 'vitest'

import PrintListPage from '@/pages/print/list'

import { findElement, reactRuntime } from '../support/react-runtime'

const mocks = vi.hoisted(() => ({
  ensureAuthenticated: vi.fn(),
  getDateRangeOptions: vi.fn(),
  queryCounts: vi.fn(),
  queryList: vi.fn()
}))

const lifecycle = vi.hoisted(() => ({
  show: [] as Array<() => void>
}))

const dateOptions = [{ endTime: '2026-10-21 23:59:59', key: 'threeDays', label: '近3天', startTime: '2026-10-19 00:00:00', summary: '10月19日 至今' }]

vi.mock('react', () => ({
  get useCallback() {
    return reactRuntime.react.useCallback
  },
  get useEffect() {
    return reactRuntime.react.useEffect
  },
  get useMemo() {
    return reactRuntime.react.useMemo
  },
  get useRef() {
    return reactRuntime.react.useRef
  },
  get useState() {
    return reactRuntime.react.useState
  }
}))

vi.mock('@tarojs/components', () => ({
  View: 'View'
}))

vi.mock('@tarojs/taro', () => ({
  default: {},
  useDidShow: (callback: () => void) => lifecycle.show.push(callback)
}))

vi.mock('@/services/print', () => ({
  DEFAULT_PRINT_DATE_RANGE_KEY: 'threeDays',
  mergePrintOrderPages: (current: unknown[], incoming: unknown[], replace: boolean) => (replace ? incoming : [...current, ...incoming]),
  printService: {
    getDateRangeOptions: mocks.getDateRangeOptions,
    queryCounts: mocks.queryCounts,
    queryList: mocks.queryList
  }
}))

vi.mock('@/shared/components', () => ({
  AppPage: 'AppPage'
}))

vi.mock('@/shared/native', () => ({
  AppVirtualList: 'AppVirtualList'
}))

vi.mock('@/shared/navigation/authGuard', () => ({
  ensureAuthenticated: mocks.ensureAuthenticated
}))

vi.mock('@/shared/navigation/routes', () => ({
  APP_ROUTES: { printList: '/pages/print/list' }
}))

vi.mock('@/pages/print/list/components/PrintListControls', () => ({
  PrintListControls: 'PrintListControls'
}))

vi.mock('@/pages/print/list/components/PrintListStates', () => ({
  PrintListStates: 'PrintListStates'
}))

vi.mock('@/pages/print/list/components/PrintOrderCard', () => ({
  PrintOrderCard: 'PrintOrderCard'
}))

vi.mock('@/pages/print/list/index.scss', () => ({}))

function renderPage() {
  return reactRuntime.render(() => PrintListPage())
}

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

async function openPage() {
  renderPage()
  lifecycle.show.at(-1)?.()
  await flush()
  return renderPage()
}

beforeEach(() => {
  reactRuntime.reset()
  vi.clearAllMocks()
  lifecycle.show.length = 0
  mocks.ensureAuthenticated.mockReturnValue(true)
  mocks.getDateRangeOptions.mockReturnValue(dateOptions)
  mocks.queryList.mockResolvedValue({
    message: '',
    result: { list: [], pageIndex: 1, pageSize: 10, totalPage: 1, totalRows: 0 },
    status: true
  })
  mocks.queryCounts.mockResolvedValue({
    message: '',
    result: { failedSearchTypes: [], printed: 2, waiting: 1 },
    status: true
  })
})

describe('print list page service usage', () => {
  it('loads orders and counts through the print service', async () => {
    await openPage()

    expect(mocks.queryList).toHaveBeenCalledWith({
      pageIndex: 1,
      pageSize: 10,
      rangeKey: 'threeDays',
      searchType: '1'
    })
    expect(mocks.queryCounts).toHaveBeenCalledWith({ rangeKey: 'threeDays' })
  })

  it('queries the selected tab through the service', async () => {
    const view = await openPage()
    const controls = findElement(view, element => element.type === 'PrintListControls')

    controls.props.onStatusChange('2')
    await flush()

    expect(mocks.queryList).toHaveBeenLastCalledWith(expect.objectContaining({ searchType: '2' }))
  })

  it('surfaces the service failure message in the list states', async () => {
    mocks.queryList.mockResolvedValue({ message: '待打印订单同步失败', result: null, status: false })

    const view = await openPage()
    const list = findElement(view, element => element.type === 'AppVirtualList')
    const states = findElement(list.props.footer, element => element.type === 'PrintListStates')

    expect(states.props.errorMessage).toBe('待打印订单同步失败')
  })

  it('does not query before the login guard passes', async () => {
    mocks.ensureAuthenticated.mockReturnValue(false)

    await openPage()

    expect(mocks.queryList).not.toHaveBeenCalled()
    expect(mocks.queryCounts).not.toHaveBeenCalled()
  })
})
