const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 配置管理
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // 文件/文件夹选择
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  
  // 验证博客路径
  validateBlogPath: (blogPath) => ipcRenderer.invoke('validate-blog-path', blogPath),
  
  // 分类管理
  getCategories: () => ipcRenderer.invoke('get-categories'),
  createCategory: (categoryName) => ipcRenderer.invoke('create-category', categoryName),
  
  // 文章管理
  convertWord: (filePath) => ipcRenderer.invoke('convert-word', filePath),
  saveArticle: (data) => ipcRenderer.invoke('save-article', data),
  getArticles: () => ipcRenderer.invoke('get-articles'),
  getArticleContent: (articlePath) => ipcRenderer.invoke('get-article-content', articlePath),
  updateArticle: (data) => ipcRenderer.invoke('update-article', data),
  deleteArticle: (articlePath) => ipcRenderer.invoke('delete-article', articlePath),
  
  // 构建和发布
  hugoBuild: () => ipcRenderer.invoke('hugo-build'),
  gitPush: (commitMessage) => ipcRenderer.invoke('git-push', commitMessage)
})