/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-06 23:11:16
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-07 00:42:24
 * @Description: 
 */

runtime.loadDex('./lib/color-region-center.dex')
importClass(com.tony.ColorCenterCalculatorWithInterval)
let FloatyUtil = require('./lib/prototype/FloatyUtil.js')
let coinColor = '#fee651'
let threshold = 50
FloatyUtil.init()
requestScreenCapture(false)
// console.show()
let start = new Date().getTime()
let findPoint = null
while (true) {
  let screen = captureScreen()
  let blurIntervalImg = images.medianBlur(images.interval(images.copy(screen), coinColor, 10), 5)
  if (new Date().getTime() - start > 2000) {
    images.save(blurIntervalImg, files.cwd() + '/blurIntervalImg.png')
    start = new Date().getTime()
  }
  let point = images.findColor(blurIntervalImg, '#ffffff', {
    region: [170, 890, 890, 500],
    threshold: threshold
  })
  if (point) {
    let calculator = new ColorCenterCalculatorWithInterval(images.copy(blurIntervalImg), 0, point.x, point.y)
    findPoint = point
    let center = calculator.getCenterPoint()
    calculator.getImg().recycle()
    FloatyUtil.setFloatyInfo(center, '\'金币')
  }
  if (screen) {
    screen.recycle()
  }
  sleep(10)
}