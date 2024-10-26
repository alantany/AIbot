const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  try {
    const { fileID } = event
    console.log('收到文件ID:', fileID)
    
    // 获取语音文件临时链接
    const { fileList } = await cloud.getTempFileURL({
      fileList: [fileID]
    })
    console.log('获取到临时链接:', fileList[0].tempFileURL)
    
    // 调用微信语音识别API
    const result = await cloud.openapi.serviceMarket.invokeService({
      service: 'wx79ac3de8be320b71', // 语音识别服务
      api: 'ASR',
      data: {
        audio_url: fileList[0].tempFileURL,
        format: 'mp3'
      }
    })
    
    console.log('识别结果:', result)
    
    if (!result.data || !result.data.text) {
      throw new Error('识别结果为空')
    }
    
    return {
      text: result.data.text
    }
    
  } catch (error) {
    console.error('语音识别错误:', error)
    return {
      error: error.message || '识别失败'
    }
  }
}
