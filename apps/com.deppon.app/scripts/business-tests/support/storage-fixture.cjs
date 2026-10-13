const Taro = require('@tarojs/taro')

const { removeStorageValue } = require('@/cache/storage')

function createStorageFixture(t) {
  const disk = new Map()
  const touched = new Set()

  t.mock.method(Taro, 'getStorage', async ({ key }) => {
    if (!disk.has(key)) {
      throw new Error('Storage key does not exist')
    }

    return { data: disk.get(key) }
  })
  t.mock.method(Taro, 'setStorage', async ({ key, data }) => {
    touched.add(key)
    disk.set(key, data)
  })
  t.mock.method(Taro, 'removeStorage', async ({ key }) => {
    touched.add(key)
    disk.delete(key)
  })

  t.after(async () => {
    t.mock.restoreAll()
    await Promise.all([...touched].map(removeStorageValue))
  })

  return { disk, Taro }
}

module.exports = { createStorageFixture }
