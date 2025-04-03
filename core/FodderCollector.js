
let { config, storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let automator = singletonRequire('Automator')
let logUtils = singletonRequire('LogUtils')
let localOcr = require('../lib/LocalOcrUtil.js')
let LogFloaty = singletonRequire('LogFloaty')
let YoloDetection = singletonRequire('YoloDetectionUtil')
let NotificationHelper = singletonRequire('Notification')
let AiUtil = require('../lib/AIRequestUtil.js')
let yoloTrainHelper = singletonRequire('YoloTrainHelper')

function Collector () {
  let _this = this
  let collectBtnContetRegex = /.*领取\d+克饲料.*/
  this.useSimpleForMatchCollect = true
  this.useSimpleForCloseCollect = true

  this.storage = storages.create(storage_name)

  this.imageConfig = config.fodder_config

  this.exec = function (taskLimit) {
    this.currentVolume = device.getMusicVolume()
    LogFloaty.pushLog('当前音量：' + this.currentVolume + ' 设置为静音')
    device.setMusicVolume(0)

    function resetMusicVolume () {
      if (_this.reseted) {
        return
      }
      LogFloaty.pushLog('恢复音量：' + _this.currentVolume + ' 取消静音')
      device.setMusicVolume(_this.currentVolume)
      _this.reseted = true
    }

    commonFunctions.registerOnEngineRemoved(resetMusicVolume, 'reset_volume')
    try {
      if (this.openCollectFood()) {
        sleep(1000)
        this.doDailyTasks(taskLimit)
        LogFloaty.pushLog('每日任务执行完毕，开始收集可收取饲料')
        this.collectAllIfExists()
        sleep(1000)
      } else {
        LogFloaty.pushWarningLog('未能找到领饲料入口')
        warnInfo(['未能找到领饲料入口'], true)
      }
    } finally {
      resetMusicVolume()
    }
  }

  this.openCollectFood = function (recheck) {
    let screen = commonFunctions.captureScreen()
    if (screen) {
      LogFloaty.pushLog('查找领饲料入口')
      let matchResult = this.findCollectEntry(screen)
      if (matchResult) {
        LogFloaty.pushLog('已找到领饲料入口')
        debugInfo('找到了领饲料位置' + JSON.stringify(matchResult))
        automator.click(matchResult.centerX(), matchResult.centerY())
        sleep(1000)
        if (!widgetUtils.widgetGetOne('第.*天', 2000)) {
          LogFloaty.pushLog('未能找到领饲料界面信息, 可能并没有打开领饲料界面')
          if (!recheck) {
            return this.openCollectFood(true)
          }
        }
        // 没找到关闭按钮的话也至少点击了两次 当做打开了吧
        return true
      }
    } else {
      LogFloaty.pushErrorLog('截图失败，无法校验领饲料按钮')
      return false
    }
  }

  /**
   * 查找领饲料入口
   */
  this.findCollectEntry = function (screen) {
    let originScreen = images.copy(screen)
    if (YoloDetection.enabled) {
      LogFloaty.pushLog('尝试YOLO查找领饲料入口')
      let result = YoloDetection.forward(screen, { confidence: 0.7, labelRegex: 'collect_food' })
      if (result && result.length > 0) {
        let { x, y, width, height } = result[0]
        LogFloaty.pushLog('Yolo找到：领饲料入口')
        return {
          x: x, y: y,
          centerX: () => x,
          centerY: () => y
        }
      }
    }
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
      if (matchResult) {
        logUtils.debugInfo(['找到目标：「{},{}」[{},{}]', matchResult.roundX(), matchResult.roundY(), matchResult.width(), matchResult.height()])
        let template_img_for_collect = images.toBase64(images.clip(originScreen, matchResult.roundX(), matchResult.roundY(), matchResult.width(), matchResult.height()))
        config.overwrite('fodder.fodder_btn', template_img_for_collect)
        logUtils.debugInfo('自动更新图片配置 fodder.fodder_btn')
        logUtils.debugForDev(['自动保存匹配图片：{}', template_img_for_collect])
      }
    }
    if (matchResult) {
      toastLog('找到了领饲料位置' + JSON.stringify(matchResult))
      return matchResult
    }
  }

  this.doDailyTasks = function (taskLimit) {
    let taskCount = 0;
    [
      // 答题
      () => this.answerQuestion(),
      // 小视频
      () => this.watchVideo(),
      // 逛一逛
      () => this.browseAds(),
      // 抽抽乐
      () => this.luckyDraw(),
      // 农场逛一逛
      () => this.farmHanging(),
      // 鲸探
      () => this.feedFish(),
      // 扭蛋
      () => this.openGashapon(),
      // 做饭领食材，消耗60领90 不是很必要，可以通过做饭领食材完成
      // 通用任务 通过正则表达式判断标题 正则由用户输入，可能导致任务失败
      () => this.doCommonTaskByTitle(taskCount, taskLimit),
    ].forEach(taskExecutor => {
      if (taskLimit && taskLimit > 0) {
        if (taskCount > taskLimit) {
          return
        }
      }
      if (taskExecutor()) {
        taskCount++
        LogFloaty.pushLog('当前执行成功的任务数量：' + taskCount)
      }
    })

  }

  function checkAndEnter (targetWidget, targetText) {
    if (!targetWidget) {
      return null
    }
    targetText = targetText || '去完成'
    let widgetText = targetWidget.text() || ''
    if (widgetText.indexOf(targetText) > -1) {
      targetWidget.click()
      return true
    }
    return false
  }

  this.feedFish = function () {
    LogFloaty.pushLog('检查鲸探喂鱼任务')
    return findAndOpenTaskPage('.*鲸探喂鱼.*', '去喂鱼', (({ enter }) => {
      if (enter) {
        sleep(1000)
        widgetUtils.widgetCheck('.*(喂鱼按钮|鱼食).*', 5000)
        let feedBtn = widgetUtils.widgetGetOne('.*(喂鱼按钮).*', 1000)
        if (feedBtn) {
          automator.clickCenter(feedBtn)
          LogFloaty.pushLog('点击喂食')
          sleep(1000)
          let confirm = widgetUtils.widgetGetOne('喂鱼', 2000)
          if (confirm) {
            LogFloaty.pushLog('点击喂鱼')
            automator.clickCenter(confirm)
            sleep(1000)
          }
          this.checkAndBack()
          return true
        } else {
          LogFloaty.pushErrorLog('未能找到喂食按钮，任务执行失败')
        }
        this.checkAndBack()
        return false
      } else {
        LogFloaty.pushWarningLog('未能进入鲸探')
      }
    }))
  }

  this.openGashapon = function () {
    LogFloaty.pushLog('检查开扭蛋任务')
    return findAndOpenTaskPage('.*开扭蛋.*', null, (({ enter }) => {
      if (enter) {
        let executeSuccess = false
        sleep(1000)
        widgetUtils.widgetCheck('每日签到', 5000)
        let signBtn = widgetUtils.widgetGetOne('领取', 1000)
        if (signBtn) {
          automator.clickCenter(signBtn)
          LogFloaty.pushLog('点击签到')
          sleep(1000)
        } else {
          LogFloaty.pushErrorLog('未能找到签到按钮')
        }
        let executeBtn = widgetUtils.widgetGetOne('还有[1-9]+个', 1000)
        if (executeBtn) {
          automator.clickCenter(executeBtn)
          LogFloaty.pushLog('执行抽扭蛋')
          executeSuccess = true
          sleep(1000)
        } else {
          LogFloaty.pushErrorLog('未找到抽扭蛋按钮')
        }
        this.checkAndBack()
        return executeSuccess
      }
    }))
  }

  this.doCommonTaskByTitle = function (executedCount, executeLimit) {
    let taskListStr = config.fodder_config.fodder_task_list || '信用卡账单|百度地图|快手|淘宝视频|今日头条极速版|淘宝特价版|闲鱼|菜鸟|支付宝运动|助农专场|淘宝芭芭农场'
    let titleRegex = new RegExp('.*(' + taskListStr + ').*去完成.*')
    let executed = false
    let skipTitles = []
    do {
      if (executedCount >= executeLimit) {
        return
      }
      executed = false
      let taskSuccess = findAndOpenTaskPage(titleRegex, null, result => {
        if (result.enter) {
          LogFloaty.pushLog('等待进入通用任务界面:' + (result.title.text() || result.title.desc()))
          skipTitles.push(result.title.text() || result.title.desc())
          let limit = 20
          LogFloaty.pushLog('等待界面加载' + limit + 's')
          while (limit-- > 0) {
            LogFloaty.replaceLastLog('等待界面加载' + limit + 's')
            sleep(1000)
          }
          if (this.checkAndBack()) {
            executed = true
          } else {
            LogFloaty.pushErrorLog('执行任务后无法成功打开领饲料界面，退出执行')
          }
        } else {
          LogFloaty.pushLog('未能找到更多的通用任务')
        }
      }, e => {
        LogFloaty.pushWarningLog('未能找到通用任务入口: ' + e)
      }, skipTitles)
      if (taskSuccess) {
        executedCount++
      }
    } while (executed)
  }

  this.checkAndBack = function () {

    LogFloaty.pushLog('返回领饲料界面')
    automator.back()
    sleep(1000)
    let retry = 3
    while (!widgetUtils.widgetCheck('饲料任务', 1000) && retry-- > 0) {
      LogFloaty.pushWarningLog('未能找到关键控件，尝试返回')
      automator.back()
      sleep(1000)
    }
    if (!widgetUtils.widgetCheck('饲料任务', 3000)) {
      LogFloaty.pushErrorLog('返回领饲料界面失败，尝试重新打开')
      require('../core/AntManorRunner.js').launchApp()
      if (this.openCollectFood()) {
        return true
      }
    } else {
      return true
    }
    return false
  }

  this.answerQuestion = function () {
    let executed = false
    LogFloaty.pushLog('查找答题')
    let toAnswer = widgetUtils.widgetGetOne('.*去答题.*', 2000)
    let ai_type = config.ai_type || 'kimi'
    let kimi_api_key = config.kimi_api_key
    let chatgml_api_key = config.chatgml_api_key
    if (toAnswer) {
      toAnswer.click()
      sleep(1000)
      widgetUtils.widgetWaiting('题目来源.*')
      sleep(1000)
      let key = ai_type === 'kimi' ? kimi_api_key : chatgml_api_key
      if (!key) {
        LogFloaty.pushLog('推荐去KIMI开放平台申请API Key并在可视化配置中进行配置')
        LogFloaty.pushLog('否则免费接口这个智障AI经常性答错')
      }
      let result = AiUtil.getQuestionInfo(ai_type, key)
      if (result) {
        LogFloaty.pushLog('答案解释：' + result.describe)
        LogFloaty.pushLog('答案坐标：' + JSON.stringify(result.target))
        automator.click(result.target.x, result.target.y)
        executed = true
      } else {
        NotificationHelper.createNotification('蚂蚁庄园答题失败', '今日脚本自动答题失败，请手动处理')
      }
      sleep(1000)
      // TODO 随机答题
      this.checkAndBack()
    } else {
      LogFloaty.pushWarningLog('未找到答题入口')
    }
    return executed
  }

  this.watchVideo = function () {
    LogFloaty.pushLog('查找看视频')
    return findAndOpenTaskPage('.*庄园小视频.*', null, ({ enter }) => {
      if (enter) {
        sleep(1000)
        LogFloaty.pushLog('看视频 等待倒计时结束')
        let limit = 20
        while (limit-- > 0) {
          sleep(1000)
          LogFloaty.replaceLastLog('看视频 等待倒计时结束 剩余：' + limit + 's')
        }
        this.checkAndBack()
        return true
      } else {
        LogFloaty.pushLog('今日视频已观看')
      }
      return false
    }, () => {
      LogFloaty.pushErrorLog('未找到看视频入口')
    })
  }


  this.browseAds = function () {
    LogFloaty.pushLog('准备逛杂货铺')
    return findAndOpenTaskPage('.*去杂货铺逛一逛.*', null, ({ enter }) => {
      if (enter) {
        sleep(1000)
        LogFloaty.pushLog('去杂货铺逛一逛 等待倒计时结束')
        let limit = 15
        while (limit-- > 0) {
          sleep(1000)
          LogFloaty.replaceLastLog('去杂货铺逛一逛 等待倒计时结束 剩余：' + limit + 's')
          if (limit % 2 == 0) {
            automator.randomScrollDown()
          } else {
            automator.randomScrollUp()
          }
        }
        if (!widgetUtils.widgetGetOne('已完成 可领饲料', 1000)) {
          LogFloaty.pushLog('去杂货铺逛一逛结束，但未找到完成控件，重新向上滑动')
          let limit = 11
          while (limit-- > 0) {
            LogFloaty.replaceLastLog('去杂货铺逛一逛 等待倒计时结束 剩余：' + limit + 's')
            if (limit % 2 == 0) {
              automator.randomScrollUp()
            } else {
              automator.randomScrollDown()
            }
            if (widgetUtils.widgetGetOne('已完成 可领饲料', 1000)) {
              break
            }
          }
        }
        this.checkAndBack()
        return true
      } else {
        LogFloaty.pushLog('今日广告逛完')
      }
    }, () => {
      LogFloaty.pushErrorLog('未找到杂货铺入口')
    })
  }

  this.luckyDraw = function () {
    LogFloaty.pushLog('准备抽奖')
    return findAndOpenTaskPage('.*抽抽乐.*', null, ({ enter }) => {
      if (enter) {
        sleep(1000)
        LogFloaty.pushLog('抽抽乐 查找领取')
        let collect = widgetUtils.widgetGetOne('领取')
        if (collect) {
          automator.clickCenter(collect)
          sleep(1000)
          let clickBtn = widgetUtils.widgetGetOne('还剩\\d次机会')
          if (clickBtn) {
            automator.clickCenter(clickBtn)
            LogFloaty.pushLog('抽抽乐 等待抽奖结束')
            sleep(3000)
          }
        }
        this.checkAndBack()
        return true
      } else {
        LogFloaty.pushLog('今日抽奖已完成')
      }
    }, () => {
      LogFloaty.pushErrorLog('未找到抽抽乐入口')
    })
  }


  this.farmHanging = function () {
    LogFloaty.pushLog('准备芭芭农场逛一逛')
    return findAndOpenTaskPage('.*去芭芭农场逛一逛.*', null, ({ enter }) => {
      if (enter) {
        sleep(1000)
        LogFloaty.pushLog('等待进入芭芭农场')
        widgetUtils.widgetWaiting('任务列表')
        sleep(1000)
        this.checkAndBack()
        return true
      } else {
        LogFloaty.pushLog('今日芭芭农场逛一逛已完成')
      }
    }, () => {
      LogFloaty.pushErrorLog('未找到芭芭农场逛一逛入口')
    })
  }

  function findAndOpenTaskPage (titleRegex, btnText, callback, errorCallback, skipTitles) {
    btnText = btnText || '去完成'
    let title = widgetUtils.widgetGetOne(titleRegex, 2000, null, null, matcher => {
      // 避免单个任务重复
      if (skipTitles && skipTitles.length > 0) {
        return matcher.filter(node => !!node && skipTitles.indexOf(node.desc() || node.text()) < 0)
      } else {
        return matcher
      }
    })
    let checkResult = checkAndEnter(title, btnText)
    if (checkResult) {
      sleep(1000)
      return callback({ enter: true, title: title })
    } else {
      if (checkResult == null) {
        if (typeof errorCallback == 'function') {
          errorCallback('未能找到：' + titleRegex)
        } else {
          LogFloaty.pushErrorLog('未能找到：' + titleRegex)
        }
      } else {
        callback({ enter: false })
      }
      return false
    }
  }

  /**
   * 
   * @deprecated 当前直接通过clickable控件点击即可
   * 点击当前可见的领取控件，直到领取完成
   * @param {number} tryTime - 尝试次数
   * @returns {boolean} 是否成功领取
   */
  function collectCurrentVisible (tryTime) {
    tryTime = tryTime || 0
    if (tryTime > 10) {
      logUtils.warnInfo(['循环领取超过10次 可能页面卡死 直接退出'])
      _this.collected = false
      return false
    }
    auto.clearCache && auto.clearCache()
    let visiableCollect = widgetUtils.widgetGetAll(collectBtnContetRegex) || []
    let originList = visiableCollect
    if (visiableCollect.length > 0) {
      visiableCollect = visiableCollect.filter(v => v.visibleToUser() && checkIsValid(v))
    }
    if (visiableCollect.length > 0) {
      _this.collected = true
      logUtils.debugInfo(['点击领取'])
      // TODO 确保按钮可见
      automator.clickCenter(visiableCollect[0])
      sleep(500)
      let full = widgetUtils.widgetGetOne(config.fodder_config.feed_package_full || '饲料袋.*满.*|知道了', 1000)
      if (full) {
        LogFloaty.pushWarningLog('饲料袋已满')
        logUtils.warnInfo(['饲料袋已满'], true)
        _this.food_is_full = true
        let confirmBtn = widgetUtils.widgetGetOne('知道了', 1000)
        if (confirmBtn) {
          automator.clickCenter(confirmBtn)
          sleep(1000)
          return false
        }
        let closeIcon = className('android.widget.Image').depth(18).findOne(1000)
        if (closeIcon) {
          yoloTrainHelper.saveImage(commonFunctions.captureScreen(), '关闭按钮', 'close_icon')
          automator.clickCenter(closeIcon)
          sleep(1000)
        }
        return false
      }
      return collectCurrentVisible(tryTime + 1)
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
    let allCollect = widgetUtils.widgetGetAll(collectBtnContetRegex)
    return allCollect && allCollect.length > 0
  }

  this.collectAllIfExists = function () {
    LogFloaty.pushLog('查找 领取 按钮')
    let allCollect = widgetUtils.widgetGetAll(collectBtnContetRegex)
    if (allCollect && allCollect.length > 0) {
      for (let i = 0; i < allCollect.length; i++) {
        allCollect[i].click()
        if (this.checkIsFull()) {
          break
        }
      }
    }
    this.closeFoodCollection()
  }

  this.checkIsFull = function () {
    let full = widgetUtils.widgetGetOne(config.fodder_config.feed_package_full || '饲料袋.*满.*|知道了', 1000)
    if (full) {
      LogFloaty.pushWarningLog('饲料袋已满')
      logUtils.warnInfo(['饲料袋已满'], true)
      _this.food_is_full = true
      let confirmBtn = widgetUtils.widgetGetOne('知道了', 1000)
      if (confirmBtn) {
        automator.clickCenter(confirmBtn)
        sleep(1000)
        return true
      }
      let closeIcon = className('android.widget.Image').depth(18).findOne(1000)
      if (closeIcon) {
        yoloTrainHelper.saveImage(commonFunctions.captureScreen(), '关闭按钮', 'close_icon')
        automator.clickCenter(closeIcon)
        sleep(1000)
      }
      return true
    }
    return false
  }

  this.closeFoodCollection = function () {
    LogFloaty.pushWarningLog('无可领取饲料')
    logUtils.warnInfo(['无可领取饲料'], true)
    if (YoloDetection.enabled) {
      let result = YoloDetection.forward(commonFunctions.captureScreen(), { confidence: 0.7, labelRegex: 'close_btn' })
      if (result && result.length > 0) {
        LogFloaty.pushLog('通过yolo找到了关闭按钮')
        automator.click(result[0].x, result[0].y)
      } else {
        LogFloaty.pushWarningLog('无法通过yolo查找到关闭按钮')
        logUtils.warnInfo(['无法通过yolo查找到关闭按钮'])
        automator.back()
      }
    } else {
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