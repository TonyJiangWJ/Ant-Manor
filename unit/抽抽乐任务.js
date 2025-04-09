let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
// 代理图片资源回收
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
let unlocker = require('../lib/Unlock.js')
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let yoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetection = singletonRequire('YoloDetectionUtil')
let automator = singletonRequire('Automator')
let LogFloaty = singletonRequire('LogFloaty')
let FloatyInstance = singletonRequire('FloatyUtil')
let NotificationHelper = singletonRequire('Notification')
let manorRunner = require('../core/AntManorRunner.js')
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

commonFunctions.showCommonDialogAndWait('蚂蚁庄园抽抽乐')
commonFunctions.listenDelayStart()
commonFunctions.requestScreenCaptureOrRestart(true)

const notificationId = config.notificationId * 100 + (commonFunctions.simpleHash(engines.myEngine().getSource() + '') % 100)
debugInfo(['构建当前通知id：{}', notificationId])
NotificationHelper.cancelNotice(notificationId)
// 实时监控截图内容
require('../lib/WebsocketCaptureHijack.js')()
// 执行领取饲料
let failToExecute = true
let luckyDraw = new LuckyDrawRunner()
try {
  if (luckyDraw.enterLuckDraw()) {
    luckyDraw.doTasks()
    luckyDraw.doDraw()
    if (luckyDraw._has_event_tab) {
      luckyDraw.changeToEvent()
      if (luckyDraw.enterLuckDraw()) {
        luckyDraw.doTasks()
        luckyDraw.doDraw()
        failToExecute = false
      }
    } else {
      failToExecute = false
    }
  }
} catch (e) {
  LogFloaty.pushErrorLog('脚本执行异常' + e)
}
if (failToExecute) {
  LogFloaty.pushErrorLog('当前执行失败，设置五分钟后重试')
  NotificationHelper.createNotification('抽抽乐执行失败，请检查', '抽抽乐执行失败，请检查是否存在问题', notificationId)
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


function LuckyDrawRunner () {

  this.changeToEvent = function () {
    this.executeMode = 'event'
  }
  this.enterLuckDraw = function () {
    LogFloaty.pushLog('等待打开蚂蚁庄园界面')
    let retryCount = 0
    while (!manorRunner.launchApp(false, true) && retryCount++ < 3) {
      // 等待打开
      LogFloaty.pushErrorLog('打开蚂蚁庄园界面失败，等待重试' + retryCount)
    }
    if (!manorRunner.waitForOwn(true)) {
      LogFloaty.pushErrorLog('校验失败，进入家庭页面失败')
      return false
    }
    // 等待界面加载完毕
    sleep(1000)
    return this.doOpenLuckyDraw()
  }

  this.doOpenLuckyDraw = function () {
    let findTarget = manorRunner.yoloCheck('领饲料入口', { labelRegex: 'collect_food' })
    if (findTarget) {
      LogFloaty.pushLog('找到了领饲料按钮 点击进入')
      click(findTarget.x, findTarget.y)
      sleep(2000)
      return this.findAndEnterLuckyDraw()
    }
    return false
  }

  this.findAndEnterLuckyDraw = function () {
    LogFloaty.pushLog('查找抽抽乐控件')
    let title = widgetUtils.widgetGetOne('.*抽抽乐.*')
    if (title) {
      LogFloaty.pushLog('找到抽抽乐控件，点击进入')
      title.click()
      sleep(1000)
      let hasWidget = widgetUtils.widgetWaiting('还剩\\d+次机会')
      if (!hasWidget) {
        return false
      }
      /* 活动已结束，这段校验有问题，暂时移除 等下次有活动了再优化
      if (this.executeMode == 'event') {
        let tabCheck = selector().clickable().depth(15).indexInParent(1).findOne(1000)
        if (tabCheck) {
          this._has_event_tab = true
          LogFloaty.pushLog('当前有活动页面，点击进入活动页面')
          tabCheck.click()
          sleep(1000)
        } else {
          LogFloaty.pushLog('当前无活动页面')
        }
      } else {
        let tabCheck = selector().clickable().depth(15).indexInParent(0).findOne(1000)
        if (tabCheck) {
          this._has_event_tab = true
          LogFloaty.pushLog('当前有活动页面，点击普通活动')
          tabCheck.click()
          sleep(1000)
        } else {
          LogFloaty.pushLog('当前无活动页面')
        }
      }
      */
      return true
    }
    return false
  }

  this.doTasks = function () {
    LogFloaty.pushLog('查找可完成任务')
    this.doHangTask()
    this.changeFood()
  }

  this.doDraw = function (retry) {
    let clickBtn = widgetUtils.widgetGetOne('还剩\\d次机会')
    if (clickBtn) {
      LogFloaty.pushLog('执行抽奖：' + clickBtn.text())
      if (/0次机会/.test(clickBtn.text())) {
        return
      }
      automator.clickCenter(clickBtn)
      LogFloaty.pushLog('抽抽乐 等待抽奖结束')
      sleep(3000)
      let confirmBtn = widgetUtils.widgetGetOne('知道啦', 2000)
      if (confirmBtn) {
        confirmBtn.click()
        sleep(1000)
      } else {
        LogFloaty.pushErrorLog('未找到 知道啦 按钮 查找关闭按钮')
        let closeBtn = selector().clickable().filter(node => {
          let bounds = node.bounds()
          let ratio = bounds.width() / bounds.height()
          return bounds.top > config.device_height / 2 && ratio > 0.95 && ratio < 1.05
        }).findOne(1000)
        if (closeBtn) {
          LogFloaty.pushLog('找到了关闭按钮')
          closeBtn.click()
          sleep(1000)
        } else {
          LogFloaty.pushErrorLog('未能找到关闭按钮 直接返回 重新进入')
          automator.back()
          if (this.findAndEnterLuckyDraw()) {
            sleep(1000)
            return this.doDraw()
          }
        }
      }
      return this.doDraw()
    } else {
      if (retry) {
        LogFloaty.pushErrorLog('未能找到抽奖按钮 退出执行')
        return
      }
      LogFloaty.pushErrorLog('未能找到抽奖按钮 重新进入页面')
      automator.back()

      if (this.findAndEnterLuckyDraw()) {
        sleep(1000)
        return this.doDraw(retry)
      }
    }
    return
  }

  this.doHangTask = function () {
    let hangTitle = widgetUtils.widgetGetOne(/去杂货铺逛一逛.*/)
    if (hangTitle) {
      let currentIndex = hangTitle.indexInParent()
      let executeBtn = hangTitle.parent().child(currentIndex + 2)
      if (executeBtn.text() == '领取') {
        LogFloaty.pushLog('先领取抽奖机会')
        executeBtn.click()
        sleep(1000)
        hangTitle = widgetUtils.widgetGetOne(/去杂货铺逛一逛.*/)
        currentIndex = hangTitle.indexInParent()
        executeBtn = hangTitle.parent().child(currentIndex + 2)
      }
      if (!/.*\([012]\/3\)/.test(hangTitle.text())) {
        LogFloaty.pushLog('杂货铺任务已完成')
        return
      }
      automator.clickCenter(executeBtn)
      sleep(1000)
      this.doBrowseAds()
      LogFloaty.pushLog('逛一逛完成，循环执行下一次')
      sleep(1000)
      return this.doHangTask()
    } else {
      return
    }
  }

  this.doBrowseAds = function () {
    LogFloaty.pushLog('去杂货铺逛一逛 等待倒计时结束')
    if (!widgetUtils.widgetWaiting('滑动浏览得抽奖机会')) {
      LogFloaty.pushErrorLog('当前不在杂货铺页面 退出执行')
      return false
    }

    let limit = 15
    while (limit-- > 0) {
      sleep(1000)
      LogFloaty.replaceLastLog('去杂货铺逛一逛 等待倒计时结束 剩余：' + limit + 's')
      if (limit % 2 == 0) {
        automator.randomScrollDown()
      } else {
        automator.randomScrollUp()
      }
    }
    if (!widgetUtils.widgetGetOne('已完成 可领奖励', 1000)) {
      LogFloaty.pushLog('去杂货铺逛一逛结束，但未找到完成控件，重新向上滑动')
      let limit = 11
      while (limit-- > 0) {
        LogFloaty.replaceLastLog('去杂货铺逛一逛 等待倒计时结束 剩余：' + limit + 's')
        if (limit % 2 == 0) {
          automator.randomScrollUp()
        } else {
          automator.randomScrollDown()
        }
        if (widgetUtils.widgetGetOne('已完成 可领奖励', 1000)) {
          break
        }
      }
    }
    automator.back()
  }

  this.changeFood = function (tryLimit) {
    tryLimit = tryLimit || 1
    let changeTitle = widgetUtils.widgetGetOne(/消耗饲料换机会.*/)
    if (changeTitle) {
      let currentIndex = changeTitle.indexInParent()
      let executeBtn = changeTitle.parent().child(currentIndex + 2)
      if (!/.*\([01]\/2\)/.test(changeTitle.text()) || this.lastChangeTitle == changeTitle.text()) {
        LogFloaty.pushLog('饲料换取机会已用完')
        return
      }
      this.lastChangeTitle = changeTitle.text()
      automator.clickCenter(executeBtn)
      sleep(1000)
      let confirm = widgetUtils.widgetGetOne('确认兑换')
      if (confirm) {
        automator.clickCenter(confirm)
        sleep(2000)
      }
      LogFloaty.pushLog('查找是否还能兑换')
      sleep(1000)
      return this.changeFood(tryLimit)
    } else {
      if (tryLimit > 3) {
        LogFloaty.pushErrorLog('多次未找到换饲料控件 退出执行')
        return
      }
      LogFloaty.pushLog('未找到 消耗饲料换机会按钮 可能控件被隐藏了')
      automator.back()
      sleep(1000)
      if (this.findAndEnterLuckyDraw()) {
        sleep(1000)
        return this.changeFood(tryLimit + 1)
      }
    }
    return
  }
}