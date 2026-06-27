<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDepartmentList } from '@/api/department'
import { assignRole, getRoleList, revokeRole } from '@/api/role'
import { useAuthStore } from '@/stores/auth'
import {
  createUser,
  disableUser,
  enableUser,
  getUser,
  getUserList,
  resetUserPassword,
  updateUser,
} from '@/api/user'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const roleSaving = ref(false)
const dialogVisible = ref(false)
const roleVisible = ref(false)
const formRef = ref()
const editingId = ref(null)
const currentUser = ref(null)
const users = ref([])
const total = ref(0)
const departments = ref([])
const roles = ref([])
const roleIds = ref([])
const originalRoleIds = ref([])
const query = ref({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: '',
})
const form = ref({
  username: '',
  password: '',
  realName: '',
  phone: '',
  departmentId: '',
})

const dialogTitle = computed(() => (editingId.value ? '编辑用户' : '新增用户'))
const currentUserId = computed(() => auth.userInfo?.id)

const rules = computed(() => ({
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  password: editingId.value
    ? []
    : [
        { required: true, message: '请输入初始密码', trigger: 'blur' },
        { min: 6, max: 50, message: '密码长度为 6 到 50 位', trigger: 'blur' },
      ],
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
}))

function userStatusType(status) {
  return Number(status) === 1 ? 'success' : 'info'
}

function userStatusText(status) {
  return Number(status) === 1 ? '启用' : '停用'
}

function isSelf(row) {
  return currentUserId.value != null && Number(row.id) === Number(currentUserId.value)
}

function isCurrentUserDisabled() {
  return Number(currentUser.value?.status) !== 1
}

function isOriginalRole(roleId) {
  return originalRoleIds.value.map(Number).includes(Number(roleId))
}

function isRoleOptionDisabled(role) {
  // 停用用户允许剥夺已有角色,但不能新增角色。
  return isCurrentUserDisabled() && !isOriginalRole(role.id)
}

function normalizeUserPayload() {
  const payload = {
    username: form.value.username,
    realName: form.value.realName,
    phone: form.value.phone || null,
    departmentId: form.value.departmentId || null,
  }
  if (!editingId.value) payload.password = form.value.password
  return payload
}

async function loadUsers() {
  loading.value = true
  try {
    const params = {
      pageNum: query.value.pageNum,
      pageSize: query.value.pageSize,
    }
    if (query.value.keyword) params.keyword = query.value.keyword
    if (query.value.status !== '' && query.value.status != null) params.status = query.value.status
    const res = await getUserList(params)
    users.value = res.list || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

async function loadDictionaries() {
  const [deptRes, roleRes] = await Promise.all([getDepartmentList(), getRoleList()])
  departments.value = deptRes || []
  roles.value = roleRes || []
}

function onSearch() {
  query.value.pageNum = 1
  loadUsers()
}

function onReset() {
  query.value = { pageNum: 1, pageSize: 10, keyword: '', status: '' }
  loadUsers()
}

function onPageChange(page) {
  query.value.pageNum = page
  loadUsers()
}

function openCreate() {
  editingId.value = null
  form.value = {
    username: '',
    password: 'admin123',
    realName: '',
    phone: '',
    departmentId: '',
  }
  dialogVisible.value = true
}

async function openEdit(row) {
  editingId.value = row.id
  const detail = await getUser(row.id)
  form.value = {
    username: detail.username,
    password: '',
    realName: detail.realName,
    phone: detail.phone || '',
    departmentId: detail.departmentId || '',
  }
  dialogVisible.value = true
}

async function onSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateUser(editingId.value, normalizeUserPayload())
      ElMessage.success('已保存')
    } else {
      await createUser(normalizeUserPayload())
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    await loadUsers()
  } finally {
    saving.value = false
  }
}

async function onToggleStatus(row) {
  if (isSelf(row) && Number(row.status) === 1) {
    ElMessage.warning('不能停用当前登录用户')
    return
  }
  const enabling = Number(row.status) !== 1
  try {
    await ElMessageBox.confirm(
      `确定${enabling ? '启用' : '停用'}用户「${row.realName}」?`,
      enabling ? '启用用户' : '停用用户',
      { type: 'warning' },
    )
  } catch {
    return
  }
  if (enabling) {
    await enableUser(row.id)
    ElMessage.success('已启用')
  } else {
    await disableUser(row.id)
    ElMessage.success('已停用')
  }
  await loadUsers()
}

