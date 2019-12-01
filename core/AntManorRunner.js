importClass(android.content.Context)
importClass(android.provider.Settings)
let {
  _logInfo, _debugInfo, _warnInfo, _infoLog, _errorInfo
} = typeof logInfo === 'undefined' ? (() => {
  let { logInfo, debugInfo, warnInfo, infoLog, errorInfo } = require('../lib/LogUtils.js')
  debugInfo('Runner重新载入日志方法')
  return {
    _logInfo: logInfo,
    _debugInfo: debugInfo,
    _warnInfo: warnInfo,
    _infoLog: infoLog,
    _errorInfo: errorInfo
  }
})() : {
      _logInfo: logInfo,
      _debugInfo: debugInfo,
      _warnInfo: warnInfo,
      _infoLog: infoLog,
      _errorInfo: errorInfo
    }
let _runningQueueDispatcher = typeof runningQueueDispatcher === 'undefined' ?
  (() => {
    let { runningQueueDispatcher } = require('../lib/RunningQueueDispatcher.js')
    return runningQueueDispatcher
  })() : runningQueueDispatcher
let _commonFunctions = typeof commonFunctions === 'undefined' ?
  (() => {
    _debugInfo('Runner重新载入commonFunctions')
    let { commonFunctions } = require('../lib/CommonFunction.js')
    return commonFunctions
  })() : commonFunctions

const WIDTH = device.width
const HEIGHT = device.height

const widthRate = WIDTH / 1080
const heightRate = HEIGHT / 2160


const default_chick_config = {
  CHECK_APP_COLOR: '#f1381a',
  CHECK_FRIENDS_COLOR: '#429beb',
  THIEF_COLOR: '#000000',
  PUNCH_COLOR: '#f35458',
  OUT_COLOR: '#c37a3e',
  OUT_IN_FRIENDS_COLOR: '#e9ca02',
  DISMISS_COLOR: '#f9622f',
  FOOD_COLOR: '#ffcf00',
  SPEED_CHECK_COLOR: '#ffd000',

  CHECK_APP_REGION: [320, 280, 10, 10],
  CHECK_FRIENDS_REGION: [120, 490, 10, 10],
  OUT_REGION: [400, 1200, 50, 50],
  OUT_IN_FRIENDS_REGION_RIGHT: [800, 1350, 50, 50],
  OUT_IN_FRIENDS_REGION_LEFT: [340, 1350, 50, 50],
  LEFT_THIEF_REGION: [310, 1510, 10, 10],
  LEFT_PUNCH_REGION: [500, 1350, 100, 100],
  RIGHT_THIEF_REGION: [930, 1510, 10, 10],
  RIGHT_PUNCH_REGION: [980, 1350, 100, 100],
  DISMISS_REGION: [450, 1890, 10, 10],
  FOOD_REGION: [850, 1700, 10, 10],
  SPEED_CHECK_REGION: [480, 1520, 10, 10],
  FEED_POSITION: {
    x: 930,
    y: 1960
  },
  TOOL_POSITION: {
    x: 960,
    y: 645
  },
  SPEED_CARD_POSITION: {
    x: 191,
    y: 1450
  },
  CONFIRM_POSITON: {
    x: 720,
    y: 1320
  }
}
let chick_config = {}
Object.keys(default_chick_config).forEach(key => {
  let val = default_chick_config[key]
  if (typeof val === 'undefined') {
    return
  }
  if (typeof val === 'string') {
    chick_config[key] = val
  } else if (Object.prototype.toString.call(val) === '[object Array]') {
    let newArrayConfig = [
      parseInt(val[0] * widthRate),
      parseInt(val[1] * heightRate),
      parseInt(val[2] * widthRate),
      parseInt(val[3] * heightRate)
    ]
    chick_config[key] = newArrayConfig
  } else if (val.x) {
    chick_config[key] = {
      x: parseInt(val.x * widthRate),
      y: parseInt(val.y * heightRate)
    }
  } else {
    chick_config[key] = val
  }
})
console.verbose('转换后配置：' + JSON.stringify(chick_config))

