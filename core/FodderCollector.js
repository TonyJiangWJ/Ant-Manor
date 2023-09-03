
let { config, storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let automator = singletonRequire('Automator')
let logUtils = singletonRequire('LogUtils')
let localOcr = require('../lib/LocalOcrUtil.js')
let LogFloaty = singletonRequire('LogFloaty')

function Collector () {
  let _this = this
  this.useSimpleForMatchCollect = true
  this.useSimpleForCloseCollect = true

  this.storage = storages.create(storage_name)

  this.imageConfig = config.fodder_config

  this.exec = function () {
    let screen = commonFunctions.captureScreen()
    if (screen) {
      LogFloaty.pushLog('查找领饲料入口')
      let matchResult = this.findCollectEntry(screen)
      if (matchResult) {
        LogFloaty.pushLog('已找到领饲料入口')
        toastLog('找到了领饲料位置' + JSON.stringify(matchResult))
        automator.click(matchResult.centerX(), matchResult.centerY())
        sleep(1000)
        this.collectAllIfExists()
        sleep(1000)
      } else {
        LogFloaty.pushWarningLog('未能找到领饲料入口')
        warnInfo(['未能找到领饲料入口'], true)
      }
      screen.recycle()
    }
  }

  /**
   * 查找领饲料入口
   */
  this.findCollectEntry = function (screen) {
    let originScreen = images.copy(screen)
    if (localOcr.enabled) {
      LogFloaty.pushLog('尝试OCR查找领饲料入口')
      let result = localOcr.recognizeWithBounds(screen, null, '领饲料')
      if (result && result.length > 0) {
        return result[0].bounds
      }
    }
    LogFloaty.pushLog('ocr不支持或未找到，尝试图片查找领饲料位置')
    let matchResult = OpenCvUtil.findByGrayBase64(screen, this.imageConfig.fodder_btn)
    if (!matchResult) {
      // 尝试
      matchResult = OpenCvUtil.findBySIFTBase64(screen, this.imageConfig.fodder_btn)
      this.useSimpleForMatchCollect = false
      logUtils.debugInfo(['找到目标：「{},{}」[{},{}]', matchResult.roundX(), matchResult.roundY(), matchResult.width(), matchResult.height()])
      let template_img_for_collect = images.toBase64(images.clip(originScreen, matchResult.roundX(), matchResult.roundY(), matchResult.width(), matchResult.height()))
      config.overwrite('fodder.fodder_btn', template_img_for_collect)
      logUtils.debugInfo('自动更新图片配置 fodder.fodder_btn')
      logUtils.debugForDev(['自动保存匹配图片：{}', template_img_for_collect])
    }
    if (matchResult) {
      toastLog('找到了领饲料位置' + JSON.stringify(matchResult))
      return matchResult
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

  function collectCurrentVisible() {
    auto.clearCache && auto.clearCache()
    let visiableCollect = widgetUtils.widgetGetAll('^领取$') || []
    let originList = visiableCollect
    if (visiableCollect.length > 0) {
      visiableCollect = visiableCollect.filter(v => v.visibleToUser() && checkIsValid(v))
    }
    if (visiableCollect.length > 0) {
      _this.collected = true
      logUtils.debugInfo(['点击领取'])
      automator.clickCenter(visiableCollect[0])
      sleep(500)
      let full = widgetUtils.widgetGetOne(config.fodder_config.feed_package_full || '饲料袋.*满.*|知道了', 1000)
      if (full) {
        LogFloaty.pushWarningLog('饲料袋已满')
        logUtils.warnInfo(['饲料袋已满'], true)
        automator.back()
        sleep(1000)
        automator.back()
        return false
      }
      return collectCurrentVisible()
    } else {
      _this.collected = false
      logUtils.debugInfo(['可领取控件均无效或不可见：{}', JSON.stringify((() => {
        return originList.map(target => {
          let bounds = target.bounds()
          let visibleToUser = target.visibleToUser()
          return { visibleToUser, x: bounds.left, y: bounds.top, width: bounds.width(), height: bounds.height() }
        })
      })())])
    }
    let allCollect = widgetUtils.widgetGetAll('^领取$')
    return allCollect && allCollect.length > 0
  }

  this.collectAllIfExists = function (lastTotal, findTime) {
    if (findTime >= 5) {
      LogFloaty.pushWarningLog('超过5次未找到可收取控件，退出查找')
      return
    }
    LogFloaty.pushLog('查找 领取 按钮')
    let allCollect = widgetUtils.widgetGetAll('^领取$')
    if (allCollect && allCollect.length > 0) {
      let total = allCollect.length
      if (collectCurrentVisible()) {
        logUtils.logInfo(['滑动下一页查找目标'], true)
        let startY = config.device_height - config.device_height * 0.15
        let endY = startY - config.device_height * 0.3
        automator.gestureDown(startY, endY)
      }
      sleep(500)
      if (!this.collected) {
        findTime = findTime ? findTime : 1
      } else {
        findTime = null
      }
      this.collectAllIfExists(total, findTime ? findTime + 1 : null)
    } else {
      LogFloaty.pushWarningLog('无可领取饲料')
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

/**
 * 判断高度是否符合条件
 *
 * @param {UIObject} target 
 * @returns 
 */
function checkIsValid (target) {
  let bounds = target.bounds()
  if (bounds.height() < 10) {
    logUtils.debugInfo(['控件高度小于10，无效控件'])
    return false
  }
  return true
}

/**
 * @deprecated OCR不准放弃 
 * @param {*} regex 
 * @param {*} target 
 * @param {*} screen 
 * @returns 
 */
function checkOcrText (regex, target, screen) {
  let bounds = target.bounds()
  if (bounds.height() < 10) {
    logUtils.debugInfo(['控件高度小于10，无效控件'])
    return false
  }
  if (!localOcr.enabled) {
    return true
  }
  screen = screen || commonFunctions.checkCaptureScreenPermission()
  if (screen) {
    let region = [bounds.left, bounds.top, bounds.width(), bounds.height()]
    logUtils.debugInfo(['截取图片信息: data:image/png;base64,{}', images.toBase64(images.clip(screen, region[0], region[1], region[2], region[3]))])
    // 进行灰度处理 降低干扰
    screen = images.grayscale(screen)
    logUtils.debugInfo(['校验图片区域文字信息：{}', JSON.stringify(region)])
    let text = localOcr.recognize(screen, region)
    if (text) {
      text = text.replace(/\n/g, '')
      return new RegExp(regex).test(regex)
    }
  }
  return false
}