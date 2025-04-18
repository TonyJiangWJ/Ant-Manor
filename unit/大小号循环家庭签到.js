
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let accountChange = require('../lib/AlipayAccountManage.js').changeAccount
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
let DAILY_TASK_DONE = "DAILY_TASK_DONE"
storageFactory.initFactoryByKey(DAILY_TASK_DONE, { executed: {} })
let FamilySignRunner = require('../core/FamilySignRunner.js')
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
commonFunctions.showCommonDialogAndWait('切换小号执行家庭签到')
commonFunctions.listenDelayStart()

// 实时监控截图内容
require('../lib/WebsocketCaptureHijack.js')()

let currentRunningAccount = ''


if (config.accounts && config.accounts.length > 1) {

  // 循环执行签到任务
  config.accounts.forEach((accountInfo, idx) => {
    let { account } = accountInfo
    if (storageFactory.getValueByKey(DAILY_TASK_DONE).executed[account]) {
      LogFloaty.pushLog('账号' + account + '已执行，跳过')
      return
    }

    currentRunningAccount = account
    floatyInstance.setFloatyText('准备切换账号为：' + account)
    sleep(1000)
    accountChange(account)
    floatyInstance.setFloatyText('切换完毕')
    sleep(500)
    floatyInstance.setFloatyText('开始执行签到')
    try {
      // 打开首页
      if (!FamilySignRunner.enterFamily(config.main_account == account)) {
        errorInfo(['{} 进入家庭失败', account])
        return
      }
      sleep(1000)
      if (FamilySignRunner.haveNotBeenEnteredAnyFamily()) {
        return
      }
      FamilySignRunner.execSign()
      FamilySignRunner.openDrawer()
      if (FamilySignRunner.donateEgg()) {
        LogFloaty.pushLog('执行了捐蛋 需要重新进入家庭')
        // 打开首页
        if (!FamilySignRunner.enterFamily(true)) {
          errorInfo(['{} 进入家庭失败', account])
          return
        }
      }
      FamilySignRunner.openDrawer()
      FamilySignRunner.donateSport()
      // todo 如果有失败的 不要设置为已完成
      setExecuted()
      floatyInstance.setFloatyText('切换下一个账号')
      sleep(500)
    } catch (e) {
      logUtils.errorInfo('执行异常：' + e)
      floatyInstance.setFloatyText('领取异常 进行下一个')
    }
  })
  floatyInstance.setFloatyText('全部账号签到完毕切换回主账号')
  sleep(1000)
  ensureMainAccount()
  sleep(500)
} else {
  logUtils.errorInfo(['当前未配置多账号或账号只有一个，不进行切换'], true)
}
commonFunctions.minimize()
exit()

function ensureMainAccount() {
  try {
    accountChange(config.main_account || config.accounts[0])
  } catch (e) {
    LogFloaty.pushErrorLog('切换主账号异常' + e)
    ensureMainAccount()
  }
}


function setExecuted () {
  let currentStorage = storageFactory.getValueByKey(DAILY_TASK_DONE)
  currentStorage.executed[currentRunningAccount] = true
  storageFactory.updateValueByKey(DAILY_TASK_DONE, currentStorage)
}