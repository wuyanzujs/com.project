---
tags:
  - interface
  - api
  - auth
aliases:
  - 校验登录 Token
---

# 校验登录 Token

返回 [[01-登录认证/00-模块总览|登录认证接口]]，也可以回到 [[00-接口总览]]。

## 接口说明

| 项目      | 说明                                                   |
| --------- | ------------------------------------------------------ |
| 用途      | 校验本地 ECO_TOKEN 是否仍然有效，用于静默判断登录态。  |
| 源码方法  | `authApi.checkEcoToken`                                |
| 源码位置  | `apps/com.deppon.app/src/services/auth/auth.api.ts:26` |
| HTTP 方法 | `GET`                                                  |
| 接口路径  | `/gwapi/userService/eco/user/secure/checkEcoToken`     |
| 登录态    | 默认是                                                 |
| 请求类型  | `无`                                                   |
| 响应类型  | `无`                                                   |

## 请求字段

无请求体。

## 响应字段

无结构化字段。
