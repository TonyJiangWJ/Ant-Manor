let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let FileUtils = singletonRequire('FileUtils')
let openCvUtil = require('../lib/OpenCvUtil.js')
let FloatyInstance = singletonRequire('FloatyUtil')
let paddleOcr = singletonRequire('PaddleOcrUtil')
FloatyInstance.enableLog()
commonFunctions.requestScreenCaptureOrRestart()

let imgConfigs = config.viliage_config
// 摆摊摊位框选 带文字
imgConfigs.booth_position_left = imgConfigs.booth_position_left || [193, 1659, 436, 376]
imgConfigs.booth_position_right = imgConfigs.booth_position_right || [629, 1527, 386, 282]
function VillageRunner () {
  this.exec = function () {
    openMyViliage()
    sleep(1000)
    // 自动点击自己的能量豆
    automator.click(610, 940)
    sleep(500)
    checkAnyEmptyBooth()
    checkMyBooth()
    // 设置2小时后启动
    commonFunctions.setUpAutoStart(120)
  }

  function openMyViliage () {
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=68687809',
      packageName: 'com.eg.android.AlipayGphone'
    })
    waitForLoading()
  }

  function waitForLoading () {
    let screen = commonFunctions.captureScreen()
    let findPoint = openCvUtil.findByGrayBase64(screen, imgConfigs.checking_mail_box)
    let limit = 3
    while (limit-- > 0 && !findPoint) {
      sleep(1000)
      screen = commonFunctions.captureScreen()
      findPoint = openCvUtil.findByGrayBase64(screen, imgConfigs.checking_mail_box)
    }
    if (!!findPoint) {
      FloatyInstance.setFloatyInfo({x: findPoint.centerX(), y: findPoint.centerY()}, '打开蚂蚁新村成功')
    } else {
      errorInfo('打开蚂蚁新村失败', true)
    }
  }
  
  /**
   * 查找空位，邀请好友摆摊
   */
  function checkAnyEmptyBooth (notCheckDrive) {
    let screen = commonFunctions.captureScreen()
    let point = openCvUtil.findByGrayBase64(screen, imgConfigs.empty_booth)
    if (point) {
      FloatyInstance.setFloatyInfo({x: point.centerX(), y: point.centerY()}, '有空位')
      sleep(1000)
      inviteFriend(point)
      sleep(1000)
      checkAnyEmptyBooth(notCheckDrive)
    } else {
      if (notCheckDrive) {
        // 第二次进入时无需继续检测超时
        return
      }
      warnInfo('无空位', true)
      let haveDriveOut = false
      // 移除超过一定时间的好友摊位
      haveDriveOut |= doCheckAndDriveOut(screen, imgConfigs.booth_position_left)
      haveDriveOut |= doCheckAndDriveOut(screen, imgConfigs.booth_position_right)
      sleep(1000)
      if (haveDriveOut) {
        checkAnyEmptyBooth(true)
      }
    }
  }

  /**
   * 校验并驱赶
   * @param {ImageWrapper} screen 
   * @param {array: [left, top, width, height]} region 
   */
  function doCheckAndDriveOut(screen, region) {
    if (!paddleOcr.enabled) {
      warnInfo('paddleOcr初始化失败 或者当前版本AutoJs不支持PaddleOcr')
      return
    }
    let recognizeText = paddleOcr.recognize(screen, region)
    debugInfo(['识别文本：{}', recognizeText])
    let regex = /.*(已停产|[2-6]时(\d+)分钟)/
    if (regex.test(recognizeText)) {
      FloatyInstance.setFloatyInfo({x: region[0], y: region[1]}, '摊位超时：' + recognizeText)
      sleep(1000)
      var r = new org.opencv.core.Rect(region[0], region[1], region[2], region[3])
      automator.click(r.x + r.width / 2, r.y + r.height / 2)
      let checking = widgetUtils.widgetWaiting(/收取\d+.*并请走.*/, null, 3000)
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
    }
    return false
  }
  
  /**
   * 邀请好友
   * 
   * @param {object} matchResult 
   */
  function inviteFriend (matchResult) {
    FloatyInstance.setFloatyInfo({x: matchResult.centerX(), y: matchResult.centerY()}, '邀请好友')
    sleep(1000)
    automator.click(matchResult.centerX(), matchResult.centerY())
    widgetUtils.widgetWaiting('邀请好友来摆摊', null, 3000)
    let inviteButton = widgetUtils.widgetGetOne('直接邀请摆摊')
    if (inviteButton) {
      inviteButton.click()
    } else {
      warnInfo('无可邀请好友', true)
      automator.back()
    }
    logInfo('邀请完成', true)
  }
  
  /**
   * 检查我的摊位
   * 
   * 1 回收超过2小时的摊位
   * 2 将闲置摊位进行摆放
   */
  function checkMyBooth () {
    let screen = commonFunctions.captureScreen()
    let point = openCvUtil.findByGrayBase64(screen, imgConfigs.my_booth)
    if (point) {
      FloatyInstance.setFloatyInfo({x: point.centerX(), y: point.centerY()}, '找到了我的小摊按钮')
      sleep(500)
      automator.click(point.centerX(), point.centerY())
      sleep(500)
      widgetUtils.widgetWaiting('我的摊位', null, 3000)
      recycleBoothIfNeeded()
      sleep(500)
      setupBooth()
    } else {
      warnInfo('未找到我的小摊', true)
    }
  }
  
  /**
   * 回收超过2小时的摊位
   */
  function recycleBoothIfNeeded () {
    FloatyInstance.setFloatyText('查找超过2小时或已停产的摊位')
    let over2 = /[2-6]时(\d+)分钟/
    let stopped = /已停产/
    let checkResult = widgetUtils.alternativeWidget(over2, stopped, null, true)
    if (checkResult.value == 1) {
      logInfo('找到了超过2小时的摊位', true)
      let over2hours = checkResult.target
      if (over2hours) {
        let container = over2hours.parent()
        let collector = container.child(7).child(1)
        doRecycleBooth(collector)
      }
      return
    } else if (checkResult.value == 2) {
      logInfo('找到了已停产的摊位', true)
      let ended = checkResult.target
      if (ended) {
        let container = ended.parent()
        let collector = container.child(6).child(1)
        doRecycleBooth(collector)
      }
      return
    }
    FloatyInstance.setFloatyText('无超过2小时或已停产的摊位')
    sleep(1000)
  }
  
  function doRecycleBooth(collector) {
    collector.click()
    sleep(500)
    let confirm = widgetUtils.widgetGetOne('确认收摊')
    if (confirm) {
      confirm.click()
      sleep(1000)
      recycleBoothIfNeeded()
    }
  }

  /**
   * 闲置摊位摆放
   */
  function setupBooth () {
    FloatyInstance.setFloatyText('查找去摆摊')
    let setupButton = widgetUtils.widgetGetOne('去摆摊')
    if (setupButton) {
      setupButton.click()
      sleep(500)
      checkFriendsVillage()
    }
  }
  
  /**
   * 检查好友列表 点击有空位的位置
   * TODO 按收益优先级排序
   */
  function checkFriendsVillage () {
    widgetUtils.widgetWaiting('去好友家摆摊', null, 3000)
    sleep(1000)
    let emptyBooth = widgetUtils.widgetGetOne('有空位')
    if (emptyBooth) {
      emptyBooth.click()
      waitForLoading()
      if (setupToEmptyBooth()) {
        checkFriendsVillage()
      } else {
        logInfo('摆摊完毕', true)
      }
    }
  }
  
  /**
   * 判断好友小村里面是否有空位 有则点击摆摊
   * 
   * @returns 是否完成摆摊 是的话继续去下一个好友村庄检测
   */
  function setupToEmptyBooth () {
    let screen = commonFunctions.captureScreen()
    let point = openCvUtil.findByGrayBase64(screen, imgConfigs.empty_booth)
    if (point) {
      FloatyInstance.setFloatyInfo({x: point.centerX(), y: point.centerY()}, '有空位')
      sleep(1000)
      automator.click(point.centerX(), point.centerY())
      widgetUtils.widgetWaiting('我的摊位', null, 3000)
      sleep(500)
      return doSetupBooth()
    } else {
      logInfo('无空位', true)
      return false
    }
  }
  
  /**
   * 点击我的小摊去摆摊
   * 
   * @returns 是否有去摆摊按钮 有则继续摆摊
   */
  function doSetupBooth () {
    let setupButton = widgetUtils.widgetGetAll('去摆摊')
    if (setupButton && setupButton.length > 0) {
      setupButton[0].click()
      sleep(1000)
      automator.back()
      return setupButton.length > 1
    } else {
      return false
    }
  }
}

module.exports = new VillageRunner()