/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-06 22:16:18
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-06 23:21:05
 * @Description: 
 */
runtime.loadDex('lib/autojs-tools.dex')
importClass(com.tony.BitCheck)
let Stack = require('./Stack.js')
let config = require('../config.js').config

function ColorCenterCalculator (img, color, point, threshold) {
  this.checker = null
  this.img = img
  this.point = point
  this.color = color
  this.threshold = threshold
  this.WIDTH = config.device_width
  this.HEIGHT = config.device_height

  this.init()
}

ColorCenterCalculator.prototype.init = function () {
  this.WIDTH = this.WIDTH > 10 ? this.WIDTH : 1080
  this.HEIGHT = this.HEIGHT > 10 ? this.HEIGHT : 2160
  this.checker = new BitCheck(this.WIDTH * 10000 + this.HEIGHT)
}


ColorCenterCalculator.prototype.isUnchecked = function (point) {
  return this.checker.isUnchecked(point.x * 10000 + point.y)
}

ColorCenterCalculator.prototype.isOutofScreen = function (point) {
  return point.x >= this.WIDTH || point.y >= this.HEIGHT
}

ColorCenterCalculator.prototype.getUncheckedDirectionPoint = function (point, direction) {
  let directPoint = {
    x: point.x + direction[0],
    y: point.y + direction[1]
  }
  if (this.isOutofScreen(directPoint) || !this.isUnchecked(directPoint)) {
    return null
  }
  return directPoint
}

ColorCenterCalculator.prototype.getNearlyPoints = function (point) {
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
      if (images.detectsColor(this.img, this.color, checkItem.x, checkItem.y, this.threshold)) {
        nearlyPoints.push(checkItem)
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


ColorCenterCalculator.prototype.getColorRegionCenter = function () {
  let maxX = -1
  let minX = this.WIDTH + 10
  let maxY = -1
  let minY = this.HEIGHT + 10
  let nearlyPoints = this.getNearlyPoints(this.point)
  if (nearlyPoints && nearlyPoints.length > 1) {
    console.log('同色点个数：' + nearlyPoints.length)
    let start = new Date().getTime()
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
    log('等到中心点：' + JSON.stringify(centerPoint))
    log('计算中心点耗时' + (new Date().getTime() - start) + 'ms')
    return centerPoint
  } else {
    log('未找到其他颜色点，直接返回')
    return point
  }
}

module.exports = ColorCenterCalculator