const AccountManager = {
  name: 'AccountManager',
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        main_account: '',
        family_feed_account: '',
        accounts: [
          // 多个账号就多设置几个
          // account 是多账号切换界面脱敏文本，shareUrl 分享链接获取，可以是https开头的原始链接 也可以是处理后的 
          { account: '189***11', shareUrl: 'alipays://platformapi/startapp?appId=68687809&backgroundColor=16505470&ttb=always&url=%2Fwww%2Fgame.html%3FshareId%3DMjA4ODMwMjEwNzU4MzU0MDFoc3hmeUFOVFNUQUxMX1AyUF9TSEFSRVI=%26shareCoinDisplayAmount=100&source=hyyaoqing&chInfo=hyyaoqing&fxzjshareChinfo=ch_share__chsub_CopyLink&apshareid=c0c75eb5-268e-4341-b13a-d253e51aefa5&shareBizType=ztokenV0_GRuRWlSG' },
          { account: '189***22', shareUrl: 'alipays://platformapi/startapp?appId=68687809&backgroundColor=16505470&ttb=always&url=%2Fwww%2Fgame.html%3FshareId%3DMjA4ODMwMjEwNzU4MzU0MDFoc3hmeUFOVFNUQUxMX1AyUF9TSEFSRVI=%26shareCoinDisplayAmount=100&source=hyyaoqing&chInfo=hyyaoqing&fxzjshareChinfo=ch_share__chsub_CopyLink&apshareid=c0c75eb5-268e-4341-b13a-d253e51aefa5&shareBizType=ztokenV0_GRuRWlSG' },
        ],
        main_account_avatar: '',
        no_family_accounts: [],
      },
      showAddAccountDialog: false,
      isEdit: false,
      newAccount: '',
      newShareUrl: '',
      editIdx: '',
      editMain: false,
    }
  },
  methods: {
    shorterUrl: function (url) {
      if (url.startsWith('http')) {
        return url
      }
      let result = url.split('&').filter(v => v.startsWith('apshareid=')).map(v => v.split('apshareid=')[1])
      return result[0]
    },
    addAccount: function () {
      this.newAccount = ''
      this.newShareUrl = ''
      this.showAddAccountDialog = true
      this.isEdit = false
    },
    editAccount: function (idx) {
      let target = this.configs.accounts[idx]
      this.editIdx = idx
      this.isEdit = true
      this.editMain = this.configs.accounts[idx].account == this.configs.main_account
      this.newAccount = target.account
      this.newShareUrl = target.shareUrl
      this.showAddAccountDialog = true
    },
    confirmAction: function () {
      if (this.isEdit) {
        this.doEditAccount()
      } else {
        this.doAddAccount()
      }
    },
    doAddAccount: function () {
      if (this.isNotEmpty(this.newAccount) && this.isNotEmpty(this.newShareUrl) && this.configs.accounts.map(v => v.account).indexOf(this.newAccount) < 0) {
        this.configs.accounts.push({ account: this.newAccount, shareUrl: this.newShareUrl })
      }
      if (!this.configs.main_account && this.configs.accounts.length > 0) {
        this.configs.main_account = this.configs.accounts[0].account
      }
    },
    doEditAccount: function () {
      if (this.isNotEmpty(this.newAccount) && this.isNotEmpty(this.newShareUrl)) {
        let newAccount = this.newAccount
        let editIdx = this.editIdx
        if (this.configs.accounts.filter((v, idx) => v.account == newAccount && idx != editIdx).length > 0) {
          return
        }
        this.configs.accounts[editIdx] = { account: this.newAccount, shareUrl: this.newShareUrl }
        if (this.editMain) {
          this.configs.main_account = this.newAccount
        }
      }
    },
    deleteAccount: function (idx) {
      this.$dialog.confirm({
        message: '确认要删除' + this.configs.accounts[idx].account + '吗？'
      }).then(() => {
        this.configs.accounts.splice(idx, 1)
        if (this.configs.accounts.map(v => v.account).indexOf(this.configs.main_account) < 0) {
          this.configs.main_account = ''
        }
      }).catch(() => { })
    },
    changeMainAccount: function (idx) {
      this.configs.main_account = this.configs.accounts[idx].account
    },
    changeFeedAccount: function (idx) {
      this.configs.family_feed_account = this.configs.accounts[idx].account
    },
    toggleChecked: function (idx) {
      let account = this.configs.accounts[idx].account
      if (this.configs.no_family_accounts.indexOf(account) < 0) {
        this.configs.no_family_accounts.push(account)
      } else {
        this.configs.no_family_accounts.splice(this.configs.no_family_accounts.indexOf(account), 1)
      }
    },
    onConfigLoad (config) {
      this.configs.main_account_avatar = config.image_config.main_account_avatar
    },
    doSaveConfigs (deleteFields) {
      console.log('执行保存配置')
      let newConfigs = this.filterErrorFields(this.configs)
      if (deleteFields && deleteFields.length > 0) {
        deleteFields.forEach(key => {
          newConfigs[key] = ''
        })
      }
      $app.invoke('saveConfigs', newConfigs)
      if (this.configs.main_account_avatar) {
        // 保存图片扩展配置
        $app.invoke('saveExtendConfigs', { configs: { main_account_avatar: this.configs.main_account_avatar }, prepend: 'image' })
      }
    },
    getAvatar: function () {
      $nativeApi.request('getAvatar', {}).then(resp => {
        $app.invoke('loadConfigs', {}, config => {
          this.configs.main_account_avatar = config.image_config.main_account_avatar
        })
      })
    },
    changeAccount: function () {
      this.doSaveConfigs()
      $app.invoke('changeAlipayAccount', { account: this.configs.main_account })
    },
  },
  template: `
  <div>
    <van-cell-group>
      <van-cell title="当前主账号" :value="configs.main_account" >
      </van-cell>
    </van-cell-group>
    <van-divider content-position="left">
      工具脚本
    </van-divider>
    <tip-block>对相应文件设置每日定时任务</tip-block>
    <tip-block>unit/蚂蚁新村大小号助力.js</tip-block>
    <van-divider content-position="left">
      管理账号
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addAccount">增加</van-button>
    </van-divider>
    <tip-block>配置账号切换界面的脱敏账号和昵称并勾选一个主账号</tip-block>
    <tip-block>当多个账号的名称匹配相同时，需要通过头像来区分主账号，不过还是建议使用邮箱登录来增加区分度而不是手机号登录。</tip-block>
    <van-cell title="主账号" :value="configs.main_account" >
      <template #right-icon v-if="configs.main_account">
        <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="changeAccount">切换账号</van-button>
        <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="getAvatar">自动提取头像</van-button>
      </template>
    </van-cell>
    <base64-image-viewer title="主账号头像" v-model="configs.main_account_avatar"/>
    <tip-block>配置每个账号的昵称和对应的分享链接，运行‘蚂蚁新村大小号助力.js’后将按顺序自动给其他账号进行助力，例如配置了三个账号A助力BC,B助力AC,C助力AB。各个账号助力完成后将自动完成加速产豆中的通用任务，全部执行完毕后将切换回主账号</tip-block>
    <tip-block>打开蚂蚁新村，加速产币中选择邀请好友助力，弹窗中左滑复制链接链接即可获取永久助力链接，可以直接使用https开头的链接，也可以在浏览器中获取schemeUrl。
    推荐手动解析一下schemeUrl，避免调用系统浏览器打开http链接失败。schemeUrl参考：alipays://platformapi/startapp?appId=68687809&backgroundColor=...</tip-block>
    <van-radio-group v-model="configs.main_account">
      <van-cell-group>
        <div style="overflow:scroll;padding:1rem;background:#f1f1f1;">
          <van-swipe-cell v-for="(accountInfo,idx) in configs.accounts" :key="accountInfo.account" stop-propagation>
            <van-cell :title="accountInfo.account" :label="shorterUrl(accountInfo.shareUrl)" clickable  @click="changeMainAccount(idx)">
              <template #right-icon>
                <van-radio :name="accountInfo.account" />
              </template>
            </van-cell>
            <template #right>
              <div style="display: flex;height: 100%;">
                <van-button square type="primary" text="修改" @click="editAccount(idx)" style="height: 100%" />
                <van-button square type="danger" text="删除" @click="deleteAccount(idx)" style="height: 100%" />
              </div>
            </template>
          </van-swipe-cell>
        </div>
      </van-cell-group>
    </van-radio-group>
    <van-cell-group>
      <van-cell title="当前投喂账号" :value="configs.family_feed_account" >
      </van-cell>
    </van-cell-group>
    <tip-block>配置家庭投喂所使用的账号，家庭投喂每天消耗4*3=12个美食，一个账号可以使用的美食可能不够，可以切换到小号进行家庭投喂。</tip-block>
    <tip-block>对相应文件设置每日定时任务</tip-block>
    <tip-block>unit/家庭投喂-使用小号投喂.js</tip-block>
    <van-radio-group v-model="configs.family_feed_account">
      <van-cell-group>
        <div style="overflow:scroll;padding:1rem;background:#f1f1f1;">
          <van-swipe-cell v-for="(accountInfo,idx) in configs.accounts" :key="accountInfo.account" stop-propagation>
            <van-cell :title="accountInfo.account" clickable  @click="changeFeedAccount(idx)">
              <template #right-icon>
                <van-radio :name="accountInfo.account" />
              </template>
            </van-cell>
          </van-swipe-cell>
        </div>
      </van-cell-group>
    </van-radio-group>
    <tip-block>家庭签到，如果小号没有实名认证，无法加入家庭，也就是无需进行家庭签到，需要在下面勾选一下，避免浪费时间。</tip-block>
    <tip-block>对相应文件设置每日定时任务</tip-block>
    <tip-block>unit/大小号循环家庭签到.js</tip-block>
    <van-checkbox-group v-model="configs.no_family_accounts">
      <van-cell-group>
        <div style="overflow:scroll;padding:1rem;background:#f1f1f1;">
          <van-swipe-cell v-for="(accountInfo,idx) in configs.accounts" :key="accountInfo.account" stop-propagation>
            <van-cell :title="accountInfo.account" clickable @click="toggleChecked(idx)">
              <template #right-icon>
                <van-checkbox :name="accountInfo.account" />
              </template>
            </van-cell>
          </van-swipe-cell>
        </div>
      </van-cell-group>
    </van-checkbox-group>
    <van-dialog v-model="showAddAccountDialog" title="增加账号" show-cancel-button @confirm="confirmAction" :get-container="getContainer">
      <van-field v-model="newAccount" placeholder="请输入带星号的脱敏账号名称" label="账号名" />
      <van-field v-model="newShareUrl" placeholder="请输入账号分享链接" label="分享链接" />
    </van-dialog>
  </div>
  `
}