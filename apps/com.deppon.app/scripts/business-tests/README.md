# 业务测试

业务规则和集成测试使用 Node.js 自带的 `node:test`，不新增测试框架依赖。`scripts/check-business-rules.cjs` 只负责发现测试文件、选择领域和启动运行器，继续由 `pnpm verify:app` 调用。

## 运行

仓库根目录运行全部测试：

```bash
pnpm check:app-business-rules
```

按领域运行，可同时指定多个领域：

```bash
pnpm --filter com.deppon.app run check:business-rules cache auth
pnpm --filter com.deppon.app run check:business-rules express order
pnpm --filter com.deppon.app run check:business-rules flows
```

未知领域会报错退出，不会静默跳过。运行器固定测试时区为 `Asia/Shanghai`，每个文件在独立进程中运行，最多同时运行四个文件。同一文件内测试顺序执行，避免旧用例临时替换 API 时相互干扰。

## 目录

```text
business-tests/
  <domain>/*.test.cjs     领域规则和场景测试
  cache/                 持久化失败、并发、过期和启动恢复
  auth/                  登录、账号隔离及失败后的会话恢复
  request/               HTTP 请求、cookie、401 和限流集成测试
  async/                 请求竞争和失效处理
  flows/                 登录、寄件、订单查询和退出的服务集成流程
  fixtures/              各领域的示例数据和草稿工厂
  support/               测试运行时、平台替身和异步辅助工具
```

新增用例放入对应领域的 `.test.cjs`，不要继续写进检查入口。一个文件只覆盖一个明确主题，超过 600 行时继续按规则或业务场景拆分；运行入口会检查这个预算。

## 编写约定

首先加载 `../support/register.cjs`，随后使用 `node:test` 和 `node:assert/strict`。简单测试直接调用 `test(name, async t => { ... })`；迁移的旧用例保留了原来的 `cases` 数组。

`support/register.cjs` 使用 Node 的公开 `registerHooks` 解析 `@/`、转换应用 TypeScript，并将 Taro 替换为可控的平台替身。它不修改 `Module._resolveFilename`。这里的转换只用于执行测试，类型校验仍由正式门禁里的 `tsc --noEmit` 完成。

新增测试通过 `t.mock.method` 替换依赖，用 `t.after` 清理事件监听和运行时配置，不再手工保存、恢复全局方法。缓存测试使用 `createStorageFixture(t)`，分别断言内存缓存和持久化数据；异步竞争使用 `createDeferred()` 控制完成顺序，避免依赖实际等待时间。

平台替身不访问网络、设备或用户缓存。`flows` 测试只替换 HTTP/持久化边界，保留真实的 service、API、请求归一和数据转换链路；它们属于服务集成测试，不代表 Android/iOS 真机 UI 或原生 SDK 验证。

## 缓存和退出约定

`setStorageValue`、`removeStorageValue` 只在持久化成功后提交内存状态，失败返回 `false` 并保留旧值。同一个 key 的读取初始化、写入和删除按调用顺序执行，不同 key 可以并行。需要立刻读取新缓存或跳转到依赖新缓存的页面时，调用方必须等待写入完成。

会话清理会先停用当前凭证，再写入持久化失效标记。cookie 或原生 cookie 清理失败时保留该标记，启动和原生恢复流程不会再次使用旧 cookie；成功清理或重新登录后才移除标记。整个存储介质不可写且不可删除时，无法保存任何持久化证明，但当前进程仍会停用凭证并返回清理失败，退出界面会明确提示重试。

`clearAppSession()` 返回清理结果，`authService.logout()` 在清理不完整时抛出可展示的错误。用例应覆盖失败、重试、账号切换以及冷启动；`auth/session-failures.test.cjs` 使用独立子进程验证失效标记跨重启生效。
