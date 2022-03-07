let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let openCvUtil = require('../lib/OpenCvUtil.js')

commonFunctions.showAllAutoTimedTask()
console.show()
let over2 = /([\d]时)?(\d+)分钟/
let timeWidget = widgetUtils.widgetGetOne(over2)
if (timeWidget) {
  let parent = timeWidget.parent()
  let recycle = widgetUtils.subWidgetGetOne(parent, '收摊')
  if (recycle) {
    toastLog('找到了收摊按钮')
    recycle.click()
  } else {
    toastLog('未找到收摊')
  }
}
