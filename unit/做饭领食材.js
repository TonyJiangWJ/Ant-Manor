let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
// 代理图片资源回收
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
let manorRunner = require('../core/AntManorRunner.js')
let unlocker = require('../lib/Unlock.js')
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let yoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetection = singletonRequire('YoloDetectionUtil')
let automator = singletonRequire('Automator')
let LogFloaty = singletonRequire('LogFloaty')
let FloatyInstance = singletonRequire('FloatyUtil')
let NotificationHelper = singletonRequire('Notification')
FloatyInstance.enableLog()
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
if (!localOcrUtil.enabled) {
  errorInfo('当前脚本强依赖于OCR，请使用支持OCR的AutoJS版本进行执行')
  exit()
}
// logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()

let widgetUtils = singletonRequire('WidgetUtils')
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

commonFunctions.showCommonDialogAndWait('蚂蚁庄园自动领食材')
commonFunctions.listenDelayStart()
commonFunctions.requestScreenCaptureOrRestart(true)
NotificationHelper.cancelNotice(config.notificationId * 10 + 6)
// 执行领取饲料
let failToExecute = true
try {
  exec()
} catch (e) {
  LogFloaty.pushErrorLog('脚本执行异常' + e)
}
if (failToExecute) {
  LogFloaty.pushErrorLog('当前执行失败，设置五分钟后重试')
  commonFunctions.setUpAutoStart(5)
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


function exec () {
  LogFloaty.pushLog('等待打开蚂蚁庄园页面')
  manorRunner.launchApp()
  if (enterKitchen()) {
    let limit = 3
    LogFloaty.pushLog('等待页面加载')
    do {
      sleep(1000)
      if (manorRunner.checkByOcr(null, '抽抽乐|公仔')) {
        LogFloaty.pushLog('找到了 抽抽乐|公仔')
        limit = 0
      }
    } while (--limit > 0)
    let findBoard = findChoppingBoard(3)
    if (findBoard) {
      FloatyInstance.setFloatyInfo({ x: findBoard.centerX(), y: findBoard.centerY() }, '菜板')
      automator.click(findBoard.centerX(), findBoard.centerY())
      let limit = 3
      LogFloaty.pushLog('等待页面加载')
      do {
        sleep(1000)
        if (manorRunner.checkByOcr(null, '做美食')) {
          LogFloaty.pushLog('找到了 做美食')
          limit = 0
        }
      } while (--limit > 0)
      let cookLimit = 5
      while (cookFood() && cookLimit-- > 0) {
        sleep(1000)
      }
      // 领每日食材
      let dailySuccess = collectWithOcr('领今日食材')
      let farmSuccess = collectWithOcr('领取.*')
      if (!farmSuccess) {
        farmSuccess = collectFarmByImg()
      }
      if (!dailySuccess || !farmSuccess) {
        NotificationHelper.createNotification('每日食材领取失败，请手动执行', '今日'
          + (!dailySuccess ? '[每日食材]' : '')
          + (!farmSuccess ? '[农场施肥食材]' : '') + '领取失败，请手动执行',
          config.notificationId * 10 + 6)
      }
      if (collectWithOcr('爱心食材店')) {
        failToExecute = false
        let target = widgetUtils.widgetGetOne('领10g食材|已领取')
        if (target) {
          FloatyInstance.setFloatyInfo({ x: target.bounds().centerX(), y: target.bounds().centerY() }, target.text() || '领取食材')
          if (target.text() != '已领取') {
            automator.clickCenter(target)
            sleep(1000)
          }
        } else {
          LogFloaty.pushErrorLog('无法找到 领10g食材')
        }
      } else {
        LogFloaty.pushErrorLog('无法找到 菜板，无法执行领取')
      }
    }
  } else {
    LogFloaty.pushErrorLog('无法找到 做饭 入口')
  }
}

function collectWithOcr (targetContent, region) {
  let screen = commonFunctions.captureScreen()
  if (screen) {
    let result = localOcrUtil.recognizeWithBounds(screen, region, targetContent)
    if (result && result.length > 0) {
      let collectBounds = result[0].bounds
      FloatyInstance.setFloatyInfo({ x: collectBounds.left, y: collectBounds.top }, targetContent)
      automator.click(collectBounds.centerX(), collectBounds.centerY())
      sleep(1000)
      return true
    } else {
      LogFloaty.pushErrorLog('未能找到[' + targetContent + ']')
    }
  } else {
    LogFloaty.pushErrorLog('截图失败')
  }
  return false
}

function enterKitchen () {

  LogFloaty.pushLog('查找做饭入口')
  let entry = manorRunner.yoloCheck('做饭入口', { confidence: 0.7, labelRegex: 'cook|sleep' })
  if (entry) {
    FloatyInstance.setFloatyInfo(entry, '做饭入口')
    automator.click(entry.x, entry.y)
    sleep(1000)
    return true
  }
  LogFloaty.pushLog('通过去睡觉配置进入，请确保在可视化配置中正确配置了睡觉入口坐标')
  let clickPosition = { x: config.to_sleep_entry.x || 860, y: config.to_sleep_entry.y || 1220 }
  debugInfo(['睡觉入口坐标: {}', JSON.stringify(clickPosition)])
  FloatyInstance.setFloatyInfo(clickPosition, '去睡觉')
  sleep(1000)
  automator.click(clickPosition.x, clickPosition.y)
  sleep(1000)
  return true
}

function findChoppingBoard (limit) {
  if (limit <= 0) {
    LogFloaty.pushErrorLog('无法找到菜板，请确认正确配置了相应图片')
    return false
  }
  limit = limit || 3
  let screen = commonFunctions.captureScreen()
  if (screen) {
    // todo 目前懒得训练图片，先用图片查找 后续替换成YOLO
    let grayScreen = images.grayscale(screen)
    let matchResult = OpenCvUtil.findByGrayBase64(grayScreen, config.fodder_config.chopping_board, true)
    if (!matchResult) {
      matchResult = OpenCvUtil.findBySIFTBase64(grayScreen, config.fodder_config.chopping_board)
    }
    if (matchResult) {
      return matchResult
    }
  }
  // 增加延迟
  sleep(500)
  return findChoppingBoard(limit - 1)
}

function cookFood() {
  if (collectWithOcr('做美食', [0, config.device_height * 0.6, config.device_width, config.device_height * 0.4])) {
    let cooked = true
    let noMoreFoodMaterial = widgetUtils.widgetGetOne('食材不够.*', 2000)
    if (noMoreFoodMaterial) {
      LogFloaty.pushLog('食材不够了，不再继续做饭')
      cooked = false
    }
    let close = widgetUtils.widgetGetOne('关闭', 1000)
    if (close) {
      automator.clickCenter(close)
      return cooked
    } else {
      LogFloaty.pushErrorLog('无法找到 关闭 按钮')
    }
  }
  return false
}

function collectFarmByImg() {
  LogFloaty.pushLog('通过图片查找是否有 领取食材')
  let screen = commonFunctions.captureScreen()
  if (screen) {
    // todo 目前懒得训练图片，先用图片查找 后续替换成YOLO
    let grayScreen = images.grayscale(screen)
    let matchResult = OpenCvUtil.findByGrayBase64(grayScreen, config.fodder_config.chopping_board, true)
    if (!matchResult) {
      matchResult = OpenCvUtil.findBySIFTBase64(grayScreen, config.fodder_config.chopping_board)
    }
    if (matchResult) {
      FloatyInstance.setFloatyInfo({ x: matchResult.centerX(), y: matchResult.centerY() }, '领取食材')
      automator.click(matchResult.centerX(), matchResult.centerY())
      return true
    }
  }
  LogFloaty.pushErrorLog('通过图片查找失败，请确认是否正确配置了相关图片')
  return false
}