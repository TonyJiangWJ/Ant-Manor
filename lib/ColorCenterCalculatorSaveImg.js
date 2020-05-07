/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-06 22:16:18
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-06 13:22:12
 * @Description: 
 */
runtime.loadDex('lib/autojs-tools.dex')
importClass(com.tony.BitCheck)
let Stack = require('./Stack.js')
let { config: config } = require('../config.js')(runtime, this)
function convertArrayToRect (a) {
  // origin array left top width height
  // left top right bottom
  return new android.graphics.Rect(a[0], a[1], (a[0] + a[2]), (a[1] + a[3]))
}
function ColorCenterCalculatorSaveImg (img, color, point, threshold) {
  this.checker = null
  this.img = images.copy(images.medianBlur(images.interval(img, color, threshold), 5))
  img.recycle()
  this.point = point
  this.color = color
  this.threshold = threshold
  this.WIDTH = config.device_width
  this.HEIGHT = config.device_height

  this.canvas = null
  this.paint = null
  this.drawImg()

  this.init()


}


ColorCenterCalculatorSaveImg.prototype.drawImg = function () {
  let Typeface = android.graphics.Typeface
  var paint = new Paint()
  paint.setStrokeWidth(1)
  paint.setTypeface(Typeface.DEFAULT_BOLD)
  paint.setTextAlign(Paint.Align.LEFT)
  paint.setAntiAlias(true)
  paint.setStrokeJoin(Paint.Join.ROUND)
  paint.setDither(true)
  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.STROKE)
  let canvas = new com.stardust.autojs.core.graphics.ScriptCanvas(this.img)
  paint.setARGB(255, 0, 255, 0)
  canvas.drawRect(convertArrayToRect([this.point.x - 5, this.point.y - 5, 10, 10]), paint)
  paint.setTextSize(20)
  paint.setStyle(Paint.Style.FILL)
  paint.setARGB(255, 255, 255, 0)
  canvas.drawText(colors.toString(this.img.getBitmap().getPixel(this.point.x, this.point.y)), this.point.x, this.point.y - 20, paint)
  canvas.drawText(images.detectsColor(this.img, '#ffffff', this.point.x, this.point.y, this.threshold) + '', this.point.x, this.point.y - 40, paint)
  
  this.canvas = canvas
  this.paint = paint
}



ColorCenterCalculatorSaveImg.prototype.saveImg = function () {
  this.canvas.toImage().saveTo(files.cwd() + '/i222_img.png')
}

ColorCenterCalculatorSaveImg.prototype.init = function () {
  this.WIDTH = this.WIDTH > 10 ? this.WIDTH : 1080
  this.HEIGHT = this.HEIGHT > 10 ? this.HEIGHT : 2160
  this.checker = new BitCheck(this.HEIGHT << 10 | this.WIDTH)
}


ColorCenterCalculatorSaveImg.prototype.isUnchecked = function (point) {
  return this.checker.isUnchecked(point.y << 10 | point.x)
}

ColorCenterCalculatorSaveImg.prototype.isOutofScreen = function (point) {
  return point.x >= this.WIDTH || point.y >= this.HEIGHT
}

ColorCenterCalculatorSaveImg.prototype.getUncheckedDirectionPoint = function (point, direction) {
  let directPoint = {
    x: point.x + direction[0],
    y: point.y + direction[1]
  }
  if (this.isOutofScreen(directPoint) || !this.isUnchecked(directPoint)) {
    return null
  }
  return directPoint
}

ColorCenterCalculatorSaveImg.prototype.getNearlyPoints = function (point) {
  let directions = [
    [0, -1], [1, 0], [0, 1], [-1, 0]
  ]
  let stack = new Stack()
  stack.push(point)
  this.isUnchecked(point)
  let nearlyPoints = [point]
  let step = 0
  let start = new Date().getTime()
  while (!stack.isEmpty()) {
    let target = stack.peek()
    let allChecked = true
    directions.forEach(direct => {
      let checkItem = this.getUncheckedDirectionPoint(target, direct)
      if (!checkItem) {
        return
      }
      step++
      allChecked = false
      if (images.detectsColor(this.img, '#ffffff', checkItem.x, checkItem.y, this.threshold)) {
        nearlyPoints.push(checkItem)
        this.paint.setARGB(255, 255, 0, 0)
        this.canvas.drawPoint(checkItem.x, checkItem.y, this.paint)
        stack.push(checkItem)
      }
    })
    if (allChecked) {
      stack.pop()
    }
  }
  log('总共检测了' + step + '个点，耗时：' + (new Date().getTime() - start))
  return nearlyPoints
}


ColorCenterCalculatorSaveImg.prototype.getColorRegionCenter = function () {
  let maxX = -1
  let minX = this.WIDTH + 10
  let maxY = -1
  let minY = this.HEIGHT + 10
  let start = new Date().getTime()
  let nearlyPoints = this.getNearlyPoints(this.point)
  this.saveImg()
  if (nearlyPoints && nearlyPoints.length > 1) {
    console.log('同色点个数：' + nearlyPoints.length)
    
    nearlyPoints.forEach(item => {
      maxX = item.x > maxX ? item.x : maxX
      minX = item.x < minX ? item.x : minX
      maxY = item.y > maxY ? item.y : maxY
      minY = item.y < minY ? item.y : minY
    })

    let centerPoint = {
      x: parseInt((maxX + minX) / 2),
      y: parseInt((maxY + minY) / 2),
      same: nearlyPoints.length
    }
    log('得到中心点：' + JSON.stringify(centerPoint))
    log('获取中心点耗时' + (new Date().getTime() - start) + 'ms')
    return centerPoint
  } else {
    log('未找到其他颜色点，直接返回')
    return this.point
  }
}

module.exports = ColorCenterCalculatorSaveImg