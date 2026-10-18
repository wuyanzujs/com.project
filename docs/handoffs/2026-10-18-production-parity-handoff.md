# 交接文档:生产端深挖与对齐(M2 进行中)

日期:2026-10-18。交接原因:重启 ZCode 以加载 REA MCP 工具(本会话中途安装,MCP 只在会话启动时注入)。
阅读顺序:本文 → [总计划](../plans/2026-10-18-production-parity-deep-dive.md) → [docs/parity/README.md](../parity/README.md)(状态表与数据基线)。

## 一句话现状

生产 App(dpapp 4.0.7.0,Flutter/GetX)的结构、接口、UI 三线深挖已完成 M0/M1 并落盘 `docs/parity/`;M2(逐项对齐实现)已推进:**改单 5 端点、点选验证码全链路已接入并通过 verify:app 全绿 + 单测(均已提交)**;券推荐 P0 经核实为 MP-ONLY 误标已关闭。

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

## 未提交变更

无。2026-10-18 下午已全部分笔提交:`a0b4c36` 深挖文档、`388ea04` 改单端点、`506c510` 券推荐澄清、`fa187a7` crypto-js 依赖、`d1fdd0e` 点选验证码链路、`14fb160` login 契约档案。

## M2 剩余任务(按优先级)

1. ~~send P0:下单页券推荐 queryCouponRecommend~~ **已关闭(2026-10-18)**:MP-ONLY 误标——生产端无此端点、小程序内无页面调用;生产端券 tile 走 queryCouponOrder,RN 已接全链路。详见 docs/parity/send/api.md。
2. ~~send P0:图形验证码链路~~ **已实现(2026-10-18)**:契约钉死(docs/parity/login/api.md,anji-plus 开源同源 + 测试网关探针);`services/captcha` + 登录页 ClickWordCaptcha 组件 + 频控触发接线 + 黄金向量单测 6/6,verify:app 全绿。剩余:精确触发 code 待抓包/真机收敛;点选图显示尺寸(暂按 620×310 设计px)待 dpshots 量测修正。
3. **send P0**:下单表单 tiles 行折叠粒度对照(生产端 10 种 tile + tips 全家桶,逐个真机截图对照)。
4. **order P0**:详情页操作集对照(allot/sign/transit + cannot 不可操作态;invalidWaybill 已接)。
5. **order**:改单 UI 入口接线(5 端点已就绪,差详情页触发场景;需真机确认哪些状态出现受理改单/改价)。
6. **pay**:E 卡支付通道(queryIsPreCardPay/preCardConfirm)+ 月结交互(month_sheet)。
7. 新增页:消息(message/center+list,接口 intMsg×4)、扫一扫(scan,走 shared/platform facade)。

**UI 类任务前置动作**:真机停在生产端对应页面 → `MSYS_NO_PATHCONV=1 adb exec-out screencap -p > <Windows路径>.png`(Git Bash 下目标必须 Windows 形式路径)→ 存 `.dpshots/` 按 1440=design750×1.92 口径量像素 → 对照后改码 → Metro 热更新 force-stop 验证。

**真机注意(2026-10-18)**:设备 `dcf44968` 有安全锁屏,息屏后需手动解锁;原"每9分钟防息屏"自动化已暂停且其坐标/分辨率(1080×2340)对应旧设备 `2NSDU20B03012023`,对当前 1440 宽设备无效,勿直接复用。Metro 冒烟可绕开锁屏:`curl "http://127.0.0.1:8081/index.bundle?platform=android&dev=true&minify=false"` 验证 bundle 编译。

## 已知坑(全部踩过,勿重蹈)

- Git Bash 的 grep 实为 ugrep:模式以 `/` 开头会被当 flag,加 `--` 或去掉前导斜杠。
- adb 拉文件:命令加 `MSYS_NO_PATHCONV=1`,本地目标写 Windows 路径(如 `C:/Users/.../x.png`)。
- Windows 版 python 读不到 Git Bash 的 `/tmp`,路径用 `cygpath -w` 换算后传环境变量。
- libapp.so 里中文是 **UTF-16LE**(Dart TwoByteString,2026-10-18 实测修正,非 \uXXXX 转义);URL/路径类 ASCII 字符串直接 `grep -aoE`。
- AGENTS.md 全部约束有效(平台能力走 shared/platform、样式走 tokens、体积门禁);打包类命令仍由用户执行,agent 只跑 `pnpm verify:app` 与 Metro 验证。
