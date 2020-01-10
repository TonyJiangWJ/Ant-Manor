let CryptoJS = require('./crypto-js.js')

function AesUtil () {

}

AesUtil.prototype.encrypt = function (message, key) {
  if (key.length !== 8 && key.length !== 16 && key.length !== 32) {
    console.error('密码长度不正确必须为8/16/32位')
    return null
  }
  return CryptoJS.AES.encrypt(message, CryptoJS.enc.Utf8.parse(key), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  })
}

AesUtil.prototype.decrypt = function(encrypt, key) {
  if (key.length !== 8 && key.length !== 16 && key.length !== 32) {
    console.error('密码长度不正确必须为8/16/32位')
    return null
  }
  try {
    return CryptoJS.AES.decrypt(encrypt, CryptoJS.enc.Utf8.parse(key), {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8)
  } catch (e) {
    console.error('秘钥不正确无法解密')
    return null
  }
}

module.exports = new AesUtil()