const persistedStorage = new Map()

function unexpectedCall(name) {
  throw new Error(`Mock Taro.${name} explicitly in this test`)
}

const Taro = {
  async getStorage({ key }) {
    if (!persistedStorage.has(key)) {
      throw new Error('Storage key does not exist')
    }

    return { data: persistedStorage.get(key) }
  },
  async setStorage({ key, data }) {
    persistedStorage.set(key, data)
  },
  async removeStorage({ key }) {
    persistedStorage.delete(key)
  },
  getCurrentPages() {
    return []
  },
  showToast() {
    return Promise.resolve({})
  },
  request() {
    return unexpectedCall('request')
  },
  navigateTo() {
    return unexpectedCall('navigateTo')
  },
  redirectTo() {
    return unexpectedCall('redirectTo')
  },
  navigateBack() {
    return unexpectedCall('navigateBack')
  },
  switchTab() {
    return unexpectedCall('switchTab')
  }
}

module.exports = Taro
