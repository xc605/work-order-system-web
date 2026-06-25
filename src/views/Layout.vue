<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { logout } from '@/api/user'

const router = useRouter()
const auth = useAuthStore()

const realName = computed(() => auth.userInfo?.realName || '未登录')

async function onLogout() {
  await ElMessageBox.confirm('确定退出登录?', '提示', { type: 'warning' })
  try {
    await logout()
  } finally {
    auth.clear()
    ElMessage.success('已退出')
    router.replace('/login')
  }
}
</script>

<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="logo">智能工单</div>
      <el-menu router :default-active="$route.path">
        <el-menu-item index="/home">首页</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="spacer" />
        <el-dropdown @command="onLogout">
          <span class="user">{{ realName }}</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
}
.aside {
  background: #001529;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}
.header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #eee;
}
.spacer {
  flex: 1;
}
.user {
  cursor: pointer;
  color: #333;
}
</style>
