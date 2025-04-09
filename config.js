/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-27 09:03:57
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-04-08 12:31:43
 * @Description: 
 */
require('./lib/Runtimes.js')(global)
// 执行配置
var default_config = {
  is_alipay_locked: false,
  alipay_lock_password: '',
  color_offset: 20,
  yolo_shape_size: 480,
  yolo_confidence_threshold: 0.5,
  yolo_model_path: '/config_data/manor_lite.onnx',
  yolo_labels: ['booth_btn', 'collect_coin', 'collect_egg', 'collect_food', 'cook', 'countdown', 'donate',
    'eating_chicken', 'employ', 'empty_booth', 'feed_btn', 'friend_btn', 'has_food', 'has_shit',
    'hungry_chicken', 'item', 'kick-out', 'no_food', 'not_ready', 'operation_booth', 'plz-go',
    'punish_booth', 'punish_btn', 'signboard', 'sleep', 'speedup', 'sports', 'stopped_booth',
    'thief_chicken', 'close_btn', 'collect_muck', 'confirm_btn', 'working_chicken', 'bring_back',
    'leave_msg', 'speedup_eating', 'close_icon', 'family', 'feed_expand'],

  // 完成后通过手势kill支付宝应用，目前只支持MIUI全面屏手势 默认关闭
  killAppWithGesture: false,
  // 是否使用加速卡 默认为true
  useSpeedCard: true,
  starBallScore: 205,
  // 倒计时结束 等待的窗口时间
  windowTime: 5,
  recheckTime: 5,
  // 多设备可信登录
  multi_device_login: false,
  // 是否捡屎
  pick_shit: false,
  apiKey: '0dGhhIf529lp1bB7vdH5vYFe',
  secretKey: 'Pk2M9CKcwsx0075Cslso0lUfIp8D5Lut',
  // 自动更新后需要强制执行的标记
  updated_temp_flag_1325: true,
  converted_custom_configs: false,
  thread_name_prefix: 'antmanor_',
  package_name: 'com.eg.android.AlipayGphone',
  // 蚂蚁新村多账号配置
  main_account: '',
  accounts: [],
  not_lingering_float_window: true,
  github_url: 'https://github.com/TonyJiangWJ/Ant-Manor',
  // github release url 用于检测更新状态
  github_latest_url: 'https://api.github.com/repos/TonyJiangWJ/Ant-Manor/releases/latest',
  history_tag_url: 'https://api.github.com/repos/TonyJiangWJ/Ant-Manor/tags',
  feed_cycle_time: 300,
  speeded_feed_cycle_time: 240,
  // 小鸡睡觉配置
  to_sleep_position: true,
  to_sleep_entry: {
    x: 860,
    y: 1220
  },
  to_sleep_bed: {
    x: 200,
    y: 740
  },
  // 捐蛋按钮位置
  donate_egg: {
    x: 530,
    y: 2100
  },
  notificationId: 143,
  notificationChannelId: 'ant_manor_channel_id',
  notificationChannel: '蚂蚁庄园通知',
  // 区域信息配置
  CHECK_APP_COLOR: '#f1381a',         // 校验蚂蚁庄园是否打开成功的颜色
  CHECK_FRIENDS_COLOR: '#fad082',     // 校验是否成功进入好友首页的颜色
  THIEF_COLOR: '#524c68',             // 校验小偷鸡眼罩的颜色 黑色
  PUNCH_COLOR: '#f35458',             // 校验拳头的颜色
  OUT_COLOR: '#c37a3e',               // 校验小鸡是否出门，牌子的颜色
  OUT_IN_FRIENDS_COLOR: '#e9ca02',    // 校验自家小鸡外出所在的颜色，ID的颜色 黄色
  DISMISS_COLOR: '#f9622f',           // 校验关闭按钮的颜色
  FOOD_COLOR: '#ffda33',              // 校验正在进食盆里饲料的颜色
  SPEED_CHECK_COLOR: '#f9d558',       // 校验是否成功使用加速卡，小鸡右手上饲料的颜色
  reco: [200, 1100, 750, 600],        // 星星球的判断区域

  OFFSET: 0,  // 默认配置为支持2160*1080分辨率，其他异形屏一般可以尝试仅仅修改该偏移量, 如果不行就修改具体区域的配置吧
  CHECK_APP_REGION: [352, 300, 20, 20],             // 校验是否成功打开蚂蚁庄园的区域，左上角❤️的区域
  CHECK_FRIENDS_REGION: [120, 472, 10, 10],         // 校验是否在好友首页的区域  左上角 发消息蓝色的区域
  OUT_REGION: [517, 1450, 25, 25],                  // 校验小鸡是否出门，牌子的区域
  OUT_IN_FRIENDS_REGION_RIGHT: [800, 1405, 50, 50], // 校验小鸡在好友家，左边的区域
  OUT_IN_FRIENDS_REGION_LEFT: [360, 1302, 50, 50],  // 校验小鸡在好友家，右边的区域
  LEFT_THIEF_REGION: [385, 1475, 50, 50],           // 校验来自家偷吃的小鸡，左边的区域
  LEFT_PUNCH_REGION: [500, 1300, 100, 100],         // 校验左边拳头的区域
  RIGHT_THIEF_REGION: [832, 1475, 50, 50],          // 校验来自家偷吃的小鸡，右边的区域
  RIGHT_PUNCH_REGION: [980, 1300, 100, 100],        // 校验右边拳头的区域
  DISMISS_REGION: [450, 2000, 50, 100],              // 校验关闭按钮的区域
  FOOD_REGION: [845, 1630, 10, 10],                 // 校验食盆的区域，主要校验是否存在饲料
  SPEED_CHECK_REGION: [480, 1420, 32, 43],          // 校验是否成功使用加速卡的区域，小鸡右手拿饲料的位置
  COUNT_DOWN_REGION: [780, 1540, 160, 60],          // 倒计时区域
  // 喂饲料按钮的位置
  FEED_POSITION: {
    x: 930,
    y: 2110
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
  SHIT_CHECK_REGION: [660, 1875, 30, 20],
  COLLECT_SHIT_CHECK_REGION: [220, 1210, 80, 40],
  PICK_SHIT_GRAY_COLOR: '#111111',
  COLLECT_SHIT_GRAY_COLOR: '#535353',
}

// YOLO训练数据保存用的key值和描述信息
let yolo_save_list = [
  ['check_failed', 'YOLO识别失败'],
  ['low_predict', '低可信度'],
  ['friend_home_yolo_failed', '好友界面失败'],
  ['close_icon_failed', '关闭按钮图标失败'],
  ['open_village_failed', '打开新村失败'],
  ['empty_booth_failed', '识别空摊位失败'],
  ['confirm_btn_fail', '查找确认或关闭失败'],
  ['feed_expand_failed', '查找展开饲料失败'],
  ['thief_chicken_check_failed', '偷吃野鸡识别失败'],
  ['sleep_entry', '去睡觉入口'],
  ['sleep_bed', '睡觉床'],
  ['signboard', '主界面外出|睡觉牌子'],
  ['confirm_btn', '确认或关闭'],
  ['friend_home_failed', '小鸡不在好友家'],
  ['chick_out', '小鸡外出'],
  ['thief_chicken', '有小偷鸡'],
  ['no_thief_chicken', '没小偷鸡'],
  ['eating_chicken', '小鸡吃饭中'],
  ['hungry_chicken', '小鸡没饭吃'],
  ['close_icon', '关闭按钮图标'],
  ['pick_shit', '有屎可以捡'],
  ['execute_pick_shit', '执行捡屎'],
  ['collect_muck', '收集饲料按钮'],
  ['speedup_eating', '加速吃饭中'],
  ['operate_booth', '可操作摊位'],
  ['empty_booth', '有空摊位'],
  ['no_empty_booth', '无空摊位'],
  ['booth_btn', '摆摊赚币按钮'],
  ['village_speedup', '加速产币按钮'],
  ['do_booth_btn', '去摆摊按钮'],
  ['table', '小屋茶几'],
  ['farm_collect', '领取农场食材'],
]
// default_config中初始化key 默认都设置为false
yolo_save_list.forEach(item => default_config['yolo_save_' + item[0]] = false)

// 配置缓存的key值
let CONFIG_STORAGE_NAME = 'chick_config_version'
let PROJECT_NAME = '蚂蚁庄园'

// 公共扩展
let config = require('./config_ex.js')(default_config, CONFIG_STORAGE_NAME, PROJECT_NAME)
config.exportIfNeeded(module, null)

// yolo_save_list 覆盖storageConfig中的值
config.yolo_save_list = yolo_save_list


// 扩展配置
let workpath = config.getCurrentWorkPath()
let configDataPath = workpath + '/config_data/'
// 蚂蚁新村识图配置
let default_village_config = {
  checking_mail_box: files.read(configDataPath + 'village/checking_mail_box.data'),
  empty_booth: files.read(configDataPath + 'village/empty_booth.data'),
  my_booth: files.read(configDataPath + 'village/my_booth.data'),
  speed_award: files.read(configDataPath + 'village/speed_award.data'),
  do_setup_booth: files.read(configDataPath + 'village/do_setup_booth.data'),
  friend_end_up_regex: '.*(已停产|余.*营.*)',
  booth_position_left: [193, 1659, 436, 376],
  booth_position_right: [629, 1527, 386, 282],
  booth_black_list: [],
  village_reward_click_x: 550,
  village_reward_click_y: 1180,
  interval_time: 120,
  setup_by_income_weight: false,
  friends_finding_timeout: 8000,
  award_close_specific: false,
  award_close_x: 0,
  award_close_y: 0,
}
default_config.village_config = default_village_config
// 兼容旧版本
let tempConfig = config.convertDefaultData(default_village_config, CONFIG_STORAGE_NAME + '_viliage')
config.village_config = config.convertDefaultData(tempConfig, CONFIG_STORAGE_NAME + '_village')
// 领饲料配置
let default_fodder_config = {
  fodder_btn: files.read(configDataPath + 'fodder/fodder_btn.data'),
  close_interval: files.read(configDataPath + 'fodder/close_interval.data'),
  chopping_board: files.read(configDataPath + 'fodder/chopping_board.data'),
  farm_collect: files.read(configDataPath + 'fodder/farm_collect.data'),
  feed_package_full: '饲料袋.*满.*|知道了',
  ai_type: 'kimi',// kimi、chatgml or empty
  kimi_api_key: '',
  chatgml_api_key: '',
  disable_if_achievement_done: true,
  fodder_task_list: '信用卡账单|百度地图|快手|淘宝视频|淘金币小镇|今日头条极速版|淘宝特价版|闲鱼|菜鸟|支付宝运动|助农专场|淘宝芭芭农场',
}
default_config.fodder_config = default_fodder_config
config.fodder_config = config.convertDefaultData(default_fodder_config, CONFIG_STORAGE_NAME + '_fodder')
config.ai_type = config.fodder_config.ai_type
config.kimi_api_key = config.fodder_config.kimi_api_key
config.chatgml_api_key = config.fodder_config.chatgml_api_key
config.code_version = 'v1.3.6.7'
