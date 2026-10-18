# 交接文档:生产端深挖与对齐(M2 进行中)

日期:2026-10-18。交接原因:重启 ZCode 以加载 REA MCP 工具(本会话中途安装,MCP 只在会话启动时注入)。
阅读顺序:本文 → [总计划](../plans/2026-10-18-production-parity-deep-dive.md) → [docs/parity/README.md](../parity/README.md)(状态表与数据基线)。

## 一句话现状

生产 App(dpapp 4.0.7.0,Flutter/GetX)的结构、接口、UI 三线深挖已完成 M0/M1 并落盘 `docs/parity/`;M2(逐项对齐实现)刚起步:原生改单 5 端点已接入代码并通过 typecheck,**变更未提交**。

## 已定决策(不要重新讨论)

1. **HAR 先跳过**:接口契约用 mp-taro3 小程序源码(`D:\10531845\Desktop\CZH-DEV\mp-taro3`,`src/api/*.ts` 共 201 端点,已抽至 `docs/parity/mp-api-inventory.txt`)× 生产端 libapp.so 实证(160)交叉验证;生产∩小程序 127,同一网关体系(`/gwapi/<service>/eco/...`)。
2. **运单改单保持原生**:接 `wayBill/modify` 端点组,不跟随生产端 H5 形态(mow/order/*)。
3. REA 走用户级配置(`~/.zcode/cli/config.json` → mcp.servers.rea),CLI(`npx rea-agents@6.5.0 <cmd>`)与 MCP 等效,随时可兜底。

## 环境与资产

| 资产 | 位置/说明 |
|---|---|
| REA 6.5.0 MCP | 新会话应出现 207 个 `mcp__rea__*` 工具;验收:让 agent 调一个,或 设置→MCP 看 rea 已连接;CLI 侧 `npx rea-agents@6.5.0 mcp doctor` |
| jadx 引擎 | `C:\Users\10531845\.local\share\rea\android\jadx-headless-mcp-0.7.1-all.jar`(SHA-256 已验),`REA_JADX_MCP_JAR` 已 setx,doctor healthy |
| 生产 APK | `D:\rea-targets\dpapp-4.0.7.0.apk`(勿入库);snapshot hash `78da37fed6bf1489361a312568249f3f` |
| 小程序源码 | `D:\10531845\Desktop\CZH-DEV\mp-taro3`(Taro 3,接口层 `src/api/`,实体 `src/type/`) |
| 真机 | `dcf44968` 已连,生产 dpapp 4.0.7.0 已装;每 9 分钟有防息屏 adb tap 自动化在跑,勿重复创建 |
| 临时产物 | `%TEMP%\dpapp-dart-aot.txt`(字符串池全文)、`endpoint-compare.txt`(三方端点对比明细,含 RN-MISS 全清单) |

## 数据基线(2026-10-18 修正)

- 小程序 201 / 生产 160 / **RN 已接 128,缺 109**(全量明细 `endpoint-compare.txt` 按服务域)。
- 缺口 Top:onlineService 29、user/waybill/order/query/pricetime 各 9-12、messageService 7;commentService 全覆盖;wechatService 5 个为小程序容器专属,RN 豁免。
- **grep 盲区警告**:RN 用 `*_API_ROOT` 常量拼接端点(template/courier),正则扫 URL 会漏;已人工补扫 7 个。
- 已核实"其实已接":催件(urgeOrder/orderUrgent v2)、评价(commentService 全套 + courier/evaluation)、订单模板 3/4、取件时间窗(dispatchTimeByDeptCode/New)。
- 真实大缺口:wayBill/modify 改单域(已接)、wayBill/abnormal 异常上报×2、trackService 快递员实时位置×2、pricetime 券推荐/物料/批量上传、messageService 消息域 7 个。

## 未提交变更(重启前建议先 commit)

```
M  apps/com.deppon.app/src/services/order/order.api.ts   # +运单改单域 5 方法
M  apps/com.deppon.app/src/services/order/types.ts       # +改单请求/响应 6 类型
?? docs/parity/                                          # 全部档案 + 端点清单
?? docs/plans/2026-10-18-production-parity-deep-dive.md   # 总计划
```

代码改动已过 `pnpm typecheck:app`;文档与代码建议分开提交(深挖只读产物 vs 实现改动)。

## M2 剩余任务(按优先级)

1. **send P0**:下单页券推荐 `pricetimeService/eco/pricetime/secure/queryCouponRecommend` 接入(先 dpshots 量测 tiles/coupon 视觉)。
2. **send P0**:图形验证码链路(captcha getCaptchaAction/checkCaptchaAction + 生产端 encrypt_util 加密逻辑移植)。
3. **send P0**:下单表单 tiles 行折叠粒度对照(生产端 10 种 tile + tips 全家桶,逐个真机截图对照)。
4. **order P0**:详情页操作集对照(allot/sign/transit + cannot 不可操作态;invalidWaybill 已接)。
5. **order**:改单 UI 入口接线(5 端点已就绪,差详情页触发场景;需真机确认哪些状态出现受理改单/改价)。
6. **pay**:E 卡支付通道(queryIsPreCardPay/preCardConfirm)+ 月结交互(month_sheet)。
7. 新增页:消息(message/center+list,接口 intMsg×4)、扫一扫(scan,走 shared/platform facade)。

**UI 类任务前置动作**:真机停在生产端对应页面 → `MSYS_NO_PATHCONV=1 adb exec-out screencap -p > <Windows路径>.png`(Git Bash 下目标必须 Windows 形式路径)→ 存 `.dpshots/` 按 1440=design750×1.92 口径量像素 → 对照后改码 → Metro 热更新 force-stop 验证。

## 已知坑(全部踩过,勿重蹈)

- Git Bash 的 grep 实为 ugrep:模式以 `/` 开头会被当 flag,加 `--` 或去掉前导斜杠。
- adb 拉文件:命令加 `MSYS_NO_PATHCONV=1`,本地目标写 Windows 路径(如 `C:/Users/.../x.png`)。
- Windows 版 python 读不到 Git Bash 的 `/tmp`,路径用 `cygpath -w` 换算后传环境变量。
- libapp.so 里中文是 `\uXXXX` 转义,搜文案要搜转义序列;URL/路径类 ASCII 字符串直接 `grep -aoE`。
- AGENTS.md 全部约束有效(平台能力走 shared/platform、样式走 tokens、体积门禁);打包类命令仍由用户执行,agent 只跑 `pnpm verify:app` 与 Metro 验证。
