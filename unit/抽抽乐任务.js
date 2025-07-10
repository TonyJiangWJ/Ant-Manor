let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
// 代理图片资源回收
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
let unlocker = require('../lib/Unlock.js')
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let automator = singletonRequire('Automator')
let LogFloaty = singletonRequire('LogFloaty')
let FloatyInstance = singletonRequire('FloatyUtil')
let NotificationHelper = singletonRequire('Notification')
let LuckyDrawRunner = require('./抽抽乐/internal.js')
FloatyInstance.enableLog()
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
if (!localOcrUtil.enabled) {
  errorInfo('当前脚本强依赖于OCR，请使用支持OCR的AutoJS版本进行执行')
  exit()
}
// logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()

let commonFunctions = singletonRequire('CommonFunction')
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  config.resetBrightness && config.resetBrightness()
  debugInfo('校验并移除已加载的dex')
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

commonFunctions.showCommonDialogAndWait('蚂蚁庄园抽抽乐')
commonFunctions.listenDelayStart()
commonFunctions.requestScreenCaptureOrRestart(true)
commonFunctions.backHomeIfInVideoPackage()

const notificationId = config.notificationId * 100 + (commonFunctions.simpleHash(engines.myEngine().getSource() + '') % 100)
debugInfo(['构建当前通知id：{}', notificationId])
NotificationHelper.cancelNotice(notificationId)
// 实时监控截图内容
require('../lib/WebsocketCaptureHijack.js')()
// 执行领取饲料
let luckyDraw = new LuckyDrawRunner()
if (!luckyDraw.execute()) {
  LogFloaty.pushErrorLog('当前执行失败，设置五分钟后重试')
  NotificationHelper.createNotification('抽抽乐执行失败，请检查', '抽抽乐执行失败，请检查是否存在问题', notificationId)
  commonFunctions.setUpAutoStart(5)
} else {
  // 执行成功 撤销定时任务
  commonFunctions.cancelAllTimedTasks()
}
// setInterval(() => {}, 4000)
commonFunctions.minimize()

if (config.auto_lock === true && unlocker.needRelock() === true) {
  debugInfo('重新锁定屏幕')
  automator.lockScreen()
  unlocker.saveNeedRelock(true)
}
runningQueueDispatcher.removeRunningTask(true)

exit()