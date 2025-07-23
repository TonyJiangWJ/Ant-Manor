let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let alipayUnlocker = singletonRequire('AlipayUnlocker')
let FileUtils = singletonRequire('FileUtils')
let openCvUtil = require('../lib/OpenCvUtil.js')
let FloatyInstance = singletonRequire('FloatyUtil')
let localOcr = require('../lib/LocalOcrUtil.js')
let WarningFloaty = singletonRequire('WarningFloaty')
let LogFloaty = singletonRequire('LogFloaty')
let yoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetection = singletonRequire('YoloDetectionUtil')
let NotificationHelper = singletonRequire('Notification')
let formatDate = require('../lib/DateUtil.js')
let AiUtil = require('../lib/AIRequestUtil.js')
FloatyInstance.enableLog()

let villageConfig = config.village_config
// 摆摊摊位框选 带文字
villageConfig.booth_position_left = villageConfig.booth_position_left || [193, 1659, 436, 376]
villageConfig.booth_position_right = villageConfig.booth_position_right || [629, 1527, 386, 282]
function VillageRunner () {
  let _this = this
  // 已访问的好友 避免识别失败后重复进入
  this.visited_friends = []
  // 当前一摆摊的摊位
  let currentBoothSetted = 0
  this.exec = function () {
    try {
      openMyVillage()
      sleep(1000)
      collectMyCoin()
      sleep(500)
      // 加速产币
      speedAward()
      sleep(500)
      checkAnyEmptyBooth()
      waitForLoading()
      checkMyBooth()
      if (this._should_restart_immediately) {
        commonFunctions.setUpAutoStart(5)
        NotificationHelper.createNotification('新村摆摊邀请异常，等待5分钟后自动启动',
          '下次执行时间：' + formatDate(new Date(new Date().getTime() + 5 * 60000)))
      } else {
        // 设置2小时后启动
        let sleepTime = villageConfig.interval_time || 120
        commonFunctions.setUpAutoStart(sleepTime)
        NotificationHelper.createNotification('新村摆摊已完成，等待' + sleepTime + '分钟后自动启动',
          '下次执行时间：' + formatDate(new Date(new Date().getTime() + sleepTime * 60000)))
      }
    } catch (e) {
      errorInfo('执行异常 五分钟后重试' + e)
      commonFunctions.setUpAutoStart(5)
      commonFunctions.printExceptionStack(e)
    }
  }

  this.tryOpenVillageByHomeWidget = function (reopen) {
    LogFloaty.pushLog('通过支付宝首页打开蚂蚁新村，以便每日获取奖励')
    commonFunctions.backHomeIfInVideoPackage()
    app.launch('com.eg.android.AlipayGphone')
    FloatyInstance.setFloatyInfo({ x: config.device_width / 2, y: config.device_height / 2 }, "查找是否有'打开'对话框")
    let confirm = widgetUtils.widgetGetOne(/^打开$/, 1000)
    if (confirm) {
      automator.clickCenter(confirm)
    }
    sleep(1000)
    if (openAlipayMultiLogin(reopen)) {
      return this.tryOpenVillageByHomeWidget(true)
    }
    if (config.is_alipay_locked) {
      sleep(1000)
      alipayUnlocker.unlockAlipay()
    }
    let entry = widgetUtils.widgetGetOne('蚂蚁新村')
    if (entry) {
      LogFloaty.pushLog('找到蚂蚁新村入口')
      automator.clickCenter(entry)
      return waitForLoading()
    } else {
      LogFloaty.pushWarningLog('未能找到蚂蚁新村入口，放弃查找')
    }
  }

  function openMyVillage (reopen, retry) {
    commonFunctions.backHomeIfInVideoPackage()
    LogFloaty.pushLog('准备打开蚂蚁新村')
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=68687809',
      packageName: 'com.eg.android.AlipayGphone'
    })
    FloatyInstance.setFloatyInfo({ x: config.device_width / 2, y: config.device_height / 2 }, "查找是否有'打开'对话框")
    let confirm = widgetUtils.widgetGetOne(/^打开$/, 1000)
    if (confirm) {
      automator.clickCenter(confirm)
    }
    sleep(1000)
    if (openAlipayMultiLogin(reopen)) {
      openMyVillage(true)
    }

    if (config.is_alipay_locked) {
      sleep(1000)
      alipayUnlocker.unlockAlipay()
    }
    sleep(1000)
    if (!waitForLoading() && !retry) {
      LogFloaty.pushWarningLog('打开蚂蚁新村失败，重新打开')
      commonFunctions.minimize()
      killAlipay()
      sleep(3000)
      openMyVillage(false, true)
    }
  }

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
  function collectMyCoin () {
    let findByYolo = false
    if (YoloDetection.enabled) {
      let collectCoin = yoloCheck('收集金币', { confidence: 0.7, labelRegex: 'collect_coin' })
      if (collectCoin) {
        automator.click(collectCoin.x, collectCoin.y)
        findByYolo = false
      }
    }
    if (!findByYolo) {
      // 自动点击自己的能量豆
      automator.click(villageConfig.village_reward_click_x, villageConfig.village_reward_click_y)
    }
  }
  /**
   * 等待摆摊界面或者好友界面打开完成 寻找邮箱或其他标志物
   */
  function waitForLoading () {
    if (config._mock_fail && Math.random() > 0.25 || config._fail_next) {
      config._fail_next = true
      return false
    }
    LogFloaty.pushLog('校验是否正确打开蚂蚁新村')
    if (YoloDetection.enabled) {
      if (yoloWaitFor('界面校验', { confidence: 0.7, labelRegex: 'booth_btn|empty_booth' })) {
        return true
      }
    }
    let screen = commonFunctions.captureScreen()
    let findPoint = openCvUtil.findByGrayBase64(screen, villageConfig.checking_mail_box)
    // 等待五秒
    let limit = 5
    while (limit-- > 0 && !findPoint) {
      sleep(1000)
      screen = commonFunctions.captureScreen()
      findPoint = openCvUtil.findByGrayBase64(screen, villageConfig.checking_mail_box)
    }
    if (!!findPoint) {
      yoloTrainHelper.saveImage(screen, '打开新村成功', 'open_village_success')
      FloatyInstance.setFloatyInfo({ x: findPoint.centerX(), y: findPoint.centerY() }, '打开蚂蚁新村成功')
      sleep(1000)
      return true
    } else {
      yoloTrainHelper.saveImage(screen, '打开新村失败', 'open_village_failed')
      errorInfo('打开蚂蚁新村失败', true)
      LogFloaty.pushErrorLog('打开蚂蚁新村失败')
      // killAlipay()
      return false
    }
  }

  /**
   * 查找空位，邀请好友摆摊
   */
  function checkAnyEmptyBooth () {
    LogFloaty.pushLog('准备查找是否有超时摊位')
    NotificationHelper.cancelNotice('drive_out_booth_warn')
    NotificationHelper.cancelNotice('empty_booth_warn')
    sleep(1000)
    FloatyInstance.hide()
    if (YoloDetection.enabled) {
      let successCheck = checkAnyEmptyBoothByYolo()
      if (successCheck) {
        return
      } else {
        warnInfo(['检查后 可操作摊位小于2 需要使用OCR方式兜底 可能当前界面无法通过YOLO识别空摊位'])
        yoloTrainHelper.saveImage(commonFunctions.captureScreen(), '无法正确校验空摊位', 'empty_booth', config.yolo_save_empty_booth_failed)
      }
    }
    // ⬇️未开启YOLO或者YOLO识别失败
    let screen = commonFunctions.captureScreen()
    FloatyInstance.restore()
    // 移除超过一定时间的好友摊位
    let count = 0
    count += !!doCheckAndDriveOut(screen, villageConfig.booth_position_left) ? 1 : 0
    count += !!doCheckAndDriveOut(screen, villageConfig.booth_position_right) ? 1 : 0
    if (count > 0) {
      yoloTrainHelper.saveImage(screen, '有可以驱离的好友', 'operate_booth')
      LogFloaty.pushLog('成功驱离了好友的摊位')
      sleep(1000)
      if (count < 2) {
        NotificationHelper.createNotification('只驱赶了一个好友摊位，请注意实际界面信息', formatDate(new Date()) + '当前只驱赶了一个好友，需要关注是否正常', 'drive_out_booth_warn')
      }
    } else {
      NotificationHelper.createNotification('未驱赶超时好友，请注意实际界面信息', formatDate(new Date()) + '当前没有超时好友，无法驱离，需要关注是否正常', 'drive_out_booth_warn')
    }
    LogFloaty.pushLog('准备查找是否有空位')
    sleep(1000)
    FloatyInstance.hide()
    screen = commonFunctions.captureScreen()
    FloatyInstance.restore()
    let leftEmpty = doCheckEmptyBooth(screen, villageConfig.booth_position_left)
    let noMoreFriend = false, inviteResult = null
    if (leftEmpty) {
      yoloTrainHelper.saveImage(screen, '左侧有空摊位', 'empty_booth')
      let point = wrapRegionForInvite(villageConfig.booth_position_left)
      FloatyInstance.setFloatyInfo({ x: point.centerX(), y: point.centerY() }, '左侧有空位')
      sleep(1000)
      if (!(inviteResult = inviteFriend(point))) {
        warnInfo('无可邀请好友，不再检查空位')
        automator.click(config.device_width / 2, config.device_height * 0.1)
        noMoreFriend = true
        sleep(1000)
      }
    }
    let rightEmpty = !noMoreFriend && doCheckEmptyBooth(screen, villageConfig.booth_position_right)
    if (rightEmpty) {
      let point = wrapRegionForInvite(villageConfig.booth_position_right)
      FloatyInstance.setFloatyInfo({ x: point.centerX(), y: point.centerY() }, '右侧有空位')
      yoloTrainHelper.saveImage(screen, '右侧有空位', 'empty_booth')
      sleep(1000)
      if (!(inviteResult = inviteFriend(point))) {
        warnInfo('无可邀请好友')
        // 关闭抽屉
        automator.click(config.device_width / 2, config.device_height * 0.1)
        noMoreFriend = true
        sleep(1000)
      }
    }
    // 使用OCR兜底之后，发现邀请好友加载失败，需要脚本执行完毕后立马设置定时任务重新开始 避免因为控件获取失败导致的没有邀请
    if (inviteResult == null) {
      _this._should_restart_immediately = true
    }
    screen = commonFunctions.captureScreen()
    if (!noMoreFriend && (doCheckEmptyBooth(screen, villageConfig.booth_position_left) || doCheckEmptyBooth(screen, villageConfig.booth_position_right))) {
      NotificationHelper.createNotification('邀请好友失败，请注意实际界面信息', formatDate(new Date()) + '邀请好友后存在空摊位，需要关注是否正常', 'empty_booth_warn')
    }
    WarningFloaty.clearAll()
  }

  function checkAnyEmptyBoothByYolo () {
    // 检查是否有可驱赶的摊位
    let findOperationBooth = yoloCheckAll('可操作摊位', { labelRegex: 'operation_booth' })
    if (findOperationBooth && findOperationBooth.length > 0) {
      let screen = commonFunctions.captureScreen()
      let count = 0
      findOperationBooth.forEach(ocrPosition => {
        count += doCheckAndDriveOut(screen, [ocrPosition.left, ocrPosition.top, ocrPosition.width, ocrPosition.height]) ? 1 : 0
      })
      if (count > 0) {
        if (count < 2) {
          NotificationHelper.createNotification('只驱赶了一个好友摊位，请注意实际界面信息', formatDate(new Date()) + '当前只驱赶了一个好友，需要关注是否正常', 'drive_out_booth_warn')
        }
      } else {
        NotificationHelper.createNotification('未驱赶超时好友，请注意实际界面信息', formatDate(new Date()) + '当前没有超时好友，无法驱离，需要关注是否正常', 'drive_out_booth_warn')
      }
    }
    // 检测空摊位并邀请
    let findEmptyBooth = yoloCheckAll('空摊位', { labelRegex: 'empty_booth' })
    if (findEmptyBooth && findEmptyBooth.length > 0) {
      let noMoreFriend = false, inviteResult = null
      findEmptyBooth.forEach(emptyBooth => {
        if (noMoreFriend) {
          return
        }
        let point = {
          x: emptyBooth.x,
          y: emptyBooth.y,
          centerX: () => emptyBooth.x,
          centerY: () => emptyBooth.y,
        }
        FloatyInstance.setFloatyInfo({ x: point.x, y: point.y }, '有空位点击触发邀请')
        sleep(1000)
        if (!(inviteResult = inviteFriend(point)) && inviteResult != null) {
          warnInfo('无可邀请好友，不再检查空位')
          automator.click(config.device_width / 2, config.device_height * 0.1)
          noMoreFriend = true
          sleep(1000)
        }
      })
    }
    // 二次校验可操作摊位 如果小于2 则表示有空摊位无法识别
    findOperationBooth = yoloCheckAll('可操作摊位', { labelRegex: 'operation_booth', confidence: 0.8 /* 需要高可信度 否则可能漏了 */ })
    return findOperationBooth && findOperationBooth.length >= 2
  }
  function yoloCheck (desc, filter) {
    let result = yoloCheckAll(desc, filter)
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  }

  function yoloCheckAll (desc, filter) {
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
      let hasLowConfidence = false
      let res = result.map(r => {
        let { x: left, y: top, width, height, label, confidence } = r
        debugInfo(['通过YOLO找到目标：{} label: {} confidence: {}', desc, label, confidence])
        if (confidence < 0.9) {
          hasLowConfidence = true
        }
        return { x: left + width / 2, y: top + height / 2, width: width, height: height, left: left, top: top, label: label, confidence: confidence }
      })
      if (hasLowConfidence) {
        yoloTrainHelper.saveImage(img, desc + 'yolo准确率低', 'low_predict_village', config.yolo_save_low_predict)
      } else {
        yoloTrainHelper.saveImage(img, desc + '成功', desc)
      }
      return res
    } else {
      yoloTrainHelper.saveImage(img, desc + '失败', 'village_target_failed', config.yolo_save_check_failed)
      debugInfo(['未能通过YOLO找到：{}', desc])
    }
    return null
  }

  function yoloWaitFor (desc, filter) {
    debugInfo(['通过yolo方式等待界面元素：{}', desc])
    let img = null
    let timeoutCount = 5
    let result = []
    WarningFloaty.clearAll()
    do {
      sleep(400)
      img = commonFunctions.checkCaptureScreenPermission()
      result = YoloDetection.forward(img, filter)
    } while (result.length <= 0 && timeoutCount-- > 0)
    if (result.length > 0) {
      let { x, y, width, height } = result[0]
      WarningFloaty.addRectangle('找到：' + desc, [x, y, width, height])
      yoloTrainHelper.saveImage(img, desc + '成功', desc)
    } else {
      yoloTrainHelper.saveImage(img, desc + '失败', desc + '_failed', config.yolo_save_check_failed)
    }
    return result.length > 0
  }
  /**
   * 校验并驱赶
   * @param {ImageWrapper} screen 
   * @param {array: [left, top, width, height]} region 
   */
  function doCheckAndDriveOut (screen, region) {
    if (!localOcr.enabled) {
      warnInfo('本地Ocr初始化失败 或者当前版本AutoJs不支持Ocr')
      return
    }
    WarningFloaty.addRectangle('OCR识别区域，需要保证点击位置在摊位上', region, '#00ff00')
    let clickPoint = wrapRegionForInvite(region)
    WarningFloaty.addText('点击位置', { x: clickPoint.centerX, y: clickPoint.centerY }, '#ff0000')
    let clipImg = images.clip(screen, region[0], region[1], region[2], region[3])
    if (localOcr.type == 'mlkit') {
      // 识别准确率太低 进行放大
      clipImg = images.resize(clipImg, [clipImg.getWidth() * 2, clipImg.getHeight() * 2])
    }
    let recognizeText = localOcr.recognize(clipImg)
    debugInfo(['识别文本：{}', recognizeText])
    let regex = new RegExp(villageConfig.friend_end_up_regex || /.*(已停产|余.*营.*)/)
    debugInfo(['摊位超时校验正则：{}', '' + regex])
    if (regex.test(recognizeText)) {
      FloatyInstance.setFloatyInfo({ x: region[0], y: region[1] }, '摊位超时：' + recognizeText)
      sleep(1000)
      WarningFloaty.clearAll()
      var r = new org.opencv.core.Rect(region[0], region[1], region[2], region[3])
      automator.click(r.x + r.width / 2, r.y + r.height * 0.2)
      let checking = widgetUtils.widgetWaiting(/.*并请走.*/, null, 3000)
      if (checking) {
        sleep(1000)
        let driveOut = widgetUtils.widgetGetOne('请走TA', 3000)
        if (driveOut) {
          driveOut.click()
          sleep(1000)
          return true
        }
      } else {
        let pendding = widgetUtils.widgetGetOne('待会儿再说', 3000)
        if (pendding) {
          pendding.click()
        }
      }
      sleep(1000)
    } else {
      debugInfo(['未找到超时摊位 区域：{}', JSON.stringify(region)])
      WarningFloaty.clearAll()
    }
    return false
  }


  /**
   * 校验指定区域是否有空摊位
   * @param {ImageWrapper} screen 
   * @param {array: [left, top, width, height]} region 
   */
  function doCheckEmptyBooth (screen, region) {
    if (!localOcr.enabled) {
      warnInfo('本地Ocr初始化失败 或者当前版本AutoJs不支持Ocr')
      return
    }
    WarningFloaty.addRectangle('OCR识别区域，需要保证点击位置在摊位上', region, '#00ff00')
    let clickPoint = wrapRegionForInvite(region)
    WarningFloaty.addText('点击位置', { x: clickPoint.centerX, y: clickPoint.centerY }, '#ff0000')
    let clipImg = images.clip(screen, region[0], region[1], region[2], region[3])
    if (localOcr.type == 'mlkit') {
      // 识别准确率太低 进行放大
      clipImg = images.resize(clipImg, [clipImg.getWidth() * 2, clipImg.getHeight() * 2])
    }
    let recognizeText = localOcr.recognize(clipImg)
    debugInfo(['识别文本：{}', recognizeText])
    let regex = new RegExp(/(.*的.*摊.*)|(剩余|免租|经营)/)
    debugInfo(['摊位存在校验正则：{}', '' + regex])
    if (regex.test(recognizeText)) {
      FloatyInstance.setFloatyInfo({ x: region[0], y: region[1] }, '存在摊位：' + recognizeText)
      sleep(1000)
      WarningFloaty.clearAll()
      return false
    } else {
      FloatyInstance.setFloatyInfo({ x: region[0], y: region[1] }, '不存在摊位：' + recognizeText)
      sleep(1000)
      WarningFloaty.clearAll()
      return true
    }
  }

  /**
   * 对OCR识别区域进行封装，点击偏上的位置
   *
   * @param {Array} region 
   * @returns 
   */
  function wrapRegionForInvite (region) {
    var r = new org.opencv.core.Rect(region[0], region[1], region[2], region[3])
    return {
      centerX: () => r.x + r.width / 2,
      centerY: () => r.y + r.height * 0.2
    }
  }

  /**
   * 邀请好友
   * 
   * @param {object} matchResult 
   * @return {boolean} 是否邀请成功：true/false/null 邀请成功/无可邀请好友/界面加载失败
   */
  function inviteFriend (matchResult, retry) {
    FloatyInstance.setFloatyInfo({ x: matchResult.centerX(), y: matchResult.centerY() }, '邀请好友')
    sleep(1000)
    automator.click(matchResult.centerX(), matchResult.centerY())
    if (!widgetUtils.widgetWaiting('邀请.*摆摊', null, 3000) && !retry) {
      warnInfo(['未能找到 邀请.*摆摊 控件信息'])
      automator.click(config.device_width / 2, config.device_height * 0.1)
      sleep(1000)
      return inviteFriend(matchResult, true)
    }
    let find = false
    // 旧版逻辑
    let inviteBtnList = widgetUtils.widgetGetAll('直接邀请摆摊', villageConfig.friends_finding_timeout || 8000, false, null, { algorithm: 'PDFS' })
    if (inviteBtnList && inviteBtnList.length > 0) {
      let invited = false
      inviteBtnList.forEach(inviteBtn => {
        if (invited) {
          return
        }
        let index = inviteBtn.indexInParent()
        if (index < 1) {
          return
        }
        let nameWidget = inviteBtn.parent().child(index - 1)
        let name = nameWidget.desc() || nameWidget.text()
        if (typeof villageConfig != 'undefined' && villageConfig.booth_black_list && villageConfig.booth_black_list.length > 0) {
          if (villageConfig.booth_black_list.indexOf(name) > -1) {
            debugInfo(['{} 在黑名单中 跳过邀请', name])
            return
          }
        }
        debugInfo(['邀请好友「{}」', name])
        inviteBtn.click()
        sleep(500)
        invited = true
      })
      return invited
    } else {
      if (!retry) {
        warnInfo('无法找到好友列表信息，关闭重试', true)
        automator.click(config.device_width / 2, config.device_height * 0.1)
        sleep(1000)
        return inviteFriend(matchResult, true)
      } else {
        warnInfo(['无法找到好友列表信息，可能加载失败，需要重启脚本'])
        return null
      }
    }

  }

  /**
   * 检查我的摊位
   * 
   * 1 回收超过2小时的摊位
   * 2 将闲置摊位进行摆放
   */
  function checkMyBooth () {
    let point = null, screen = null
    if (YoloDetection.enabled) {
      let result = yoloCheck('摆摊赚币', { confidence: 0.7, labelRegex: 'booth_btn' })
      if (result) {
        point = {
          centerX: () => result.x,
          centerY: () => result.y
        }
      }
    }
    if (!point) {
      screen = commonFunctions.captureScreen()
      point = openCvUtil.findByGrayBase64(screen, villageConfig.my_booth)
    }
    if (!point) {
      debugInfo(['尝试OCR识别 摆摊赚币'])
      let ocrResult = localOcr.recognizeWithBounds(screen, null, '摆摊赚币')
      if (ocrResult && ocrResult.length > 0) {
        point = ocrResult[0].bounds
      }
    }
    if (point) {
      yoloTrainHelper.saveImage(screen, '有摆摊赚币按钮', 'booth_btn')
      FloatyInstance.setFloatyInfo({ x: point.centerX(), y: point.centerY() }, '找到了摆摊赚币按钮')
      sleep(500)
      automator.click(point.centerX(), point.centerY())
      sleep(500)
      widgetUtils.widgetWaiting('随机摆摊', null, 3000)
      sleep(500)
      recycleBoothIfNeeded()
      sleep(500)
      setupBooth()
    } else {
      warnInfo('未找到摆摊赚币', true)
    }
  }

  /**
   * 回收超过2小时的摊位
   */
  function recycleBoothIfNeeded () {
    LogFloaty.pushLog('查找超过2小时或已停产的摊位')
    let over2 = /.*[2-6]时(\d+)分.*/
    let stopped = /.*已停产.*/
    let checkResult = widgetUtils.alternativeWidget(over2, stopped, null, true)
    if (checkResult.value == 0) {
      LogFloaty.pushLog('无超过2小时或已停产的摊位')
      sleep(1000)
      return
    } else if (checkResult.value == 1) {
      logInfo('找到了超过2小时的摊位')
    } else if (checkResult.value == 2) {
      logInfo('找到了已停产的摊位')
    }
    doRecycleBooth(widgetUtils.widgetGetOne('全部收摊'))
  }

  function doRecycleBooth (collector) {
    if (!collector) {
      return
    }
    collector.click()
    sleep(500)
    let confirm = widgetUtils.widgetGetOne('确认收摊')
    if (confirm) {
      confirm.click()
      sleep(1000)
    }
  }

  function getButtonInVision (getter, region) {
    let btn = getter()
    if (!btn) {
      return null
    }
    WarningFloaty.addRectangle('可视范围', region)
    function checkCenterInVision (boundsInfo) {
      let centerPointY = boundsInfo.centerY()
      if (centerPointY > region[1] && centerPointY < region[1] + region[3]) {
        return true
      }
      return false
    }

    function isUponVision (boundsInfo) {
      return boundsInfo.centerY() < region[1]
    }
    let limit = 4
    while (btn && !checkCenterInVision(btn.bounds()) && limit-- > 0) {
      if (!isUponVision(btn.bounds())) {
        let startY = region[3] - 10
        let endY = region[3] - (btn.bounds().centerY() - region[3])
        LogFloaty.pushLog('去摆摊不可见，滑动界面')
        automator.gestureDown(startY, endY)
        btn = getter()
      } else {
        LogFloaty.pushLog('划过头了')
        let startY = region[1] + 10
        let endY = region[1] + (region[1] - btn.bounds().centerY())
        LogFloaty.pushLog('去摆摊不可见，滑动界面')
        automator.gestureUp(startY, endY)
        btn = getter()
      }
    }
    sleep(1000)
    WarningFloaty.clearAll()
    return btn
  }

  /**
   * 闲置摊位摆放
   */
  function setupBooth () {
    if (villageConfig.setup_by_income_weight) {
      let button = getButtonInVision(() => widgetUtils.widgetGetOne('.*去摆摊'),
        [0, config.device_height * 0.3, config.device_width, config.device_height * 0.6])
      if (button) {
        if (localOcr.enabled) {
          let img = commonFunctions.captureScreen()
          let results = localOcr.recognizeWithBounds(img, null, '去摆摊')
          if (results && results.length > 0) {
            yoloTrainHelper.saveImage(img, '去摆摊', 'do_booth_btn')
            let btn = results[0].bounds
            automator.click(btn.centerX(), btn.centerY())
            // automator.clickCenter(button)
            checkFriendsVillage()
            return
          }
        }
      }
    }
    if (villageConfig.setup_by_income_weight) {
      LogFloaty.pushErrorLog('控件查找 去摆摊 失败 使用随机摆摊')
    }
    // 随机摆摊
    LogFloaty.pushLog('查找随机摆摊')
    let randomSetup = widgetUtils.widgetGetOne('随机摆摊')
    if (randomSetup) {
      sleep(1000)
      randomSetup.click()
    }
  }

  /**
   * 检查好友列表 点击有空位的位置
   * TODO 按收益优先级排序
   */
  function checkFriendsVillage () {
    widgetUtils.widgetWaiting('.*木兰币生产速度会更快.*', null, 3000)
    LogFloaty.pushLog('查找空位')
    sleep(1000)
    let incomeRateList = widgetUtils.widgetGetAll(/\d+\/时/, villageConfig.friends_finding_timeout || 8000, false, null, { algorighm: 'PDFS' })
    let blackList = villageConfig.booth_black_list || []
    let noValidBooth = true
    if (incomeRateList && incomeRateList.length > 0) {
      debugInfo(['找到带收益数据数量:{}', incomeRateList.length])
      let validFriendList = incomeRateList.map(incomeRate => {
        let container = incomeRate.parent()
        let friendName = container.child(1).text()
        let nameContainerWidth = container.child(1).bounds().width()
        let parentWidth = container.bounds().width()
        let widthRate = nameContainerWidth / parentWidth
        // debugInfo(['名称控件宽度占比：{}', widthRate.toFixed(2)])
        let incomeRateWeight = parseInt(/(\d+)\/时/.exec(incomeRate.text())[1])
        return {
          valid: _this.visited_friends.indexOf(friendName) < 0 && widthRate < 0.6 && (incomeRate.indexInParent() == 4 || incomeRate.indexInParent() == 2),
          container: container,
          friendName: friendName,
          weight: incomeRateWeight
        }
      }).sort((a, b) => b.weight - a.weight).filter(v => v.valid && blackList.indexOf(v.friendName) < 0)
      debugInfo(['过滤有效控件信息数：{}', validFriendList.length])
      if (validFriendList.length > 0) {
        noValidBooth = false
        let emptyBooth = validFriendList[0]
        debugInfo(['过滤后选择好友: {} 进行摆摊 每小时：{}', emptyBooth.friendName, emptyBooth.weight])
        emptyBooth.container.click()
        waitForLoading()
        _this.visited_friends.push(emptyBooth.friendName)
        if (setupToEmptyBooth()) {
          return checkFriendsVillage()
        } else {
          logInfo(['摆摊完毕, 摆摊数量：{}', currentBoothSetted], true)
        }
      }
    }
    if (noValidBooth) {
      LogFloaty.pushLog('未找到空位, 五分钟后再试')
      sleep(1000)
      commonFunctions.minimize()
      commonFunctions.setUpAutoStart(5)
      exit()
    }
  }

  /**
   * 判断好友小村里面是否有空位 有则点击摆摊
   * 
   * @returns 是否完成摆摊 是的话继续去下一个好友村庄检测
   */
  function setupToEmptyBooth () {
    FloatyInstance.setFloatyPosition(0, 0)
    let region = null
    if (YoloDetection.enabled) {
      let emptyBooth = yoloCheck('空摊位', { labelRegex: 'empty_booth', confidence: 0.7 })
      if (emptyBooth) {
        let { left, top, width, height } = emptyBooth
        region = [left, top, width, height]
      }
    }
    if (!region) {
      if (YoloDetection.enabled) {
        warnInfo('YOLO方式未找到空位，尝试OCR识别')
      }
      let screen = commonFunctions.captureScreen()
      let emptyCheck = doCheckEmptyBooth(screen, villageConfig.booth_position_left)
      if (emptyCheck) {
        region = villageConfig.booth_position_left
      } else {
        emptyCheck = doCheckEmptyBooth(screen, villageConfig.booth_position_right)
        if (emptyCheck) {
          region = villageConfig.booth_position_right
        }
      }
      if (region) {
        yoloTrainHelper.saveImage(screen, '好友界面有空位', 'empty_booth')
      } else {
        yoloTrainHelper.saveImage(screen, '好友界面无空位', 'no_empty_booth')
      }
    }

    if (region) {
      FloatyInstance.setFloatyInfo({ x: region[0], y: region[1] }, '有空位')
      sleep(1000)
      var r = new org.opencv.core.Rect(region[0], region[1], region[2], region[3])
      automator.click(r.x + r.width / 2, r.y + r.height * 0.2)
      widgetUtils.widgetWaiting('.*(收摊|去摆摊)', null, 3000)
      sleep(1500)
      return doSetupBooth()
    } else {
      logInfo('无空位', true)
      logInfo(['当前已摆摊数量为：{}', currentBoothSetted])
      if (currentBoothSetted < 4) {
        logInfo(['已摆摊数量小于4 需要重新回到上级进行判断'])
        automator.back()
        sleep(1000)
        checkFriendsVillage()
      }
      return false
    }
  }

  /**
   * 点击我的小摊去摆摊
   * 
   * @returns 是否继续摆摊
   */
  function doSetupBooth () {
    let setupped = widgetUtils.widgetGetAll('.*收摊', 1000)
    if (setupped) {
      currentBoothSetted = setupped.length
    }
    logInfo('当前已摆摊数量：' + currentBoothSetted)
    let full = currentBoothSetted >= 3
    let img = commonFunctions.captureScreen()
    let results = localOcr.recognizeWithBounds(img, null, '去摆摊')
    let setupBtn = null
    if (results && results.length > 0) {
      setupBtn = results[0].bounds
      yoloTrainHelper.saveImage(img, '去摆摊', 'do_booth_btn')
    }
    if (setupBtn) {
      let point = setupBtn
      FloatyInstance.setFloatyInfo({ x: point.centerX(), y: point.centerY() }, '去摆摊')
      sleep(500)
      automator.click(point.centerX(), point.centerY())
      currentBoothSetted += 1
      sleep(500)
      automator.back()
      return !full
    }
    warnInfo('未能找到去摆摊')
    automator.back()
    return false
  }
  let doneList = []
  /**
   * 加速产币
   */
  function speedAward (force, reopen) {
    if (!force && commonFunctions.checkSpeedUpCollected()) {
      debugInfo('今日已经完成加速，不继续查找加速产币 答题等请手动执行')
      return true
    }
    let hasOpenAwardSuccess = false
    if (clickSpeedAward()) {
      sleep(1000)
      doneList = []
      // 执行每日任务
      doTask(force)
      // 确保打开了加速产币抽屉
      if (!checkIsAwardOpened()) {
        LogFloaty.pushLog('准备重新打开蚂蚁新村，确保打开加速产币抽屉以便成功进行领取')
        hasOpenAwardSuccess = reopenAndCheckSpeedAward()
      } else {
        hasOpenAwardSuccess = true
      }
      let hadAward = false
      if (doCollectAll()) {
        LogFloaty.pushLog('全部领取点击完毕')
        sleep(1000)
        hadAward = true
      }
      if (!force && !hadAward) {
        LogFloaty.pushLog('已经没有可领取的加速产币了 设置今日不再执行')
        commonFunctions.setSpeedUpCollected()
      }
      if (villageConfig.award_close_specific) {
        LogFloaty.pushLog(['已指定关闭按钮坐标：{}, {}', villageConfig.award_close_x, villageConfig.award_close_y])
        automator.click(villageConfig.award_close_x, villageConfig.award_close_y)
      } else {
        LogFloaty.pushLog(['通过计算点击区域 关闭领取抽屉，如果不能正确关闭，请在设置中指定 加速产币关闭按钮坐标：{}, {}', config.device_width / 2, config.device_height * 0.15])
        automator.click(config.device_width / 2, config.device_height * 0.15)
      }
      sleep(1000)
    } else {
      LogFloaty.pushLog('未找到加速产币')
      sleep(1000)
      if (!reopen) {
        LogFloaty.pushWarningLog('检查界面并尝试重新打开')
        commonFunctions.minimize()
        openMyVillage()
        return speedAward(force, true)
      } else {
        LogFloaty.pushErrorLog('打开加速产币失败')
      }
    }
    if (!waitForLoading()) {
      LogFloaty.pushLog('等待界面加载失败，尝试重新打开')
      commonFunctions.minimize()
      openMyVillage()
    }
    return hasOpenAwardSuccess
  }

  function doCollectAll (hadAward, tryTime) {
    tryTime = tryTime || 1
    if (tryTime >= 7) {
      debugInfo(['检测次数过多，取消查找'])
      return hadAward
    }
    let canCollect = widgetUtils.widgetGetAll('(去)?领取', 3000)
    if (canCollect && canCollect.length > 0) {
      let hasNoVisible = false
      canCollect.forEach((collect, idx) => {
        debugInfo(['{} clickable: {} visible: {} centerClickable {}', idx, collect.clickable(), collect.visibleToUser(), automator.checkCenterClickable(collect)])
        let bounds = collect.bounds()
        debugInfo(['boudsRegion {}', JSON.stringify([bounds.left, bounds.top, bounds.width(), bounds.height()])])
        if (automator.checkCenterClickable(collect) && collect.bounds().bottom < config.device_height * 0.9) {
          automator.clickCenter(collect)
          sleep(500)
        } else {
          if (automator.checkCenterClickable(collect) && collect.clickable()) {
            collect.click()
          }
          hasNoVisible = true
        }
      })
      if (hasNoVisible) {
        let startY = config.device_height - config.device_height * 0.15
        let endY = startY - config.device_height * 0.3
        automator.gestureDown(startY, endY)
        debugInfo(['滑动下一页检查'])
        sleep(1000)
        return doCollectAll(true, tryTime + 1)
      }
    }
    return hadAward
  }

  function reopenAndCheckSpeedAward (tryTime) {
    tryTime = tryTime || 1
    if (tryTime >= 5) {
      errorInfo('重新打开失败多次，跳过执行重新打开', true)
      return
    }
    LogFloaty.pushLog('重新打开新村')
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=68687809',
      packageName: 'com.eg.android.AlipayGphone'
    })

    sleep(1000)
    if (waitForLoading()) {
      return clickSpeedAward()
    } else {
      LogFloaty.pushLog('重新打开新村失败，关闭支付宝再打开')
      sleep(1000)
      // TODO 更完善的关闭方式
      killAlipay()
      sleep(3000)
      if (tryTime >= 3) {
        LogFloaty.pushWarningLog('重新打开失败多次，多等待一会儿')
        device.keepScreenOn()
        sleep(10000 + tryTime * 2000)
        device.cancelKeepingAwake()
      }
      return reopenAndCheckSpeedAward(tryTime + 1)
    }
  }

  function killAlipay (rekill) {
    app.startActivity({
      packageName: "com.eg.android.AlipayGphone",
      action: "android.settings.APPLICATION_DETAILS_SETTINGS",
      data: "package:com.eg.android.AlipayGphone"
    });
    LogFloaty.pushLog('等待进入设置界面加载')
    let killed = false
    sleep(1000)
    let stop = widgetUtils.widgetWaiting(villageConfig.kill_alipay_text || '结束运行', null, 3800)
    if (stop) {
      sleep(1000)
      stop = widgetUtils.widgetGetOne(villageConfig.kill_alipay_text || '结束运行')
      automator.clickCenter(stop)
      sleep(1000)
      let confirm = widgetUtils.widgetGetOne('确定')
      if (confirm) {
        automator.clickCenter(confirm)
        killed = true
      }
    } else {
      LogFloaty.pushWarningLog('未能找到结束运行，通过设置关闭支付宝失败 请在蚂蚁新村设置中修改强制结束应用文本，当前配置：' + (villageConfig.kill_alipay_text || '结束运行'))
    }
    if (!killed && !rekill) {
      LogFloaty.pushLog('未能通过设置界面关闭，采用手势关闭')
      app.launch('com.eg.android.AlipayGphone')
      sleep(1000)
      config.killAppWithGesture = true
      commonFunctions.killCurrentApp()
      killAlipay(true)
    }
  }

  function clickSpeedAward (retry) {
    if (YoloDetection.enabled) {
      let speedupBtn = yoloCheck('加速产币', { confidence: 0.7, labelRegex: 'speedup' })
      if (speedupBtn) {
        automator.click(speedupBtn.x, speedupBtn.y)
        return checkIsAwardOpened()
      }
    }

    let screen = commonFunctions.captureScreen()
    let point = openCvUtil.findByGrayBase64(screen, villageConfig.speed_award)
    if (!point && localOcr.enabled) {
      debugInfo(['尝试OCR识别 加速产币'])
      let ocrResult = localOcr.recognizeWithBounds(screen, null, '加速产币')
      if (ocrResult && ocrResult.length > 0) {
        point = ocrResult[0].bounds
      }
    }
    if (point) {
      yoloTrainHelper.saveImage(screen, '有加速产币', 'village_speedup')
      FloatyInstance.setFloatyInfo({ x: point.centerX(), y: point.centerY() }, '加速产币')
      sleep(1000)
      automator.click(point.centerX(), point.centerY())
      sleep(1000)
      return checkIsAwardOpened()
    }
    if (!retry) {
      LogFloaty.pushWarningLog('未找到加速产币按钮，检查是否存在弹窗')
      let dismiss = widgetUtils.widgetGetOne('.*拒绝且不再询问.*', 2000)
      if (dismiss) {
        automator.clickCenter(dismiss)
        sleep(1000)
        LogFloaty.pushLog('找到弹窗询问按钮，点击拒绝')
        return clickSpeedAward(true)
      }
    }
    LogFloaty.pushErrorLog('未能找到加速产币')
    return false
  }

  function checkIsAwardOpened () {
    LogFloaty.pushLog('检查是否正确打开了加速产币')
    let result = widgetUtils.widgetCheck('.*(加速产币|木兰币|当前产速).*', 5000)
    if (!result) {
      LogFloaty.pushWarningLog('未能打开加速产币界面')
    }
    return result
  }

  function buildChecker (title, desc, keywordInspector, justBack) {
    return {
      title: title,
      desc: desc,
      justBack: justBack,
      keywordInspector: keywordInspector,
      check: (taskTitle, taskDesc) => {
        // debugInfo(['检查任务是否匹配: title: {} keyword: {} desc: {} keyword: {}', taskTitle, title, taskDesc, desc])
        if (title && taskTitle) {
          return new RegExp(title).test(taskTitle)
        }
        if (desc && taskDesc) {
          return new RegExp(desc).test(taskDesc)
        }
      }
    }
  }

  let taskTitleList = ['会员签到', '芭芭农场', '饿了么', '余额宝', '喂小羊', '听听TA的故事', '神奇海洋', '蚂蚁庄园', '知识问答', '木兰市集', '逛.*专场']
  let justBackList = ['听听TA的故事', '蚂蚁庄园', '专场']
  let taskDefineList = []
  taskTitleList.forEach(title => {
    let taskDefine = buildChecker(title, null, () => title)
    taskDefine.justBack = justBackList.indexOf(title) > -1
    taskDefineList.push(taskDefine)
  })
  // 描述中有 访问即可
  taskDefineList.push(buildChecker(null, '访问即可', (title, desc) => title, true))
  let questing = '知识问答'
  let browseAd = '木兰市集'

  function doTask (force, lastLength) {
    let toFinishList = widgetUtils.widgetGetAll('去完成') || []
    let currentTask = null
    toFinishList = toFinishList.filter(v => {
      let index = v.indexInParent()
      if (index < 2 || currentTask) {
        return
      }
      let parent = v.parent()
      let titleContainer = parent.child(index - 2)
      let title = titleContainer.text()
      let descriptionContainer = parent.child(index - 1)
      let desc = descriptionContainer.text()
      // 通用任务，提取关键字匹配
      for (let i = 0; i < taskDefineList.length; i++) {
        let taskDefine = taskDefineList[i]
        if (taskDefine.check(title, desc)) {
          let keyword = taskDefine.keywordInspector(title, desc)
          if (doneList.indexOf(keyword) > -1) {
            warnInfo(['当前任务已执行过，可能执行失败 不再执行它：[{}] title: {}', keyword, title])
            return false
          }
          currentTask = taskDefine
          currentTask.keyword = keyword
          return true
        }
      }
      return false
    })
    if (toFinishList.length > 0) {
      let toFinishBtn = toFinishList[0]
      toFinishBtn.click()
      LogFloaty.pushLog('等待界面加载')
      doneList.push(currentTask.keyword)
      if (currentTask.justBack) {
        let limit = 10
        while (--limit > 0) {
          LogFloaty.replaceLastLog('等待界面加载 剩余：' + limit + 's')
          sleep(1000)
        }
        back()
        sleep(1000)
      } else if (currentTask.keyword == questing) {
        // 执行AI知识问答
        answerQuestion()
        sleep(1000)
      } else if (currentTask.keyword == browseAd) {
        // 木兰市集，需要滑动30秒
        browseAds()
        sleep(1000)
      } else {
        // 通用任务，等待界面加载15秒自动结束
        let limit = 15
        while (--limit > 0) {
          LogFloaty.replaceLastLog('等待界面加载 剩余：' + limit + 's')
          sleep(1000)
        }
      }
      if (!checkIsAwardOpened()) {
        commonFunctions.minimize()
        reopenAndCheckSpeedAward()
      }
      return doTask(force, toFinishList.length)
    } else {
      LogFloaty.pushLog('未找到更多可完成任务')
    }
    return false
  }

  this.speedAward = speedAward
  this.waitForLoading = waitForLoading
  this.doTask = doTask
  this.killAlipay = killAlipay
}


