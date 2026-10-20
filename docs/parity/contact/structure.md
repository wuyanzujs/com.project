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

## 2026-10-19 地址簿列表真机对照（生产端 4.0.7.0）

同设备 `dcf44968` 生产端与 RN 逐项对照（证据 `.dpshots/rn-send-20261019/rn-contacts.png`、`rn-contact-edit.png`）。

- 已核一致：搜索框占位「请输入姓名/手机号/地址/公司名称」、卡片内「姓名 + 掩码手机号」、地址行、分割线、`默认地址` 单选 + `复制/编辑/删除`、底栏 `管理` + `创建新地址`、导航栏分享入口。
- 已修 1（功能）：地址展示拼接。生产端卡片为「省市区,乡镇+详址」（如 `上海上海市青浦区,徐泾镇徐祥路308号…`），RN 原来是 `province+city+county+town+address` 直接相连，且后端 `address` 已带乡镇前缀，导致出现「徐泾镇徐泾镇」「六里屯街道六里屯街道」这类重复。`getContactFullAddress` 改为省市区归一段、乡镇与详址归一段并用逗号分隔，拼前先去重复前缀。
- 已修 2（视觉）：列表页容器由 `surface='card'`（白底）改为 `surface='page'`（页面灰底），让白色圆角卡片与生产端一样从灰底上浮起；搜索条保持白底。
- 待核差异：生产端寄件页点「收件人」卡片进的是「收件人信息填写」页（粘贴并识别 / 从地址簿选择 / 保存到地址簿 / 历史地址），RN 直接进地址簿列表 —— 属交互路径差异，仍在 P1，未改。
- 待核差异：RN 编辑页用「设为默认地址」，生产端同位置为「保存到地址簿」，两者语义不同（是否入库 vs 是否默认），需确认 RN 是否需要在编辑页补默认地址开关。
## Gap 方向(进 gaps 评审)

1. 识别子流程:RN 目前识别嵌在编辑页,生产端有独立"识别→选择"两级,交互路径不同(P1)。
2. 历史联系人 sheet、查询页(P2,提效功能)。
3. shopping 电商地址导入(P3,先真机确认入口与使用频率)。
4. 编辑页视觉细节第二轮量测(首轮已过,补 recognize/town sheet 两个弹层)。

## 2026-10-19 创建/编辑地址页对照(生产端 4.0.7.0)

判定:生产端 `pages/contact/contact_detail` 是 **Flutter 原生页**(`prod-address-edit1/2.xml` 无 WebView),按量测对齐。证据 `.dpshots/rn-send-20261019/prod-address-edit1.{png,xml}`(新建)、`prod-address-edit2.{png,xml}`(编辑)、`prod-addressbook1.{png,xml}`(列表)。

| 项 | 生产端 | RN 本轮处理 |
|---|---|---|
| 导航标题 | 新建=`创建新地址`,编辑=`编辑联系人` | 已按状态切换(此前恒为「编辑联系人」) |
| 顶部提示 | 黄底「根据国家法律法规要求,寄件人姓名须与您提供的实名信息一致」 | 已一致 |
| 识别卡 | 多行输入 + 语音识别/图片识别 + 右侧「粘贴并识别」**纯品牌蓝**胶囊 | 已把渐变按钮改成纯品牌蓝 |
| 姓名/电话 | 同一行「真实姓名」「固话/手机号」,新建时额外显示「分机号」列,最右固定「通讯录」图标 | 已改占位文案、补分机号列、通讯录移到行尾 |
| 地区/城市 | 单行「地区/城市」,右侧「定位」 | RN 仍是省/市/区三个输入框:缺少城市选择器,列为已知差异 |
| 详细地址 | 占位「详细地址（如街道、门牌号、小区等）」 | 已对齐文案 |
| 公司名称 | 「公司名称（选填）」 | 已一致 |
| 设为默认地址 | 蓝色勾选圆点 + 右侧「清空」 | 已一致 |
| 底部按钮 | 通栏纯品牌蓝「确定」 | 已去掉渐变,改纯品牌蓝 |
| 校验提示 | 页面内不展示,提交时 toast | 已删除行内校验块 |

结案:此前待确认的「保存到地址簿 vs 设为默认地址」在生产端不存在二选一,编辑页只有「设为默认地址」一个语义。

## 2026-10-19 地址页「地区/城市」城市选择器（新增组件）

生产端 4.0.7.0 的地址页地区行是**整行可点的选择器**（不是三个输入框），点击后弹出底部弹层
（证据：`.dpshots/rn-send-20261019/prod-address-edit4.xml`、`prod-citypicker1.{png,xml}`）。

| 项 | 生产端实测 | RN 实现 |
|---|---|---|
| 地区行 | 文本「上海 上海市 青浦区」（空格拼接）+ 右侧箭头，右侧另有「定位」 | 同款 `contact-edit-region-picker`，空态显示占位「地区/城市」 |
| 弹层 | 底部弹层，白色、上圆角，标题「选择城市」+ 右上圆形关闭按钮 | `RegionPicker`，绝对定位覆盖整页 + 半透明遮罩 |
| 搜索 | 灰色药丸输入框，占位「请输入省份/城市/区县搜索」 | 同款，支持省/市/区三级关键字 |
| 热门城市 | 6 个描边药丸，两行三列：上海市/北京市/广州市/深圳市/杭州市/苏州市 | 同款，直接定位到「省 + 市」，无区县时直接回填 |
| 层级 | 「请选择省份」蓝色高亮 + 蓝色下划线，逐级进入市、区县 | 同款，已选层级可点回退 |
| 列表行 | 全宽、行高约 90、hairline 分隔 | 同款 |

数据源与生产端一致：`https://ca.deppon.com/ows/static/common/cityData/city-receiver.json`（287 KB，nation→province→city→county，取 nationCode=100000 的中国）。
RN 侧分层：`region.api.ts`（远程 JSON + 进程内缓存）→ `region.rules.ts`（归一化/拼接/搜索/热门城市）→ `region.service.ts`（页面唯一入口，规避 `check-rn-boundaries` 对「页面直连 api」的限制）→ `RegionPicker` 组件。
