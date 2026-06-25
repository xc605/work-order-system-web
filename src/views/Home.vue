<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const info = computed(() => auth.userInfo || {})
const roleNames = computed(() =>
  (info.value.roles || []).map((r) => r.name).join('、') || '无',
)
</script>

<template>
  <el-card>
    <h3>欢迎,{{ info.realName || '用户' }}</h3>
    <p>账号:{{ info.username }}</p>
    <p>部门:{{ info.departmentName || '未分配' }}</p>
    <p>角色:{{ roleNames }}</p>
    <p style="color: #999">地基已跑通,后续业务模块在此扩展。</p>
  </el-card>
</template>
