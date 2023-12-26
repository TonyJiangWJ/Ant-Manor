

let { config } = require('../../config.js')(runtime, global)
let sRequire = require('../SingletonRequirer.js')(runtime, global)
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let fileUtils = sRequire('FileUtils')

let currentPath = fileUtils.getCurrentWorkPath()
let yoloSupport = false
try {
  importClass(com.stardust.autojs.onnx.YoloV8Predictor)
  importClass(com.stardust.autojs.onnx.util.Letterbox)
  yoloSupport = true
} catch (e) {
  debugInfo(['当前版本AutoJS不支持yolo'])
}


let modelPath = currentPath + '/config_data/manor_lite.onnx'
if (yoloSupport && !files.exists(modelPath)) {
  warnInfo(['yolo预测模型不存在，请通过指定工具下载模型'])
  yoloSupport = false
}

function YoloDetection() {
  this.enabled = yoloSupport && config.detect_by_yolo
  if (yoloSupport) {
    let predictor = new YoloV8Predictor(modelPath)
    predictor.setShapeSize(480, 480)
    predictor.setConfThreshold(0.5)

    let labels = java.util.Arrays.asList(
      'booth_btn', 'collect_coin', 'collect_egg', 'collect_food', 'cook', 'countdown', 'donate',
      'eating_chicken', 'employ', 'empty_booth', 'feed_btn', 'friend_btn', 'has_food', 'has_shit',
      'hungry_chicken', 'item', 'kick-out', 'no_food', 'not_ready', 'operation_booth', 'plz-go',
      'punish_booth', 'punish_btn', 'signboard', 'sleep', 'speedup', 'sports', 'stopped_booth',
      'thief_chicken', 'close_btn', 'collect_muck', 'confirm_btn', 'working_chicken', 'bring_back',
      'leave_msg', 'speedup_eating',
    )
    predictor.setLabels(labels)
    this.predictor = predictor
  }

  this.forward = function (img, filterOption) {
    filterOption = filterOption || {}
    if (!this.enabled) {
      return
    }
    let start = new Date()
    let resultList = util.java.toJsArray(this.predictor.predictYolo(img.mat))
    resultList = resultList.map(box => {
      return {
        label: box.label,
        classId: box.clsId,
        x: box.left,
        y: box.top,
        width: box.right - box.left,
        height: box.bottom - box.top,
        confidence: box.confidence
      }
    }).filter(result => {
      if (filterOption.labelRegex) {
        if (!new RegExp(filterOption.labelRegex).test(result.label)) {
          return false
        }
      }
      if (filterOption.confidence) {
        if (result.confidence < filterOption.confidence) {
          return false
        }
      }
      if (filterOption.clsIds && filterOption.clsIds.length > 0) {
        if (filterOption.clsIds.indexOf(result.classId) < 0) {
          return false
        }
      }
      if (typeof filterOption.boundsInside == 'function') {
        if (!filterOption.boundsInside(result)) {
          return false
        }
      }
      if (typeof filterOption.filter == 'function') {
        if (!filterOption.filter(result)) {
          return false
        }
      }
      return true
    })
    debugInfo(['yolo 识别耗时：{}ms', new Date() - start])
    return resultList
  }
}

module.exports = new YoloDetection()