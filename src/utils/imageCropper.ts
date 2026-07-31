import { createIcons, icons } from 'lucide';

interface CropperOptions {
  aspectRatio?: number; // Default 1 (1:1 square/circle)
  outputWidth?: number;  // Default 500
  outputHeight?: number; // Default 500
  title?: string;
  onCrop: (base64: string) => void;
  onCancel?: () => void;
}

/**
 * Abre um modal interativo para cortar, dar zoom e rotacionar uma foto antes de salvar.
 */
export function abrirCropperModal(fileOrUrl: File | string, options: CropperOptions): void {
  const {
    aspectRatio = 1,
    outputWidth = 500,
    outputHeight = 500,
    title = "Ajustar e Cortar Foto",
    onCrop,
    onCancel
  } = options;

  // Carrega a imagem
  const img = new Image();
  img.crossOrigin = 'anonymous';

  const reader = new FileReader();

  if (fileOrUrl instanceof File) {
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(fileOrUrl);
  } else {
    img.src = fileOrUrl;
  }

  img.onload = () => {
    iniciarModalCropper(img, { aspectRatio, outputWidth, outputHeight, title, onCrop, onCancel });
  };

  img.onerror = () => {
    alert("Não foi possível carregar a imagem selecionada para edição.");
    if (onCancel) onCancel();
  };
}

