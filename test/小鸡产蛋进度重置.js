/*
 * @Author: TonyJiangWJ
 * @Date: 2024-12-17 13:47:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-05-10 18:33:30
 * @Description: 
 *  这是一个代码片段也可以说是一个代码模板，可以在这个文件中修改代码逻辑，节省时间
 *  当前为一个简单的带悬浮按钮的示例 具体见代码中的注释
 */

// /sdcard/脚本/蚂蚁庄园/test/
let { config } = require('../config.js')(runtime, global)
// config.buddha_like_mode = false
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
floatyInstance.enableLog()
let commonFunctions = singletonRequire('CommonFunction')
let EGG_PROCESS = "eggProcess"
commonFunctions.updateRuntimeStorage(EGG_PROCESS, {
  process: 47,// 指定一下上一次记录
  count: 0
})

