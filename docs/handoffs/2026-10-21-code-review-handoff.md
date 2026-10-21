# 工作交接：master 相对 origin/master 的代码审查与文档路径修复

- 日期：2026-10-21
- 项目：`D:\codeSpace\com.project`
- 当前分支：`master`
- 当前 HEAD：本交接提交；新对话开始时以 `git log -5 --oneline --decorate` 为准
- 对比基线：`origin/master`，merge base `e0912e9ee4c7f1fc8aff0dfe5e9c1284d4aa15ad`

## 本轮目标

审查 `master` 相较 `origin/master` 的变更，重点检查 express/order service 目录迁移是否遗漏 import、导出、测试路径或相对路径层级错误。

## 已完成工作

1. 审查了 `f682a92 refactor: organize express and order services` 的完整 diff。
2. 核对 express/order 服务目录迁移后的导出入口、深层相对 import、业务测试 require 路径和 RN 边界脚本。
3. 发现并修复文档中的旧源码路径引用。涉及：
   - `apps/com.deppon.app/readme.md`
   - `docs/rn-refactor-plan.md`
   - `docs/project-reading-guide.md`
   - `docs/handoffs/**/*.md`
   - `docs/interfaces/**/*.md`
   - `docs/parity/**/*.md`
4. 已精确扫描确认 markdown/README 中不再残留本次迁移前的 express/order 服务路径。

## 相关提交

- `f682a92 refactor: organize express and order services`
  - 将 express 按 `core/billing/delivery/draft/goods/insurance/packaging/pickup/product/success/value-added/warehouse` 分域。
  - 将 order 按 `core/detail/dispatch/edit/evaluation/feedback/stub/subscription/survey` 分域。
  - 同步更新入口导出、业务测试和 RN 边界检查路径。
- `748bcf0 docs: update service paths`
  - 更新所有已知旧路径文档引用。
  - 提交钩子对 49 个文档文件执行了 Prettier。

## 验证结果

本轮审查期间已通过：

- `pnpm --filter com.deppon.app typecheck`
- `pnpm --filter com.deppon.app lint`
- `pnpm --filter com.deppon.app check:rn-boundaries`
- `pnpm --filter com.deppon.app check:routes`
- `pnpm --filter com.deppon.app check:module-size`
- `pnpm --filter com.deppon.app check:business-rules`：362 pass / 0 fail
- `pnpm exec prettier --check "docs/**/*.md" "apps/com.deppon.app/readme.md"`
- `git diff --check`

没有运行 RN bundle、Gradle、Xcode 或 APK 安装验证。

## 当前工作区状态

`AGENTS.md` 有一处未提交修改，内容是用户新增的图片处理边界规则。该修改不是本轮产生的，不要回滚、覆盖或擅自提交。

新对话开始后先执行：

```powershell
cd D:\codeSpace\com.project
git status --short
git log -5 --oneline --decorate
```

## 后续建议

后续任务可按项目 AGENTS.md 中的优先级继续：

1. 稳定 Node/pnpm/CI 版本和验证入口。
2. 清理模板 CI 与发布配置。
3. 路由注册表单源化并增加一致性检查。
4. 为请求、缓存、路由、登录守卫和核心业务规则补测试。
5. 继续拆分 order/express/invoice 巨石 service 和页面。
6. 建立 `src/styles` token 与通用样式入口。
7. 继续治理 runtime 配置和 README。

如继续处理本次目录重构，优先确认新增文件路径和文档路径同步规则；新增模块后应同时更新 `src/services/*/index.ts`、业务测试 require 路径、边界检查脚本及相关交接文档。
