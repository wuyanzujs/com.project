# 寄件模块生产端结构深挖(dpapp/pages/send)

生成:2026-10-18(M0 静态深挖;接口细节待 HAR,UI 细节待 dpshots 量测)
来源:`D:\rea-targets\dpapp-4.0.7.0.apk` libapp.so 字符串池 + [dpapp-file-inventory.txt](../dpapp-file-inventory.txt)。标注"推断"的结论来自文件/widget 命名,待验证。

## 概览

生产端第一大模块,102 个 Dart 文件,GetX 架构。子域:单件下单(42)、批量寄(25)、货物信息(14)、公共(9)、上门取件(7)、公益寄(3)、物流查询(2)。

## 生产端文件树

```
pages/send/
├─ express/                      # 单件下单(42)——核心中的核心
│  ├─ index/                     # 下单主表单页
│  │  ├─ controller.dart / interface.dart / utils.dart / view.dart
│  │  └─ widgets/
│  │     ├─ basic.dart           # (推断)基础布局骨架
│  │     ├─ contact.dart         # 寄件人/收件人卡片
│  │     ├─ identify.dart        # 地址识别粘贴识别
│  │     ├─ marquee.dart         # 顶部跑马灯公告
│  │     ├─ schedule.dart        # 预约上门取件时间
│  │     ├─ service.dart         # 服务产品选择区
│  │     ├─ encrypt.dart         # 加密附言(隐私号/加密)
│  │     ├─ tiles/               # 表单行(逐项折叠展开):cargo 货物、coupon 优惠券、
│  │     │                       #   delivery 送货、express 产品、furniture 家具(大件)、
│  │     │                       #   link 链接、payment 支付方式、pickup_time 取件时间、
│  │     │                       #   postman 指定快递员、product 产品介绍
│  │     ├─ bottom_sheet/        # coupon / ecard_introl / ecard_protocol(E卡) /
│  │     │                       #   encrypt / payment / postman / product_introl
│  │     └─ tips/                # coupon、extra_charge 超区加价、pickup_tips、
│  │                             #   recommend 推荐、sieve_stock_alert / sieve_stock_tips /
│  │                             #   sieve_tips(网点筛选库存提醒)、upscale 升级引导
│  └─ success/                   # 下单成功页(controller/view + bottom/content/postman/top)
├─ batch/                        # 批量寄(25)
│  ├─ express/                   # 批量下单表单:basic/bottom/consignee/contact/excel(Excel 导入)/top
│  ├─ cargo/                     # 批量货物:cargo_name/cargo_weight
│  ├─ service/                   # 批量服务:collection 上门/insurance 保价/signform 签收单
│  ├─ success/                   # 批量结果:bottom/list/postman/top
│  └─ common/utils.dart
├─ cargo/                        # 货物信息(14)
│  ├─ info/                      # info/mutil_volume 多件体积/packing 包装/query/remark 备注/weight
│  └─ query/                     # 货物名搜索:hot 热门/lately 最近/input/search
├─ common/                       # 模块公共(9)
│  ├─ ex_product.dart / macro.dart(常量) / pickup.dart / send.dart
│  └─ widgets/ bottom、cost 费用条、protocol 协议、real_auth 实名拦截、station 网点
├─ collection/                   # 上门取件(7)
│  ├─ index/                     # 预约入口(controller/view)
│  └─ express/                   # account 账号(推断:月结/到付)、amount、contact
├─ charitable/                   # 公益寄(3):enum + 主页
└─ logistics/                    # 物流(2):controller/view(推断:大件物流入口)
```

## 关键类(GetX,字符串池实证)

`SendExpressController`、`BatchCargoController`、`CargoInfoController`、`CargoQueryController`、`CollectionExpressController`

## 生产端形态要点(M1 gap 分析输入)

1. **表单是"行折叠"模式**:tiles/ 按行展开(货物、送货、支付、产品…),不是整页铺开——与 RN 现有 express/index 的分区方式需对照。
2. **tips 体系值得复刻**:超区加价、网点库存提醒(sieve_stock 三件套)、升级引导、取件提示,这些是下单转化率的细节。
3. **加密附言 encrypt** 有独立 widget + bottom_sheet,涉及隐私号能力。
4. **批量寄支持 Excel 导入**(batch/express/widgets/excel.dart)。
5. **货物名搜索有热词 + 最近使用**(cargo/query)。
6. **E 卡在下单页以 bottom_sheet 弹层出现**(ecard_introl/ecard_protocol),印证总计划"生产端 E 卡非独立页"。
7. **公益寄、大件物流是独立子入口**(charitable/logistics)。
8. 下单前有**实名拦截组件**(common/widgets/real_auth)与**协议组件**(protocol)。

## RN 现状对照(apps/com.deppon.app)

- 页面:`pages/express/index.tsx`(342 行)、`express/goods`、`express/success`、`express/template/*`、`express/insurance`、`pages/batch/index.tsx`(256 行)。
- service 已分层拆分(无巨石):`express.service.ts`(365)、`express.mutations.ts`(438)、`express.payload.ts`(407)、`express.draft.ts`(360)、`warehouse.rules.ts`(471)、`insurance.rules.ts`(464)、`productAvailability.rules.ts`(353)、`types.ts`(659)。
- 疑似缺口(待逐项核对,进 gaps.md):tiles 行折叠粒度、tips 全家桶、加密附言、Excel 批量导入、货物名热词、公益寄/物流入口、marquee 公告。

## 遗留

- 接口契约:等 HAR(见 [README](../README.md) 决策简报);明文 URL 未发现本模块专属接口路径。
- UI 细节:dpshots 量测后补 ui-measure.md。

## 2026-10-19 下单成功页结构对照

生产端 `express/success` 目录拆成 `controller/view` + `top/content/bottom/postman` 四块；RN 目前一个页面 + `CourierCard` 对应 postman，其余按 top（成功标识与标题）/content（寄件信息）/bottom（继续寄件 · 查看订单）落位。文案依据见 [gaps.md](./gaps.md) 的字符串实证表（`libapp.so` UTF-16LE 检索）。
