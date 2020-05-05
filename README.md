# 蚂蚁庄园自动喂鸡驱赶脚本

## 其他脚本

- [蚂蚁森林脚本传送门](https://github.com/TonyJiangWJ/Ant-Forest)
- [领京豆脚本传送门](https://github.com/TonyJiangWJ/JingDongBeans)
- [支付宝会员积分传送门](https://github.com/TonyJiangWJ/Alipay-Credits)
- 拆分出来了基础项目，用于快速开发AutoJS脚本[AutoScriptBase](https://github.com/TonyJiangWJ/AutoScriptBase)

## 基于AutoJS实现的自动喂养脚本

- 运行config.js 修改配置，设置密码等
- 支持使用加速卡
- AutoJS中手动更新代码。执行`update/检测更新.js`即可 可以选择覆盖更新或者备份后更新 更多说明见`update/说明-重要.txt`
- `星星球`脚本，打开AutoJS悬浮球 然后进入到开始的界面，通过悬浮球菜单打开`星星球.js` 自动开始和小鸡玩，默认达到230分就结束。
- 支持自定义扩展解锁和配置信息，不会因为更新脚本导致配置丢失
- `小鸡登山`脚本正在开发中。。。目前没法正式使用

## 使用说明

- 下载安装 [AutoJs 4.1.1 alpha2 下载](https://www.dropbox.com/s/pe3w53k0fugo1fa/Autojs%204.1.1%20Alpha2.apk?dl=0) 之后把整个脚本项目放进 **"/sdcard/脚本/"** 文件夹下面。打开软件后下拉刷新，然后运行项目或者 main 即可。
- 给与软件必要权限 `后台弹出界面`、`显示悬浮窗`、`自启动`，并将软件保持后台运行
- 定时启动脚本，点击 `main.js` 的菜单，选择 `更多` `定时任务` 即可配置定时启动
- 不同设备分辨率不同需要自行修改相应配置，在 `extends` 下新建文件 `CustomConfig.js` ，内容参考 `CustomConfig-demo.js` 具体参考文件内的注释说明。demo配置中默认支持分辨率为2160*1080
- 查看具体配置信息可以截图一张自己蚂蚁庄园的图片，放在test目录下，命名为 `蚂蚁庄园截图.jpg` 然后运行 `小鸡界面配置可视化.js` 生成的图片中文字可能看不清，但是可以参考 `CustomConfig-demo.js` 中的注释
- 或者直接运行 `test/全局悬浮窗显示-音量上键关闭.js` 来查看具体位置，不过有可能会导致APP闪退
  ![具体配置区域-示例](./test/蚂蚁庄园区域示例.jpg)

## 配置

- 配置导出导入功能，点击右上角菜单即可导出当前配置到local_config.cfg中，默认已加密加密密码为通过以下方法获取`device.getAndriodId()` 如果需要在免费版和付费版AutoJS之间同步 需要自行获取该值并按提示输入密码
- 运行时数据导出导入功能同上所述

![配置](./config.jpg)

## 扩展自定义配置

- 脚本根目录下新建extends文件夹，然后创建CustomConfig.js文件，内容格式如下自定义
- 具体可以参考CustomConfig-demo.js

```javascript
module.exports = {

  CHECK_APP_COLOR: '#f1381a',         // 校验蚂蚁庄园是否打开成功的颜色
  CHECK_FRIENDS_COLOR: '#429beb',     // 校验是否成功进入好友首页的颜色
  THIEF_COLOR: '#000000',             // 校验小偷鸡眼罩的颜色 黑色
  PUNCH_COLOR: '#f35458',             // 校验拳头的颜色
  OUT_COLOR: '#c37a3e',               // 校验小鸡是否出门，牌子的颜色
  OUT_IN_FRIENDS_COLOR: '#e9ca02',    // 校验自家小鸡外出所在的颜色，ID的颜色 黄色
  DISMISS_COLOR: '#f9622f',           // 校验关闭按钮的颜色
  FOOD_COLOR: '#ffcf00',              // 校验正在进食盆里饲料的颜色
  SPEED_CHECK_COLOR: '#ffd000',       // 校验是否成功使用加速卡，小鸡右手上饲料的颜色
  reco: [200, 100, 750, 1900],        // 星星球的判断区域

  OFFSET: 0,  // 默认配置为支持2160*1080分辨率，其他异形屏一般可以尝试仅仅修改该偏移量, 如果不行就修改具体区域的配置吧
  CHECK_APP_REGION: [310, 250, 20, 20],             // 校验是否成功打开蚂蚁庄园的区域，左上角❤️的区域
  CHECK_FRIENDS_REGION: [120, 490, 10, 10],         // 校验是否在好友首页的区域  左上角 发消息蓝色的区域
  OUT_REGION: [530, 1300, 25, 25],                  // 校验小鸡是否出门，牌子的区域
  OUT_IN_FRIENDS_REGION_RIGHT: [800, 1305, 50, 50], // 校验小鸡在好友家，左边的区域
  OUT_IN_FRIENDS_REGION_LEFT: [340, 1305, 50, 50],  // 校验小鸡在好友家，右边的区域
  LEFT_THIEF_REGION: [385, 1465, 50, 50],           // 校验来自家偷吃的小鸡，左边的区域
  LEFT_PUNCH_REGION: [500, 1305, 100, 100],         // 校验左边拳头的区域
  RIGHT_THIEF_REGION: [825, 1465, 50, 50],          // 校验来自家偷吃的小鸡，右边的区域
  RIGHT_PUNCH_REGION: [980, 1305, 100, 100],        // 校验右边拳头的区域
  DISMISS_REGION: [450, 1845, 10, 10],              // 校验关闭按钮的区域
  FOOD_REGION: [850, 1655, 10, 10],                 // 校验食盆的区域，主要校验是否存在饲料
  SPEED_CHECK_REGION: [464, 1445, 10, 10],          // 校验是否成功使用加速卡的区域，小鸡右手拿饲料的位置
  // 喂饲料按钮的位置
  FEED_POSITION: {
    x: 930,
    y: 1960
  },
  // 道具包按钮的位置
  TOOL_POSITION: {
    x: 960,
    y: 645
  },
  // 道具包中加速卡按钮的位置
  SPEED_CARD_POSITION: {
    x: 190,
    y: 1450
  },
  // 确认按钮的位置
  CONFIRM_POSITON: {
    x: 720,
    y: 1320
  }
}
```

## 添加解锁设备

- 脚本根目录下新建extends文件夹，然后创建ExternalUnlockDevice.js文件，内容格式如下自定义
- 具体可以参考ExternalUnlockDevice-demo.js

```javascript
module.exports = function (obj) {
  this.__proto__ = obj

  this.unlock = function(password) {
    // 此处为自行编写的解锁代码

    // 在结尾返回此语句用于判断是否解锁成功
    return this.check_unlock()
  }

}
```

## 添加自定义锁屏代码

- 同解锁设备，在extends文件夹下创建LockScreen.js，内容可以参考LockScreen-demo.js 实现自定义解锁

```javascript
let { config: _config } = require('../config.js')(runtime, this)

module.exports = function () {
  // MIUI 12 偏右上角下拉新控制中心
  swipe(800, 10, 800, 1000, 500)
  // 等待动画执行完毕
  sleep(500)
  // 点击锁屏按钮
  click(parseInt(_config.lock_x), parseInt(_config.lock_y))
}
```
