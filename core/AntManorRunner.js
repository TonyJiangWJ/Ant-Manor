
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)

let _runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let _commonFunctions = singletonRequire('CommonFunction')
let alipayUnlocker = singletonRequire('AlipayUnlocker')
let widgetUtils = singletonRequire('WidgetUtils')
let { logInfo: _logInfo, errorInfo: _errorInfo, warnInfo: _warnInfo, debugInfo: _debugInfo, infoLog: _infoLog } = singletonRequire('LogUtils')
let _FloatyInstance = singletonRequire('FloatyUtil')
_FloatyInstance.enableLog()
let fodderCollector = require('./FodderCollector.js')
let BaiduOcrUtil = require('../lib/BaiduOcrUtil.js')
let localOcr = require('../lib/LocalOcrUtil.js')
let contentDefine = {
  soft: {
    personal_home: '进入个人鸡儿页面',
    friend_home: '进入好友鸡儿页面',
  },
  hard: {
    personal_home: '进入个人小鸡页面',
    friend_home: '进入好友小鸡页面',
  }
}
const CONTENT = contentDefine[config.content_type || 'hard']
function getRegionCenter (region) {
  debugInfo(['转换region位置:{}', JSON.stringify(region)])
  return {
    x: region[0] + parseInt(region[2] / 2),
    y: region[1] + parseInt(region[3] / 2)
  }
}
function AntManorRunner () {

  this.setFloatyTextColor = function (colorStr) {
    _FloatyInstance.setFloatyTextColor(colorStr)
  }

  this.setFloatyInfo = function (position, text) {
    debugInfo(['设置悬浮窗位置: {} 内容: {}', JSON.stringify(position), text])
    _FloatyInstance.setFloatyInfo(position, text)
  }

  this.launchApp = function (reopen) {
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=66666674',
      packageName: 'com.eg.android.AlipayGphone'
    })
    _FloatyInstance.setFloatyInfo({ x: config.device_width / 2, y: config.device_height / 2 }, "查找是否有'打开'对话框")
    let confirm = widgetUtils.widgetGetOne(/^打开$/, 1000)
    if (confirm) {
      automator.clickCenter(confirm)
    }
    sleep(1000)
    if (openAlipayMultiLogin(reopen)) {
      this.launchApp(true)
    }

    if (config.is_alipay_locked) {
      sleep(1000)
      alipayUnlocker.unlockAlipay()
    }
    sleep(1000)
    this.waitForOwn()
  }

  this.waitFor = function (color, region, threshold) {
    let img = null
    let findColor = null
    let timeoutCount = 20
    do {
      sleep(400)
      img = _commonFunctions.checkCaptureScreenPermission()
      findColor = images.findColor(img, color, {
        region: region,
        threshold: threshold || config.color_offset || 4
      })
    } while (!findColor && timeoutCount-- > 0)
    return findColor
  }

  this.killAndRestart = function () {
    _commonFunctions.killCurrentApp()
    _commonFunctions.setUpAutoStart(1)
    if (config.auto_lock === true && unlocker.needRelock() === true) {
      sleep(1000)
      debugInfo('重新锁定屏幕')
      automator.lockScreen()
      unlocker.saveNeedRelock(true)
    }
    _runningQueueDispatcher.removeRunningTask()
    exit()
  }

  /**
   * 
   * @param {boolean} keepAlive 是否保持运行 而不是退出
   * @returns 
   */
  this.waitForOwn = function (keepAlive) {
    let findColor = this.waitFor(config.CHECK_APP_COLOR, config.CHECK_APP_REGION)
    if (findColor) {
      this.setFloatyInfo(null, CONTENT.personal_home + '成功')
      return true
    } else {
      this.setFloatyInfo(null, '检测失败，尝试OCR识别')
      if (this.checkByOcr([0, 0, config.device_width * 0.2, config.device_height / 2], '捐蛋反馈|开心飞起')) {
        this.setFloatyInfo(null, CONTENT.personal_home + '成功')
        return true
      }
      this.setFloatyTextColor('#ff0000')
      this.setFloatyInfo(getRegionCenter(config.CHECK_APP_REGION), CONTENT.personal_home + '失败，检测超时 ' + (keepAlive ? '等待脚本执行后续判断' : ''))
      if (!keepAlive) {
        this.killAndRestart()
      }
    }
    return false
  }


  this.waitForFriends = function () {
    let findColor = this.waitFor(config.CHECK_FRIENDS_COLOR, config.CHECK_FRIENDS_REGION)
    if (findColor) {
      this.setFloatyInfo(null, CONTENT.friend_home + '成功')
      return true
    } else {
      if (this.checkByOcr([0, 0, config.device_width * 0.2, config.device_height / 2], '给Ta留言')) {
        this.setFloatyInfo(null, CONTENT.friend_home + '成功')
        return true
      }
      this.setFloatyTextColor('#ff0000')
      this.setFloatyInfo(null, CONTENT.friend_home + '失败，检测超时')
      this.killAndRestart()
    }
  }

  this.waitForDismiss = function () {
    let findColor = this.waitFor(config.DISMISS_COLOR, config.DISMISS_REGION)
    if (findColor) {
      this.setFloatyInfo(findColor, '找到了关闭按钮')
      click(findColor.x, findColor.y)
    } else {
      this.setFloatyInfo(null, '没找到关闭按钮，奇了怪了')
    }
  }

  this.checkIsSleeping = function (notExit) {
    let now = new Date()
    let currentTime = {
      hour: now.getHours(),
      minute: now.getMinutes(),
    }
    if (currentTime.hour > 6 && currentTime.hour < 20) {
      // 晚上八点到早上6点检查是否睡觉中 其他时间跳过
      _debugInfo(['当前时间{} 不在晚上八点和早上6点之间', currentTime.hour])
      return false
    }
    if (!localOcr.enabled) {
      _warnInfo(['请至少安装mlkit-ocr插件或者修改版AutoJS获取本地OCR能力'])
      return false
    }
    let screen = _commonFunctions.checkCaptureScreenPermission()
    let sleepWidget = localOcr.recognizeWithBounds(screen, null, '睡觉中')
    if (sleepWidget && sleepWidget.length > 0) {
      let sleepBounds = sleepWidget[0].bounds
      _debugInfo(['find text: {}', sleepWidget[0].label])
      this.setFloatyInfo({ x: sleepBounds.left, y: sleepBounds.top }, '小鸡睡觉中')
      sleep(1000)
      // 设置第二天早上六点05启动 计算间隔时间
      _commonFunctions.setUpAutoStart(
        6 * 60 + (currentTime.hour >= 20 ?
          // 晚上八点后 加上当天剩余时间（分）
          (24 - currentTime.hour) * 60 - currentTime.minute
          // 早上六点前 减去已经经过的时间（分）
          : -(currentTime.hour * 60 + currentTime.minute)) + 5
      )
      _commonFunctions.minimize()
      resourceMonitor.releaseAll()
      _runningQueueDispatcher.removeRunningTask()
      if (notExit) {
        return true
      } else {
        exit()
      }
    }
    return false
  }

  this.checkIsOut = function () {
    let img = _commonFunctions.checkCaptureScreenPermission()
    let findColor = images.findColor(img, config.OUT_COLOR, {
      region: config.OUT_REGION,
      threshold: config.color_offset
    })
    if (findColor) {
      this.setFloatyInfo(findColor, '小鸡出去找吃的了')
      sleep(1000)
      this.setFloatyInfo(null, '点击去找小鸡')
      click(findColor.x, findColor.y)
      sleep(1000)
      this.waitForFriends()
      sleep(1000)
      img = _commonFunctions.checkCaptureScreenPermission()
      findColor = images.findColor(img, config.OUT_IN_FRIENDS_COLOR, {
        region: config.OUT_IN_FRIENDS_REGION_LEFT,
        threshold: config.color_offset
      })
      if (!findColor) {
        findColor = images.findColor(img, config.OUT_IN_FRIENDS_COLOR, {
          region: config.OUT_IN_FRIENDS_REGION_RIGHT,
          threshold: config.color_offset
        })
      }
      if (findColor) {
        this.setFloatyInfo(findColor, '找到了我的小鸡')
        sleep(1000)
        let heightRate = config.device_height / 2160
        this.setFloatyInfo({ x: findColor.x, y: findColor.y + 200 * heightRate }, '点击叫回小鸡')
        click(findColor.x, parseInt(findColor.y + 200 * heightRate))
        let isWorking = widgetUtils.widgetGetOne('小鸡工作中.*', 1000)
        if (isWorking) {
          _FloatyInstance.setFloatyText('小鸡工作中，寻找确认按钮')
          let confirmBtn = widgetUtils.widgetGetOne('确认')
          if (confirmBtn) {
            this.setFloatyInfo({ x: confirmBtn.bounds().left, y: confirmBtn.bounds().top }, '确认按钮')
            automator.clickCenter(confirmBtn)
          } else {
            _FloatyInstance.setFloatyText('未找到确认按钮')
            _errorInfo('未找到确认按钮，请手动执行', true)
          }
        }
        sleep(1000)
        this.waitForOwn()
      } else {
        this.setFloatyTextColor('#ff0000')
        this.setFloatyInfo(getRegionCenter(config.OUT_IN_FRIENDS_REGION_LEFT), '没有找到小鸡，奇了怪了！')
        return false
      }
    }
  }

  this.checkThiefLeft = function () {
    sleep(500)
    let img = _commonFunctions.checkCaptureScreenPermission()
    let findColor = images.findColor(img, config.THIEF_COLOR, {
      region: config.LEFT_THIEF_REGION,
      threshold: config.color_offset
    })
    if (findColor) {
      this.setFloatyInfo(findColor, '找到了左边的小透鸡')
      sleep(1000)
      this.setFloatyTextColor('#f35458')
      this.setFloatyInfo(null, '点击小透鸡')

      let punch = null
      let count = 3
      do {
        click(findColor.x, findColor.y)
        sleep(1500)
        img = _commonFunctions.checkCaptureScreenPermission()
        punch = images.findColor(img, config.PUNCH_COLOR, {
          region: config.LEFT_PUNCH_REGION,
          threshold: config.color_offset
        })
      } while (!punch && count-- > 0)

      if (punch) {
        this.setFloatyTextColor(config.PUNCH_COLOR)
        this.setFloatyInfo(punch, '找到了左边的小拳拳')
        sleep(2000)
        this.setFloatyInfo(null, '点击揍小鸡')
        click(punch.x, punch.y)
        sleep(1000)
        this.waitForDismiss()
        this.waitForOwn()
        sleep(1000)
        return true
      }
    } else {
      this.setFloatyInfo(getRegionCenter(config.LEFT_THIEF_REGION), '左边没野鸡')
    }
  }

  this.checkThiefRight = function () {
    sleep(500)
    let img = _commonFunctions.checkCaptureScreenPermission()
    let findColor = images.findColor(img, config.THIEF_COLOR, {
      region: config.RIGHT_THIEF_REGION,
      threshold: config.color_offset
    })
    if (findColor) {
      this.setFloatyInfo(findColor, '找到了右边的小透鸡')
      sleep(1000)
      this.setFloatyTextColor('#f35458')
      this.setFloatyInfo(null, '点击小透鸡')

      let punch = null
      let count = 3
      do {
        click(findColor.x, findColor.y)
        sleep(1500)
        img = _commonFunctions.checkCaptureScreenPermission()
        punch = images.findColor(img, config.PUNCH_COLOR, {
          region: config.RIGHT_PUNCH_REGION,
          threshold: config.color_offset
        })
      } while (!punch && count-- > 0)

      if (punch) {
        this.setFloatyTextColor(config.PUNCH_COLOR)
        this.setFloatyInfo(punch, '找到了右边的小拳拳')
        sleep(2000)
        this.setFloatyInfo(null, '点击揍小鸡')
        click(punch.x, punch.y)
        sleep(1000)
        this.waitForDismiss()
        this.waitForOwn()
        sleep(1000)
        return true
      }
    } else {
      this.setFloatyInfo(getRegionCenter(config.RIGHT_THIEF_REGION), '右边没野鸡')
    }
  }

  this.checkAndFeed = function () {
    sleep(500)
    let img = _commonFunctions.checkCaptureScreenPermission()
    // 记录是否执行了喂食操作
    let feed = false
    if (img) {
      let findColor = images.findColor(img, config.FOOD_COLOR, {
        region: config.FOOD_REGION,
        threshold: config.color_offset || 4
      })
      if (findColor) {
        this.setFloatyInfo(findColor, '小鸡有饭吃哦')
      } else {
        this.setFloatyTextColor('#ff0000')
        this.setFloatyInfo({ x: config.FOOD_REGION[0], y: config.FOOD_REGION[1] }, '小鸡没饭吃呢')
        click(config.FEED_POSITION.x, config.FEED_POSITION.y)
        feed = true
        // 避免加速卡使用失败导致时间计算不正确的问题
        _commonFunctions.updateSleepTime(20, true)
        if (config.useSpeedCard) {
          this.useSpeedCard()
        }
      }
      if (this.checkSpeedSuccess()) {
        _commonFunctions.setSpeeded()
      } else {
        _commonFunctions.setSpeedFail()
      }
      sleep(1500)
      let ocrRestTime = this.recognizeCountdownByOcr()
      if (feed) {
        // 刚刚喂食，且成功识别OCR，将当前时间设置为执行倒计时
        _commonFunctions.updateSleepTime(20, false, ocrRestTime)
        // 喂鸡后领取饲料
        fodderCollector.exec()
        this.waitForOwn(true)
      } else if (ocrRestTime > -1) {
        // 大概情况就是上一次执行喂食后加速卡用完了 导致OCR识别失败 以上机制懒得修改了 先这么适配
        let feedPassedTime = _commonFunctions.getFeedPassedTime()
        if (feedPassedTime < 20 && _commonFunctions.getSleepStorage().runningCycleTime < 0) {
          _commonFunctions.updateSleepTime(20 - feedPassedTime, false, ocrRestTime + feedPassedTime)
        }
      }
      let sleepTime = _commonFunctions.getSleepTimeByOcr(ocrRestTime)
      this.setFloatyInfo(null, sleepTime + '分钟后来检查状况')
      _commonFunctions.setUpAutoStart(sleepTime)
    } else {
      this.setFloatyTextColor('#ff0000')
      this.setFloatyInfo(null, '截图失败了！')
    }
  }

  /**
   * 使用加速卡
   */
  this.useSpeedCard = function () {
    sleep(1000)
    click(config.TOOL_POSITION.x, config.TOOL_POSITION.y)
    sleep(1000)
    click(config.SPEED_CARD_POSITION.x, config.SPEED_CARD_POSITION.y)
    sleep(1000)
    click(config.CONFIRM_POSITON.x, config.CONFIRM_POSITON.y)
    if (!this.waitForOwn(true)) {
      debugInfo('可能加速卡用完了，使用失败，直接返回 再次检测')
      automator.back()
      sleep(1000)
      this.waitForOwn()
    }
  }

  this.checkSpeedSuccess = function () {
    sleep(1000)
    let useSpeedCard = config.useSpeedCard
    let img = null
    let checkSpeedup = false
    // 校验三次
    let checkCount = useSpeedCard ? 3 : 1
    do {
      // 延迟一秒半
      sleep(1500)
      img = _commonFunctions.checkCaptureScreenPermission()
      checkSpeedup = images.findColor(img, config.SPEED_CHECK_COLOR, {
        region: config.SPEED_CHECK_REGION,
        threshold: config.color_offset || 4
      })
    } while (!checkSpeedup && --checkCount > 0)
    if (checkSpeedup) {
      this.setFloatyInfo(checkSpeedup, useSpeedCard ? "加速卡使用成功" : "检测到已使用加速卡")
      return true
    } else {
      this.setFloatyTextColor('#ff0000')
      this.setFloatyInfo({ x: config.SPEED_CHECK_REGION[0], y: config.SPEED_CHECK_REGION[1] }, useSpeedCard ? "加速卡使用失败" : "未使用加速卡")
      return false
    }
  }

  this.checkAndPickShit = function () {
    let img = _commonFunctions.checkCaptureScreenPermission()
    let pickRegion = config.SHIT_CHECK_REGION || [435, 1925, 40, 40]
    let collectRegion = config.COLLECT_SHIT_CHECK_REGION || [220, 2000, 80, 40]
    let pickShitColor = config.PICK_SHIT_GRAY_COLOR || '#111111'
    let collectShitColor = config.COLLECT_SHIT_GRAY_COLOR || '#535353'
    img = images.grayscale(img)
    let point = images.findColor(img, pickShitColor, { region: pickRegion })
    if (point) {
      this.setFloatyInfo({ x: pickRegion[0], y: pickRegion[1] }, "有屎可以捡")
      click(point.x, point.y)
      debugInfo(['find point：{},{}', point.x, point.y])
      sleep(1000)
      img = _commonFunctions.checkCaptureScreenPermission()
      img = images.grayscale(img)
      point = images.findColor(img, collectShitColor, { region: collectRegion })
      if (point) {
        click(point.x, point.y)
        debugInfo(['find point：{},{}', point.x, point.y])
      } else {
        warnInfo(['未找到执行捡屎标记位 寻找灰度颜色：{}', collectShitColor])
      }
    } else {
      this.setFloatyInfo({ x: pickRegion[0], y: pickRegion[1] }, "没有屎可以捡")
    }
  }

  this.recognizeCountdownByOcr = function () {
    let img = _commonFunctions.checkCaptureScreenPermission()
    let region = config.COUNT_DOWN_REGION
    debugInfo(['region:{}', JSON.stringify(config.COUNT_DOWN_REGION)])
    img = images.clip(img, region[0], region[1], region[2], region[3])
    img = images.interval(images.grayscale(img), '#FFFFFF', 50)
    let result = ''
    if (localOcr.enabled) {
      // 对图片进行二次放大 否则可能识别不准
      img = images.resize(img, [parseInt(img.width * 2), parseInt(img.height * 2)])
      result = localOcr.recognize(img)
      if (result) {
        result = result.replace(/\n/g, '').replace(/\s/g, '')
      }
      debugInfo(['使用{}ocr识别倒计时时间文本: {}', localOcr.type, result])
      debugForDev(['图片数据：[data:image/png;base64,{}]', images.toBase64(img)])
    } else {
      let base64Str = images.toBase64(img)
      debugForDev(['image base64 [data:image/png;base64,{}]', base64Str])
      result = BaiduOcrUtil.recognizeGeneralText(base64Str)
      debugInfo(['使用百度API识别倒计时时间文本为：{}', JSON.stringify(result)])
    }
    let hourMinutes = /(\d+)小时((\d+)分)?/
    let minuteSeconds = /(\d+)分((\d+)秒)?/
    let restTime = -1
    if (hourMinutes.test(result)) {
      let regexResult = hourMinutes.exec(result)
      restTime = this.resolveOverflowNumber(regexResult[1]) * 60 + (regexResult[2] ? this.resolveOverflowNumber(regexResult[2]) : 0)
    } else if (minuteSeconds.test(result)) {
      restTime = this.resolveOverflowNumber(minuteSeconds.exec(result)[1]) + 1
    }
    debugInfo('计算得到剩余时间：' + restTime + '分')
    return restTime
  }

  /**
   * 可能存在识别结果分成两列 导致3小时55分变成 3小时55 + 5分 
   * 最终结果变成 3小时555分，此方法截取过长的 把555变回55
   * @param {string} number 
   */
  this.resolveOverflowNumber = function (number) {
    if (number.length > 2) {
      number = number.substring(0, 2)
    }
    return parseInt(number)
  }

  this.setTimeoutExit = function () {
    let _this = this
    setTimeout(function () {
      _this.setFloatyTextColor('#ff0000')
      _this.setFloatyInfo(null, '再见')
      sleep(2000)
      exit()
    }, 30000)
  }

  this.checkByOcr = function (region, contentRegex) {
    if (!localOcr.enabled) {
      _warnInfo(['请至少安装mlkit-ocr插件或者修改版AutoJS获取本地OCR能力'])
      return false
    }
    _FloatyInstance.hide()
    sleep(50)
    try {
      let limit = 3
      while (limit-- > 0) {
        let screen = _commonFunctions.checkCaptureScreenPermission()
        if (screen) {
          _debugInfo(['ocr识别 {} 内容：{}', region ? '区域' + JSON.stringify(region) : '', contentRegex])
          let result = localOcr.recognizeWithBounds(screen, region, contentRegex)
          if (result && result.length > 0) {
            return true
          }
        }
        sleep(100)
      }
      return false
    } finally {
      _FloatyInstance.restore()
    }
  }

  this.start = function () {
    this.launchApp()
    this.setFloatyInfo(null, '打开APP成功！')
    sleep(1000)
    this.checkIsSleeping()
    this.checkIsOut()
    let punchedLeft = this.checkThiefLeft()
    let punchedRight = this.checkThiefRight()
    if (punchedLeft || punchedRight) {
      // 揍过鸡
      _commonFunctions.setPunched()
    }

    sleep(1000)
    this.setFloatyInfo(null, '没有野鸡哦')
    this.checkAndFeed()
    sleep(1000)
    if (config.pick_shit) {
      this.checkAndPickShit()
    }
    sleep(2000)
    _commonFunctions.minimize()
    resourceMonitor.releaseAll()
  }

}

module.exports = new AntManorRunner()


function openAlipayMultiLogin (reopen) {
  if (config.multi_device_login && !reopen) {
    debugInfo(['已开启多设备自动登录检测，检查是否有 进入支付宝 按钮'])
    let entryBtn = widgetUtils.widgetGetOne(/^进入支付宝$/, 1000)
    if (entryBtn) {
      automator.clickCenter(entryBtn)
      sleep(1000)
      return true
    } else {
      debugInfo(['未找到 进入支付宝 按钮'])
    }
  }
}
