// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')
const cheerio = require('cheerio')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV || 'aibot-7gdadr2kc515d223'  // 使用你的云环境ID
})

// 云函数入口函数
exports.main = async (event) => {
  try {
    const { articleId } = event
    if (!articleId) {
      return {
        success: false,
        error: '缺少文章ID'
      }
    }

    // 尝试使用新的 API 格式获取文章内容
    const apiUrl = `https://www.toutiao.com/api/pc/content/detail/${articleId}/`
    console.log('尝试获取文章内容, URL:', apiUrl)

    const response = await axios({
      method: 'GET',
      url: apiUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.toutiao.com/'
      },
      timeout: 5000  // 设置超时时间
    })

    console.log('API 返回数据:', response.data)

    if (response.data && response.data.data && response.data.data.content) {
      const content = response.data.data.content
        .replace(/<[^>]+>/g, '')  // 移除HTML标签
        .replace(/&[^;]+;/g, '')  // 移除HTML实体
        .replace(/\n+/g, ' ')     // 替换换行为空格
        .replace(/\s+/g, ' ')     // 合并多个空格
        .trim()

      return {
        success: true,
        content
      }
    }

    // 如果新 API 失败，尝试使用旧的文章页面
    const articleUrl = `https://www.toutiao.com/article/${articleId}/`
    console.log('尝试获取文章页面, URL:', articleUrl)

    const pageResponse = await axios({
      method: 'GET',
      url: articleUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.toutiao.com/'
      },
      timeout: 5000
    })

    const $ = cheerio.load(pageResponse.data)
    const content = $('article').text() || 
                   $('.article-content').text() ||
                   $('.content').text()

    if (content) {
      return {
        success: true,
        content: content.trim()
      }
    }

    return {
      success: false,
      error: '无法获取文章内容'
    }
  } catch (error) {
    console.error('获取文章内容失败:', error)
    return {
      success: false,
      error: error.message || '未知错误'
    }
  }
} 