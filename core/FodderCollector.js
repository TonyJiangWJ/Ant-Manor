
let { config, storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let automator = singletonRequire('Automator')
let logUtils = singletonRequire('LogUtils')

function Collector () {

  this.useSimpleForMatchCollect = true
  this.useSimpleForCloseCollect = true

  this.storage = storages.create(storage_name)

  this.imageConfig = config.fodder_config

  this.exec = function () {
    let screen = commonFunctions.captureScreen()
    if (screen) {
      let originScreen = images.copy(screen)
      let matchResult = OpenCvUtil.findByGrayBase64(screen, this.imageConfig.fodder_btn)
      if (!matchResult) {
        // 尝试
        matchResult = OpenCvUtil.findBySIFTBase64(screen, this.imageConfig.fodder_btn)
        this.useSimpleForMatchCollect = false
      }
      if (matchResult) {
        toastLog('找到了领饲料位置' + JSON.stringify(matchResult))
        automator.click(matchResult.centerX(), matchResult.centerY())
        sleep(1000)
        this.collectAllIfExists()
        sleep(1000)
        if (!this.useSimpleForMatchCollect) {
          logUtils.debugInfo(['找到目标：「{},{}」[{},{}]', matchResult.roundX(), matchResult.roundY(), matchResult.width(), matchResult.height()])
          let template_img_for_collect = images.toBase64(images.clip(originScreen, matchResult.roundX(), matchResult.roundY(), matchResult.width(), matchResult.height()))
          config.overwrite('fodder.fodder_btn', template_img_for_collect)
          logUtils.debugInfo('自动更新图片配置 fodder.fodder_btn')
          logUtils.debugForDev(['自动保存匹配图片：{}', template_img_for_collect])
        }
      }
      screen.recycle()

    }
  }

  this.answerQuestion = function () {
    let toAnswer = widgetUtils.widgetGetOne('去答题')
    if (toAnswer) {
      automator.clickCenter(toAnswer)
      sleep(1000)
      automator.widgetWaiting('题目来源.*')
      // TODO 随机答题
    }
  }

  this.collectAllIfExists = function () {
    let allCollect = widgetUtils.widgetGetAll('^领取$')
    if (allCollect && allCollect.length > 0) {
      logUtils.logInfo(['找到了领取按钮：{}', allCollect.length])
      let allVisiableToUser = true
      allCollect.forEach(collect => {
        logUtils.debugInfo(['可点击收集位置：{} {},{}', collect.visibleToUser(), collect.bounds().centerX(), collect.bounds().centerY()])
        if (collect.visibleToUser()) {
          sleep(200)
          logUtils.debugInfo(['点击领取：'])
          automator.clickCenter(collect)
        } else {
          allVisiableToUser = false
        }
        sleep(500)
      })
      let full = widgetUtils.widgetGetOne(config.fodder_config.feed_package_full || '饲料袋.*满.*|知道了', 1000)
      if (full) {
        logUtils.warnInfo(['饲料袋已满'], true)
        automator.back()
        sleep(1000)
        automator.back()
        return
      }
      if (!allVisiableToUser) {
        logUtils.logInfo(['滑动下一页查找目标'], true)
        let startY = config.device_height - config.device_height * 0.15
        let endY = startY - config.device_height * 0.3
        automator.gestureDown(startY, endY)
      }
      sleep(500)
      this.collectAllIfExists()
    } else {
      logUtils.warnInfo(['无可领取饲料'], true)
      let screen = commonFunctions.captureScreen()
      if (screen) {
        screen = images.copy(images.grayscale(screen), true)
        let originScreen = images.copy(images.cvtColor(screen, "GRAY2BGRA"))
        let matchResult = OpenCvUtil.findByGrayBase64(screen, config.fodder_config.close_interval, true)
        if (!matchResult) {
          matchResult = OpenCvUtil.findBySIFTBase64(screen, config.fodder_config.close_interval)
          this.useSimpleForCloseCollect = false
        }
        if (matchResult) {
          automator.click(matchResult.centerX(), matchResult.centerY())
          if (!this.useSimpleForCloseCollect) {
            let template_img_for_close_collect = images.toBase64(images.clip(originScreen, matchResult.left, matchResult.top, matchResult.width(), matchResult.height()))
            config.overwrite('fodder.close_interval', template_img_for_close_collect)
            logUtils.debugInfo('自动更新图片配置 fodder.close_interval')
            logUtils.debugForDev(['自动保存匹配图片：{}', template_img_for_close_collect])
          }
        } else {
          logUtils.warnInfo(['无法通过图片查找到关闭按钮'])
          automator.back()
        }
        screen.recycle()
      }
    }
  }
}

module.exports = new Collector()