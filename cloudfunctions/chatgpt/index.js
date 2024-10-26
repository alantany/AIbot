const cloud = require('wx-server-sdk')
const axios = require('axios')

// 直接在代码中定义配置
const config = {
  kimiApiKey: "sk-f2gEfLnPUCvPuT25om1ehlSwkqCZHQ3dYQT2Sbocsi8LUwFJ",
  baseUrl: "https://api.moonshot.cn/v1"
}

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  console.log('开始调用Kimi API...')
  console.log('收到的完整参数:', event)
  
  if (!event.message) {
    return {
      success: false,
      error: '消息不能为空'
    }
  }
  
  try {
    // 发送聊天请求
    console.log('开始发送聊天请求...')
    const response = await axios({
      method: 'post',
      url: `${config.baseUrl}/chat/completions`,
      headers: {
        'Authorization': `Bearer ${config.kimiApiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'moonshot-v1-8k',
        messages: [{
          role: 'user',
          content: event.message
        }],
        temperature: 0.7,
        max_tokens: 1000
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    })
    
    console.log('聊天请求响应:', {
      status: response.status
    })

    return {
      success: true,
      reply: response.data.choices[0].message.content
    }
    
  } catch (error) {
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response'
    })
    
    return {
      success: false,
      error: '请求失败: ' + error.message
    }
  }
}