function iniciarModalCropper(
  img: HTMLImageElement,
  opts: CropperOptions & { aspectRatio: number; outputWidth: number; outputHeight: number }
) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'fec-modal-overlay active fec-cropper-overlay';
  modalOverlay.style.zIndex = '16000'; // z-index superior a todos os elementos

  modalOverlay.innerHTML = `
    <div class="fec-modal-box fec-cropper-box">
      <div class="fec-cropper-header">
        <div class="fec-cropper-title">
          <i data-lucide="crop"></i>
          <span>${opts.title}</span>
        </div>
        <button type="button" class="fec-cropper-btn-close" id="btnCropperClose" title="Fechar">
          <i data-lucide="x"></i>
        </button>
      </div>

      <div class="fec-cropper-body">
        <div class="fec-cropper-canvas-container" id="cropperContainer">
          <canvas id="cropperCanvas"></canvas>
          <div class="fec-cropper-mask"></div>
        </div>

        <div class="fec-cropper-toolbar">
          <div class="fec-cropper-slider-group">
            <i data-lucide="zoom-out"></i>
            <input type="range" id="zoomSlider" min="0.5" max="3" step="0.02" value="1">
            <i data-lucide="zoom-in"></i>
          </div>

          <div class="fec-cropper-tools">
            <button type="button" class="fec-cropper-tool-btn" id="btnRotateLeft" title="Girar 90° para esquerda">
              <i data-lucide="rotate-ccw"></i>
            </button>
            <button type="button" class="fec-cropper-tool-btn" id="btnRotateRight" title="Girar 90° para direita">
              <i data-lucide="rotate-cw"></i>
            </button>
            <button type="button" class="fec-cropper-tool-btn" id="btnResetCrop" title="Resetar posição">
              <i data-lucide="refresh-cw"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="fec-cropper-footer">
        <div class="fec-cropper-preview-box">
          <canvas id="cropperPreviewCanvas" width="56" height="56"></canvas>
          <span class="fec-cropper-preview-label">Prévia</span>
        </div>
        <div class="fec-cropper-footer-actions">
          <button type="button" class="btn-modal btn-modal-secondary" id="btnCancelCrop">Cancelar</button>
          <button type="button" class="btn-modal btn-modal-primary" id="btnApplyCrop">
            <i data-lucide="check"></i> Aplicar Foto
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);
  createIcons({ icons, root: modalOverlay });

  // Referências DOM
  const canvas = modalOverlay.querySelector('#cropperCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const container = modalOverlay.querySelector('#cropperContainer') as HTMLElement;
  const zoomSlider = modalOverlay.querySelector('#zoomSlider') as HTMLInputElement;
  const previewCanvas = modalOverlay.querySelector('#cropperPreviewCanvas') as HTMLCanvasElement;
  const previewCtx = previewCanvas.getContext('2d')!;

  // Estados de transformação
  let zoomLevel = 1.0;
  let rotation = 0; // em graus
  let offsetX = 0; // desp. do centro
  let offsetY = 0;

  // Estados de drag
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialOffsetX = 0;
  let initialOffsetY = 0;

  const CROP_RATIO = 0.88; // 88% do canvas representa a máscara circular de corte

  function getCropArea() {
    const size = canvas.width || 300;
    const cropDim = size * CROP_RATIO;
    const cropX = (size - cropDim) / 2;
    const cropY = (size - cropDim) / 2;
    return { cropX, cropY, cropDim };
  }

  function getBaseFitScale(): number {
    const { cropDim } = getCropArea();
    const isRotated90 = (rotation % 180 !== 0);
    const effW = isRotated90 ? img.height : img.width;
    const effH = isRotated90 ? img.width : img.height;

    if (!effW || !effH) return 1;
    // Escala ideal de enquadramento (Cover) na região do círculo
    return Math.max(cropDim / effW, cropDim / effH);
  }

  // Ajusta dimensões do canvas ao container
  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height) || 300;
    canvas.width = size;
    canvas.height = size;
    render();
  }

  // Desenha a imagem no canvas com transformações
  function render() {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    const baseScale = getBaseFitScale();
    const effectiveScale = baseScale * zoomLevel;

    // Centraliza o ponto de origem no meio do canvas
    ctx.translate(w / 2 + offsetX, h / 2 + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(effectiveScale, effectiveScale);

    // Desenha a imagem centralizada na sua dimensão original
    ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);

    ctx.restore();

    // Atualiza preview em tempo real
    updatePreview();
  }

  // Gera prévia circular baseada na região da máscara
  function updatePreview() {
    if (!previewCtx) return;
    const pw = previewCanvas.width;
    const ph = previewCanvas.height;
    const { cropX, cropY, cropDim } = getCropArea();

    previewCtx.clearRect(0, 0, pw, ph);
    previewCtx.save();

    // Máscara circular
    previewCtx.beginPath();
    previewCtx.arc(pw / 2, ph / 2, pw / 2, 0, Math.PI * 2);
    previewCtx.clip();

    // Desenha da área de corte exata do canvas principal para o preview
    previewCtx.drawImage(canvas, cropX, cropY, cropDim, cropDim, 0, 0, pw, ph);
    previewCtx.restore();
  }

  // Inicializa posições padrão e ajuste de escala inteligente
  function initFit() {
    zoomLevel = 1.0;
    zoomSlider.value = "1";
    rotation = 0;
    offsetX = 0;
    offsetY = 0;
    render();
  }

  setTimeout(() => {
    resizeCanvas();
    initFit();
  }, 50);

  // --- EVENTOS DE INTERAÇÃO (DRAG, ZOOM, SLIDER) ---

  // Mouse Drag
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialOffsetX = offsetX;
    initialOffsetY = offsetY;
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    offsetX = initialOffsetX + dx;
    offsetY = initialOffsetY + dy;
    render();
  });

  const stopDrag = () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = 'grab';
    }
  };

  window.addEventListener('mouseup', stopDrag);

  // Touch Drag
  canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    if (touch && e.touches.length === 1) {
      isDragging = true;
      startX = touch.clientX;
      startY = touch.clientY;
      initialOffsetX = offsetX;
      initialOffsetY = offsetY;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    if (!isDragging || !touch || e.touches.length !== 1) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    offsetX = initialOffsetX + dx;
    offsetY = initialOffsetY + dy;
    render();
  }, { passive: true });

  window.addEventListener('touchend', stopDrag);

  // Zoom via Slider
  zoomSlider.addEventListener('input', () => {
    zoomLevel = parseFloat(zoomSlider.value);
    render();
  });

  // Zoom via Roda do Mouse (Wheel)
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    zoomLevel = Math.min(Math.max(0.5, zoomLevel + delta), 3.0);
    zoomSlider.value = zoomLevel.toFixed(2);
    render();
  }, { passive: false });

  // Rotações
  modalOverlay.querySelector('#btnRotateLeft')?.addEventListener('click', () => {
    rotation = (rotation - 90) % 360;
    render();
  });

  modalOverlay.querySelector('#btnRotateRight')?.addEventListener('click', () => {
    rotation = (rotation + 90) % 360;
    render();
  });

  modalOverlay.querySelector('#btnResetCrop')?.addEventListener('click', () => {
    initFit();
  });

  // Fechar / Cancelar
  const fecharModal = () => {
    modalOverlay.remove();
    window.removeEventListener('mouseup', stopDrag);
    window.removeEventListener('touchend', stopDrag);
  };

  modalOverlay.querySelector('#btnCropperClose')?.addEventListener('click', () => {
    fecharModal();
    if (opts.onCancel) opts.onCancel();
  });

  modalOverlay.querySelector('#btnCancelCrop')?.addEventListener('click', () => {
    fecharModal();
    if (opts.onCancel) opts.onCancel();
  });

  // APLICAR CORTE (Gera a imagem final)
  modalOverlay.querySelector('#btnApplyCrop')?.addEventListener('click', () => {
    try {
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = opts.outputWidth;
      outputCanvas.height = opts.outputHeight;

      const outCtx = outputCanvas.getContext('2d');
      if (!outCtx) throw new Error("Falha ao criar contexto de renderização.");

      // Preenche fundo transparente/branco
      outCtx.fillStyle = '#FFFFFF';
      outCtx.fillRect(0, 0, opts.outputWidth, opts.outputHeight);

      // Copia a região circular exata delimitada pela máscara
      const { cropX, cropY, cropDim } = getCropArea();
      outCtx.drawImage(
        canvas,
        cropX, cropY, cropDim, cropDim,
        0, 0, opts.outputWidth, opts.outputHeight
      );

      // Converte para JPEG otimizado
      const resultBase64 = outputCanvas.toDataURL('image/jpeg', 0.88);
      fecharModal();
      opts.onCrop(resultBase64);
    } catch (err: any) {
      alert("Erro ao recortar imagem: " + (err.message || err));
    }
  });
}
