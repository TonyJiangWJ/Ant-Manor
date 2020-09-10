/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-02 16:12:21
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-09-10 19:16:59
 * @Description: 
 */

module.exports = {

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

  OFFSET: 0,  // 默认配置为支持2340*1080分辨率，其他异形屏一般可以尝试仅仅修改该偏移量, 如果不行就修改具体区域的配置吧
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
  PICK_SHIT_GRAY_COLOR: '#A6A6A6',
  COLLECT_SHIT_GRAY_COLOR: '#838383'
}