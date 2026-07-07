<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { askKnowledge, getKbCatalog } from '@/api/kb'

const router = useRouter()

const question = ref('')
const loading = ref(false)
const answer = ref('')
const citations = ref([])
const asked = ref(false)

// 引用预览小框:点灯泡先看内容,多个资料可在弹窗顶部切换
const previewVisible = ref(false)
const previewCitations = ref([])
const previewSections = ref([])
const previewActiveIndex = ref(0)

const previewCitation = computed(() => previewCitations.value[previewActiveIndex.value] || null)
const previewSection = computed(() => previewSections.value[previewActiveIndex.value] || null)

// 目录缓存:预览按 sectionId 取条目内容,首次点击拉一次后复用
let catalogPromise = null
function ensureCatalog() {
  if (!catalogPromise) catalogPromise = getKbCatalog()
  return catalogPromise
}

// 模型输出按 Markdown 渲染;LLM 输出视为不可信输入,
// 先 DOMPurify 消毒再 v-html,防止生成的 HTML/脚本注入页面(XSS)。
function uniqueIndexes(indexes) {
  return [...new Set(indexes)]
}

const LINK_ICON_HTML =
  '<svg class="cite-link-icon" viewBox="0 0 1024 1024" aria-hidden="true"><path fill="currentColor" d="M715.648 625.152 670.4 579.904l90.496-90.56c75.008-74.944 85.12-186.368 22.656-248.896-62.528-62.464-173.952-52.352-248.96 22.656L444.16 353.6l-45.248-45.248 90.496-90.496c100.032-99.968 251.968-110.08 339.456-22.656 87.488 87.488 77.312 239.424-22.656 339.456l-90.496 90.496zm-90.496 90.496-90.496 90.496C434.624 906.112 282.688 916.224 195.2 828.8c-87.488-87.488-77.312-239.424 22.656-339.456l90.496-90.496 45.248 45.248-90.496 90.56c-75.008 74.944-85.12 186.368-22.656 248.896 62.528 62.464 173.952 52.352 248.96-22.656l90.496-90.496zm0-362.048 45.248 45.248L398.848 670.4 353.6 625.152z"></path></svg>'

function citationDisplaySuffix(indexes) {
  return indexes.length > 1 ? `<span class="cite-badge-suffix">+${indexes.length}</span>` : ''
}

// 消毒后把连续 [资料n] 原始标注合并成一个可点击引用标记(只注入自有固定标记,n 为纯数字,无注入面)
const renderedAnswer = computed(() => {
  if (!answer.value) return ''
  const safe = DOMPurify.sanitize(marked.parse(answer.value, { breaks: true, async: false }))
  return safe.replace(
    /(?:\[资料\d+\]\s*)+/g,
    (matched) => {
      const indexes = uniqueIndexes([...matched.matchAll(/\[资料(\d+)\]/g)].map((m) => m[1]))
      return `<span class="cite-badge" data-cites="${indexes.join(',')}" title="查看引用资料">${LINK_ICON_HTML}${citationDisplaySuffix(indexes)}</span>`
    },
  )
})

// 事件委托:v-html 内容里的引用标记点击,按编号找到对应引用并弹窗预览
function onAnswerClick(e) {
  const badge = e.target.closest('.cite-badge')
  if (!badge) return
  const indexes = (badge.dataset.cites || '')
    .split(',')
    .map((n) => Number(n))
    .filter(Boolean)
  const selected = indexes
    .map((index) => citations.value.find((c) => c.index === index))
    .filter(Boolean)
  if (selected.length) openCitations(selected)
}

async function onAsk() {
  const q = question.value.trim()
  if (!q) return
  loading.value = true
  try {
    // 后端返回 { answer(含[资料n]标注), citations: [{index,title,sectionId}] }
    const res = await askKnowledge(q)
    answer.value = res?.answer || ''
    citations.value = res?.citations || []
    asked.value = true
  } finally {
    loading.value = false
  }
}

// 点引用 → 弹预览小框(不打断当前对话);完整文档走新标签页
async function openCitations(selectedCitations) {
  previewCitations.value = selectedCitations
  previewSections.value = []
  previewActiveIndex.value = 0
  previewVisible.value = true
  try {
    const catalog = (await ensureCatalog()) || []
    const sections = catalog.flatMap((c) => c.sections || [])
    previewSections.value = selectedCitations.map((citation) =>
      citation.sectionId ? sections.find((s) => s.id === citation.sectionId) || null : null,
    )
  } catch {
    previewSections.value = selectedCitations.map(() => null)
  }
}

const renderedPreview = computed(() =>
  previewSection.value?.content
    ? DOMPurify.sanitize(marked.parse(previewSection.value.content, { breaks: true, async: false }))
    : '',
)

// 新标签页打开完整文档:保留当前对话,知识库页按 ?section= 定位
function openFullDoc() {
  const id = previewCitation.value?.sectionId
  if (!id) return
  const href = router.resolve({ path: '/knowledge', query: { section: id } }).href
  window.open(href, '_blank')
}
</script>

