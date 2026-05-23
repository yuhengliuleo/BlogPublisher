const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { execSync, spawn } = require('child_process')

let mainWindow

// 配置文件路径
const configPath = path.join(app.getPath('userData'), 'config.json')

// 默认配置
const defaultConfig = {
  blogPath: '',
  githubRepo: '',
  siteUrl: ''
}

// 读取配置
function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return { ...defaultConfig, ...config }
    }
  } catch (error) {
    console.error('读取配置失败:', error)
  }
  return { ...defaultConfig }
}

// 保存配置
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('保存配置失败:', error)
    return false
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false
  })

  // 开发模式加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理程序

// 获取配置
ipcMain.handle('get-config', async () => {
  return { success: true, config: getConfig() }
})

// 保存配置
ipcMain.handle('save-config', async (event, config) => {
  const success = saveConfig(config)
  return { success }
})

// 选择文件夹
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return result
})

// 选择文件
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Word Documents', extensions: ['docx', 'doc'] }]
  })
  return result
})

// 验证博客路径
ipcMain.handle('validate-blog-path', async (event, blogPath) => {
  try {
    const hugoToml = path.join(blogPath, 'hugo.toml')
    const contentDir = path.join(blogPath, 'content')
    
    if (!fs.existsSync(blogPath)) {
      return { success: false, error: '路径不存在' }
    }
    if (!fs.existsSync(hugoToml)) {
      return { success: false, error: '未找到 hugo.toml 配置文件' }
    }
    if (!fs.existsSync(contentDir)) {
      return { success: false, error: '未找到 content 目录' }
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 获取博客路径下的分类列表
ipcMain.handle('get-categories', async () => {
  const config = getConfig()
  if (!config.blogPath) {
    return { success: false, error: '请先在设置中配置博客路径' }
  }
  
  const categoriesPath = path.join(config.blogPath, 'content', '分类')
  
  try {
    if (!fs.existsSync(categoriesPath)) {
      // 尝试直接从 content 目录获取
      const contentPath = path.join(config.blogPath, 'content')
      if (fs.existsSync(contentPath)) {
        const categories = fs.readdirSync(contentPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name)
        return { success: true, categories }
      }
      return { success: false, error: '未找到分类目录' }
    }
    
    const categories = fs.readdirSync(categoriesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    return { success: true, categories }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 转换 Word 到 Markdown
ipcMain.handle('convert-word', async (event, filePath) => {
  const config = getConfig()
  if (!config.blogPath) {
    return { success: false, error: '请先在设置中配置博客路径' }
  }
  
  try {
    const mediaPath = path.join(config.blogPath, 'static', 'media')
    const tempDir = path.join(config.blogPath, '.temp_convert')
    
    // 确保 media 目录存在
    if (!fs.existsSync(mediaPath)) {
      fs.mkdirSync(mediaPath, { recursive: true })
    }
    
    // 创建临时目录
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    const fileName = path.basename(filePath, path.extname(filePath))
    const outputMd = path.join(tempDir, `${fileName}.md`)
    
    // 使用 pandoc 转换，提取图片到 media 目录
    const pandocCmd = `pandoc -f docx -t gfm "${filePath}" -o "${outputMd}" --extract-media="${mediaPath}"`
    
    execSync(pandocCmd, { encoding: 'utf-8' })
    
    // 读取转换后的 Markdown
    let markdown = fs.readFileSync(outputMd, 'utf-8')
    
    // 处理图片路径 - pandoc 提取的图片在 media 子目录中
    const extractedMediaPath = path.join(mediaPath, 'media')
    if (fs.existsSync(extractedMediaPath)) {
      const files = fs.readdirSync(extractedMediaPath)
      files.forEach(file => {
        const srcPath = path.join(extractedMediaPath, file)
        const destPath = path.join(mediaPath, file)
        if (fs.lstatSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, destPath)
        }
      })
      // 删除提取的子目录
      fs.rmSync(extractedMediaPath, { recursive: true, force: true })
    }
    
    // 更新 Markdown 中的图片路径
    markdown = markdown.replace(/!\[([^\]]*)\]\([^)]*\/media\/([^)]+)\)/g, '![$1](/media/$2)')
    markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imgPath) => {
      if (!imgPath.startsWith('/media/') && !imgPath.startsWith('http')) {
        const imgName = path.basename(imgPath)
        return `![${alt}](/media/${imgName})`
      }
      return match
    })
    
    // 清理临时文件
    fs.rmSync(tempDir, { recursive: true, force: true })
    
    return { success: true, markdown }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 保存文章
ipcMain.handle('save-article', async (event, { title, date, category, markdown, showToc, fileName }) => {
  const config = getConfig()
  if (!config.blogPath) {
    return { success: false, error: '请先在设置中配置博客路径' }
  }
  
  try {
    const categoryPath = path.join(config.blogPath, 'content', '分类', category)
    
    // 确保分类目录存在
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true })
    }
    
    // 构建文章内容
    const frontMatter = `---
title: "${title}"
date: "${date}"
draft: false
categories: ["${category}"]${showToc ? '\ntableOfContents: true' : ''}
---
`
    const fullContent = frontMatter + markdown
    
    // 保存文章
    const articlePath = path.join(categoryPath, `${fileName}.md`)
    fs.writeFileSync(articlePath, fullContent, 'utf-8')
    
    return { success: true, path: articlePath }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 创建新分类
ipcMain.handle('create-category', async (event, categoryName) => {
  const config = getConfig()
  if (!config.blogPath) {
    return { success: false, error: '请先在设置中配置博客路径' }
  }
  
  try {
    const categoryPath = path.join(config.blogPath, 'content', '分类', categoryName)
    
    // 创建分类目录
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true })
    }
    
    // 创建 _index.md
    const indexPath = path.join(categoryPath, '_index.md')
    const indexContent = `---
title: "${categoryName}"
---
`
    fs.writeFileSync(indexPath, indexContent, 'utf-8')
    
    // 更新 hugo.toml 添加导航菜单
    const hugoConfigPath = path.join(config.blogPath, 'hugo.toml')
    if (fs.existsSync(hugoConfigPath)) {
      let hugoConfig = fs.readFileSync(hugoConfigPath, 'utf-8')
      
      // 检查是否已存在该菜单
      if (!hugoConfig.includes(`identifier = "${categoryName}"`)) {
        // 获取当前最大 weight
        const weightMatches = hugoConfig.matchAll(/weight = (\d+)/g)
        let maxWeight = 10
        for (const match of weightMatches) {
          const weight = parseInt(match[1])
          if (weight > maxWeight) maxWeight = weight
        }
        
        const newMenu = `
[[menu.main]]
  identifier = "${categoryName}"
  name = "${categoryName}"
  url = "/分类/${categoryName}/"
  weight = ${maxWeight + 10}
`
        hugoConfig += newMenu
        fs.writeFileSync(hugoConfigPath, hugoConfig, 'utf-8')
      }
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Hugo 构建
ipcMain.handle('hugo-build', async () => {
  const config = getConfig()
  if (!config.blogPath) {
    return { success: false, error: '请先在设置中配置博客路径' }
  }
  
  return new Promise((resolve) => {
    try {
      // 清理 public 目录
      const publicPath = path.join(config.blogPath, 'public')
      if (fs.existsSync(publicPath)) {
        fs.rmSync(publicPath, { recursive: true, force: true })
      }
      
      // 获取 hugo 路径 - 尝试多个常见位置
      let hugoPath = 'hugo'
      const possiblePaths = [
        '/opt/homebrew/bin/hugo',
        '/usr/local/bin/hugo',
        '/usr/bin/hugo',
        'hugo'
      ]
      
      for (const p of possiblePaths) {
        if (p === 'hugo' || fs.existsSync(p)) {
          hugoPath = p
          break
        }
      }
      
      // 执行 hugo 构建
      const hugo = spawn(hugoPath, [], { cwd: config.blogPath })
      
      let output = ''
      hugo.stdout.on('data', (data) => {
        output += data.toString()
      })
      hugo.stderr.on('data', (data) => {
        output += data.toString()
      })
      
      hugo.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output })
        } else {
          resolve({ success: false, error: output })
        }
      })
    } catch (error) {
      resolve({ success: false, error: error.message })
    }
  })
})

// Git 推送
ipcMain.handle('git-push', async (event, commitMessage) => {
  const config = getConfig()
  if (!config.blogPath) {
    return { success: false, error: '请先在设置中配置博客路径' }
  }
  
  if (!config.githubRepo) {
    return { success: false, error: '请先在设置中配置 GitHub 仓库' }
  }
  
  return new Promise((resolve) => {
    const publicPath = path.join(config.blogPath, 'public')
    
    try {
      if (!fs.existsSync(publicPath)) {
        resolve({ success: false, error: 'public 目录不存在，请先执行 Hugo 构建' })
        return
      }
      
      // 构建 Git 远程地址
      const sshUrl = `git@github.com:${config.githubRepo}.git`
      const sshPortUrl = `ssh://git@ssh.github.com:443/${config.githubRepo}.git`
      
      const commands = [
        'git init',
        `git remote add origin ${sshUrl}`,
        'git add .',
        `git commit -m "${commitMessage}"`,
        'git branch -M main',
        'git push --force --set-upstream origin main'
      ]
      
      let output = ''
      
      // 执行命令
      for (const cmd of commands) {
        try {
          const result = execSync(cmd, { cwd: publicPath, encoding: 'utf-8', stdio: 'pipe' })
          output += `$ ${cmd}\n${result}\n`
        } catch (err) {
          // 如果 push 失败，尝试使用 443 端口
          if (cmd.includes('git push')) {
            output += `Push failed, trying port 443...\n`
            try {
              execSync(`git remote set-url origin ${sshPortUrl}`, { cwd: publicPath, encoding: 'utf-8', stdio: 'pipe' })
              const retryResult = execSync('git push --force --set-upstream origin main', { 
                cwd: publicPath, 
                encoding: 'utf-8', 
                stdio: 'pipe',
                timeout: 60000 
              })
              output += `$ ${retryResult}\n`
            } catch (retryErr) {
              resolve({ success: false, error: output + retryErr.message })
              return
            }
          } else if (!cmd.includes('git remote add')) {
            output += `Warning: ${err.message}\n`
          }
        }
      }
      
      resolve({ success: true, output })
    } catch (error) {
      resolve({ success: false, error: error.message })
    }
  })
})

// 获取文章列表
ipcMain.handle('get-articles', async () => {
  const config = getConfig()
  if (!config.blogPath) {
    return { success: false, error: '请先在设置中配置博客路径' }
  }
  
  try {
    const categoriesPath = path.join(config.blogPath, 'content', '分类')
    const articles = []
    
    if (!fs.existsSync(categoriesPath)) {
      return { success: true, articles: [] }
    }
    
    const categories = fs.readdirSync(categoriesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    
    for (const category of categories) {
      const categoryPath = path.join(categoriesPath, category)
      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.md') && file !== '_index.md')
      
      for (const file of files) {
        const filePath = path.join(categoryPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        
        // 解析 front matter
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
        if (frontMatterMatch) {
          const frontMatter = frontMatterMatch[1]
          const titleMatch = frontMatter.match(/title:\s*"?([^"\n]+)"?/)
          const dateMatch = frontMatter.match(/date:\s*"?([^"\n]+)"?/)
          
          articles.push({
            fileName: file,
            title: titleMatch ? titleMatch[1] : file,
            date: dateMatch ? dateMatch[1] : '',
            category,
            path: filePath
          })
        }
      }
    }
    
    // 按日期排序
    articles.sort((a, b) => new Date(b.date) - new Date(a.date))
    
    return { success: true, articles }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 获取文章内容
ipcMain.handle('get-article-content', async (event, articlePath) => {
  try {
    const content = fs.readFileSync(articlePath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 更新文章
ipcMain.handle('update-article', async (event, { articlePath, content }) => {
  try {
    fs.writeFileSync(articlePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 删除文章
ipcMain.handle('delete-article', async (event, articlePath) => {
  try {
    fs.unlinkSync(articlePath)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})