const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 检查参数
    if (!event.text) {
      throw new Error('text parameter is required')
    }

    console.log('收到文本:', event.text)

    // 使用微信云开发的文字转语音功能
    const result = await cloud.openapi.customerServiceMessage.uploadTempMedia({
      type: 'voice',
      media: {
        contentType: 'audio/mp3',
        value: Buffer.from(event.text)
      }
    })

    // 上传到云存储
    const fileName = `audio_${Date.now()}.mp3`
    const uploadResult = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: result.mediaId
    })

    console.log('上传结果:', uploadResult)
    return {
      fileID: uploadResult.fileID
    }

  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      error: error.message
    }
  }
} 