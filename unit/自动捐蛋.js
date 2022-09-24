let { config } = require('../config.js')(runtime, this)
config.async_save_log_file = false
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let automator = singletonRequire('Automator')
let widgetUtils = singletonRequire('WidgetUtils')
let localOcr = require('../lib/LocalOcrUtil.js')

let FloatyInstance = singletonRequire('FloatyUtil')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)

let manorRunner = require('../core/AntManorRunner.js')
let unlocker = require('../lib/Unlock.js')

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

commonFunctions.showCommonDialogAndWait('蚂蚁庄园自动捐蛋')
commonFunctions.listenDelayStart()
commonFunctions.requestScreenCaptureOrRestart(true)
manorRunner.launchApp()

if (doDonateEgg()) {
  infoLog('捐蛋成功')
} else {
  errorLog('捐蛋失败,1小时后重试')
  commonFunctions.setUpAutoStart(60)
}

commonFunctions.minimize()

if (config.auto_lock === true && unlocker.needRelock() === true) {
  debugInfo('重新锁定屏幕')
  automator.lockScreen()
  unlocker.saveNeedRelock(true)
}
runningQueueDispatcher.removeRunningTask(true)
exit()

function doDonateEgg() {
  // 点击捐蛋
  automator.click(530, 2100)
  sleep(2000)
  let donateEgg = findByWidgetAndRecheckByOcr('去捐蛋')
  if (donateEgg) {
    displayFloaty(donateEgg, '去捐蛋')
    automator.clickCenter(donateEgg)
    sleep(3000)
    donateEgg = findByWidgetAndRecheckByOcr('立即捐蛋')
    if (donateEgg) {
      displayFloaty(donateEgg, '立即捐蛋')
      automator.clickCenter(donateEgg)
      sleep(1000)
      widgetUtils.widgetWaiting('捐爱心蛋')
      sleep(1000)
      let regex = /当前还有(\d+).*可捐/
      let remainEggs = widgetUtils.widgetGetOne(regex)
      if (remainEggs) {
        let remains = regex.exec(remainEggs.text())
        infoLog(['当前还剩蛋蛋个数：{}', remains[1]])
      }
      donateEgg = findByWidgetAndRecheckByOcr('立即捐蛋')
      if (donateEgg) {
        displayFloaty(donateEgg, '立即捐蛋')
        automator.clickCenter(donateEgg)
        sleep(1000)
        return true
      }
    }
  }
  return false
}

function displayFloaty(target, desc) {
  FloatyInstance.setFloatyInfo({ x: target.bounds().centerX(), y: target.bounds().centerY() }, desc)
  sleep(500)
}

function checkOcrText(regex, target) {
  let bounds = target.bounds()
  let screen = commonFunctions.checkCaptureScreenPermission()
  if (screen) {
    let text = localOcr.recognize(screen, [bounds.left, bounds.top, bounds.width(), bounds.height()])
    if (text) {
      text = text.replace(/\n/g, '')
      return new RegExp(regex).test(regex)
    }
  }
  return !localOcr.enabled
}

function findByWidgetAndRecheckByOcr(findText) {
  let target = widgetUtils.widgetGetOne(findText)
  let tryTimes = 3
  if (target) {
    while (tryTimes-- > 0 && !checkOcrText(findText, target)) {
      target = widgetUtils.widgetGetOne(findText)
      sleep(500)
    }
  }
  return target
}