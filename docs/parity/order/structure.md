# 订单模块生产端结构深挖(dpapp/pages/order)

生成:2026-10-18(M0 静态深挖;接口细节待 HAR,UI 细节待 dpshots 量测)
来源:`D:\rea-targets\dpapp-4.0.7.0.apk` libapp.so 字符串池 + [dpapp-file-inventory.txt](../dpapp-file-inventory.txt)。标注"推断"的结论来自文件/widget 命名,待验证。

## 概览

61 个 Dart 文件,GetX 架构。比 RN 侧多出四块能力:**游客查件、催件、运单详情(区别于订单详情)、电子存根附件预览**;另有地图轨迹与 NPS 评价。

## 生产端文件树

```
pages/order/
├─ order_detail/                 # 订单详情(17 个 widget)
│  ├─ controller.dart / view.dart
│  └─ widgets/
│     ├─ header / drawer(推断:更多操作抽屉)/ master(推断:主运单聚合)
│     ├─ map.dart                # 地图轨迹
│     ├─ track.dart              # 轨迹列表
│     ├─ postman.dart / station.dart / accept.dart / notifi.dart(推送通知开关?)
│     ├─ nps.dart                # NPS 评价入口
│     ├─ urge.dart               # 催件入口
│     └─ actions/ allot(转寄?)、invalid(作废)、sign(签收)、transit(在途)
├─ order_list/                   # 订单列表(empty/order_item)
├─ order_query/                  # 游客查件(无需登录):filter/history/login(登录引导)/
│                                #   movable(悬浮球?)/query
├─ order_urge/                   # 催件独立页:feedback/info/list
├─ waybill_info/                 # 运单详情(与订单详情分离):file/images/screenshot
│                                #   (推断:电子存根附件:文件/图片/截图)
├─ order_stub/                   # 电子存根(controller/view)
├─ order_info/                   # 订单信息页(controller/view)+ interface/order_info.dart
├─ order_edit / order_modify     # 编辑/修改订单(各 controller/view)
├─ common/                       # enum、extension(ex_detail/ex_follow 关注/ex_order)、
│                                # interface.dart、order.dart、service.dart、waybill.dart
└─ widgets/                      # 跨页共用:cannot(不可操作态?)、cannot_sheet、contact、
                                 # order_base_info、order_info_item、waybill_base_info
```

## 关键类(GetX,字符串池实证)

`OrderMapController`、`OrderModifyController`、`OrderStubController`

## 生产端形态要点(M1 gap 分析输入)

1. **查件双形态**:order_list(登录态订单)+ order_query(游客输单号查,带历史查询与登录引导)——RN 侧 order/list 是否覆盖游客形态需核对。
2. **催件是独立闭环**(order_urge:列表/详情/反馈),RN 侧无 urge 页面。
3. **订单详情与运单详情分离**(order_detail vs waybill_info),运单详情带附件预览(电子存根 file/images/screenshot)。
4. **订单操作集在详情页 actions/**:allot/invalid/sign/transit,另有 cannot 不可操作态组件。
5. **地图轨迹**(OrderMapController + map.dart)与轨迹列表并列。
6. **关注运单**有专属 extension(ex_follow)——RN 有 pages/order/subscriptions,逻辑需对照。
7. **NPS 评价入口在详情页**(nps.dart),与独立评价页并存。

## 生产端部分操作走 H5(libapp.so 明文实证)

`www.deppon.com/depponmobile/` 下:`mow/order/modifyOrder`、`mow/order/modifyNew/index`、`mow/order/cancel`、`mow/order/orderMulti`(多单)、`mow/send/warehouse/index`。

→ **生产端"修改订单/取消订单"存在 H5 形态**,RN 侧已有原生 order/edit 与 order/cancel 页,对齐时需决策:保持原生实现(体验更优)还是跟随生产端 H5 形态;若原生,接口契约必须抓包核实(生产端原生层未必再调这些接口)。

## RN 现状对照(apps/com.deppon.app)

- 页面:order/list(324 行)、order/detail(135 行,已组件化)、order/evaluation、order/edit、order/subscriptions、order/cancel、order/stub。
- service 已分层:`order.edit.ts`(390)、`order.edit.schedule.ts`(434)、`order.sceneSurvey.rules.ts`(420)、`order.detailActions.ts`(386)、`order.stubView.ts`(387)、`types.ts`(618)。
- 疑似缺口(进 gaps.md):游客查件 order_query、催件 order_urge、waybill_info 运单详情、详情页 actions 全集、地图轨迹、NPS。

## 遗留

- 接口契约:等 HAR;地图轨迹接口可能依赖原生地图 SDK(jadx 层可再挖 OrderMapController 对应插件)。
- UI 细节:dpshots 量测后补 ui-measure.md。
