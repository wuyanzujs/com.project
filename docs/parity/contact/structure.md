# 地址簿模块生产端结构深挖(dpapp/pages/contact)

生成:2026-10-18(M1;接口参照 = mp-taro3 小程序源码,生产端 libapp.so 实证)
来源:[dpapp-file-inventory.txt](../dpapp-file-inventory.txt)、[mp-api-inventory.txt](../mp-api-inventory.txt)。标注"推断"待真机/量测验证。

## 生产端文件树(32 文件)

```
pages/contact/
├─ contact_list/            controller + view + widgets(contact_bottom/contact_item)
├─ contact_detail/          controller + view + extension + widgets/
│                           contact_detail_bottom / _filter(筛选)/ _identify(识别) /
│                           _info / _list / recognize_sheet(识别结果弹层)
├─ contact_identify/        controller + view            # 地址识别独立流程页
├─ contact_identify_list/   controller + view + item     # 识别结果选择列表
├─ contact_query/           controller + view + item/top # 联系人查询页
├─ shopping/                analysis + detail + common(constants/enum)
│                           # (推断:电商/采购地址导入与解析)
├─ common/                  enum.dart
└─ widgets/                 contact_history_sheet(历史联系人)、contact_town_sheet(乡镇选择)
```

## 形态要点

1. **地址识别是完整子流程**:粘贴识别(contact_identify)→ 结果列表选择(contact_identify_list)→ 编辑页内嵌识别(contact_detail/_identify + recognize_sheet),依赖 addressAiResolution(addressAiResolutionApi)与 addressImagine(联想)。
2. **乡镇选择独立 sheet**(contact_town_sheet,queryTownByCounty)——RN 编辑页已有对应实现,细节对齐量测。
3. **历史联系人 sheet**(contact_history_sheet)与**查询页**(contact_query)是 RN 侧未见的功能形态。
4. **shopping 子模块**(analysis/detail)推断为电商地址导入:解析收货地址并入库,生产端专属能力,RN 无对应,需真机确认入口位置与形态。

## 接口参照(小程序 api/contact.ts,11 端点)

| 能力 | 端点(gwapi) | RN 状态 |
|---|---|---|
| 列表/删除/批量删 | userService/.../contact/secure/queryContact、deleteContact、batchDeleteContact | ✅ 已接 |
| 默认联系人/计数 | queryDefaultContact、queryContactTotal | ✅ 已接 |
| 新增/更新 | insertContact、updateContact | ✅ 已接(RN 多于小程序清单) |
| 明细地址校验 | checkAddressIsDetail | ✅ 已接 |
| 距离推荐 | addressMinDistanceAnalysis | ✅ 已接 |
| AI 识别 | onlineService/.../addressAiResolutionApi/addressAiResolution、addressCodingDirections | ✅ 已接 |
| 联想/乡镇 | queryService/.../addressImagine、addressImagineTown、city/queryTownByCounty | ✅ 已接 |

**结论:地址簿接口层零缺口**(RN 14 个端点 ⊇ 小程序 11 个)。剩余 gap 全在功能形态与视觉层。

## RN 现状对照(apps/com.deppon.app)

- contact/list、contact/edit 两页,**列表与编辑页视觉已按生产端对齐**(2026-10 git 记录)。
- 推断缺口:识别结果选择列表页、查询页、历史联系人 sheet、shopping 电商导入、详情页筛选(filter)。

## Gap 方向(进 gaps 评审)

1. 识别子流程:RN 目前识别嵌在编辑页,生产端有独立"识别→选择"两级,交互路径不同(P1)。
2. 历史联系人 sheet、查询页(P2,提效功能)。
3. shopping 电商地址导入(P3,先真机确认入口与使用频率)。
4. 编辑页视觉细节第二轮量测(首轮已过,补 recognize/town sheet 两个弹层)。
