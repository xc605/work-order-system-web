<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createDepartment,
  deleteDepartment,
  getDepartmentList,
  updateDepartment,
} from '@/api/department'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const keyword = ref('')
const list = ref([])
const formRef = ref()
const editingId = ref(null)
const form = ref({ name: '' })

const filteredList = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return list.value
  return list.value.filter((item) => item.name?.includes(kw))
})

const rules = {
  name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { max: 50, message: '部门名称最多 50 个字符', trigger: 'blur' },
  ],
}

async function load() {
  loading.value = true
  try {
    list.value = await getDepartmentList()
  } finally {
    loading.value = false
  }
}

function fmtTime(t) {
  return t ? t.replace('T', ' ') : '-'
}

function openCreate() {
  editingId.value = null
  form.value = { name: '' }
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = { name: row.name }
  dialogVisible.value = true
}

async function onSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateDepartment(editingId.value, { name: form.value.name })
      ElMessage.success('已保存')
    } else {
      await createDepartment({ name: form.value.name })
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除部门「${row.name}」?`, '删除部门', { type: 'warning' })
  } catch {
    return
  }
  await deleteDepartment(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-head">
        <span>部门管理</span>
        <el-button type="primary" @click="openCreate">新增部门</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter">
      <el-form-item>
        <el-input v-model="keyword" placeholder="部门名称" clearable />
      </el-form-item>
      <el-form-item>
        <el-button @click="keyword = ''">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="filteredList" border stripe>
      <el-table-column prop="id" label="ID" width="90" />
      <el-table-column prop="name" label="部门名称" min-width="180" />
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ fmtTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="180">
        <template #default="{ row }">{{ fmtTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无部门数据" :image-size="92" />
      </template>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑部门' : '新增部门'"
      width="min(460px, calc(100vw - 32px))"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入部门名称" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
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
</style>
