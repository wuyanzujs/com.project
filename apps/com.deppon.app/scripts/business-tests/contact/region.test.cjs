require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  createRegionSelection,
  findHotCity,
  formatRegionLabel,
  normalizeRegionTree,
  REGION_HOT_CITIES,
  searchRegions
} = require('@/services/contact/region.rules')

const FIXTURE = [
  {
    nationCode: '100000',
    nationName: '中国',
    province: [
      {
        provinceCode: '310000',
        provinceName: '上海',
        city: [
          {
            cityCode: '310000-1',
            cityName: '上海市',
            county: [
              { countyCode: '310120', countyName: '奉贤区' },
              { countyCode: '310113', countyName: '宝山区' }
            ]
          }
        ]
      },
      {
        provinceCode: '440000',
        provinceName: '广东省',
        city: [
          {
            cityCode: '440100',
            cityName: '广州市',
            county: [
              { countyCode: '440103', countyName: '荔湾区' },
              { countyCode: '440104', countyName: '越秀区' }
            ]
          },
          {
            cityCode: '440300',
            cityName: '深圳市',
            county: [{ countyCode: '440303', countyName: '罗湖区' }]
          }
        ]
      }
    ]
  },
  {
    nationCode: '8400000',
    nationName: '丹麦',
    province: []
  }
]

test('region tree keeps only China with province, city and county levels', () => {
  const provinces = normalizeRegionTree(FIXTURE)

  assert.deepEqual(
    provinces.map(item => item.name),
    ['上海', '广东省']
  )
  assert.deepEqual(
    provinces[1].cities.map(item => item.name),
    ['广州市', '深圳市']
  )
  assert.deepEqual(
    provinces[1].cities[0].counties.map(item => item.name),
    ['荔湾区', '越秀区']
  )
})

test('region tree tolerates empty or malformed payloads', () => {
  assert.deepEqual(normalizeRegionTree(null), [])
  assert.deepEqual(normalizeRegionTree([]), [])
  assert.deepEqual(normalizeRegionTree([{ nationCode: '100000', province: [{ provinceName: '' }] }]), [])
})

test('region label joins province city and county with spaces', () => {
  assert.equal(formatRegionLabel('上海', '上海市', '青浦区'), '上海 上海市 青浦区')
  assert.equal(formatRegionLabel('广东省', '广州市', ''), '广东省 广州市')
  assert.equal(formatRegionLabel('', '', ''), '')
})

test('region selection drops counties that do not belong to the chosen city', () => {
  const provinces = normalizeRegionTree(FIXTURE)

  assert.deepEqual(createRegionSelection(provinces, '上海', '上海市', '奉贤区'), {
    cityName: '上海市',
    countyName: '奉贤区',
    label: '上海 上海市 奉贤区',
    provinceName: '上海'
  })

  assert.equal(createRegionSelection(provinces, '上海', '上海市', '荔湾区').countyName, '')
  assert.equal(createRegionSelection(provinces, '不存在的省', '上海市', '').provinceName, '')
})

test('region search matches province city and county keywords', () => {
  const provinces = normalizeRegionTree(FIXTURE)

  assert.deepEqual(
    searchRegions(provinces, '广东').map(item => item.label),
    ['广东省']
  )
  assert.deepEqual(
    searchRegions(provinces, '深圳').map(item => [item.kind, item.label]),
    [['city', '广东省 深圳市']]
  )
  assert.deepEqual(
    searchRegions(provinces, '越秀').map(item => [item.kind, item.label]),
    [['county', '广东省 广州市 越秀区']]
  )
  assert.deepEqual(searchRegions(provinces, '  '), [])
  assert.deepEqual(
    searchRegions(provinces, '区').map(item => item.label),
    ['上海 上海市 奉贤区', '上海 上海市 宝山区', '广东省 广州市 荔湾区', '广东省 广州市 越秀区', '广东省 深圳市 罗湖区']
  )
})

test('region search respects the result limit', () => {
  const provinces = normalizeRegionTree(FIXTURE)

  assert.equal(searchRegions(provinces, '区', 2).length, 2)
})

test('hot cities resolve to the province and city pair', () => {
  const provinces = normalizeRegionTree(FIXTURE)

  assert.deepEqual(REGION_HOT_CITIES, ['上海市', '北京市', '广州市', '深圳市', '杭州市', '苏州市'])
  assert.equal(findHotCity(provinces, '上海市').province.name, '上海')
  assert.equal(findHotCity(provinces, '深圳市').city.code, '440300')
  assert.equal(findHotCity(provinces, '北京市'), null)
})
