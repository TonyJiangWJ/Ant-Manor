/*
 * @Author: TonyJiangWJ
 * @Date: 2024-06-08 23:07:35
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-06-05 16:33:30
 * @Description: 星星球自动游玩
 */

importClass(android.graphics.drawable.GradientDrawable)
importClass(android.graphics.drawable.RippleDrawable)
importClass(android.content.res.ColorStateList)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
runtime.getImages().initOpenCvIfNeeded()
let { config } = require('./config.js')(runtime, this)
let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let LogFloaty = singletonRequire('LogFloaty')
let NotificationHelper = singletonRequire('Notification')
let antManorRunner = require('./core/AntManorRunner.js')
let unlocker = require('./lib/Unlock.js')
let formatDate = require('./lib/DateUtil.js')
let FloatyInstance = singletonRequire('FloatyUtil')
let WarningFloaty = singletonRequire('WarningFloaty')
let FloatyButtonSimple = require('./lib/FloatyButtonSimple.js')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')

logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  if (config.auto_lock === true && unlocker.needRelock() === true) {
    debugInfo('重新锁定屏幕')
    automator.lockScreen()
    unlocker.saveNeedRelock(true)
  }
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
if (typeof $yolo == 'undefined') {
  let plugin_yolo = (() => {
    try {
      return plugins.load('com.tony.onnx.yolov8')
    } catch (e) {
      toastLog('当前AutoJS不支持YOLO且未安装插件，加载失败' + e)
      exit()
    }
  })()
  toastLog('使用ONNX插件')
  $yolo = plugin_yolo
}

commonFunctions.requestScreenCaptureOrRestart()

let WIDTH = device.width
let HEIGHT = device.height
let running = false, stopping = false
let ball_config = {
  // 目标分数
  targetScore: config.starBallScore || 300,
  // 运行超时时间 毫秒
  timeout: 240000
}

console.verbose('转换后的配置：' + JSON.stringify(ball_config))
LogFloaty.pushLog('目标分数：' + ball_config.targetScore)

