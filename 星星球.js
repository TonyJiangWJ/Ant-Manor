/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-27 23:07:35
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2023-08-07 21:24:07
 * @Description: 星星球自动游玩
 */
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)

let { config } = require('./config.js')(runtime, this)
let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, this)

let commonFunctions = singletonRequire('CommonFunction')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let CanvasDrawer = require('./lib/CanvasDrawer.js')
let resourceMonitor = require('./lib/ResourceMonitor.js')(runtime, this)

requestScreenCapture(false)

const WIDTH = config.device_width
const HEIGHT = config.device_height
let running = true
let ball_config = {
  ballColor: '#ff4e86ff',
  reco: config.reco,
  threshold: 4,
  // 目标分数
  targetScore: config.starBallScore,
  // 运行超时时间 毫秒
  timeout: 240000
}

console.verbose('转换后的配置：' + JSON.stringify(ball_config))

function Player () {
  this.floatyWindow = null
  this.floatyLock = null
  this.floatyInitCondition = null

  this.threadPool = null
  this.color = '#00ff00'
  this.drawText = {
    type: 'text',
    text: '',
    position: {
      x: parseInt(WIDTH / 2),
      y: parseInt(HEIGHT / 2)
    },
    color: this.color,
    textSize: 40,
  }
  this.initPool = function () {
    let ENGINE_ID = engines.myEngine().id
    this.threadPool = new ThreadPoolExecutor(4, 8, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(1024), new ThreadFactory({
      newThread: function (runnable) {
        let thread = Executors.defaultThreadFactory().newThread(runnable)
        thread.setName(config.thread_name_prefix + ENGINE_ID + '-星星球-' + thread.getName())
        return thread
      }
    }))
    let self = this
    commonFunctions.registerOnEngineRemoved(function () {
      running = false
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
    let _this = this
    threads.start(function () {
      sleep(1000)
      toastLog('即将开始可按音量上键关闭', true)
      events.observeKey()
      events.onceKeyDown('volume_up', function (event) {
        running = false
        runningQueueDispatcher.removeRunningTask()
        log('准备关闭线程')
        _this.destroyPool()
        resourceMonitor.releaseAll()
        engines.myEngine().forceStop()
        exit()
      })
    })
  }

  this.initFloaty = function () {
    this.setRectangle('星星球区域', config.reco)
    let _this = this
    this.threadPool.execute(function () {
      sleep(500)
      _this.floatyLock.lock()
      _this.floatyWindow = floaty.rawWindow(
        <canvas id="canvas" layout_weight="1" />
      )
      _this.floatyWindow.setTouchable(false)
      ui.run(() => {
        _this.floatyWindow.setPosition(0, 0)
        _this.floatyWindow.setSize(config.device_width, config.device_height)
      })
      _this.floatyInitCondition.signalAll()
      _this.floatyLock.unlock()

      _this.floatyWindow.canvas.on("draw", function (canvas) {
        canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)

        if (_this.drawer == null) {
          _this.drawer = new CanvasDrawer(canvas, null, config.bang_offset)
        }

        let toDrawList = _this.toDrawList
        if (toDrawList && toDrawList.length > 0) {
          toDrawList.forEach(drawInfo => {
            try {
              switch (drawInfo.type) {
                case 'rect':
                  _this.drawer.drawRectAndText(drawInfo.text, drawInfo.rect, drawInfo.color || '#00ff00')
                  break
                case 'circle':
                  _this.drawer.drawCircleAndText(drawInfo.text, drawInfo.circle, drawInfo.color || '#00ff00')
                  break
                case 'text':
                  _this.drawer.drawText(drawInfo.text, drawInfo.position, drawInfo.color || '#00ff00', drawInfo.textSize)
                  break
                default:
                  console.warn(['no match draw event for {}', drawInfo.type], true)
              }
            } catch (e) {
              errorInfo('执行异常' + e)
              commonFunction.printExceptionStack(e)
            }
          })
        }
      })
    })
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
    } else {
      console.error('颜色配置无效:' + colorStr)
    }
  }


  this.setRectangle = function (text, rectRegion, color) {
    this.drawRect = {
      type: 'rect',
      text: text,
      rect: rectRegion,
      color: color,
    }
    this.toDrawList = [this.drawRect, this.drawText, this.drawBall].filter(v => !!v)
  }

  this.setFloatyInfo = function (point, text) {
    this.drawText = {
      type: 'text',
      text: text || this.drawText.text || '',
      position: point || this.drawText.position || {
        x: parseInt(WIDTH / 2),
        y: parseInt(HEIGHT / 2)
      },
      color: this.color,
      textSize: this.drawText.textSize,
    }
    this.toDrawList = [this.drawRect, this.drawText, this.drawBall].filter(v => !!v)
  }


  this.showFloatyCountdown = function (point, content, count) {
    let showContent = '[' + count + ']' + content
    while (count-- > 0) {
      this.setFloatyInfo(point, showContent)
      showContent = '[' + count + ']' + content
      sleep(1000)
    }
  }

  this.playing = function (stopScore) {
    stopScore = stopScore || 230
    let currentScore = 0
    let clickCount = 0
    let start = new Date().getTime()
    let self = this
    this.floatyLock.lock()
    if (this.floatyWindow === null) {
      this.floatyInitCondition.await()
    }
    this.floatyLock.unlock()
    let countdownLatch = new java.util.concurrent.CountDownLatch(1)
    this.threadPool.execute(function () {
      let lastScore = 0
      while (currentScore < stopScore && running) {
        currentScore = self.getScore()
        if (lastScore !== currentScore) {
          lastScore = currentScore
          self.setFloatyInfo(null, lastScore)
        }
        sleep(200)
      }
    })
    this.threadPool.execute(function () {
      while (currentScore < stopScore && running) {
        let img = captureScreen()
        let point = images.findColor(img, ball_config.ballColor, {
          region: ball_config.reco,
          threshold: ball_config.threshold
        })
        if (!point) {
          point = images.findColor(img, '#ff4c4c', {
            region: ball_config.reco,
            threshold: ball_config.threshold
          })
        }

        if (point) {
          click(point.x + 30, point.y + 50)
          clickCount++
          self.drawBall = {
            type: 'rect',
            text: '球',
            rect: [point.x, point.y, 30, 50],
          }
          self.setFloatyInfo(point, null)
        }
      }
      countdownLatch.countDown()
    })

    this.threadPool.execute(function () {
      while (currentScore < stopScore && running) {
        let restart = textContains('再来一局').findOne(1000)
        if (restart) {
          currentScore = 0
          let bounds = restart.bounds()
          click(bounds.centerX(), bounds.centerY())
        }
      }
    })

    countdownLatch.await()

    toastLog('最终分数:' + currentScore + ' 点击了：' + clickCount + '次 总耗时：' + (new Date().getTime() - start) + 'ms')
    let point = {
      x: parseInt(WIDTH / 3),
      y: parseInt(HEIGHT / 3),
    }
    this.setFloatyColor('#ff0000')
    this.showFloatyCountdown(point, '运行结束, 最终得分：' + currentScore, 3)
    this.setFloatyInfo({
      x: parseInt(WIDTH / 2),
      y: point.y
    }, '再见')
    sleep(2000)
  }

  this.setTimeoutExit = function () {
    setTimeout(function () {
      runningQueueDispatcher.removeRunningTask()
      exit()
    }, 240000)
  }


  this.startPlaying = function (targetScore) {
    this.initPool()
    this.initLock()
    this.listenStop()
    this.initFloaty()
    this.setTimeoutExit()
    this.playing(targetScore || ball_config.targetScore)
    this.destroyPool()
    runningQueueDispatcher.removeRunningTask()
    exit()
  }

  this.destroyPool = function () {
    this.threadPool.shutdownNow()
    this.threadPool = null
    this.floatyWindow = null
  }
}


if (!commonFunctions.checkAccessibilityService()) {
  try {
    auto.waitFor()
  } catch (e) {
    warnInfo('auto.waitFor()不可用')
    auto()
  }
}

runningQueueDispatcher.addRunningTask()
// console.show()
let player = new Player()
player.startPlaying()
resourceMonitor.releaseAll()
runningQueueDispatcher.removeRunningTask()

