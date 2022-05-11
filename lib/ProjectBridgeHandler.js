let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')
let processShare = singletonRequire('ProcessShare')

module.exports = function (BaseHandler) {
  // 扩展方法 
  BaseHandler.showRealtimeVisualConfig = () => {
    // 不在ui线程启动的话会丢失线程上下文，导致执行异常
    ui.run(function () {
      let source = FileUtils.getCurrentWorkPath() + '/test/全局悬浮窗显示-音量上键关闭.js'
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')) })
    })
  }

  BaseHandler.colorRegionConfigChanged = (data) => {
    let newVal = undefined
    let changedConfig = {}
    let changed = false
    Object.keys(data).forEach(key => {
      newVal = data[key]
      if (typeof config[key] !== 'undefined' && typeof newVal !== 'undefined' && newVal !== config[key]) {
        changedConfig[key] = newVal
        changed = true
      }
    })
    if (!changed) {
      return
    }
    processShare
      // 设置缓冲区大小为4kB
      .setBufferSize(4 * 1024)
      .postInfo(JSON.stringify(changedConfig), '.region_config_share')
  }

  return BaseHandler
}