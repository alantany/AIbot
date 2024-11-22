import cloud from 'wx-server-sdk'
import axios from 'axios'
import * as cheerio from 'cheerio'

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event: any) => {
  const { articleId } = event
  const url = `https://www.toutiao.com/article/${articleId}/`

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    // 使用 cheerio 解析 HTML
    const $ = cheerio.load(response.data)
    
    // 提取文章内容
    const content = $('article').text() || 
                   $('.article-content').text() ||
                   $('.content').text()

    return {
      success: true,
      content
    }
  } catch (error) {
    console.error('获取文章内容失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 