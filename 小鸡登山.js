/**
 * 开发中，暂时没法投入使用
 */

importClass(android.content.Context)
importClass(android.provider.Settings)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
let ColorCenterCalculator = require('./lib/ColorCenterCalculator.js')
let config = require('./config.js')
if (!checkAccessibilityService(true)) {
  try {
    auto.waitFor()
  } catch (e) {
    warnInfo('auto.waitFor()不可用')
    auto()
  }
}
log('无障碍启动成功')

log('请求截图权限')
// exit()
let permission = requestScreenCapture(false)
if (permission) {
  log('请求截图权限成功')
} else {
  log('请求截图权限失败')
  exit()
}

let WIDTH = config.device_width
let HEIGHT = config.device_height
let widthRate = WIDTH / 1080.0
let heightRate = HEIGHT / 2160.0

// exit()
let config = {
  // 刘海高度，设置悬浮窗的时候减去他， 要在刘海上显示则得负值 干！
  // bangHeight: 75,
  revisionRate: 0.2,
  gestureThresholdBottom: 1250 * heightRate,
  // 开始按钮
  startButtonColor: '#4275ef',
  // 金币
  coinColor: '#e2b201',
  // 小鸡鸡冠
  chickColor: '#ce3c2c',
  // 树木颜色校验
  treeColor: '#06c75f',

  startButton: {
    left: 0,
    right: WIDTH,
    top: 1100 * heightRate,
    bottom: 1365 * heightRate
  },
  coin: {
    left: 130 * heightRate,
    right: WIDTH,
    top: 1200 * heightRate,
    bottom: 1400 * heightRate
  },
  chick: {
    left: 150 * heightRate,
    right: WIDTH - 200 * widthRate,
    top: 950 * heightRate,
    bottom: 1650 * heightRate
  },
  threshold: 10,
  centerThreshold: 60
}

const FLOATY = {
  MOVE: 'movePoint',
  START_BUTTON: 'movePoint',
  COIN: 'coin',
  CHICK: 'chick'
}


// console.show()
let player = new Player()
log('准备开始！')
player.startPlaying()


