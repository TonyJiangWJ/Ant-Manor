let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let fileUtils = singletonRequire('FileUtils')
let logUtils = singletonRequire('LogUtils')
let storageFactory = singletonRequire('StorageFactory')
let UPDATE_STORAGE = "update_info"
let DAILY_UPDATE_CHECK_STORAGE = "daily_update_check"
let { config } = require('../config.js')(runtime, this)
importPackage(Packages["okhttp3"])
module.exports = (function () {
  return new UpdateChecker().setLatestUrl(config.github_latest_url)
  // -----
  function UpdateChecker () {
    storageFactory.initFactoryByKey(UPDATE_STORAGE, { latestVersion: '' })
    storageFactory.initFactoryByKey(DAILY_UPDATE_CHECK_STORAGE, { checked: false })
    this.latestUrl = ''
    this.getLocalVersion = function () {
      let mainPath = fileUtils.getCurrentWorkPath()
      let versionFile = files.join(mainPath, 'version.json')
      let projectFile = files.join(mainPath, 'project.json')
      let versionName = ''
      if (files.exists(versionFile)) {
        versionName = JSON.parse(files.read(versionFile)).version
      } else if (files.exists(projectFile)) {
        versionName = JSON.parse(files.read(projectFile)).versionName
      }
      return versionName
    }

    this.setLatestUrl = function (url) {
      this.latestUrl = url
      return this
    }

    this.getLatestInfo = function () {
      if (!config.auto_check_update) {
        return null
      }
      let dailyCheckStorage = storageFactory.getValueByKey(DAILY_UPDATE_CHECK_STORAGE)
      if (dailyCheckStorage.checked) {
        logUtils.debugInfo(['今日已经检测过版本更新，当前最新版本为：「{}」', dailyCheckStorage.latestVersion])
        return dailyCheckStorage.latestVersion
      }
      if (this.latestUrl === '') {
        return null
      }
      let request = new Request.Builder()
        .url(this.latestUrl)
        .addHeader('authorization', 'token 14551b4d66824843a370090332228728d7aa5281')
        .get()
        .build()

      let response = null
      let result = null
      try {
        let okHttpClient = new OkHttpClient()
        response = okHttpClient.newCall(request).execute()
        if (response != null && response.body() != null) {
          let resultString = response.body().string()
          logUtils.debugInfo('请求结果：' + resultString)
          result = JSON.parse(resultString)
          if (result.tag_name) {
            storageFactory.updateValueByKey(UPDATE_STORAGE, {
              latestVersion: result.tag_name,
              updateNotes: result.body
            })
            storageFactory.updateValueByKey(DAILY_UPDATE_CHECK_STORAGE, { checked: true, latestVersion: result.tag_name})
          }
        }
      } catch (e) {
        logUtils.errorInfo('请求更新信息接口异常' + e)
      } finally {
        if (response !== null) {
          response.close()
        }
      }
      return result === null ? null : result.tag_name
    }

    this.hasNewVersion = function () {
      if (!config.auto_check_update) {
        return null
      }
      let dailyCheckStorage = storageFactory.getValueByKey(DAILY_UPDATE_CHECK_STORAGE)
      if (dailyCheckStorage.checked) {
        if (this.getLocalVersion() < this.getLatestInfo()) {
          return this.getLatestInfo()
        }
      }
      return null
    }
    // TODO 下载并解压更新文件，增加gitee的支持
  }
})()


