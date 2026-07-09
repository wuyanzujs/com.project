---
tags:
  - interface
  - api
  - auth
aliases:
  - 生成临时 Token
---

# 生成临时 Token

返回 [[01-登录认证/00-模块总览|登录认证接口]]，也可以回到 [[00-接口总览]]。

## 接口说明

| 项目      | 说明                                                        |
| --------- | ----------------------------------------------------------- |
| 用途      | 生成临时 token，通常用于跳转 H5 或临时鉴权链路。            |
| 源码方法  | `authApi.generateTmpToken`                                  |
| 源码位置  | `apps/com.deppon.app/src/services/auth/auth.api.ts:44`      |
| HTTP 方法 | `GET`                                                       |
| 接口路径  | `/gwapi/userService/eco/user/token/secure/generateTmpToken` |
| 登录态    | 是                                                          |
| 请求类型  | `GenerateTmpTokenRequest`                                   |
| 响应类型  | `string`                                                    |

## 请求字段

类型：`GenerateTmpTokenRequest`。

| 字段     | 必填 | 类型     | 说明       |
| -------- | ---- | -------- | ---------- |
| `source` | 是   | `string` | 来源标识。 |

## 响应字段

响应类型：`string`。
