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
FloatyInstance.enableLog()

let villageConfig = config.village_config
// 摆摊摊位框选 带文字
villageConfig.booth_position_left = villageConfig.booth_position_left || [193, 1659, 436, 376]
villageConfig.booth_position_right = villageConfig.booth_position_right || [629, 1527, 386, 282]
function VillageRunner () {
  // 当前一摆摊的摊位
  let currentBoothSetted = 0
  this.exec = function () {
    try {
      openMyVillage()
      sleep(1000)
      // 自动点击自己的能量豆
      automator.click(villageConfig.village_reward_click_x, villageConfig.village_reward_click_y)
      sleep(500)
      // 加速产豆
      speedAward()
      sleep(500)
      checkAnyEmptyBooth()
      waitForLoading()
      checkMyBooth()
      // 设置2小时后启动
      commonFunctions.setUpAutoStart(villageConfig.interval_time || 120)
    } catch (e) {
      errorInfo('执行异常 五分钟后重试' + e)
      commonFunctions.setUpAutoStart(5)
      commonFunctions.printExceptionStack(e)
    }
  }

  function openMyVillage (reopen, retry) {
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

  /**
   * 等待摆摊界面或者好友界面打开完成 寻找邮箱或其他标志物
   */
  function waitForLoading () {
    LogFloaty.pushLog('校验是否正确打开蚂蚁新村')
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
      yoloTrainHelper.saveImage(screen, '打开新村成功')
      FloatyInstance.setFloatyInfo({ x: findPoint.centerX(), y: findPoint.centerY() }, '打开蚂蚁新村成功')
      sleep(1000)
      return true
    } else {
      yoloTrainHelper.saveImage(screen, '打开新村失败')
      errorInfo('打开蚂蚁新村失败', true)
      LogFloaty.pushErrorLog('打开蚂蚁新村失败')
      return false
    }
  }

  /**
   * 查找空位，邀请好友摆摊
   */
  function checkAnyEmptyBooth () {
    LogFloaty.pushLog('准备查找是否有超时摊位')
    sleep(1000)
    FloatyInstance.hide()
    let haveDriveOut = false
    let screen = commonFunctions.captureScreen()
    FloatyInstance.restore()
    // 移除超过一定时间的好友摊位
    haveDriveOut |= !!doCheckAndDriveOut(screen, villageConfig.booth_position_left)
    haveDriveOut |= !!doCheckAndDriveOut(screen, villageConfig.booth_position_right)
    if (haveDriveOut) {
      yoloTrainHelper.saveImage(screen, '有可以驱离的好友')
      LogFloaty.pushLog('成功驱离了好友的摊位')
      sleep(1000)
    }
    LogFloaty.pushLog('准备查找是否有空位')
    sleep(1000)
    FloatyInstance.hide()
    screen = commonFunctions.captureScreen()
    FloatyInstance.restore()
    let leftEmpty = doCheckEmptyBooth(screen, villageConfig.booth_position_left)
    let noMoreFriend = false
    if (leftEmpty) {
      yoloTrainHelper.saveImage(screen, '左侧有空摊位')
      let point = wrapRegionForInvite(villageConfig.booth_position_left)
      FloatyInstance.setFloatyInfo({ x: point.centerX(), y: point.centerY() }, '左侧有空位')
      sleep(1000)
      if (!inviteFriend(point)) {
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
      yoloTrainHelper.saveImage(screen, '右侧有空位')
      sleep(1000)
      inviteFriend(point)
    }
    WarningFloaty.clearAll()
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
   * 校验并驱赶
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
    let regex = new RegExp(/.*的.*摊.*/)
    debugInfo(['摊位超时校验正则：{}', '' + regex])
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
   */
  function inviteFriend (matchResult) {
    FloatyInstance.setFloatyInfo({ x: matchResult.centerX(), y: matchResult.centerY() }, '邀请好友')
    sleep(1000)
    automator.click(matchResult.centerX(), matchResult.centerY())
    widgetUtils.widgetWaiting('邀请.*摆摊', null, 3000)
    let avatarList = widgetUtils.widgetGetAll('avatar', villageConfig.friends_finding_timeout || 8000, false, null, { algorithm: 'PDFS' })
    if (avatarList && avatarList.length > 0) {
      let invited = false
      avatarList.forEach(avatar => {
        if (invited) {
          return
        }
        let index = avatar.indexInParent()
        let nameWidget = avatar.parent().child(index + 1)
        let name = nameWidget.desc() || nameWidget.text()
        let inviteBtnContainer = avatar.parent().child(index + 3)
        if (inviteBtnContainer.childCount() > 0) {
          let inviteBtn = inviteBtnContainer.child(0)
          let inviteText = inviteBtn.text() || inviteBtn.desc()
          if (inviteText !== '直接邀请摆摊') {
            debugInfo(['好友：{} 不能邀请：{}', name, inviteText])
            return
          }
          if (typeof villageConfig != 'undefined' && villageConfig.booth_black_list && villageConfig.booth_black_list.length > 0) {
            if (villageConfig.booth_black_list.indexOf(name) > -1) {
              debugInfo(['{} 在黑名单中 跳过邀请', name])
              return
            }
          }
          debugInfo(['邀请好友「{}」', name])
        } else {
          inviteBtnContainer = avatar.parent().child(index + 2)
          if (inviteBtnContainer.childCount() > 0) {
            let inviteBtn = inviteBtnContainer.child(0)
            inviteText = inviteBtn.text() || inviteBtn.desc()
            debugInfo(['好友[{}]不能邀请：{}', name, inviteText])
          }
          return
        }
        inviteBtnContainer.click()
        sleep(500)
        invited = true
      })
      return invited
    } else {
      warnInfo('无可邀请好友', true)
      return false
    }
  }

  /**
   * 检查我的摊位
   * 
   * 1 回收超过2小时的摊位
   * 2 将闲置摊位进行摆放
   */
  function checkMyBooth () {
    let screen = commonFunctions.captureScreen()
    let point = openCvUtil.findByGrayBase64(screen, villageConfig.my_booth)
    if (!point) {
      debugInfo(['尝试OCR识别 摆摊赚币'])
      let ocrResult = localOcr.recognizeWithBounds(screen, null, '摆摊赚币')
      if (ocrResult && ocrResult.length > 0) {
        point = ocrResult[0].bounds
      }
    }
    if (point) {
      yoloTrainHelper.saveImage(screen, '有摆摊赚币按钮')
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
    let over2 = /[2-6]时(\d+)分/
    let stopped = /已停产/
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

  /**
   * 闲置摊位摆放
   */
  function setupBooth () {
    if (villageConfig.setup_by_income_weight) {
      let button = widgetUtils.widgetGetOne('去摆摊')
      if (button) {
        button.click()
        checkFriendsVillage()
      }
    } else {
      // 随机摆摊
      LogFloaty.pushLog('查找随机摆摊')
      let randomSetup = widgetUtils.widgetGetOne('随机摆摊')
      if (randomSetup) {
        sleep(1000)
        randomSetup.click()
      }
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
      let frientList = incomeRateList.map(incomeRate => {
        let container = incomeRate.parent()
        let friendName = container.child(1).text()
        let incomeRateWeight = parseInt(/(\d+)\/时/.exec(incomeRate.text())[1])
        return {
          valid: incomeRate.indexInParent() == 4,
          container: container,
          friendName: friendName,
          weight: incomeRateWeight
        }
      }).sort((a, b) => b.weight - a.weight).filter(v => v.valid && blackList.indexOf(v.friendName) < 0)
      if (frientList.length > 0) {
        noValidBooth = false
        let emptyBooth = frientList[0]
        debugInfo(['过滤后选择好友: {} 进行摆摊 每小时：{}', emptyBooth.friendName, emptyBooth.weight])
        emptyBooth.container.click()
        waitForLoading()
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
    let screen = commonFunctions.captureScreen()
    let emptyCheck = doCheckEmptyBooth(screen, villageConfig.booth_position_left)
    let region = null
    if (emptyCheck) {
      region = villageConfig.booth_position_left
    } else {
      emptyCheck = doCheckEmptyBooth(screen, villageConfig.booth_position_right)
      if (emptyCheck) {
        region = villageConfig.booth_position_right
      }
    }

    if (region) {
      yoloTrainHelper.saveImage(screen, '好友界面有空位')
      FloatyInstance.setFloatyInfo({ x: region[0], y: region[1] }, '有空位')
      sleep(1000)
      var r = new org.opencv.core.Rect(region[0], region[1], region[2], region[3])
      automator.click(r.x + r.width / 2, r.y + r.height * 0.2)
      widgetUtils.widgetWaiting('收摊|去摆摊', null, 3000)
      sleep(1500)
      return doSetupBooth()
    } else {
      yoloTrainHelper.saveImage(screen, '好友界面无空位')
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
    let setupped = widgetUtils.widgetGetAll('收摊', 1000)
    if (setupped) {
      currentBoothSetted = setupped.length
    }
    logInfo('当前已摆摊数量：' + currentBoothSetted)
    let full = currentBoothSetted >= 3

    let setupBtn = widgetUtils.widgetGetOne('去摆摊')
    if (setupBtn) {
      let point = setupBtn.bounds()
      FloatyInstance.setFloatyInfo({ x: point.centerX(), y: point.centerY() }, '去摆摊')
      sleep(500)
      // automator.click(point.centerX(), point.centerY())
      setupBtn.click()
      currentBoothSetted += 1
      sleep(500)
      automator.back()
      return !full
    }
    warnInfo('未能找到去摆摊')
    automator.back()
    return false
  }

  /**
   * 加速产豆
   */
  function speedAward (force) {
    if (!force && commonFunctions.checkSpeedUpCollected()) {
      debugInfo('今日已经完成加速，不继续查找加速产豆 答题等请手动执行')
      return
    }
    if (clickSpeedAward()) {
      doTask(force)
      let hadAward = false
      if (doCollectAll()) {
        debugInfo('全部领取点击完毕')
        sleep(1000)
        hadAward = true
      }
      if (!force && !hadAward) {
        debugInfo('已经没有可领取的加速产豆了 设置今日不再执行')
        commonFunctions.setSpeedUpCollected()
      }
      automator.click(config.device_width / 2, config.device_height * 0.1)
      sleep(1000)
    } else {
      LogFloaty.pushLog('未找到加速产豆')
      sleep(1000)
    }
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
    LogFloaty.pushLog('重新打开新村触发领取')
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
      config.killAppWithGesture = true
      commonFunctions.killCurrentApp()
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

  function clickSpeedAward () {

    let screen = commonFunctions.captureScreen()
    let point = openCvUtil.findByGrayBase64(screen, villageConfig.speed_award)
    if (!point && localOcr.enabled) {
      debugInfo(['尝试OCR识别 加速产豆'])
      let ocrResult = localOcr.recognizeWithBounds(screen, null, '加速产豆')
      if (ocrResult && ocrResult.length > 0) {
        point = ocrResult[0].bounds
      }
    }
    if (point) {
      yoloTrainHelper.saveImage(screen, '有加速产豆')
      FloatyInstance.setFloatyInfo({ x: point.centerX(), y: point.centerY() }, '加速产豆')
      sleep(1000)
      automator.click(point.centerX(), point.centerY())
      sleep(1000)
      return true
    }
  }

  let taskTitleList = ['会员签到', '芭芭农场', '饿了么', '余额宝', '喂小羊', '听听TA的故事', '神奇海洋']
  let justBackList = ['听听TA的故事']
  function doTask (force) {
    let toFinishList = widgetUtils.widgetGetAll('去完成') || []
    let currnetType = null
    toFinishList = toFinishList.filter(v => {
      let index = v.indexInParent()
      if (index < 2) {
        return
      }
      let parent = v.parent()
      let titleContainer = parent.child(index - 2)
      let title = titleContainer.text()
      for (let i = 0; i < taskTitleList.length; i++) {
        if (title.indexOf(taskTitleList[i]) > -1) {
          currnetType = taskTitleList[i]
          return true
        }
      }
      return false
    })
    if (toFinishList.length > 0) {
      let toFinishBtn = toFinishList[0]
      toFinishBtn.click()
      LogFloaty.pushLog('等待界面加载')
      if (justBackList.indexOf(currnetType) > -1) {
        sleep(5000)
        back()
        sleep(1000)
      } else {
        sleep(10000)
        commonFunctions.minimize()
        reopenAndCheckSpeedAward()
      }
      return doTask(force)
    }
    return false
  }

  this.speedAward = speedAward
  this.waitForLoading = waitForLoading
  this.doTask = doTask
}

module.exports = new VillageRunner()