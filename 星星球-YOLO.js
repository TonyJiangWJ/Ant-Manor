/*
 * @Author: TonyJiangWJ
 * @Date: 2024-06-08 23:07:35
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2024-09-13 14:55:43
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

requestScreenCapture(false)

let bang_offset = -getStatusBarHeight()
let onnxInstance = null
setTimeout(() => {
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
        "chick", "ball", "boom",
      ]
    })
    if (onnxInit) {
      onnxInstance = $yolo.getInstance()
    } else {
      toastLog('ncnn初始化失败')
    }
  } catch (e) {
    toastLog('模型初始化异常, 可能执行过PaddleOCR 需要重启AutoJS')
    console.error(e)
    showRestartBtn()
  }
}, 200)

let WIDTH = device.width
let HEIGHT = device.height
let running = false, stopping = false
let ball_config = {
  // 目标分数
  targetScore: 300,
  // 运行超时时间 毫秒
  timeout: 240000
}

console.verbose('转换后的配置：' + JSON.stringify(ball_config))

function Player () {

  let _this = this
  this.floatyWindow = null
  this.floatyLock = null
  this.floatyInitCondition = null
  this.forwardCount = 0
  this.forwardAvg = 0
  this.maxScore = 0
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

  this.initFloaty = function () {
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
        _this.floatyWindow.setSize(device.width, device.height)
      })
      _this.floatyInitCondition.signalAll()
      _this.floatyLock.unlock()

      _this.floatyWindow.canvas.on("draw", function (canvas) {
        canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)

        if (_this.drawer == null) {
          _this.drawer = new CanvasDrawer(canvas, null, bang_offset)
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
        _this.drawer.drawText((device.getAvailMem()/1024/1024).toFixed(2) + 'MB', {x: 100, y: 100}, '#00ff00', 30)
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

  this.checkRegionByChick = function () {
    let chick = null
    let limit = 5
    do {
      let start = new Date()
      let checkResult = onnxInstance.forward(captureScreen(), { labelRegex: 'chick' })
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
    // this.floatyLock.lock()
    // if (this.floatyWindow === null) {
    //   this.floatyInitCondition.await()
    // }
    // this.floatyLock.unlock()


    // this.chickRegion = this.checkRegionByChick()
    // if (this.chickRegion != null) {
    //   let chickTop = this.chickRegion.top
    //   let chickBottom = this.chickRegion.bottom
    //   let chickHeight = chickBottom - chickTop

    //   if (chickTop > 0) {
    //     this.ballRegion = [0, chickTop - chickHeight * 0.5, WIDTH, chickHeight * 2]
    //     this.setRectangle('星星球区域', this.ballRegion)
    //   }
    // }

    let countdownLatch = new java.util.concurrent.CountDownLatch(1)
    this.threadPool.execute(function () {
      let lastScore = 0
      while (currentScore < stopScore && running) {
        currentScore = self.getScore()
        if (lastScore !== currentScore) {
          lastScore = currentScore
          if (currentScore > self.maxScore) {
            self.maxScore = currentScore
          }
          self.setFloatyInfo(null, lastScore)
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
          let points = onnxInstance.forward(img, null)//, _this.ballRegion)
          let forwardCost = new Date().getTime() - start.getTime()
          _this.forwardAvg = (_this.forwardAvg * _this.forwardCount + forwardCost) / (++_this.forwardCount)
          // 截图+识别 平均需要80多毫秒，还是比较慢的
          console.verbose('识别耗时：', forwardCost + 'ms')
          console.verbose('识别结果：', JSON.stringify(points))
          img.recycle()
          if (points && points.length > 0) {
            let point = points.filter(p => p.label === 'ball')
            if (point && point.length > 0) {
              point = point[0]
              // 点击底部
              click(point.bounds.centerX(), point.bounds.bottom + point.bounds.height() / 2)
              clickCount++
              self.drawBall = {
                type: 'rect',
                text: '球',
                rect: [point.x, point.y, point.bounds.width(), point.bounds.height()],
              }
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
          let bounds = restart.bounds()
          click(bounds.centerX(), bounds.centerY())
        }
        sleep(5000)
      }
    })

    countdownLatch.await()

    toastLog('最终分数:' + this.maxScore + ' 点击：' + clickCount + '次总耗时：' + ((new Date().getTime() - start) / 1000).toFixed(1) + 's 平均识别耗时：' + this.forwardAvg.toFixed(2) + ' fps:' + (1000 / this.forwardAvg).toFixed(2))
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
    sleep(1000)
    stopping = false
    running = false
    ui.run(function () {
      window.start.setText('开始')
    })
  }

  this.setTimeoutExit = function () {
    setTimeout(function () {
      exit()
    }, 240000)
  }


  this.init = function (targetScore) {
    this.initPool()
    this.initLock()
    this.listenStop()
    this.initFloaty()
  }

  this.startPlaying = function (targetScore) {
    this.playing(targetScore || ball_config.targetScore)
  }

  this.destroyPool = function () {
    this.threadPool.shutdownNow()
    this.threadPool = null
    this.floatyWindow = null
  }
}


try {
  auto.waitFor()
} catch (e) {
  toastLog('auto.waitFor()不可用')
  auto()
}

// console.show()
let player = new Player()
player.init()

let btns = [
  {
    id: 'start',
    text: '开始',
    preventClickExecuting: true,
    onClick: function () {
      wrapExeception(() => {
        if (stopping) {
          toastLog('停止中')
          return
        }
        if (running == true) {
          running = false
          stopping = true
          ui.run(function () {
            window.start.setText('停止中...')
          })
        } else {
          ui.run(function () {
            window.start.setText('停止执行')
          })
          player.startPlaying()
        }
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
  {
    id: 'exit',
    color: '#EB393C',
    rippleColor: '#C2292C',
    text: '退出脚本',
    onClick: function () {
      exit()
    }
  }
]

let data = {
  _clickExecuting: false,
  set clickExecuting (val) {
    this._clickExecuting = val
  },
  get clickExecuting () {
    return this._clickExecuting
  },
  btnDrawables: {}
}

let threadPool = new ThreadPoolExecutor(2, 2, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(16),
  new ThreadFactory({
    newThread: function (runnable) {
      let thread = Executors.defaultThreadFactory().newThread(runnable)
      thread.setName('btn-operator-' + thread.getName())
      return thread
    }
  })
)
let window = floaty.rawWindow(
  `<horizontal>
    <vertical padding="1">
   ${btns.map(btn => {
    return `<vertical marginTop="5" marginBottom="5" id="${btn.id}_container"><button id="${btn.id}" text="${btn.text}" textSize="${btn.textSize ? btn.textSize : 12}sp" w="*" h="30" /></vertical>`
  }).join('\n')
  }</vertical>
  </horizontal>`)
ui.run(() => {
  window.setPosition(device.width * 0.1, device.height * 0.5)
})
btns.forEach(btn => {
  ui.run(() => {
    if (btn.hide) {
      window[btn.id + '_container'].setVisibility(8)
    }
    setButtonStyle(btn.id, btn.color, btn.rippleColor)
  })
  if (btn.onClick) {
    window[btn.id].on('click', () => {
      if (data.clickExecuting && !btn.preventClickExecuting) {
        threadPool.execute(function () {
          toastLog('点击执行中，请稍等')
        })
        return
      }
      data.clickExecuting = true
      threadPool.execute(function () {
        try {
          btn.onClick()
        } catch (e) {
          console.error(['点击执行异常：{}', e.message], true)
        } finally {
          data.clickExecuting = false
        }
      })
    })
  }
})


window.exit.setOnTouchListener(new TouchController(window, () => {
  exit()
}, () => {
  changeButtonStyle('exit', null, '#FF753A', '#FFE13A')
}, () => {
  changeButtonStyle('exit', (drawable) => {
    drawable.setColor(colors.parseColor('#EB393C'))
    drawable.setStroke(0, colors.parseColor('#3FBE7B'))
  })
}).createListener())


function setButtonStyle (btnId, color, rippleColor) {
  let shapeDrawable = new GradientDrawable();
  shapeDrawable.setShape(GradientDrawable.RECTANGLE);
  // 设置圆角大小，或者直接使用setCornerRadius方法
  // shapeDrawable.setCornerRadius(20); // 调整这里的数值来控制圆角的大小
  let radius = util.java.array('float', 8)
  for (let i = 0; i < 8; i++) {
    radius[i] = 20
  }
  shapeDrawable.setCornerRadii(radius); // 调整这里的数值来控制圆角的大小
  shapeDrawable.setColor(colors.parseColor(color || '#3FBE7B')); // 按钮的背景色
  shapeDrawable.setPadding(10, 10, 10, 10); // 调整这里的数值来控制按钮的内边距
  // shapeDrawable.setStroke(5, colors.parseColor('#FFEE00')); // 调整这里的数值来控制按钮的边框宽度和颜色
  data.btnDrawables[btnId] = shapeDrawable
  let btn = window[btnId]
  btn.setShadowLayer(10, 5, 5, colors.parseColor('#888888'))
  btn.setBackground(new RippleDrawable(ColorStateList.valueOf(colors.parseColor(rippleColor || '#27985C')), shapeDrawable, null))
}

function changeButtonStyle (btnId, handler, color, storkColor) {
  handler = handler || function (shapeDrawable) {
    color && shapeDrawable.setColor(colors.parseColor(color))
    storkColor && shapeDrawable.setStroke(5, colors.parseColor(storkColor))
  }
  handler(data.btnDrawables[btnId])
}

function wrapExeception (func) {
  try {
    func()
  } catch (e) {
    console.error('执行异常', e)
  }
}

function getStatusBarHeight () {
  let resources = context.getResources()
  let resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
  return resources.getDimensionPixelSize(resourceId)
}

function showRestartBtn () {
  ui.run(() => {
    window.restart_container.setVisibility(0)
  })
}


function TouchController (buttonWindow, handleClick, handleDown, handleUp) {
  this.eventStartX = null
  this.eventStartY = null
  this.windowStartX = buttonWindow.getX()
  this.windowStartY = buttonWindow.getY()
  this.eventKeep = false
  this.eventMoving = false
  this.touchDownTime = new Date().getTime()

  this.createListener = function () {
    let _this = this
    return new android.view.View.OnTouchListener((view, event) => {
      try {
        switch (event.getAction()) {
          case event.ACTION_DOWN:
            handleDown && handleDown()
            _this.eventStartX = event.getRawX();
            _this.eventStartY = event.getRawY();
            _this.windowStartX = buttonWindow.getX();
            _this.windowStartY = buttonWindow.getY();
            _this.eventKeep = true; //按下,开启计时
            _this.touchDownTime = new Date().getTime()
            break;
          case event.ACTION_MOVE:
            var sx = event.getRawX() - _this.eventStartX;
            var sy = event.getRawY() - _this.eventStartY;
            if (!_this.eventMoving && _this.eventKeep && getDistance(sx, sy) >= 10) {
              _this.eventMoving = true;
            }
            if (_this.eventMoving && _this.eventKeep) {
              ui.post(() => {
                buttonWindow.setPosition(_this.windowStartX + sx, _this.windowStartY + sy);
              })
            }
            break;
          case event.ACTION_UP:
            handleUp && handleUp()
            if (!_this.eventMoving && _this.eventKeep && _this.touchDownTime > new Date().getTime() - 1000) {
              handleClick && handleClick()
            }
            _this.eventKeep = false;
            _this.touchDownTime = 0;
            _this.eventMoving = false;
            break;
        }
      } catch (e) {
        console.error('异常' + e)
      }
      return true;
    })
  }
}

function getDistance (dx, dy) {
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

function CanvasDrawer (canvas, paint, offset) {
  this.canvas = canvas
  if (!paint) {
    let Typeface = android.graphics.Typeface
    paint = new Paint()
    paint.setStrokeWidth(1)
    paint.setTypeface(Typeface.DEFAULT_BOLD)
    paint.setTextAlign(Paint.Align.LEFT)
    paint.setAntiAlias(true)
    paint.setStrokeJoin(Paint.Join.ROUND)
    paint.setDither(true)
    paint.setTextSize(30)
  }
  this.paint = paint
  offset = offset || 0

  this.color = '#ffffff'
  this.textSize = 20

  this.drawText = function (text, position, color, textSize) {
    this.color = color || this.color
    this.textSize = textSize || this.textSize
    drawText(text, position, this.canvas, this.paint, this.color, this.textSize)
  }

  this.drawRectAndText = function (text, position, color, textSize) {
    this.color = color || this.color
    this.textSize = textSize || this.textSize
    this.paint.setTextSize(this.textSize)
    drawRectAndText(text, position, this.color, this.canvas, this.paint)
  }

  this.drawCircleAndText = function (text, circleInfo, color, textSize) {
    this.color = color || this.color
    this.textSize = textSize || this.textSize
    this.paint.setTextSize(this.textSize)
    drawCircleAndText(text, circleInfo, this.color, this.canvas, this.paint)
  }

  function convertArrayToRect (a) {
    // origin array left top width height
    // left top right bottom
    return new android.graphics.Rect(a[0], a[1] + offset, (a[0] + a[2]), (a[1] + offset + a[3]))
  }

  function getPositionDesc (position) {
    return position[0] + ', ' + position[1] + ' w:' + position[2] + ',h:' + position[3]
  }

  function getRectCenter (position) {
    return {
      x: parseInt(position[0] + position[2] / 2),
      y: parseInt(position[1] + position[3] / 2)
    }
  }

  function drawRectAndText (desc, position, colorStr, canvas, paint) {
    let color = colors.parseColor(colorStr)

    paint.setStrokeWidth(1)
    paint.setStyle(Paint.Style.STROKE)
    paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
    canvas.drawRect(convertArrayToRect(position), paint)
    paint.setStrokeWidth(1)
    paint.setTextSize(20)
    paint.setStyle(Paint.Style.FILL)
    // 文字背景阴影色
    paint.setARGB(255, 136, 136, 136)
    canvas.drawText(desc, position[0] + 2, position[1] + offset - 2, paint)
    // 为文字设置反色
    paint.setARGB(255, 255 - (color >> 16 & 0xff), 255 - (color >> 8 & 0xff), 255 - (color & 0xff))
    canvas.drawText(desc, position[0], position[1] + offset, paint)
    paint.setTextSize(10)
    paint.setStrokeWidth(1)
    paint.setARGB(255, 0, 0, 0)
  }

  function drawCircleAndText (desc, circleInfo, colorStr, canvas, paint) {
    let color = colors.parseColor(colorStr)

    // 文字背景阴影色
    paint.setARGB(255, 136, 136, 136)
    drawText(desc, { x: circleInfo.x + 2, y: circleInfo.y - 2 }, canvas, paint)
    // 文字反色
    paint.setARGB(255, 255 - (color >> 16 & 0xff), 255 - (color >> 8 & 0xff), 255 - (color & 0xff))
    drawText(desc, { x: circleInfo.x, y: circleInfo.y }, canvas, paint)
    paint.setStrokeWidth(3)
    paint.setStyle(Paint.Style.STROKE)
    paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
    canvas.drawCircle(circleInfo.x, circleInfo.y + offset, circleInfo.radius, paint)
  }

  function drawText (text, position, canvas, paint, colorStr, textSize) {
    textSize = textSize || 20
    paint.setStrokeWidth(1)
    paint.setStyle(Paint.Style.FILL)
    paint.setTextSize(textSize)

    // 文字背景阴影色
    paint.setARGB(255, 136, 136, 136)
    canvas.drawText(text, position.x + 2, position.y + offset - 2, paint)
    if (colorStr) {
      let color = colors.parseColor(colorStr)
      paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
    } else {
      paint.setARGB(255, 0, 0, 255)
    }
    canvas.drawText(text, position.x, position.y + offset, paint)
  }

  function drawCoordinateAxis (canvas, paint) {
    let width = canvas.width
    let height = canvas.height
    paint.setStyle(Paint.Style.FILL)
    paint.setTextSize(10)
    let colorVal = colors.parseColor('#65f4fb')
    paint.setARGB(255, colorVal >> 16 & 0xFF, colorVal >> 8 & 0xFF, colorVal & 0xFF)
    for (let x = 50; x < width; x += 50) {
      paint.setStrokeWidth(0)
      canvas.drawText(x, x, 10 + offset, paint)
      paint.setStrokeWidth(0.5)
      canvas.drawLine(x, 0, x + offset, height, paint)
    }

    for (let y = 50; y < height; y += 50) {
      paint.setStrokeWidth(0)
      canvas.drawText(y, 0, y + offset, paint)
      paint.setStrokeWidth(0.5)
      canvas.drawLine(0, y + offset, width, y + offset, paint)
    }
  }
}