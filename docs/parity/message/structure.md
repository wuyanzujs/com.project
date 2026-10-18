# 消息模块立项 + 生产端结构(dpapp/pages/message)

生成:2026-10-18(M0;本模块是 RN 侧唯一整模块缺口,随深挖一并立项)
来源:[dpapp-file-inventory.txt](../dpapp-file-inventory.txt) + libapp.so 字符串池。

## 立项说明

- **结论:RN 侧 routeRegistry 无任何 message 页面,需新增**;生产端体量很小(仅 2 页),预估 1–2 天对齐量级(不含接口联调)。
- 新增路由建议:`pages/message/center/index`(消息中心)、`pages/message/list/index`(分类消息列表),走 routeRegistry 单源注册;是否登录态、是否入 tab 容器,按生产端真机形态确认。
- 数据源:`package:dpapp/common/api/message.dart`(生产端 API 层有独立 message 接口文件);**推送通道在原生层**,后续用 REA jadx 命令挖推送插件(个推/极光类)确认到达路径。
- 阻塞:接口契约等 HAR;推送联调等原生通道确认。

## 生产端文件树

```
pages/message/
├─ center/  controller.dart + view.dart      # 消息中心(推断:分类聚合入口)
└─ list/    controller.dart + view.dart      # 消息列表(推断:按分类进入)
```

## 对齐要点

1. 先真机确认消息中心入口位置(推测在"我的"或首页顶部铃铛)与两级页面关系。
2. 消息点击落地形态(原生页 vs H5/webview)决定 RN 实现成本,量测时一并确认。
3. 未读数角标属首页/我的跨模块状态,立项时预留 service 层未读数接口位。
