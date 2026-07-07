import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

function getNetworkErrorMessage(error) {
  const status = error.response?.status
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    const timeout = error.config?.timeout || 0
    return timeout >= 30000
      ? '响应时间较长,本次请求已超时,请稍后重试或缩短问题'
      : '请求超时,请检查网络后重试'
  }
  if (!error.response) {
    return '无法连接服务器,请检查网络或确认后端服务已启动'
  }
  if (status === 401) return '登录已失效,请重新登录'
  if (status === 403) return '没有权限执行该操作'
  if (status === 404) return '请求的资源不存在'
  if (status >= 500) return '服务器暂时异常,请稍后重试'
  return error.response?.data?.message || '请求失败,请稍后重试'
}

// 请求拦截:有 token 就加 Authorization 头
request.interceptors.request.use(
  (config) => {
    const auth = useAuthStore()
    if (auth.token) {
      config.headers.Authorization = `Bearer ${auth.token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截:按业务 code 分流
request.interceptors.response.use(
  (response) => {
    const res = response.data
    // 非标准结构(如文件流)直接放行
    if (res == null || typeof res.code === 'undefined') {
      return res
    }
    if (res.code === 200) {
      // 把业务数据直接给调用方
      return res.data
    }
    if (res.code === 401) {
      // 未登录 / 登录过期:清 token 跳登录
      const auth = useAuthStore()
      auth.clear()
      ElMessage.error(res.message || '登录已失效,请重新登录')
      router.replace('/login')
      return Promise.reject(new Error(res.message || '未登录'))
    }
    // 其它业务错误
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    // HTTP 层面错误(网络、超时、5xx 等)
    ElMessage.error(getNetworkErrorMessage(error))
    return Promise.reject(error)
  },
)

export default request
