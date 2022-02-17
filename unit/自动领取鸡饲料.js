let { config } = require('../config.js')(runtime, this)
config.async_save_log_file = false
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let automator = singletonRequire('Automator')

let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
let collector = require('../core/FodderCollector.js')
let manorRunner = require('../core/AntManorRunner.js')
let unlocker = require('../lib/Unlock.js')

logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}

// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  config.resetBrightness && config.resetBrightness()
  debugInfo('校验并移除已加载的dex')
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, true,
    () => {
      // 保存是否需要重新锁屏
      unlocker.saveNeedRelock()
      config.isRunning = false
    }
  )
}, 'main')

unlocker.exec()

commonFunctions.showCommonDialogAndWait('蚂蚁庄园自动领饲料')
commonFunctions.listenDelayStart()
commonFunctions.requestScreenCaptureOrRestart(true)
manorRunner.launchApp()

collector.exec()

commonFunctions.minimize()

if (config.auto_lock === true && unlocker.needRelock() === true) {
  debugInfo('重新锁定屏幕')
  automator.lockScreen()
  unlocker.saveNeedRelock(true)
}
runningQueueDispatcher.removeRunningTask(true)
exit()