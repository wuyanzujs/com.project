const noDirectReactNative = require('./rules/no-direct-react-native')
const noServiceApiImport = require('./rules/no-service-api-import')
const noTaroPlatformApi = require('./rules/no-taro-platform-api')

module.exports = {
  rules: {
    'no-direct-react-native': noDirectReactNative,
    'no-service-api-import': noServiceApiImport,
    'no-taro-platform-api': noTaroPlatformApi
  }
}
