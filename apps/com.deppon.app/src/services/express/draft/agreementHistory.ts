/**
 * 生产 APK 4.0.7.0 assets/jsons/protocol.json 中的历史版本链接。
 * 仅保留去重后的历史入口；现行协议仍通过运行时 WebView 配置打开。
 * 原数组 12 项，其中 v1.8 重复；取证见 docs/parity/send/2026-10-20-production-implementation-analysis.md。
 */
export const EXPRESS_AGREEMENT_HISTORY = [
  {
    title: '2025年9月30日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.10'
  },
  {
    title: '2025年7月15日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.9'
  },
  {
    title: '2024年12月17日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.8'
  },
  {
    title: '2024年10月14日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.7'
  },
  {
    title: '2024年7月30日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.6'
  },
  {
    title: '2024年5月31日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.5'
  },
  {
    title: '2024年3月5日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.4'
  },
  {
    title: '2023年10月24日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.3'
  },
  {
    title: '2023年9月2日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.2'
  },
  {
    title: '2022年12月20日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.1'
  },
  {
    title: '2022年7月5日 《电子运单服务协议》',
    url: '/depponmobile/protocol/service/v1.0'
  }
] as const
