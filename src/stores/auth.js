import { defineStore } from 'pinia'
import { ref } from 'vue'

const TOKEN_KEY = 'wo_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const userInfo = ref(null)

  function setToken(t) {
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
  }

  function setUserInfo(info) {
    userInfo.value = info
  }

  function clear() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return { token, userInfo, setToken, setUserInfo, clear }
})
