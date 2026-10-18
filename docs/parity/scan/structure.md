# 扫一扫模块立项 + 生产端结构(dpapp/pages/scan)

生成:2026-10-18(M0;RN 侧无扫码入口页,随深挖一并立项)
来源:[dpapp-file-inventory.txt](../dpapp-file-inventory.txt) + libapp.so 字符串池。

## 立项说明

- **结论:RN 侧缺的不是扫码能力而是扫码入口页**——`shared/platform` 已有扫码 facade(AGENTS.md 边界规则:页面禁直调平台 API),routeRegistry 无扫码页。
- 新增路由建议:`pages/scan/index`,扫码结果路由映射表放 controller 同层,复用 `shared/platform` 扫码 facade 与相册选图权限链。
- 生产端仅 3 文件,预估 0.5–1 天对齐量级(不含扫码后各落地页联调)。

## 生产端文件树

```
pages/scan/
└─ index/  controller.dart + view.dart + widgets/scan.dart   # 扫码 + 结果路由分发
```

## 对齐要点

1. 生产端扫码入口位置(首页顶部/我的/查件页)需真机确认;RN 侧首页若有同位入口一并补。
2. 扫码结果分发:扫单号→查件、扫网点码→网点详情、扫活动码→H5——映射清单需抓包/真机确认,先按推断列占位。
3. 手电筒/相册识别按钮与扫码框视觉,走 dpshots 量测。
