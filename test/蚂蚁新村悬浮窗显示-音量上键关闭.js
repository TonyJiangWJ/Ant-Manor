let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let runningSize = runningEngines.length
let currentSource = currentEngine.getSource() + ''
if (runningSize > 1) {
  runningEngines.forEach(engine => {
    let compareEngine = engine
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      engines.myEngine().forceStop()
    }
  })
}
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let processShare = singletonRequire('ProcessShare')
var window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

commonFunctions.requestScreenCaptureOrRestart(false)
// 自动设置刘海偏移量
commonFunctions.autoSetUpBangOffset()
ui.run(function () {
  window.setSize(config.device_width || 1080, config.device_height || 2340)
  window.setTouchable(false)
})
// 刘海高度偏移量，刘海屏以及挖空屏 悬浮窗无法正常显示，需要施加一个偏移量
let bangOffset = config.bang_offset
console.log('订阅文件消息：.region_config_share')
processShare
  // 设置缓冲区大小为4kB
  .setBufferSize(4 * 1024)
  .setInterval(10)
  .loop().subscribe(function (newConfig) {
    console.log('收到了配置变更消息：' + newConfig)
    newConfig = JSON.parse(newConfig)
    Object.keys(newConfig).forEach(key => {
      if (key === 'village_config') {
        Object.keys(newConfig.village_config).forEach(villageKey => {
          if (config.village_config.hasOwnProperty(villageKey)) {
            config.village_config[villageKey] = newConfig.village_config[villageKey]
          }
        })
      } else if (config.hasOwnProperty(key)) {
        config[key] = newConfig[key]
      }
    })
  }, null, '.region_config_share')

let converted = false
// 两分钟后自动关闭
let targetEndTime = new Date().getTime() + 120000
let showCoordinate = true

window.canvas.on("draw", function (canvas) {
  try {
    // 清空内容
    canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR);
    var width = canvas.getWidth()
    var height = canvas.getHeight()
    if (!converted) {
      toastLog('画布大小：' + width + ', ' + height)
    }
    // let canvas = new com.stardust.autojs.core.graphics.ScriptCanvas(width, height)
    let Typeface = android.graphics.Typeface
    var paint = new Paint()
    paint.setStrokeWidth(1)
    paint.setTypeface(Typeface.DEFAULT_BOLD)
    paint.setTextAlign(Paint.Align.LEFT)
    paint.setAntiAlias(true)
    paint.setStrokeJoin(Paint.Join.ROUND)
    paint.setDither(true)
    paint.setTextSize(20)
    /**
     
    booth_position_left: [193, 1659, 436, 376],
    booth_position_right: [629, 1527, 386, 282],
    village_reward_click_x: 550,
    village_reward_click_y: 1180,
     */
    drawRectAndText('左侧小摊检测区域', config.village_config.booth_position_left, '#00ff00', canvas, paint)
    drawRectAndText('右侧小摊检测区域', config.village_config.booth_position_right, '#00ff00', canvas, paint)

    paint.setTextSize(20)
    paint.setARGB(255, 0, 0, 255)
    drawText('收币点击位置', wrapPosition(config.village_config.village_reward_click_x, config.village_config.village_reward_click_y), canvas, paint)
    drawText('左侧驱赶点击位置', convertRegionPoint(config.village_config.booth_position_left), canvas, paint)
    drawText('右侧驱赶点击位置', convertRegionPoint(config.village_config.booth_position_right), canvas, paint)

    let countdown = (targetEndTime - new Date().getTime()) / 1000
    paint.setTextSize(25)
    paint.setARGB(255, 255, 0, 0)
    drawText('刘海偏移量：' + bangOffset + ' 关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 150 }, canvas, paint)
    showCoordinate && drawCoordinateAxis(canvas, paint)
    converted = true

  } catch (e) {
    toastLog(e)
    commonFunctions.printExceptionStack(e)
    exitAndClean()
  }
});
function wrapPosition (x, y) {
  return { x: x, y: y }
}
function convertRegionPoint (region) {
  var r = new org.opencv.core.Rect(region[0], region[1], region[2], region[3])
  return wrapPosition(r.x + r.width / 2, r.y + r.height * 0.2)
}

threads.start(function () {
  toastLog('按音量上键关闭')
  events.removeAllKeyDownListeners('volume_down')
  events.observeKey()
  events.on("key_down", function (keyCode, event) {
    if (keyCode === 24) {
      exitAndClean()
    } else if (keyCode === 25) {
      showCoordinate = !showCoordinate
    }
  })
})

setTimeout(function () {
  exitAndClean()
}, 120000)

// ---


function convertArrayToRect (a) {
  // origin array left top width height
  // left top right bottom
  return new android.graphics.Rect(a[0], a[1] + bangOffset, (a[0] + a[2]), (a[1] + bangOffset + a[3]))
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
  // 反色
  paint.setARGB(255, 255 - (color >> 16 & 0xff), 255 - (color >> 8 & 0xff), 255 - (color & 0xff))
  canvas.drawRect(convertArrayToRect(position), paint)
  paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  paint.setStrokeWidth(1)
  paint.setTextSize(20)
  paint.setStyle(Paint.Style.FILL)
  canvas.drawText(desc, position[0], position[1] + bangOffset, paint)
  paint.setTextSize(10)
  paint.setStrokeWidth(1)
  paint.setARGB(255, 0, 0, 0)
  let center = getRectCenter(position)
  canvas.drawText(getPositionDesc(position), center.x, center.y + bangOffset, paint)
}

function drawText (text, position, canvas, paint) {
  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.FILL)
  canvas.drawText(text, position.x, position.y + bangOffset, paint)
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
    canvas.drawText(x, x, 10 + bangOffset, paint)
    paint.setStrokeWidth(0.2)
    canvas.drawLine(x, 0 + bangOffset, x, height + bangOffset, paint)
  }

  for (let y = 50; y < height; y += 50) {
    paint.setStrokeWidth(0)
    canvas.drawText(y, 0, y + bangOffset, paint)
    paint.setStrokeWidth(0.2)
    canvas.drawLine(0, y + bangOffset, width, y + bangOffset, paint)
  }
}

function exitAndClean () {
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
  }
  exit()
}