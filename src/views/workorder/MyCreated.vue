<script setup>
import { ref } from 'vue'
import WorkOrderListView from '@/components/WorkOrderListView.vue'
import { getMyCreated } from '@/api/workorder'

const activeView = ref('TODO')

const views = [
  { name: 'TODO', label: '待我处理' },
  { name: 'PROCESSING', label: '流转中' },
  { name: 'FINISHED', label: '已结束' },
  { name: 'ALL', label: '全部' },
]

function fetchCreated(params) {
  return getMyCreated({ ...params, view: activeView.value })
}
</script>

<template>
  <el-card>
    <template #header>我创建的工单</template>
    <el-tabs v-model="activeView" class="created-tabs">
      <el-tab-pane v-for="item in views" :key="item.name" :label="item.label" :name="item.name" />
    </el-tabs>
    <WorkOrderListView
      :key="activeView"
      :fetcher="fetchCreated"
      :status-filter="false"
      :show-create-time="false"
      context="created"
    />
  </el-card>
</template>

<style scoped>
.created-tabs {
  margin-bottom: 12px;
}
.created-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
