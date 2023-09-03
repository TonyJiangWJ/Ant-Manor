/**
 * 区域颜色等配置
 **/
 const ColorRegionConfigs = {
  name: 'ColorRegionConfigs',
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        auto_set_bang_offset: false,
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
        OUT_IN_FRIENDS_REGION_LEFT: [340, 1405, 50, 50],  // 校验小鸡在好友家，左边的区域
        OUT_IN_FRIENDS_REGION_RIGHT: [800, 1405, 50, 50], // 校验小鸡在好友家，右边的区域
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
    }
  },
  methods: {
    showRealVisual: function () {
      $app.invoke('showRealtimeVisualConfig', {})
    },
    openGrayDetector: function () {
      $app.invoke('openGrayDetector', {})
    },
  },
  watch: {
    configs: {
      handler: function (newVal, oldVal) {
        $app.invoke('colorRegionConfigChanged', newVal)
      },
      deep: true,
      immediate: true
    }
  },
  template: `<div>
    <van-divider content-position="left">
      校验区域配置
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="showRealVisual">实时查看区域</van-button>
    </van-divider>
    <tip-block>刘海屏或者挖孔屏悬浮窗显示位置和实际目测位置不同，需要施加一个偏移量，一般是负值，脚本运行时会自动设置，非异形屏请自行修改为0</tip-block>
    <switch-cell title="下次执行时重新识别" v-model="configs.auto_set_bang_offset" />
    <number-field v-if="!configs.auto_set_bang_offset" v-model="configs.bang_offset" label="偏移量" label-width="12em" />
    <van-cell center title="偏移量" v-else>
      <span>下次执行时重新识别</span>
    </van-cell>
    <tip-block style="margin: 0.5rem">区域输入框左滑可以通过滑块输入数值，也可以通过取色工具获取目标区域信息：<van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="openGrayDetector">打开取色工具</van-button></tip-block>
    <van-cell-group>
      <color-input-field label="校验是否打开APP的颜色" label-width="12em" v-model="configs.CHECK_APP_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.CHECK_APP_REGION" label="校验是否打开APP的区域" label-width="12em" :max-width="100" :max-height="100" />
      <color-input-field label="校验小鸡是否出门，牌子的颜色" label-width="14em" v-model="configs.OUT_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.OUT_REGION" label="校验小鸡是否出门，牌子的区域" label-width="14em" :max-width="100" :max-height="100" />
      <color-input-field label="校验是否打开好友页面的颜色" label-width="14em" v-model="configs.CHECK_FRIENDS_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.CHECK_FRIENDS_REGION" label="校验是否打开好友页面的区域" label-width="14em" :max-width="100" :max-height="100" />
      <color-input-field label="校验自家小鸡外出所在的颜色，ID的颜色" label-width="14em" v-model="configs.OUT_IN_FRIENDS_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.OUT_IN_FRIENDS_REGION_LEFT" label="校验小鸡在好友家，左边的区域" label-width="14em" :max-width="100" :max-height="100" />
      <region-input-field :array-value="true" v-model="configs.OUT_IN_FRIENDS_REGION_RIGHT" label="校验小鸡在好友家，右边的区域" label-width="14em" :max-width="100" :max-height="100" />
      <color-input-field label="校验小偷鸡眼罩的颜色" label-width="12em" v-model="configs.THIEF_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.LEFT_THIEF_REGION" label="校验来自家偷吃的小鸡，左边的区域" label-width="14em" :max-width="150" :max-height="150" />
      <region-input-field :array-value="true" v-model="configs.RIGHT_THIEF_REGION" label="校验来自家偷吃的小鸡，右边的区域" label-width="14em" :max-width="150" :max-height="150" />
      <color-input-field label="校验拳头的颜色" label-width="12em" v-model="configs.PUNCH_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.LEFT_PUNCH_REGION" label="校验左边拳头的区域" label-width="12em" :max-width="150" :max-height="150" />
      <region-input-field :array-value="true" v-model="configs.RIGHT_PUNCH_REGION" label="校验右边拳头的区域" label-width="12em" :max-width="150" :max-height="150" />
      <color-input-field label="校验正在进食盆里饲料的颜色" label-width="14em" v-model="configs.FOOD_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.FOOD_REGION" label="校验食盆的区域，主要校验是否存在饲料" label-width="14em" :max-width="50" :max-height="50" />
      <color-input-field label="校验是否成功使用加速卡，小鸡右手上饲料的颜色" label-width="14em" v-model="configs.SPEED_CHECK_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.SPEED_CHECK_REGION" label="校验是否成功使用加速卡的区域，小鸡右手拿饲料的位置" label-width="14em" :max-width="50" :max-height="50" />
      <color-input-field label="校验关闭按钮的颜色" label-width="12em" v-model="configs.DISMISS_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.DISMISS_REGION" label="校验关闭按钮的区域" label-width="12em" :max-width="100" :max-height="100" />
      <region-input-field :array-value="true" v-model="configs.COUNT_DOWN_REGION" label="OCR校验倒计时的区域，需要精确框选" label-width="14em" :max-width="300" :max-height="100" />
      <color-input-field label="校验是否可以捡屎灰度颜色值" label-width="14em" v-model="configs.PICK_SHIT_GRAY_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.SHIT_CHECK_REGION" label="校验是否可以捡屎的区域" label-width="12em" :max-width="100" :max-height="100" />
      <color-input-field label="校验执行捡屎的灰度颜色值" label-width="14em" v-model="configs.COLLECT_SHIT_GRAY_COLOR"/>
      <region-input-field :array-value="true" v-model="configs.COLLECT_SHIT_CHECK_REGION" label="校验执行捡屎的区域" label-width="12em" />
      <region-input-field :array-value="true" v-model="configs.reco" label="星星球识别区域" label-width="12em" />
      <position-input-field v-model="configs.FEED_POSITION" label="喂食饲料的位置" label-width="12em" />
      <position-input-field v-model="configs.TOOL_POSITION" label="道具包按钮的位置" label-width="12em" />
      <position-input-field v-model="configs.SPEED_CARD_POSITION" label="加速卡按钮的位置" label-width="12em" />
      <position-input-field v-model="configs.CONFIRM_POSITON" label="确认按钮的位置" label-width="12em" />
    </van-cell-group>\
  </div>`
}

