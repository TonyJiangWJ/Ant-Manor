/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-05 09:12:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-06-25 10:03:44
 * @Description: 
 */

let { config: _config } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let {
  debugInfo, debugForDev, logInfo, infoLog, warnInfo, errorInfo
} = singletonRequire('LogUtils')
let FileUtils = singletonRequire('FileUtils')
let automator = singletonRequire('Automator')
let algorithm_change_support = false
const BaseWidgetUtils = function () {
  let _this = this
  /**
   * 切换控件获取的模式，正常模式基本能获取到当前最新的数据 快速模式会直接获取已缓存的控件信息，但是控件内容并不一定是最新的，目前来说没啥用
   * @param {number} newMode 0或1 正常模式或快速模式
   */
  this.changeMode = function (newMode) {
    try {
      let clz = runtime.accessibilityBridge.getClass()
      clz = clz.getSuperclass()
      let field = clz.getDeclaredField('mMode')
      field.setAccessible(true)
      let mode = parseInt(field.get(runtime.accessibilityBridge))
      debugInfo(['current mode: {}', mode === 0 ? 'NORMAL' : 'FAST'])
      runtime.accessibilityBridge.setMode(newMode)
      mode = parseInt(field.get(runtime.accessibilityBridge))
      debugInfo(['mode after set: {}', mode === 0 ? 'NORMAL' : 'FAST'])
    } catch (e) {
      console.error('执行异常' + e)
    }
  }

  this.enableFastMode = function () {
    this.changeMode(1)
  }

  this.enableNormalMode = function () {
    this.changeMode(0)
  }

  function prepareDex () {
    if (_this.prepared) {
      return
    }
    let workpath = FileUtils.getCurrentWorkPath()
    checkAndLoadDex(workpath + '/lib/autojs-common.dex')
    try {
      importClass(com.tony.autojs.search.AlgorithmChanger)
      algorithm_change_support = true
    } catch (e) {
      console.error('载入dex异常 当前不支持替换算法')
    }
    _this.prepared = true
  }

  /**
   * 替换控件搜索算法DFS,BFS,VDFS,VBFS,PDFS,PBFS,PVDFS,PVBFS
   * DFS,BFS为默认提供的深度优先和广度优先搜索算法
   * VDFS,VBFS为我修改的只搜索可见控件（控件包括父级不可见则直接跳过）深度优先和广度优先搜索算法
   * 缺点是无法搜索不可见控件，适合一个界面中有巨量控件的时候用于加快搜索速度 实际数据抖音极速版从25s缩短到3s
   * PDFS,PBFS,PVDFS,PVBFS 是通过多线程搜索控件 大大加快搜索速度
   * 
   * 调用示例:
   * <code>
     let target = WidgetUtils.wrapSelector(
      'PDFS', // 指定搜索算法
      (m) => m
      // 链式调用追加UiSelector方法 添加匹配条件
      .boundsInside(0, 1000, 1080, 2340)
      .clickable()
      .visibleToUser()
      // filter 中参数node为UiObject对象，自定义代码逻辑对他的属性字段进行筛选即可 最终返回boolean
      .filter(node => {
        let content = node.desc() || node.text()
        return content.indexOf("领取") > -1
      })
    ).findOne(1000)
   * </code>
   * 
   * @param {string} algorithm 搜索算法DFS,BFS,VDFS,VBFS,PDFS,PBFS,PVDFS,PVBFS
   * @param {UiSelector} mselector
   * @returns 
   */
  this.wrapSelector = function (algorithm, appendFilter, mselector) {
    prepareDex()
    appendFilter = appendFilter || function (matcher) { return matcher }
    mselector = appendFilter(mselector || selector())
    if (!algorithm) {
      return mselector
    }
    if (!algorithm_change_support) {
      warnInfo(['当前版本不支持替换搜索算法'])
      return mselector
    }
    current = this.getCurrentAlgorithm()
    if (current == algorithm) {
      return mselector
    }
    debugForDev(['替换搜索算法为：{} 原始算法：{}', algorithm, current])
    return AlgorithmChanger.changeAlgorithm(mselector, algorithm)
  }

  /**
   * 获取当前搜索算法
   * 
   * @param {UiSelector} mselector 
   * @returns 
   */
  this.getCurrentAlgorithm = function (mselector) {
    prepareDex()
    if (!algorithm_change_support) {
      warnInfo(['当前版本不支持查询搜索算法'])
      return ''
    }
    mselector = mselector || selector()
    let className = AlgorithmChanger.getCurrentAlgorithm(mselector)
    return className.substring(className.lastIndexOf('.') + 1)
  }

  /**
   * 判断控件A或者控件B是否存在；超时返回0 找到A返回1 否则返回2
   * 
   * @param {string|regex} contentA 控件A的内容
   * @param {string|regex} contentB 控件B的内容
   * @param {number} timeout 超时时间
   * @param {boolean} containContent 是否传递实际内容
   * @param {function} appendFilter 附加查询条件 详见UiSelector 传参参考this.wrapSelector
   * @param {object} options 额外参数
   * @return 超时返回0 找到A返回1 否则返回2
   */
  this.alternativeWidget = function (contentA, contentB, timeout, containContent, appendFilter, options) {
    options = options || {}
    options = options || {}
    if (typeof timeout === 'object' && timeout != null) {
      options = timeout
      if (arguments.length > 3) {
        errorInfo(['当指定第三个参数为options时，请勿继续传递额外参数'])
      }
    } else {
      options = Object.assign(options, {
        timeout: timeout,
        containContent: containContent,
        appendFilter: appendFilter
      })
    }
    timeout = options.timeout || _config.timeout_existing
    containContent = options.containContent
    appendFilter = options.appendFilter
    debugInfo(['try to find any matches {} or {} timeout {}', contentA, contentB, timeout])
    timeout = timeout || _config.timeout_existing
    let timeoutFlag = true
    let countDown = new java.util.concurrent.CountDownLatch(1)
    let matchRegexA = new RegExp(contentA)
    let matchRegexB = new RegExp(contentB)
    let isDesc = false, findA = false
    let res = null, target = null
    let descThreadA = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegexA).findOne()
      res = target.desc()
      debugInfo('find desc ' + contentA + " " + res)
      timeoutFlag = false
      isDesc = true
      findA = true
      countDown.countDown()
    })

    let textThreadA = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegexA).findOne()
      res = target.text()
      debugInfo('find text ' + contentA + "  " + res)
      timeoutFlag = false
      findA = true
      countDown.countDown()
    })
    let descThreadB = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegexB).findOne()
      res = target.desc()
      debugInfo('find desc ' + contentB + " " + res)
      timeoutFlag = false
      isDesc = true
      countDown.countDown()
    })

    let textThreadB = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegexB).findOne()
      res = target.text()
      debugInfo('find text ' + contentB + "  " + res)
      timeoutFlag = false
      countDown.countDown()
    })

    let timeoutThread = threads.start(function () {
      sleep(timeout)
      countDown.countDown()
    })
    countDown.await()
    descThreadA.interrupt()
    textThreadA.interrupt()
    descThreadB.interrupt()
    textThreadB.interrupt()
    timeoutThread.interrupt()
    if (timeoutFlag) {
      debugInfo(['cannot find any matches {} or {}', contentA, contentB])
    }
    // 超时返回0 找到A返回1 否则返回2
    let returnVal = timeoutFlag ? 0 : (findA ? 1 : 2)
    if (containContent) {
      return {
        target: target,
        bounds: target ? target.bounds() : null,
        content: res,
        value: returnVal
      }
    } else {
      return returnVal
    }
  }

  /**
   * 校验控件是否存在，并打印相应日志
   * @param {String} contentVal 控件文本
   * @param {String} position 日志内容 当前所在位置是否成功进入
   * @param {Number} timeout 超时时间 单位毫秒 默认为_config.timeout_existing
   */
  this.widgetWaiting = function (contentVal, position, timeout, appendFilter, options) {
    options = options || {}
    options = options || {}
    if (typeof timeout === 'object' && timeout != null) {
      options = timeout
      if (arguments.length > 3) {
        errorInfo(['当指定第三个参数为options时，请勿继续传递额外参数'])
      }
    } else {
      options = Object.assign(options, {
        timeout: timeout,
        appendFilter: appendFilter
      })
    }
    timeout = options.timeout || _config.timeout_existing
    containType = options.containType
    appendFilter = options.appendFilter
    let waitingSuccess = this.widgetCheck(contentVal, timeout, false, appendFilter, options)
    position = position || contentVal
    if (waitingSuccess) {
      debugInfo('等待控件成功：' + position)
      return true
    } else {
      errorInfo('等待控件[' + position + ']失败, 查找内容：' + contentVal)
      return false
    }
  }

  this.widgetChecking = function (contentVal, options) {
    options = options || {}
    return this.widgetCheck(contentVal, options.timeoutSetting || options.timeout, options.containType, options.appendFilter, options)
  }

  /**
   * 校验控件是否存在
   * @param {String} contentVal 控件文本
   * @param {Number} timeout 超时时间 单位毫秒 不设置则为_config.timeout_existing
   * @param {Boolean} containType 返回结果附带文本是desc还是text
   * @param {Object} options 额外参数
   * 超时返回false
   */
  this.widgetCheck = function (contentVal, timeout, containType, appendFilter, options) {
    options = options || {}
    if (typeof timeout === 'object' && timeout != null) {
      options = timeout
      if (arguments.length > 2) {
        errorInfo(['当指定第二个参数为options时，请勿继续传递额外参数'])
      }
    } else {
      options = Object.assign(options, {
        timeout: timeout,
        containType: containType,
        appendFilter: appendFilter
      })
    }
    timeout = options.timeout || _config.timeout_existing
    containType = options.containType
    appendFilter = options.appendFilter
    let timeoutFlag = true
    let countDown = new java.util.concurrent.CountDownLatch(1)
    let matchRegex = new RegExp(contentVal)
    let isDesc = false
    let target = null
    let start = new Date().getTime()
    debugInfo(['try to find target: {} timeout: {}', contentVal, timeout])
    let descThread = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegex).findOne()
      let res = target.desc()
      debugInfo('find desc ' + contentVal + " " + res + ' cost ' + (new Date().getTime() - start) + 'ms')
      timeoutFlag = false
      isDesc = true
      countDown.countDown()
    })

    let textThread = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegex).findOne()
      let res = target.text()
      debugInfo('find text ' + contentVal + "  " + res + ' cost ' + (new Date().getTime() - start) + 'ms')
      timeoutFlag = false
      countDown.countDown()
    })

    countDown.await(timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
    descThread.interrupt()
    textThread.interrupt()
    if (timeoutFlag) {
      debugInfo('cannot find any matches ' + contentVal + ' timeout:' + timeout)
    }
    if (containType) {
      return {
        timeout: timeoutFlag,
        target: target,
        bounds: target ? target.bounds() : null,
        isDesc: isDesc
      }
    }
    return !timeoutFlag
  }

  /**
   * id检测
   * @param {string|RegExp} idRegex 
   * @param {number} timeout 
   */
  this.idCheck = function (idRegex, timeout, containType, appendFilter, options) {
    options = options || {}
    if (typeof timeout === 'object' && timeout != null) {
      options = timeout
      if (arguments.length > 2) {
        errorInfo(['当指定第二个参数为options时，请勿继续传递额外参数'])
      }
    } else {
      options = Object.assign(options, {
        timeout: timeout,
        containType: containType,
        appendFilter: appendFilter
      })
    }
    timeout = options.timeout || _config.timeout_existing
    containType = options.containType
    appendFilter = options.appendFilter
    let timeoutFlag = true
    let countDown = new java.util.concurrent.CountDownLatch(1)
    let target = null
    debugInfo(['查找目标id:{} timeout: {}', idRegex, timeout])
    let idCheckThread = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).idMatches(idRegex).findOne()
      debugInfo('find id ' + idRegex)
      timeoutFlag = false
      countDown.countDown()
    })
    countDown.await(timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
    idCheckThread.interrupt()
    if (timeoutFlag) {
      warnInfo(['未能找到id:{}对应的控件', idRegex])
    }
    if (containType) {
      return {
        timeout: timeoutFlag,
        target: target,
        bounds: target ? target.bounds() : null,
      }
    }
    return !timeoutFlag
  }

  /**
   * 校验控件是否存在，并打印相应日志
   * @param {String} idRegex 控件文本
   * @param {String} position 日志内容 当前所在位置是否成功进入
   * @param {Number} timeout 超时时间 默认为_config.timeout_existing
   */
  this.idWaiting = function (idRegex, position, timeout, appendFilter, options) {
    options = options || {}
    if (typeof timeout === 'object' && timeout != null) {
      options = timeout
      if (arguments.length > 3) {
        errorInfo(['当指定第三个参数为options时，请勿继续传递额外参数'])
      }
    } else {
      options = Object.assign(options, {
        timeout: timeout,
        appendFilter: appendFilter
      })
    }
    timeout = options.timeout || _config.timeout_existing
    appendFilter = options.appendFilter
    let waitingSuccess = this.idCheck(idRegex, timeout, false, appendFilter, options)
    position = position || idRegex
    if (waitingSuccess) {
      debugInfo('等待控件成功：' + position)
      return true
    } else {
      errorInfo('等待控件[' + position + ']失败， id：' + idRegex)
      return false
    }
  }

  /**
   * 根据id获取控件信息
   * @param {String|RegExp} idRegex id
   * @param {number} timeout 超时时间
   * @return 返回找到的控件，否则null
   */
  this.widgetGetById = function (idRegex, timeout, appendFilter, options) {
    options = options || {}
    if (typeof timeout == 'object' && timeout != null) {
      options = timeout
    } else {
      options = Object.assign(options, {
        timeout: timeout,
        appendFilter: appendFilter
      })
    }
    timeout = options.timeout || _config.timeout_existing
    appendFilter = options.appendFilter

    timeout = timeout || _config.timeout_findOne
    let target = this.idCheck(idRegex, timeout, true, appendFilter, options)
    if (!target.timeout) {
      return target.target
    } else {
      return null
    }
  }

  /**
   * 根据内容获取一个对象
   * 
   * @param {string} contentVal 
   * @param {number} timeout 
   * @param {boolean} containType 是否带回类型
   * @param {boolean} suspendWarning 是否隐藏warning信息
   * @param {function} appendFilter 附加查询条件 详见UiSelector 传参参考this.wrapSelector
   */
  this.widgetGetOne = function (contentVal, timeout, containType, suspendWarning, appendFilter, options) {
    let target = null
    let isDesc = false
    options = options || {}
    if (typeof timeout === 'object' && timeout != null) {
      options = timeout
      if (arguments.length > 2) {
        errorInfo(['当指定第二个参数为options时，请勿继续传递额外参数'])
      }
    } else {
      options = Object.assign(options, {
        timeout: timeout,
        containType: containType,
        suspendWarning: suspendWarning,
        appendFilter: appendFilter
      })
    }
    timeout = options.timeout || _config.timeout_existing
    containType = options.containType
    suspendWarning = options.suspendWarning
    appendFilter = options.appendFilter
    let timeoutFlag = true
    debugInfo(['try to find one: {} timeout: {}ms', contentVal.toString(), timeout])
    let checkResult = this.widgetCheck(contentVal, timeout, true, appendFilter, options)
    if (!checkResult.timeout) {
      timeoutFlag = false
      target = checkResult.target
      isDesc = checkResult.isDesc
    }
    // 当需要带回类型时返回对象 传递target以及是否是desc
    if (target && containType) {
      let result = {
        target: target,
        bounds: target.bounds(),
        isDesc: isDesc,
        content: isDesc ? target.desc() : target.text()
      }
      return result
    }
    if (timeoutFlag) {
      if (suspendWarning) {
        debugInfo('timeout for finding ' + contentVal)
      } else {
        warnInfo('timeout for finding ' + contentVal)
      }
    }
    return target
  }

  /**
   * 根据内容获取所有对象的列表
   * 
   * @param {string} contentVal 
   * @param {number} timeout 
   * @param {boolean} containType 是否传递类型 @deprecated 此参数无意义了
   * @param {function} appendFilter 附加查询条件 详见UiSelector 传参参考this.wrapSelector
   */
  this.widgetGetAll = function (contentVal, timeout, containType, appendFilter, options) {
    options = options || {}
    if (typeof timeout === 'object' && timeout != null) {
      options = timeout
      if (arguments.length > 2) {
        errorInfo(['当指定第二个参数为options时，请勿继续传递额外参数'])
      }
    } else {
      options = Object.assign(options, {
        timeout: timeout,
        containType: containType,
        appendFilter: appendFilter
      })
    }
    timeout = options.timeout || _config.timeout_existing
    containType = options.containType
    appendFilter = options.appendFilter
    let target = null
    let isDesc = false
    let timeoutFlag = true
    let waitTime = timeout || _config.timeout_existing
    debugInfo(['try to find all: {} timeout: {}ms', contentVal.toString(), waitTime])

    let countDown = new java.util.concurrent.CountDownLatch(1)
    let matchRegex = new RegExp(contentVal)
    let descThread = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegex).untilFind()
      debugInfo('find all desc ' + contentVal + " length " + target.length)
      timeoutFlag = false
      isDesc = true
      countDown.countDown()
    })

    let textThread = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegex).untilFind()
      debugInfo('find all text ' + contentVal + " length " + target.length)
      timeoutFlag = false
      countDown.countDown()
    })

    countDown.await(waitTime, java.util.concurrent.TimeUnit.MILLISECONDS)
    descThread.interrupt()
    textThread.interrupt()

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
   * 查找一个子控件中的目标对象
   * @param {UiObject} container 父控件
   * @param {String} contentVal 控件文本
   * @param {number} timeout 超时时间
   * @param {Boolean} containType 返回结果附带文本是desc还是text
   * @param {function} appendFilter 附加查询条件 详见UiSelector 传参参考this.wrapSelector
   * @param {Object} options 额外参数
   * 超时返回false
   */
  this.subWidgetGetOne = function (container, contentVal, timeout, containType, appendFilter, options) {
    if (!container) {
      errorInfo(['父级容器为空，请检查代码'])
      return null
    }
    options = options || {}
    if (typeof timeout === 'object' && timeout != null) {
      options = timeout
      if (arguments.length > 3) {
        errorInfo(['当指定第三个参数为options时，请勿继续传递额外参数'])
      }
    } else {
      options = Object.assign(options, {
        timeout: timeout,
        containType: containType,
        appendFilter: appendFilter
      })
    }
    timeout = options.timeout || _config.timeout_existing
    containType = options.containType
    appendFilter = options.appendFilter
    let countDown = new java.util.concurrent.CountDownLatch(1)
    let matchRegex = new RegExp(contentVal)
    let isDesc = false
    let isText = false
    let target = null
    let descThread = threads.start(function () {
      let descTarget = _this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegex).findOneOf(container)
      if (descTarget) {
        debugInfo(['find desc {} {}', contentVal, descTarget.desc()])
        isDesc = true
        target = descTarget
        countDown.countDown()
      }
    })

    let textThread = threads.start(function () {
      let textTarget = _this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegex).findOneOf(container)
      if (textTarget) {
        debugInfo(['find text {} {}', contentVal, textTarget.text()])
        isText = true
        target = textTarget
        countDown.countDown()
      }
    })

    countDown.await(timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
    descThread.interrupt()
    textThread.interrupt()
    if (!isDesc && !isText) {
      debugInfo('cannot find any matches ' + contentVal)
    }
    if (target && containType) {
      return {
        isDesc: isDesc,
        target: target,
        bounds: target.bounds(),
        content: isDesc ? target.desc() : target.text()
      }
    }
    return target
  }


  /**
   * 查找子控件中所有匹配的目标对象
   * @param {UiObject} container 父控件
   * @param {String} contentVal 控件文本
   * @param {number} timeout 超时时间
   * @param {Boolean} containType 返回结果附带文本是desc还是text @deprecated 此参数无意义了 只是返回结果将变成对象，isDesc将一直是false
   * @param {function} appendFilter 附加查询条件 详见UiSelector 传参参考this.wrapSelector
   * @param {Object} options 额外参数
   * 超时返回false
   */
  this.subWidgetGetAll = function (container, contentVal, timeout, containType, appendFilter, options) {
    if (!container) {
      errorInfo(['父级容器为空，请检查代码'])
      return null
    }
    let exists = this.subWidgetGetOne(container, contentVal, timeout, containType, appendFilter, options)
    options = options || {}
    if (typeof timeout === 'object' && timeout != null) {
      options = timeout
      if (arguments.length > 3) {
        errorInfo(['当指定第三个参数为options时，请勿继续传递额外参数'])
      }
    } else {
      options = Object.assign(options, {
        timeout: timeout,
        containType: containType,
        appendFilter: appendFilter
      })
    }
    timeout = options.timeout || _config.timeout_existing
    containType = options.containType
    appendFilter = options.appendFilter
    if (exists) {
      let matchRegex = new RegExp(contentVal)
      let resultList = []
      if (exists.isDesc) {
        resultList = this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegex).findOf(container)
      } else {
        resultList = this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegex).findOf(container)
      }
      if (containType) {
        return {
          target: resultList,
          isDesc: exists.isDesc
        }
      } else {
        return resultList
      }
    } else {
      return []
    }
  }

  this.boundsToRegion = function (bd) {
    return [bd.left, bd.top, bd.right - bd.left, (bd.bottom - bd.top)]
  }

  this.boundsToArray = function (bd) {
    return [bd.left, bd.top, bd.right, bd.bottom]
  }

  this.boundsInScreen = function (bd, screen) {
    screen = screen || {
      width: config.device_width,
      height: config.device_height
    }
    let width = screen.width, height = screen.height
    debugInfo(['bounds info：{} => {}', JSON.stringify(bd), JSON.stringify([bd.left, bd.top, bd.width(), bd.height()])])
    if (bd.left >= 0 && bd.top >= 0 && bd.left + bd.width() <= width && bd.top + bd.height() <= height) {
      return bd.width() > 0 && bd.height() > 0
    } else {
      return false
    }
  }

  this.checkAndOperateVerify = function () {
    let target = null
    if ((target = this.widgetGetOne('.*向右滑动验证.*', 1000))) {
      let region = this.boundsToRegion(target.parent().bounds())
      let start = {
        x: region[0] + (region[3] / 2),
        y: region[1] + (region[3] / 2)
      }
      let end = {
        x: region[0] + region[2] - (region[3] / 2),
        y: region[1] + (region[3] / 2)
      }
      automator.gesturePath(start, end, 800 + Math.ceil(Math.random() * 400))
      return true
    }
    return false
  }

  function wrapFullMatchRegExp (source) {
    let newRegex = null
    if (source instanceof RegExp) {
      newRegex = new RegExp('^(' + source.source + ')$', source.flags)
    } else {
      newRegex = new RegExp('^(' + source + ')$')
    }
    debugInfo(['重新构建正则：{} => {}', source, newRegex])
    return newRegex
  }
}

module.exports = BaseWidgetUtils