let { config } = require('../config.js')
let { commonFunctions } = require('./CommonFunction.js')


/**
 * 校验控件是否存在，并打印相应日志
 * @param {String} contentVal 控件文本
 * @param {String} position 日志内容 当前所在位置是否成功进入
 * @param {Number} timeoutSetting 超时时间 默认为config.timeout_existing
 */
const widgetWaiting = function (contentVal, position, timeoutSetting) {
  position = position || contentVal
  let waitingSuccess = widgetCheck(contentVal, timeoutSetting)

  if (waitingSuccess) {
    debugInfo('成功进入' + position)
    return true
  } else {
    errorInfo('进入' + position + '失败')
    return false
  }
}

/**
 * 校验控件是否存在
 * @param {String} contentVal 控件文本
 * @param {Number} timeoutSetting 超时时间 不设置则为config.timeout_existing
 * 超时返回false
 */
const widgetCheck = function (contentVal, timeoutSetting) {
  let timeout = timeoutSetting || config.timeout_existing
  let timeoutFlag = true
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let descThread = threads.start(function () {
    descMatches(contentVal).waitFor()
    let res = descMatches(contentVal).findOne().desc()
    debugInfo('find desc ' + contentVal + " " + res)
    timeoutFlag = false
    countDown.countDown()
  })

  let textThread = threads.start(function () {
    textMatches(contentVal).waitFor()
    let res = textMatches(contentVal).findOne().text()
    debugInfo('find text ' + contentVal + "  " + res)
    timeoutFlag = false
    countDown.countDown()
  })

  let timeoutThread = threads.start(function () {
    sleep(timeout)
    countDown.countDown()
  })
  countDown.await()
  descThread.interrupt()
  textThread.interrupt()
  timeoutThread.interrupt()
  return !timeoutFlag
}


/**
 * 根据内容获取一个对象
 * 
 * @param {string} contentVal 
 * @param {number} timeout 
 * @param {boolean} containType 是否带回类型
 */
const widgetGetOne = function (contentVal, timeout, containType) {
  let target = null
  let isDesc = false
  let waitTime = timeout || config.timeout_findOne
  let timeoutFlag = true
  if (textMatches(contentVal).exists()) {
    debugInfo('text ' + contentVal + ' found')
    target = textMatches(contentVal).findOne(waitTime)
    timeoutFlag = false
  } else if (descMatches(contentVal).exists()) {
    isDesc = true
    debugInfo('desc ' + contentVal + ' found')
    target = descMatches(contentVal).findOne(waitTime)
    timeoutFlag = false
  } else {
    debugInfo('none of text or desc found for ' + contentVal)
  }
  // 当需要带回类型时返回对象 传递target以及是否是desc
  if (target && containType) {
    let result = {
      target: target,
      isDesc: isDesc
    }
    return result
  }
  if (timeoutFlag) {
    warnInfo('timeout for finding ' + contentVal)
  }
  return target
}

/**
 * 根据内容获取所有对象的列表
 * 
 * @param {string} contentVal 
 * @param {number} timeout 
 * @param {boolean} containType 是否传递类型
 */
const widgetGetAll = function (contentVal, timeout, containType) {
  let target = null
  let isDesc = false
  let timeoutFlag = true
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let waitTime = timeout || config.timeout_findOne
  let findThread = threads.start(function () {
    if (textMatches(contentVal).exists()) {
      debugInfo('text ' + contentVal + ' found')
      target = textMatches(contentVal).untilFind()
      timeoutFlag = false
    } else if (descMatches(contentVal).exists()) {
      isDesc = true
      debugInfo('desc ' + contentVal + ' found')
      target = descMatches(contentVal).untilFind()
      timeoutFlag = false
    } else {
      debugInfo('none of text or desc found for ' + contentVal)
    }
    countDown.countDown()
  })
  let timeoutThread = threads.start(function () {
    sleep(waitTime)
    countDown.countDown()
    warnInfo('timeout for finding ' + contentVal)
  })
  countDown.await()
  findThread.interrupt()
  timeoutThread.interrupt()
  if (timeoutFlag && !target) {
    return null
  } else if (target && containType) {
    let result = {
      target: target,
      isDesc: isDesc
    }
    return result
  }
  return target
}

/**
 * 快速下滑 
 * @deprecated 不再使用 本用来统计最短时间 现在可以先直接加载全部列表然后获取
 */
const quickScrollDown = function () {
  do {
    _automator.scrollDown(50)
    sleep(50)
  } while (
    !foundNoMoreWidget()
  )
}


module.exports = {
  WidgetUtils: {
    widgetWaiting: widgetWaiting,
    widgetCheck: widgetCheck,
    widgetGetOne: widgetGetOne,
    widgetGetAll: widgetGetAll,
    quickScrollDown: quickScrollDown
  }
}