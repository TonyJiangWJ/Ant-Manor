/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-27 09:03:57
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2024-03-18 13:36:06
 * @Description: 
 */
let { config, storage_name } = require('./config.js')(runtime, this)
let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, this)
let resourceMonitor = require('./lib/ResourceMonitor.js')(runtime, this)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let FileUtils = singletonRequire('FileUtils')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let commonFunctions = singletonRequire('CommonFunction')
let YoloDetection = singletonRequire('YoloDetectionUtil')
commonFunctions.delayIfBatteryLow()
if (config.single_script) {
  logInfo('======单脚本运行直接清空任务队列=======')
  runningQueueDispatcher.clearAll()
}
config.not_lingering_float_window = true
logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()
commonFunctions.killDuplicateScript()
let FloatyInstance = singletonRequire('FloatyUtil')
let automator = singletonRequire('Automator')
let callStateListener = !config.is_pro && config.enable_call_state_control ? singletonRequire('CallStateListener') : { exitIfNotIdle: () => { } }
let unlocker = require('./lib/Unlock.js')
let manorRunner = require('./core/AntManorRunner.js')

callStateListener.exitIfNotIdle()
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  // 重置自动亮度
  config.resetBrightness && config.resetBrightness()
  flushAllLogs()
  // 针对免费版内存主动释放，Pro版不需要
  commonFunctions.reduceConsoleLogs()
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, true,
    // 执行一些必须在当前脚本加入过队列后才能执行的代码
    () => {
      // 保存是否需要重新锁屏
      unlocker.saveNeedRelock()
      config.isRunning = false
    }
  )
}, 'main')
/***********************
 * 初始化
 ***********************/
logInfo('======校验无障碍功能======')
// 检查手机是否开启无障碍服务
// 当无障碍经常莫名消失时  可以传递true 强制开启无障碍
// if (!commonFunctions.checkAccessibilityService(true)) {
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
commonFunctions.markExtendSuccess()
logInfo('---前置校验完成;启动系统--->>>>')
// 打印运行环境信息
if (files.exists('version.json')) {
  let content = JSON.parse(files.read('version.json'))
  logInfo(['版本信息：{} nodeId:{}', content.version, content.nodeId])
} else if (files.exists('project.json')) {
  let content = JSON.parse(files.read('project.json'))
  logInfo(['版本信息：{}', content.versionName])
} else {
  logInfo('无法获取脚本版本信息')
}
logInfo(['AutoJS version: {}', app.autojs.versionName])
logInfo(['device info: {} {} {}', device.brand, device.product, device.release])

logInfo(['设备分辨率：[{}, {}]', config.device_width, config.device_height])
logInfo(['Yolo支持：{}', YoloDetection.enabled])
YoloDetection.validLabels()
logInfo('======解锁======')
try {
  unlocker.exec()
} catch (e) {
  let currentDate = new Date()
  let sleepTime = 3
  if (currentDate.getHours() <= 7 && currentDate.getHours() >= 0) {
    // 夜间15分钟
    sleepTime = 15
  }
  errorInfo(['解锁发生异常, {}分钟后重新开始' + e, sleepTime])
  commonFunctions.printExceptionStack(e)
  commonFunctions.setUpAutoStart(sleepTime)
  runningQueueDispatcher.removeRunningTask()
  exit()
}
logInfo('解锁成功')
commonFunctions.forceCheckForcegroundPermission()

let executeArguments = engines.myEngine().execArgv
debugInfo(['启动参数：{}', JSON.stringify(executeArguments)])
// 定时启动的任务, 将截图权限滞后请求
if (!executeArguments.intent || executeArguments.executeByDispatcher) {
  commonFunctions.requestScreenCaptureOrRestart()
  commonFunctions.ensureDeviceSizeValid()
}
// 初始化悬浮窗
if (!FloatyInstance.init()) {
  runningQueueDispatcher.removeRunningTask()
  // 悬浮窗初始化失败，6秒后重试
  sleep(6000)
  runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())
  exit()
}
// 自动设置刘海偏移量
commonFunctions.autoSetUpBangOffset()
/************************
 * 主程序
 ***********************/
function mainExec () {
  commonFunctions.showDialogAndWait(true)
  commonFunctions.listenDelayStart()
  manorRunner.start()
}

if (config.develop_mode) {
  mainExec()
} else {

  try {
    mainExec()
  } catch (e) {
    commonFunctions.printExceptionStack(e)
    errorInfo('执行发生异常' + e + ' 三分钟后重启')
    commonFunctions.setUpAutoStart(3)
  }
}
if (config.auto_lock === true && unlocker.needRelock() === true) {
  debugInfo('重新锁定屏幕')
  automator.lockScreen()
  unlocker.saveNeedRelock(true)
}
FloatyInstance.close()
runningQueueDispatcher.removeRunningTask(true)
exit()
