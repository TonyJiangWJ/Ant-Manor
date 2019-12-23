/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-06 23:11:16
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-06 23:19:35
 * @Description: 
 */
let ColorCenterCalculator = require('./lib/ColorCenterCalculator.js')
let FloatyUtil = require('./lib/FloatyUtil.js')
let coinColor = '#e2b201'
let threshold = 50
FloatyUtil.init()
requestScreenCapture(false)
console.show()
while (true) {
  let screen = captureScreen()
  let point = images.findColor(screen, coinColor, {
    region: [170, 890, 890, 500],
    threshold: threshold
  })
  if (point) {
    let calculator = new ColorCenterCalculator(screen, coinColor, point, threshold)
    let center = calculator.getColorRegionCenter()
    FloatyUtil.setFloatyInfo(center, '\'金币')
  }
  sleep(10)
}