# 登录模块接口对照(login/api.md)

生成:2026-10-18(M2)。图形验证码链路契约,来源:**anji-plus/captcha 开源 Flutter 客户端同源实证**(dpapp `common/components/captcha/` 与官方 `view/flutter/demo/lib/` 文件结构、类名、方法名一一对应)+ **测试网关真实探针**(2026-10-18,owstest)+ libapp.so 字符串实证。

## 端点(均在 messageService,RN 原缺失)

### 1. 获取点选验证码 `getCaptchaAction`

`POST /gwapi/messageService/eco/message/captcha/getCaptchaAction`

请求体(实测可行):`{"captchaType": "clickWord"}`(新版协议可带 `clientUid`/`ts`,网关当前不强制)

真实响应(2026-10-18 探针,德邦响应壳回显完整 CaptchaVO):

```json
{
  "status": "success",
  "message": null,
  "code": "0000",
  "result": {
    "captchaId": null, "projectCode": null, "captchaType": null,
    "captchaOriginalPath": null, "captchaFontType": null, "captchaFontSize": null,
    "secretKey": "6w8MdFfabw8Xpfzc",
    "originalImageBase64": "<PNG base64,实测 310×155,文字已画在图上>",
    "point": null, "jigsawImageBase64": null,
    "wordList": ["法", "里", "术"],
    "pointList": null, "pointJson": null,
    "token": "8b65bbe892d74a8199747a85664a1818",
    "result": false, "captchaVerification": null, "clientUid": null, "ts": null, "browserInfo": null
  }
}
```

客户端消费字段:`originalImageBase64`、`wordList`(按序点选)、`token`(会话)、`secretKey`(AES key)。

### 2. 校验点选 `checkCaptchaAction`

`POST /gwapi/messageService/eco/message/captcha/checkCaptchaAction`

请求体(anji 协议,demo + html 双源一致):

```json
{
  "captchaType": "clickWord",
  "pointJson": "<AES-ECB(secretKey, JSON.stringify([{x,y},…])) 的 base64>",
  "token": "<get 返回的 token>"
}
```

坐标口径:相对**服务端原图(310×155)** 的坐标;demo 显示原尺寸图故直接用本地坐标,RN 若缩放显示需按 `原图尺寸/显示尺寸` 归一。坐标序列化为 `{"x":50.0,"y":30.0}`(roundToDouble)。

响应:成功 `result.result === true`(anji 协议);失败/频控 `{status:"fail", message:"您的操作过于频繁，请稍后重试", code:null, result:null}`(探针实测,**check 端点频控严格**)。

### 3. 校验成功后的业务侧凭证 `captchaVerification`

anji 协议(demo `_checkSuccess`/html `verify.js` 一致):

```
captchaVerification = AES-ECB(secretKey, token + '---' + JSON.stringify(点选坐标数组))
```

- `pointJson` 用加密坐标;`captchaVerification` 内层是**明文**坐标 JSON,拼 `token + '---'` 后整体加密。
- 业务请求(登录/发短信)携带该字段,由后端按会话 secretKey 解密核验。
- anji 官方 demo 里还有一道固定 key(`BGxdEUOZkXka4HSj`)的二次加密,**dpapp 未沿用**(0 命中),无需移植。

## 加密口径(EncryptUtil.aesEncode 移植依据)

dpapp `captcha/request/encrypt_util.dart` 与 anji demo 同源,用 `package:steel_crypt`:

```dart
AesCrypt(key: base64UrlEncode(key.codeUnits), padding: PaddingAES.pkcs7).ecb.encrypt(inp: content)
```

steel_crypt 内部 `base64Decode(key)` 后再做 AES — 外层 base64Url 编解码是空转,**实际 AES key = secretKey 原文字节**(16 字符 → AES-128),AES-ECB-PKCS7,输入 UTF-8,输出标准 base64。

TS 等价实现(crypto-js):

```ts
CryptoJS.AES.encrypt(content, CryptoJS.enc.Utf8.parse(secretKey), {
  mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7
}).toString()
```

## 生产端实现结构(libapp.so 实证)

- `pages/login/widgets/click_captcha.dart` — 登录页点选验证码组件(埋点 `app_login_click_captcha`/`app_bind_login_click_captcha`,绑定登录页同用)
- `common/components/captcha/request/encrypt_util.dart` — AES 加密(同 anji demo)
- `common/components/captcha/tools/object_utils.dart` / `widget_util.dart` — 同 anji demo
- 类:`ClickCaptchaEntity`(fromJson)/`ClickWordCaptchaModel`/`ClickWordCaptchaWidget`/`ClickWordCaptchaState`
- 方法:`_handleCaptchaData`/`_loadCaptcha`/`_checkCaptcha`/`_captchaContainer`(demo 同名)
- UI 文案(UTF-16LE 实证):`请依次点击【`、`请完成安全验证`

## 与小程序差异

mp-taro3 无 captcha 概念(0 文件命中),短信登录直接发;captcha 为生产 App 独有的风控链路。

## 待确认(实现时标注)

1. **触发场景**:后端在何种失败(短信频控/登录失败 N 次)返回什么 code 触发验证码弹层 — 需真机触发或抓包;RN 侧先按"发短信频控失败 → 弹验证码 → 成功后携带 captchaVerification 重试"实现,信号匹配规则见 `services/captcha`。
2. check 成功响应的 `result` 具体形态(探针受频控未能取到成功样例,按 anji 协议 `result.result === true` 处理)。
3. 点选图在生产的显示尺寸(demo 按原图 310×155 逻辑 px 直显;RN 按 620×310 设计px 处理,待 dpshots 量测修正)。
