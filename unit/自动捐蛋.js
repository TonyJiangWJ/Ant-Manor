let { config } = require('../config.js')(runtime, this)
config.async_save_log_file = false
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let automator = singletonRequire('Automator')
let widgetUtils = singletonRequire('WidgetUtils')
let localOcr = require('../lib/LocalOcrUtil.js')
let WarningFloaty = singletonRequire('WarningFloaty')
let YoloDetection = singletonRequire('YoloDetectionUtil')
let yoloTrainHelper = singletonRequire('YoloTrainHelper')
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
config.donate_egg = config.donate_egg || {}
if (doDonateEgg()) {
  infoLog('捐蛋成功')
} else {
  commonFunctions.setUpAutoStart(60)
  errorInfo('捐蛋失败,1小时后重试')
}

commonFunctions.minimize()

if (config.auto_lock === true && unlocker.needRelock() === true) {
  debugInfo('重新锁定屏幕')
  automator.lockScreen()
  unlocker.saveNeedRelock(true)
}
runningQueueDispatcher.removeRunningTask(true)
exit()

function doDonateEgg () {
  let clicked = false
  if (YoloDetection.enabled) {
    let donateButton = yoloCheck('捐蛋按钮', { confidence: 0.7, labelRegex: 'donate' })
    if (donateButton) {
      debugInfo(['通过YOLO找到捐蛋按钮: {}', donateButton])
      FloatyInstance.setFloatyInfo(donateButton, '捐蛋按钮')
      automator.click(donateButton.x, donateButton.y)
      clicked = true
    } else {
      warnInfo('未能通过YOLO找到捐蛋按钮', true)
    }
  }
  if (!clicked &&localOcr.enabled) {
    let recResult = localOcr.recognizeWithBounds(commonFunctions.captureScreen(), null, '去捐蛋')
    if (recResult && recResult.length > 0) {
      let btnBounds = recResult[0].bounds
      let position = { x: btnBounds.left, y: btnBounds.top }
      debugInfo(['通过OCR找到了捐蛋按钮：{}', position])
      FloatyInstance.setFloatyInfo(position, '捐蛋按钮')
      automator.click(position.x, position.y)
      clicked = true
    }
  }
  if (!clicked) {
    warnInfo(['未能通过YOLO或OCR找到捐蛋按钮，请确认在可视化配置-执行设置中正确配置了捐蛋按钮坐标'])
    // 点击捐蛋
    automator.click(config.donate_egg.x || 530, config.donate_egg.y || 2100)
  }
  sleep(2000)
  WarningFloaty.clearAll()
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

function displayFloaty (target, desc) {
  FloatyInstance.setFloatyInfo({ x: target.bounds().centerX(), y: target.bounds().centerY() }, desc)
  sleep(500)
}

function checkOcrText (regex, target) {
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

function findByWidgetAndRecheckByOcr (findText) {
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

function yoloCheck (desc, filter) {
  let img = null
  let result = []
  let tryTime = 5
  WarningFloaty.clearAll()
  debugInfo(['通过YOLO查找：{} props: {}', desc, JSON.stringify(filter)])
  do {
    sleep(400)
    img = commonFunctions.captureScreen()
    result = YoloDetection.forward(img, filter)
  } while (result.length <= 0 && tryTime-- > 0)
  if (result.length > 0) {
    let { x, y, width, height, label, confidence } = result[0]
    let left = x, top = y
    WarningFloaty.addRectangle('找到：' + desc, [left, top, width, height])
    debugInfo(['通过YOLO找到目标：{} label: {} confidence: {}', desc, label, confidence])
    if (confidence < 0.9) {
      yoloTrainHelper.saveImage(commonFunctions.captureScreen(), desc + 'yolo准确率低')
    }
    return { x: left + width / 2, y: top + height / 2, width: width, height: height, left: left, top: top, label: label }
  } else {
    debugInfo(['未能通过YOLO找到：{}', desc])
  }
  return null
}
