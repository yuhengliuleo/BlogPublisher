<template>
  <div class="app">
    <nav class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab', { active: currentTab === tab.id }]"
        @click="currentTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </nav>

    <!-- 未配置提示 -->
    <div v-if="!config.blogPath && currentTab !== 'settings'" class="no-config-panel">
      <div class="no-config-content">
        <div class="no-config-icon">⚙️</div>
        <h3>欢迎使用 BlogPublisher</h3>
        <p>请先在设置中配置您的博客路径</p>
        <button class="btn btn-primary" @click="currentTab = 'settings'">前往设置</button>
      </div>
    </div>

    <!-- 发布文章 -->
    <div v-else-if="currentTab === 'publish'" class="panel">
      <div class="publish-content">
        <!-- 左侧：文件上传和元数据 -->
        <div class="left-panel">
          <!-- 文件上传区域 -->
          <div 
            class="drop-zone"
            :class="{ dragging: isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="handleDrop"
            @click="selectFile"
          >
            <div class="drop-icon">📄</div>
            <div class="drop-text">拖拽 Word 文档到这里</div>
            <div class="drop-hint">或点击选择文件</div>
          </div>

          <!-- 文件信息 -->
          <div v-if="selectedFile" class="file-info">
            <span class="file-name">{{ selectedFile }}</span>
            <button class="btn-clear" @click="clearFile">清除</button>
          </div>

          <!-- 元数据编辑 -->
          <div class="metadata-form">
            <div class="form-group">
              <label>文章标题</label>
              <input v-model="metadata.title" type="text" placeholder="输入文章标题" />
            </div>

            <div class="form-group">
              <label>发布日期</label>
              <input v-model="metadata.date" type="datetime-local" />
            </div>

            <div class="form-group">
              <label>选择分类</label>
              <div class="category-select">
                <select v-model="metadata.category">
                  <option value="">请选择分类</option>
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
                <button class="btn-small" @click="showNewCategory = true">新建分类</button>
              </div>
            </div>

            <div class="form-group">
              <label>文件名</label>
              <input v-model="metadata.fileName" type="text" placeholder="英文文件名，如: my-article" />
            </div>

            <div class="form-group checkbox">
              <label>
                <input v-model="metadata.showToc" type="checkbox" />
                显示目录
              </label>
            </div>
          </div>
        </div>

        <!-- 右侧：HTML 编辑/预览 -->
        <div class="right-panel">
          <div class="preview-header">
            <span>HTML 内容（可编辑）</span>
            <button v-if="markdown" class="btn-small" @click="copyMarkdown">复制源码</button>
          </div>
          <textarea 
            v-if="markdown"
            v-model="markdown" 
            class="markdown-editor"
            placeholder="转换后的 HTML 内容..."
          ></textarea>
          <div v-else class="html-preview html-preview-empty">
            转换后的内容将显示在这里...
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <button class="btn btn-secondary" @click="resetForm">重置</button>
        <button 
          class="btn btn-primary" 
          :disabled="!canPublish || publishing"
          @click="publishArticle"
        >
          {{ publishing ? '发布中...' : '🚀 一键发布' }}
        </button>
      </div>
    </div>

    <!-- 新建分类 -->
    <div v-else-if="currentTab === 'category'" class="panel">
      <div class="category-content">
        <h3>新建分类</h3>
        <div class="form-group">
          <label>分类名称</label>
          <input v-model="newCategoryName" type="text" placeholder="输入分类名称" />
        </div>
        <button class="btn btn-primary" @click="createCategory" :disabled="!newCategoryName || creatingCategory">
          {{ creatingCategory ? '创建中...' : '创建分类' }}
        </button>

        <h3 style="margin-top: 30px;">现有分类</h3>
        <div class="category-list">
          <div v-for="cat in categories" :key="cat" class="category-item">
            <span>{{ cat }}</span>
          </div>
          <div v-if="categories.length === 0" class="empty-hint">暂无分类</div>
        </div>
      </div>
    </div>

    <!-- 文章管理 -->
    <div v-else-if="currentTab === 'articles'" class="panel">
      <div class="articles-header">
        <h3>文章列表</h3>
        <button class="btn btn-small" @click="loadArticles">刷新</button>
      </div>
      <div class="articles-list">
        <div v-for="article in articles" :key="article.path" class="article-item">
          <div class="article-info">
            <span class="article-title">{{ article.title }}</span>
            <span class="article-meta">{{ article.category }} · {{ formatDate(article.date) }}</span>
          </div>
          <div class="article-actions">
            <button class="btn-small" @click="editArticle(article)">编辑</button>
            <button class="btn-small btn-danger" @click="confirmDelete(article)">删除</button>
          </div>
        </div>
        <div v-if="articles.length === 0" class="empty-state">
          暂无文章
        </div>
      </div>
    </div>

    <!-- 设置 -->
    <div v-else-if="currentTab === 'settings'" class="panel">
      <div class="settings-content">
        <h3>基本设置</h3>
        
        <div class="form-group">
          <label>博客路径 <span class="required">*</span></label>
          <div class="path-input">
            <input 
              v-model="settingsForm.blogPath" 
              type="text" 
              placeholder="选择 Hugo 博客根目录"
              @blur="validateBlogPath"
            />
            <button class="btn-small" @click="selectBlogFolder">选择</button>
          </div>
          <div v-if="pathValidation.message" :class="['validation-msg', pathValidation.valid ? 'valid' : 'invalid']">
            {{ pathValidation.message }}
          </div>
        </div>

        <div class="form-group">
          <label>GitHub 仓库 <span class="required">*</span></label>
          <input 
            v-model="settingsForm.githubRepo" 
            type="text" 
            placeholder="例如: username/username.github.io"
          />
          <div class="form-hint">格式: 用户名/仓库名</div>
        </div>

        <div class="form-group">
          <label>网站地址</label>
          <input 
            v-model="settingsForm.siteUrl" 
            type="text" 
            placeholder="例如: https://yourname.github.io"
          />
          <div class="form-hint">可选，用于在应用中快速访问您的网站</div>
        </div>

        <div class="settings-actions">
          <button class="btn btn-primary" @click="saveSettings" :disabled="savingSettings">
            {{ savingSettings ? '保存中...' : '保存设置' }}
          </button>
        </div>

        <h3 style="margin-top: 30px;">依赖检查</h3>
        <div class="dependency-check">
          <div class="dependency-item">
            <span>Pandoc</span>
            <span :class="deps.pandoc ? 'status-ok' : 'status-error'">
              {{ deps.pandoc ? '✓ 已安装' : '✗ 未安装' }}
            </span>
          </div>
          <div class="dependency-item">
            <span>Hugo</span>
            <span :class="deps.hugo ? 'status-ok' : 'status-error'">
              {{ deps.hugo ? '✓ 已安装' : '✗ 未安装' }}
            </span>
          </div>
          <div class="dependency-item">
            <span>Git</span>
            <span :class="deps.git ? 'status-ok' : 'status-error'">
              {{ deps.git ? '✓ 已安装' : '✗ 未安装' }}
            </span>
          </div>
        </div>

        <div v-if="config.siteUrl" style="margin-top: 30px;">
          <h3>快速访问</h3>
          <a :href="config.siteUrl" target="_blank" class="site-link">
            {{ config.siteUrl }}
            <span class="external-icon">↗</span>
          </a>
        </div>
      </div>
    </div>

    <!-- 新建分类弹窗 -->
    <div v-if="showNewCategory" class="modal-overlay" @click.self="showNewCategory = false">
      <div class="modal">
        <h3>新建分类</h3>
        <input v-model="quickCategoryName" type="text" placeholder="输入分类名称" />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showNewCategory = false">取消</button>
          <button class="btn btn-primary" @click="quickCreateCategory">创建</button>
        </div>
      </div>
    </div>

    <!-- 编辑文章弹窗 -->
    <div v-if="editingArticle" class="modal-overlay" @click.self="editingArticle = null">
      <div class="modal modal-large">
        <h3>编辑文章: {{ editingArticle.title }}</h3>
        <div class="edit-category-select">
          <label>分类：</label>
          <select v-model="editingCategory">
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <textarea v-model="editingContent" class="markdown-editor"></textarea>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="editingArticle = null">取消</button>
          <button class="btn btn-primary" @click="saveEditedArticle">保存</button>
        </div>
      </div>
    </div>

    <!-- 状态提示 -->
    <div v-if="status.message" :class="['status-bar', status.type]">
      {{ status.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// 标签页
const tabs = [
  { id: 'publish', name: '发布文章' },
  { id: 'category', name: '新建分类' },
  { id: 'articles', name: '文章管理' },
  { id: 'settings', name: '设置' }
]
const currentTab = ref('settings')

// 配置
const config = ref({
  blogPath: '',
  githubRepo: '',
  siteUrl: ''
})

// 设置表单
const settingsForm = ref({
  blogPath: '',
  githubRepo: '',
  siteUrl: ''
})

// 路径验证
const pathValidation = ref({
  valid: false,
  message: ''
})

// 文件上传
const isDragging = ref(false)
const selectedFile = ref('')
const markdown = ref('')

// 元数据
const metadata = ref({
  title: '',
  date: getDefaultDate(),
  category: '',
  fileName: '',
  showToc: false
})

// 分类
const categories = ref([])
const newCategoryName = ref('')
const creatingCategory = ref(false)
const showNewCategory = ref(false)
const quickCategoryName = ref('')

// 文章列表
const articles = ref([])
const editingArticle = ref(null)
const editingContent = ref('')
const editingCategory = ref('')

// 状态
const publishing = ref(false)
const savingSettings = ref(false)
const status = ref({ message: '', type: '' })

// 依赖检查
const deps = ref({
  pandoc: false,
  hugo: false,
  git: false
})

// 计算属性
const canPublish = computed(() => {
  return selectedFile.value && 
         metadata.value.title && 
         metadata.value.category && 
         metadata.value.fileName &&
         markdown.value
})

// 方法
function getDefaultDate() {
  const now = new Date()
  return now.toISOString().slice(0, 16)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

function showStatus(message, type = 'info', duration = 3000) {
  status.value = { message, type }
  setTimeout(() => {
    status.value = { message: '', type: '' }
  }, duration)
}

// 加载配置
async function loadConfig() {
  const result = await window.electronAPI.getConfig()
  if (result.success) {
    config.value = result.config
    settingsForm.value = { ...result.config }
  }
}

// 验证博客路径
async function validateBlogPath() {
  const path = settingsForm.value.blogPath
  if (!path) {
    pathValidation.value = { valid: false, message: '' }
    return
  }
  
  const result = await window.electronAPI.validateBlogPath(path)
  if (result.success) {
    pathValidation.value = { valid: true, message: '✓ 有效的 Hugo 博客路径' }
  } else {
    pathValidation.value = { valid: false, message: '✗ ' + result.error }
  }
}

// 选择博客文件夹
async function selectBlogFolder() {
  const result = await window.electronAPI.selectFolder()
  if (!result.canceled && result.filePaths.length > 0) {
    settingsForm.value.blogPath = result.filePaths[0]
    await validateBlogPath()
  }
}

// 保存设置
async function saveSettings() {
  if (!settingsForm.value.blogPath) {
    showStatus('请填写博客路径', 'error')
    return
  }
  if (!settingsForm.value.githubRepo) {
    showStatus('请填写 GitHub 仓库', 'error')
    return
  }
  
  savingSettings.value = true
  
  try {
    // 将 Vue 响应式对象转换为普通对象，避免 IPC 克隆错误
    const configData = { ...settingsForm.value }
    const result = await window.electronAPI.saveConfig(configData)
    if (result.success) {
      config.value = { ...settingsForm.value }
      showStatus('设置已保存', 'success')
      try {
        await loadCategories()
      } catch (catError) {
        console.error('加载分类失败:', catError)
        // 分类加载失败不影响保存成功
      }
    } else {
      showStatus('保存失败: ' + (result.error || '未知错误'), 'error')
    }
  } catch (error) {
    console.error('保存设置出错:', error)
    showStatus('保存失败: ' + error.message, 'error')
  } finally {
    savingSettings.value = false
  }
}

// 文件选择
async function selectFile() {
  const result = await window.electronAPI.selectFile()
  if (!result.canceled && result.filePaths.length > 0) {
    await loadFile(result.filePaths[0])
  }
}

async function handleDrop(e) {
  isDragging.value = false
  const files = e.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      await loadFile(file.path)
    } else {
      showStatus('请选择 Word 文档 (.docx 或 .doc)', 'error')
    }
  }
}

async function loadFile(filePath) {
  selectedFile.value = filePath.split('/').pop()
  
  // 自动生成文件名
  const baseName = selectedFile.value.replace(/\.(docx|doc)$/i, '')
  metadata.value.fileName = baseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  
  if (!metadata.value.title) {
    metadata.value.title = baseName
  }
  
  showStatus('正在转换...', 'info')
  
  const result = await window.electronAPI.convertWord(filePath)
  if (result.success) {
    markdown.value = result.markdown
    showStatus('转换成功', 'success')
  } else {
    showStatus('转换失败: ' + result.error, 'error')
  }
}

function clearFile() {
  selectedFile.value = ''
  markdown.value = ''
}

async function publishArticle() {
  if (!canPublish.value || publishing.value) return
  
  publishing.value = true
  showStatus('正在发布...', 'info')
  
  try {
    // 格式化日期
    const date = new Date(metadata.value.date)
    const formattedDate = date.toISOString()
    
    // 保存文章
    const saveResult = await window.electronAPI.saveArticle({
      title: metadata.value.title,
      date: formattedDate,
      category: metadata.value.category,
      markdown: markdown.value,
      showToc: metadata.value.showToc,
      fileName: metadata.value.fileName
    })
    
    if (!saveResult.success) {
      showStatus('保存文章失败: ' + saveResult.error, 'error')
      publishing.value = false
      return
    }
    
    // Hugo 构建
    showStatus('正在构建...', 'info')
    const buildResult = await window.electronAPI.hugoBuild()
    if (!buildResult.success) {
      showStatus('构建失败: ' + buildResult.error, 'error')
      publishing.value = false
      return
    }
    
    // Git 推送
    showStatus('正在推送到 GitHub...', 'info')
    const pushResult = await window.electronAPI.gitPush(`发布文章: ${metadata.value.title}`)
    if (!pushResult.success) {
      showStatus('推送失败: ' + pushResult.error, 'error')
      publishing.value = false
      return
    }
    
    // 发布成功，显示更长时间的成功提示
    showStatus('🎉 发布成功！文章已推送到 GitHub', 'success', 5000)
    resetForm()
    
  } catch (error) {
    showStatus('发布失败: ' + error.message, 'error')
  } finally {
    publishing.value = false
  }
}

function resetForm() {
  selectedFile.value = ''
  markdown.value = ''
  metadata.value = {
    title: '',
    date: getDefaultDate(),
    category: '',
    fileName: '',
    showToc: false
  }
}

async function loadCategories() {
  const result = await window.electronAPI.getCategories()
  if (result.success) {
    categories.value = result.categories
  }
}

async function createCategory() {
  if (!newCategoryName.value || creatingCategory.value) return
  
  creatingCategory.value = true
  const result = await window.electronAPI.createCategory(newCategoryName.value)
  
  if (result.success) {
    showStatus('分类创建成功', 'success')
    newCategoryName.value = ''
    await loadCategories()
  } else {
    showStatus('创建失败: ' + result.error, 'error')
  }
  
  creatingCategory.value = false
}

async function quickCreateCategory() {
  if (!quickCategoryName.value) return
  
  const result = await window.electronAPI.createCategory(quickCategoryName.value)
  if (result.success) {
    showStatus('分类创建成功', 'success')
    metadata.value.category = quickCategoryName.value
    quickCategoryName.value = ''
    showNewCategory.value = false
    await loadCategories()
  } else {
    showStatus('创建失败: ' + result.error, 'error')
  }
}

async function loadArticles() {
  const result = await window.electronAPI.getArticles()
  if (result.success) {
    articles.value = result.articles
  }
}

async function editArticle(article) {
  const result = await window.electronAPI.getArticleContent(article.path)
  if (result.success) {
    editingArticle.value = article
    editingContent.value = result.content
    editingCategory.value = article.category
  }
}

async function saveEditedArticle() {
  if (!editingArticle.value) return
  
  showStatus('正在保存...', 'info')
  
  const result = await window.electronAPI.updateArticle({
    articlePath: editingArticle.value.path,
    content: editingContent.value,
    newCategory: editingCategory.value
  })
  
  if (!result.success) {
    showStatus('保存失败: ' + result.error, 'error')
    return
  }
  
  // Hugo 构建
  showStatus('正在构建...', 'info')
  const buildResult = await window.electronAPI.hugoBuild()
  if (!buildResult.success) {
    showStatus('构建失败: ' + buildResult.error, 'error')
    return
  }
  
  // Git 推送
  showStatus('正在推送到 GitHub...', 'info')
  const pushResult = await window.electronAPI.gitPush(`更新文章: ${editingArticle.value.title}`)
  if (!pushResult.success) {
    showStatus('推送失败: ' + pushResult.error, 'error')
    return
  }
  
  showStatus('🎉 文章已更新并推送到 GitHub', 'success', 5000)
  editingArticle.value = null
  
  // 刷新文章列表
  await loadArticles()
}

async function confirmDelete(article) {
  if (confirm(`确定要删除文章 "${article.title}" 吗？`)) {
    const result = await window.electronAPI.deleteArticle(article.path)
    if (result.success) {
      showStatus('文章已删除', 'success')
      await loadArticles()
    } else {
      showStatus('删除失败: ' + result.error, 'error')
    }
  }
}

function copyMarkdown() {
  navigator.clipboard.writeText(markdown.value)
  showStatus('已复制到剪贴板', 'success')
}

async function checkDependencies() {
  // 这些检查需要在主进程中完成
  deps.value = {
    pandoc: true,
    hugo: true,
    git: true
  }
}

// 生命周期
onMounted(async () => {
  await loadConfig()
  if (config.value.blogPath) {
    await loadCategories()
    await loadArticles()
  }
  checkDependencies()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 标签页导航 */
.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 20px;
  -webkit-app-region: drag;
}

.tab {
  padding: 15px 25px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
}

.tab:hover {
  color: #333;
}

.tab.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

/* 未配置提示 */
.no-config-panel {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.no-config-content {
  text-align: center;
  padding: 40px;
}

.no-config-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.no-config-content h3 {
  font-size: 24px;
  margin-bottom: 10px;
}

.no-config-content p {
  color: #666;
  margin-bottom: 20px;
}

/* 面板 */
.panel {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 发布页面布局 */
.publish-content {
  display: flex;
  gap: 20px;
  height: calc(100vh - 180px);
}

.left-panel {
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

/* 拖拽区域 */
.drop-zone {
  background: #fff;
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.drop-zone:hover,
.drop-zone.dragging {
  border-color: #007bff;
  background: #f0f7ff;
}

.drop-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.drop-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 5px;
}

.drop-hint {
  font-size: 13px;
  color: #999;
}

/* 文件信息 */
.file-info {
  background: #e8f5e9;
  border-radius: 6px;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-name {
  font-size: 14px;
  color: #2e7d32;
}

.btn-clear {
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 13px;
}

.btn-clear:hover {
  color: #f44336;
}

/* 表单 */
.metadata-form {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.form-group .required {
  color: #f44336;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
}

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form-group.checkbox input {
  width: auto;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.path-input {
  display: flex;
  gap: 10px;
}

.path-input input {
  flex: 1;
}

.validation-msg {
  font-size: 12px;
  margin-top: 6px;
  padding: 6px 10px;
  border-radius: 4px;
}

.validation-msg.valid {
  background: #e8f5e9;
  color: #2e7d32;
}

.validation-msg.invalid {
  background: #ffebee;
  color: #c62828;
}

.category-select {
  display: flex;
  gap: 10px;
}

.category-select select {
  flex: 1;
}

/* Markdown 编辑器 */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  font-size: 14px;
  color: #666;
}

.markdown-editor {
  flex: 1;
  width: 100%;
  padding: 15px;
  border: none;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.html-preview {
  flex: 1;
  width: 100%;
  padding: 20px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.7;
  color: #333;
}
.html-preview table {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
}
.html-preview th, .html-preview td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}
.html-preview th {
  background: #f5f5f5;
  font-weight: 600;
}
.html-preview img {
  max-width: 100%;
  height: auto;
  margin: 8px 0;
}
.html-preview-empty {
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 操作按钮 */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #d0d0d0;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  background: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-small:hover {
  background: #d0d0d0;
}

.btn-danger {
  background: #ffebee !important;
  color: #f44336 !important;
}

.btn-danger:hover {
  background: #ffcdd2 !important;
}

/* 分类页面 */
.category-content {
  max-width: 500px;
}

.category-content h3 {
  margin-bottom: 15px;
  font-size: 16px;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.category-item {
  background: #fff;
  padding: 10px 15px;
  border-radius: 6px;
  font-size: 14px;
}

.empty-hint {
  color: #999;
  font-size: 14px;
}

/* 文章管理 */
.articles-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.articles-header h3 {
  font-size: 16px;
}

.articles-list {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.article-item:last-child {
  border-bottom: none;
}

.article-title {
  font-size: 14px;
  font-weight: 500;
}

.article-meta {
  font-size: 12px;
  color: #999;
  margin-left: 10px;
}

.article-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #999;
}

/* 设置页面 */
.settings-content {
  max-width: 600px;
}

.settings-content h3 {
  margin-bottom: 15px;
  font-size: 16px;
}

.settings-actions {
  margin-top: 20px;
}

.site-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #007bff;
  text-decoration: none;
  font-size: 14px;
}

.site-link:hover {
  text-decoration: underline;
}

.external-icon {
  font-size: 12px;
}

.dependency-check {
  background: #fff;
  border-radius: 8px;
  padding: 15px;
}

.dependency-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.dependency-item:last-child {
  border-bottom: none;
}

.status-ok {
  color: #4caf50;
}

.status-error {
  color: #f44336;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 8px;
  padding: 25px;
  width: 400px;
  max-width: 90%;
}

.modal h3 {
  margin-bottom: 15px;
  font-size: 16px;
}

.modal input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 15px;
}

.modal-large {
  width: 800px;
  height: 600px;
  display: flex;
  flex-direction: column;
}

.modal-large .markdown-editor {
  flex: 1;
  margin-bottom: 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.edit-category-select {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.edit-category-select label {
  font-size: 14px;
  color: #666;
}

.edit-category-select select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  min-width: 150px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 状态栏 */
.status-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  color: #fff;
  z-index: 1000;
  animation: fadeIn 0.3s;
}

.status-bar.success {
  background: #4caf50;
}

.status-bar.error {
  background: #f44336;
}

.status-bar.info {
  background: #2196f3;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>