
/**
 * 扭蛋互助
 */
const MutualHelp = {
  mixins: [mixin_common],
  data () {
    return {
      category: 'gashapon',
      deviceId: '11234',
      text: '',
      getText: '',
      total: 0,
      url: 'https://tonyjiang.hatimi.top/mutual-help',
      loading: false,
      uploading: false,
    }
  },
  methods: {
    upload() {
      if (!this.text) {
        vant.Toast.fail('请先输入你的互助码')
        return
      }
      this.uploading = true
      API.post(this.url + '/upload', {
        deviceId: this.deviceId,
        category: this.category,
        text: this.text
      }).then(resp => {
        vant.Toast.success('上传成功')
        this.uploading = false
      }).catch(e => {
        vant.Toast.fail('上传失败，请稍后重试')
        this.uploading = false
      })
    },
    randomGet () {
      this.loading = true
      API.get(this.url + '/random', {
        params: {
          deviceId: this.deviceId,
          category: this.category
        }
      }).then(resp => {

        this.loading = false
        if (resp) {
          console.log('resp:', JSON.stringify(resp))
          if (resp.record) {
            this.getText = resp.record.text
            this.total = resp.total
            vant.Toast.success('互助码获取成功，已复制到剪切板')
            $nativeApi.request('copyText', { text: this.getText })
            return
          }
        }
        vant.Toast.fail('提取数据失败，请稍后重试')
      }).catch(e => {
        let append = ''
        if (e.response) {
          append = e.response.data.error
        }
        vant.Toast.fail('请求失败' + append);
        this.loading = false
      })
    },
    getDeviceId: function () {
      $nativeApi.request('getDeviceId', {}).then(resp => this.deviceId = resp.deviceId)
    }
  },
  mounted () {
    this.getDeviceId()
  },
  template: `
  <div style="padding-top: 2rem">
    <van-cell-group>
      <tip-block>复制以下互助码，然后打开支付宝，等待弹窗。如果没有响应，将互助码复制到支付宝搜索框后点击搜索，然后根据提示点击进入即可。如果是https链接的，需要通过浏览器打开获取到互助码，否则直接进入支付宝会没有响应。</tip-block>
      <tip-block>当前总数：{{total}}</tip-block>
      <van-field
        v-model="getText"
        rows="1"
        autosize
        label="互助码"
        type="textarea"
        readonly
      />
      <div style="display:grid;padding:1rem;text-align=center;">
        <van-button plain type="info" style="margin:0.5rem 1rem;" @click="randomGet" :loading="loading">随机获取一个互助码</van-button>
      </div>
      <tip-block>打开扭蛋活动，点击送扭蛋的去邀请按钮，然后点击去粘贴给好友，跳转微信后互助码就在剪贴板了，这时复制的是https的链接，需要通过浏览器打开，然后得到真实的互助码，复制后回到当前页面粘贴到下面进行上传即可。后续其他人可以通过这个功能获取到你的互助码，这样就能互相助力了。互助码会随机下发，参与人数越多越容易达到当日最大值。</tip-block>
      <van-field
        v-model="text"
        rows="1"
        autosize
        label="上传互助码"
        type="textarea"
        :error-message="validationError.text"
        placeholder="请输入互助码"
      />
      <div style="display:grid;padding:1rem;text-align=center;">
        <van-button plain type="primary" style="margin:0.5rem 1rem;" @click="upload" :loading="uploading">上传</van-button>
      </div>
    </van-cell-group>
  </div>
  `
}
