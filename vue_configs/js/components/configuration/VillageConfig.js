
/**
 * 摆摊黑名单设置
 */
 const BoothBlackConfig = {
  name: 'BoothBlackConfig',
  mixins: [mixin_common],
  data() {
    return {
      newBlack: '',
      showAddBlackDialog: false,
      configs: {
        booth_black_list: [],
      },
    }
  },
  methods: {
    onConfigLoad(config) {
      let villageConfig = config.village_config
      Object.keys(this.configs).forEach(key => {
        this.$set(this.configs, key, villageConfig[key])
      })
    },
    doSaveConfigs() {
      let newConfigs = this.filterErrorFields(this.configs)
      $app.invoke('saveExtendConfigs', { configs: newConfigs, prepend: 'village' })
    },
    addBlack: function () {
      this.newBlack = ''
      this.showAddBlackDialog = true
    },
    doAddBlack: function () {
      this.configs.booth_black_list = this.configs.booth_black_list || []
      if (this.isNotEmpty(this.newBlack) && this.configs.booth_black_list.indexOf(this.newBlack) < 0) {
        this.configs.booth_black_list.push(this.newBlack)
      }
    },
    deleteBlack: function (idx) {
      this.$dialog.confirm({
        message: '确认要删除' + this.configs.booth_black_list[idx] + '吗？'
      }).then(() => {
        this.configs.booth_black_list.splice(idx, 1)
      }).catch(() => { })
    },
  },
  template: `
  <div style="margin-top: 1rem;">
    <div>
      <van-divider content-position="left">
        摆摊黑名单设置 不邀请他来摆摊
        <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addBlack">增加</van-button>
      </van-divider>
      <van-cell-group>
        <div style="overflow:scroll;padding:1rem;background:#f1f1f1;">
        <van-swipe-cell v-for="(black,idx) in configs.booth_black_list" :key="black" stop-propagation>
          <van-cell :title="black" />
          <template #right>
            <van-button square type="danger" text="删除" @click="deleteBlack(idx)" />
          </template>
        </van-swipe-cell>
        </div>
      </van-cell-group>
    </div>
    <van-dialog v-model="showAddBlackDialog" title="增加黑名单" show-cancel-button @confirm="doAddBlack" :get-container="getContainer">
      <van-field v-model="newBlack" placeholder="请输入好友昵称" label="好友昵称" />
    </van-dialog>
  </div>
  `
}


const VillageConfig = {
  name: 'VillageConfig',
  components: { BoothBlackConfig },
  mixins: [mixin_common],
  data() {
    return {
      configs: {
        checking_mail_box: '',
        empty_booth: '',
        my_booth: '',
        speed_award: '',
        booth_position_left: [193, 1659, 436, 376],
        booth_position_right: [629, 1527, 386, 282],
        interval_time: 120,
        village_reward_click_x: 550,
        village_reward_click_y: 1180,
      },
      timedUnit: '',
      validations: {
        interval_time: {
          required: true,
          validate: () => false,
          message: (v) => {
            if (isNaN(v) || parseInt(v) < 120) {
              return '不能小于120'
            }
            return ''
          }
        }
      }
    }
  },
  methods: {
    onConfigLoad(config) {
      let villageConfig = config.village_config
      Object.keys(this.configs).forEach(key => {
        this.$set(this.configs, key, villageConfig[key])
      })
    },
    doSaveConfigs() {
      let newConfigs = this.filterErrorFields(this.configs)
      $app.invoke('saveExtendConfigs', { configs: newConfigs, prepend: 'village' })
    },
    openGrayDetector: function () {
      $app.invoke('openGrayDetector', {})
    },
    executeVillage: function () {
      this.doSaveConfigs()
      $app.invoke('executeTargetScript', '/unit/蚂蚁新村自动摆摊.js')
    }
  },
  filters: {
    displayTime: value => {
      if (value && value.length > 0) {
        return `[${value}]`
      }
      return ''
    }
  },
  mounted () {
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/蚂蚁新村自动摆摊.js' }).then(r => this.timedUnit = r)
  },
  template: `
  <div>
    <tip-block style="margin: 0.5rem">区域输入框左滑可以通过滑块输入数值，也可以通过取色工具获取目标区域信息：<van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="openGrayDetector">打开取色工具</van-button></tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeVillage">执行</van-button>unit/蚂蚁新村自动摆摊.js{{timedUnit|displayTime}}</tip-block>
    <base64-image-viewer title="校验是否进入新村界面" v-model="configs.checking_mail_box"/>
    <number-field v-model="configs.village_reward_click_x" label-width="10rem" label="收取金币横坐标位置" placeholder="请输入横坐标位置" />
    <number-field v-model="configs.village_reward_click_y" label-width="10rem" label="收取金币纵坐标位置" placeholder="请输入纵坐标位置" />
    <base64-image-viewer title="校验空摊位" v-model="configs.empty_booth"/>
    <base64-image-viewer title="摆摊赚币" v-model="configs.my_booth"/>
    <base64-image-viewer title="加速产豆" v-model="configs.speed_award"/>
    <region-input-field :array-value="true" v-model="configs.booth_position_left" label="校验左侧摊位OCR" label-width="12em" />
    <region-input-field :array-value="true" v-model="configs.booth_position_right" label="校验右侧摊位OCR" label-width="12em" />
    <tip-block style="margin: 0.5rem">因为每天一个好友只能邀请一次，当好友数较少时建议增加间隔时间，建议最小值：max[120, 1440/(好友数/2)] 最大值6小时(360) 最大值在配置中不做限制</tip-block>
    <number-field v-model="configs.interval_time" label="执行间隔时间" label-width="10em" placeholder="执行间隔时间" :error-message="validationError.interval_time">
      <template #right-icon><span>分</span></template>
    </number-field>
    <booth-black-config />
  </div>`
}
