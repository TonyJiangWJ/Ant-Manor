
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let accountChange = require('../lib/AlipayAccountManage.js')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let fileUtils = singletonRequire('FileUtils')
let automator = singletonRequire('Automator')
let unlocker = require('../lib/Unlock.js')
let WarningFloaty = singletonRequire('WarningFloaty')
let LogFloaty = singletonRequire('LogFloaty')
let storageFactory = singletonRequire('StorageFactory')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog } = singletonRequire('LogUtils')

let localOcr = require('../lib/LocalOcrUtil.js')
let ManorRunner = require('../core/AntManorRunner.js')
let collector = require('../core/FodderCollector.js')
runningQueueDispatcher.addRunningTask()
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  // 重置自动亮度
  config.resetBrightness && config.resetBrightness()
  if (config.auto_lock && unlocker.needRelock() === true) {
    logUtils.debugInfo('重新锁定屏幕')
    automator.lockScreen()
  }
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, false,
    () => {
      // 保存是否需要重新锁屏
      unlocker.saveNeedRelock()
      config.isRunning = false
    }
  )
}, 'main')
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
unlocker.exec()
commonFunctions.requestScreenCaptureOrRestart()

if (!config.main_account || config.accounts.length <= 0) {
  toastLog('未配置多账号，或账号信息为空，无法进行助力')
  exit()
}

if (!floatyInstance.init()) {
  toast('创建悬浮窗失败')
  exit()
}
floatyInstance.enableLog()
commonFunctions.showCommonDialogAndWait('切换小号执行喂鸡')
commonFunctions.listenDelayStart()
// 实时监控截图内容
require('../lib/WebsocketCaptureHijack.js')()

let currentRunningAccount = ''
let countdownList = []

// 设置当前脚本默认保持活跃 避免设置定时任务重启
ManorRunner.setKeepAlive()
if (config.accounts && config.accounts.length > 1) {

  // 循环执行签到任务
  config.accounts.forEach((accountInfo, idx) => {
    let { account } = accountInfo
    if (account == config.main_account) {
      LogFloaty.pushLog('跳过主账号：' + account)
      return
    }
    currentRunningAccount = account
    floatyInstance.setFloatyText('准备切换账号为：' + account)
    sleep(1000)
    accountChange(account)
    floatyInstance.setFloatyText('切换完毕')
    sleep(500)
    floatyInstance.setFloatyText('开始执行喂鸡')
    try {
      // 打开首页
      if (!ManorRunner.launchApp(false, true)) {
        LogFloaty.pushErrorLog('打开小鸡界面失败，跳过执行')
        return
      }
      sleep(1000)
      if (!ManorRunner.waitForOwn(true)) {
        LogFloaty.pushErrorLog('等待个人界面失败，重新打开')
        if (!ManorRunner.launchApp(true, true)) {
          LogFloaty.pushErrorLog('重新打开小鸡界面失败，跳过执行')
          return
        }
      }
      sleep(1000)
      // 先领饲料
      collector.exec()
      if (!ManorRunner.waitForOwn(true)) {
        LogFloaty.pushErrorLog('校验失败，重新打开个人界面')
        if (!ManorRunner.launchApp(true, true)) {
          LogFloaty.pushErrorLog('重新打开小鸡界面失败，跳过执行')
          return
        }
      }
      // 初始化检测器
      ManorRunner.prepareChecker()
      // 捡鸡蛋
      ManorRunner.collectReadyEgg()
      // 检查小鸡是否外出
      ManorRunner.checkIsOut()
      // 驱赶野鸡
      ManorRunner.checker.checkThief()
      // 执行喂鸡
      if (ManorRunner.doFeed()) {
        // 存在弹窗 将小鸡领回
        if (ManorRunner.checkIfChikenOut()) {
          ManorRunner.doFeed()
        }
        // 喂过鸡 再领取一遍饲料
        collector.exec()
      }
      if (!ManorRunner.waitForOwn(true)) {
        LogFloaty.pushErrorLog('校验失败，重新打开个人界面')
        if (!ManorRunner.launchApp(true, true)) {
          LogFloaty.pushErrorLog('重新打开小鸡界面失败，跳过执行')
          return
        }
      }
      // 统计倒计时
      let countdown = ManorRunner.recognizeCountdownByOcr()
      LogFloaty.pushLog('识别倒计时：' + countdown)
      countdownList.push(countdown)
      floatyInstance.setFloatyText('切换下一个账号')
      sleep(500)
    } catch (e) {
      logUtils.errorInfo('执行异常：' + e)
      floatyInstance.setFloatyText('领取异常 进行下一个')
    }
  })
  floatyInstance.setFloatyText('全部账号执行完毕切换回主账号')
  let maxCountdown = Math.max.apply(Math, countdownList)
  if (maxCountdown > 0) {
    LogFloaty.pushLog('统计最大倒计时为：' + maxCountdown)
    commonFunctions.setUpAutoStart(maxCountdown)
  }
  sleep(1000)
  ensureMainAccount()
  sleep(500)
} else {
  logUtils.errorInfo(['当前未配置多账号或账号只有一个，不进行切换'], true)
}
commonFunctions.minimize()
exit()

function ensureMainAccount () {
  try {
    accountChange(config.main_account || config.accounts[0])
  } catch (e) {
    LogFloaty.pushErrorLog('切换主账号异常' + e)
    ensureMainAccount()
  }
}
