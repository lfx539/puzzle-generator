# 拼图生成器 - 项目计划

## 项目概述
创建一个浏览器端的拼图生成工具，用户可以选择布局模板、选择图片文件，程序自动将图片匹配到模板中，生成精美的拼图。

## 核心功能
1. **模板系统** - 预设多种好看的不规则布局模板
2. **图片选择** - 从本地文件夹选择多张图片
3. **自动匹配** - 将图片自动填入模板对应位置
4. **手动调整** - 支持调整图片位置/缩放
5. **导出功能** - 导出最终拼图为图片文件

## 技术方案

### 技术栈
- 纯前端实现（HTML/CSS/JS）
- 使用 Canvas API 进行图片处理
- 无需后端服务器
- 无需额外 API（除非需要 AI 智能匹配）

### 模板设计思路
预设 10+ 种精品模板，分为几类：
- **网格类** - 2x2, 3x3, 不规则网格
- **瀑布流** - 像 Pinterest 那样的错落布局
- **杂志风** - 大图+小图组合的时尚排版
- **边框装饰** - 带分隔线、渐变背景等

### 图片匹配逻辑
1. 按顺序自动填入模板位置
2. 使用 "cover" 模式（填满区域，等比裁剪）
3. 手动可拖拽调整

## 最终方案

### 技术栈
- **纯前端**：HTML5 + CSS3 + JavaScript (ES6+)
- **图片处理**：Canvas API
- **文件处理**：File API + FileReader
- **无 API 依赖**：完全本地运行，无需任何授权

### 项目结构
```
/puzzle-generator/
├── index.html      # 主页面
├── css/
│   └── style.css   # 样式
└── js/
    ├── app.js      # 主程序
    ├── templates.js # 模板定义
    └── canvas.js   # Canvas 处理工具
```

### 模板系统（12+ 款）
分为 5 类：
1. **网格系** - 2x2, 3x3, 2+3 组合
2. **杂志风** - 1大+2小, 1大+4小, 全景+特写
3. **瀑布流** - Pinterest 风格错落布局
4. **边框系** - 带分隔线、圆形、卡片式
5. **创意系** - 斜切、蒙太奇、照片墙

### 核心流程
1. 选择模板（缩略图预览）
2. 选择图片（支持多选，按住 Shift/Ctrl）
3. 自动填充（cover 模式，等比裁剪填满区域）
4. 手动调整（拖拽移动、滚轮缩放）
5. 导出 PNG

### 关键实现
- **图片裁剪**：`object-fit: cover` 逻辑在 Canvas 实现
- **模板定义**：JSON 格式定义每个位置 x,y,width,height
- **交互**：鼠标拖拽、滚轮缩放

### 预期文件
- [index.html](puzzle_generator/index.html) - 主页面
- [css/style.css](puzzle_generator/css/style.css) - 样式
- [js/app.js](puzzle_generator/js/app.js) - 主程序逻辑
- [js/templates.js](puzzle_generator/js/templates.js) - 模板定义
- [js/canvas-utils.js](puzzle_generator/js/canvas-utils.js) - Canvas 工具函数

### 验证方式
1. 打开 index.html
2. 选择一个模板
3. 选择 4-9 张图片
4. 观察自动填充效果
5. 手动调整图片位置
6. 点击导出，验证生成的图片