function AntManorRunner () {

  this.floatyWindow = null
  this.floatyLock = null
  this.floatyCondition = null
  this.floatyInitialized = false

  this.init = function () {
    if (!this.checkAccessibilityService(true)) {
      try {
        auto.waitFor()
      } catch (e) {
        auto()
      }
    }
    this.floatyWindow = null
    this.floatyLock = threads.lock()
    this.floatyCondition = this.floatyLock.newCondition()
    this.floatyInitialized = false
    this.initFloaty()
  }

  this.initFloaty = function () {
    let _this = this
    threads.start(function () {
      sleep(400)
      if (_this.floatyWindow === null) {
        _this.floatyLock.lock()
        _this.floatyWindow = floaty.rawWindow(
          <frame gravity="left">
            <text id="content" textSize="8dp" textColor="#00ff00" />
          </frame>
        )
        _this.floatyWindow.setTouchable(false)
        _this.floatyWindow.setPosition(500, 1500)
        _this.floatyWindow.content.text('初始化成功')
        _this.floatyInitialized = true
        _this.floatyCondition.signalAll()
        _this.floatyLock.unlock()
      }
    })
    this.waitUntilFloatyInitialized()
  }

  this.waitUntilFloatyInitialized = function () {
    this.floatyLock.lock()
    while (!this.floatyInitialized) {
      this.floatyCondition.await()
      sleep(10)
    }
    log('悬浮窗初始化成功')
    this.floatyLock.unlock()
  }

  this.setFloatyTextColor = function (colorStr) {
    let colorInt = colors.parseColor(colorStr)
    if (colorInt !== null) {
      let _this = this
      ui.run(function () {
        _this.floatyLock.lock()
        _this.floatyWindow.content.setTextColor(colorInt)
        _this.floatyLock.unlock()
      })
    }
  }

  this.setFloatyInfo = function (position, text) {
    let _this = this
    ui.run(function () {
      _this.floatyLock.lock()
      if (position) {
        _this.floatyWindow.setPosition(parseInt(position.x), parseInt(position.y))
      }
      if (text) {
        _debugInfo(text + (position ? ' p:' + JSON.stringify(position) : ''))
        _this.floatyWindow.content.text(text)
      }
      _this.floatyLock.unlock()
    })
  }

  this.launchApp = function () {
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=66666674',
      packageName: 'com.eg.android.AlipayGphone'
    })
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
        threshold: threshold || 4
      })
    } while (!findColor && timeoutCount-- > 0)
    return findColor
  }

  this.killAndRestart = function () {
    _commonFunctions.killCurrentApp()
    _commonFunctions.setUpAutoStart(1)
    _runningQueueDispatcher.removeRunningTask()
    exit()
  }

  this.waitForOwn = function () {
    let findColor = this.waitFor(chick_config.CHECK_APP_COLOR, chick_config.CHECK_APP_REGION)
    if (findColor) {
      this.setFloatyInfo(null, '进入个人鸡鸡页面成功')
      return true
    } else {
      this.setFloatyTextColor('#ff0000')
      this.setFloatyInfo(null, '进入个人鸡鸡页面失败，检测超时')
      this.killAndRestart()
    }
  }


  this.waitForFriends = function () {
    let findColor = this.waitFor(chick_config.CHECK_FRIENDS_COLOR, chick_config.CHECK_FRIENDS_REGION)
    if (findColor) {
      this.setFloatyInfo(null, '进入好友鸡鸡页面成功')
      return true
    } else {
      this.setFloatyTextColor('#ff0000')
      this.setFloatyInfo(null, '进入好友鸡鸡页面失败，检测超时')
      this.killAndRestart()
    }
  }

  this.waitForDismiss = function () {
    let findColor = this.waitFor(chick_config.DISMISS_COLOR, chick_config.DISMISS_REGION)
    if (findColor) {
      this.setFloatyInfo(findColor, '找到了关闭按钮')
      click(findColor.x, findColor.y)
    } else {
      this.setFloatyInfo(null, '没找到关闭按钮，奇了怪了')
    }
  }

  this.checkIsOut = function () {
    let img = _commonFunctions.checkCaptureScreenPermission()
    let findColor = images.findColor(img, chick_config.OUT_COLOR, {
      region: chick_config.OUT_REGION,
      threshold: 10
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
      findColor = images.findColor(img, chick_config.OUT_IN_FRIENDS_COLOR, {
        region: chick_config.OUT_IN_FRIENDS_REGION_LEFT,
        threshold: 10
      })
      if (!findColor) {
        findColor = images.findColor(img, chick_config.OUT_IN_FRIENDS_COLOR, {
          region: chick_config.OUT_IN_FRIENDS_REGION_RIGHT,
          threshold: 10
        })
      }

      if (findColor) {
        this.setFloatyInfo(findColor, '找到了我的小鸡')
        sleep(1000)
        this.setFloatyInfo({ x: findColor.x, y: findColor.y + 200 * heightRate }, '点击叫回小鸡')
        click(findColor.x, parseInt(findColor.y + 200 * heightRate))
        sleep(1000)
        this.waitForOwn()
      } else {
        this.setFloatyTextColor('#ff0000')
        this.setFloatyInfo(null, '没有找到小鸡，奇了怪了！')
        return false
      }
    }
  }

  this.checkThiefLeft = function () {
    sleep(500)
    let img = _commonFunctions.checkCaptureScreenPermission()
    let findColor = images.findColor(img, chick_config.THIEF_COLOR, {
      region: chick_config.LEFT_THIEF_REGION,
      threshold: 20
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
        punch = images.findColor(img, chick_config.PUNCH_COLOR, {
          region: chick_config.LEFT_PUNCH_REGION,
          threshold: 10
        })
      } while (!punch && count-- > 0)

      if (punch) {
        this.setFloatyTextColor(chick_config.PUNCH_COLOR)
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
      this.setFloatyInfo(null, '左边没野鸡')
    }
  }

  this.checkThiefRight = function () {
    sleep(500)
    let img = _commonFunctions.checkCaptureScreenPermission()
    let findColor = images.findColor(img, chick_config.THIEF_COLOR, {
      region: chick_config.RIGHT_THIEF_REGION,
      threshold: 20
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
        punch = images.findColor(img, chick_config.PUNCH_COLOR, {
          region: chick_config.RIGHT_PUNCH_REGION,
          threshold: 10
        })
      } while (!punch && count-- > 0)

      if (punch) {
        this.setFloatyTextColor(chick_config.PUNCH_COLOR)
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
      this.setFloatyInfo(null, '右边没野鸡')
    }
  }

  this.checkAndFeed = function () {
    sleep(500)
    let img = _commonFunctions.checkCaptureScreenPermission()
    if (img) {
      let findColor = images.findColor(img, chick_config.FOOD_COLOR, {
        region: chick_config.FOOD_REGION,
        threshold: 4
      })
      if (findColor) {
        this.setFloatyInfo(findColor, '小鸡有饭吃哦')
      } else {
        this.setFloatyTextColor('#ff0000')
        this.setFloatyInfo({ x: chick_config.FOOD_REGION[0], y: chick_config.FOOD_REGION[1] }, '小鸡没饭吃呢')
        click(chick_config.FEED_POSITION.x, chick_config.FEED_POSITION.y)
        _commonFunctions.updateSleepTime(20, true)
        if (config.useSpeedCard) {
          this.useSpeedCard()
        }
      }
      if (config.useSpeedCard && this.checkSpeedSuccess()) {
        _commonFunctions.setSpeeded()
      } else {
        _commonFunctions.setSpeedFail()
      }
      sleep(1500)
      let sleepTime = _commonFunctions.getSleepTimeAutoCount()
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
    click(chick_config.TOOL_POSITION.x, chick_config.TOOL_POSITION.y)
    sleep(1000)
    click(chick_config.SPEED_CARD_POSITION.x, chick_config.SPEED_CARD_POSITION.y)
    sleep(1000)
    click(chick_config.CONFIRM_POSITON.x, chick_config.CONFIRM_POSITON.y)
    this.waitForOwn()
  }

  this.checkSpeedSuccess = function () {
    sleep(1000)
    let img = _commonFunctions.checkCaptureScreenPermission()
    let checkSpeedup = images.findColor(img, chick_config.SPEED_CHECK_COLOR, {
      region: chick_config.SPEED_CHECK_REGION,
      threshold: 4
    })

    if (checkSpeedup) {
      this.setFloatyInfo(checkSpeedup, "加速卡使用成功")
      return true
    } else {
      this.setFloatyTextColor('#ff0000')
      this.setFloatyInfo({ x: chick_config.SPEED_CHECK_REGION[0], y: chick_config.SPEED_CHECK_REGION[1] }, "加速卡使用失败")
      return false
    }
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

  this.start = function () {
    this.init()
    this.launchApp()
    this.setFloatyInfo(null, '打开APP成功！')
    sleep(1000)
    this.checkIsOut()
    let punchedLeft = this.checkThiefLeft()
    let punchedRight = this.checkThiefRight()
    if (punchedLeft || punchedRight) {
      // 揍过🐔直接设置300
      _commonFunctions.updateSleepTime(300)
    }

    sleep(1000)
    this.setFloatyInfo(null, '没有野鸡哦')
    this.checkAndFeed()
    sleep(5000)
    _commonFunctions.killCurrentApp()
  }



  //-------------------

  this.getAutoJsPackage = function () {
    let isPro = app.versionName.match(/[Pp]ro/)
    return 'org.autojs.autojs' + (isPro ? 'pro' : '')
  }

  this.checkAccessibilityService = function (force) {
    let packageName = this.getAutoJsPackage()
    let requiredService = packageName + '/com.stardust.autojs.core.accessibility.AccessibilityService'
    try {
      let enabledServices = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
      _debugInfo(['当前已启用无障碍功能的服务:{}', enabledServices])
      var service = null
      if (enabledServices.indexOf(requiredService) < 0) {
        service = enabledServices + ':' + requiredService
      } else if (force) {
        // 如果强制开启
        service = enabledServices
      }
      if (service) {
        Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, service)
        Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, '1')
        // infoLog('成功开启AutoJS的辅助服务', true)
      }

      return true
    } catch (e) {
      _warnInfo('\n请确保已给予 WRITE_SECURE_SETTINGS 权限\n\n授权代码已复制，请使用adb工具连接手机执行(重启不失效)\n\n', true)
      let shellScript = 'adb shell pm grant ' + packageName + ' android.permission.WRITE_SECURE_SETTINGS'
      _warnInfo('adb 脚本 已复制到剪切板：[' + shellScript + ']')
      setClip(shellScript)
      return false
    }
  }

  /**
  * eg. params '参数名：{} 参数内容：{}', name, value
  *     result '参数名：name 参数内容：value'
  * 格式化字符串，定位符{}
  */
  this.formatString = function () {
    let originContent = []
    for (let arg in arguments) {
      originContent.push(arguments[arg])
    }
    if (originContent.length === 1) {
      return originContent[0]
    }
    let marker = originContent[0]
    let args = originContent.slice(1)
    let regex = /(\{\})/g
    let matchResult = marker.match(regex)
    if (matchResult && args && matchResult.length > 0 && matchResult.length === args.length) {
      args.forEach((item, idx) => {
        marker = marker.replace('{}', item)
      })
      return marker
    } else {
      console.error('参数数量不匹配' + arguments)
      return arguments
    }
  }
}

// console.show()

module.exports = {
  manorRunner: new AntManorRunner()
}