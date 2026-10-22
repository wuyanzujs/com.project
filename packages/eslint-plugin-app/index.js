const noDirectReactNative = require('./rules/no-direct-react-native')
const noPageBusinessDecisions = require('./rules/no-page-business-decisions')
const noServiceApiImport = require('./rules/no-service-api-import')
const noTaroPlatformApi = require('./rules/no-taro-platform-api')
const requiredComponentSource = require('./rules/required-component-source')
const requiredImportSource = require('./rules/required-import-source')

module.exports = {
  rules: {
    'no-direct-react-native': noDirectReactNative,
    'no-page-business-decisions': noPageBusinessDecisions,
    'no-service-api-import': noServiceApiImport,
    'no-taro-platform-api': noTaroPlatformApi,
    'required-component-source': requiredComponentSource,
    'required-import-source': requiredImportSource
  }
}
