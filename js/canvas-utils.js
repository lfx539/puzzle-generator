// Canvas 工具函数

/**
 * 在 Canvas 上绘制图片，使用 cover 模式（等比裁剪填满区域）
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {HTMLImageElement|HTMLCanvasElement} img - 要绘制的图片
 * @param {number} x - 目标区域 x 坐标
 * @param {number} y - 目标区域 y 坐标
 * @param {number} width - 目标区域宽度
 * @param {number} height - 目标区域高度
 * @param {Object} offset - 图片偏移 {x, y}
 * @param {number} scale - 图片缩放比例
 */
function drawImageCover(ctx, img, x, y, width, height, offset = { x: 0, y: 0 }, scale = 1) {
  const imgRatio = img.width / img.height;
  const targetRatio = width / height;

  let drawWidth, drawHeight;

  if (imgRatio > targetRatio) {
    // 图片更宽，以高度为基准
    drawHeight = height;
    drawWidth = height * imgRatio;
  } else {
    // 图片更高，以宽度为基准
    drawWidth = width;
    drawHeight = width / imgRatio;
  }

  // 应用缩放
  drawWidth *= scale;
  drawHeight *= scale;

  // 计算居中位置
  const drawX = x + (width - drawWidth) / 2 + offset.x;
  const drawY = y + (height - drawHeight) / 2 + offset.y;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

/**
 * 创建并返回一个 Canvas 对象
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @returns {HTMLCanvasElement}
 */
function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * 从文件加载图片
 * @param {File} file - 文件对象
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 从多个文件加载图片
 * @param {FileList|Array} files - 文件列表
 * @returns {Promise<Array<{file: File, img: HTMLImageElement}>>}
 */
async function loadImagesFromFiles(files) {
  const results = [];
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      try {
        const img = await loadImageFromFile(file);
        results.push({ file, img });
      } catch (err) {
        console.warn(`Failed to load image: ${file.name}`, err);
      }
    }
  }
  return results;
}

/**
 * 渲染拼图到 Canvas
 * @param {HTMLCanvasElement} canvas - 目标 Canvas
 * @param {Object} template - 模板对象
 * @param {Array} images - 图片数组
 * @param {number} outputWidth - 输出宽度
 * @param {number} outputHeight - 输出高度
 */
function renderPuzzle(canvas, template, images, outputWidth = 1200, outputHeight = 800) {
  const ctx = canvas.getContext('2d');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // 设置白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  // 边框宽度
  const borderWidth = 8;

  // 绘制每个槽位的图片
  template.slots.forEach((slot, index) => {
    // 计算带边框的区域
    let x = slot.x * outputWidth + borderWidth;
    let y = slot.y * outputHeight + borderWidth;
    let width = slot.w * outputWidth - borderWidth * 2;
    let height = slot.h * outputHeight - borderWidth * 2;

    // 确保不为负数
    width = Math.max(0, width);
    height = Math.max(0, height);

    // 获取对应图片，如果没有则绘制占位符
    const imageData = images[index];
    if (imageData && imageData.img) {
      const offset = imageData.offset || { x: 0, y: 0 };
      const scale = imageData.scale || 1;
      drawImageCover(ctx, imageData.img, x, y, width, height, offset, scale);
    } else {
      // 绘制占位符
      drawPlaceholder(ctx, x, y, width, height, index + 1);
    }
  });
}

/**
 * 计算图片在 cover 模式下的最小缩放比例（刚好填满槽位）
 * 在 drawImageCover 中，图片会先经过 cover 适配，然后 scale=1 时刚好填满
 * 所以 minScale 应该是 1
 * @param {HTMLImageElement} img - 图片对象
 * @param {number} slotWidth - 槽位宽度
 * @param {number} slotHeight - 槽位高度
 * @returns {number} 最小缩放比例
 */
function getMinScale(img, slotWidth, slotHeight) {
  // scale = 1 时，cover 模式刚好填满槽位
  // 所以 minScale = 1
  return 1;
}

/**
 * 绘制占位符
 */
function drawPlaceholder(ctx, x, y, width, height, number) {
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = '#999';
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number.toString(), x + width / 2, y + height / 2);
}

/**
 * 将 Canvas 导出为 PNG
 * @param {HTMLCanvasElement} canvas - Canvas 对象
 * @param {string} filename - 文件名
 */
function exportCanvasAsPNG(canvas, filename = 'puzzle.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * 获取 Canvas 上点击位置对应的槽位索引
 * @param {HTMLCanvasElement} canvas - Canvas 对象
 * @param {Object} template - 模板对象
 * @param {number} clickX - 点击 x 坐标（相对于 canvas）
 * @param {number} clickY - 点击 y 坐标（相对于 canvas）
 * @returns {number|null} 槽位索引，未命中返回 null
 */
function getSlotAtPosition(canvas, template, clickX, clickY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (clickX - rect.left) * scaleX;
  const y = (clickY - rect.top) * scaleY;

  for (let i = 0; i < template.slots.length; i++) {
    const slot = template.slots[i];
    const slotX = slot.x * canvas.width;
    const slotY = slot.y * canvas.height;
    const slotW = slot.w * canvas.width;
    const slotH = slot.h * canvas.height;

    if (x >= slotX && x < slotX + slotW && y >= slotY && y < slotY + slotH) {
      return i;
    }
  }

  return null;
}

// 导出工具函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    drawImageCover,
    createCanvas,
    loadImageFromFile,
    loadImagesFromFiles,
    renderPuzzle,
    exportCanvasAsPNG,
    getSlotAtPosition,
    getMinScale
  };
}
