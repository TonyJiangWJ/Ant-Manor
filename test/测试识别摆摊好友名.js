let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
config.save_log_file = false
let _commonFunctions = singletonRequire('CommonFunction')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog } = singletonRequire('LogUtils')
let FloatyInstance = singletonRequire('FloatyUtil')
let paddleOcr = singletonRequire('PaddleOcrUtil')
let widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let FileUtils = singletonRequire('FileUtils')
let openCvUtil = require('../lib/OpenCvUtil.js')
if (!FloatyInstance.init()) {
  errorInfo('初始化悬浮窗失败')
}

let avatarList = widgetUtils.widgetGetAll('avatar')
if (avatarList && avatarList.length > 0) {
  let friendsHasEmpty = []
  avatarList.forEach(avatar => {
    let lineContainer = avatar.parent().parent()
    let nameWidget = lineContainer.child(1)
    let name = nameWidget.desc() || nameWidget.text()
    debugInfo(['好友名称：{}', name])
    let childCount = lineContainer.childCount()
    debugInfo(['child count: {}', childCount])
    let coinPerHourText
    if (childCount > 5) {
      coinPerHourText = lineContainer.child(4).desc() || lineContainer.child(4).text()
    } else {
      coinPerHourText = lineContainer.child(3).desc() || lineContainer.child(3).text()
    }
    debugInfo(['产币速度：{}', coinPerHourText])
    let regex = /(\d+).*/
    let result = regex.exec(coinPerHourText)
    if (childCount > 5 && result != null && result.length > 0) {
      friendsHasEmpty.push({
        name: name,
        speed: parseInt(result[1]),
        // container: lineContainer
      })
    }
  })
  friendsHasEmpty = friendsHasEmpty.sort((a,b) => b.speed - a.speed)
  debugInfo(['可摆摊好友列表：{}', JSON.stringify(friendsHasEmpty)])
} else {
  warnInfo('无可邀请好友', true)
}
// console.show()