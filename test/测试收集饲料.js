let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')
commonFunctions.ensureAccessibilityEnabled()
commonFunctions.requestScreenCaptureOrRestart(true)
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let collector = require('../core/FodderCollector.js')

collector.exec()
