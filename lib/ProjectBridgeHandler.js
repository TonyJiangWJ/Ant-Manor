let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')
let processShare = singletonRequire('ProcessShare')
let floatyInstance = singletonRequire('FloatyUtil')
let { changeAccount, inspectMainAccountAvatar } = require('../lib/AlipayAccountManage.js')

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
  BaseHandler.showRealtimeVisualConfigVillage = () => {
    // 不在ui线程启动的话会丢失线程上下文，导致执行异常
    ui.run(function () {
      let source = FileUtils.getCurrentWorkPath() + '/test/蚂蚁新村悬浮窗显示-音量上键关闭.js'
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')) })
    })
  }
  BaseHandler.villageConfigChanged = (data) => {
    let newVal = undefined
    let changedConfig = { village_config: {} }
    let changed = false
    Object.keys(data).forEach(key => {
      newVal = data[key]
      if (typeof config.village_config[key] !== 'undefined' && typeof newVal !== 'undefined' && newVal !== config.village_config[key]) {
        changedConfig.village_config[key] = newVal
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

  BaseHandler.changeAlipayAccount = (data, callbackId) => {
    threads.start(function () {
      changeAccount(data.account, null, true)
      floatyInstance.close()
      commonFunctions.minimize()
    })
  }

  BaseHandler.getAvatar = (data, callbackId) => {
    inspectMainAccountAvatar()
    postMessageToWebView({ callbackId: callbackId, data: {} })
  }
  return BaseHandler
}