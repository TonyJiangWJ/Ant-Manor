let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
// 代理图片资源回收
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
let familySinger = require('../core/FamilySignRunner.js')
let unlocker = require('../lib/Unlock.js')
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let dateFormat = require('../lib/DateUtil.js')
let yoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetection = singletonRequire('YoloDetectionUtil')
let automator = singletonRequire('Automator')
let LogFloaty = singletonRequire('LogFloaty')
let FloatyInstance = singletonRequire('FloatyUtil')
let NotificationHelper = singletonRequire('Notification')

let { changeAccount, ensureMainAccount } = require('../lib/AlipayAccountManage.js')
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

commonFunctions.showCommonDialogAndWait('蚂蚁庄园家庭投喂-小号投喂')
commonFunctions.listenDelayStart()
commonFunctions.requestScreenCaptureOrRestart(true)
commonFunctions.backHomeIfInVideoPackage()

NotificationHelper.cancelNotice()
// 实时监控截图内容
require('../lib/WebsocketCaptureHijack.js')()
// 执行领取饲料
let failToExecute = true
try {
  changeToSubAccount()
  if (familySinger.enterFamily()) {
    familySinger.execSign()
    familySinger.openDrawer()
    familySinger.feedFamily()
    familySinger.openDrawer()
    familySinger.feedOne()
    familySinger.openDrawer()
    familySinger.assignDuties()
    if (familySinger.openDrawer()) {
      let nextFeedTime = widgetUtils.widgetGetOne('\\d+点后 可来请客', 1000)
      if (nextFeedTime) {
        let label = nextFeedTime.text() || nextFeedTime.desc()
        let checkResult = /(\d+)点.*/.exec(label)
        if (checkResult) {
          let remainTime = (parseInt(checkResult[1]) - new Date().getHours()) * 60 + 1
          let timestamp = new Date().getTime() + remainTime * 60 * 1000
          commonFunctions.setUpAutoStart(remainTime)
          NotificationHelper.createNotification('投喂完毕，等待下一次投喂', '下一次投喂时间：' + remainTime + '分钟后：' + dateFormat(new Date(timestamp)))
        }
      } else {
        let checkSuccess = false
        let targetTitle = widgetUtils.widgetGetOne('请家人吃一顿美食.*')
        if (targetTitle) {
          try {
            let nextButton = targetTitle.parent().child(targetTitle.indexInParent() + 1)
            if (nextButton.text() == '明天再来') {
              NotificationHelper.createNotification('蚂蚁庄园今日投喂完毕', '蚂蚁庄园家庭投喂完毕，明天再来')
              checkSuccess = true
            } else {
              warnInfo('当前按钮文本：' + nextButton.text() + ' 不匹配 明天再来')
            }
          } catch (e) {
            errorInfo(['检查 明天再来 失败:' + e])
          }
        }
        if (!checkSuccess) {
          NotificationHelper.createNotification('蚂蚁庄园今日投喂执行异常', '蚂蚁庄园家庭投喂失败，十分钟后再试')
          commonFunctions.setUpAutoStart(10)
        }
      }
    } else {
      NotificationHelper.createNotification('蚂蚁庄园今日投喂执行异常', '蚂蚁庄园家庭投喂失败，十分钟后再试')
      commonFunctions.setUpAutoStart(10)
    }
    failToExecute = false
  }
} catch (e) {
  LogFloaty.pushErrorLog('脚本执行异常' + e)
} finally {
  if (config.family_feed_account != config.main_account) {
    ensureMainAccount()
  }
}
if (failToExecute) {
  LogFloaty.pushErrorLog('当前执行失败，设置五分钟后重试')
  NotificationHelper.createNotification('家庭签到执行失败，请检查', '家庭签到执行失败，请检查是否存在问题')
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

function changeToSubAccount () {
  if (config.accounts && config.accounts.length > 1) {
    if (!config.family_feed_account) {
      LogFloaty.pushErrorLog('请配置小号账号，当前将使用主账号进行投喂')
      config.family_feed_account = config.main_account
    }
    if (config.family_feed_account == config.main_account) {
      LogFloaty.pushLog('当前投喂账号为主账号，无需切换')
      return
    }
    let targetAccount = config.accounts.filter(info => info.account == config.family_feed_account)[0].account
    LogFloaty.pushLog('准备切换到小号：' + targetAccount)
    changeAccount(targetAccount)
    LogFloaty.pushLog('小号切换完毕，等待执行')
    sleep(1000)
  } else {
    warnInfo(['当前未配置小号，直接执行'])
  }
}