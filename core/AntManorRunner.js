
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)

let _runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let _commonFunctions = singletonRequire('CommonFunction')
let alipayUnlocker = singletonRequire('AlipayUnlocker')
let widgetUtils = singletonRequire('WidgetUtils')
let WarningFloaty = singletonRequire('WarningFloaty')
let LogFloaty = singletonRequire('LogFloaty')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev } = singletonRequire('LogUtils')
let _FloatyInstance = singletonRequire('FloatyUtil')
let yoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetection = singletonRequire('YoloDetectionUtil')
let NotificationHelper = singletonRequire('Notification')
_FloatyInstance.enableLog()
let fodderCollector = require('./FodderCollector.js')
let BaiduOcrUtil = require('../lib/BaiduOcrUtil.js')
let localOcr = require('../lib/LocalOcrUtil.js')
let formatDate = require('../lib/DateUtil.js')
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
  const _this = this
  this.isKeepAlive = false

  this.setKeepAlive = function () {
    this.isKeepAlive = true
  }

  this.setFloatyTextColor = function (colorStr) {
    _FloatyInstance.setFloatyTextColor(colorStr)
  }

  this.setFloatyInfo = function (position, text) {
    debugInfo(['设置悬浮窗位置: {} 内容: {}', JSON.stringify(position), text])
    _FloatyInstance.setFloatyInfo(position, text)
  }

  this.launchApp = function (reopen, keepAlive) {
    _commonFunctions.backHomeIfInVideoPackage()
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
      this.launchApp(true, keepAlive)
    }

    if (config.is_alipay_locked) {
      sleep(1000)
      alipayUnlocker.unlockAlipay()
    }
    sleep(1000)
    return this.waitForOwn(keepAlive)
  }

  this.waitFor = function (color, region, threshold, desc) {
    let img = null
    let findColor = null
    let timeoutCount = 20
    WarningFloaty.addRectangle('校验区域颜色：' + color, region, '#00ff00')
    do {
      sleep(400)
      img = _commonFunctions.checkCaptureScreenPermission()
      findColor = images.findColor(img, color, {
        region: region,
        threshold: threshold || config.color_offset || 4
      })
    } while (!findColor && timeoutCount-- > 0)
    WarningFloaty.clearAll()
    if (findColor) {
      yoloTrainHelper.saveImage(img, desc + '成功', desc)
    } else {
      yoloTrainHelper.saveImage(img, desc + '失败', desc, config.yolo_save_check_failed)
    }
    return findColor
  }

  this.yoloWaitFor = function (desc, filter) {
    let img = null
    let timeoutCount = 5
    let result = []
    WarningFloaty.clearAll()
    do {
      sleep(400)
      img = _commonFunctions.checkCaptureScreenPermission()
      result = YoloDetection.forward(img, filter)
    } while (result.length <= 0 && timeoutCount-- > 0)
    if (result.length > 0) {
      let { x, y, width, height } = result[0]
      WarningFloaty.addRectangle('找到：' + desc, [x, y, width, height])
      yoloTrainHelper.saveImage(img, desc + '成功', desc)
    } else {
      yoloTrainHelper.saveImage(img, desc + '失败', desc, config.yolo_save_check_failed)
    }
    return result.length > 0
  }

  /**
   * yolo查找所有匹配的对象
   * @param {string} desc 描述信息
   * @param {object} filter 过滤配置 可信度 label 等等
   * @param {number} tryTime 重试次数 默认三次 间隔400ms
   * @return {array}
   */
  this.yoloCheckAll = function (desc, filter, tryTime) {
    if (!YoloDetection.enabled) {
      return null
    }
    let img = null
    let results = []
    tryTime = tryTime || 3
    WarningFloaty.clearAll()
    debugInfo(['通过YOLO查找：{} props: {}', desc, JSON.stringify(filter)])
    do {
      sleep(400)
      img = _commonFunctions.captureScreen()
      results = YoloDetection.forward(img, filter)
    } while (results.length <= 0 && tryTime-- > 0)
    if (results.length > 0) {
      img = _commonFunctions.captureScreen()
      return results.map(result => {
        let { x, y, width, height, label, confidence } = result
        let left = x, top = y
        WarningFloaty.addRectangle('找到：' + desc, [left, top, width, height])
        debugInfo(['通过YOLO找到目标：{} label: {} confidence: {}', desc, label, confidence])
        if (confidence < 0.9) {
          yoloTrainHelper.saveImage(img, desc + 'yolo准确率低', 'low_predict', config.yolo_save_low_predict)
        }
        return { x: left + width / 2, y: top + height / 2, width: width, height: height, left: left, top: top, label: label }
      })
    } else {
      debugInfo(['未能通过YOLO找到：{}', desc])
      yoloTrainHelper.saveImage(img, 'yolo查找失败' + desc, config.yolo_save_check_failed)
    }
    return null
  }

  this.yoloCheck = function (desc, filter, tryTime) {
    let results = this.yoloCheckAll(desc, filter, tryTime)
    if (results && results.length > 0) {
      return results[0]
    }
    return null
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
    if (typeof keepAlive == 'undefined') {
      keepAlive = this.isKeepAlive
    }
    let findColor = false
    if (YoloDetection.enabled) {
      findColor = this.yoloWaitFor('领饲料|喂食按钮', { confidence: 0.7, labelRegex: 'collect_food|feed_btn' })
    } else {
      findColor = this.waitFor(config.CHECK_APP_COLOR, config.CHECK_APP_REGION, null, '小鸡主界面')
    }
    this.closeDialogIfExist()
    if (findColor) {
      this.setFloatyInfo(null, CONTENT.personal_home + '成功')
      return true
    } else {
      this.setFloatyInfo(null, '检测失败，尝试OCR识别')
      if (this.checkByOcr([0, 0, config.device_width * 0.2, config.device_height / 2], '捐蛋反馈|开心飞起|小鸡日记|AI传话')) {
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

  this.closeDialogIfExist = function () {
    LogFloaty.pushLog('检查是否存在弹窗')
    // shit 阴影中可以看到小鸡。。
    // if (this.yoloCheck('小鸡', { labelRegex: 'eating_chicken|hungry_chicken' })) {
    //   LogFloaty.pushLog('小鸡可见，不存在弹窗')
    //   return false
    // }
    let closeBtn = widgetUtils.widgetGetOne('关闭', {
      timeout: 2000, appendFilter: (matcher) => {
        return matcher.filter(node => {
          if (!node) {
            return false
          }
          let boundsInfo = node.bounds()
          let rate = boundsInfo.width() / boundsInfo.height()
          // 比例接近1:1
          if (!(rate > 0.95 && rate < 1.05)) {
            return false
          }
          let centerX = boundsInfo.centerX(), centerY = boundsInfo.centerY()
          // 位于正中间且属于底部范围
          return centerX > config.device_width * 0.49 && centerX < config.device_width * 0.51
            && centerY > config.device_height * 0.6
        })
      }
    })
    if (closeBtn) {
      LogFloaty.pushLog('存在弹窗')
      yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '关闭弹窗', 'close_icon')
      WarningFloaty.addRectangle('关闭按钮', widgetUtils.boundsToRegion(closeBtn.bounds()))
      closeBtn.click()
    }
    this.closeDialogIfExistByYolo()
  }

  this.closeDialogIfExistByYolo = function () {
    if (!YoloDetection.enabled) {
      return
    }
    LogFloaty.pushLog('通过YOLO方式检查是否存在弹窗')
    let findTarget = this.yoloCheck('关闭弹窗', { labelRegex: 'close_icon' })
    if (findTarget) {
      LogFloaty.pushLog('存在弹窗')
      yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '关闭弹窗', 'close_icon')
      this.setFloatyInfo(findTarget, '关闭弹窗')
      click(findTarget.x, findTarget.y)
      sleep(1000)
    }
  }


  this.waitForFriends = function () {
    let findColor = false
    if (YoloDetection.enabled) {
      findColor = this.yoloWaitFor('给ta留言|召回', { confidence: 0.7, labelRegex: 'leave_msg|bring_back' })
      if (!findColor) {
        yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '进入好友界面失败', 'friend_home_yolo_failed')
      }
    }
    // 旧代码兜底
    if (!findColor) {
      findColor = this.waitFor(config.CHECK_FRIENDS_COLOR, config.CHECK_FRIENDS_REGION, null, '好友界面')
      if (findColor) {
        this.setFloatyInfo(null, CONTENT.friend_home + '成功')
        return true
      } else {
        if (this.checkByOcr([0, 0, config.device_width * 0.2, config.device_height / 2], '给Ta留言')) {
          this.setFloatyInfo(null, CONTENT.friend_home + '成功')
          return true
        }
        if (this.checkByOcr([0, config.device_height * 0.3, config.device_width, config.device_height * 0.5], '召回')) {
          this.setFloatyInfo(null, CONTENT.friend_home + '成功')
          yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '召回识别失败', 'friend_home_bringback_failed')
          return true
        }
      }
    }
    let img = _commonFunctions.captureScreen()
    if (!findColor) {
      this.pushErrorLog('进入好友界面失败 需要重启脚本')
      yoloTrainHelper.saveImage(img, '进入好友界面失败', 'friend_home_failed')
      this.setFloatyTextColor('#ff0000')
      this.setFloatyInfo(null, CONTENT.friend_home + '失败，检测超时')
      this.killAndRestart()
    } else {
      yoloTrainHelper.saveImage(img, '进入好友界面成功', 'friend_home_success')
    }
  }

  this.waitForDismiss = function () {
    // TODO 训练关闭按钮，其实OCR也行
    let findColor = this.waitFor(config.DISMISS_COLOR, config.DISMISS_REGION, null, '关闭按钮')
    if (findColor) {
      this.setFloatyInfo(findColor, '找到了关闭按钮')
      click(findColor.x, findColor.y)
      return true
    } else {
      if (this.checkByOcr([0, config.device_height / 2, config.device_width, config.device_height / 2], '.*关闭.*')) {
        this.setFloatyInfo(null, '找到了关闭按钮')
        return true
      }
      this.setFloatyInfo(null, '没找到关闭按钮，奇了怪了')
    }
    return false
  }

  this.checkIsSleeping = function (notExit) {
    let now = new Date()
    let currentTime = {
      hour: now.getHours(),
      minute: now.getMinutes(),
    }
    if (currentTime.hour > 6 && currentTime.hour < 20) {
      // 晚上八点到早上6点检查是否睡觉中 其他时间跳过
      debugInfo(['当前时间{} 不在晚上八点和早上6点之间', currentTime.hour])
      return false
    }
    if (!localOcr.enabled) {
      warnInfo(['请至少安装mlkit-ocr插件或者修改版AutoJS获取本地OCR能力'])
      return false
    }
    let screen = _commonFunctions.checkCaptureScreenPermission()
    let sleepWidget = localOcr.recognizeWithBounds(screen, null, '睡觉中')
    if (sleepWidget && sleepWidget.length > 0) {
      let sleepBounds = sleepWidget[0].bounds
      yoloTrainHelper.saveImage(screen, '睡觉中', 'sleeping')
      debugInfo(['find text: {}', sleepWidget[0].label])
      this.setFloatyInfo({ x: sleepBounds.left, y: sleepBounds.top }, '小鸡睡觉中')
      sleep(1000)
      // 仅仅main.js时创建第二天的定时任务
      if ((engines.myEngine().getSource() + '').endsWith('main.js')) {
        // 设置第二天早上六点05启动 计算间隔时间
        _commonFunctions.setUpAutoStart(
          6 * 60 + (currentTime.hour >= 20 ?
            // 晚上八点后 加上当天剩余时间（分）
            (24 - currentTime.hour) * 60 - currentTime.minute
            // 早上六点前 减去已经经过的时间（分）
            : -(currentTime.hour * 60 + currentTime.minute)) + 5
        )
      }
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
    this.pushLog('检查小鸡是否外出')
    if (YoloDetection.enabled) {
      let signboard = this.yoloCheck('标牌', { confidence: 0.7, labelRegex: 'signboard' })
      if (signboard) {
        yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '小鸡外出', 'signboard')
        this.setFloatyInfo(signboard, '小鸡外出不在家')
        this.pushLog('小鸡外出了')
        let feedBtn = this.yoloCheck('喂饭按钮', { confidence: 0.7, labelRegex: 'feed_btn' })
        if (feedBtn) {
          click(feedBtn.x, feedBtn.y)
          sleep(1000)
          return this.checkIfChikenOut()
        } else {
          // 找不到喂饭按钮 需要点击上半部分
          click(signboard.x, signboard.y - signboard.height / 3)
          sleep(1000)
          this.checkAndBringBack()
        }
      }
    } else {
      WarningFloaty.addRectangle('校验是否外出', config.OUT_REGION)
      let img = _commonFunctions.checkCaptureScreenPermission()
      let findColor = images.findColor(img, config.OUT_COLOR, {
        region: config.OUT_REGION,
        threshold: config.color_offset
      })
      if (findColor) {
        yoloTrainHelper.saveImage(img, '小鸡外出', 'signboard')
        this.setFloatyInfo(findColor, '小鸡出去找吃的了')
        this.pushLog('小鸡外出了')
        sleep(1000)
        this.setFloatyInfo(null, '点击去找小鸡')
        click(findColor.x, findColor.y)
        sleep(1000)
        this.checkAndBringBack()
      }
    }
  }

  this.yoloClickConfirm = function (recheckByColor) {
    let confirm = this.yoloCheck('确认或关闭', { confidence: 0.7, labelRegex: 'confirm_btn|close_btn' })
    if (confirm) {
      yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '确认或关闭', 'confirm_btn')
      click(confirm.x, confirm.y)
      return true
    } else {
      yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), 'yolo查找确认或关闭失败', 'confirm_btn_fail')
      if (recheckByColor) {
        warnInfo(['yolo识别关闭按钮失败，降级为图色识别'])
        return this.waitForDismiss()
      } else {
        warnInfo(['yolo识别关闭按钮失败'])
      }
    }
    return false
  }

  this.checkAndBringBack = function () {
    this.pushLog('小鸡外出 去好友家将它带回')
    this.waitForFriends()
    WarningFloaty.clearAll()
    if (YoloDetection.enabled) {
      let bringBack = this.yoloCheck('召回', { confidence: 0.7, labelRegex: 'bring_back' })
      if (bringBack) {
        this.setFloatyInfo(bringBack, '召回')
        this.pushLog('召回小鸡')
        click(bringBack.x, bringBack.y)
        this.yoloClickConfirm()
        automator.back()
        this.waitForOwn()
        return
      }
      let thiefChickens = this.yoloCheckAll('工作鸡或小偷鸡', { confidence: 0.7, labelRegex: 'working_chicken|thief_chicken' })
      if (thiefChickens && thiefChickens.length > 0) {
        this.pushLog('找到了好友家的工作中或者偷吃的鸡')
        let img = _commonFunctions.captureScreen()
        // 每一只鸡都点一下
        thiefChickens.forEach(thiefChicken => {
          let content = '小偷鸡'
          if (thiefChicken.label == 'working_chicken') {
            content = '工作鸡'
          }
          yoloTrainHelper.saveImage(img, '找到' + content, thiefChicken.label)
          click(thiefChicken.x, thiefChicken.y)
        })

        let isWorking = widgetUtils.widgetGetOne('小鸡工作中.*', 1000)
        if (isWorking) {
          _FloatyInstance.setFloatyText('小鸡工作中，寻找确认按钮')
          let confirmBtn = widgetUtils.widgetGetOne('确认')
          if (confirmBtn) {
            this.setFloatyInfo({ x: confirmBtn.bounds().left, y: confirmBtn.bounds().top }, '确认按钮')
            automator.clickCenter(confirmBtn)
          } else {
            _FloatyInstance.setFloatyText('未找到确认按钮')
            errorInfo('未找到确认按钮，请手动执行', true)
          }
        }
      }
    } else {
      WarningFloaty.addRectangle('校验左侧', config.OUT_IN_FRIENDS_REGION_LEFT)
      sleep(1000)
      let img = _commonFunctions.checkCaptureScreenPermission()
      let findColor = images.findColor(img, config.OUT_IN_FRIENDS_COLOR, {
        region: config.OUT_IN_FRIENDS_REGION_LEFT,
        threshold: config.color_offset
      })
      if (!findColor) {
        WarningFloaty.addRectangle('校验右侧', config.OUT_IN_FRIENDS_REGION_RIGHT)
        findColor = images.findColor(img, config.OUT_IN_FRIENDS_COLOR, {
          region: config.OUT_IN_FRIENDS_REGION_RIGHT,
          threshold: config.color_offset
        })
      }
      if (findColor) {
        yoloTrainHelper.saveImage(img, '小鸡在好友家', 'friend_home_success')
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
            errorInfo('未找到确认按钮，请手动执行', true)
          }
        }
        sleep(1000)
        this.waitForOwn()
      } else {
        yoloTrainHelper.saveImage(img, '小鸡不在好友家', 'friend_home_failed')
        this.setFloatyTextColor('#ff0000')
        this.setFloatyInfo(getRegionCenter(config.OUT_IN_FRIENDS_REGION_LEFT), '没有找到小鸡，奇了怪了！')
        return false
      }
    }
  }

  this.checkIfChikenOut = function () {
    let outBtn = widgetUtils.widgetGetOne('找小鸡', 2000)
    if (outBtn) {
      yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '小鸡外出了', 'chick_out')
      automator.clickCenter(outBtn)
      this.checkAndBringBack()
      return true
    }
    return false
  }

  this.checkIfNoMoreFood = function () {
    let noMoreFood = widgetUtils.widgetGetOne('.*饲料不足', 1000)
    if (noMoreFood) {
      LogFloaty.pushLog('小鸡饲料不足，投喂失败')
      return true
    }
    return false
  }

  this.checkThiefLeft = function () {
    WarningFloaty.addRectangle('左侧小偷鸡检测区域', config.LEFT_THIEF_REGION, '#00ff00')
    sleep(500)
    let img = _commonFunctions.checkCaptureScreenPermission()
    let findColor = images.findColor(img, config.THIEF_COLOR, {
      region: config.LEFT_THIEF_REGION,
      threshold: config.color_offset
    })
    if (findColor) {
      yoloTrainHelper.saveImage(img, '左侧有小鸡', 'thief_chicken')
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
        WarningFloaty.addRectangle('左侧小偷鸡拳头', config.LEFT_PUNCH_REGION, '#00ff00')
        punch = images.findColor(img, config.PUNCH_COLOR, {
          region: config.LEFT_PUNCH_REGION,
          threshold: config.color_offset
        })
      } while (!punch && count-- > 0)

      if (punch) {
        this.setFloatyTextColor(config.PUNCH_COLOR)
        this.setFloatyInfo(punch, '找到了左边的小拳拳')
        yoloTrainHelper.saveImage(img, '左侧小鸡带拳头', 'thief_chicken')
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
      yoloTrainHelper.saveImage(img, '左侧无小鸡', 'no_thief_chicken')
    }
  }

  this.checkThiefRight = function () {
    WarningFloaty.addRectangle('右侧小偷鸡检测区域', config.RIGHT_THIEF_REGION, '#00ff00')
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
        WarningFloaty.addRectangle('右侧小偷鸡拳头', config.RIGHT_THIEF_REGION, '#00ff00')
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
        yoloTrainHelper.saveImage(img, '右侧小鸡带拳头', 'thief_chicken')
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
      yoloTrainHelper.saveImage(img, '左侧无小鸡', 'no_thief_chicken')
    }
  }

  this.checkAndFeed = function () {
    sleep(500)
    this.pushLog('检查是否有饭吃')
    let feed = this.doFeed()
    // 记录是否执行了喂食操作
    if (feed) {
      if (this.checkIfChikenOut()) {
        return this.checkAndFeed()
      }
      // 检查是否饲料不足
      let noMoreFood = widgetUtils.widgetGetOne('剩余的饲料不足', 1000)
      if (noMoreFood) {
        let cancel = widgetUtils.widgetGetOne('取消', 1000)
        if (cancel) automator.clickCenter(cancel)
        let sleepTime = (23 - new Date().getHours()) * 60 + (61 - new Date().getMinutes())
        this.pushLog('小鸡饲料不足，投喂失败 设置第二天再启动, 等待时间' + sleepTime + '分钟')
        _commonFunctions.setUpAutoStart(sleepTime)
        NotificationHelper.createNotification('小鸡饲料不足，投喂失败 设置第二天再启动',
          '下次执行时间：' + formatDate(new Date(new Date().getTime() + sleepTime * 60000)), 'noMoreFood')
        return
      }
      this.checkFeedSuccess()
      // 避免加速卡使用失败导致时间计算不正确的问题
      _commonFunctions.updateSleepTime(20, true)
      if (config.useSpeedCard) {
        this.useSpeedCard()
      }
    }
    sleep(1500)
    let ocrRestTime = this.recognizeCountdownByOcr()
    if (feed) {
      // 刚刚喂食，且成功识别OCR，将当前时间设置为执行倒计时
      _commonFunctions.updateSleepTime(20, false, ocrRestTime)
      // 喂鸡后领取饲料
      fodderCollector.exec()
      if (!this.waitForOwn(true)) {
        this.pushErrorLog('打开小鸡页面失败，重新打开')
        this.launchApp(true)
      }
    } else if (ocrRestTime > -1) {
      // 大概情况就是上一次执行喂食后加速卡用完了 导致OCR识别失败 以上机制懒得修改了 先这么适配
      let feedPassedTime = _commonFunctions.getFeedPassedTime()
      if (feedPassedTime < 20 && _commonFunctions.getSleepStorage().runningCycleTime < 0
        // 已记录的喂食周期比当前OCR识别的时间还短，不正常 需要重新记录
        || _commonFunctions.getSleepStorage().runningCycleTime - ocrRestTime <= 0) {
        _commonFunctions.updateSleepTime(20 - feedPassedTime, false, ocrRestTime + feedPassedTime)
      }
    }
    if (config.dont_kick_thief) {
      // 设置已经揍过鸡 直接用当前识别的倒计时设置定时任务
      _commonFunctions.setPunched()
    }
    let sleepTime = _commonFunctions.getSleepTimeByOcr(ocrRestTime)
    this.setFloatyInfo(null, sleepTime + '分钟后来检查状况')
    this.pushLog(sleepTime + '分钟后来检查状况')
    _commonFunctions.setUpAutoStart(sleepTime)
  }

  this.doFeed = function () {
    let img = null
    let feed = false
    this.pushLog('检查小鸡是否有饭吃')
    if (YoloDetection.enabled) {
      let checkHasOrNoFood = this.yoloCheck('校验有饭吃', { confidence: 0.7, labelRegex: 'has_food|no_food' })
      img = _commonFunctions.checkCaptureScreenPermission()
      if (checkHasOrNoFood && checkHasOrNoFood.label == 'has_food') {
        yoloTrainHelper.saveImage(img, '小鸡有饭吃', 'eating_chicken')
        this.setFloatyInfo(checkHasOrNoFood, '小鸡有饭吃哦')
        this.pushLog('小鸡有饭吃')
      } else {
        yoloTrainHelper.saveImage(img, '小鸡没饭吃', 'hungry_chicken')
        this.pushLog('小鸡没饭吃')
        if (!checkHasOrNoFood) {
          checkHasOrNoFood = this.yoloCheck('校验空饲料盆', { confidence: 0.7, labelRegex: 'no_food' })
        }
        if (checkHasOrNoFood) {
          this.pushLog('点击食盆进行喂饭')
          click(checkHasOrNoFood.x, checkHasOrNoFood.y)
          return true
        } else {
          this.pushLog('未能找到空饲料盆，通过喂食按钮喂食')
          let feedBtn = this.yoloCheck('喂饭按钮', { confidence: 0.7, labelRegex: 'feed_btn' })
          if (feedBtn) {
            let feedExpand = this.yoloCheck('展开喂饭', { confidence: 0.7, labelRegex: 'feed_expand' })
            if (feedExpand) {
              this.setFloatyInfo(feedExpand, '展开喂饭')
              click(feedExpand.x, feedExpand.y)
              sleep(1000)
              yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '饲料展开', 'feed_expanded')
              // TODO 训练展开后的饲料按钮
              let region = [feedExpand.x - feedExpand.width / 2, feedExpand.y - 700, feedExpand.width, 700]
              let results = localOcr.recognizeWithBounds(_commonFunctions.captureScreen(), region, /\d+g/)
              if (results && results.length > 0) {
                let foodCount = results[0].label
                let targetBd = results[0].bounds
                let target = {
                  x: targetBd.centerX(),
                  y: targetBd.centerY()
                }
                let { left, top } = targetBd
                let width = targetBd.width()
                let height = targetBd.height()
                WarningFloaty.addRectangle('饲料数量：' + foodCount, [left, top, width, height])
                click(target.x, target.y)
                feed = true
                sleep(1000)
                this._had_feed = true
              } else {
                this.pushErrorLog('OCR查找饲料位置失败 无法执行饲料展开后的投喂操作')
              }
            } else {
              // OCR 检查当前是否应该有展开喂饭按钮
              let region = [feedBtn.x - feedBtn.width / 2, feedBtn.y - feedBtn.height / 2, feedBtn.width, feedBtn.height]
              let results = localOcr.recognizeWithBounds(_commonFunctions.captureScreen(), region, /\d+g/)
              if (results && results.length > 0) {
                let foodCount = results[0].label
                let targetBd = results[0].bounds
                let { left, top } = targetBd
                let width = targetBd.width()
                let height = targetBd.height()
                WarningFloaty.addRectangle('饲料数量：' + foodCount, [left, top, width, height])
              } else {
                yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '无法找到展开饲料', 'feed_expand_failed')
              }
            }
            if (!feed) {
              // 执行喂饭
              click(feedBtn.x, feedBtn.y)
              feed = true
            }
          } else {
            _FloatyInstance.setFloatyText('未找到喂饭按钮')
            this.pushErrorLog('未找到喂饭按钮')
          }
        }
      }
    } else {
      WarningFloaty.addRectangle('校验是否有饭吃', config.FOOD_REGION, '#00ff00')
      img = _commonFunctions.checkCaptureScreenPermission()
      if (img) {
        let findColor = images.findColor(img, config.FOOD_COLOR, {
          region: config.FOOD_REGION,
          threshold: config.color_offset || 4
        })
        if (findColor) {
          this.setFloatyInfo(findColor, '小鸡有饭吃哦')
          yoloTrainHelper.saveImage(img, '小鸡有饭吃', 'eating_chicken')
        } else {
          this.setFloatyTextColor('#ff0000')
          this.setFloatyInfo({ x: config.FOOD_REGION[0], y: config.FOOD_REGION[1] }, '小鸡没饭吃呢')
          yoloTrainHelper.saveImage(img, '小鸡没饭吃', 'hungry_chicken')
          click(config.FEED_POSITION.x, config.FEED_POSITION.y)
          feed = true
        }
      } else {
        this.setFloatyTextColor('#ff0000')
        this.setFloatyInfo(null, '截图失败了！')
      }
    }
    return feed
  }

  /**
   * 校验是否喂食成功，因为可能存在特殊饲料，吃完还能再吃，喂食失败后重试
   *
   * @param {*} retryTime 
   * @returns 
   */
  this.checkFeedSuccess = function (retryTime) {
    retryTime = retryTime || 0
    // 应该不会攒那么多特殊饲料吧
    if (retryTime >= 5) {
      return false
    }
    if (retryTime > 1) {
      yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '重试喂食第' + retryTime + '次', 'feed_failed_too_much', true)
    }
    if (this.doFeed()) {
      sleep(1000)
      return this.checkFeedSuccess(retryTime + 1)
    }
  }

  /**
   * 使用加速卡
   */
  this.useSpeedCard = function () {
    this.pushLog('准备使用加速卡')
    if (YoloDetection.enabled) {
      let item = this.yoloCheck('使用道具', { labelRegex: 'item' })
      if (item) {
        click(item.x, item.y)
        sleep(1000)
      }
    } else {
      yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '准备点击道具', 'item')
      click(config.TOOL_POSITION.x, config.TOOL_POSITION.y)
      sleep(1000)
      // sleep(1000)
      // yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '点击使用道具')
      // click(config.SPEED_CARD_POSITION.x, config.SPEED_CARD_POSITION.y)
      // sleep(1000)
      // yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '确认使用弹窗')
      // click(config.CONFIRM_POSITON.x, config.CONFIRM_POSITON.y)
    }
    let speedupCard = widgetUtils.widgetGetOne('加速卡')
    let skipUse = false, top = config.device_height * 0.3
    if (speedupCard) {
      let target = widgetUtils.widgetGetOne('喂食后可同时使用多张.*', 2000)
      if (target) {
        let container = target.parent().parent()
        WarningFloaty.addRectangle('加速卡区域', boundsToRegion(container.bounds()), '#00ff00')
        let numWidget = widgetUtils.subWidgetGetOne(container, /\d\/\d+/, 2000)
        if (numWidget) {
          WarningFloaty.addRectangle('加速卡数量：' + numWidget.text(), boundsToRegion(numWidget.bounds()), '#00ff00')
          if (/0\/20/.test(numWidget.text())) {
            top = numWidget.bounds().top - 650 * config.scaleRate
            warnInfo('加速卡已经使用完，无法继续使用')
            debugInfo(['点击关闭，位置：{},{}', config.device_width, top])
            automator.click(config.device_width / 2, top)
            skipUse = true
          }
        }
        sleep(1000)
      } else {
        warnInfo(['无法找到加速卡区域'])
      }
      WarningFloaty.clearAll()
      if (!skipUse) {
        automator.clickCenter(speedupCard)
        sleep(1000)
        let confirmUsing = widgetUtils.widgetGetOne('.*立即加速', 2000)
        if (!confirmUsing) {
          warnInfo(['未找到使用按钮，可能是加速卡用完了'])
          this.pushErrorLog('未找到加速按钮 可能加速卡用完了')
          automator.back()
        } else {
          this.pushLog('点击使用加速卡：立即加速')
          automator.clickCenter(confirmUsing)
          sleep(1000)
          let closeIcon = textContains('关闭').depth(18).clickable(true).findOne(1000)
          if (closeIcon) {
            yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '关闭按钮', 'close_icon')
            debugInfo(['通过控件关闭弹窗 {}', closeIcon.click()])
          } else {
            warnInfo('通过控件查找关闭按钮失败')
            yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '关闭按钮失败', 'close_icon_failed')
          }
        }
        sleep(1000)
        let closeIcon = this.yoloCheck('关闭按钮', { labelRegex: 'close_icon' })
        if (closeIcon) {
          click(closeIcon.x, closeIcon.y)
        } else {
          automator.back()
        }
      }
    }
    if (!this.waitForOwn(true)) {
      warnInfo(['校验失败，重新打开个人界面'])
      this.launchApp(true)
    }
  }

  /**
   * @deprecated 当前加速卡可以无限使用，校验是否在加速中没有意义了
   * @returns 
   */
  this.checkSpeedSuccess = function () {
    return this.checker.checkSpeedSuccess()
  }

  this.checkAndPickShit = function () {
    let pickedShit = this.checker.checkAndClickShit()
    // todo 执行捡屎 训练
    if (pickedShit) {
      this.checker.checkAndCollectMuck()
    } else {
      this.setFloatyInfo(null, "没有屎可以捡")
      yoloTrainHelper.saveImage(_commonFunctions.checkCaptureScreenPermission(), '没有屎可以捡', 'pick_shit')
    }
  }

  this.recognizeCountdownByOcr = function () {
    let region = config.COUNT_DOWN_REGION
    if (YoloDetection.enabled) {
      let checkRegion = this.yoloCheck('倒计时区域', { confidence: 0.7, labelRegex: 'countdown' })
      if (checkRegion) {
        region = [checkRegion.left, checkRegion.top, checkRegion.width, checkRegion.height]
        debugInfo(['yolo识别ocr region:{}', JSON.stringify(region)])
      }
    }
    WarningFloaty.addRectangle('OCR识别倒计时区域', region)
    debugInfo(['region:{}', JSON.stringify(region)])
    let img = _commonFunctions.checkCaptureScreenPermission()
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
    setTimeout(function () {
      _this.setFloatyTextColor('#ff0000')
      _this.setFloatyInfo(null, '再见')
      sleep(2000)
      exit()
    }, 30000)
  }

  /**
   * Checks if the given region is within the screen bounds
   * @param {array} region The region to check. Format: [left, top, width, height] or null
   * @param {ImageWrapper} screen The screen image to check against
   * @returns {boolean} True if the region is within the screen bounds, false otherwise
   */
  function regionInScreen (region, screen) {
    if (!region) {
      return true
    }
    let width = screen.width, height = screen.height
    let regionL = Math.floor(region[0]), regionT = Math.floor(region[1])
    let regionW = Math.floor(region[2]), regionH = Math.floor(region[3])
    debugInfo(['screen info：{}', JSON.stringify([width, height])])
    debugInfo(['region位置：{} => {}', JSON.stringify(region), JSON.stringify([regionL, regionT, regionW, regionH])])
    if (regionL >= 0 && regionT >= 0 && regionL + regionW <= width && regionT + regionH <= height) {
      return regionW > 0 && regionH > 0
    } else {
      return false
    }
  }

  /**
   * 通过OCR识别目标区域内容
   * @param {*} region 目标区域
   * @param {*} contentRegex 文本内容 正则表达式
   * @param {*} getTarget 是否将识别目标转换成 { ...ocrResult, target: { bounds: () => bounds } } 形式 用于后续操作，否则返回true/false
   * @returns 
   */
  this.checkByOcr = function (region, contentRegex, getTarget) {
    if (!localOcr.enabled) {
      warnInfo(['请至少安装mlkit-ocr插件或者修改版AutoJS获取本地OCR能力'])
      return false
    }
    _FloatyInstance.hide()
    WarningFloaty.disableTip()
    sleep(50)
    try {
      let limit = 3
      while (limit-- > 0) {
        let screen = _commonFunctions.checkCaptureScreenPermission()
        if (!regionInScreen(region, screen)) {
          warnInfo(['ocr识别区域不在屏幕内：{} != [{},{}]', JSON.stringify(region), screen.width, screen.height])
          return false
        }
        if (screen) {
          debugInfo(['ocr识别 {} 内容：{}', region ? '区域' + JSON.stringify(region) : '', contentRegex])
          let result = localOcr.recognizeWithBounds(screen, region, contentRegex, true)
          if (result && result.length > 0) {
            if (getTarget) {
              return wrapBoundsTarget(result[0])
            }
            return true
          }
        }
        sleep(100)
      }
      return false
    } finally {
      _FloatyInstance.restore()
      WarningFloaty.enableTip()
    }
  }

  function wrapBoundsTarget (ocrResult) {
    if (!ocrResult) {
      return null
    }
    let bounds = ocrResult.bounds
    let result = Object.create(ocrResult)
    result.target = {
      bounds: () => bounds
    }
    return result
  }

  this.prepareChecker = function () {
    this.checker = YoloDetection.enabled ? new YoloChecker(this) : new ColorChecker(this)
  }

  /**
   * 收集可收取的鸡蛋，TODO 当前版本yolo模型准确度不够，直接当做可收取
   * @param {boolean} skipOcr 是否跳过鸡蛋进度ocr识别，小号执行时无需记录
   * @returns 
   */
  this.collectReadyEgg = function (skipOcr) {
    if (!YoloDetection.enabled) {
      LogFloaty.pushLog('未开启YOLO，跳过收集鸡蛋')
      return
    }
    LogFloaty.pushLog('查找是否存在可收集的鸡蛋')
    let egg = this.yoloCheck('成熟或未成熟的鸡蛋', { labelRegex: 'collect_egg|not_ready' })
    if (egg) {
      /* TODO当前版本yolo模型准确度不够，直接当做可收取
      if (egg.label == 'collet_egg') {
        LogFloaty.pushLog('找到了可收集的鸡蛋')
        automator.click(egg.x, egg.y)
      } else {
        LogFloaty.pushLog('未找到可收集的鸡蛋')
      }
      */
      // 当前版本yolo模型准确度不够，直接当做可收取
      LogFloaty.pushLog('找到了可收集的鸡蛋')
      automator.click(egg.x, egg.y)
      sleep(500)
      if (skipOcr || !localOcr.enabled || !config.persist_egg_progress) {
        return
      }
      let result = '', checkNext = false, limit = 3
      do {
        let ocrRegion = [egg.left, egg.top + egg.height * 0.6, egg.width, egg.height * 0.6]
        WarningFloaty.addRectangle('ocr识别进度', ocrRegion)
        sleep(500)
        // ocr记录当前鸡蛋进度
        result = localOcr.recognize(_commonFunctions.captureScreen(), ocrRegion)
        debugInfo(['识别进度文本信息：{}', result])
        // 处理OCR识别的结果，去掉%和96
        result = result.replace(/(96|%)$/, '')
        checkNext = !/^\d{1,2}$/.test(result)
        if (checkNext && /\d+/.test(result)) {
          warnInfo(['识别进度信息不正确，当前识别结果为：{}', result])
        }
        if (checkNext) {
          // 说明识别不到文字，可能鸡蛋可收取
          debugInfo(['识别不到进度信息，重新收集：{}', result])
          automator.click(egg.x, egg.y)
          sleep(1000)
        }
      } while (checkNext && --limit > 0)
      if (result) {
        LogFloaty.pushLog('当前鸡蛋进度：' + result)
        infoLog(['记录当前鸡蛋进度：{}', result])
        _commonFunctions.persistEggProcess(result)
      } else {
        LogFloaty.pushWarningLog('未能识别鸡蛋进度' + (config.local_ocr_priority == 'paddle' ? '，建议改用PaddleOCR' : ''))
      }
    } else {
      LogFloaty.pushLog('未能找到鸡蛋')
    }
  }

  this.viewDiary = function () {
    if (_commonFunctions.checkDiary()) {
      return
    }
    // TODO 每天执行一次
    LogFloaty.pushLog('查找小鸡日记入口')
    let entry = this.checkByOcr([0, 0, config.device_width * 0.3, config.device_height * 0.5], '小鸡日记', true)
    if (entry) {
      automator.clickCenter(entry.target)
      LogFloaty.pushLog('等待进入小鸡日记')
      let limit = 5
      let sign = null
      do {
        sign = this.checkByOcr([0, config.device_height * 0.8, config.device_width, config.device_height * 0.2], '.*(贴贴|明日再来).*', true)
        sleep(1000)
      } while (!sign && limit-- > 0)
      if (sign) {
        if (sign.label == '明日再来') {
          LogFloaty.pushLog('今日已经贴过小鸡')
        } else {
          LogFloaty.pushLog('找到了贴贴小鸡')
          automator.clickCenter(sign.target)
        }
        _commonFunctions.setDiaryChecked()
      } else {
        LogFloaty.pushErrorLog('无法校验日记界面关键元素：贴贴小鸡|明日再来')
      }
    } else {
      LogFloaty.pushWarningLog('无法找到小鸡日记')
    }
  }

  this.pushLog = function () {
    LogFloaty.pushLog.apply(LogFloaty, arguments)
  }

  this.pushErrorLog = function () {
    LogFloaty.pushErrorLog.apply(LogFloaty, arguments)
  }

  this.forwardByYolo = function () {
    if (!YoloDetection.enabled) {
      warnInfo(['当前未开启YOLO 执行异常 请检查代码'], true)
      return []
    }
    _commonFunctions.captureScreen()
    let img = null, results = [], limit = 3
    do {
      if (limit < 3) {
        sleep(300)
      }
      img = _commonFunctions.captureScreen()
      results = YoloDetection.forward(img, filter)
    } while (results.length <= 0 && limit-- > 0)
    return results.map(result => {
      let left = result.x, top = result.y
      // 坐标转换，中心点
      result.x = result.x + result.width / 2
      result.y = result.y + result.height / 2
      result.left = left
      result.top = top
      return result
    })
  }

  this.start = function () {
    this.prepareChecker()
    this.launchApp()
    this.pushLog('打开APP成功')
    sleep(1000)
    this.collectReadyEgg()
    this.checkIsSleeping()
    this.checkIsOut()
    if (!config.dont_kick_thief) {
      this.pushLog('检查是否有偷吃野鸡')
      if (this.checker.checkThief()) {
        // 揍过鸡
        _commonFunctions.setPunched()
      }
    } else {
      if (config.employ_friend_chick) {
        this.checker.employFriendChick()
      }
      if (!YoloDetection.enabled) {
        this.pushErrorLog('当前未开启YOLO，请勿开启不驱赶野鸡，取色识别容易出错')
      }
    }
    WarningFloaty.clearAll()

    //  每天首次运行时领取饲料
    if (_commonFunctions.checkDailyFirst()) {
      fodderCollector.exec()
      _commonFunctions.setTodayFeeded()
    }
    sleep(1000)
    this.checkAndFeed()
    WarningFloaty.clearAll()
    sleep(1000)
    if (config.pick_shit) {
      this.checkAndPickShit()
    }
    this.viewDiary()
    sleep(2000)
    _commonFunctions.minimize()
    resourceMonitor.releaseAll()
  }

  /**
   * 获取测试用yoloChecker
   * 
   * @returns 测试用的checker
   */
  this.createYoloChecker = function () {
    return new YoloChecker(this)
  }

  /**
   * 获取测试用的colorChecker
   * 
   * @returns 测试用的checker
   */
  this.createColorChecker = function () {
    return new ColorChecker(this)
  }


  function ManorChecker (mainExecutor) {
    this.mainExecutor = mainExecutor
  }

  ManorChecker.prototype.checkSpeedSuccess = () => {
    errorInfo('this function should be override checkSpeedSuccess')
  }

  ManorChecker.prototype.checkAndClickShit = () => {
    errorInfo('this function should be override checkAndClickShit')
  }

  ManorChecker.prototype.checkAndCollectMuck = () => {
    errorInfo('this function should be override checkAndCollectMuck')
  }

  ManorChecker.prototype.checkThief = () => {
    errorInfo('this function should be override checkThief')
  }

  ManorChecker.prototype.employFriendChick = () => {
    errorInfo('雇佣好友小鸡功能仅限开启YOLO后支持')
  }

  function ColorChecker (mainExecutor) {
    ManorChecker.call(this, mainExecutor)
  }
  ColorChecker.prototype = Object.create(ManorChecker.prototype)
  ColorChecker.prototype.constructor = ColorChecker
  ColorChecker.prototype.checkSpeedSuccess = function () {
    let useSpeedCard = config.useSpeedCard
    let img = null
    let checkSpeedup = false
    // 校验三次
    let checkCount = useSpeedCard ? 3 : 1
    WarningFloaty.addRectangle('校验加速卡是否成功使用', config.SPEED_CHECK_REGION)
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
      yoloTrainHelper.saveImage(img, '加速吃饭中', 'speedup_eating')
      this.mainExecutor.setFloatyInfo(checkSpeedup, useSpeedCard ? "加速卡使用成功" : "检测到已使用加速卡")
      return true
    } else {
      this.mainExecutor.setFloatyTextColor('#ff0000')
      yoloTrainHelper.saveImage(img, '吃饭中可能没加速', 'speedup_failed')
      this.mainExecutor.setFloatyInfo({ x: config.SPEED_CHECK_REGION[0], y: config.SPEED_CHECK_REGION[1] }, useSpeedCard ? "加速卡使用失败" : "未使用加速卡")
      return false
    }
  }
  ColorChecker.prototype.checkAndClickShit = function () {
    let img = _commonFunctions.checkCaptureScreenPermission()
    let pickRegion = config.SHIT_CHECK_REGION || [435, 1925, 40, 40]
    let pickShitColor = config.PICK_SHIT_GRAY_COLOR || '#111111'
    let originImg = images.copy(img)
    img = images.grayscale(img)
    WarningFloaty.addRectangle('查找可捡屎区域', pickRegion)
    let point = images.findColor(img, pickShitColor, { region: pickRegion })
    if (point) {
      this.mainExecutor.setFloatyInfo({ x: pickRegion[0], y: pickRegion[1] }, "有屎可以捡")
      yoloTrainHelper.saveImage(originImg, '有屎可以捡', 'pick_shit')
      click(point.x, point.y)
      debugInfo(['find point：{},{}', point.x, point.y])
      return true
    }
    return false
  }
  ColorChecker.prototype.checkAndCollectMuck = function () {
    let collectRegion = config.COLLECT_SHIT_CHECK_REGION || [220, 2000, 80, 40]
    let collectShitColor = config.COLLECT_SHIT_GRAY_COLOR || '#535353'
    WarningFloaty.addRectangle('查找可捡屎点击确认区域', collectRegion)
    sleep(1000)
    let img = _commonFunctions.checkCaptureScreenPermission()
    yoloTrainHelper.saveImage(img, '执行捡屎', 'execute_pick_shit')
    img = images.grayscale(img)
    point = images.findColor(img, collectShitColor, { region: collectRegion })
    if (point) {
      click(point.x, point.y)
      debugInfo(['find point：{},{}', point.x, point.y])
    } else {
      warnInfo(['未找到执行捡屎标记位 寻找灰度颜色：{}', collectShitColor])
    }
  }

  ColorChecker.prototype.checkThief = function () {
    let punchedLeft = this.mainExecutor.checkThiefLeft()
    let punchedRight = this.mainExecutor.checkThiefRight()
    return punchedLeft || punchedRight
  }

  function YoloChecker (mainExecutor) {
    ManorChecker.call(this, mainExecutor)
  }
  YoloChecker.prototype = Object.create(ManorChecker.prototype)
  YoloChecker.prototype.constructor = YoloChecker
  YoloChecker.prototype.checkSpeedSuccess = function () {
    let speedupEating = this.mainExecutor.yoloCheck('是否加速吃饭中', { confidence: 0.7, labelRegex: 'speedup_eating' })
    let img = _commonFunctions.captureScreen()
    if (speedupEating) {
      yoloTrainHelper.saveImage(img, '加速吃饭中', 'speedup_eating')
      return true
    } else {
      yoloTrainHelper.saveImage(img, '吃饭中可能没加速', 'speedup_failed')
      return false
    }
  }

  YoloChecker.prototype.checkAndClickShit = function () {
    let hasShit = this.mainExecutor.yoloCheck('是否有屎', { confidence: 0.7, labelRegex: 'has_shit' })
    if (hasShit) {
      this.mainExecutor.setFloatyInfo(hasShit, '有屎可以捡')
      click(hasShit.x, hasShit.y)
      sleep(500)
      return true
    }
    return false
  }

  YoloChecker.prototype.checkAndCollectMuck = function () {
    let pickMucks = this.mainExecutor.yoloCheckAll('执行收集饲料', { confidence: 0.7, labelRegex: 'collect_muck' })
    if (pickMucks && pickMucks.length > 0) {
      pickMucks.forEach(execPickMuck => {
        this.mainExecutor.setFloatyInfo(execPickMuck, '收集饲料')
        click(execPickMuck.x, execPickMuck.y)
        sleep(100)
      })
    } else {
      warnInfo(['未能通过YOLO识别执行收集饲料的区域'])
    }
  }

  /**
   * 驱赶野鸡
   *
   * @param {*} findThief 
   * @returns 
   */
  YoloChecker.prototype.driveThief = function (findThief, desc) {
    desc = desc || '找到了野鸡'
    if (findThief) {
      debugInfo(['{}：{},{}', desc, findThief.x, findThief.y])
      automator.click(findThief.x, findThief.y)
      sleep(1000)
      let kickOut = this.mainExecutor.yoloCheck('赶走', { confidence: 0.7, labelRegex: 'kick-out' })
      if (kickOut) {
        automator.click(kickOut.x, kickOut.y)
        yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '关闭按钮', 'confirm_btn')
        let notLeaveMsg = widgetUtils.widgetGetOne('不留言', 1000)
        if (notLeaveMsg) {
          automator.clickCenter(notLeaveMsg)
        } else {
          this.mainExecutor.yoloClickConfirm(true)
        }
        sleep(1000)
        return true
      } else {
        warnInfo(['未能找到赶走按钮，请确认是否是邀请了工作小鸡'])
      }
    }
    return false
  }

  YoloChecker.prototype.checkThief = function () {
    let kicked = false, tryTime = 2
    this.mainExecutor.pushLog('准备校验是否有偷吃野鸡')
    do {
      if (tryTime < 2) {
        sleep(500)
      }
      let results = this.mainExecutor.forwardByYolo()
      let matches = results.filter(target => /thief_chicken|thief_eye_band/.test(target.label) && target.confidence > 0.7)
      matches = reduceDuplicated(matches)
      if (matches.length > 0) {
        matches.forEach(thief => {
          kicked |= this.driveThief(thief)
        })
      }
    } while (!kicked && tryTime-- > 0)
    // let findThiefLeft = this.mainExecutor.yoloCheck('偷吃野鸡', { confidence: 0.7, labelRegex: 'thief_chicken|thief_eye_band', filter: (result) => result.x < config.device_width / 2 }, 2)
    // kicked |= this.driveThief(findThiefLeft)
    // let findThiefRight = this.mainExecutor.yoloCheck('偷吃野鸡', { confidence: 0.7, labelRegex: 'thief_chicken|thief_eye_band', filter: (result) => result.x > config.device_width / 2 }, 2)
    // kicked |= this.driveThief(findThiefRight)
    if (config.force_check_thief) {
      let findFoodInCenter = this.mainExecutor.yoloCheck('中间食盆位置',
        /* x坐标位置在中心点左边，代表有野鸡存在而yolo识别失败了 */
        { confidence: 0.7, labelRegex: 'has_food', filter: result => result.x - (result.width / 2) < config.device_width / 2 }, 1)
      if (findFoodInCenter) {
        warnInfo(['食盆位置在中间，而野鸡驱赶失败，记录数据'])
        yoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '偷吃野鸡识别失败', 'thief_chicken_check_failed')
        // 左右随便点击一下
        kicked != this.driveThief({ x: findFoodInCenter.x - findFoodInCenter.width, y: findFoodInCenter.y }, '盲点左边野鸡坐标')
        kicked != this.driveThief({ x: findFoodInCenter.x + findFoodInCenter.width * 2, y: findFoodInCenter.y }, '盲点右边野鸡坐标')
      }
    }
    if (!kicked) {
      this.mainExecutor.pushLog('未找到偷吃野鸡')
    }
    return kicked
  }

  YoloChecker.prototype.employFriendChick = function () {
    let emploied = false, tryTime = 2
    this.mainExecutor.pushLog('准备校验是否有好友小鸡')
    do {
      if (tryTime < 2) {
        sleep(500)
      }
      let results = this.mainExecutor.forwardByYolo()
      let matches = results.filter(target => /working_chicken|thief_chicken|thief_eye_band/.test(target.label) && target.confidence > 0.7)
      matches = reduceDuplicated(matches)
      if (matches.length > 0) {
        matches.forEach(friendChick => {
          emploied |= this.employChick(friendChick)
        })
      }
    } while (!emploied && tryTime-- > 0)
  }

  function regionIn (targetA, targetB) {
    if (targetA.x > targetB.left && targetA.x < targetB.left + targetB.width && targetA.y > targetB.top && targetA.y < targetB.top + targetB.height) {
      return true
    }
    if (targetB.x > targetA.left && targetB.x < targetA.left + targetA.width && targetB.y > targetA.top && targetB.y < targetA.top + targetA.height) {
      return true
    }
    return false
  }


  function reduceDuplicated (matches) {
    let result = []
    // 先按置信度升序排列
    matches.sort((a, b) => a.confidence - b.confidence)
    // 过滤中心点重复的，保留搞高置信度的
    for (let i = 0; i < matches.length; i++) {
      let match = matches[i]
      let isDuplicated = false
      for (let j = i + 1; j < matches.length; j++) {
        let match2 = matches[j]
        if (regionIn(match, match2)) {
          isDuplicated = true
          break
        }
      }
      if (!isDuplicated) {
        result.push(match)
      }
    }
    return result
  }

  YoloChecker.prototype.employChick = function (friendChick) {
    let desc = '找到了好友小鸡'
    if (friendChick) {
      debugInfo(['{}：{},{}', desc, friendChick.x, friendChick.y])
      let ocrRegion = [friendChick.left - friendChick.width / 2, friendChick.top - friendChick.height / 2, friendChick.width, friendChick.height]
      WarningFloaty.addRectangle('OCR识别区域', ocrRegion)
      sleep(1000)
      if (this.mainExecutor.checkByOcr(ocrRegion, '工作中')) {
        LogFloaty.pushLog('当前小鸡正在工作中，跳过雇佣')
        return true
      }
      automator.click(friendChick.x, friendChick.y)
      sleep(1000)
      let employ = this.mainExecutor.yoloCheck('雇佣', { confidence: 0.7, labelRegex: 'employ' })
      if (employ) {
        automator.click(employ.x, employ.y)
        sleep(100)
        if (widgetUtils.widgetCheck('解雇.*', 1000)) {
          let cancelBtn = widgetUtils.widgetGetOne('取消', 1000)
          if (cancelBtn) {
            automator.clickCenter(cancelBtn)
          }
          return true
        }
        let confirmBtn = widgetUtils.widgetGetOne('确认雇佣', 2000)
        if (confirmBtn) {
          automator.clickCenter(confirmBtn)
        } else {
          this.mainExecutor.yoloClickConfirm(true)
        }
        sleep(1000)
      } else {
        warnInfo(['未能找到雇佣按钮 可能当前小鸡已经雇佣了'])
        // 再次点击小鸡 关闭按钮
        automator.click(friendChick.x, friendChick.y)
      }
      return true
    }
    // 此处和驱赶不同，只要确认找到了小鸡 就认为已经雇佣
    return false
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

function boundsToRegion (b) {
  return [b.left, b.top, b.width(), b.height()]
}