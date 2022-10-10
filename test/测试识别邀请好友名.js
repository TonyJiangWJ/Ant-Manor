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

widgetUtils.widgetWaiting('邀请.*摆摊', null, 3000)
let avatarList = widgetUtils.widgetGetAll('avatar')
if (avatarList && avatarList.length > 0) {
  let invited = false
  let lastIndex = -1
  avatarList.forEach(avatar => {
    if (invited) {
      return
    }
    let index = avatar.indexInParent()
    let nameWidget = avatar.parent().child(index + 1)
    let name = nameWidget.desc() || nameWidget.text()
    let inviteBtnContainer = avatar.parent().child(index + 3)
    if (inviteBtnContainer.childCount() > 0) {
      let inviteBtn = inviteBtnContainer.child(0)
      let inviteText = inviteBtn.text() || inviteBtn.desc()
      if (inviteText !== '直接邀请摆摊') {
        debugInfo(['好友：{} 不能邀请：{}', name, inviteText])
        return
      }
      if (typeof villageConfig != 'undefined' && villageConfig.booth_black_list && villageConfig.booth_black_list.length > 0) {
        if (villageConfig.booth_black_list.indexOf(name) > -1) {
          debugInfo(['{} 在黑名单中 跳过邀请', name])
          return
        }
      }
      debugInfo(['邀请好友「{}」', name], true)
    } else {
      inviteBtnContainer = avatar.parent().child(index + 2)
      if (inviteBtnContainer.childCount() > 0) {
        let inviteBtn = inviteBtnContainer.child(0)
        inviteText = inviteBtn.text() || inviteBtn.desc()
        debugInfo(['好友[{}]不能邀请：{}', name, inviteText])
      }
      return
    }
    // invited = true
  })
} else {
  warnInfo('无可邀请好友', true)
}
// console.show()