function Player () {
  this.coinFloatyWindow = null
  this.coinFloatyLock = null
  this.coinFloatyInitCondition = null

  this.movePointFloatyWindow = null
  this.movePointFloatyLock = null
  this.movePointFloatyInitCondition = null

  this.chickFloatyWindow = null
  this.chickFloatyLock = null
  this.chickFloatyInitCondition = null

  this.gestureLock = null
  this.gestureCondition = null
  this.recognized = false

  this.startX = null
  this.startY = null
  this.endX = null
  this.endY = null
  this.moveY = parseInt(HEIGHT / 3 * 2)


  this.threadPool = null

  this.initPool = function () {
    this.threadPool = new ThreadPoolExecutor(4, 8, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(1024))
  }

  this.destoryPool = function () {
    this.threadPool.shutdown()
    this.threadPool = null
  }

  this.displayThreadPoolStatus = function () {
    let _this = this
    threads.start(function () {
      while (true) {
        sleep(3000)
        log('线程池中运行数量：' + _this.threadPool.getActiveCount())
      }
    })
  }


  this.initLocks = function () {
    this.coinFloatyLock = threads.lock()
    this.movePointFloatyLock = threads.lock()
    this.chickFloatyLock = threads.lock()
    this.coinFloatyInitCondition = this.coinFloatyLock.newCondition()
    this.movePointFloatyInitCondition = this.movePointFloatyLock.newCondition()
    this.chickFloatyInitCondition = this.chickFloatyLock.newCondition()

    this.gestureLock = threads.lock()
    this.gestureCondition = this.gestureLock.newCondition()
  }

  this.initCoinFloaty = function () {
    let _this = this
    sleep(500)
    // 金币悬浮窗
    _this.coinFloatyLock.lock()
    _this.coinFloatyWindow = floaty.rawWindow(
      <frame gravity='left'>
        <text id='content' textSize='10dp' textColor='#000000' />
      </frame>
    )
    _this.coinFloatyWindow.setPosition(config.coin.left, config.coin.top)
    _this.coinFloatyWindow.setTouchable(false)
    _this.coinFloatyWindow.content.text('coin standby')
    _this.coinFloatyInitCondition.signalAll()
    _this.coinFloatyLock.unlock()
  }

  this.initMovePointFloaty = function () {
    let _this = this
    log('初始化移动点悬浮窗')
    sleep(500)
    _this.movePointFloatyLock.lock()
    _this.movePointFloatyWindow = floaty.rawWindow(
      <frame gravity='left'>
        <text id='content' textSize='10dp' textColor='#000000' />
      </frame>
    )
    _this.movePointFloatyWindow.setPosition(config.startButton.left, config.startButton.top)
    _this.movePointFloatyWindow.setTouchable(false)
    _this.movePointFloatyWindow.content.text('move standby')
    _this.movePointFloatyInitCondition.signalAll()
    _this.movePointFloatyLock.unlock()
    log('初始化移动点悬浮窗完成')
  }

  this.initChickFloaty = function () {
    let _this = this
    sleep(500)
    _this.chickFloatyLock.lock()
    _this.chickFloatyWindow = floaty.rawWindow(
      <frame gravity='left'>
        <text id='content' textSize='10dp' textColor='#000000' />
      </frame>
    )
    _this.chickFloatyWindow.setPosition(config.chick.left, config.chick.top)
    _this.chickFloatyWindow.setTouchable(false)
    _this.chickFloatyWindow.content.text('chick standby')
    _this.chickFloatyInitCondition.signalAll()
    _this.chickFloatyLock.unlock()
  }

  this.initFloaties = function () {
    let _this = this
    this.threadPool.execute(function () {
      _this.initMovePointFloaty()
    })
    this.threadPool.execute(function () {
      _this.initCoinFloaty()
    })
    this.threadPool.execute(function () {
      _this.initChickFloaty()
    })
  }

  this.listenStop = function () {
    let _this = this
    threads.start(function () {
      sleep(1000)
      log('即将开始可按音量上键关闭', true)
      events.observeKey()
      events.onceKeyDown('volume_up', function (event) {
        toastLog('准备关闭脚本！')
        _this.destoryPool()
        engines.myEngine().forceStop()
        exit()
      })
    })
  }



  this.setFloatyColor = function (target, colorStr) {
    log('设置悬浮窗[' + target + ']文字颜色：' + colorStr)
    if (colorStr && colorStr.match(/^#[\dabcdef]{6}$/)) {
      let _this = this
      this.threadPool.execute(function () {
        let targetColor = android.graphics.Color.parseColor(colorStr)
        switch (target) {
          case FLOATY.COIN:
            ui.run(function () {
              _this.coinFloatyLock.lock()
              while (_this.coinFloatyWindow === null) {
                _this.coinFloatyInitCondition.await()
              }
              _this.coinFloatyWindow.content.setTextColor(targetColor)
              _this.coinFloatyLock.unlock()
            })
            break
          case FLOATY.CHICK:
            ui.run(function () {
              _this.chickFloatyLock.lock()
              while (_this.chickFloatyWindow === null) {
                _this.chickFloatyInitCondition.await()
              }
              _this.chickFloatyWindow.content.setTextColor(targetColor)
              _this.chickFloatyLock.unlock()
            })
            break
          case FLOATY.MOVE:
            ui.run(function () {
              _this.movePointFloatyLock.lock()
              while (_this.movePointFloatyWindow === null) {
                _this.movePointFloatyInitCondition.await()
              }
              _this.movePointFloatyWindow.content.setTextColor(targetColor)
              _this.movePointFloatyLock.unlock()
            })
            break
        }
      })
    } else {
      console.error('颜色配置无效:' + colorStr)
    }
  }

  this.setFloatyInfo = function (target, point, text) {
    let displayPoint = {
      x: point.x,
      y: point.y
    }
    if (config.bangHeight > 0) {
      displayPoint.y = point.y - config.bangHeight
      log('刘海高度：' + config.bangHeight + '减去前位置：' + point.y + '减去后位置：' + displayPoint.y)
    }
    let _this = this
    this.threadPool.execute(function () {
      switch (target) {
        case FLOATY.COIN:
          ui.run(function () {
            _this.coinFloatyLock.lock()
            while (_this.coinFloatyWindow === null) {
              _this.coinFloatyInitCondition.await()
            }
            _this.coinFloatyWindow.content.text(text)
            _this.coinFloatyWindow.setPosition(displayPoint.x, displayPoint.y)
            _this.coinFloatyLock.unlock()
          })
          break
        case FLOATY.CHICK:
          ui.run(function () {
            _this.chickFloatyLock.lock()
            while (_this.chickFloatyWindow === null) {
              _this.chickFloatyInitCondition.await()
            }
            _this.chickFloatyWindow.content.text(text)
            _this.chickFloatyWindow.setPosition(displayPoint.x, displayPoint.y)
            _this.chickFloatyLock.unlock()
          })
          break
        case FLOATY.MOVE:
          ui.run(function () {
            _this.movePointFloatyLock.lock()
            while (_this.movePointFloatyWindow === null) {
              _this.movePointFloatyInitCondition.await()
            }
            _this.movePointFloatyWindow.content.text(text)
            _this.movePointFloatyWindow.setPosition(displayPoint.x, displayPoint.y)
            _this.movePointFloatyLock.unlock()
          })
          break
        default:
          console.error('未找到对应的悬浮窗：' + target)
      }
    })
  }


  this.showFloatyCountdown = function (point, content, count) {
    let showContent = '[' + count + ']' + content
    while (count-- > 0) {
      this.setFloatyInfo(FLOATY.MOVE, point, showContent)
      showContent = '[' + count + ']' + content
      sleep(1000)
    }
  }


  this.summaryCenterInfo = function (calculator, content) {
    let start = new Date().getTime()
    let center = calculator.getColorRegionCenter()
    log('获取中心点：' + JSON.stringify(center))
    let {x, y} = center
    let end = new Date().getTime()
    let logContent = (content + ' 中心点：' + x + ',' + y + ' 分析耗时' + (end - start) + 'ms')
    // log(logContent)
    return {
      x: x,
      y: y,
      logContent: logContent
    }
  }

  this.waitUntilFloatyInitialized = function () {
    this.movePointFloatyLock.lock()
    if (this.movePointFloatyWindow === null) {
      log('移动悬浮窗未初始化，继续等待')
      this.movePointFloatyInitCondition.await()
    }
    this.movePointFloatyLock.unlock()

    this.coinFloatyLock.lock()
    if (this.coinFloatyWindow === null) {
      log('金币悬浮窗未初始化，继续等待')
      this.coinFloatyInitCondition.await()
    }
    this.coinFloatyLock.unlock()

    this.chickFloatyLock.lock()
    if (this.chickFloatyWindow === null) {
      log('小鸡悬浮窗未初始化，继续等待')
      this.chickFloatyInitCondition.await()
    }
    this.chickFloatyLock.unlock()
  }

  this.recognizeCoins = function () {
    let _this = this
    this.threadPool.execute(function () {
      try {
        log('启动识别线程')
        while (true) {
          sleep(10)
          _this.gestureLock.lock()
          while (_this.recognized === true) {
            log('等待手势操作，移动小鸡。。。')
            _this.gestureCondition.await()
          }
          let img = captureScreen()
          if (img) {
            findPoint = images.findColor(img, config.coinColor, {
              region: getRegion(config.coin),
              threshold: config.threshold
            })
            if (findPoint) {
              let coinCal = new ColorCenterCalculator(img, config.coinColor, findPoint, config.centerThreshold)

              let summaryCoin = _this.summaryCenterInfo(coinCal, '金币')
              _this.setFloatyInfo(FLOATY.COIN, {
                x: summaryCoin.x,
                y: summaryCoin.y
              }, '\'金币')

              if (summaryCoin.y > config.gestureThresholdBottom) {
                _this.setFloatyColor(FLOATY.COIN, '#00ff00')
                let chickStartTime = new Date().getTime()
                let countdownLatch = new CountDownLatch(3)
                let summaryChick = null
                _this.threadPool.execute(function () {
                  let chickPoint = images.findColor(img, config.chickColor, {
                    region: getRegion(config.chick),
                    threshold: config.threshold
                  })
                  if (chickPoint) {
                    let chickCal = new ColorCenterCalculator(img, config.chickColor, chickPoint, config.centerThreshold)
                    summaryChick = _this.summaryCenterInfo(chickCal, '小鸡')
                    _this.setFloatyInfo(FLOATY.CHICK, {
                      x: summaryChick.x,
                      y: summaryChick.y
                    }, '\'小鸡')
                  }
                  countdownLatch.countDown()
                })

                let leftCheck = false
                let rightCheck = false
                _this.threadPool.execute(function () {
                  leftCheck = images.findColor(img, config.treeColor, {
                    region: [summaryCoin.x - 60, summaryCoin.y - 50, 60, 100],
                    threshold: 4
                  })
                  log(leftCheck ? '左边有树' : '左边没树')
                  countdownLatch.countDown()
                })
                _this.threadPool.execute(function () {
                  rightCheck = images.findColor(img, config.treeColor, {
                    region: [summaryCoin.x, summaryCoin.y - 50, 60, 100],
                    threshold: 4
                  })
                  log(rightCheck ? '右边有树' : '右边没树')
                  countdownLatch.countDown()
                })
                log('等待执行完毕' + _this.threadPool.getActiveCount())
                countdownLatch.await()

                log('三个线程都执行完毕 总耗时：' + (new Date().getTime() - chickStartTime) + 'ms')
                if (summaryChick) {
                  _this.startX = summaryChick.x
                  _this.startY = summaryChick.y
                  if (leftCheck && !rightCheck) {
                    _this.endX = summaryCoin.x + 20
                  } else if (!leftCheck && rightCheck) {
                    _this.endX = summaryCoin.x - 20
                  } else {
                    // 自求多福吧
                    log('左右都有树，自求多福')
                    _this.endX = summaryCoin.x
                  }
                  log('计算属性')
                  _this.endY = summaryCoin.y
                  _this.recognized = true
                  _this.gestureCondition.signalAll()
                  log('找到了小鸡和金币的位置，告诉操作线程进行移动 start: ' + _this.startX + ' end:' + _this.endX)
                  _this.gestureLock.unlock()
                  log('释放锁')
                } else {
                  log('未找到小鸡位置，继续寻找')
                }
              } else {
                _this.setFloatyColor(FLOATY.COIN, '#000000')
                log('识别到的金币过高，不计算：' + summaryCoin.y)
              }
            }
          }
        }
      } catch (e) {
        log('发生异常：' + e)
      }

    })
  }


  this.executeGesture = function () {

    let _this = this
    this.threadPool.execute(function () {
      try {
        log('启动执行移动线程')
        while (true) {
          sleep(30)
          _this.gestureLock.lock()
          while (_this.recognized === false) {
            log('等待识别小鸡和金币位置')
            _this.gestureCondition.await()
          }
          let yWeight = (1 - (_this.endY - 1200) / 100)
          log('执行移动 start: ' + _this.startX + ' end:' + _this.endX + ' endY:' + _this.endY + ' y权重：' + yWeight)
          let revisionDst = Math.abs(parseInt((_this.endX - _this.startX) * config.revisionRate * yWeight))
          let newX = _this.endX > _this.startX ? _this.endX - revisionDst : _this.endX + revisionDst
          log('修正距离：-' + revisionDst)
          log('实际移动 start: ' + _this.startX + ' end:' + newX)
          if (Math.abs(_this.startX - _this.endX + revisionDst) > 1) {
            log('执行移动')
            gesture(203, [_this.startX, _this.moveY], [newX, _this.moveY])
            sleep(210)
          } else {
            log('距离近不执行执行移动')
          }
          _this.recognized = false
          _this.gestureCondition.signalAll()
          _this.gestureLock.unlock()
          log('移动执行完毕')
        }
      } catch (e) {
        log('移动发生异常：' + e)
      }
    })
  }

  this.findAndClickStartButton = function (img) {

    let startButtonImg = img || captureScreen()
    let findPoint = null
    if (startButtonImg) {
      findPoint = images.findColor(startButtonImg, config.startButtonColor, {
        region: getRegion(config.startButton),
        threshold: config.threshold
      })

      if (findPoint) {
        let x = parseInt(findPoint.x)
        let y = parseInt(findPoint.y)
        log('find the point:' + x + ',' + y)
        let startCal = new ColorCenterCalculator(startButtonImg, config.startButtonColor, findPoint, config.centerThreshold)
        let summaryStartButton = this.summaryCenterInfo(startCal, '开始按钮')
        this.setFloatyInfo(FLOATY.START_BUTTON, {
          x: summaryStartButton.x,
          y: summaryStartButton.y
        }, summaryStartButton.logContent)
        click(summaryStartButton.x, summaryStartButton.y)
      }
    }

  }

  this.playing = function () {
    this.waitUntilFloatyInitialized()

    this.findAndClickStartButton()
    sleep(1000)
    // 识别金币的位置
    this.recognizeCoins()
    this.executeGesture()
    console.show()
  }

  this.setTimeoutExit = function () {
    let _this = this
    setTimeout(function () {
      let point = {
        x: parseInt(WIDTH / 3),
        y: parseInt(HEIGHT / 3),
      }
      _this.setFloatyColor(FLOATY.MOVE, '#ff0000')
      _this.showFloatyCountdown(point, '运行结束!', 3)
      _this.setFloatyInfo(FLOATY.MOVE, {
        x: parseInt(WIDTH / 2),
        y: point.y
      }, '再见')
      sleep(2000)
      exit()
    }, 240000)
  }


  this.startPlaying = function () {
    this.initPool()
    log('初始化锁')
    this.initLocks()
    log('延迟停止')
    this.listenStop()
    log('初始化悬浮窗')
    this.initFloaties()
    log('挂载结束倒计时')
    this.setTimeoutExit()
    this.displayThreadPoolStatus()
    this.playing()
  }
}





function getRegion (config) {
  return [config.left, config.top, config.right - config.left, config.bottom - config.top]
}

function checkAccessibilityService (force) {
  let packageName = 'org.autojs.autojs'
  let requiredService = packageName + '/com.stardust.autojs.core.accessibility.AccessibilityService'
  try {
    let enabledServices = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
    log('当前已启用无障碍功能的服务:' + enabledServices)
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
      log('成功开启AutoJS的辅助服务')
    }

    return true
  } catch (e) {
    log('\n请确保已给予 WRITE_SECURE_SETTINGS 权限\n\n授权代码已复制，请使用adb工具连接手机执行(重启不失效)\n\n', true)
    let shellScript = 'adb shell pm grant ' + packageName + ' android.permission.WRITE_SECURE_SETTINGS'
    log('adb 脚本 已复制到剪切板：[' + shellScript + ']')
    setClip(shellScript)
    return false
  }
}
