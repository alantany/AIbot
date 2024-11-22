const cloud = require('wx-server-sdk')
const request = require('request')
const querystring = require('querystring')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  // 解构请求参数
  let {url, method = 'GET', data, header} = event
  
  return new Promise((resolve, reject) => {
    request({
      url,
      method,
      headers: header,
      body: method === 'POST' ? querystring.stringify(data) : undefined,
      qs: method === 'GET' ? data : undefined
    }, (error, response, body) => {
      if (error) {
        reject(error)
      } else {
        resolve({
          data: body,
          statusCode: response.statusCode,
          header: response.headers
        })
      }
    })
  })
} 