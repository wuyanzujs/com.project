---
tags:
  - interface
  - api
  - member
aliases:
  - 查询 SVIP 信息
---

# 查询 SVIP 信息

返回 [[11-会员与E卡/00-模块总览|会员与 E 卡接口]]，也可以回到 [[00-接口总览]]。

## 接口说明

| 项目      | 说明                                                             |
| --------- | ---------------------------------------------------------------- |
| 用途      | 查询 SVIP 信息、积分、按钮文案和跳转地址。                       |
| 源码方法  | `memberApi.querySvipInfo`                                        |
| 源码位置  | `apps/com.deppon.app/src/services/member/member.api.ts:6`        |
| HTTP 方法 | `GET`                                                            |
| 接口路径  | `/gwapi/memberService/eco/member/grade/secure/getSvipNewestInfo` |
| 登录态    | 否                                                               |
| 请求类型  | `无`                                                             |
| 响应类型  | `MemberSvipRaw`                                                  |

## 请求字段

无请求体。

## 响应字段

类型：`MemberSvipRaw`。

| 字段      | 必填 | 类型     | 说明       |
| --------- | ---- | -------- | ---------- |
| `button`  | 否   | `string` | 按钮文案。 |
| `message` | 否   | `string` | 提示信息。 |
| `points`  | 否   | `number` | 积分。     |
| `status`  | 否   | `number` | 状态。     |
| `url`     | 否   | `string` | 跳转地址。 |
