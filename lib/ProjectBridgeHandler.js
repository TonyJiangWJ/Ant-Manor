let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')

module.exports = function (BaseHandler) {
  // 扩展方法 
  BaseHandler.showRealtimeVisualConfig = () => {
    // 不在ui线程启动的话会丢失线程上下文，导致执行异常
    ui.run(function () {
      let source = FileUtils.getCurrentWorkPath() + '/test/全局悬浮窗显示-音量上键关闭.js'
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')) })
    })
  }

  return BaseHandler
}