<template>
  <div>
    <div class="ask-row">
      <el-input
        v-model="question"
        type="textarea"
        :rows="2"
        maxlength="200"
        show-word-limit
        placeholder="基于知识库文档提问,如:打印机连不上网怎么办"
      />
      <el-button type="primary" :loading="loading" @click="onAsk">提问</el-button>
    </div>

    <div v-loading="loading" class="answer-area">
      <template v-if="answer">
        <div class="answer" v-html="renderedAnswer" @click="onAnswerClick" />
        <div v-if="citations.length" class="citations">
          <span class="citations-label">引用资料:</span>
          <el-tag
            v-for="c in citations"
            :key="c.index"
            class="citation-tag"
            type="info"
            effect="plain"
            @click="openCitations([c])"
          >
            {{ c.title }}
          </el-tag>
        </div>
      </template>
      <el-empty v-else-if="asked" description="没有得到回答" :image-size="80" />
      <el-empty v-else description="基于知识库文档回答你的问题" :image-size="80" />
    </div>

    <!-- 引用预览:先看条目内容,完整文档新标签打开(不丢当前对话) -->
    <el-dialog
      v-model="previewVisible"
      title="引用资料"
      width="min(560px, calc(100vw - 32px))"
      append-to-body
    >
      <div v-if="previewCitations.length > 1" class="preview-tabs">
        <button
          v-for="(c, i) in previewCitations"
          :key="c.index"
          type="button"
          class="preview-tab"
          :class="{ active: i === previewActiveIndex }"
          @click="previewActiveIndex = i"
        >
          {{ c.title }}
        </button>
      </div>
      <div v-else-if="previewCitation" class="preview-title">{{ previewCitation.title }}</div>
      <div v-if="renderedPreview" class="preview-body" v-html="renderedPreview" />
      <el-empty v-else description="内容加载中或该条目不存在" :image-size="72" />
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" :disabled="!previewCitation?.sectionId" @click="openFullDoc">
          在新标签页打开完整文档 ↗
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.ask-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.answer-area {
  min-height: 160px;
}
.answer {
  line-height: 1.7;
  font-size: 14px;
  color: #333;
  background: #f7f9fc;
  border-radius: 6px;
  padding: 12px;
}
.citations {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.citations-label {
  color: #8a94a6;
  font-size: 13px;
}
.citation-tag {
  cursor: pointer;
}
.citation-tag:hover {
  color: #1677ff;
  border-color: #1677ff;
}
/* v-html 内容不吃 scoped 样式,用 :deep() 给渲染出的 Markdown 标签定样式 */
.answer :deep(p) {
  margin: 0 0 8px;
}
.answer :deep(p:last-child) {
  margin-bottom: 0;
}
.answer :deep(ol),
.answer :deep(ul) {
  margin: 4px 0 8px;
  padding-left: 20px;
}
.answer :deep(li) {
  margin: 2px 0;
}
.answer :deep(code) {
  background: #eef1f6;
  padding: 1px 5px;
  border-radius: 3px;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}
.answer :deep(strong) {
  font-weight: 600;
}
/* 行内引用入口:参考阿里云 AI 助手的 link badge,多资料时显示 +N */
.answer :deep(.cite-badge) {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  height: 16px;
  margin: 0 2px;
  padding: 0 5px;
  border: 1px solid #d5e6ff;
  border-radius: 9px;
  background: #f0f7ff;
  color: #2f6fdd;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  cursor: pointer;
  user-select: none;
  vertical-align: text-bottom;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.answer :deep(.cite-badge:hover) {
  border-color: #9ec5ff;
  background: #e2f0ff;
  color: #165dcc;
}
.answer :deep(.cite-link-icon) {
  width: 13px;
  height: 13px;
  display: block;
  flex: none;
}
.answer :deep(.cite-badge-suffix) {
  color: inherit;
  font-size: 11px;
  line-height: 16px;
}
.preview-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.preview-tab {
  max-width: 100%;
  padding: 5px 10px;
  border: 1px solid #d8e1f0;
  border-radius: 6px;
  background: #fff;
  color: #5f6b7a;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.preview-tab:hover,
.preview-tab.active {
  border-color: #1677ff;
  background: #ecf3ff;
  color: #1677ff;
}
.preview-title {
  margin-bottom: 12px;
  color: #303846;
  font-size: 14px;
  font-weight: 600;
}
.preview-body {
  max-height: 50vh;
  overflow-y: auto;
  line-height: 1.8;
  font-size: 14px;
  color: #303846;
  white-space: normal;
}
.preview-body :deep(p) {
  margin: 0 0 10px;
}
.preview-body :deep(ol),
.preview-body :deep(ul) {
  margin: 4px 0 10px;
  padding-left: 20px;
}
.preview-body :deep(code) {
  background: #eef1f6;
  padding: 1px 5px;
  border-radius: 3px;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}
</style>
