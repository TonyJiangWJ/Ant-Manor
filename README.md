# 蚂蚁庄园自动喂鸡驱赶脚本

[![GitHub forks](https://img.shields.io/github/forks/TonyJiangWJ/Ant-Manor?style=flat-square)](https://github.com/TonyJiangWJ/Ant-Manor/forks)
[![GitHub stars](https://img.shields.io/github/stars/TonyJiangWJ/Ant-Manor?style=flat-square)](https://github.com/TonyJiangWJ/Ant-Manor/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/TonyJiangWJ/Ant-Manor?style=flat-square)](https://github.com/TonyJiangWJ/Ant-Manor/issues)
[![Page Views Count](https://badges.toozhao.com/badges/01HV8RQMC13FAHYZCG8HEBT696/green.svg)](https://badges.toozhao.com/stats/01HV8RQMC13FAHYZCG8HEBT696 "Get your own page views count badge on badges.toozhao.com")

基于 AutoJS 实现的蚂蚁庄园自动化脚本。

## ✨ 主要功能

* **可视化配置**: 通过 `可视化配置.js` 轻松修改脚本设置和密码。
* **智能识别**:
  * 支持 **YOLO 目标检测** 自动识别界面元素（推荐）。
  * 支持 **OCR 识别** 倒计时（需配置识别区域）。
* **核心自动化**:
  * 自动喂鸡、驱赶小鸡。
  * 自动使用加速卡。
  * 自动捡鸡屎。
  * 自动领取每日免费饲料。
* **蚂蚁新村**: 支持自动摆摊（详见下方功能模块）。
* **其他任务**: 支持星星球、每日睡觉、自动捐蛋、家庭签到投喂、抽抽乐、做饭领食材等（详见下方功能模块）。
* **多账号支持**: 支持大小号循环任务。
* **脚本更新**: 内置更新脚本 (`update/检测更新.js`)，支持覆盖或备份后更新。
* **扩展性**: 支持自定义解锁和配置信息，更新脚本不丢失配置。

## 🚀 使用入门

1. **环境准备**:
    * 下载并安装 **[AutoJs Modify](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.modify.latest.apk)** 版本（支持 PaddleOCR 和 YOLO）。
    * 将整个脚本项目文件夹放置到设备的 **`/sdcard/脚本/`** 目录下。
2. **授权与设置**:
    * 打开 AutoJS 应用，下拉刷新列表，找到本项目。
    * 授予 AutoJS **`后台弹出界面`**、**`显示悬浮窗`**、**`自启动`** 等必要权限。
    * 保持 AutoJS 应用在后台运行（加入电池优化白名单）。
    * (可选) [通过 ADB 授权脚本自动获取无障碍权限](https://github.com/TonyJiangWJ/AutoScriptBase/blob/master/resources/doc/ADB%E6%8E%88%E6%9D%83%E8%84%9A%E6%9C%AC%E8%87%AA%E5%8A%A8%E5%BC%80%E5%90%AF%E6%97%A0%E9%9A%9C%E7%A2%8D%E6%9D%83%E9%99%90.md)。
3. **首次配置**:
    * **重要**: 由于设备差异，默认配置可能无法直接使用，请务必运行 `可视化配置.js` 进行个性化设置。
    * 在 `可视化配置.js` 中，切换到 **校验区域配置**，根据提示调整各项配置。
        * **注：** 当开启YOLO检测后，不用进行区域信息配置。
        * 可以实时预览区域信息。
        * 可以将蚂蚁庄园截图命名为 `蚂蚁庄园截图.jpg` 放入 `test` 目录作为背景，方便调整。
        * 也可以隐藏背景图，切换到蚂蚁庄园界面实时查看位置。
        * 颜色值通常无需修改。
4. **运行脚本**:
    * 直接运行项目或 `main.js`。
5. **定时任务**:
    * 如需定时自动运行，点击 `main.js` 右侧的菜单按钮，选择 `更多` -> `定时任务` 进行配置。

## ⚙️ 详细配置

### 识别方式配置

* **YOLO 目标检测 (推荐)**:
  * 在 `可视化配置.js` -> `区域颜色配置` 中启用 `使用YOLO识别`。
  * **优势**: 自动识别绝大多数界面元素，无需手动进行复杂的区域和颜色配置。
  * **前提**: 需要安装支持 YOLO 的 AutoJS 版本（如上方提供的 Modify 版）。然后运行 `独立工具/庄园模型下载.js` 下载对应的模型文件。
  * 启用 YOLO 后，大部分手动区域配置（如下文所述）可以跳过。
* **颜色与区域识别 (手动)**:
  * 如果未使用 YOLO 或 YOLO 识别效果不佳，需要手动配置识别区域和颜色。
  * 使用 `独立工具/灰度取色.js` 辅助取色和区域定位。点击 `裁切小图` 可框选区域或截取小图，区域位置信息会显示在下方。
  * <details>
      <summary>配置参考信息</summary>
      <img alt="配置界面" src="https://user-images.githubusercontent.com/11325805/114294987-db6c8a80-9ad4-11eb-9a7d-b12e28d53f45.png"  height="400"/>
      <img alt="捡屎配置" src="https://user-images.githubusercontent.com/11325805/114295015-09ea6580-9ad5-11eb-9705-1674e214fa8f.png" height="400"/>
    </details>
* **OCR 配置**:
  * 部分功能（如倒计时识别、蚂蚁新村部分逻辑）依赖 OCR。
  * **mlkit-ocr**: 速度快，准确性一般，基本满足需求。非 **AutoJs Modify** 需要安装 [mlkit-ocr插件](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/mlkit-ocr-plugin-latest.apk)。
  * **PaddleOCR**: 准确性高，速度较慢，**必须使用上方提供的 AutoJs Modify 版本**，且需要将 AutoJS 的电池优化设置为无限制，否则易闪退。
  * 可在 `可视化配置.js` 中设置本地 OCR 的优先级。

### 配置管理

* **导出/导入**: 在 `可视化配置.js` 右上角菜单中，可将当前配置导出为 `local_config.cfg` 文件（默认加密，密码为设备 Android ID），或从该文件导入配置。
* **获取设备 ID**: 运行 `setClip(device.getAndroidId())` 可将设备 ID 复制到剪贴板。
* **运行时数据**: 导出/导入方式同上。

## 🧩 功能模块详解

以下为各独立功能模块的说明和使用方法，建议为需要的功能脚本创建定时任务。

### 蚂蚁新村自动摆摊

* **配置**:
  * 运行 `可视化配置.js` -> `蚂蚁新村配置`。
  * **若启用 YOLO**: 通常可自动识别，但建议仍按下方说明配置 OCR 区域作为兜底，以防模型更新滞后。
  * **若未启用 YOLO 或需手动配置**: 必须配置识别图片和 OCR 识别区域（默认图片可能不适用）。
  * **OCR 区域配置**: 运行 `独立工具/灰度取色.js`，框选好友空摊位中心文字左侧区域（如下图参考），复制 `位置` 数据填入配置。可运行 `test/蚂蚁新村悬浮窗显示-音量上键关闭.js` 验证区域。
    * <img alt="ocr区域样例" src="./resources/viliage_ocr_region.jpg" height="300" />
* **运行**: 首次运行 `unit/蚂蚁新村自动摆摊.js` 进行测试和初始化，后续脚本会根据配置的执行间隔自动创建下一次定时任务。
* **依赖**: 强依赖 OCR，需确保 OCR 功能可用（安装插件或使用 Modify 版 AutoJS）。
* **摆摊模式**:
  * **随机摆摊 (默认)**: 随机选择好友摊位。
  * **最大收益摆摊**: 在配置中启用。脚本会根据好友生产速度排序，并跳过黑名单好友，优先选择收益高且风险低的摊位。
* **注意**: 暂不开发贴罚单功能。

### 家庭签到与投喂

* **脚本**: `unit/家庭投喂.js`
* **功能**: 自动完成家庭签到、投喂家庭小鸡、三个时间段投喂美食、使用顶梁柱。
* **定时任务**: 建议设置在当天第一个喂食周期内（如早上），以防遗漏。脚本会自动判断是否需要进行下一时段投喂并创建临时定时任务。
* **注意**: 请确保家庭美食数量足够，否则脚本执行可能出错。

### 日常任务

* **每日睡觉**:
  * 脚本: `unit/去睡觉.js`
  * 定时: 设置在晚上小鸡可睡觉的时间段。
  * 配置: `可视化配置` -> `执行配置` 中有 `小鸡睡觉入口` 相关配置，自动识别失败后将使用它作为保底。同时务必正确配置 `小鸡床的位置`。可通过 `独立工具/灰度取色.js` 来获取坐标信息。此外有配置 `是否去佳通别墅睡觉` 的开关，如果未开通家庭，请手动关闭否则将睡觉失败。
* **自动捐蛋**:
  * 脚本: `unit/自动捐蛋.js`
  * 定时: 每日执行一次。
* **抽抽乐任务**:
  * 脚本: `unit/抽抽乐任务.js`
  * 定时: 每日执行一次。
* **做饭领食材**:
  * 脚本: `unit/做饭领食材.js`
  * 定时: 每日执行一次。
  * 配置: `可视化配置` -> `领饲料配置` -> `当期成就完成跳过做饭领食材` 可控制在完成当前周期成就后是否跳过此任务（避免浪费食材，但若缺美食则建议不跳过）。

### 多账号支持

配置好多账号后，可以使用以下脚本：

* **循环喂小号**:
  * 脚本: `unit/循环小号喂鸡.js`
  * 功能: 定时投喂所有配置的小号。只喂鸡，不进行定时驱赶，会在倒计时结束后开始下一轮。
* **大小号循环家庭签到**:
  * 脚本: `unit/大小号循环家庭签到.js`
  * 功能: 为所有配置的账号执行家庭签到、捐步数、捐蛋，积累亲密度。
  * 定时: 建议在下午或晚上执行（因为涉及捐步数）。
* **蚂蚁新村大小号助力**:
  * 脚本: `unit/蚂蚁新村大小号助力.js`
  * 功能: 自动完成所有账号的蚂蚁新村每日攒加速币任务。
  * 定时: 建议设置在每天凌晨执行。
  * 配置: 助力链接相关说明见 `可视化配置` -> `新村助力设置`。

### 星星球

* **脚本**: `星星球.js` 或者 `星星球-YOLO.js` 后者需要运行 `独立工具/星星球模型下载.js` 下载对应的模型文件
* **运行**: 进入星星球开始界面，通过 AutoJS 的悬浮球菜单启动此脚本。
* **功能**: 自动玩星星球，默认达到 230 分后结束。
* **配置**: `可视化配置` -> `执行配置` -> `星星球目标分数` 可控制达标停止的分数。

### 扭蛋互助

* **扭蛋活动互助**：
  * 入口：`可视化配置` -> `扭蛋互助` 可以随机获取一个他人的互助码，然后也可以上传自己的让别人帮忙
  * 功能说明：参与人数越多，当日任务越容易达成，上线前期可能可用数量不多，大家可以多多参与。

## 🔧 高级定制

在脚本根目录下新建 `extends` 文件夹，进行以下自定义：

### 自定义设备解锁

* 创建文件: `extends/ExternalUnlockDevice.js`
* 内容格式参考 `ExternalUnlockDevice-demo.js`，实现 `unlock` 方法。

```javascript
// ExternalUnlockDevice.js 示例结构
module.exports = function (obj) {
  this.__proto__ = obj; // 继承原型

  this.unlock = function(password) {
    // 在此处编写你的设备解锁逻辑代码
    // 例如：滑动、输入密码等

    // 必须返回解锁检查结果
    return this.check_unlock();
  };
};
```

### 自定义锁屏

* 创建文件: `extends/LockScreen.js`
* 内容格式参考 `LockScreen-demo.js`，实现自定义锁屏逻辑。

```javascript
// LockScreen.js 示例结构
let { config: _config } = require('../config.js')(runtime, this);

module.exports = function () {
  // 在此处编写你的锁屏逻辑代码
  // 例如：下拉通知栏点击锁屏按钮
  // swipe(800, 10, 800, 1000, 500); // 示例：下拉
  // sleep(500);
  // click(parseInt(_config.lock_x), parseInt(_config.lock_y)); // 示例：点击锁屏按钮坐标
};
```

## 🔄 脚本更新

* 运行 `update/检测更新.js` 检查并更新脚本。
* 可以选择 **覆盖更新** 或 **备份后更新**。
* 更多说明请参考 `update/说明-重要.txt` 文件。

## 🐞 问题反馈

1. **开启日志**: 在 `可视化配置.js` -> `高级设置` 中，勾选 `保存日志到文件`，并将 `日志文件大小` 调整为 1024KB 或更大。
2. **复现问题**: 重新运行脚本直到问题出现。
3. **收集信息**:
    * 详细描述问题现象、操作步骤。
    * 提供使用的脚本版本、AutoJS 版本、手机型号、安卓版本。
    * 长截图AutoJS软件中的日志，可以的话再附上日志文件 (`logs/log-verboses.log`)。日志默认保存 100k，旧日志在 `logs/logback`。
    * 如有截图或录屏更有助于定位问题。
4. **提交**:
    * **[创建 ISSUE](https://github.com/TonyJiangWJ/Ant-Manor/issues/new)** (推荐)。
    * **[前往论坛反馈](https://autoscripts.flarum.cloud)** 邮箱注册即可，常见的问题后续会逐渐完善上去
    * 如果日志包含隐私信息，可删除敏感部分或通过邮件发送给开发者: `tonyjiangwj@gmail.com`。

## 🔗 相关项目

* **[蚂蚁森林脚本](https://github.com/TonyJiangWJ/Ant-Forest)**
* **[聚合签到-签到薅羊毛](https://github.com/TonyJiangWJ/Unify-Sign)**
* **[AutoScriptBase](https://github.com/TonyJiangWJ/AutoScriptBase)**: 用于快速开发 AutoJS 脚本的基础项目。

## ☕ 支持开发者

如果觉得项目对你有帮助，欢迎请我喝杯咖啡！

* 一元喝速溶、五元喝胶囊、十二买全家、三十三买星巴克，感激不尽！

| 支付宝 | 微信 | 也欢迎支付宝扫码领红包，你领我也得，双赢！|
| :----: | :----: | :----: |
| ![alipay_qrcode](./resources/alipay_qrcode.png) | ![wechat_qrcode](./resources/wechat_qrcode.png) | ![扫码领红包](./resources/hongbao_qrcode.png) |

* 也可以运行 `unit/支持作者.js` 在线获取红包口令，通过支付宝直接打开领取，每使用一个红包我都可以获取一分钱的收益。
