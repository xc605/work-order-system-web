<script setup>
import WorkOrderListView from '@/components/WorkOrderListView.vue'
import { getAllWorkOrders } from '@/api/workorder'
</script>

<template>
  <el-card>
    <template #header>全部工单</template>
    <WorkOrderListView :fetcher="getAllWorkOrders" context="admin" />
  </el-card>
</template>
