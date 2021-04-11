/**
 * 每个项目里面新增或者修改的方法集合
 */

let { config: _config } = require('../config.js')(runtime, this)
let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let storageFactory = singletonRequire('StorageFactory')
let _logUtils = singletonRequire('LogUtils')
let BaseCommonFunction = require('./BaseCommonFunctions.js')

let SLEEP_TIME = "sleepTime"
/**
 * 项目新增的方法写在此处
 */
const ProjectCommonFunction = function () {
  BaseCommonFunction.call(this)

  this.keyList = [SLEEP_TIME]

  this.getFullTime = function (sleepStorage) {
    let speeded = sleepStorage.speeded
    let fullTime = sleepStorage.runningCycleTime
    if (fullTime < 0) {
      fullTime = speeded ? _config.speeded_feed_cycle_time : _config.feed_cycle_time
    } else {
      _logUtils.debugInfo(['读取缓存中自动识别喂食周期时间：{}', fullTime])
    }
    return fullTime
  }

  /**
   * 先返回当前睡眠时间，然后再更新睡眠时间数据
   */
  this.getSleepTimeAutoCount = function () {
    let sleepStorage = this.getTodaysRuntimeStorage(SLEEP_TIME)
    let recheckTime = _config.recheckTime || 5
    let returnVal = sleepStorage.sleepTime || recheckTime
    let punched = sleepStorage.punched
    sleepStorage.count = (sleepStorage.count || 0) + 1
    let passedCount = sleepStorage.count - 1
    let fullTime = this.getFullTime(sleepStorage)
    // 经过的时间 单位分
    let passedTime = (new Date().getTime() - sleepStorage.startTime) / 60000
    // 第一次喂食后 睡眠20分钟，然后循环多次 直到赶走了野鸡或者超时
    if (passedCount === 0) {
      // 后面循环睡眠
      sleepStorage.sleepTime = recheckTime
    } else if (returnVal >= 300 || punched || passedTime <= fullTime && passedTime >= 40) {
      // 揍过鸡后会设置为300 此时重新计算具体时间
      // or
      // 经过了超过40分钟 而且此时没有野鸡来 开始睡眠更久不再检测小鸡
      returnVal = parseInt(fullTime + _config.windowTime - passedTime)
    } else if (passedTime > fullTime) {
      // 300分钟以上的 直接循环等待 理论上不会进到这一步 300分钟以上已经没饭吃了
      returnVal = recheckTime
    }
    sleepStorage.sleepTime = recheckTime
    this.updateRuntimeStorage(SLEEP_TIME, sleepStorage)
    _logUtils.debugInfo(['喂食周期时间：{} 喂食后经过时间：{} 返回自动统计睡眠时间：{}', fullTime, passedTime, returnVal])
    return returnVal
  }


  /**
   * 先返回当前睡眠时间，然后再更新睡眠时间数据
   */
  this.getSleepTimeByOcr = function (restTime) {
    if (restTime < 0) {
      return this.getSleepTimeAutoCount()
    }
    let sleepStorage = this.getTodaysRuntimeStorage(SLEEP_TIME)
    let recheckTime = _config.recheckTime || 5
    let returnVal = 0
    // 是否揍过鸡
    let punched = sleepStorage.punched
    sleepStorage.count = (sleepStorage.count || 0) + 1
    let fullTime = this.getFullTime(sleepStorage)
    // 经过的时间 单位分
    let passedTime = fullTime - restTime
    if (punched || passedTime > 40) {
      returnVal = restTime + config.windowTime
    } else if (passedTime < 20) {
      returnVal = 20 - passedTime
    } else {
      returnVal = recheckTime
    }
    sleepStorage.sleepTime = recheckTime
    this.updateRuntimeStorage(SLEEP_TIME, sleepStorage)
    _logUtils.debugInfo(['喂食周期时间：{} 喂食后经过时间：{} 返回OCR识别后睡眠时间：{}', fullTime, passedTime, returnVal])
    return returnVal
  }

  this.getSleepTime = function () {
    let sleepStorage = this.getTodaysRuntimeStorage(SLEEP_TIME)
    return sleepStorage.sleepTime || 10
  }

  this.getSleepStorage = function () {
    return this.getTodaysRuntimeStorage(SLEEP_TIME)
  }

  /**
   * @param {number} sleepTime 下一次获取到需要睡眠的时间 单位分
   * @param {boolean} resetCount
   * @param {number} runningCycleTime 运行时识别到的倒计时
   */
  this.updateSleepTime = function (sleepTime, resetCount, runningCycleTime) {
    let currentSleepTime = this.getTodaysRuntimeStorage(SLEEP_TIME)
    currentSleepTime.sleepTime = sleepTime || 10
    currentSleepTime.runningCycleTime = runningCycleTime || -1
    if (runningCycleTime > -1) {
      _logUtils.debugInfo(['OCR识别喂食周期时间为: {}', runningCycleTime])
    }
    if (resetCount) {
      currentSleepTime.count = 0
      currentSleepTime.punched = false
      currentSleepTime.startTime = new Date().getTime()
    }
    this.updateRuntimeStorage(SLEEP_TIME, currentSleepTime)
  }

  this.setPunched = function () {
    let currentSleepTime = this.getTodaysRuntimeStorage(SLEEP_TIME)
    currentSleepTime.punched = true
    this.updateRuntimeStorage(SLEEP_TIME, currentSleepTime)
  }

  this.setSpeeded = function () {
    let currentSleepTime = this.getTodaysRuntimeStorage(SLEEP_TIME)
    currentSleepTime.speeded = true
    this.updateRuntimeStorage(SLEEP_TIME, currentSleepTime)
  }

  this.setSpeedFail = function () {
    let currentSleepTime = this.getTodaysRuntimeStorage(SLEEP_TIME)
    currentSleepTime.speeded = false
    this.updateRuntimeStorage(SLEEP_TIME, currentSleepTime)
  }

  this.showRuntimeStatus = function () {
    console.log('自动定时任务：' + JSON.stringify(this.getTodaysRuntimeStorage(TIMER_AUTO_START)))
    console.log('睡眠时间：' + JSON.stringify(this.getTodaysRuntimeStorage(SLEEP_TIME)))
  }


}

ProjectCommonFunction.prototype = Object.create(BaseCommonFunction.prototype)
ProjectCommonFunction.prototype.constructor = ProjectCommonFunction

/**
 * 初始化存储
 */
ProjectCommonFunction.prototype.initStorageFactory = function () {
  storageFactory.initFactoryByKey(SLEEP_TIME, {
    sleepTime: 10,
    count: 0,
    startTime: new Date().getTime()
  })
}

module.exports = ProjectCommonFunction