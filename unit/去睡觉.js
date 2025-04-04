let { config } = require('../config.js')(runtime, this)
config.async_save_log_file = false
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
// logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()
let automator = singletonRequire('Automator')

let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
let manorRunner = require('../core/AntManorRunner.js')
let unlocker = require('../lib/Unlock.js')
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let yoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetection = singletonRequire('YoloDetectionUtil')

let NotificationHelper = singletonRequire('Notification')
let LogFloaty = singletonRequire('LogFloaty')
let FloatyInstance = singletonRequire('FloatyUtil')
FloatyInstance.enableLog()

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
    debugInfo(['当前时间{} 不在晚上八点和早上6点之间', currentHours], true)
    return
  }
  manorRunner.launchApp()
  sleep(1000)
  manorRunner.checkIsSleeping()
  goToBed()
  manorRunner.waitForOwn(true)
  if (!manorRunner.checkIsSleeping(true)) {
    if (commonFunctions.increaseSleepFailed() > 3) {
      errorInfo(['重复睡觉失败多次，不再尝试'])
      NotificationHelper.createNotification('睡觉失败多次', '睡觉失败多次，不再尝试睡觉')
      return
    }
    // 睡觉失败 五分钟后重试
    commonFunctions.setUpAutoStart(5)
    warnInfo(['睡觉失败 五分钟后重试'])
    NotificationHelper.createNotification('睡觉失败', '小鸡睡觉失败，请检查页面状态')
  }
}

function goToBed () {
  let clickPosition = null
  yoloTrainHelper.saveImage(commonFunctions.captureScreen(), '睡觉入口', 'sleep_entry')
  if (YoloDetection.enabled) {
    let toSleep = manorRunner.yoloCheck('去睡觉', { confidence: 0.7, labelRegex: 'sleep' })
    if (toSleep) {
      FloatyInstance.setFloatyInfo(toSleep, '去睡觉')
      sleep(1000)
      clickPosition = toSleep
    } else {
      warnInfo(['无法通过YOLO检测到去睡觉入口，请确保设置中正确配置了入口坐标'])
    }
  }
  if (!clickPosition) {
    clickPosition = { x: config.to_sleep_entry.x || 860, y: config.to_sleep_entry.y || 1220 }
    debugInfo(['睡觉入口坐标: {}', JSON.stringify(clickPosition)])
  }
  FloatyInstance.setFloatyInfo(clickPosition, '去睡觉')
  sleep(1000)
  automator.click(clickPosition.x, clickPosition.y)
  // 训练，找到床
  sleep(2000)
  yoloTrainHelper.saveImage(commonFunctions.captureScreen(), '小鸡睡觉床', 'sleep_bed')
  automator.click(config.to_sleep_bed.x || 200, config.to_sleep_bed.y || 740)
  sleep(2000)
  let yesSleepBtn = widgetUtils.widgetGetOne(config.to_sleep_position ? '家庭别墅.*' : '爱心小屋')
  if (yesSleepBtn) {
    let bounds = yesSleepBtn.bounds()
    debugInfo(['btn: {}', bounds])
    FloatyInstance.setFloatyInfo({ x: bounds.centerX(), y: bounds.centerY() }, '去睡觉')
    sleep(1000)
    automator.click(bounds.centerX(), bounds.centerY())
  } else {
    LogFloaty.pushWarningLog('未找到指定按钮 可能没有饲料 或者睡觉中')
  }
  back()
}