function Player () {

  let _this = this
  this.floatyLock = null
  this.floatyInitCondition = null
  this.forwardCount = 0
  this.forwardAvg = 0
  this.maxScore = 0
  this.threadPool = null
  this.color = '#00ff00'
  this.inited = false
  this.onnxInstance = null

  this.initPool = function () {
    let ENGINE_ID = engines.myEngine().id
    this.threadPool = new ThreadPoolExecutor(4, 8, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(1024), new ThreadFactory({
      newThread: function (runnable) {
        let thread = Executors.defaultThreadFactory().newThread(runnable)
        thread.setName(ENGINE_ID + '-星星球-' + thread.getName())
        return thread
      }
    }))
    let self = this
    events.on('exit', function () {
      running = false
      $yolo.release()
      if (self.threadPool !== null) {
        self.threadPool.shutdown()
        console.verbose('关闭线程池：{}', self.threadPool.awaitTermination(5, TimeUnit.SECONDS))
      }
    })
  }

  this.initLock = function () {
    this.floatyLock = threads.lock()
    this.floatyInitCondition = this.floatyLock.newCondition()
  }

  this.listenStop = function () {
    threads.start(function () {
      sleep(1000)
      toastLog('即将开始可按音量上键关闭', true)
      events.observeKey()
      events.onceKeyDown('volume_up', function (event) {
        running = false

        log('准备关闭线程')
        _this.destroyPool()
        engines.myEngine().forceStop()
        exit()
      })
    })
  }

  this.initOnnxInstance = function () {
    try {
      let model_path = files.path('./config_data/manor_ball_lite.onnx')
      if (!files.exists(model_path)) {
        toastLog('请确认已下载了模型文件')
        exit()
      }
  
      let onnxInit = $yolo.init({
        // 参数描述文件和模型文件地址
        modelPath: model_path,
        type: 'onnx',
        // 模型入参图片大小
        imageSize: 320,
        // 识别阈值
        confThreshold: 0.6,
        // 模型标签，必须和模型匹配
        labels: [
          "ball", "chick", "boom",
        ]
      })
      if (onnxInit) {
        this.onnxInstance = $yolo.getInstance()
      } else {
        toastLog('onnx初始化失败')
      }
    } catch (e) {
      toastLog('模型初始化异常, 可能执行过PaddleOCR 需要重启AutoJS')
      console.error(e)
      showRestartBtn()
    }
    if (this.onnxInstance == null) {
      LogFloaty.pushErrorLog('onnx初始化失败')
      exit()
    }
  }

  this.getScore = function () {
    let score_id = 'game-score-text'
    let scoreContainer = idMatches(score_id).exists() ? idMatches(score_id).findOne(1000) : null
    if (scoreContainer) {
      let scoreVal = parseInt(scoreContainer.text())
      if (isFinite((scoreVal))) {
        return scoreVal
      }
    }
    return 0
  }

  this.setFloatyColor = function (colorStr) {
    if (colorStr && colorStr.match(/^#[\dabcdef]{6}$/)) {
      this.color = colorStr
      FloatyInstance.setFloatyTextColor(colorStr)
    } else {
      console.error('颜色配置无效:' + colorStr)
    }
  }

  this.setFloatyInfo = function (point, text) {
    FloatyInstance.setFloatyInfo(point, text)
  }


  this.showFloatyCountdown = function (point, content, count) {
    let showContent = '[' + count + ']' + content
    while (count-- > 0) {
      this.setFloatyInfo(point, showContent)
      showContent = '[' + count + ']' + content
      sleep(1000)
    }
  }

  this.checkRegionByChick = function () {
    let chick = null
    let limit = 5
    do {
      let start = new Date()
      let checkResult = this.onnxInstance.forward(captureScreen(), { labelRegex: 'chick' })
      console.verbose('识别耗时：', (new Date().getTime() - start.getTime()) + 'ms')
      if (checkResult && checkResult.length > 0) {
        chick = checkResult[0]
        // 小鸡头部位置
        return { top: chick.bounds.top, bottom: chick.bounds.bottom }
      }
      console.verbose('未能找到小鸡，延迟500ms再次校验', limit)
      sleep(500)
    } while (--limit > 0 && !chick)
    return null
  }

  this.playing = function (stopScore) {
    if (running) {
      toastLog('运行中')
      return
    }
    running = true
    stopScore = stopScore || 230
    let currentScore = 0
    let clickCount = 0
    let start = new Date().getTime()
    let self = this
    this.forwardCount = 0
    this.forwardAvg = 0
    this.maxScore = 0
    let countdownLatch = new java.util.concurrent.CountDownLatch(1)
    this.threadPool.execute(function () {
      let lastScore = 0

      LogFloaty.pushLog('当前分数：0')
      while (currentScore < stopScore && running) {
        currentScore = self.getScore()
        if (lastScore !== currentScore) {
          lastScore = currentScore
          LogFloaty.replaceLastLog('当前分数：' + lastScore)
          if (currentScore > self.maxScore) {
            self.maxScore = currentScore
          }
          self.setFloatyInfo(null, lastScore + '')
        }
        sleep(200)
      }
    })
    this.threadPool.execute(function () {
      wrapExeception(function () {
        while (currentScore < stopScore && running) {
          let start = new Date()
          let img = captureScreen()
          console.verbose('截图耗时：', (new Date().getTime() - start.getTime()) + 'ms')
          start = new Date()
          let points = _this.onnxInstance.forward(img, null)//, _this.ballRegion)
          let forwardCost = new Date().getTime() - start.getTime()
          _this.forwardAvg = (_this.forwardAvg * _this.forwardCount + forwardCost) / (++_this.forwardCount)
          // 截图+识别 平均需要80多毫秒，还是比较慢的
          console.verbose('识别耗时：', forwardCost + 'ms')
          console.verbose('识别结果：', JSON.stringify(points))
          img.recycle()
          if (points && points.length > 0) {
            let point = points.filter(p => p.label === 'ball')
            if (point && point.length > 0) {
              console.verbose('过滤后结果：', JSON.stringify(point))
              point = point[0]
              console.info('点击位置：', point.bounds.centerX(), point.bounds.centerY())
              // 点击底部
              click(point.bounds.centerX(), point.bounds.centerY())
              clickCount++
              WarningFloaty.clearAll()
              WarningFloaty.addRectangle('球', [point.x, point.y, point.bounds.width(), point.bounds.height()])
              self.setFloatyInfo({ x: point.bounds.centerX(), y: point.bounds.bottom + point.bounds.height() / 2 }, null)
              // 点击后延迟
              sleep(50)
            } else {
              console.verbose('未识别到球')
            }
          }
        }
        countdownLatch.countDown()
      })
    })

    this.threadPool.execute(function () {
      while (currentScore < stopScore && running) {
        let restart = textContains('再来一局').findOne(1000)
        if (restart) {
          currentScore = 0
          restart.click()
        }
        sleep(5000)
      }
    })

    countdownLatch.await()
    let content = '最终分数:' + this.maxScore + ' 点击：' + clickCount + '次总耗时：' + ((new Date().getTime() - start) / 1000).toFixed(1) + 's 平均识别耗时：' + this.forwardAvg.toFixed(2) + ' fps:' + (1000 / this.forwardAvg).toFixed(2)
    toastLog(content)
    let point = {
      x: parseInt(WIDTH / 3),
      y: parseInt(HEIGHT / 3),
    }
    this.setFloatyColor('#ff0000')
    this.showFloatyCountdown(point, '运行结束, 最终得分：' + this.maxScore, 3)
    this.setFloatyInfo({
      x: parseInt(WIDTH / 2),
      y: point.y
    }, '再见')
    stopping = false
    running = false
    sleep(1000)
    LogFloaty.pushLog(content)
    floatyButton.changeButtonText('start', '开始')
  }

  this.setTimeoutExit = function () {
    setTimeout(function () {
      exit()
    }, 240000)
  }


  this.init = function () {
    if (this.inited) {
      return false
    }
    this.initPool()
    this.initLock()
    this.listenStop()
    this.initOnnxInstance()
    this.inited = true
  }

  this.startPlaying = function (targetScore) {
    this.playing(targetScore || ball_config.targetScore)
  }

  this.destroyPool = function () {
    this.threadPool.shutdownNow()
    this.threadPool = null
  }
}

// console.show()
let player = new Player()
player.init()

function doStartGame () {
  floatyButton.changeButtonText('start', '停止执行')
  player.startPlaying()
}

function doOpenGame () {
  floatyButton.changeButtonText('openGame', '正在打开...')
  // 打开蚂蚁庄园界面
  if (!antManorRunner.launchApp(false, true)) {
    LogFloaty.pushErrorLog('未能打开蚂蚁庄园')
    return false
  }
  // 打开去游玩
  LogFloaty.pushLog('查找小鸡乐园')
  let findTarget = antManorRunner.yoloCheck('小鸡乐园', { labelRegex: 'sports' })
  if (findTarget) {
    click(findTarget.x, findTarget.y)
    LogFloaty.pushLog('找到小鸡乐园，查找星星球入口')
    sleep(1000)
    // 找到星星球进行点击
    let target = selector().textContains('星星球').findOne(2000)
    if (target) {
      LogFloaty.pushLog('找到了星星球入口')
      target.click()
      floatyButton.changeButtonText('openGame', '打开游戏界面')
      return true
    } else {
      LogFloaty.pushErrorLog('未能找到星星球')
    }
  } else {
    LogFloaty.pushErrorLog('未找到小鸡乐园')
  }
  floatyButton.changeButtonText('openGame', '打开游戏界面')
  return false
}

let floatyButton = new FloatyButtonSimple('star-ball', [
  {
    id: 'start',
    text: '开始',
    preventClickExecuting: true,
    onClick: function () {
      wrapExeception(() => {
        doStartGame()
      })
    },
    handleExecuting: function (executingBtnId) {
      if (executingBtnId == 'start') {
        if (stopping) {
          toastLog('停止中')
          return
        }
        if (running == true) {
          running = false
          stopping = true
          floatyButton.changeButtonText('start', '停止中...')
        }
      }
    }
  },
  {
    id: 'openGame',
    text: '打开游戏界面',
    onClick: function () {
      wrapExeception(() => {
        doOpenGame()
      })
    }
  },
  {
    id: 'restart',
    text: '重启AutoJS',
    hide: true,
    onClick: function () {
      threads.start(function () {
        let count = 0
        while (count < 5) {
          let content = '即将终止AutoJS程序，请全保赋予了自启动权限，\n如未启动，请在闪退后手动打开AutoJS:' + Math.floor(5 - (++count))
          toastLog(content)
          sleep(1000)
        }
        java.lang.System.exit(0)
      })
    }
  },
])

function wrapExeception (func) {
  try {
    return func()
  } catch (e) {
    console.error('执行异常', e)
  }
}

function showRestartBtn () {
  ui.run(() => {
    floatyButton.window.restart_container.setVisibility(0)
  })
}

let executeArguments = Object.assign({}, engines.myEngine().execArgv)
let executeByTimeTask = !!executeArguments.intent
// 部分设备中参数有脏东西 可能导致JSON序列化异常
delete executeArguments.intent
if (executeArguments) {
  debugInfo(['启动参数：{}', JSON.stringify(executeArguments)])
}

unlocker.exec()

if (executeByTimeTask || executeArguments.executeByDispatcher/* || true TODO remove testing*/) {
  // 避免按钮点击冲突
  floatyButton.data.clickExecuting = true
  // 定时任务触发，执行自动操作
  commonFunctions.showCommonDialogAndWait('星星球')
  commonFunctions.listenDelayStart()
  NotificationHelper.cancelNotice()
  if (doOpenGame()) {
    // 修改执行中按钮 允许点击按钮
    floatyButton.data.executingBtn = 'start'
    sleep(1000)
    LogFloaty.pushLog('自动开启执行星星球')
    doStartGame()
    LogFloaty.pushLog('执行完毕')
    // 执行成功 撤销定时任务
    commonFunctions.cancelAllTimedTasks()
  } else {
    // 打开失败
    LogFloaty.pushErrorLog('打开星星球失败，五分钟后重试')
    // TODO 发送通知
    commonFunctions.setUpAutoStart(5)
    NotificationHelper.createNotification('打开星星球失败，五分钟后自动启动', '下次执行时间：' + formatDate(new Date(new Date().getTime() + 5 * 60000)))
  }
  exit()
}