function answerQuestion () {
  LogFloaty.pushLog('查找答题')
  let ai_type = config.ai_type || 'kimi'
  let kimi_api_key = config.kimi_api_key
  let chatgml_api_key = config.chatgml_api_key
  sleep(1000)
  widgetUtils.widgetWaiting('题目来源.*')
  sleep(1000)
  let key = ai_type === 'kimi' ? kimi_api_key : chatgml_api_key
  if (!key) {
    LogFloaty.pushLog('推荐去KIMI开放平台申请API Key并在可视化配置中进行配置')
    LogFloaty.pushLog('否则免费接口这个智障AI经常性答错')
  }
  let result = AiUtil.getQuestionInfo(ai_type, key)
  if (result) {
    LogFloaty.pushLog('答案解释：' + result.describe)
    LogFloaty.pushLog('答案坐标：' + JSON.stringify(result.target))
    automator.click(result.target.x, result.target.y)
  } else {
    NotificationHelper.createNotification('蚂蚁新村答题失败', '今日脚本自动答题失败，请手动处理')
  }
  sleep(1000)
  // TODO 随机答题
  automator.back()
}

function browseAds () {
  LogFloaty.pushLog('准备逛杂货铺')
  sleep(1000)
  LogFloaty.pushLog('检查是否有关闭弹窗按钮')
  let centerCloseBtn = selector().clickable().filter(node => {
    let bd = node.bounds()
    return bd.width() / bd.height() == 1 && bd.centerX() == config.device_width / 2 && bd.centerY() > config.device_height / 2
  }).findOne(2000)
  if (centerCloseBtn) {
    LogFloaty.pushLog('找到关闭弹窗按钮')
    centerCloseBtn.click()
  }
  let limit = 35
  while (--limit > 0) {
    if (limit % 2 == 0) {
      automator.randomScrollDown()
    } else {
      automator.randomScrollUp()
    }
    sleep(1000)
    LogFloaty.replaceLastLog('逛杂货铺 剩余：' + limit + 's')
  }
  automator.back()
}

module.exports = new VillageRunner()
