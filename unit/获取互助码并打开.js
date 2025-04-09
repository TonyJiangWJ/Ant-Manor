let tipDisposable = threads.disposable()
let showTipDialog = dialogs.build({
  title: '在线获取互助码',
  content: '此工具用于便携获取互助码。上传、标记作废互助码、查看自己的互助码等功能，请通过 可视化配置-扭蛋互助 菜单进行操作。互助码有效期短，请定期上传更新自己的互助码',
  positive: '确认获取',
  positiveColor: '#f9a01c',
  negative: '取消',
  negativeColor: 'red',
  cancelable: false
}).on('positive', function () {
  tipDisposable.setAndNotify({ continue: true })
  showTipDialog.dismiss()
}).on('negative', function () {
  tipDisposable.setAndNotify({ continue: false })
  showTipDialog.dismiss()
}).show()
let response = tipDisposable.blockedGet()
if (!response.continue) {
  exit()
}
toastLog('请求服务接口获取中，请稍后')
let disposable = threads.disposable()
http.get('https://tonyjiang.hatimi.top/mutual-help/random?category=gashapon&deviceId=' + device.getAndroidId(), {}, (res, err) => {
  if (err) {
    console.error('请求异常', err)
    return
  }
  if (res.body) {
    let responseStr = res.body.string()
    console.log('获取响应：', responseStr)
    try {
      let data = JSON.parse(responseStr)
      if (data.record) {
        console.log('互助码：' + data.record.text)
        disposable.setAndNotify({ success: true, text: data.record.text })
      } else if (data.error) {
        toastLog(data.error)
        disposable.setAndNotify({ success: false, erorr: data.error })
      }
    } catch (e) {
      console.error('执行异常' + e)
      disposable.setAndNotify({ success: false, erorr: '执行异常，具体见日志' })
    }
  }
})

let result = disposable.blockedGet()
if (result.success) {

  let confirmDialog = dialogs.build({
    title: '获取到互助码，是否打开？',
    content: '' + result.text,
    positive: '确认',
    positiveColor: '#f9a01c',
    negative: '取消',
    negativeColor: 'red',
    cancelable: false
  })
    .on('positive', () => {
      confirmDialog.dismiss()
      setClip(result.text)
      app.startActivity({
        action: 'VIEW',
        data: 'alipays://platformapi/startapp?appId=20001003&keyword=' + encodeURI(result.text) + '&v2=true',
        packageName: 'com.eg.android.AlipayGphone'
      })
    })
    .on('negative', () => {
      confirmDialog.dismiss()
    })
    .show()
} else {
  let confirmDialog = dialogs.build({
    title: '获取互助码失败',
    content: '' + result.error,
    positive: '知道了',
    positiveColor: '#f9a01c',
    cancelable: false
  })
    .on('positive', () => {
      confirmDialog.dismiss()
    })
    .show()
}