// 拼图生成器 - 主程序逻辑

(function() {
  'use strict';

  // ============ 状态管理 ============
  const state = {
    currentTemplate: null,
    images: [], // { file, img, offset: {x, y}, scale }
    selectedSlot: null,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    imageStartOffset: { x: 0, y: 0 },
    outputWidth: 1080,
    outputHeight: 1440
  };

  // ============ DOM 元素 ============
  const elements = {
    templateGrid: null,
    imageInput: null,
    imagePreview: null,
    canvas: null,
    exportBtn: null,
    clearBtn: null,
    widthInput: null,
    heightInput: null,
    slotInfo: null
  };

  // ============ 初始化 ============
  function init() {
    // 获取 DOM 元素
    elements.templateGrid = document.getElementById('template-grid');
    elements.imageInput = document.getElementById('image-input');
    elements.imagePreview = document.getElementById('image-preview');
    elements.canvas = document.getElementById('puzzle-canvas');
    elements.exportBtn = document.getElementById('export-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.widthInput = document.getElementById('output-width');
    elements.heightInput = document.getElementById('output-height');
    elements.slotInfo = document.getElementById('slot-info');

    // 绑定事件
    bindEvents();

    // 渲染模板列表
    renderTemplates();

    // 初始化 Canvas
    initCanvas();

    console.log('拼图生成器已初始化');
  }

  // ============ 事件绑定 ============
  function bindEvents() {
    // 图片选择
    elements.imageInput.addEventListener('change', handleImageSelect);

    // 导出按钮
    elements.exportBtn.addEventListener('click', handleExport);

    // 清除按钮
    elements.clearBtn.addEventListener('click', handleClear);

    // 输出尺寸
    elements.widthInput.addEventListener('change', handleSizeChange);
    elements.heightInput.addEventListener('change', handleSizeChange);

    // Canvas 鼠标事件
    elements.canvas.addEventListener('mousedown', handleCanvasMouseDown);
    elements.canvas.addEventListener('mousemove', handleCanvasMouseMove);
    elements.canvas.addEventListener('mouseup', handleCanvasMouseUp);
    elements.canvas.addEventListener('mouseleave', handleCanvasMouseUp);
    elements.canvas.addEventListener('wheel', handleCanvasWheel);

    // Canvas 触摸事件
    elements.canvas.addEventListener('touchstart', handleTouchStart);
    elements.canvas.addEventListener('touchmove', handleTouchMove);
    elements.canvas.addEventListener('touchend', handleTouchEnd);
  }

  // ============ 模板渲染 ============
  function renderTemplates() {
    const categories = {};
    templates.forEach(t => {
      if (!categories[t.category]) {
        categories[t.category] = [];
      }
      categories[t.category].push(t);
    });

    // 按固定顺序排列分类
    const categoryOrder = ['网格系', '瀑布流', '杂志风', '全景'];

    let html = '';
    categoryOrder.forEach(cat => {
      if (categories[cat]) {
        html += `<div class="template-category">
          <h3 class="category-title">${cat}</h3>
          <div class="template-list">`;

        categories[cat].forEach(t => {
          html += createTemplateCard(t);
        });

        html += '</div></div>';
      }
    });

    elements.templateGrid.innerHTML = html;

    // 绑定模板点击事件
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => selectTemplate(card.dataset.id));
    });

    // 默认选择第一个模板
    if (templates.length > 0) {
      selectTemplate(templates[0].id);
    }
  }

  function createTemplateCard(template) {
    const preview = createTemplatePreview(template);
    const selected = state.currentTemplate && state.currentTemplate.id === template.id ? 'selected' : '';
    return `<div class="template-item">
      <div class="template-card ${selected}" data-id="${template.id}">
        ${preview}
      </div>
      <span class="template-name">${template.name}</span>
    </div>`;
  }

  function createTemplatePreview(template) {
    // 使用 SVG 生成预览，竖版比例 3:4 (60x80)
    const width = 60;
    const height = 80;

    // 边框宽度（预览时的边框）
    const borderPreview = 1;

    let rects = template.slots.map(slot => {
      const x = slot.x * width + borderPreview;
      const y = slot.y * height + borderPreview;
      const w = slot.w * width - borderPreview * 2;
      const h = slot.h * height - borderPreview * 2;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#d0d0d0" stroke="#fff" stroke-width="1"/>`;
    }).join('');

    return `<svg class="template-preview-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#f5f5f5"/>
      ${rects}
    </svg>`;
  }

  function selectTemplate(id) {
    state.currentTemplate = templates.find(t => t.id === id);

    // 更新选中状态
    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.id === id);
    });

    // 重置图片数组，保留能放入新模板的图片
    const newImages = [];
    for (let i = 0; i < state.currentTemplate.slots.length; i++) {
      if (state.images[i]) {
        newImages.push(state.images[i]);
      }
    }
    state.images = newImages;

    // 重新渲染
    renderPuzzleCanvas();
    renderImagePreview();
  }

  // ============ 图片处理 ============
  async function handleImageSelect(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages = await loadImagesFromFiles(files);

    // 添加到图片数组
    newImages.forEach(imgData => {
      if (state.images.length < (state.currentTemplate?.slots.length || 99)) {
        state.images.push({
          file: imgData.file,
          img: imgData.img,
          offset: { x: 0, y: 0 },
          scale: 1
        });
      }
    });

    // 重新渲染
    renderPuzzleCanvas();
    renderImagePreview();

    // 清空 input 以便再次选择相同文件
    elements.imageInput.value = '';
  }

  function renderImagePreview() {
    if (state.images.length === 0) {
      elements.imagePreview.innerHTML = '<p class="empty-tip">点击上方按钮选择图片</p>';
      return;
    }

    let html = '<div class="image-list">';
    state.images.forEach((imgData, index) => {
      html += `<div class="image-item" draggable="true" data-index="${index}">
        <img src="${imgData.img.src}" alt="图片 ${index + 1}">
        <button class="remove-btn" data-index="${index}">&times;</button>
        <span class="image-index">${index + 1}</span>
      </div>`;
    });
    html += '</div>';

    elements.imagePreview.innerHTML = html;

    // 绑定删除按钮事件
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        removeImage(index);
      });
    });

    // 绑定拖拽事件
    bindImageDragEvents();
  }

  // 图片拖拽排序
  let dragSrcIndex = null;

  function bindImageDragEvents() {
    const items = document.querySelectorAll('.image-item');
    items.forEach(item => {
      item.addEventListener('dragstart', handleImageDragStart);
      item.addEventListener('dragover', handleImageDragOver);
      item.addEventListener('drop', handleImageDrop);
      item.addEventListener('dragend', handleImageDragEnd);
    });
  }

  function handleImageDragStart(e) {
    const item = e.target.closest('.image-item');
    if (!item) return;
    dragSrcIndex = parseInt(item.dataset.index);
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleImageDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.image-item');
    if (target) {
      // 清除所有高亮，只高亮当前目标
      document.querySelectorAll('.image-item').forEach(item => item.classList.remove('drag-over'));
      target.classList.add('drag-over');
    }
  }

  function handleImageDrop(e) {
    e.preventDefault();
    const target = e.target.closest('.image-item');
    if (!target) return;

    const dragDestIndex = parseInt(target.dataset.index);

    if (dragSrcIndex !== null && dragDestIndex !== null && dragSrcIndex !== dragDestIndex) {
      // 简单交换两个位置
      const temp = state.images[dragSrcIndex];
      state.images[dragSrcIndex] = state.images[dragDestIndex];
      state.images[dragDestIndex] = temp;

      // 重新渲染
      renderPuzzleCanvas();
      renderImagePreview();
    }
  }

  function handleImageDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.image-item').forEach(item => {
      item.classList.remove('drag-over');
    });
    dragSrcIndex = null;
  }

  function removeImage(index) {
    state.images.splice(index, 1);
    renderPuzzleCanvas();
    renderImagePreview();
  }

  // ============ Canvas 渲染 ============
  function initCanvas() {
    renderPuzzleCanvas();
  }

  function renderPuzzleCanvas() {
    if (!state.currentTemplate) return;

    const width = parseInt(elements.widthInput.value) || state.outputWidth;
    const height = parseInt(elements.heightInput.value) || state.outputHeight;

    renderPuzzle(elements.canvas, state.currentTemplate, state.images, width, height);
  }

  function handleSizeChange() {
    renderPuzzleCanvas();
  }

  // ============ Canvas 交互 ============
  function handleCanvasMouseDown(e) {
    if (!state.currentTemplate || state.images.length === 0) return;

    const rect = elements.canvas.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    const slotIndex = getSlotAtPosition(elements.canvas, state.currentTemplate, x, y);

    if (slotIndex !== null && state.images[slotIndex]) {
      state.selectedSlot = slotIndex;
      state.isDragging = true;
      state.dragStart = { x: e.clientX, y: e.clientY };
      state.imageStartOffset = { ...state.images[slotIndex].offset };

      elements.canvas.style.cursor = 'grabbing';
      updateSlotInfo(slotIndex);
    }
  }

  function handleCanvasMouseMove(e) {
    if (!state.isDragging || state.selectedSlot === null) return;

    const dx = e.clientX - state.dragStart.x;
    const dy = e.clientY - state.dragStart.y;

    const imageData = state.images[state.selectedSlot];
    if (imageData) {
      // 计算槽位尺寸
      const slot = state.currentTemplate.slots[state.selectedSlot];
      const outputWidth = parseInt(elements.widthInput.value) || state.outputWidth;
      const outputHeight = parseInt(elements.heightInput.value) || state.outputHeight;
      const borderWidth = 8;
      const slotWidth = slot.w * outputWidth - borderWidth * 2;
      const slotHeight = slot.h * outputHeight - borderWidth * 2;

      // 计算图片在当前 scale 下的尺寸
      const imgRatio = imageData.img.width / imageData.img.height;
      let drawWidth, drawHeight;
      if (imgRatio > slotWidth / slotHeight) {
        drawHeight = slotHeight;
        drawWidth = slotHeight * imgRatio;
      } else {
        drawWidth = slotWidth;
        drawHeight = slotWidth / imgRatio;
      }
      drawWidth *= imageData.scale;
      drawHeight *= imageData.scale;

      // 计算偏移边界
      const maxOffsetX = Math.max(0, (drawWidth - slotWidth) / 2);
      const maxOffsetY = Math.max(0, (drawHeight - slotHeight) / 2);

      // 应用偏移并限制边界
      let newOffsetX = state.imageStartOffset.x + dx;
      let newOffsetY = state.imageStartOffset.y + dy;

      // 限制在边界内
      newOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newOffsetX));
      newOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newOffsetY));

      imageData.offset = {
        x: newOffsetX,
        y: newOffsetY
      };
      renderPuzzleCanvas();
    }
  }

  function handleCanvasMouseUp() {
    state.isDragging = false;
    state.selectedSlot = null;
    elements.canvas.style.cursor = 'default';
  }

  function handleCanvasWheel(e) {
    e.preventDefault();

    if (!state.currentTemplate || state.images.length === 0) return;

    const rect = elements.canvas.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    const slotIndex = getSlotAtPosition(elements.canvas, state.currentTemplate, x, y);

    if (slotIndex !== null && state.images[slotIndex]) {
      const imageData = state.images[slotIndex];
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      const newScale = imageData.scale * delta;

      const slot = state.currentTemplate.slots[slotIndex];
      const outputWidth = parseInt(elements.widthInput.value) || state.outputWidth;
      const outputHeight = parseInt(elements.heightInput.value) || state.outputHeight;

      // 使用公共方法处理缩放
      const triggeredAnimation = applyScaleChange(imageData, newScale, slot, outputWidth, outputHeight);

      if (!triggeredAnimation) {
        renderPuzzleCanvas();
      }
      updateSlotInfo(slotIndex);
    }
  }

  // 触摸事件处理
  let touchStartDistance = 0;
  let touchStartScale = 1;

  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleCanvasMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    } else if (e.touches.length === 2) {
      // 双指缩放
      touchStartDistance = getTouchDistance(e.touches);
      if (state.selectedSlot !== null && state.images[state.selectedSlot]) {
        touchStartScale = state.images[state.selectedSlot].scale;
      }
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleCanvasMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    } else if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches);
      const scale = touchStartScale * (distance / touchStartDistance);

      if (state.selectedSlot !== null && state.images[state.selectedSlot]) {
        const imageData = state.images[state.selectedSlot];
        const slot = state.currentTemplate.slots[state.selectedSlot];
        const outputWidth = parseInt(elements.widthInput.value) || state.outputWidth;
        const outputHeight = parseInt(elements.heightInput.value) || state.outputHeight;

        // 使用公共方法处理缩放
        const triggeredAnimation = applyScaleChange(imageData, scale, slot, outputWidth, outputHeight);

        if (!triggeredAnimation) {
          renderPuzzleCanvas();
        }
        updateSlotInfo(state.selectedSlot);
      }
    }
  }

  function handleTouchEnd() {
    handleCanvasMouseUp();
  }

  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 公共方法：应用缩放变化
  function applyScaleChange(imageData, newScale, slot, outputWidth, outputHeight) {
    const borderWidth = 8;
    const slotWidth = slot.w * outputWidth - borderWidth * 2;
    const slotHeight = slot.h * outputHeight - borderWidth * 2;
    const minScale = getMinScale(imageData.img, slotWidth, slotHeight);

    const wasScalingDown = newScale < imageData.scale;
    const constrainedScale = Math.max(minScale, Math.min(3, newScale));
    // 计算缩放差值，差值小（比如 < 0.3）可能是误触，归零
    const scaleDelta = imageData.scale - constrainedScale;
    const shouldResetOffset = wasScalingDown && scaleDelta < 0.3 && (imageData.offset.x !== 0 || imageData.offset.y !== 0);
    imageData.scale = constrainedScale;

    // 当缩小差值小且有偏移时动画归零
    if (shouldResetOffset) {
      animateOffsetToZero(imageData);
      return true; // 表示触发了动画
    }
    return false; // 表示没有触发动画
  }

  // 动画：将偏移量平滑过渡到 0
  function animateOffsetToZero(imageData) {
    const startX = imageData.offset.x;
    const startY = imageData.offset.y;
    const duration = 150; // 动画时长 ms
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用 ease-out 缓动函数
      const easeOut = 1 - Math.pow(1 - progress, 3);

      imageData.offset.x = startX * (1 - easeOut);
      imageData.offset.y = startY * (1 - easeOut);

      if (progress < 1) {
        renderPuzzleCanvas();
        requestAnimationFrame(animate);
      } else {
        imageData.offset.x = 0;
        imageData.offset.y = 0;
        renderPuzzleCanvas();
      }
    }

    requestAnimationFrame(animate);
  }

  function updateSlotInfo(slotIndex) {
    if (slotIndex !== null && state.images[slotIndex]) {
      const img = state.images[slotIndex];
      elements.slotInfo.textContent = `槽位 ${slotIndex + 1}: 缩放 ${img.scale.toFixed(2)}x`;
    } else {
      elements.slotInfo.textContent = '';
    }
  }

  // ============ 导出 ============
  function handleExport() {
    if (!state.currentTemplate) {
      alert('请先选择模板');
      return;
    }

    const filename = `puzzle-${Date.now()}.png`;
    exportCanvasAsPNG(elements.canvas, filename);
  }

  // ============ 清除 ============
  function handleClear() {
    state.images = [];
    state.selectedSlot = null;
    elements.imageInput.value = '';

    renderPuzzleCanvas();
    renderImagePreview();

    elements.slotInfo.textContent = '';
  }

  // ============ 启动 ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
