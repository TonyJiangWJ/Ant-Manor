
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
      let viliageConfig = config.viliage_config
      Object.keys(this.configs).forEach(key => {
        this.$set(this.configs, key, viliageConfig[key])
      })
    },
    doSaveConfigs() {
      let newConfigs = this.filterErrorFields(this.configs)
      $app.invoke('saveExtendConfigs', { configs: newConfigs, prepend: 'viliage' })
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
        摆摊黑名单设置 不去他家摆摊
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


const ViliageConfig = {
  name: 'ViliageConfig',
  components: { BoothBlackConfig },
  mixins: [mixin_common],
  data() {
    return {
      configs: {
        checking_mail_box: '',
        empty_booth: '',
        my_booth: '',
        speed_award: '',
        do_setup_booth: '',
        booth_position_left: [193, 1659, 436, 376],
        booth_position_right: [629, 1527, 386, 282],
        interval_time: 120,
      },
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
      let viliageConfig = config.viliage_config
      Object.keys(this.configs).forEach(key => {
        this.$set(this.configs, key, viliageConfig[key])
      })
    },
    doSaveConfigs() {
      let newConfigs = this.filterErrorFields(this.configs)
      $app.invoke('saveExtendConfigs', { configs: newConfigs, prepend: 'viliage' })
    },
    openGrayDetector: function () {
      $app.invoke('openGrayDetector', {})
    },
  },
  template: `
  <div>
    <tip-block style="margin: 0.5rem">区域输入框左滑可以通过滑块输入数值，也可以通过取色工具获取目标区域信息：<van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="openGrayDetector">打开取色工具</van-button></tip-block>
    <base64-image-viewer title="校验是否进入新村界面" v-model="configs.checking_mail_box"/>
    <base64-image-viewer title="校验空摊位" v-model="configs.empty_booth"/>
    <base64-image-viewer title="我的小摊" v-model="configs.my_booth"/>
    <base64-image-viewer title="去摆摊" v-model="configs.do_setup_booth"/>
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
