import request from '@/utils/request'

// 登录,返回 data 是 token 字符串本身
export function login(data) {
  return request.post('/user/login', data)
}

// 当前登录用户信息
export function getInfo() {
  return request.get('/user/info')
}

// 登出
export function logout() {
  return request.post('/user/logout')
}
