/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-27 09:03:57
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-01-09 21:43:39
 * @Description: 通用方法
 */
importClass(android.content.Context)
importClass(android.provider.Settings)

let _config = typeof config === 'undefined' ? require('../config.js').config : config
let _storage_name = typeof storage_name === 'undefined' ? require('../config.js').storage_name : storage_name
let { formatDate } = require('./DateUtil.js')
let _runningQueueDispatcher = typeof runningQueueDispatcher === 'undefined' ?
  (() => {
    let { runningQueueDispatcher } = require('./RunningQueueDispatcher.js')
    return runningQueueDispatcher
  })() : runningQueueDispatcher
let Timers = require('./Timers.js')(runtime, this)
let {
  FileUtils
} = require('./FileUtils.js')
let _logUtils = typeof LogUtils === 'undefined' ? require('./LogUtils.js') : LogUtils

let RUNTIME_STORAGE = _storage_name + "_runtime"
let RUNNING_PACKAGE = 'runningPackage'
let TIMER_AUTO_START = "timerAutoStart"
let SLEEP_TIME = "sleepTime"
let floatyWindow = null


function CommonFunctions () {

  /**
   * 校验是否已经拥有无障碍权限 没有自动获取 前提是获取了adb权限
   * 原作者：MrChen 原始代码来自Pro商店
   * adb授权方法：开启usb调试并使用adb工具连接手机，执行 adb shell pm grant org.autojs.autojspro android.permission.WRITE_SECURE_SETTINGS
   * 取消授权 adb shell pm revoke org.autojs.autojspro android.permission.WRITE_SECURE_SETTINGS
   * 其中免费版包名为 org.autojs.autojs
   * @param {boolean} force 是否强制启用
   */
  this.checkAccessibilityService = function (force) {
    let packageName = this.getAutoJsPackage()
    let requiredService = packageName + '/com.stardust.autojs.core.accessibility.AccessibilityService'
    try {
      let enabledServices = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
      _logUtils.debugInfo(['当前已启用无障碍功能的服务:{}', enabledServices])
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
        _logUtils.infoLog('成功开启AutoJS的辅助服务', true)
      }

      return true
    } catch (e) {
      _logUtils.warnInfo('\n请确保已给予 WRITE_SECURE_SETTINGS 权限\n\n授权代码已复制，请使用adb工具连接手机执行(重启不失效)\n\n', true)
      let shellScript = 'adb shell pm grant ' + packageName + ' android.permission.WRITE_SECURE_SETTINGS'
      _logUtils.warnInfo('adb 脚本 已复制到剪切板：[' + shellScript + ']')
      setClip(shellScript)
      return false
    }
  }

  /**
   * 校验截图权限，权限失效则重新启动，不释放任务
   * @param {boolean} releaseLock 是否在失败后释放任务队列
   * @param {number} errorLimit 失败尝试次数
   */
  this.checkCaptureScreenPermission = function (releaseLock, errorLimit) {
    errorLimit = errorLimit || 3
    // 获取截图 用于判断是否可收取
    let screen = null
    let errorCount = 0
    do {
      this.waitFor(function () {
        screen = captureScreen()
      }, 500)
      if (!screen) {
        _logUtils.debugInfo('获取截图失败 再试一次 count:' + (++errorCount))
      }
    } while (!screen && errorCount < errorLimit)
    if (!screen) {
      _logUtils.errorInfo(['获取截图失败多次[{}], 可能已经没有了截图权限，重新执行脚本', errorCount], true)
      this.setUpAutoStart(0.02)
      if (releaseLock) {
        _runningQueueDispatcher.removeRunningTask(true)
      } else {
        // 用于取消下一次运行的dialog
        this.getAndUpdateSpringboard('capture-screen-error')
      }
      exit()
    }
    return screen
  }


  this.getAutoJsPackage = function () {
    let isPro = Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)
    let isModify = Object.prototype.toString.call(org.autojs.autojsm.timing.TimedTask).match(/Java(Class|Object)/)
    return 'org.autojs.autojs' + (isPro ? 'pro' : (isModify ? 'm' : ''))
  }

  this.getAndUpdateSpringboard = function (newVal) {
    let storedRunningPackage = this.getTodaysRuntimeStorage(RUNNING_PACKAGE)
    let oldVal = storedRunningPackage.beforeSpringboard
    storedRunningPackage.beforeSpringboard = newVal
    this.updateRuntimeStorage(RUNNING_PACKAGE, storedRunningPackage)
    return oldVal
  }

  this.getAndUpdateBeforeStarting = function (newVal) {
    let storedRunningPackage = this.getTodaysRuntimeStorage(RUNNING_PACKAGE)
    let oldVal = storedRunningPackage.startingPackage
    storedRunningPackage.startingPackage = newVal
    this.updateRuntimeStorage(RUNNING_PACKAGE, storedRunningPackage)
    return oldVal
  }

  /**
   * 启动autojs作为跳板，否则MIUI开发板可能会死机
   * @param reopen 是否属于重开，重开则不记录启动前package信息
   */
  this.launchAutoJs = function (reopen) {
    _logUtils.debugInfo('准备启动AutoJS作为跳板')
    sleep(1000)
    let launchPackage = this.getAutoJsPackage()
    let currentRunning = this.getExactlyCurrentPackage(reopen)

    let beforeSpringboard = ''
    if (!reopen) {
      _logUtils.debugInfo('启动跳板前所在AppPackage:' + currentRunning)
      beforeSpringboard = currentRunning
      _logUtils.debugInfo(['记录启动跳板前package：{}', beforeSpringboard])
    }
    this.getAndUpdateSpringboard(beforeSpringboard)
    if (currentRunning !== launchPackage) {
      app.launchPackage(launchPackage)
      sleep(1000)
      currentRunning = currentPackage()
      let wait = 3
      while (currentRunning !== launchPackage && wait-- > 0) {
        _logUtils.debugInfo(['未进入AutoJS，继续等待 当前package：{}', currentRunning])
        sleep(1000)
      }
    }

  }


  /**
   * 启动package
   * @param packageName 需要启动的package名称
   * @param reopen 是否属于重开，重开则不记录启动前package信息
   */
  this.launchPackage = function (packageName, reopen) {
    _logUtils.debugInfo(['准备{}打开package: {}', reopen ? '重新' : '', packageName])
    let currentRunning = currentPackage()
    let storedRunningPackage = this.getTodaysRuntimeStorage(RUNNING_PACKAGE)
    let beforeSpringboard = storedRunningPackage.beforeSpringboard
    if (!reopen) {
      _logUtils.debugInfo(['启动:{}前所在package: {} 已记录的启动跳板前package: {}', packageName, currentRunning, beforeSpringboard])
    }
    app.launchPackage(packageName)
    sleep(1000)
    currentRunning = currentPackage()
    let waitCount = 3
    while (currentRunning !== packageName && waitCount-- > 0) {
      _logUtils.debugInfo(['未进入{}，继续等待 当前所在：{}', packageName, currentRunning])
      sleep(1000)
      currentRunning = currentPackage()
    }
    _logUtils.debugInfo(['进入[{}] {}', packageName, (packageName === currentRunning ? '成功' : '失败')])
  }

  this.reopenPackageBeforeRunning = function () {
    let _this = this
    threads.start(function () {
      let { startingPackage, beforeSpringboard } = _this.showPackageBeforeRunning()
      // 当启动前启动了跳板，且启动前包名不为AutoJs是 通过launchPackage打开，否则直接通过返回打开
      if (startingPackage !== _this.getAutoJsPackage() && _this.isNotEmpty(beforeSpringboard)) {
        if (startingPackage.match(/(com.android)|(system)|(home)|(theme)|(autojs)/)) {
          _logUtils.debugInfo(['读取到的package[{}] 在黑名单中，直接返回', startingPackage])
          home()
          return
        }

        let warningDialog = dialogs.build({
          title: '正在重新打开APP，请稍等...',
          content: '目标package：' + startingPackage,
          cancelable: false
        }).show()
        sleep(500)
        if (_config.fuck_miui11) {
          _this.launchAutoJs(true)
        }
        _logUtils.debugInfo(['重新打开：{}', startingPackage])
        _this.launchPackage(startingPackage, true)
        sleep(500)
        warningDialog.dismiss()
      } else {
        _logUtils.debugInfo(['直接返回桌面'])
        home()
      }
    })
  }

  this.showPackageBeforeRunning = function () {
    let storedRunningPackage = this.getTodaysRuntimeStorage(RUNNING_PACKAGE)
    let beforeSpringboard = this.getAndUpdateSpringboard('')
    _logUtils.debugInfo(['启动跳板前package: {} 开始蚂蚁森林前package: {}', beforeSpringboard, storedRunningPackage.startingPackage])
    return { startingPackage: storedRunningPackage.startingPackage, beforeSpringboard: beforeSpringboard }
  }


  this.getExactlyCurrentPackage = function (reopen) {
    let runningPackage = currentPackage()
    if (_config.fuck_miui11 && !reopen) {
      // miui 经常没法获取到正确的package 打开最近任务并返回多次 可能会拿到
      let tryTime = 2
      while (runningPackage.match(/(com.android)|(systemui)|(baidu.input)|(autojs)/) && tryTime-- > 0) {
        recents()
        sleep(500)
        back()
        sleep(500)
        runningPackage = currentPackage()
      }
      if (tryTime < 2) {
        sleep(1000)
      }
    }
    return runningPackage
  }
  /**
   * 记录启动前所在的app
   */
  this.recordCurrentPackage = function () {
    let beforeSpringboard = this.getAndUpdateSpringboard('')
    if (beforeSpringboard) {
      this.getAndUpdateSpringboard(beforeSpringboard)
      this.getAndUpdateBeforeStarting(beforeSpringboard)
      _logUtils.debugInfo('维持重新打开的package为跳板前数据：' + beforeSpringboard)
    } else {
      sleep(500)
      let currentRunning = this.getExactlyCurrentPackage()
      _logUtils.debugInfo(['启动前所在package：{} 已记录的跳板前package：{}', currentRunning, beforeSpringboard])
      this.getAndUpdateSpringboard(beforeSpringboard)
      this.getAndUpdateBeforeStarting(currentRunning)
      _logUtils.debugInfo('更新重新打开的package为当前启动前数据：' + currentRunning)
    }
  }

  /**
   * @param checkSpringboard 是否校验是否在跳板前展示过
   */
  this.showDialogAndWait = function (checkedSpringboard) {
    if (checkedSpringboard) {
      let storedRunningPackage = this.getTodaysRuntimeStorage(RUNNING_PACKAGE)
      if (storedRunningPackage.beforeSpringboard) {
        _logUtils.debugInfo(['跳转跳板已经提示过，不再展示延迟对话框，跳板前package：{}', storedRunningPackage.beforeSpringboard])
        return
      }
    }

    let continueRunning = true
    let terminate = false
    let showDialog = true
    let lock = threads.lock()
    let complete = lock.newCondition()

    lock.lock()
    threads.start(function () {

      let sleepCount = (_config.delayStartTime || 5000) / 1000
      let confirmDialog = dialogs.build({
        title: '即将开始喂小鸡',
        content: '将在' + sleepCount + '秒内开始',
        positive: '立即开始',
        positiveColor: '#f9a01c',
        negative: '终止',
        negativeColor: 'red',
        neutral: '延迟五分钟',
        cancelable: false
      })
        .on('positive', () => {
          lock.lock()
          complete.signal()
          lock.unlock()
          showDialog = false
          confirmDialog.dismiss()
        })
        .on('negative', () => {
          continueRunning = false
          terminate = true
          lock.lock()
          complete.signal()
          lock.unlock()
          showDialog = false
          confirmDialog.dismiss()
        })
        .on('neutral', () => {
          continueRunning = false
          lock.lock()
          complete.signal()
          lock.unlock()
          showDialog = false
          confirmDialog.dismiss()
        })
        .show()

      while (sleepCount-- > 0 && showDialog) {
        sleep(1000)
        confirmDialog.setContent('将在' + sleepCount + '秒内开始')
      }
      confirmDialog.setContent('即将开始...')
      sleep(500)
      lock.lock()
      complete.signal()
      lock.unlock()
      confirmDialog.dismiss()
    })
    complete.await()
    lock.unlock()
    if (terminate) {
      _logUtils.warnInfo('中止执行')
      this.cancelAllTimedTasks()
      _runningQueueDispatcher.removeRunningTask()
      exit()
    }
    if (continueRunning) {
      _logUtils.logInfo('立即开始')
    } else {
      _logUtils.logInfo('延迟五分钟后开始')
      this.setUpAutoStart(5)
      _runningQueueDispatcher.removeRunningTask()
      exit()
    }
  }

  /**
   * 关闭悬浮窗并将floatyWindow置为空，在下一次显示时重新新建悬浮窗 因为close之后的无法再次显示
   */
  this.closeFloatyWindow = function () {
    floaty.closeAll()
    floatyWindow = null
  }

  /**
   * 显示mini悬浮窗
   */
  this.showMiniFloaty = function (text, x, y, color) {
    let _this = this
    threads.start(function () {
      // todo 删除日志
      let initialize = false
      if (_this.isEmpty(floatyWindow)) {
        initialize = true
        _logUtils.debugInfo('准备展示悬浮窗')
        try {
          sleep(1500)
          floatyWindow = floaty.rawWindow(
            <frame gravity="left">
              <text id="content" textSize="8dp" textColor="#00ff00" />
            </frame>
          )
          let floaty_x = x || _config.min_floaty_x || 150
          let floaty_y = y || _config.min_floaty_y || 20
          floatyWindow.setPosition(parseInt(floaty_x), parseInt(floaty_y))
          _logUtils.debugInfo('设置悬浮窗位置完毕： textColor:' + floatyWindow.content.textColor)
        } catch (e) {
          _logUtils.errorInfo('创建悬浮窗异常' + e)
        }
        sleep(500)
      }
      if (initialize) {
        _logUtils.debugInfo('准备设置悬浮窗文字')
      }
      ui.run(function () {
        let floatyColor = color || _config.min_floaty_color || '#00FF00'
        floatyWindow.content.setTextColor(android.graphics.Color.parseColor(floatyColor))
        floatyWindow.content.text(text)
        if (initialize) {
          _logUtils.debugInfo('悬浮窗功能执行完毕:' + text)
        }
      })

      if (color) {
        setTimeout(() => {
          floatyWindow.close()
          floatyWindow = null
        }, 5000)
      }
    })
  }

  this.commonDelay = function (minutes, text) {
    _logUtils.debugInfo('倒计时' + minutes)
    if (typeof text === 'undefined' || text === '') {
      text = '距离下次运行还有['
    }

    minutes = typeof minutes != null ? minutes : 0
    if (minutes === 0) {
      return
    }
    let startTime = new Date().getTime()
    let timestampGap = minutes * 60000
    let i = 0
    let delayLogStampPoint = -1
    let delayLogGap = 0
    let showSeconds = false
    for (; ;) {
      let now = new Date().getTime()
      if (now - startTime > timestampGap) {
        break
      }
      i = (now - startTime) / 60000
      let left = minutes - i
      if (!showSeconds) {
        delayLogGap = i - delayLogStampPoint
        // 半分钟打印一次日志
        if (delayLogGap >= 0.5) {
          delayLogStampPoint = i
          let content = this.formatString('{}{}]分', text, left.toFixed(2))
          this.showTextFloaty(content)
          _logUtils.debugInfo(content)
        }
        // 剩余一分钟时显示为秒
        if (showSeconds === false && left <= 1) {
          this.listenDelayCollect()
          showSeconds = true
        }
        sleep(500)
      } else {
        let content = this.formatString('{}{}]秒', text, (left * 60).toFixed(0))
        this.showTextFloaty(content)
        sleep(1000)
      }
    }
  }

  this.isEmpty = function (val) {
    return val === null || typeof val === 'undefined' || val === ''
  }

  this.isEmptyArray = function (array) {
    return array === null || typeof array === 'undefined' || array.length === 0
  }

  this.isNotEmpty = function (val) {
    return !this.isEmpty(val) && !this.isEmptyArray(val)
  }

  this.addOpenPlacehold = function (content) {
    content = "<<<<<<<" + (content || "") + ">>>>>>>"
    _appendLog(content)
    console.verbose(content)
  }

  this.addClosePlacehold = function (content) {
    content = ">>>>>>>" + (content || "") + "<<<<<<<"
    _appendLog(content)
    console.verbose(content)
  }

  /**
   * 校验是否重复运行 如果重复运行则关闭当前脚本
   */
  this.checkDuplicateRunning = function () {
    let currentEngine = engines.myEngine()
    let runningEngines = engines.all()
    let runningSize = runningEngines.length
    let currentSource = currentEngine.getSource() + ''
    _logUtils.debugInfo('当前脚本信息 id:' + currentEngine.id + ' source:' + currentSource + ' 运行中脚本数量：' + runningSize)
    if (runningSize > 1) {
      runningEngines.forEach(engine => {
        let compareEngine = engine
        let compareSource = compareEngine.getSource() + ''
        _logUtils.debugInfo('对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource)
        if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
          _logUtils.warnInfo('脚本正在运行中 退出当前脚本：' + currentSource, true)
          _runningQueueDispatcher.removeRunningTask(true)
          engines.myEngine().forceStop()
          exit()
        }
      })
    }
  }

  /**
   * 关闭运行中的脚本
   */
  this.killRunningScript = function () {
    let runningEngines = engines.all()
    let runningSize = runningEngines.length
    let mainScriptJs = FileUtils.getRealMainScriptPath()
    if (runningSize > 1) {
      runningEngines.forEach(engine => {
        let compareEngine = engine
        let compareSource = compareEngine.getSource() + ''
        _logUtils.debugInfo('对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource)
        if (compareSource === mainScriptJs) {
          _logUtils.warnInfo(['关闭运行中脚本：id[{}]', compareEngine.id], true)
          engine.forceStop()
        }
      })
    }
  }

  /**
   * 先返回当前睡眠时间，然后再更新睡眠时间数据
   */
  this.getSleepTimeAutoCount = function () {
    let sleepStorage = this.getTodaysRuntimeStorage(SLEEP_TIME)
    let recheckTime = _config.recheckTime || 5
    let returnVal = sleepStorage.sleepTime || recheckTime
    let speeded = sleepStorage.speeded
    sleepStorage.count = (sleepStorage.count || 0) + 1
    let passedCount = sleepStorage.count - 1
    let fullTime = speeded ? 240 : 300
    // 经过的时间 单位分
    let passedTime = (new Date().getTime() - sleepStorage.startTime) / 60000
    // 第一次喂食后 睡眠20分钟，然后循环多次 直到赶走了野鸡或者超时
    if (passedCount === 0) {
      // 后面循环睡眠
      sleepStorage.sleepTime = recheckTime
    } else if (returnVal >= 300 || passedTime <= fullTime && passedTime >= 40) {
      // 揍过鸡后会设置为300 此时重新计算具体时间
      // or
      // 经过了超过40分钟 而且此时没有野鸡来 开始睡眠更久不再检测小鸡
      returnVal = parseInt(fullTime + _config.windowTime - passedTime)
    } else if (passedTime > fullTime) {
      // 300分钟以上的 直接循环等待 理论上不会进到这一步 300分钟以上已经没饭吃了
      returnVal = recheckTime
    }
    sleepStorage.sleepTime = recheckTime
    this.updateRuntimeStorage(SLEEP_TIME, sleepStorage)
    return returnVal
  }

  this.getSleepTime = function () {
    let sleepStorage = this.getTodaysRuntimeStorage(SLEEP_TIME)
    return sleepStorage.sleepTime || 10
  }

  this.getSleepStorage = function () {
    return this.getTodaysRuntimeStorage(SLEEP_TIME)
  }

  /**
   * @param {number} sleepTime 下一次获取到需要睡眠的时间 单位分
   * @param {boolean} resetCount
   */
  this.updateSleepTime = function (sleepTime, resetCount) {
    let currentSleepTime = this.getTodaysRuntimeStorage(SLEEP_TIME)
    currentSleepTime.sleepTime = sleepTime || 10
    if (resetCount) {
      currentSleepTime.count = 0
      currentSleepTime.startTime = new Date().getTime()
    }
    this.updateRuntimeStorage(SLEEP_TIME, currentSleepTime)
  }

  this.setSpeeded = function () {
    let currentSleepTime = this.getTodaysRuntimeStorage(SLEEP_TIME)
    currentSleepTime.speeded = true
    this.updateRuntimeStorage(SLEEP_TIME, currentSleepTime)
  }

  this.setSpeedFail = function () {
    let currentSleepTime = this.getTodaysRuntimeStorage(SLEEP_TIME)
    currentSleepTime.speeded = false
    this.updateRuntimeStorage(SLEEP_TIME, currentSleepTime)
  }

  this.showRuntimeStatus = function () {
    console.log('自动定时任务：' + JSON.stringify(this.getTodaysRuntimeStorage(TIMER_AUTO_START)))
    console.log('睡眠时间：' + JSON.stringify(this.getTodaysRuntimeStorage(SLEEP_TIME)))
  }

  /**
   * 将当日运行时数据导出
   */
  this.exportRuntimeStorage = function () {
    let runtimeStorageInfo = {
      storageName: RUNTIME_STORAGE,
      storeList: []
    }
    let keyList = [TIMER_AUTO_START, SLEEP_TIME]
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    keyList.forEach(key => {
      let storageStr = runtimeStorages.get(key)
      _logUtils.debugInfo(['导出运行数据 key「{}」value 「{}」', key, storageStr])
      runtimeStorageInfo.storeList.push({
        key: key,
        storageStr: storageStr
      })
    })
    _logUtils.infoLog('运行时数据导出成功', true)
    return JSON.stringify(runtimeStorageInfo)
  }

  /**
   * 导入并覆盖当日运行时数据
   */
  this.importRuntimeStorage = function (str) {
    let runtimeStorageInfo = JSON.parse(str)
    if (runtimeStorageInfo && runtimeStorageInfo.storageName && runtimeStorageInfo.storeList && runtimeStorageInfo.storeList.length > 0) {
      let runtimeStorages = storages.create(runtimeStorageInfo.storageName)
      runtimeStorageInfo.storeList.forEach(r => {
        _logUtils.debugInfo(['导入运行数据 key「{}」value 「{}」', r.key, r.storageStr])
        runtimeStorages.put(r.key, r.storageStr)
      })
      _logUtils.infoLog('运行时数据导入成功', true)
      return true
    }
    return false
  }

  /**
   * 获取当天的缓存信息，不存在时创建一个初始值
   * @param key {String} key名称
   */
  this.getTodaysRuntimeStorage = function (key) {
    // 小鸡并不需要当日，脚本会跨日期运行
    let today = 'every-day'
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    let existStoreObjStr = runtimeStorages.get(key)
    let returnVal = null
    if (existStoreObjStr) {
      try {
        let existStoreObj = JSON.parse(existStoreObjStr)
        if (existStoreObj.date === today) {
          returnVal = existStoreObj
        }
      } catch (e) {
        _logUtils.debugInfo(["解析JSON数据失败, key:{} value:{} error:{}", key, existStoreObjStr, e])
      }
    }
    if (returnVal === null) {
      returnVal = this.createTargetStore(key, today)
    }
    _logUtils.debugInfo('获取缓存数据：' + JSON.stringify(returnVal))
    return returnVal
  }


  /**
   * 通用更新缓存方法
   * @param key {String} key值名称
   * @param valObj {Object} 存值对象
   */
  this.updateRuntimeStorage = function (key, valObj) {
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(key, JSON.stringify(valObj))
  }


  /**
   * 根据传入key创建当日缓存
   */
  this.createTargetStore = function (key, today) {
    if (key === RUNNING_PACKAGE) {
      return this.createRunningPackage(today)
    } else if (key === SLEEP_TIME) {
      return this.createSleepTime(today)
    }
  }

  this.createSleepTime = function (today) {
    let initSleepTime = {
      sleepTime: 10,
      count: 0,
      startTime: new Date().getTime(),
      date: today
    }
    let runtimeStorages = storages.create(RUNNING_PACKAGE)
    runtimeStorages.put(SLEEP_TIME, JSON.stringify(initSleepTime))
    return initSleepTime
  }

  this.createRunningPackage = function (today) {
    let initRunningPackage = {
      beforeSpringboard: '',
      startingPackage: '',
      count: 0,
      date: today
    }
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(RUNNING_PACKAGE, JSON.stringify(initRunningPackage))
    return initRunningPackage
  }


  /**
   * 设置指定时间后自动启动main脚本
   */
  this.setUpAutoStart = function (minutes) {
    // 先移除所有已设置的定时任务
    this.cancelAllTimedTasks()
    let mainScriptJs = FileUtils.getRealMainScriptPath()
    let millis = new Date().getTime() + minutes * 60 * 1000
    _logUtils.infoLog('预订[' + minutes + ']分钟后的任务，时间戳:' + millis)
    // 预定一个{minutes}分钟后的任务
    let task = Timers.addDisposableTask({
      path: mainScriptJs,
      date: millis
    })
    _logUtils.debugInfo("定时任务预定成功: " + task.id)
    this.recordTimedTask(task)
  }

  this.recordTimedTask = function (task) {
    let runtimeStorage = storages.create(RUNTIME_STORAGE)
    let autoStartListStr = runtimeStorage.get(TIMER_AUTO_START)
    let array = []
    if (autoStartListStr) {
      array = JSON.parse(autoStartListStr)
    }
    array.push(task)
    runtimeStorage.put(TIMER_AUTO_START, JSON.stringify(array))
  }

  this.showAllAutoTimedTask = function () {
    let runtimeStorage = storages.create(RUNTIME_STORAGE)
    let autoStartListStr = runtimeStorage.get(TIMER_AUTO_START)
    if (autoStartListStr) {
      let array = JSON.parse(autoStartListStr)
      if (array && array.length > 0) {
        array.forEach(task => {
          _logUtils.logInfo([
            '定时任务 mId: {} 目标执行时间: {} 剩余时间: {}秒',
            task.mId, formatDate(new Date(task.mMillis), 'yyyy-MM-dd HH:mm:ss'), ((task.mMillis - new Date().getTime()) / 1000.0).toFixed(0)
          ])
        })
      }
    } else {
      _logUtils.logInfo('当前没有自动设置的定时任务')
    }
  }

  this.cancelAllTimedTasks = function () {
    let runtimeStorage = storages.create(RUNTIME_STORAGE)
    let autoStartListStr = runtimeStorage.get(TIMER_AUTO_START)
    if (autoStartListStr) {
      let array = JSON.parse(autoStartListStr)
      if (array && array.length > 0) {
        array.forEach(task => {
          _logUtils.debugInfo('撤销自动任务：' + JSON.stringify(task))
          if (task.mId) {
            Timers.removeTimedTask(task.mId)
          }
        })
      }
    }
    // 将task队列置为空
    runtimeStorage.put(TIMER_AUTO_START, '')
  }


  /**
   * 杀死当前APP 仅适用于MIUI10+ 全面屏手势操作
   * 当未开启手势关闭 @code {config.killAppWithGesture==false} 时，仅仅返回操作 返回两次 相当于先关闭蚂蚁庄园，再缩小支付宝
   */
  this.killCurrentApp = function () {
    if (_config.killAppWithGesture) {
      recents()
      sleep(1000)
      gesture(320, [240, 1000], [800, 1000])
      sleep(400)
      home()
    } else {
      back()
      sleep(1000)
      back()
    }
  }

  this.waitFor = function (action, timeout) {
    let countDown = new java.util.concurrent.CountDownLatch(1)
    let timeoutThread = threads.start(function () {
      sleep(timeout)
      countDown.countDown()
      _logUtils.debugInfo('超时线程执行结束')
    })
    let actionSuccess = false
    let actionThread = threads.start(function () {
      action()
      actionSuccess = true
      countDown.countDown()
      _logUtils.debugInfo('action执行结束')
    })
    countDown.await()
    timeoutThread.interrupt()
    actionThread.interrupt()
    return actionSuccess
  }

  this.createQueue = function (size) {
    let queue = []
    for (let i = 0; i < size; i++) {
      queue.push(i)
    }
    return queue
  }

  this.getQueueDistinctSize = function (queue) {
    return queue.reduce((a, b) => {
      if (a.indexOf(b) < 0) {
        a.push(b)
      }
      return a
    }, []).length
  }

  this.pushQueue = function (queue, size, val) {
    if (queue.length >= size) {
      queue.shift()
    }
    queue.push(val)
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

module.exports = {
  commonFunctions: new CommonFunctions()
}