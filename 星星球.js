/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-27 23:07:35
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-15 20:39:57
 * @Description: 星星球自动游玩
 */
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)

let { commonFunctions } = require('./lib/CommonFunction.js')
let { runningQueueDispatcher } = require('./lib/RunningQueueDispatcher.js')
let _config = require('./config.js').config

requestScreenCapture(false)

const WIDTH = _config.device_width
const HEIGHT = _config.device_height

const widthRate = 1
const heightRate = 1

let default_config = {
  ballColor: '#ff4e86ff',
  reco: [200, 100, 750, 1900],
  threshold: 4,
  // 目标分数
  targetScore: _config.starBallScore,
  // 运行超时时间 毫秒
  timeout: 240000
}

let custom_config = files.exists(FileUtils.getCurrentWorkPath() + '/extends/CustomConfig.js') ? require('./extends/CustomConfig.js') : null

let config = {}
Object.keys(default_config).forEach(key => {
  let val = default_config[key]
  if (typeof val === 'string') {
    config[key] = val
  } else if (Object.prototype.toString.call(val) === '[object Array]') {
    let newArrayConfig = [
      parseInt(val[0] * widthRate),
      parseInt(val[1] * heightRate),
      parseInt(val[2] * widthRate),
      parseInt(val[3] * heightRate)
    ]
    config[key] = newArrayConfig
  } else {
    config[key] = val
  }
})

if (custom_config && custom_config.reco !== null && custom_config.reco.length === 4) {
  config.reco = custom_config.reco
}

console.verbose('转换后的配置：' + JSON.stringify(config))

function Player () {
  this.floatyWindow = null
  this.floatyLock = null
  this.floatyInitCondition = null

  this.threadPool = null

  this.initPool = function () {
    this.threadPool = new ThreadPoolExecutor(4, 8, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(1024))
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
        runningQueueDispatcher.removeRunningTask()
        log('准备关闭线程')
        _this.destoryPool()
        engines.myEngine().forceStop()
        exit()
      })
    })
  }

  this.initFloaty = function () {
    let _this = this
    this.threadPool.execute(function () {
      sleep(500)
      _this.floatyLock.lock()
      _this.floatyWindow = floaty.rawWindow(
        <frame gravity="left">
          <text id="content" textSize="15dp" textColor="#00ff00" />
        </frame>
      )
      _this.floatyWindow.setTouchable(false)
      _this.floatyWindow.setPosition(WIDTH / 2, config.reco[1])
      _this.floatyWindow.content.text('准备寻找球球的位置')
      _this.floatyInitCondition.signalAll()
      _this.floatyLock.unlock()
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
      this.floatyLock.lock()
      if (this.floatyWindow === null) {
        this.floatyInitCondition.await()
      }
      let _this = this
      ui.run(function () {
        _this.floatyWindow.content.setTextColor(android.graphics.Color.parseColor(colorStr))
      })
      this.floatyLock.unlock()
    }
    console.error('颜色配置无效:' + colorStr)
  }

  this.setFloatyInfo = function (point, text) {
    this.floatyLock.lock()
    if (this.floatyWindow === null) {
      this.floatyInitCondition.await()
    }
    let _this = this
    ui.run(function () {
      _this.floatyWindow.content.text(text)
      _this.floatyWindow.setPosition(point.x, point.y)
    })
    this.floatyLock.unlock()
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
    while ((currentScore = this.getScore()) < stopScore) {
      this.floatyLock.lock()
      if (this.floatyWindow === null) {
        this.floatyInitCondition.await()
      }
      this.floatyLock.unlock()
      sleep(30)
      let img = captureScreen()
      let point = images.findColor(img, config.ballColor, {
        region: config.reco,
        threshold: config.threshold
      })
      content = '蓝球球:' + currentScore
      if (!point) {
        point = images.findColor(img, '#ffff4c4c', {
          region: config.reco,
          threshold: config.threshold
        })
        content = '红球球:' + currentScore
      }

      if (point) {
        click(point.x + 10, point.y + 20)
        clickCount++
        this.setFloatyInfo(point, content)
      }
      img.recycle()
      while (textContains('再来一局').exists()) {
        currentScore = currentScore < stopScore ? 0 : currentScore
        let restart = textContains('再来一局').findOne(1000)
        if (restart) {
          let bounds = restart.bounds()
          click(bounds.centerX(), bounds.centerY())
        }
      }
    }
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
    this.playing(targetScore || config.targetScore)
    this.destoryPool()
    runningQueueDispatcher.removeRunningTask()
    exit()
  }

  this.destoryPool = function () {
    this.threadPool.shutdownNow()
    this.threadPool = null
    this.floatyWindow = null
  }
}


if (!commonFunctions.checkAccessibilityService(true)) {
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
runningQueueDispatcher.removeRunningTask()

