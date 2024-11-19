const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  try {
    // 这里可以调用你的新闻API获取AI相关新闻
    // 示例使用了一个模拟的新闻数据
    return {
      news: "今天的AI新闻：OpenAI发布了GPT-4 Turbo，这是一个更强大、更高效的大型语言模型..."
    }
  } catch (error) {
    console.error(error)
    return {
      error: error.message
    }
  }
} 