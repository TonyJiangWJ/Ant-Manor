let { config } = require('../config.js')(runtime, this)
config.async_save_log_file = false
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let automator = singletonRequire('Automator')

let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
let manorRunner = require('../core/AntManorRunner.js')
let unlocker = require('../lib/Unlock.js')
let localOcrUtil = require('../lib/LocalOcrUtil.js')

let FloatyInstance = singletonRequire('FloatyUtil')
FloatyInstance.enableLog()
logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()

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

commonFunctions.showCommonDialogAndWait('蚂蚁庄园自动睡觉')
commonFunctions.listenDelayStart()
commonFunctions.requestScreenCaptureOrRestart(true)

// 执行睡觉
exec()

// setInterval(() => {}, 4000)
commonFunctions.minimize()

if (config.auto_lock === true && unlocker.needRelock() === true) {
  debugInfo('重新锁定屏幕')
  automator.lockScreen()
  unlocker.saveNeedRelock(true)
}
runningQueueDispatcher.removeRunningTask(true)
exit()

function exec () {

  let currentHours = new Date().getHours()
  if (currentHours > 6 && currentHours < 20) {
    // 晚上八点到早上6点检查是否睡觉中 其他时间跳过
    _debugInfo(['当前时间{} 不在晚上八点和早上6点之间', currentHours], true)
    return
  }
  manorRunner.launchApp()
  sleep(1000)
  manorRunner.checkIsSleeping()
  goToBed()
  manorRunner.waitForOwn(true)
  if (!manorRunner.checkIsSleeping(true)) {
    // 睡觉失败 五分钟后重试
    commonFunctions.setUpAutoStart(5)
    warnInfo(['睡觉失败 五分钟后重试'])
  }
}

function goToBed () {
  let toSleepPosition = { x: config.to_sleep_entry.x || 860, y: config.to_sleep_entry.y || 1220 }
  FloatyInstance.setFloatyInfo(toSleepPosition, '去睡觉')
  sleep(1000)
  automator.click(toSleepPosition.x, toSleepPosition.y)
  sleep(2000)
  automator.click(config.to_sleep_bed.x || 200, config.to_sleep_bed.y || 740)
  sleep(2000)
  let yesSleepBtn = widgetUtils.widgetGetOne('去睡觉')
  if (yesSleepBtn) {
    let bounds = yesSleepBtn.bounds()
    debugInfo(['btn: {}', bounds])
    FloatyInstance.setFloatyInfo({ x: bounds.centerX(), y: bounds.centerY() }, '去睡觉')
    sleep(1000)
    automator.click(bounds.centerX(), bounds.centerY())
  }
  back()
}