/*
 * @Author: TonyJiangWJ
 * @Date: 2020-09-21 18:27:45
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-09-22 13:10:19
 * @Description: 
 */
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let { config } = require('../config.js')(runtime, this)
let window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

window.setSize(config.device_width, config.device_height)
window.setTouchable(false)
window.setPosition(0, 0 + config.bang_offset)

function convertArrayToRect (a) {
  // origin array left top width height
  // left top right bottom
  return new android.graphics.Rect(a[0], a[1], (a[0] + a[2]), (a[1] + a[3]))
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
  canvas.drawText(desc, position[0], position[1], paint)
  paint.setTextSize(10)
  paint.setStrokeWidth(1)
  paint.setARGB(255, 0, 0, 0)
}

function drawText (text, position, canvas, paint) {
  paint.setARGB(255, 0, 0, 255)
  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.FILL)
  canvas.drawText(text, position.x, position.y, paint)
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
    canvas.drawText(x, x, 10, paint)
    paint.setStrokeWidth(0.2)
    canvas.drawLine(x, 0, x, height, paint)
  }

  for (let y = 50; y < height; y += 50) {
    paint.setStrokeWidth(0)
    canvas.drawText(y, 0, y, paint)
    paint.setStrokeWidth(0.2)
    canvas.drawLine(0, y, width, y, paint)
  }
}

let width = config.device_width, height = config.device_height
let centerX = width / 2, centerY = height / 2
function drawLines (canvas, paint) {
  paint.setStyle(Paint.Style.FILL)
  paint.setStrokeWidth(2)
  let colorVal = colors.parseColor('#3b8aef')
  paint.setARGB(255, colorVal >> 16 & 0xFF, colorVal >> 8 & 0xFF, colorVal & 0xFF)
  drawSymmetryLines(canvas, paint, 0)

  colorVal = colors.parseColor('#75f37a')
  paint.setARGB(255, colorVal >> 16 & 0xFF, colorVal >> 8 & 0xFF, colorVal & 0xFF)
  drawSymmetryLines(canvas, paint, 50)

  colorVal = colors.parseColor('#f99247')
  paint.setARGB(255, colorVal >> 16 & 0xFF, colorVal >> 8 & 0xFF, colorVal & 0xFF)
  drawSymmetryLines(canvas, paint, 100)
  drawSymmetryLines(canvas, paint, 130)

  colorVal = colors.parseColor('#ff0000')
  paint.setARGB(255, colorVal >> 16 & 0xFF, colorVal >> 8 & 0xFF, colorVal & 0xFF)
  drawSymmetryLines(canvas, paint, 160)
  drawSymmetryLines(canvas, paint, 185)
}

function drawSymmetryLines(canvas, paint, xOffset) {
  canvas.drawLine(centerX - xOffset, 0, centerX - xOffset, height, paint)
  canvas.drawLine(centerX + xOffset, 0, centerX + xOffset, height, paint)
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

    // 瞄准辅助线
    drawLines(canvas, paint)

    converted = true
  } catch (e) {
    toastLog(e)
    exitAndClean()
  }
});

threads.start(function () {
  toastLog('按音量上键关闭，音量下切换')
  events.removeAllKeyDownListeners('volume_down')
  events.observeKey()
  events.on("key_down", function (keyCode, event) {
    if (keyCode === 24) {
      exitAndClean()
    }
  })
})

setInterval(function () { }, 5000)