async function onResetPassword(row) {
  let value
  try {
    const res = await ElMessageBox.prompt('请输入新密码', `重置密码 - ${row.realName}`, {
      inputValue: 'admin123',
      inputValidator: (v) => (v && v.length >= 6 ? true : '新密码至少 6 位'),
    })
    value = res.value
  } catch {
    return
  }
  await resetUserPassword(row.id, { newPassword: value })
  ElMessage.success('已重置密码')
}

async function openRoles(row) {
  const detail = await getUser(row.id)
  currentUser.value = detail
  originalRoleIds.value = (detail.roles || []).map((role) => role.id)
  roleIds.value = [...originalRoleIds.value]
  roleVisible.value = true
}

async function onRoleSubmit() {
  if (!currentUser.value) return
  roleSaving.value = true
  try {
    const next = roleIds.value.map(Number)
    const prev = originalRoleIds.value.map(Number)
    const toAdd = next.filter((id) => !prev.includes(id))
    const toRemove = prev.filter((id) => !next.includes(id))
    if (isCurrentUserDisabled() && toAdd.length) {
      ElMessage.warning('停用用户不能分配新角色')
      roleIds.value = next.filter((id) => prev.includes(id))
      return
    }
    for (const roleId of toAdd) {
      await assignRole({ userId: currentUser.value.id, roleId })
    }
    for (const roleId of toRemove) {
      await revokeRole({ userId: currentUser.value.id, roleId })
    }
    ElMessage.success('角色已保存')
    roleVisible.value = false
    await loadUsers()
  } finally {
    roleSaving.value = false
  }
}

onMounted(async () => {
  await loadDictionaries()
  await loadUsers()
})
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-head">
        <span>用户管理</span>
        <el-button type="primary" @click="openCreate">新增用户</el-button>
      </div>
    </template>

    <el-form :inline="true" :model="query" class="filter">
      <el-form-item>
        <el-input v-model="query.keyword" placeholder="账号 / 姓名" clearable @keyup.enter="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 120px">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="users" border stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="账号" min-width="120" show-overflow-tooltip />
      <el-table-column prop="realName" label="姓名" width="110" />
      <el-table-column prop="departmentName" label="部门" width="130">
        <template #default="{ row }">{{ row.departmentName || '未分配' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="userStatusType(row.status)">{{ userStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="openRoles(row)">角色</el-button>
          <el-button link type="warning" @click="onResetPassword(row)">重置密码</el-button>
          <el-button
            link
            :type="Number(row.status) === 1 ? 'danger' : 'success'"
            :disabled="isSelf(row) && Number(row.status) === 1"
            @click="onToggleStatus(row)"
          >
            {{ Number(row.status) === 1 ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无用户数据" :image-size="92" />
      </template>
    </el-table>

    <el-pagination
      v-if="total > 0"
      class="pager"
      layout="prev, pager, next, total"
      :total="total"
      :current-page="query.pageNum"
      :page-size="query.pageSize"
      @current-change="onPageChange"
    />

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="min(560px, calc(100vw - 32px))">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="登录账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入登录账号" clearable />
        </el-form-item>
        <el-form-item v-if="!editingId" label="初始密码" prop="password">
          <el-input v-model="form.password" placeholder="请输入初始密码" show-password clearable />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入真实姓名" clearable />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="选填" clearable />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-select v-model="form.departmentId" placeholder="未分配" clearable style="width: 100%">
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="roleVisible" title="角色分配" size="min(420px, 100vw)">
      <template v-if="currentUser">
        <el-descriptions :column="1" border class="role-info">
          <el-descriptions-item label="账号">{{ currentUser.username }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ currentUser.realName }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="userStatusType(currentUser.status)">
              {{ userStatusText(currentUser.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        <el-checkbox-group v-model="roleIds" class="role-list">
          <el-checkbox
            v-for="role in roles"
            :key="role.id"
            :value="role.id"
            :disabled="isRoleOptionDisabled(role)"
            border
          >
            {{ role.name }}
            <span class="role-code">{{ role.code }}</span>
          </el-checkbox>
        </el-checkbox-group>
        <div class="drawer-footer">
          <el-button @click="roleVisible = false">取消</el-button>
          <el-button type="primary" :loading="roleSaving" @click="onRoleSubmit">保存角色</el-button>
        </div>
      </template>
    </el-drawer>
  </el-card>
</template>

<style scoped>
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.filter {
  margin-bottom: 8px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
.role-info {
  margin-bottom: 16px;
}
.role-list {
  display: grid;
  gap: 10px;
}
.role-list :deep(.el-checkbox) {
  width: 100%;
  margin-right: 0;
}
.role-code {
  margin-left: 8px;
  color: #8a94a6;
  font-size: 12px;
}
.drawer-footer {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
