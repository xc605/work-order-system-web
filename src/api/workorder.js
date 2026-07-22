import request from '@/utils/request'

// 创建工单(submit=true 直接提交审核,false 存草稿)
export function createWorkOrder(data) {
  return request.post('/workorder/create', data)
}

// 我创建的工单(分页 + keyword/status/priority 筛选)
export function getMyCreated(params) {
  return request.get('/workorder/created', { params })
}

// 待我审核(REVIEWER,后端固定 PENDING_REVIEW + 本部门)
export function getReview(params) {
  return request.get('/workorder/review', { params })
}

// 待派单工单(DISPATCHER,后端固定 PENDING_ASSIGN)
export function getDispatch(params) {
  return request.get('/workorder/dispatch', { params })
}

// 我负责的工单(HANDLER)
export function getAssigned(params) {
  return request.get('/workorder/assigned', { params })
}

// 首页工单统计(按当前用户角色返回相关待办数量)
export function getWorkOrderStats() {
  return request.get('/workorder/stats')
}

// 管理员查询全部工单
export function getAllWorkOrders(params) {
  return request.get('/workorder/list', { params })
}

// 审核:{ event: 'REVIEW_PASS' | 'REVIEW_REJECT', remark? }(驳回时 remark 必填)
export function reviewWorkOrder(code, data) {
  return request.put(`/workorder/${code}/review`, data)
}

// 按对外工单编号查询详情(含 description 与流转日志 logs)
export function getWorkOrderByCode(code) {
  return request.get(`/workorder/code/${code}`)
}

// 编辑草稿(仅 DRAFT):{ title, description, priority }
export function updateDraft(code, data) {
  return request.put(`/workorder/${code}`, data)
}

// 删除草稿(仅 DRAFT)
export function deleteDraft(code) {
  return request.delete(`/workorder/${code}`)
}

// 提交审核(DRAFT → 待审核)
export function submitWorkOrder(code) {
  return request.put(`/workorder/${code}/submit`)
}

// 撤回(待审核 → 草稿)
export function withdrawWorkOrder(code) {
  return request.put(`/workorder/${code}/withdraw`)
}

// 取消:{ remark } 必填
export function cancelWorkOrder(code, data) {
  return request.put(`/workorder/${code}/cancel`, data)
}

// 验收:{ event: 'ACCEPT' | 'REJECT_REWORK', remark? }(返工时 remark 必填)
export function acceptanceWorkOrder(code, data) {
  return request.put(`/workorder/${code}/acceptance`, data)
}

// 派单:{ assigneeId, priority? }
export function assignWorkOrder(code, data) {
  return request.put(`/workorder/${code}/assign`, data)
}

// 转派:{ remark }
export function transferWorkOrder(code, data) {
  return request.put(`/workorder/${code}/transfer`, data)
}

// 接单人完成工单
export function completeWorkOrder(code, data) {
  return request.put(`/workorder/${code}/complete`, data)
}

// 相似历史工单搜索:{ query }(≤100字;返回已验收关闭的工单及当时的解决方案)
export function searchSimilar(data) {
  return request.post('/workorder/similar', data)
}
