# 消息模块契约档案(message/api.md)

生成:2026-10-19(M2 立项实现)。来源:libapp.so 字符串池(UTF-16LE 中文 + ASCII 探针)+ endpoint-compare.txt。
状态:**端点已实证,请求/响应字段待抓包校准**(测试环境暂无法真机抓包,字段按探针最小化建模)。

## 端点(libapp.so 实证,endpoint-compare.txt 298-301 行)

| 端点 | 用途 | RN 实现 |
|---|---|---|
| `/gwapi/messageService/eco/message/intMsg/secure/fetchMessage` | 拉取站内消息列表 | messageApi.fetchMessages |
| `/gwapi/messageService/eco/message/intMsg/secure/markAsRead` | 单条已读 | messageApi.markAsRead |
| `/gwapi/messageService/eco/message/intMsg/secure/markAllAsRead` | 全部已读(清除未读) | messageApi.markAllAsRead |
| `/gwapi/messageService/eco/message/intMsg/secure/remove/msg` | 删除单条 | messageApi.removeMessage |

小程序侧无此域(messageService 仅 sendSmsMessage/gislocation),**契约只能靠抓包或 REA 反编译深入**,当前字段为 libapp.so 探针结果。

## 生产端结构与文案实证

- 页面:`pages/message/center`(MessageCenterController)+ `pages/message/list`(MessageListController/Ex)。
- 模型:`MessageGroupsEntity`/`MessageGroupsItemEntity`(分组)、`MessageItemEntity`/`MessageItemEntityEx`(列表项)、`MessageFileds`(字段表,生产端拼写如此)、`MessageMaketingItem`(营销消息,拼写如此)。
- 分组文案(UTF-16LE 串):**快递消息 / 系统消息 / 广播消息**;空态:**暂无最新快递消息 / 暂无最新系统消息 / 暂时没有最新消息哦 / 暂无在线消息**。
- 操作文案:**清除未读**、删除流(请选择要删除的消息 / 确定要删除这条记录吗 / 暂不删除 / 删除成功 / 删除失败，请稍后再试！)。
- 推送文案:「你有最新的消息」「德邦快递”将获取你的消息通知，用于推送订运单信息。」「消息推送授权」。
- 推送通道:**MobPush**(`com.mob.mobpush` methodChannel 实证,非个推/极光)。
- 入口:「我的」页右上气泡图标 + 数字未读角标(真机截图实证,角标值 3);另有 `ows/assets/home/notifi/*` 首页通知铃素材。
- 字符串池探针命中的字段名:messageId、messageType、groupId、groupName、isRead、readFlag、businessType、subType、sourceType、title、content、summary、sendTime、createTime、pageNum、pageSize。

## RN 实现(待联调校准项)

- `services/message/`:api(4 端点)+ mapper(分组/时间/已读归一)+ service(60s 列表缓存供角标与两页共用)。
- `pages/message/center`:分组卡片(图标/未读角标/最新摘要/时间)+ 清除未读。
- `pages/message/list`:分组消息列表(未读点/标题/内容/时间/删除,带运单号点击进订单详情)。
- 「我的」页气泡:接 messageCenter,未读数走 queryUnreadCount(失败回退常驻红点占位)。

**待抓包校准**:fetchMessage 请求体(分页/分组参数)、响应包裹结构(result 直出数组 vs 分页对象)、markAsRead/removeMsg 请求体字段名、分组是服务端下发还是客户端聚合(当前按客户端聚合实现,intMsg 域仅 4 端点支撑该设计)。联调时只需调整 `services/message/types.ts` 与 `message.mapper.ts`。

## 真机对照阻塞(2026-10-19)

设备 dcf44968(OPPO PDEM10,ColorOS)静默丢弃 adb 注入点击(input tap/swipe 均无效,截图正常),消息中心/列表生产真机形态截图需人工导航后 `MSYS_NO_PATHCONV=1 adb exec-out screencap -p` 抓取;量测口径 1440=design750×1.92。
