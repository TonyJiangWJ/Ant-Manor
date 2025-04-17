
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
// 代理图片资源回收
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
let manorRunner = require('../core/AntManorRunner.js')
let collector = require('../core/FodderCollector.js')
let unlocker = require('../lib/Unlock.js')
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let yoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetection = singletonRequire('YoloDetectionUtil')
let automator = singletonRequire('Automator')
let LogFloaty = singletonRequire('LogFloaty')
let WarningFloaty = singletonRequire('WarningFloaty')
let FloatyInstance = singletonRequire('FloatyUtil')
let NotificationHelper = singletonRequire('Notification')
FloatyInstance.enableLog()
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')

function FamilySinger () {

  this.enterFamily = function () {
    LogFloaty.pushLog('等待打开蚂蚁庄园页面')
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
    return enterFamily()
  }

  this.haveNotBeenEnteredAnyFamily = function () {
    let ocrRegion = [0, config.device_height * 0.8, config.device_width, config.device_height * 0.2]
    if (manorRunner.checkByOcr(ocrRegion, '(创建|加入)家庭')) {
      LogFloaty.pushErrorLog('未加入任何家庭')
      return true
    }
    return false
  }

  /**
   * 打开抽屉
   */
  this.openDrawer = function () {
    if (widgetUtils.widgetCheck('邀请家长入队.*', 1000)) {
      LogFloaty.pushLog('当前抽屉已打开')
      return true
    }
    let ocrRegion = [0, config.device_height * 0.8, config.device_width, config.device_height * 0.2]
    LogFloaty.pushLog('查找 攒亲密度')
    if (clickByOcr('.*亲密度', ocrRegion)) {
      LogFloaty.pushLog('找到了 攒亲密度')
      sleep(1000)
      let opened = widgetUtils.widgetGetOne('关闭', 1000)
      if (!opened) {
        LogFloaty.pushErrorLog('未能打开抽屉')
        return false
      }
      return true
    }
    // 打开失败
    LogFloaty.pushErrorLog('打开抽屉失败 ocr无法找到 攒亲密度')
    return false
  }

  /**
   * 投喂美食
   */
  this.feedFamily = function () {
    let feedBtn = widgetUtils.widgetGetOne('去请客', 1000)
    if (feedBtn) {
      feedBtn.click()
      LogFloaty.pushLog('找到了 去请客')
      // 等待
      sleep(1000)
      let confirm = widgetUtils.widgetGetOne('确认.*', 1000)
      if (confirm) {
        confirm.click()
        LogFloaty.pushLog('等待喂食动画结束')
        sleep(5000)
      }
      return true
    } else {
      LogFloaty.pushWarningLog('未找到 去请客 按钮，投喂失败')
      return false
    }
  }

  /**
   * 投喂一个
   * @returns 
   */
  this.feedOne = function () {
    let feedBtn = widgetUtils.widgetGetOne('去喂食', 1000)
    if (feedBtn) {
      feedBtn.click()
      LogFloaty.pushLog('找到了 去喂食')
      // 等待
      sleep(1000)
      let confirm = widgetUtils.widgetGetOne('确认.*', 1000)
      if (confirm) {
        confirm.click()
        sleep(500)
      }
      return true
    } else {
      LogFloaty.pushWarningLog('未找到 去喂食 按钮，投喂失败')
      return false
    }
  }


  /**
   * 指派
   * @returns 
   */
  this.assignDuties = function () {
    let feedBtn = widgetUtils.widgetGetOne('去指派', 1000)
    if (feedBtn) {
      feedBtn.click()
      LogFloaty.pushLog('找到了 去指派')
      // 等待
      sleep(2000)
      let confirm = widgetUtils.widgetGetOne('确认.*', 1000)
      if (confirm) {
        confirm.click()
        LogFloaty.pushLog('点击确认按钮')
        sleep(500)
      } else {
        LogFloaty.pushErrorLog('未能找到 确认 按钮')
      }
      return true
    } else {
      LogFloaty.pushWarningLog('未找到 去指派 按钮，指派失败')
      return false
    }
  }

  /**
   * 执行签到 1贡献点
   * @returns 
   */
  this.execSign = function () {
    if (clickByOcr('立即签到')) {
      sleep(1000)
      let confirmBtn = widgetUtils.widgetGetOne('开心收下', 1000)
      if (confirmBtn) {
        LogFloaty.pushLog('找到了开心收下')
        automator.clickCenter(confirmBtn)
        sleep(1000)
      }
      if (widgetUtils.widgetCheck('去指派|去分享|去喂食', 3000)) {
        LogFloaty.pushLog('签到完成')
        // 关闭抽屉
        automator.click(config.device_width / 2, config.device_height * 0.25)
        return true
      } else {
        LogFloaty.pushErrorLog('未能找到签到完成控件，可能签到失败了')
        return false
      }
    } else {
      let ocrRegion = [0, config.device_height * 0.8, config.device_width, config.device_height * 0.2]
      if (manorRunner.checkByOcr(ocrRegion, '.*亲密度')) {
        LogFloaty.pushLog('今日签到已完成')
        return true
      }
      LogFloaty.pushErrorLog('无法找到立即签到')
    }
  }

  /**
   * 执行捐蛋 10贡献点
   */
  this.donateEgg = function () {
    LogFloaty.pushLog('查找去捐蛋')
    // TODO 使控件可见
    let donateEggEntry = widgetUtils.widgetGetOne('.*去捐蛋.*')
    if (donateEggEntry) {
      LogFloaty.pushLog('找到了去捐蛋')
      automator.clickCenter(donateEggEntry)
      sleep(1000)
      donateEggEntry = widgetUtils.widgetGetOne('.*去捐蛋.*')
      if (donateEggEntry) {
        LogFloaty.pushLog('找到了去捐蛋')
        automator.clickCenter(donateEggEntry)
        sleep(1000)
        // 执行捐蛋操作
        let donateEgg = findByWidgetAndRecheckByOcr('立即捐蛋')
        if (donateEgg) {
          LogFloaty.pushLog('找到了立即捐蛋')
          automator.clickCenter(donateEgg)
          sleep(1000)
          widgetUtils.widgetWaiting('捐爱心蛋')
          sleep(1000)
          let regex = /当前还有(\d+).*可捐/
          let remainEggs = widgetUtils.widgetGetOne(regex)
          if (remainEggs) {
            let remains = regex.exec(remainEggs.text())
            LogFloaty.pushLog('当前还剩蛋蛋个数：' + remains[1])
          }
          donateEgg = findByWidgetAndRecheckByOcr('立即捐蛋')
          if (donateEgg) {
            automator.clickCenter(donateEgg)
            sleep(1000)
          }
        } else {
          LogFloaty.pushErrorLog('未找到立即捐蛋 可能没有捐蛋次数')
        }
        // 执行返回
        automator.back()
        sleep(1000)
        automator.back()
        return true
      }
    } else {
      LogFloaty.pushErrorLog('未找到去捐蛋 可能已经捐过了')
    }
    return false
  }

  // 每日捐步，2贡献点
  this.donateSport = function () {
    let donateSportEntry = widgetUtils.widgetGetOne('去捐步')
    // TODO 使控件可见
    if (donateSportEntry) {
      LogFloaty.pushLog('找到了去捐步')
      automator.clickCenter(donateSportEntry)
      // 执行捐步操作
      let donateSport = widgetUtils.widgetGetOne('去捐步数')
      if (donateSport) {
        LogFloaty.pushLog('找到了去捐步数')
        automator.clickCenter(donateSport)
        sleep(3000)
        let donateBtn = widgetUtils.widgetGetOne('立即捐步')
        if (donateBtn) {
          LogFloaty.pushLog('找到了立即捐步')
          automator.clickCenter(donateBtn)
          sleep(3000)
        }
        // 执行返回
        automator.back()
        // 点击关闭抽屉
        sleep(1000)
        automator.click(config.device_width / 2, config.device_height * 0.25)
      }
    } else {
      LogFloaty.pushErrorLog('未找到 去捐步 可能已经捐过了')
    }
  }

  function clickByOcr (targetContent, region) {
    LogFloaty.hide()
    FloatyInstance.setFloatyInfo(null, '')
    // 等待隐藏
    sleep(100)
    try {
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
    } finally {
      LogFloaty.show()
    }
  }

  function enterFamily () {
    LogFloaty.pushLog('查找家庭入口')
    let findTarget = manorRunner.yoloCheck('家庭入口', { labelRegex: 'family' })
    if (findTarget) {
      automator.click(findTarget.x, findTarget.y)
      waitForFamily()
      return true
    }
    if (clickByOcr('家庭', [config.device_width * 0.3, config.device_height * 0.8, config.device_width * 0.5, config.device_height * 0.2])) {
      waitForFamily()
      return true
    } else {
      LogFloaty.pushErrorLog('查找家庭入口失败，请确认正确开启OCR')
    }
    return false
  }

  function waitForFamily () {
    let ocrRegion = [0, config.device_height * 0.8, config.device_width, config.device_height * 0.2]
    // 等待页面加载完毕
    let limit = 3
    LogFloaty.pushLog('等待校验是否进入了家庭界面')
    do {
      sleep(1000 * (4 - limit) * 1.5)
      if (manorRunner.checkByOcr(ocrRegion, '家庭管理|立即签到')) {
        LogFloaty.pushLog('找到了 家庭管理|立即签到')
        return true
      }
    } while (--limit > 0)
    LogFloaty.pushErrorLog('无法校验当前是否成功进入家庭页面')
    return false
  }


  function findByWidgetAndRecheckByOcr (findText) {
    let target = widgetUtils.widgetGetOne(findText)
    let tryTimes = 3
    if (target) {
      while (tryTimes-- > 0 && !manorRunner.checkByOcr(widgetUtils.boundsToRegion(target.bounds()), findText)) {
        target = widgetUtils.widgetGetOne(findText)
        sleep(500)
      }
      if (target && !widgetUtils.boundsInScreen(target.bounds())) {
        target = null
      }
    }
    return target
  }
}


module.exports = new FamilySinger()
