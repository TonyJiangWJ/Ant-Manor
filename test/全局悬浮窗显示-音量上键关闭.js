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
var window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);
let img_path = files.cwd() + "/蚂蚁庄园截图.jpg"
let img_obj = images.read(img_path)
let showBackImg = true
if (!img_obj) {
  toastLog('图像资源不存在，不设置背景:' + img_path)
}
window.setSize(1080, 2160);
window.setTouchable(false)
// 刘海高度偏移量，刘海屏以及挖空屏 悬浮窗无法正常显示，需要施加一个偏移量
let bangOffset = config.bang_offset


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
let converted = false
// 两分钟后自动关闭
let targetEndTime = new Date().getTime() + 120000

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
    if (img_obj) {
      if (showBackImg) {
        paint.setAlpha(50)
        canvas.drawImage(img_obj, 0, bangOffset, paint)
        paint.setAlpha(255)
      }
      paint.setARGB(255, 255, 0, 0)
      drawText('按下音量下键切换是否显示背景，音量上键关闭', { x: 100, y: 180 }, canvas, paint)
    } else {
      paint.setARGB(255, 255, 0, 0)
      paint.setTextSize(25)
      drawText('为了方便调整配置，请截图蚂蚁庄园首页', { x: 100, y: 180 }, canvas, paint)
      drawText('放在test目录下，命名为蚂蚁庄园截图.jpg', { x: 100, y: 205 }, canvas, paint)
    }
    drawRectAndText('判断是否打开APP', config.CHECK_APP_REGION, config.CHECK_APP_COLOR, canvas, paint)
    drawRectAndText('判断是否打开好友页面', config.CHECK_FRIENDS_REGION, config.CHECK_FRIENDS_COLOR, canvas, paint)
    drawRectAndText('判断小鸡是否出门，牌子的区域', config.OUT_REGION, config.OUT_COLOR, canvas, paint)
    drawRectAndText('判断小鸡在好友家，右边的区域', config.OUT_IN_FRIENDS_REGION_RIGHT, config.OUT_IN_FRIENDS_COLOR, canvas, paint)
    drawRectAndText('判断小鸡在好友家，左边的区域', config.OUT_IN_FRIENDS_REGION_LEFT, config.OUT_IN_FRIENDS_COLOR, canvas, paint)
    drawRectAndText('判断偷吃的小鸡，左边的区域', config.LEFT_THIEF_REGION, config.THIEF_COLOR, canvas, paint)
    drawRectAndText('判断左边拳头的区域', config.LEFT_PUNCH_REGION, config.PUNCH_COLOR, canvas, paint)
    drawRectAndText('判断偷吃的小鸡，右边的区域', config.RIGHT_THIEF_REGION, config.THIEF_COLOR, canvas, paint)
    drawRectAndText('判断右边拳头的区域', config.RIGHT_PUNCH_REGION, config.PUNCH_COLOR, canvas, paint)
    drawRectAndText('判断关闭按钮的区域', config.DISMISS_REGION, config.DISMISS_COLOR, canvas, paint)
    drawRectAndText('判断食盆的区域，主要校验是否存在饲料', config.FOOD_REGION, config.FOOD_COLOR, canvas, paint)
    drawRectAndText('判断是否成功使用加速卡的区域', config.SPEED_CHECK_REGION, config.SPEED_CHECK_COLOR, canvas, paint)
    drawRectAndText('星星球的判断区域', config.reco, '#000000', canvas, paint)
    drawRectAndText('判断屎的区域', config.SHIT_CHECK_REGION, config.PICK_SHIT_GRAY_COLOR, canvas, paint)
    drawRectAndText('判断收集屎的区域', config.COLLECT_SHIT_CHECK_REGION, config.COLLECT_SHIT_GRAY_COLOR, canvas, paint)
    drawRectAndText('倒计时识别区域', config.COUNT_DOWN_REGION, '#00FF00', canvas, paint)

    paint.setARGB(255, 0, 0, 255)
    drawText('喂饲料按钮', config.FEED_POSITION, canvas, paint)
    drawText('背包按钮', config.TOOL_POSITION, canvas, paint)
    drawText('加速卡位置', config.SPEED_CARD_POSITION, canvas, paint)
    drawText('确认按钮位置', config.CONFIRM_POSITON, canvas, paint)


    let countdown = (targetEndTime - new Date().getTime()) / 1000
    paint.setTextSize(25)
    paint.setARGB(255, 255, 0, 0)
    drawText('关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 150 }, canvas, paint)
    drawCoordinateAxis(canvas, paint)
    converted = true

  } catch (e) {
    toastLog(e)
    exitAndClean()
  }
});

threads.start(function () {
  toastLog('按音量上键关闭')
  events.removeAllKeyDownListeners('volume_down')
  events.observeKey()
  events.on("key_down", function (keyCode, event) {
    if (keyCode === 24) {
      exitAndClean()
    } else if (keyCode === 25) {
      showBackImg = !showBackImg
    }
  })
})

setTimeout(function () {
  exitAndClean()
}, 120000)