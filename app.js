(() => {
  'use strict';

  const MIN_SIZE = 4;
  const MAX_SIZE = 64;
  const HISTORY_LIMIT = 60;
  const PIXEL_SCALE = 24;

  const elements = {
    grid: document.querySelector('#pixel-grid'),
    colourPicker: document.querySelector('#colour-picker'),
    hexInput: document.querySelector('#hex-input'),
    palette: document.querySelector('#palette'),
    addColour: document.querySelector('#add-colour'),
    width: document.querySelector('#grid-width'),
    height: document.querySelector('#grid-height'),
    resize: document.querySelector('#resize-button'),
    gridLines: document.querySelector('#grid-lines'),
    transparent: document.querySelector('#transparent-background'),
    clear: document.querySelector('#clear-button'),
    undo: document.querySelector('#undo-button'),
    redo: document.querySelector('#redo-button'),
    export: document.querySelector('#export-button'),
    dimensionLabel: document.querySelector('#dimension-label'),
    cursorReadout: document.querySelector('#cursor-readout'),
    toast: document.querySelector('#toast'),
    toolButtons: [...document.querySelectorAll('[data-tool]')]
  };

  let columns = 16;
  let rows = 16;
  let pixels = Array(columns * rows).fill(null);
  let cells = [];
  let currentColour = '#f47c5b';
  let activeTool = 'pencil';
  let isDrawing = false;
  let strokeChanged = false;
  let strokeBefore = null;
  let lastPaintedIndex = -1;
  let history = [pixels.slice()];
  let historyIndex = 0;
  let toastTimeout = null;

  function clonePixels(source = pixels) {
    return source.slice();
  }

  function samePixels(a, b) {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => elements.toast.classList.remove('visible'), 2200);
  }

  function updateHistoryButtons() {
    elements.undo.disabled = historyIndex <= 0;
    elements.redo.disabled = historyIndex >= history.length - 1;
  }

  function commitHistory() {
    const snapshot = clonePixels();
    if (samePixels(snapshot, history[historyIndex])) {
      updateHistoryButtons();
      return;
    }
    history = history.slice(0, historyIndex + 1);
    history.push(snapshot);
    if (history.length > HISTORY_LIMIT) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function restoreHistory(index) {
    if (index < 0 || index >= history.length) return;
    historyIndex = index;
    pixels = clonePixels(history[historyIndex]);
    renderPixels();
    updateHistoryButtons();
  }

  function updateDimensions() {
    elements.dimensionLabel.textContent = `${columns} × ${rows} px`;
    elements.width.value = String(columns);
    elements.height.value = String(rows);
    elements.grid.setAttribute('aria-rowcount', String(rows));
    elements.grid.setAttribute('aria-colcount', String(columns));
    elements.grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    elements.grid.style.aspectRatio = `${columns} / ${rows}`;
  }

  function renderPixels() {
    pixels.forEach((colour, index) => {
      const cell = cells[index];
      if (!cell) return;
      cell.style.backgroundColor = colour || 'transparent';
      cell.dataset.colour = colour || '';
    });
  }

  function buildGrid() {
    const fragment = document.createDocumentFragment();
    cells = [];
    pixels.forEach((colour, index) => {
      const cell = document.createElement('div');
      cell.className = 'pixel-cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Pixel ${index % columns + 1}, ${Math.floor(index / columns) + 1}`);
      cell.dataset.index = String(index);
      if (colour) cell.style.backgroundColor = colour;
      cell.dataset.colour = colour || '';
      cells.push(cell);
      fragment.appendChild(cell);
    });
    elements.grid.replaceChildren(fragment);
    elements.grid.classList.toggle('no-grid', !elements.gridLines.checked);
    updateDimensions();
  }

  function updateCell(index) {
    const cell = cells[index];
    if (!cell) return;
    const colour = pixels[index];
    cell.style.backgroundColor = colour || 'transparent';
    cell.dataset.colour = colour || '';
  }

  function setPixel(index, colour) {
    if (index < 0 || index >= pixels.length || pixels[index] === colour) return false;
    pixels[index] = colour;
    updateCell(index);
    strokeChanged = true;
    return true;
  }

  function getCellAtPoint(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY);
    const cell = target?.closest?.('.pixel-cell[data-index]');
    if (!cell || !elements.grid.contains(cell)) return null;
    const index = Number(cell.dataset.index);
    return Number.isInteger(index) ? index : null;
  }

  function beginStroke(index) {
    isDrawing = true;
    strokeChanged = false;
    strokeBefore = clonePixels();
    lastPaintedIndex = -1;
    paintAtIndex(index);
  }

  function paintAtIndex(index) {
    if (index === null || index === lastPaintedIndex) return;
    lastPaintedIndex = index;
    setPixel(index, activeTool === 'eraser' ? null : currentColour);
    const x = index % columns + 1;
    const y = Math.floor(index / columns) + 1;
    elements.cursorReadout.textContent = `PIXEL ${x}, ${y}`;
  }

  function endStroke() {
    if (!isDrawing) return;
    isDrawing = false;
    if (strokeChanged) commitHistory();
    strokeBefore = null;
    lastPaintedIndex = -1;
  }

  function fillFrom(startIndex) {
    const targetColour = pixels[startIndex];
    if (targetColour === currentColour) return false;
    const queue = [startIndex];
    const visited = new Uint8Array(pixels.length);
    let changed = false;
    let cursor = 0;

    while (cursor < queue.length) {
      const index = queue[cursor++];
      if (visited[index]) continue;
      visited[index] = 1;
      if (pixels[index] !== targetColour) continue;
      pixels[index] = currentColour;
      updateCell(index);
      changed = true;
      const x = index % columns;
      const y = Math.floor(index / columns);
      if (x > 0) queue.push(index - 1);
      if (x < columns - 1) queue.push(index + 1);
      if (y > 0) queue.push(index - columns);
      if (y < rows - 1) queue.push(index + columns);
    }
    return changed;
  }

  function pickColour(index) {
    const picked = pixels[index];
    if (!picked) {
      showToast('That pixel is transparent.');
      return;
    }
    setCurrentColour(picked);
    setActiveTool('pencil');
    showToast(`Picked ${picked.toUpperCase()}`);
  }

  function setActiveTool(tool) {
    activeTool = tool;
    elements.toolButtons.forEach((button) => {
      const selected = button.dataset.tool === tool;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const cursors = { pencil: 'crosshair', eraser: 'cell', bucket: 'cell', eyedropper: 'copy' };
    elements.grid.style.cursor = cursors[tool] || 'crosshair';
  }

  function setCurrentColour(colour) {
    currentColour = colour.toLowerCase();
    elements.colourPicker.value = currentColour;
    elements.hexInput.value = currentColour.toUpperCase();
    document.querySelectorAll('.swatch').forEach((swatch) => {
      swatch.classList.toggle('selected', swatch.dataset.colour === currentColour);
    });
  }

  function isValidHex(value) {
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
  }

  function normaliseHex(value) {
    const hex = value.trim();
    if (/^#[0-9a-f]{3}$/i.test(hex)) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
    }
    return hex.toLowerCase();
  }

  function addPaletteColour() {
    const existing = [...elements.palette.querySelectorAll('.swatch')]
      .some((swatch) => swatch.dataset.colour === currentColour);
    if (existing) {
      showToast('That colour is already in your palette.');
      return;
    }
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch selected';
    swatch.dataset.colour = currentColour;
    swatch.style.setProperty('--swatch', currentColour);
    swatch.setAttribute('aria-label', `Saved colour ${currentColour}`);
    elements.palette.querySelectorAll('.swatch').forEach((item) => item.classList.remove('selected'));
    elements.palette.appendChild(swatch);
    setCurrentColour(currentColour);
    showToast('Colour saved to your palette.');
  }

  function clampDimension(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 16;
    return Math.min(MAX_SIZE, Math.max(MIN_SIZE, parsed));
  }

  function resizeCanvas() {
    endStroke();
    const nextColumns = clampDimension(elements.width.value);
    const nextRows = clampDimension(elements.height.value);
    if (nextColumns === columns && nextRows === rows) {
      updateDimensions();
      showToast('Canvas is already that size.');
      return;
    }
    const resized = Array(nextColumns * nextRows).fill(null);
    const copyWidth = Math.min(columns, nextColumns);
    const copyHeight = Math.min(rows, nextRows);
    for (let y = 0; y < copyHeight; y += 1) {
      for (let x = 0; x < copyWidth; x += 1) {
        resized[y * nextColumns + x] = pixels[y * columns + x];
      }
    }
    columns = nextColumns;
    rows = nextRows;
    pixels = resized;
    history = [clonePixels()];
    historyIndex = 0;
    buildGrid();
    updateHistoryButtons();
    showToast(`Canvas resized to ${columns} × ${rows}.`);
  }

  function clearCanvas() {
    if (!pixels.some(Boolean)) {
      showToast('The canvas is already empty.');
      return;
    }
    if (!window.confirm('Clear all pixels from this artwork?')) return;
    pixels = Array(columns * rows).fill(null);
    renderPixels();
    commitHistory();
    showToast('Canvas cleared.');
  }

  function exportPng() {
    const canvas = document.createElement('canvas');
    canvas.width = columns * PIXEL_SCALE;
    canvas.height = rows * PIXEL_SCALE;
    const context = canvas.getContext('2d');
    if (!context) {
      showToast('PNG export is not available in this browser.');
      return;
    }
    context.imageSmoothingEnabled = false;
    if (!elements.transparent.checked) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    pixels.forEach((colour, index) => {
      if (!colour) return;
      context.fillStyle = colour;
      context.fillRect((index % columns) * PIXEL_SCALE, Math.floor(index / columns) * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
    });
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('Could not create the PNG file.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `frenzy-art-${columns}x${rows}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast('Your PNG is ready to go!');
    }, 'image/png');
  }

  elements.grid.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const index = getCellAtPoint(event.clientX, event.clientY);
    if (index === null) return;
    event.preventDefault();
    if (activeTool === 'pencil' || activeTool === 'eraser') {
      beginStroke(index);
    } else if (activeTool === 'bucket') {
      if (fillFrom(index)) commitHistory();
    } else if (activeTool === 'eyedropper') {
      pickColour(index);
    }
  });

  elements.grid.addEventListener('pointermove', (event) => {
    const index = getCellAtPoint(event.clientX, event.clientY);
    if (index !== null) {
      elements.cursorReadout.textContent = `PIXEL ${index % columns + 1}, ${Math.floor(index / columns) + 1}`;
      if (isDrawing) paintAtIndex(index);
    }
  });

  window.addEventListener('pointerup', endStroke);
  window.addEventListener('pointercancel', endStroke);
  elements.grid.addEventListener('pointerleave', () => {
    if (!isDrawing) elements.cursorReadout.textContent = 'Ready to create';
  });

  elements.toolButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveTool(button.dataset.tool));
  });

  elements.colourPicker.addEventListener('input', (event) => setCurrentColour(event.target.value));
  elements.hexInput.addEventListener('change', () => {
    if (!isValidHex(elements.hexInput.value)) {
      elements.hexInput.value = currentColour.toUpperCase();
      showToast('Enter a valid hex colour, such as #F47C5B.');
      return;
    }
    setCurrentColour(normaliseHex(elements.hexInput.value));
  });
  elements.palette.addEventListener('click', (event) => {
    const swatch = event.target.closest('.swatch');
    if (swatch) setCurrentColour(swatch.dataset.colour);
  });
  elements.addColour.addEventListener('click', addPaletteColour);
  elements.resize.addEventListener('click', resizeCanvas);
  elements.width.addEventListener('keydown', (event) => { if (event.key === 'Enter') resizeCanvas(); });
  elements.height.addEventListener('keydown', (event) => { if (event.key === 'Enter') resizeCanvas(); });
  elements.gridLines.addEventListener('change', () => elements.grid.classList.toggle('no-grid', !elements.gridLines.checked));
  elements.clear.addEventListener('click', clearCanvas);
  elements.undo.addEventListener('click', () => restoreHistory(historyIndex - 1));
  elements.redo.addEventListener('click', () => restoreHistory(historyIndex + 1));
  elements.export.addEventListener('click', exportPng);

  window.addEventListener('keydown', (event) => {
    const target = event.target;
    const editing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if (editing) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'z') {
      event.preventDefault();
      restoreHistory(historyIndex + (event.shiftKey ? 1 : -1));
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'y') {
      event.preventDefault();
      restoreHistory(historyIndex + 1);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const shortcuts = { b: 'pencil', e: 'eraser', g: 'bucket', i: 'eyedropper' };
    if (shortcuts[key]) setActiveTool(shortcuts[key]);
  });

  buildGrid();
  setCurrentColour(currentColour);
  setActiveTool('pencil');
  updateHistoryButtons();
})();
