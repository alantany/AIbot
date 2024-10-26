const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  console.log('收到请求:', event)
  
  try {
    const response = await axios({
      method: 'get',
      url: 'https://api.chatanywhere.cn/v1/models',
      headers: {
        'Authorization': 'Bearer sk-1pUmQlsIkgla3CuvKTgCrzDZ3r0pBxO608YJvIHCN18lvOrn'
      }
    })
    
    console.log('API测试响应:', response.data)
    
    return {
      success: true,
      data: response.data
    }
    
  } catch (error) {
    console.error('错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
