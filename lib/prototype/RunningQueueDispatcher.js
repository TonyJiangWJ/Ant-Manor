


let STORAGE_KEY = "autojs_dispatch_queue_storage"
let RUNNING_KEY = "qunningTask"
let WAITING_QUEUE_KEY = "waitingQueue"
let WRITE_LOCK_KEY = "writeLock"
let { config, storage_name } = require('../../config.js')(runtime, global)
let singletonRequire = require('../SingletonRequirer.js')(runtime, global)
let lockableStorages = singletonRequire('LockableStorage')
let Timers = singletonRequire('Timers')
let _logUtils = singletonRequire('LogUtils')
let crashCatcher = singletonRequire('CrashCatcher')

function RunningQueueDispatcher () {

  this.lockStorage = null
  this.currentEngineId = engines.myEngine().id
  this.currentEngineSource = engines.myEngine().getSource() + ''
  this.executeArguments = Object.assign({}, engines.myEngine().execArgv)
  let executedIntent = this.executeArguments.intent
  let triggerByNotice = this.executeArguments.triggerImmediately
  if (executedIntent) {
    triggerByNotice = executedIntent.getStringExtra('triggerByNotice')
  }
  // 记录是否是通过通知触发的，用于后续的处理
  config._triggerByNotice = !!triggerByNotice
  delete this.executeArguments.intent

  this.checkDuplicateRunning = function (runningEngineId) {
    let runningEngines = this.tryGetRunningEngines()
    if (runningEngines === null) {
      // 获取运行中脚本引擎失败
      _logUtils.errorInfo('校验重复运行异常，直接退出')
      exit()
    }
    let runningSize = runningEngines.length
    let currentSource = this.currentEngineSource
    let currentEngineId = this.currentEngineId
    _logUtils.debugInfo('Dispatcher:当前脚本信息 id:' + currentEngineId + ' source:' + currentSource + ' 运行中脚本数量：' + runningSize)
    if (runningSize > 1) {
      runningEngines.forEach(compareEngine => {
        let compareSource = compareEngine.getSource() + ''
        _logUtils.debugInfo('Dispatcher:对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource)
        if (runningEngineId === compareEngine.id && currentEngineId !== compareEngine.id && compareSource === currentSource) {
          _logUtils.warnInfo(['Dispatcher:脚本正在运行中 退出当前脚本：{} - {}', currentEngineId, currentSource], true)
          this.removeRunningTask(true, true)
          exit()
        }
      })
    }
  }

  /**
   * 设置自动启动
   * 
   * @param {string} source 脚本path路径
   * @param {number} seconds 延迟时间 秒
   */
  this.setUpAutoStart = function (source, seconds) {
    let waitTime = seconds || 5
    _logUtils.debugInfo("定时[" + waitTime + "]秒后启动脚本: " + source)
    let task = Timers.addDisposableTask({
      path: source,
      date: new Date().getTime() + waitTime * 1000,
    })
    _logUtils.debugInfo("定时任务预定成功: " + task.id)
  }

  /**
   * 立即启动目标脚本
   * 
   * @param {string} source 脚本path路径
   * @param {object} executeArguments 执行参数
   */
  this.executeTargetScript = function (source, executeArguments) {
    _logUtils.logInfo(['启动目标脚本：{}', source])
    ui.run(function () {
      let args = {}
      if (executeArguments) {
        args = Object.assign(args, executeArguments)
        delete args.intent
      }
      args = Object.assign(args, { executeByDispatcher: true, buddha: config._buddha })
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')), arguments: args })
    })
    sleep(1000)
  }

  this.getCurrentTaskInfo = function () {
    return {
      source: this.currentEngineSource,
      engineId: this.currentEngineId,
      storageKey: storage_name,
      executeArguments: this.executeArguments
    }
  }


  this.clearAll = function () {
    lockableStorages.remove(STORAGE_KEY)
    _logUtils.logInfo('清除数据成功')
  }

  this.showDispatchStatus = function () {
    let runningTaskStr = this.getStorage().get(RUNNING_KEY)
    let waitingQueueStr = this.getStorage().get(WAITING_QUEUE_KEY)
    let lockKeyStr = this.getStorage().get(WRITE_LOCK_KEY)
    if (runningTaskStr) {
      let runningTask = JSON.parse(runningTaskStr)
      let timeout = new Date().getTime() - parseInt(runningTask.timeout)
      _logUtils.logInfo('当前运行中的任务：' + runningTaskStr + (timeout > 0 ? ' 已超时' + (timeout / 1000.0).toFixed(2) + '秒' : ' 超时剩余时间' + (-timeout / 1000.0).toFixed(0) + '秒'))
    } else {
      _logUtils.logInfo('当前无运行中的任务')
    }
    if (waitingQueueStr && waitingQueueStr !== '[]') {
      _logUtils.logInfo('当前等待中的队列：' + waitingQueueStr)
    } else {
      _logUtils.logInfo('当前无等待中的队列')
    }
    if (lockKeyStr) {
      let key = JSON.parse(lockKeyStr)
      _logUtils.logInfo('当前存在的锁：' + lockKeyStr + " 超时时间剩余：" + ((parseInt(key.timeout) - new Date().getTime()) / 1000.0).toFixed(2) + '秒')
    } else {
      _logUtils.logInfo('当前无存在的锁')
    }
  }

  this.getStorage = function () {
    if (this.lockStorage === null) {
      this.lockStorage = lockableStorages.create(STORAGE_KEY)
    }
    return this.lockStorage
  }

  this.clearLock = function () {
    let taskInfo = this.getCurrentTaskInfo()
    let storedLockStr = this.getStorage().get(WRITE_LOCK_KEY)
    if (storedLockStr) {
      let storedLock = JSON.parse(storedLockStr)
      if (storedLock.source === taskInfo.source) {
        _logUtils.debugInfo('移除任务锁：' + JSON.stringify(taskInfo))
        this.getStorage().put(WRITE_LOCK_KEY, '')
      }
    }
  }

  /**
   * 尝试获取锁
   * @param {number} tryTime 尝试次数，默认一次
   */
  this.lock = function (tryTime) {
    tryTime = tryTime || 1
    let lockSuccess = this.storageLock()
    while (--tryTime > 0 && !lockSuccess) {
      sleep(200)
      lockSuccess = this.storageLock()
    }
    return lockSuccess
  }

  this.putLockInfo = function (taskInfo) {
    return this.getStorage().put(WRITE_LOCK_KEY,
      JSON.stringify({
        source: taskInfo.source,
        engineId: taskInfo.engineId,
        count: 1,
        timeout: new Date().getTime() + 30000
      }))
  }

  this.storageLock = function () {
    let taskInfo = this.getCurrentTaskInfo()
    let storedLockStr = this.getStorage().get(WRITE_LOCK_KEY)
    if (storedLockStr) {
      let storedLock = JSON.parse(storedLockStr)
      if (storedLock.source === taskInfo.source) {
        if (storedLock.engineId === taskInfo.engineId) {
          storedLock.count = parseInt(storedLock.count) + 1
          // 锁超时时间30秒
          storedLock.timeout = new Date().getTime() + 30000
          return this.getStorage().put(WRITE_LOCK_KEY, JSON.stringify(storedLock))
        } else {
          // 校验加锁引擎是否挂了
          let runningEngines = this.tryGetRunningEngines()
          // null 说明获取运行中engines失败，作为操作异常，加锁失败
          if (runningEngines === null || runningEngines.find((engine) => engine.id === storedLock.engineId)) {
            return false
          } else {
            _logUtils.warnInfo('加锁脚本引擎 engineId「' + storedLock.engineId + '」已停止，直接覆盖：' + JSON.stringify(storedLock))
            return this.putLockInfo(taskInfo)
          }
        }
      } else {
        if (parseInt(storedLock.timeout) < new Date().getTime()) {
          _logUtils.warnInfo('已有锁已超时，直接覆盖：' + JSON.stringify(storedLock))
          return this.putLockInfo(taskInfo)
        }
        return false
      }
    } else {
      return this.putLockInfo(taskInfo)
    }
  }

  this.unlock = function () {
    let taskInfo = this.getCurrentTaskInfo()
    let storedLockStr = this.getStorage().get(WRITE_LOCK_KEY)
    if (storedLockStr) {
      let storedLock = JSON.parse(storedLockStr)
      if (storedLock.source === taskInfo.source && storedLock.engineId === taskInfo.engineId) {
        if (parseInt(storedLock.count) > 1) {
          storedLock.count = parseInt(storedLock.count) - 1
          return this.getStorage().put(WRITE_LOCK_KEY, JSON.stringify(storedLock))
        } else {
          return this.getStorage().put(WRITE_LOCK_KEY, '')
        }
      } else {
        return false
      }
    } else {
      return false
    }
  }

  this.getRunningStatus = function () {
    let storedRunningTask = this.getStorage().get(RUNNING_KEY)
    if (storedRunningTask) {
      let runningTask = JSON.parse(storedRunningTask)
      let currentTimestamp = new Date().getTime()
      if (currentTimestamp > runningTask.timeout) {
        _logUtils.debugInfo('运行中任务已超时：' + storedRunningTask + ' 超时时间：' + ((currentTimestamp - runningTask.timeout) / 1000).toFixed(0) + '秒')
        // 直接移除已超时运行中的任务
        this.getStorage().put(RUNNING_KEY, '')
        return null
      } else {
        _logUtils.debugInfo('获取运行中任务信息：' + storedRunningTask + ' 超时剩余时间：' + ((runningTask.timeout - currentTimestamp) / 1000).toFixed(0) + '秒')
        return runningTask
      }
    } else {
      return null
    }
  }

  this.getWaitingStatus = function () {
    // 任务队列去重
    this.distinctAwaitTasks()
    let waitingArrayStr = this.getStorage().get(WAITING_QUEUE_KEY)
    let waitingArray = []
    if (waitingArrayStr) {
      waitingArray = JSON.parse(waitingArrayStr) || []
    }
    // 过滤自身
    waitingArray = waitingArray.filter(task => task.source !== this.currentEngineSource)
    if (waitingArray && waitingArray.length > 0) {
      return waitingArray[0]
    }
    return null
  }

  /**
   * 从等待队列队首移除任务，当外层已包裹lock 可忽略返回值 否则后续操作需要判断是否为null
   */
  this.popWaitingTask = function () {
    let waitingArrayStr = this.getStorage().get(WAITING_QUEUE_KEY)
    let waitingArray = null
    if (waitingArrayStr) {
      waitingArray = JSON.parse(waitingArrayStr)
    }
    if (waitingArray && waitingArray.length > 0) {
      let waitingTask = waitingArray.splice(0, 1)
      if (this.lock()) {
        this.getStorage().put(WAITING_QUEUE_KEY, JSON.stringify(waitingArray))
        this.unlock()
        return waitingTask
      }
    }
    return null
  }

  /**
   * @param {boolean} checkOwner 判断当前运行中的任务信息是否是当前脚本引擎施加的
   * @param {boolean} notRemoveCrashFlag 重复执行的任务不移除运行中标记
   * @param {function} callbackOnSuccess 移除成功后执行
   * @param {boolean} doNotInvokeNext 是否不触发后续脚本，默认触发。主要用于延迟执行后，不触发后续的脚本
   */
  this.removeRunningTask = function (checkOwner, notRemoveCrashFlag, callbackOnSuccess, doNotInvokeNext) {
    callbackOnSuccess = callbackOnSuccess || function () { }
    let taskInfo = this.getCurrentTaskInfo()
    let runningTask = this.getRunningStatus()
    if (runningTask !== null) {
      // engineId判断所有权
      if (runningTask.source === taskInfo.source && (!checkOwner || runningTask.engineId === taskInfo.engineId)) {
        _logUtils.debugInfo('准备移除运行中任务')
        if (this.lock(3)) {
          this.getStorage().put(RUNNING_KEY, '')
          callbackOnSuccess()
          // 从等待队列中排除当前执行中脚本
          this.distinctAwaitTasks(true)
          let waitingTask = this.getWaitingStatus()
          if (!doNotInvokeNext) {
            if (waitingTask !== null && this.lock()) {
              _logUtils.debugInfo('有任务在等待，执行它')
              this.popWaitingTask()
              _logUtils.debugInfo('执行等待队列首个任务：' + JSON.stringify(waitingTask))

              // 将队列中任务放入执行中
              this.doAddRunningTask(waitingTask)
              sleep(1000)
              this.unlock()
              // 将队列中的任务执行掉
              this.executeTargetScript(waitingTask.source, waitingTask.executeArguments)
            } else {
              _logUtils.debugInfo('无任务等待中')
            }
          } else {
            if (waitingTask !== null) {
              _logUtils.debugInfo(['不执行等待中的任务，等待下次调度触发：{}', waitingTask.source])
            }
          }
          this.unlock()
        }

      } else {
        _logUtils.warnInfo('运行中任务：' + JSON.stringify(runningTask) + '和当前任务：' + JSON.stringify(taskInfo) + '不同，不可移除')
      }
    } else {
      _logUtils.warnInfo('无任务在运行中，不可移除')
      callbackOnSuccess()
    }
    // 重复执行的任务 不移除运行中的标记
    if (!notRemoveCrashFlag) {
      crashCatcher.setDone()
    }
    // 清空当前任务施加的锁
    this.clearLock()
  }

  this.doAddRunningTask = function (taskInfo) {
    // 默认超时时间15分钟
    taskInfo.timeout = new Date().getTime() + 15 * 60 * 1000
    this.getStorage().put(RUNNING_KEY, JSON.stringify(taskInfo))
    if (taskInfo.source === this.getCurrentTaskInfo().source) {
      // 当前脚本正常开始执行后 标记为运行中
      crashCatcher.setOnRunning()
    } else if (taskInfo.storageKey) {
      // 对目标脚本设置crashCatcher的running状态，避免崩溃自启动后无法自动执行
      _logUtils.debugInfo(['设置目标任务状态为执行中 storageKey: {}', taskInfo.storageKey])
      let crashStateStorage = lockableStorages.create(taskInfo.storageKey + '_crash_catch')
      crashStateStorage.put('running', true)
      crashStateStorage.put('running_source', taskInfo.source)
    }
    // 杀死运行中但是未加入队列的任务
  }

  this.addRunningTask = function (cutInQueue) {
    let taskInfo = this.getCurrentTaskInfo()
    let runningTask = this.getRunningStatus()
    if (runningTask !== null) {
      _logUtils.debugInfo('当前有任务正在运行：' + JSON.stringify(runningTask))
      if (runningTask.source === taskInfo.source) {
        _logUtils.debugInfo('运行中脚本任务和当前任务相同，继续判断同源脚本是否正在运行')
        // 如果判断当前运行中和存储任务状态是同一个则不去校验是否重复运行
        if (runningTask.engineId !== taskInfo.engineId) {
          // 避免重复运行，如果挂了则继续
          this.checkDuplicateRunning(runningTask.engineId)
          let oldRunningEngineId = runningTask.engineId
          if (this.lock(3)) {
            runningTask = this.getRunningStatus()
            if (runningTask == null || oldRunningEngineId === runningTask.engineId) {
              // 更新运行中任务信息
              this.doAddRunningTask(taskInfo)
              this.unlock()
            } else {
              _logUtils.debugInfo(['重新获取的运行中engineId: {} 和旧的engineId: {} 不同 重新尝试加入运行', runningTask.engineId, oldRunningEngineId])
              this.unlock()
              this.addRunningTask(cutInQueue)
            }
          } else {
            _logUtils.warnInfo('更新运行中任务信息失败 尝试重新更新')
            sleep(200)
            return this.addRunningTask(cutInQueue)
          }
        }
        _logUtils.debugInfo('运行状态校验成功，执行后续功能')
        global._running_status = true
        return
      } else {
        let runningEngines = this.tryGetRunningEngines()
        if (runningEngines === null || runningEngines.find(v => v.id === runningTask.engineId || runningTask.source === v.getSource() + '')) {
          _logUtils.debugInfo('运行中任务执行正常')
        } else {
          if (this.lock(3)) {
            _logUtils.warnInfo('运行中任务已经异常关闭，直接删除运行中标记')
            // 清空运行中数据
            this.getStorage().put(RUNNING_KEY, '')
            this.unlock()
            // 然后重新加入运行中任务
            return this.addRunningTask(cutInQueue)
          } else {
            _logUtils.warnInfo('运行中任务已经异常关闭，删除运行中标记失败')
          }
        }
        _logUtils.debugInfo('将当前task放入等待队列：' + JSON.stringify(taskInfo))
        this.addAwaitTask(taskInfo)
        exit()
      }
    } else {
      let waitingTask = this.getWaitingStatus()
      // 如果是通过通知直接运行的，或者需要插队的，不需要判断等待队列，直接将当前脚本作为最高优先级进行执行
      if (!config._triggerByNotice && !cutInQueue && waitingTask !== null) {
        _logUtils.debugInfo('等待队列中已有任务待运行：' + JSON.stringify(waitingTask))
        if (waitingTask.source === taskInfo.source) {
          _logUtils.debugInfo('等待中任务和当前任务相同，可直接执行，将任务信息放入running')
          if (this.lock(3)) {
            this.doAddRunningTask(taskInfo)
            this.popWaitingTask()
            this.unlock()
          } else {
            _logUtils.errorInfo('获取锁失败，无法继续执行任务：' + JSON.stringify(taskInfo))
            _logUtils.warnInfo('尝试将任务加入等待队列中')
            if (this.lock(3)) {
              this.addAwaitTask(taskInfo)
              this.unlock()
            } else {
              if (!this.isTaskInQueue(taskInfo)) {
                _logUtils.warnInfo('尝试将任务加入等待队列失败，定时十秒后启动')
                this.setUpAutoStart(taskInfo.source, 10)
              }
            }
            exit()
          }
        } else {
          _logUtils.debugInfo('等待中任务和当前任务不同，将任务信息放入等待队列：' + JSON.stringify(taskInfo))
          if (this.lock(3)) {
            this.addAwaitTask(taskInfo)
            this.popWaitingTask()
            _logUtils.debugInfo('执行等待队列首个任务：' + JSON.stringify(waitingTask))
            // 将队列中任务放入执行中
            this.doAddRunningTask(waitingTask)
            this.unlock()
            // 将队列中的任务执行掉
            this.executeTargetScript(waitingTask.source, waitingTask.executeArguments)
            exit()
          } else {
            if (!this.isTaskInQueue(taskInfo)) {
              _logUtils.errorInfo('获取锁失败，无法执行等待中任务，当前任务也未成功入队列，设定10秒后启动：' + JSON.stringify(taskInfo))
              this.setUpAutoStart(taskInfo.source, 10)
            }
            exit()
          }
        }
      } else {
        if (this.lock()) {
          _logUtils.debugInfo(['{}，直接执行：{}', waitingTask == null ? '当前无任务等待' : '当前脚本优先级最高', JSON.stringify(taskInfo)])
          this.doAddRunningTask(taskInfo)
          global._running_status = true
          this.unlock()
        } else {
          _logUtils.errorInfo('获取锁失败，无法继续执行任务：' + JSON.stringify(taskInfo))
          this.setUpAutoStart(taskInfo.source, 10)
          exit()
        }
      }
    }
  }

  this.tryAddRunningTask = function () {
    let taskInfo = this.getCurrentTaskInfo()
    let runningTask = this.getRunningStatus()
    if (runningTask !== null) {
      _logUtils.debugInfo('当前有任务正在运行：' + JSON.stringify(runningTask))
      if (runningTask.source === taskInfo.source) {
        _logUtils.debugInfo('运行中脚本任务和当前任务相同，继续判断同源脚本是否正在运行')
        // 如果判断当前运行中和存储任务状态是同一个则不去校验是否重复运行
        if (runningTask.engineId !== taskInfo.engineId) {
          // 避免重复运行，如果挂了则继续
          this.checkDuplicateRunning(runningTask.engineId)
          let oldRunningEngineId = runningTask.engineId
          if (this.lock(3)) {
            runningTask = this.getRunningStatus()
            if (runningTask == null || oldRunningEngineId === runningTask.engineId) {
              // 更新运行中任务信息
              this.doAddRunningTask(taskInfo)
              this.unlock()
            } else {
              _logUtils.debugInfo(['重新获取的运行中engineId: {} 和旧的engineId: {} 不同 重新尝试加入运行', runningTask.engineId, oldRunningEngineId])
              this.unlock()
              return this.tryAddRunningTask()
            }
          } else {
            _logUtils.warnInfo('更新运行中任务信息失败，200ms后重试')
            sleep(200)
            return this.tryAddRunningTask()
          }
        }
        _logUtils.debugInfo('运行状态校验成功，执行后续功能')
        return true
      } else {
        let runningEngines = this.tryGetRunningEngines()
        if (runningEngines === null || runningEngines.find(v => v.id === runningTask.engineId || runningTask.source === v.getSource() + '')) {
          _logUtils.debugInfo('运行中任务执行正常')
        } else {
          if (this.lock(3)) {
            _logUtils.warnInfo('运行中任务已经异常关闭，直接删除运行中标记')
            // 清空运行中数据
            this.getStorage().put(RUNNING_KEY, '')
            this.unlock()
            // 然后重新加入运行中任务
            return this.tryAddRunningTask()
          } else {
            _logUtils.warnInfo('运行中任务已经异常关闭，删除运行中标记失败')
          }
        }
        return false
      }
    } else {
      if (this.lock()) {
        _logUtils.debugInfo('当前无任务等待，直接执行：' + JSON.stringify(taskInfo))
        this.doAddRunningTask(taskInfo)
        this.unlock()
        return true
      } else {
        _logUtils.errorInfo('获取锁失败，无法继续执行任务：' + JSON.stringify(taskInfo))
        return false
      }
    }
  }

  this.addAwaitTask = function (taskInfo) {
    if (this.isTaskInQueue(taskInfo)) {
      _logUtils.debugInfo(['任务：{} 已经在队列中，不再加入任务队列', JSON.stringify(taskInfo)])
      return
    }
    let storedArrayStr = this.getStorage().get(WAITING_QUEUE_KEY)
    let storedArray = null
    if (storedArrayStr) {
      storedArray = JSON.parse(storedArrayStr)
    } else {
      storedArray = []
    }
    storedArray.push(taskInfo)
    if (this.lock(3)) {
      this.getStorage().put(WAITING_QUEUE_KEY, JSON.stringify(storedArray))
      this.distinctAwaitTasks()
      this.unlock()
    } else {
      _logUtils.errorInfo('添加等待任务队列失败，获取写锁失败，任务信息：' + JSON.stringify(taskInfo))
      this.setUpAutoStart(taskInfo.source, 10)
    }
  }

  /**
   * 对等待中任务进行去重操作并持久化
   *
   * @param {boolean} removeCurrentEngine 是否移除当前脚本引擎的任务 主要用于调度后续任务，避免因为插队导致重复执行脚本
   */
  this.distinctAwaitTasks = function (removeCurrentEngine) {
    if (this.lock()) {
      let storedArrayStr = this.getStorage().get(WAITING_QUEUE_KEY)
      let storedArray = null
      if (storedArrayStr) {
        storedArray = JSON.parse(storedArrayStr)
      } else {
        storedArray = []
      }
      if (storedArray && storedArray.length > 0) {
        _logUtils.debugInfo('去重复前的任务队列：' + storedArrayStr)
        let distinctArray = []
        storedArray.forEach(task => {
          if (distinctArray.map(r => r.source).indexOf(task.source) < 0) {
            if (removeCurrentEngine && task.source === this.currentEngineSource) {
              _logUtils.debugInfo('去除当前任务：' + JSON.stringify(task))
              return
            }
            distinctArray.push(task)
          }
        })
        let distinctArrayStr = JSON.stringify(distinctArray)
        _logUtils.debugInfo('去重复后的任务队列：' + distinctArrayStr)
        this.getStorage().put(WAITING_QUEUE_KEY, distinctArrayStr)
      } else {
        _logUtils.debugInfo('队列小于等于1 不需要去重:' + storedArrayStr)
      }
      this.unlock()
    }
  }

  /**
   * 判断任务是否已经加入到了等待队列
   */
  this.isTaskInQueue = function (taskInfo) {
    this.distinctAwaitTasks()
    let storedArrayStr = this.getStorage().get(WAITING_QUEUE_KEY)
    let storedArray = null
    if (storedArrayStr) {
      storedArray = JSON.parse(storedArrayStr)
    } else {
      storedArray = []
    }
    taskInfo = taskInfo || this.getCurrentTaskInfo()
    if (storedArray.length > 0 && storedArray.find(task => task.source === taskInfo.source)) {
      return true
    } else {
      return false
    }
  }

  /**
   * 尝试获取运行中的脚本引擎
   * 每200~300毫秒获取一次
   */
  this.tryGetRunningEngines = function (tryCount) {
    let runningEngines = null
    tryCount = tryCount || 5
    while (runningEngines === null && tryCount-- > 0) {
      // engines.all()有并发问题，尝试多次获取
      try {
        runningEngines = engines.all()
      } catch (e) {
        // 延迟随机时间200~300毫秒
        sleep(200 + parseInt(Math.random() * 100 % 100))
      }
    }
    if (runningEngines === null) {
      _logUtils.warnInfo('获取运行中脚本引擎失败')
    }
    return runningEngines
  }

  /**
   * 对运行中任务进行续期
   * 
   * @param {number} time 分钟 默认15
   */
  this.renewalRunningTask = function (time, keepRunning) {
    time = time || 15
    let taskInfo = this.getCurrentTaskInfo()
    let runningTask = this.getRunningStatus()
    if (runningTask) {
      // 运行中任务不是自己，无法续期，直接退出当前脚本
      // 可能存在的情况是续期操作太晚，导致其他脚本已经进入运行状态，必须让出执行权
      if (runningTask.source !== taskInfo.source || runningTask.engineId !== taskInfo.engineId) {
        _logUtils.debugInfo(['当前运行中任务和当前任务不同，无法续期 运行中任务：{} {}', runningTask.engineId, runningTask.source])
        _logUtils.debugInfo(['当前任务：{} {}', taskInfo.engineId, taskInfo.source])
        if (keepRunning) {
          _logUtils.debugInfo(['保持运行，直到获取任务锁'])
        } else {
          _logUtils.debugInfo(['将当前任务加入等待队列'])
          this.addAwaitTask(taskInfo)
          exit()
        }
      }
    }
    // 没有运行中的任务或者运行中的任务是自身，直接续期
    taskInfo.timeout = new Date().getTime() + time * 60000
    if (this.lock()) {
      this.getStorage().put(RUNNING_KEY, JSON.stringify(taskInfo))
      this.unlock()
    }
  }
}


module.exports = new RunningQueueDispatcher()