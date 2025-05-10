/**
 * 每个项目里面新增或者修改的方法集合
 */

let { config: _config } = require('../config.js')(runtime, this)
let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let storageFactory = singletonRequire('StorageFactory')
let _logUtils = singletonRequire('LogUtils')
let NotificationHelper = singletonRequire('Notification')
let BaseCommonFunction = require('./BaseCommonFunctions.js')
let formatDate = require('./DateUtil.js')
let SLEEP_TIME = "sleepTime"
let VILLAGE_SPEED_UP = "villageSpeedUp"
let DAILY_FIRST = "dailyFirst"
let SLEEP_FAILED_TIME = "sleepFailedTime"
let VIEW_DIARY = "viewDiary"
let EGG_PROCESS = "eggProcess"
/**
 * 项目新增的方法写在此处
 */
const ProjectCommonFunction = function () {
  BaseCommonFunction.call(this)

  this.keyList = [SLEEP_TIME, VILLAGE_SPEED_UP, DAILY_FIRST, VIEW_DIARY]

  this.getFullTime = function (sleepStorage) {
    let speeded = sleepStorage.speeded
    let fullTime = sleepStorage.runningCycleTime
    if (fullTime < 0 || typeof fullTime === 'undefined') {
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
    NotificationHelper.createNotification((punched || passedTime > 40) ? '等待小鸡吃完' : '循环驱赶野鸡',
      util.format('喂食周期时间：%s 喂食后经过时间：%s 下次执行时间：%s', fullTime.toFixed(2), passedTime.toFixed(2), formatDate(new Date(new Date().getTime() + returnVal * 60000))))
    return returnVal
  }

  this.getSleepTime = function () {
    let sleepStorage = this.getTodaysRuntimeStorage(SLEEP_TIME)
    return sleepStorage.sleepTime || 10
  }

  this.getSleepStorage = function () {
    return this.getTodaysRuntimeStorage(SLEEP_TIME)
  }

  this.getFeedPassedTime = function () {
    return (new Date().getTime() - this.getSleepStorage().startTime) / 60000
  }

  /**
   * @param {number} sleepTime 下一次检测需要睡眠的时间 单位分
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

  /**
   * 校验今日是否已经加速过
   * @returns 
   */
  this.checkSpeedUpCollected = function () {
    let speedUpInfo = this.getTodaysRuntimeStorage(VILLAGE_SPEED_UP)
    return speedUpInfo.collected && speedUpInfo.count > 2
  }

  /**
   * 设置今日已经村民加速
   */
  this.setSpeedUpCollected = function () {
    let storeVal = this.getTodaysRuntimeStorage(VILLAGE_SPEED_UP)
    let count = storeVal.count || 0
    count += 1
    this.updateRuntimeStorage(VILLAGE_SPEED_UP, { collected: count > 2, count: count })
  }

  this.checkDailyFirst = function () {
    return !this.getTodaysRuntimeStorage(DAILY_FIRST).feeded
  }

  this.setTodayFeeded = function () {
    this.updateRuntimeStorage(DAILY_FIRST, { feeded: true })
  }

  this.increaseSleepFailed = function () {
    let currentCount = this.getTodaysRuntimeStorage(SLEEP_FAILED_TIME).count
    this.updateRuntimeStorage(SLEEP_FAILED_TIME, { count: currentCount + 1 })
    return currentCount + 1
  }

  this.checkDiary = function () {
    return !!this.getTodaysRuntimeStorage(VIEW_DIARY).checked
  }

  this.setDiaryChecked = function () {
    this.updateRuntimeStorage(VIEW_DIARY, { checked: true })
  }

  this.persistEggProcess = function (currentProcess) {
    if (/\d+/.test(currentProcess)) {
      currentProcess = Number(currentProcess)
    } else {
      _logUtils.warnInfo(['鸡蛋进度信息非法：{}', currentProcess])
      return
    }
    let recorded = this.getFullTimeRuntimeStorage(EGG_PROCESS) || { process: 0, count: 0 }
    let lastProcess = recorded.process || 0
    let count = recorded.count || 0
    let increase = 0
    if (currentProcess > lastProcess) {
      increase = currentProcess - lastProcess
    } else if (currentProcess == lastProcess) {
      // 无变化，跳过记录
      return
    } else {
      increase = currentProcess + 100 - lastProcess
      count++
    }
    _logUtils.infoLog(['鸡蛋进度增加：{}', increase])
    recorded.process = currentProcess
    recorded.count = count
    _logUtils.debugInfo(['当前鸡蛋进度：{} 鸡蛋增量：{}', recorded.process, recorded.count])
    this.updateRuntimeStorage(EGG_PROCESS, recorded)
  }
}

ProjectCommonFunction.prototype = Object.create(BaseCommonFunction.prototype)
ProjectCommonFunction.prototype.constructor = ProjectCommonFunction

/**
 * 初始化存储
 */
ProjectCommonFunction.prototype.initStorageFactory = function () {
  const dataList = [
    [SLEEP_TIME, {
      sleepTime: 10,
      count: 0,
      startTime: new Date().getTime()
    }],
    // 摆摊 是否已经执行加速 避免重复无意义点击
    [VILLAGE_SPEED_UP, {
      collected: false
    }],
    // 是否每日首次喂食
    [DAILY_FIRST, {
      feeded: false
    }],
    // 睡觉失败次数
    [SLEEP_FAILED_TIME, {
      count: 0
    }],
    // 是否执行了日记贴贴
    [VIEW_DIARY, {
      checked: false
    }],
    [EGG_PROCESS, {
      process: 0,
      count: 0
    }]
  ]
  dataList.forEach(pairs =>
    storageFactory.initFactoryByKey(pairs[0], pairs[1])
  )
}

module.exports = ProjectCommonFunction