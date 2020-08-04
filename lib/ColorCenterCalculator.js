/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-06 22:16:18
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-04 23:44:40
 * @Description: 
 */
let resolver = require('../lib/AutoJSRemoveDexResolver.js')
resolver()
runtime.loadDex('lib/autojs-tools.dex')
importClass(com.tony.BitCheck)
resolver()
let Stack = require('./Stack.js')
let Queue = require('./Queue.js')
let { config: config } = require('../config.js')(runtime, this)

function ColorCenterCalculator (img, color, point, threshold, useBfs) {
  this.checker = null
  this.img = images.copy(images.medianBlur(images.interval(img, color, threshold), 5))
  img.recycle()
  this.point = point
  this.color = color
  this.threshold = threshold
  this.WIDTH = config.device_width
  this.HEIGHT = config.device_height
  this.useBfs = useBfs

  this.init()
}

ColorCenterCalculator.prototype.init = function () {
  this.WIDTH = this.WIDTH > 10 ? this.WIDTH : 1080
  this.HEIGHT = this.HEIGHT > 10 ? this.HEIGHT : 2160
  this.checker = new BitCheck(this.HEIGHT << 10 | this.WIDTH)
}


ColorCenterCalculator.prototype.isUnchecked = function (point) {
  return this.checker.isUnchecked(point.y << 10 | point.x)
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
  if (this.useBfs) {
    log('use bfs')
    return this.getNearlyPointsBfs(point)
  } else {
    log('use dfs')
    return this.getNearlyPointsDfs(point)
  }
}

ColorCenterCalculator.prototype.getNearlyPointsDfs = function (point) {
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
      if (this.img.getBitmap().getPixel(checkItem.x, checkItem.y) & 0xFFFFFF === 0xFFFFFF) {
        nearlyPoints.push(checkItem)
        stack.push(checkItem)
      }
    })
    if (allChecked) {
      stack.pop()
    }
  }
  log('dfs 总共检测了' + step + '个点，耗时：' + (new Date().getTime() - start) + 'ms')
  return nearlyPoints
}


ColorCenterCalculator.prototype.getNearlyPointsBfs = function (point) {
  let directions = [
    [0, -1], [1, 0], [0, 1], [-1, 0]
  ]
  let queue = new Queue()
  queue.enqueue(point)
  this.isUnchecked(point)
  let nearlyPoints = [point]
  let step = 0
  let start = new Date().getTime()
  
  while (!queue.isEmpty()) {
    let target = queue.dequeue()
    directions.forEach(direct => {
      let checkItem = this.getUncheckedDirectionPoint(target, direct)
      if (!checkItem) {
        return
      }
      step++
      if (this.img.getBitmap().getPixel(checkItem.x, checkItem.y) & 0xFFFFFF === 0xFFFFFF) {
        nearlyPoints.push(checkItem)
        queue.enqueue(checkItem)
      }
    })
  }
  log('bfs 总共检测了' + step + '个点，耗时：' + (new Date().getTime() - start) + 'ms')
  return nearlyPoints
}


ColorCenterCalculator.prototype.getColorRegionCenter = function () {
  let maxX = -1
  let minX = this.WIDTH + 10
  let maxY = -1
  let minY = this.HEIGHT + 10
  let start = new Date().getTime()
  let nearlyPoints = this.getNearlyPoints(this.point)
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

module.exports = ColorCenterCalculator