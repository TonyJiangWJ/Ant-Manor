let { config } = require('../../config.js')(runtime, this)
let singletonRequire = require('../../lib/SingletonRequirer.js')(runtime, this)
let localOcrUtil = require('../../lib/LocalOcrUtil.js')
let automator = singletonRequire('Automator')
let LogFloaty = singletonRequire('LogFloaty')
let widgetUtils = singletonRequire('WidgetUtils')
let manorRunner = require('../../core/AntManorRunner.js')

module.exports = LuckyDrawRunner

function LuckyDrawRunner () {
  this.executeMode = 'normal'

  this.execute = function () {
    let failToExecute = true
    try {
      if (this.enterLuckDraw()) {
        this.checkIsEvent()
        if (this._has_event_tab) {
          LogFloaty.pushLog('切换到日常活动界面')
          this.changeToDaily()
          this.doTasks()
          this.doCollectAll()
          this.doDraw()
          // 切换活动界面
          LogFloaty.pushLog('切换到限定活动界面')
          this.changeToEvent()
          this.doTasks()
          this.doCollectAll()
          this.doDraw()
          failToExecute = false
        } else {
          this.doTasks()
          this.doDraw()
          failToExecute = false
        }
      }
    } catch (e) {
      LogFloaty.pushErrorLog('脚本执行异常' + e)
    }
    return !failToExecute
  }

  this.changeToEvent = function () {
    this.executeMode = 'event'
    this.checkIsEntered()
  }

  this.changeToDaily = function () {
    this.executeMode = 'normal'
    this.checkIsEntered()
  }

  this.checkIsEvent = function () {
    let appContainer = widgetUtils.widgetGetById('app')
    if (appContainer) {
      let subContainer = appContainer.child(0)
      if (subContainer) {
        let eventTabContainer = subContainer.child(0)
        if (eventTabContainer && eventTabContainer.childCount() > 1) {
          this._has_event_tab = true
          LogFloaty.pushLog('当前抽抽乐有活动信息')
          return true
        }
      }
    }
    return false
  }

  this.doCollectAll = function () {
    LogFloaty.pushLog('准备检查是否有可领取奖励')
    let collect = widgetUtils.widgetGetOne('领取', 1000)
    let limit = 5
    while (collect && limit-- > 0) {
      collect.click()
      sleep(1000)
      collect = widgetUtils.widgetGetOne('领取', 1000)
    }
  }

  this.enterLuckDraw = function () {
    LogFloaty.pushLog('等待打开蚂蚁庄园界面')
    let retryCount = 0, entered = false
    while (!(entered = manorRunner.launchApp(false, true)) && retryCount++ < 3) {
      // 等待打开
      LogFloaty.pushErrorLog('打开蚂蚁庄园界面失败，等待重试' + retryCount)
    }
    if (!entered) {
      LogFloaty.pushErrorLog('进入小鸡页面失败')
      return false
    }
    LogFloaty.pushLog('进入小鸡界面成功')
    // 等待界面加载完毕
    sleep(1000)
    return this.doOpenLuckyDraw()
  }

  this.doOpenLuckyDraw = function (forceOpen) {
    let screen = commonFunctions.captureScreen()
    if (screen) {
      let region = [0, 0, config.device_width / 2, config.device_height / 2]
      let results = localOcrUtil.recognizeWithBounds(screen, region, '抽抽乐')
      if (results && results.length > 0) {
        LogFloaty.pushLog('ocr找到了任务入口')
        let targetBd = results[0].bounds
        let target = {
          x: targetBd.centerX(),
          y: targetBd.centerY()
        }
        automator.click(target.x, target.y)
        sleep(1000)
        results = localOcrUtil.recognizeWithBounds(commonFunctions.captureScreen(), null, '去抽装扮')
        if (results && results.length > 0) {
          LogFloaty.pushLog('找到了 去抽装扮')
          targetBd = results[0].bounds
          target = {
            x: targetBd.centerX(),
            y: targetBd.centerY()
          }
          automator.click(target.x, target.y)
        } else {
          LogFloaty.pushLog('未找到 去抽装扮 直接点击中心点')
          automator.click(config.device_width / 2, config.device_height / 2)
        }
        if (this.checkIsEntered()) {
          return true
        }
      } else {
        LogFloaty.pushErrorLog('ocr未能找到入口')
      }
      LogFloaty.pushLog('未能进入界面，二次校验入口')
      results = localOcrUtil.recognizeWithBounds(commonFunctions.captureScreen(), null, '抽抽乐')
      if (results && results.length > 0) {
        LogFloaty.pushLog('ocr找到了任务入口')
        targetBd = results[0].bounds
        target = {
          x: targetBd.centerX(),
          y: targetBd.centerY()
        }
        automator.click(target.x, target.y)
        sleep(1000)
        results = localOcrUtil.recognizeWithBounds(commonFunctions.captureScreen(), null, '去抽装扮')
        if (results && results.length > 0) {
          LogFloaty.pushLog('找到了 去抽装扮')
          targetBd = results[0].bounds
          target = {
            x: targetBd.centerX(),
            y: targetBd.centerY()
          }
          automator.click(target.x, target.y)
        } else {
          LogFloaty.pushLog('未找到 去抽装扮 直接点击中心点')
          automator.click(config.device_width / 2, config.device_height / 2)
        }
        return this.checkIsEntered()
      }
      LogFloaty.pushErrorLog('OCR方式进入抽抽乐界面失败')
    } else {
      LogFloaty.pushErrorLog('获取截图失败')
    }
    let findTarget = manorRunner.yoloCheck('领饲料入口', { labelRegex: 'collect_food' })
    if (findTarget) {
      LogFloaty.pushLog('找到了领饲料按钮 点击进入')
      click(findTarget.x, findTarget.y)
      sleep(2000)
    } else {
      findTarget = widgetUtils.widgetGetOne('.*抽抽乐.*', 2000)
    }
    if (findTarget) {
      let targetWidget = widgetUtils.widgetGetOne('.*抽抽乐.*')
      if (targetWidget) {
        targetWidget.click()
        sleep(1000)
        return this.checkIsEntered()
      }
      LogFloaty.pushErrorLog('未找到 抽抽乐 入口控件')
    }
    if (forceOpen) {
      LogFloaty.pushErrorLog('未能打开抽抽乐界面，尝试关闭并重新打开')
      commonFunctions.minimize()
      return this.enterLuckDraw()
    }
    return false
  }

  this.checkIsEntered = function () {
    let entered = widgetUtils.widgetWaiting('还剩\\d+次机会')
    if (entered) {
      if (this._has_event_tab) {
        if (this.executeMode === 'event') {
          let tabCheck = selector().clickable().depth(15).indexInParent(1).findOne(1000)
          if (tabCheck) {
            LogFloaty.pushLog('切换到限定任务')
            tabCheck.click()
            sleep(1000)
          }
        } else {
          let tabCheck = selector().clickable().depth(15).indexInParent(0).findOne(1000)
          if (tabCheck) {
            LogFloaty.pushLog('切换到日常任务')
            tabCheck.click()
            sleep(1000)
          }
        }
      }
    }
    return entered
  }

  this.doTasks = function () {
    LogFloaty.pushLog('查找可完成任务')
    this.doHangTask()
    this.changeFood()
    this.dailySign()
  }

  this.doDraw = function (retry) {
    let clickBtn = widgetUtils.widgetGetOne('还剩\\d+次机会')
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
          if (this.doOpenLuckyDraw(true)) {
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

      if (this.doOpenLuckyDraw(true)) {
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
    LogFloaty.pushLog('检查是否有关闭弹窗按钮')
    let centerCloseBtn = selector().clickable().filter(node => {
      let bd = node.bounds()
      return bd.width() / bd.height() == 1 && bd.centerX() == config.device_width / 2 && bd.centerY() > config.device_height / 2
    }).findOne(2000)
    if (centerCloseBtn) {
      LogFloaty.pushLog('找到关闭弹窗按钮')
      centerCloseBtn.click()
    }
    let limit = 16
    while (limit-- > 0) {
      let start = new Date().getTime()
      LogFloaty.replaceLastLog('去杂货铺逛一逛 等待倒计时结束 剩余：' + limit + 's')
      if (limit % 2 == 0) {
        automator.randomScrollDown()
      } else {
        automator.randomScrollUp()
      }
      let sleepTime = 1000 - (new Date().getTime() - start)
      if (sleepTime > 0) {
        sleep(sleepTime)
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
      if (this.doOpenLuckyDraw(true)) {
        sleep(1000)
        return this.changeFood(tryLimit + 1)
      }
    }
    return
  }

  this.dailySign = function (tryLimit) {
    tryLimit = tryLimit || 1
    let signTitle = widgetUtils.widgetGetOne(/每日签到.*/)
    if (signTitle) {
      let currentIndex = signTitle.indexInParent()
      let executeBtn = signTitle.parent().child(currentIndex + 2)
      let btnText = executeBtn.text() || executeBtn.desc()
      if (btnText == '领取') {
        LogFloaty.pushLog('执行签到')
        executeBtn.click()
        sleep(1000)
        return true
      } else {
        LogFloaty.pushLog('今日已经签到 ' + btnText)
      }

    } else {
      if (tryLimit > 3) {
        LogFloaty.pushErrorLog('多次未找到签到控件 退出执行')
        return
      }
      LogFloaty.pushLog('未找到 每日签到 可能控件被隐藏了')
      automator.back()
      sleep(1000)
      if (this.doOpenLuckyDraw(true)) {
        sleep(1000)
        return this.dailySign(tryLimit + 1)
      }
    }
    return
  }
}