/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-27 09:03:57
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-23 22:43:07
 * @Description: 
 */
'ui';

let currentEngine = engines.myEngine().getSource() + ''
let isRunningMode = currentEngine.endsWith('/config.js')
importClass(android.text.TextWatcher)
importClass(android.view.View)
importClass(android.view.MotionEvent)

// 执行配置
var default_config = {
  timeout_existing: 6000,
  timeout_findOne: 1000,
  timeout_unlock: 1000,
  password: '',
  is_alipay_locked: false,
  alipay_lock_password: '',
  color_offset: 20,
  // 是否显示调试日志信息
  show_debug_log: true,
  // 是否toast调试日志
  toast_debug_info: false,
  saveLogFile: true,
  // 完成后通过手势kill支付宝应用，目前只支持MIUI全面屏手势 默认关闭
  killAppWithGesture: false,
  // 是否使用加速卡 默认为true
  useSpeedCard: true,
  starBallScore: 205
}

// 配置缓存的key值
const CONFIG_STORAGE_NAME = 'chick_config_version'
var configStorage = storages.create(CONFIG_STORAGE_NAME)
var config = {}
if (!configStorage.contains('password')) {
  toastLog('使用默认配置')
  // 存储默认配置到本地
  Object.keys(default_config).forEach(key => {
    configStorage.put(key, default_config[key])
  })
  config = default_config
} else {
  Object.keys(default_config).forEach(key => {
    let storedConfigItem = configStorage.get(key)
    if (storedConfigItem === undefined) {
      storedConfigItem = default_config[key]
    }
    config[key] = storedConfigItem
  })
}
log('当前配置信息：' + JSON.stringify(config))
if (!isRunningMode) {
  module.exports = {
    config: config,
    default_config: default_config,
    storage_name: CONFIG_STORAGE_NAME
  }
} else {
  let loadingDialog = null
  threads.start(function () {
    loadingDialog = dialogs.build({
      title: "加载中...",
      progress: {
        max: -1
      },
      cancelable: false
    }).show()
    setTimeout(function () {
      loadingDialog.dismiss()
    }, 3000)
  })

  const TextWatcherBuilder = function (textCallback) {
    return new TextWatcher({
      onTextChanged: (text) => {
        textCallback(text + '')
      },
      beforeTextChanged: function (s) { }
      ,
      afterTextChanged: function (s) { }
    })
  }

  const setUiValues = function () {
    ui.password.text(config.password)
    ui.isAlipayLockedChkBox.setChecked(config.is_alipay_locked)
    ui.alipayLockPasswordInpt.setText(config.alipay_lock_password)
    ui.alipayLockPasswordContainer.setVisibility(config.is_alipay_locked ? View.VISIBLE : View.GONE)
    ui.colorThresholdInput.text('' + config.color_offset)
    let precent = parseInt(config.color_offset / 255 * 100)
    ui.colorThresholdSeekbar.setProgress(precent)

    ui.useSpeedCardChkBox.setChecked(config.useSpeedCard)

    ui.showDebugLogChkBox.setChecked(config.show_debug_log)
    ui.saveLogFileChkBox.setChecked(config.saveLogFile)
    ui.starBallScoreInpt.setText(config.starBallScore + '')
  }

  setTimeout(function () {
    ui.layout(
      <drawer>
        <vertical>
          <appbar>
            <toolbar id="toolbar" title="运行配置" />
          </appbar>
          <frame>
            <vertical padding="24 0">
              {/* 锁屏密码 */}
              <horizontal gravity="center">
                <text text="锁屏密码：" />
                <input id="password" inputType="textPassword" layout_weight="80" />
              </horizontal>
              <checkbox id="isAlipayLockedChkBox" text="支付宝是否锁定" />
              <horizontal gravity="center" id="alipayLockPasswordContainer">
                <text text="支付宝手势密码对应的九宫格数字：" textSize="10sp" />
                <input id="alipayLockPasswordInpt" inputType="textPassword" layout_weight="80" />
              </horizontal>
              <horizontal w="*" h="1sp" bg="#cccccc" margin="5 5"></horizontal>
              {/* 颜色识别 */}
              <text text="颜色相似度（拖动为百分比，实际使用0-255）" textColor="black" textSize="16sp" />
              <horizontal gravity="center">
                <text id="colorThresholdInput" />
                <seekbar id="colorThresholdSeekbar" progress="20" layout_weight="85" />
              </horizontal>
              {/* 是否使用加速卡 */}
              <checkbox id="useSpeedCardChkBox" text="是否使用加速卡" />
              <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
              {/* 是否显示debug日志 */}
              <checkbox id="showDebugLogChkBox" text="是否显示debug日志" />
              <checkbox id="saveLogFileChkBox" text="是否保存日志到文件" />
              <horizontal padding="10 0" gravity="center" layout_weight="75">
                <text text="星星球目标分数：" layout_weight="20" />
                <input id="starBallScoreInpt" inputType="number" textSize="14sp" layout_weight="80" />
              </horizontal>
            </vertical>
          </frame>
        </vertical>
      </drawer>
    )

    // 创建选项菜单(右上角)
    ui.emitter.on("create_options_menu", menu => {
      menu.add("全部重置为默认")
    })
    // 监听选项菜单点击
    ui.emitter.on("options_item_selected", (e, item) => {
      switch (item.getTitle()) {
        case "全部重置为默认":
          confirm('确定要将所有配置重置为默认值吗？').then(ok => {
            if (ok) {
              Object.keys(default_config).forEach(key => {
                let defaultValue = default_config[key]
                config[key] = defaultValue
                configStorage.put(key, defaultValue)
              })
              setUiValues()
            }
          })
          break
      }
      e.consumed = true
    })
    activity.setSupportActionBar(ui.toolbar)

    setUiValues()


    ui.password.addTextChangedListener(
      TextWatcherBuilder(text => { config.password = text + '' })
    )


    ui.isAlipayLockedChkBox.on('click', () => {
      config.is_alipay_locked = ui.isAlipayLockedChkBox.isChecked()
      ui.alipayLockPasswordContainer.setVisibility(config.is_alipay_locked ? View.VISIBLE : View.GONE)
    })


    ui.useSpeedCardChkBox.on('click', () => {
      config.useSpeedCard = ui.useSpeedCardChkBox.isChecked()
    })

    ui.alipayLockPasswordInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.alipay_lock_password = text + '' })
    )

    ui.colorThresholdSeekbar.on('touch', () => {
      let precent = ui.colorThresholdSeekbar.getProgress()
      let trueVal = parseInt(precent * 255 / 100)
      ui.colorThresholdInput.text('' + trueVal)
      config.color_offset = trueVal
    })

    ui.starBallScoreInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.starBallScore = parseInt(text) })
    )

    ui.isAlipayLockedChkBox.on('click', () => {
      config.is_alipay_locked = ui.isAlipayLockedChkBox.isChecked()
      ui.alipayLockPasswordContainer.setVisibility(config.is_alipay_locked ? View.VISIBLE : View.GONE)
    })

    ui.showDebugLogChkBox.on('click', () => {
      config.show_debug_log = ui.showDebugLogChkBox.isChecked()
    })

    ui.saveLogFileChkBox.on('click', () => {
      config.saveLogFile = ui.saveLogFileChkBox.isChecked()
    })

    setTimeout(() => {
      loadingDialog.dismiss()
    }, 500)
  }, 400)

  ui.emitter.on('pause', () => {
    ui.finish()
    Object.keys(default_config).forEach(key => {
      let newVal = config[key]
      if (typeof newVal !== 'undefined') {
        configStorage.put(key, newVal)
      } else {
        configStorage.put(key, default_config[key])
      }
    })
    log('配置后配置信息：' + JSON.stringify(config))
  })
}