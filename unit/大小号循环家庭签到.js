
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let { changeAccount, ensureMainAccount } = require('../lib/AlipayAccountManage.js')
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
// 检查待执行账号列表
let accounts = config.accounts.filter((accountInfo, idx) => {
  let { account } = accountInfo
  if (storageFactory.getValueByKey(DAILY_TASK_DONE).executed[account]) {
    return false
  }
  return true
})
if (accounts.length == 0) {
  warnInfo(['今日所有账号都已经执行完毕，无需再次执行，如果需要强制执行 请运行 unit/大小号循环家庭签到-清除记录.js 消除记录后再次执行'])
  exit()
}
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
commonFunctions.backHomeIfInVideoPackage()
// 实时监控截图内容
require('../lib/WebsocketCaptureHijack.js')()

let currentRunningAccount = ''

// 每五分钟延迟一下任务 避免任务执行太慢被抢占
threads.start(function () {
  while (config.isRunning) {
    sleep(5 * 60000)
    if (!config.isRunning) {
      break
    }
    runningQueueDispatcher.renewalRunningTask()
  }
})

if (config.accounts && config.accounts.length > 1) {

  // 循环执行签到任务
  config.accounts.forEach((accountInfo, idx) => {
    let { account } = accountInfo
    if (storageFactory.getValueByKey(DAILY_TASK_DONE).executed[account]) {
      LogFloaty.pushLog('账号' + account + '已执行，跳过')
      return
    }
    if ((config.no_family_accounts||[]).indexOf(account) > -1) {
      LogFloaty.pushLog('账号' + account + '未加入家庭，跳过')
      return
    }

    currentRunningAccount = account
    LogFloaty.pushLog('准备切换账号为：' + account)
    sleep(1000)
    changeAccount(account)
    LogFloaty.pushLog('切换完毕')
    sleep(500)
    LogFloaty.pushLog('开始执行签到')
    try {
      // 打开首页
      if (!FamilySignRunner.enterFamily(config.main_account == account)) {
        errorInfo(['{} 进入家庭失败', account])
        commonFunctions.minimize(config.package_name)
        sleep(1000)
        if (!FamilySignRunner.enterFamily(config.main_account == account)) {
          LogFloaty.pushErrorLog('进入家庭界面失败，退出执行')
          return
        }
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
      LogFloaty.pushLog('切换下一个账号')
      sleep(500)
    } catch (e) {
      logUtils.errorInfo('执行异常：' + e)
      LogFloaty.pushLog('领取异常 进行下一个')
    }
  })
  LogFloaty.pushLog('全部账号签到完毕切换回主账号')
  sleep(1000)
  ensureMainAccount()
  sleep(500)
} else {
  logUtils.errorInfo(['当前未配置多账号或账号只有一个，不进行切换'], true)
}
commonFunctions.minimize()
exit()


function setExecuted () {
  let currentStorage = storageFactory.getValueByKey(DAILY_TASK_DONE)
  currentStorage.executed[currentRunningAccount] = true
  storageFactory.updateValueByKey(DAILY_TASK_DONE, currentStorage)
}