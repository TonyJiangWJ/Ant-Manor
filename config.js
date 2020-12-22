/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-27 09:03:57
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-22 19:48:59
 * @Description: 
 */
let currentEngine = engines.myEngine().getSource() + ''
let isRunningMode = currentEngine.endsWith('/config.js') && typeof module === 'undefined'
let is_pro = Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)
let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
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
  show_engine_id: false,
  develop_mode: false,
  // 是否保存日志文件，如果设置为保存，则日志文件会按时间分片备份在logback/文件夹下
  save_log_file: true,
  // 异步写入日志文件
  async_save_log_file: true,
  back_size: '100',
  enable_call_state_control: false,
  // 完成后通过手势kill支付宝应用，目前只支持MIUI全面屏手势 默认关闭
  killAppWithGesture: false,
  // 是否使用加速卡 默认为true
  useSpeedCard: true,
  starBallScore: 205,
  // 倒计时结束 等待的窗口时间
  windowTime: 5,
  recheckTime: 5,
  device_width: device.width,
  device_height: device.height,
  auto_lock: false,
  lock_x: 150,
  lock_y: 970,
  // 锁屏启动关闭提示框
  dismiss_dialog_if_locked: true,
  // 单脚本模式 是否只运行一个脚本 不会同时使用其他的 开启单脚本模式 会取消任务队列的功能。
  // 比如同时使用其他脚本 则保持默认 false 否则设置为true 无视其他运行中的脚本
  single_script: false,
  // 延迟启动时延 5秒 悬浮窗中进行的倒计时时间
  delayStartTime: 5,
  // 是否是AutoJS Pro  需要屏蔽部分功能，暂时无法实现：生命周期监听等 包括通话监听
  is_pro: is_pro,
  // 是否捡屎
  pick_shit: false,
  request_capture_permission: true,
  capture_permission_button: 'START NOW|立即开始|允许',
  auto_set_bang_offset: true,
  bang_offset: 0,
  async_waiting_capture: true,
  capture_waiting_time: 500,
  useOcr: true,
  apiKey: '0dGhhIf529lp1bB7vdH5vYFe',
  secretKey: 'Pk2M9CKcwsx0075Cslso0lUfIp8D5Lut',
  // 自动更新后需要强制执行的标记
  updated_temp_flag_1325: true,
  converted_custom_configs: false,
  thread_name_prefix: 'antmanor_',
  check_device_posture: false,
  check_distance: false,
  posture_threshold_z: 6,
  skip_running_packages: [],
  // 区域信息配置
  CHECK_APP_COLOR: '#f1381a',         // 校验蚂蚁庄园是否打开成功的颜色
  CHECK_FRIENDS_COLOR: '#429beb',     // 校验是否成功进入好友首页的颜色
  THIEF_COLOR: '#000000',             // 校验小偷鸡眼罩的颜色 黑色
  PUNCH_COLOR: '#f35458',             // 校验拳头的颜色
  OUT_COLOR: '#c37a3e',               // 校验小鸡是否出门，牌子的颜色
  OUT_IN_FRIENDS_COLOR: '#e9ca02',    // 校验自家小鸡外出所在的颜色，ID的颜色 黄色
  DISMISS_COLOR: '#f9622f',           // 校验关闭按钮的颜色
  FOOD_COLOR: '#ffcf00',              // 校验正在进食盆里饲料的颜色
  SPEED_CHECK_COLOR: '#ffd000',       // 校验是否成功使用加速卡，小鸡右手上饲料的颜色
  reco: [200, 1100, 750, 600],        // 星星球的判断区域

  OFFSET: 0,  // 默认配置为支持2160*1080分辨率，其他异形屏一般可以尝试仅仅修改该偏移量, 如果不行就修改具体区域的配置吧
  CHECK_APP_REGION: [310, 300, 20, 20],             // 校验是否成功打开蚂蚁庄园的区域，左上角❤️的区域
  CHECK_FRIENDS_REGION: [120, 500, 10, 10],         // 校验是否在好友首页的区域  左上角 发消息蓝色的区域
  OUT_REGION: [530, 1450, 25, 25],                  // 校验小鸡是否出门，牌子的区域
  OUT_IN_FRIENDS_REGION_RIGHT: [800, 1405, 50, 50], // 校验小鸡在好友家，左边的区域
  OUT_IN_FRIENDS_REGION_LEFT: [340, 1405, 50, 50],  // 校验小鸡在好友家，右边的区域
  LEFT_THIEF_REGION: [385, 1550, 50, 50],           // 校验来自家偷吃的小鸡，左边的区域
  LEFT_PUNCH_REGION: [500, 1375, 100, 100],         // 校验左边拳头的区域
  RIGHT_THIEF_REGION: [825, 1550, 50, 50],          // 校验来自家偷吃的小鸡，右边的区域
  RIGHT_PUNCH_REGION: [980, 1375, 100, 100],        // 校验右边拳头的区域
  DISMISS_REGION: [450, 2000, 50, 100],              // 校验关闭按钮的区域
  FOOD_REGION: [600, 1575, 10, 10],                 // 校验食盆的区域，主要校验是否存在饲料
  SPEED_CHECK_REGION: [500, 1575, 10, 10],          // 校验是否成功使用加速卡的区域，小鸡右手拿饲料的位置
  COUNT_DOWN_REGION: [810, 1600, 160, 55],          // 倒计时区域
  // 喂饲料按钮的位置
  FEED_POSITION: {
    x: 930,
    y: 2100
  },
  // 道具包按钮的位置
  TOOL_POSITION: {
    x: 960,
    y: 645
  },
  // 道具包中加速卡按钮的位置
  SPEED_CARD_POSITION: {
    x: 190,
    y: 1450
  },
  // 确认按钮的位置
  CONFIRM_POSITON: {
    x: 720,
    y: 1420
  },
  // 捡屎
  SHIT_CHECK_REGION: [435, 1925, 40, 40],
  COLLECT_SHIT_CHECK_REGION: [220, 2000, 80, 40],
  PICK_SHIT_GRAY_COLOR: '#888888',
  COLLECT_SHIT_GRAY_COLOR: '#838383'
}
let custom_config = files.exists(FileUtils.getCurrentWorkPath() + '/extends/CustomConfig.js') ? require('./extends/CustomConfig.js') : null
// 配置缓存的key值
let CONFIG_STORAGE_NAME = 'chick_config_version'
let PROJECT_NAME = '蚂蚁庄园'
var storageConfig = storages.create(CONFIG_STORAGE_NAME)
var config = {}
if (!storageConfig.contains('password')) {
  toastLog('使用默认配置')
  // 存储默认配置到本地
  Object.keys(default_config).forEach(key => {
    storageConfig.put(key, default_config[key])
  })
  config = default_config
} else {
  Object.keys(default_config).forEach(key => {
    let storedConfigItem = storageConfig.get(key)
    if (storedConfigItem === undefined) {
      storedConfigItem = default_config[key]
    }
    config[key] = storedConfigItem
  })
  if (custom_config !== null) {
    Object.keys(custom_config).forEach(key => {
      let value = custom_config[key]
      if (typeof value !== 'undefined') {
        default_config[key] = value
      }
    })
    if (!config.converted_custom_configs) {
      Object.keys(custom_config).forEach(key => {
        let value = custom_config[key]
        if (typeof value !== 'undefined') {
          config[key] = value
        }
      })
      config.converted_custom_configs = true
      storageConfig.put('converted_custom_configs', true)
    }
  }
  
}
if (!isRunningMode) {
  module.exports = function (__runtime__, scope) {
    if (typeof scope.config_instance === 'undefined') {
      scope.config_instance = {
        config: config,
        default_config: default_config,
        storage_name: CONFIG_STORAGE_NAME,
        project_name: PROJECT_NAME
      }
      events.broadcast.on(CONFIG_STORAGE_NAME + 'config_changed', function (params) {
        let newConfig = params.config
        let currentId = engines.myEngine().id
        let senderId = params.id
        if (currentId !== senderId) {
          console.verbose(currentId + ' 获取从' + senderId + '得到的新的配置信息' + JSON.stringify(newConfig))
          Object.assign(scope.config_instance.config, newConfig)
        }
      })
    }
    return scope.config_instance
  }

} else {
  setTimeout(function () {
    engines.execScriptFile(files.cwd() + "/可视化配置.js", { path: files.cwd() })
  }, 30)
}
