// ============================================================
//  DATA MODEL
// ============================================================
let mode = 'DFA';
let states = [];      // { id, name, x, y, isStart, isAccept }
let transitions = []; // { id, from, sym, to }
let stateIdCounter = 0;
let transIdCounter = 0;

let tool = 'select';
let connectFrom = null;
let hoveredState = null;
let contextState = null;
let canvas, ctx;

let simActive = false;
let simStep = 0;
let simInput = '';
let simCurrent = null;
let simAutoTimer = null;
let simDone = false;
let activeTransId = null;

const STATE_R = 30;
const ARROW_HEAD = 9;

// ============================================================
//  PAGE NAV
// ============================================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'builder') { setTimeout(() => { resizeCanvas(); render(); }, 50); }
}

// ============================================================
//  INIT
// ============================================================
window.addEventListener('load', () => {
  canvas = document.getElementById('fa-canvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('dblclick', onDblClick);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', onRightClick);
  document.addEventListener('click', () => {
    document.getElementById('ctx-menu').classList.remove('visible');
  });
  render();
});

function resizeCanvas() {
  if (!canvas) return;
  const area = canvas.parentElement;
  canvas.width = area.clientWidth;
  canvas.height = area.clientHeight;
  render();
}

// ============================================================
//  RENDERING
// ============================================================
function render() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gridSize = 40;
  ctx.save();
  ctx.strokeStyle = 'rgba(252,162,1,0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(252,162,1,0.3)';
  for (let x = 0; x < canvas.width; x += gridSize) {
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();

  if (states.length === 0) {
    ctx.fillStyle = 'rgba(139,39,111,0.45)';
    ctx.font = '13px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Double-click to add states  ·  Right-click for options', canvas.width/2, canvas.height/2);
    return;
  }

  transitions.forEach(t => drawTransition(t));

  if (connectFrom !== null && tool === 'connect') {
    const s = getStateById(connectFrom);
    if (s && mousePos) {
      drawArrowLine(s.x, s.y, mousePos.x, mousePos.y, 'rgba(253,126,5,0.4)', '?');
    }
  }

  states.forEach(s => drawState(s));
}

function drawState(s) {
  const isHovered = hoveredState === s.id;
  const isCurrent = isCurrentState(s.id);
  const isStart = s.isStart;
  const isAccept = s.isAccept;

  if (isCurrent) {
    ctx.shadowColor = 'rgba(253,66,25,0.7)';
    ctx.shadowBlur = 22;
  } else if (isStart && !isCurrent) {
    ctx.shadowColor = 'rgba(253,126,5,0.4)';
    ctx.shadowBlur = 12;
  } else if (isAccept && !isCurrent) {
    ctx.shadowColor = 'rgba(252,162,1,0.3)';
    ctx.shadowBlur = 10;
  } else if (isHovered) {
    ctx.shadowColor = 'rgba(183,32,101,0.5)';
    ctx.shadowBlur = 14;
  }

  ctx.beginPath();
  ctx.arc(s.x, s.y, STATE_R, 0, Math.PI*2);

  if (isCurrent) {
    ctx.fillStyle = 'rgba(253,66,25,0.2)';
    ctx.strokeStyle = '#FD4219';
    ctx.lineWidth = 2.5;
  } else if (isHovered) {
    ctx.fillStyle = 'rgba(183,32,101,0.2)';
    ctx.strokeStyle = '#B72065';
    ctx.lineWidth = 1.5;
  } else if (isStart) {
    ctx.fillStyle = 'rgba(253,126,5,0.12)';
    ctx.strokeStyle = '#FD7E05';
    ctx.lineWidth = 1.5;
  } else {
    ctx.fillStyle = 'rgba(139,39,111,0.2)';
    ctx.strokeStyle = '#8B276F';
    ctx.lineWidth = 1.5;
  }
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (isAccept) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, STATE_R - 5, 0, Math.PI*2);
    ctx.strokeStyle = isCurrent ? '#FD4219' : '#FCA201';
    ctx.lineWidth = isCurrent ? 2 : 1.5;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  if (isStart) {
    const ax = s.x - STATE_R - 26;
    drawArrowLine(ax, s.y, s.x - STATE_R, s.y, '#FD7E05', '');
  }

  ctx.fillStyle = isCurrent ? '#ffffff' : (isAccept ? '#FCA201' : (isStart ? '#FD7E05' : '#ffffff'));
  ctx.font = `600 13px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.name, s.x, s.y);

  let badges = [];
  if (s.isStart) badges.push({ txt: 'S', col: '#FD7E05' });
  if (s.isAccept) badges.push({ txt: 'A', col: '#FCA201' });
  badges.forEach((b, i) => {
    const bx = s.x - (badges.length - 1) * 10 + i * 20;
    const by = s.y + STATE_R + 10;
    ctx.fillStyle = b.col;
    ctx.font = `700 8px "Space Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.txt, bx, by);
  });
}

function drawTransition(t) {
  const from = getStateById(t.from);
  const to = getStateById(t.to);
  if (!from || !to) return;

  const isActive = t.id === activeTransId;
  const isEpsilon = t.sym === 'ε';
  let color, lineW;
  if (isActive) { color = '#FD4219'; lineW = 2.2; }
  else if (isEpsilon) { color = '#FCA201'; lineW = 1.3; }
  else { color = '#8B276F'; lineW = 1.3; }

  if (from.id === to.id) {
    // Find other self-loops to offset
    const selfLoops = transitions.filter(tx => tx.from === from.id && tx.to === to.id);
    const idx = selfLoops.findIndex(tx => tx.id === t.id);
    drawSelfLoop(from, t.sym, color, lineW, isActive, idx, selfLoops.length);
    return;
  }

  // Check for reverse transition
  const rev = transitions.find(tx => tx.from === t.to && tx.to === t.from && tx.id !== t.id);
  // Check for parallel transitions (same from/to)
  const parallel = transitions.filter(tx => tx.from === t.from && tx.to === t.to);
  const pIdx = parallel.findIndex(tx => tx.id === t.id);

  if (rev) {
    drawCurvedArrow(from, to, t.sym, color, lineW, isActive, 1, isEpsilon);
  } else if (parallel.length > 1) {
    // Multiple edges: curve them at different offsets
    const offset = (pIdx - (parallel.length - 1) / 2) * 30;
    drawCurvedArrow(from, to, t.sym, color, lineW, isActive, offset / 50, isEpsilon);
  } else {
    drawStraightArrow(from, to, t.sym, color, lineW, isActive, isEpsilon);
  }
}

function drawStraightArrow(from, to, sym, color, lineW, isActive, isEpsilon) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const sx = from.x + Math.cos(angle) * STATE_R;
  const sy = from.y + Math.sin(angle) * STATE_R;
  const ex = to.x - Math.cos(angle) * (STATE_R + 3);
  const ey = to.y - Math.sin(angle) * (STATE_R + 3);

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  if (isEpsilon) ctx.setLineDash([5, 3]);
  else ctx.setLineDash([]);
  if (isActive) { ctx.shadowColor = 'rgba(253,66,25,0.5)'; ctx.shadowBlur = 8; }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.setLineDash([]);

  drawArrowHead(ex, ey, angle, color);

  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const perpX = -Math.sin(angle) * 15;
  const perpY = Math.cos(angle) * 15;
  drawTransLabel(mx + perpX, my + perpY, sym, isActive, isEpsilon);
}

function drawCurvedArrow(from, to, sym, color, lineW, isActive, dir, isEpsilon) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const curve = 48 * dir;
  const mx = (from.x + to.x) / 2 - Math.sin(angle) * curve;
  const my = (from.y + to.y) / 2 + Math.cos(angle) * curve;

  const sx = from.x + Math.cos(angle) * STATE_R;
  const sy = from.y + Math.sin(angle) * STATE_R;
  const endAngle = Math.atan2(to.y - my, to.x - mx);
  const ex = to.x - Math.cos(endAngle) * (STATE_R + 3);
  const ey = to.y - Math.sin(endAngle) * (STATE_R + 3);

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(mx, my, ex, ey);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  if (isEpsilon) ctx.setLineDash([5, 3]);
  else ctx.setLineDash([]);
  if (isActive) { ctx.shadowColor = 'rgba(253,66,25,0.5)'; ctx.shadowBlur = 8; }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.setLineDash([]);
  drawArrowHead(ex, ey, endAngle, color);

  const lx = (sx + ex) / 2 * 0.4 + mx * 0.6;
  const ly = (sy + ey) / 2 * 0.4 + my * 0.6;
  drawTransLabel(lx, ly, sym, isActive, isEpsilon);
}

function drawSelfLoop(s, sym, color, lineW, isActive, idx, total) {
  const loopR = 20;
  // Spread multiple self-loops around the state
  const angles = [-Math.PI/2, Math.PI/2, 0, Math.PI];
  const baseAngle = angles[idx % angles.length] || -Math.PI/2;
  const lx = s.x + Math.cos(baseAngle) * (STATE_R + loopR);
  const ly = s.y + Math.sin(baseAngle) * (STATE_R + loopR);

  ctx.beginPath();
  ctx.arc(lx, ly, loopR, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  if (sym === 'ε') ctx.setLineDash([5, 3]);
  else ctx.setLineDash([]);
  if (isActive) { ctx.shadowColor = 'rgba(253,66,25,0.5)'; ctx.shadowBlur = 8; }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.setLineDash([]);

  // Arrowhead
  const arrowAngle = baseAngle + Math.PI/2 + 0.4;
  const arrowX = lx + Math.cos(baseAngle + Math.PI/2) * loopR;
  const arrowY = ly + Math.sin(baseAngle + Math.PI/2) * loopR;
  drawArrowHead(arrowX, arrowY, arrowAngle, color);

  const labelOffset = 16;
  drawTransLabel(lx + Math.cos(baseAngle) * labelOffset, ly + Math.sin(baseAngle) * labelOffset, sym, isActive, sym === 'ε');
}

function drawArrowHead(x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-ARROW_HEAD, -4.5);
  ctx.lineTo(-ARROW_HEAD, 4.5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawArrowLine(x1, y1, x2, y2, color, label) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([]);
  ctx.stroke();
  const angle = Math.atan2(y2-y1, x2-x1);
  drawArrowHead(x2, y2, angle, color);
}

function drawTransLabel(x, y, sym, isActive, isEpsilon) {
  const pad = 4;
  ctx.font = `700 11px "Space Mono", monospace`;
  const w = ctx.measureText(sym).width + pad*2;
  const h = 16;

  if (isEpsilon) {
    ctx.fillStyle = isActive ? 'rgba(252,162,1,0.2)' : 'rgba(13,0,10,0.9)';
    ctx.strokeStyle = isActive ? '#FCA201' : '#FCA201';
  } else {
    ctx.fillStyle = isActive ? 'rgba(253,66,25,0.15)' : 'rgba(13,0,10,0.9)';
    ctx.strokeStyle = isActive ? '#FD4219' : '#8B276F';
  }
  ctx.lineWidth = 1;
  roundRect(ctx, x - w/2, y - h/2, w, h, 4);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = isEpsilon ? (isActive ? '#FCA201' : '#FCA201') : (isActive ? '#FD4219' : '#C77CBF');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sym, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// ============================================================
//  STATE MANAGEMENT
// ============================================================
function addState(name, x, y) {
  const nm = name || document.getElementById('state-name-input').value.trim() || `q${states.length}`;
  if (states.find(s => s.name === nm)) { logEntry(`State "${nm}" already exists`, 'warn'); return null; }
  const cx = (x !== undefined) ? x : canvas.width/2 + (Math.random()-0.5)*200;
  const cy = (y !== undefined) ? y : canvas.height/2 + (Math.random()-0.5)*150;
  const s = { id: ++stateIdCounter, name: nm, x: cx, y: cy, isStart: states.length === 0, isAccept: false };
  states.push(s);
  document.getElementById('state-name-input').value = '';
  logEntry(`State ${nm} added${s.isStart?' (start)':''}`, 'step');
  updateUI();
  render();
  return s;
}

function removeState(id) {
  const s = getStateById(id);
  if (!s) return;
  const wasStart = s.isStart;
  states = states.filter(st => st.id !== id);
  transitions = transitions.filter(t => t.from !== id && t.to !== id);
  if (wasStart && states.length > 0) states[0].isStart = true;
  logEntry(`State deleted`, 'warn');
  updateUI(); render();
}

function addTransition() {
  const from = parseInt(document.getElementById('trans-from').value);
  const to = parseInt(document.getElementById('trans-to').value);
  const sym = document.getElementById('trans-sym').value.trim();
  if (!sym) { logEntry('Symbol required', 'warn'); return; }
  if (isNaN(from) || isNaN(to)) { logEntry('Select valid states', 'warn'); return; }

  if (mode === 'DFA') {
    const dup = transitions.find(t => t.from === from && t.sym === sym);
    if (dup) {
      logEntry(`DFA: State "${getStateById(from).name}" already has transition on "${sym}" — switch to NFA for multiple edges`, 'warn');
      return;
    }
    if (sym === 'ε') {
      logEntry('DFA cannot have epsilon transitions — switch to NFA mode', 'warn');
      return;
    }
  }

  const t = { id: ++transIdCounter, from, sym, to };
  transitions.push(t);
  document.getElementById('trans-sym').value = '';
  logEntry(`Transition: ${getStateById(from).name} →[${sym}]→ ${getStateById(to).name}`, 'step');
  updateUI(); render();
}

function insertEpsilon() {
  const inp = document.getElementById('trans-sym');
  inp.value = 'ε';
  inp.focus();
}

function clearAll() {
  states = []; transitions = [];
  stateIdCounter = 0; transIdCounter = 0;
  resetSim();
  updateUI(); render();
  logEntry('Cleared all states and transitions', 'warn');
}

// ============================================================
//  UI UPDATES
// ============================================================
function updateUI() {
  updateStateList();
  updateStateSelects();
  updateTransList();
  updateAlphabet();
  updateTransTable();
}

function updateStateList() {
  const el = document.getElementById('state-list');
  el.innerHTML = '';
  states.forEach(s => {
    const div = document.createElement('div');
    div.className = `state-item${s.isStart?' is-start':''}${s.isAccept?' is-accept':''}`;
    div.innerHTML = `
      <div class="state-dot"></div>
      <span class="state-label">${s.name}</span>
      <div class="state-badges">
        ${s.isStart ? '<span class="s-badge s-badge-start">START</span>' : ''}
        ${s.isAccept ? '<span class="s-badge s-badge-accept">ACCEPT</span>' : ''}
      </div>
      <div class="state-actions">
        <button class="state-edit" onclick="event.stopPropagation();renameStateById(${s.id})" title="Rename">✎</button>
        <button class="state-del" onclick="event.stopPropagation();removeState(${s.id})" title="Delete">✕</button>
      </div>
    `;
    div.onclick = (e) => {
      if (e.target.classList.contains('state-del') || e.target.classList.contains('state-edit')) return;
      s.isAccept = !s.isAccept;
      logEntry(`${s.name}: accept = ${s.isAccept}`, '');
      updateUI(); render();
    };
    el.appendChild(div);
  });
}

function renameStateById(id) {
  const s = getStateById(id);
  if (!s) return;
  const nm = prompt('Rename state:', s.name);
  if (nm && nm.trim() && !states.find(x => x.name === nm.trim() && x.id !== s.id)) {
    s.name = nm.trim(); updateUI(); render();
    logEntry(`State renamed to ${s.name}`, '');
  }
}

function updateStateSelects() {
  ['trans-from','trans-to'].forEach(id => {
    const sel = document.getElementById(id);
    const prev = sel.value;
    sel.innerHTML = '';
    states.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.name;
      sel.appendChild(opt);
    });
    if (prev) sel.value = prev;
  });
}

function updateTransList() {
  const el = document.getElementById('trans-list');
  el.innerHTML = '';
  transitions.forEach(t => {
    const from = getStateById(t.from);
    const to = getStateById(t.to);
    if (!from || !to) return;
    const div = document.createElement('div');
    div.className = `trans-item${t.id === activeTransId ? ' active-trans' : ''}`;
    const isEps = t.sym === 'ε';
    div.innerHTML = `
      <span style="color:var(--c-orange);font-family:var(--font-mono);font-size:11px">${from.name}</span>
      <span class="trans-arrow">→</span>
      <span class="trans-sym${isEps ? ' epsilon-sym' : ''}">${t.sym}</span>
      <span class="trans-arrow">→</span>
      <span style="color:var(--c-amber);font-family:var(--font-mono);font-size:11px">${to.name}</span>
      <button class="state-del" style="margin-left:auto;font-size:12px" onclick="removeTrans(${t.id})" title="Delete">✕</button>
    `;
    el.appendChild(div);
  });
}

function updateAlphabet() {
  const syms = [...new Set(transitions.map(t => t.sym))].sort();
  const el = document.getElementById('alphabet-display');
  if (syms.length === 0) {
    el.innerHTML = '<span style="color:var(--text3);font-size:11px;font-family:var(--font-mono)">No symbols defined</span>';
    return;
  }
  el.innerHTML = syms.map(s => `<span class="alph-badge${s==='ε'?' epsilon':''}">${s}</span>`).join('');
}

function updateTransTable() {
  const syms = [...new Set(transitions.map(t => t.sym))].sort();
  const el = document.getElementById('trans-table-area');
  if (states.length === 0 || syms.length === 0) {
    el.innerHTML = '<span style="color:var(--text3);font-size:11px;font-family:var(--font-mono)">Add transitions to see table</span>';
    return;
  }
  let html = '<table class="trans-table"><thead><tr><th>δ</th>';
  syms.forEach(s => html += `<th>${s}</th>`);
  html += '</tr></thead><tbody>';
  states.forEach(s => {
    const rowActive = isCurrentState(s.id);
    html += `<tr class="${rowActive ? 'active-row' : ''}"><td>${s.name}</td>`;
    syms.forEach(sym => {
      const ts = transitions.filter(t => t.from === s.id && t.sym === sym);
      const toNames = ts.map(t => getStateById(t.to)?.name || '?').join(',');
      html += `<td class="${toNames ? 'trans-val' : ''}">${toNames || '—'}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function removeTrans(id) {
  transitions = transitions.filter(t => t.id !== id);
  logEntry('Transition removed', 'warn');
  updateUI(); render();
}

// ============================================================
//  MODE
// ============================================================
function setMode(m) {
  mode = m;
  document.getElementById('mode-dfa').classList.toggle('active-mode', m === 'DFA');
  document.getElementById('mode-nfa').classList.toggle('active-mode', m === 'NFA');
  document.getElementById('nfa-active-area').style.display = m === 'NFA' ? 'block' : 'none';
  resetSim();
  logEntry(`Mode: ${m}`, '');
}

// ============================================================
//  TOOLS
// ============================================================
function setTool(t) {
  tool = t;
  connectFrom = null;
  ['select','move','connect'].forEach(n => {
    document.getElementById(`tool-${n}`).classList.toggle('active', n === t);
  });
  canvas.style.cursor = t === 'select' ? 'default' : t === 'move' ? 'grab' : 'crosshair';
  const hints = {
    select: 'Click state to toggle accept · Double-click canvas to add · Right-click for options',
    move: 'Drag states to reposition',
    connect: 'Click source state, then target state to add transition'
  };
  document.getElementById('canvas-hint').textContent = hints[t];
}

// ============================================================
//  MOUSE EVENTS
// ============================================================
let mousePos = null;
let dragging = null;

function getStateAt(x, y) {
  return states.find(s => Math.hypot(s.x - x, s.y - y) <= STATE_R);
}

function onDblClick(e) {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const s = getStateAt(x, y);
  if (!s) addState(null, x, y);
}

function onMouseDown(e) {
  if (e.button !== 0) return;
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const s = getStateAt(x, y);
  if (s && tool === 'move') {
    dragging = s;
    canvas.style.cursor = 'grabbing';
  }
  if (s && tool === 'connect') {
    if (connectFrom === null) {
      connectFrom = s.id;
      logEntry(`Connect from: ${s.name} — click target state`, '');
    } else {
      const sym = prompt(`Transition symbol from ${getStateById(connectFrom).name} to ${s.name}:\n(Use ε for epsilon transition)`);
      if (sym !== null && sym.trim()) {
        const cleanSym = sym.trim();
        document.getElementById('trans-sym').value = cleanSym;
        document.getElementById('trans-from').value = connectFrom;
        document.getElementById('trans-to').value = s.id;
        addTransition();
        document.getElementById('trans-sym').value = '';
      }
      connectFrom = null;
    }
  }
}

function onMouseMove(e) {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  mousePos = { x, y };
  if (dragging) {
    dragging.x = x; dragging.y = y;
    render(); return;
  }
  const s = getStateAt(x, y);
  const prev = hoveredState;
  hoveredState = s ? s.id : null;
  if (prev !== hoveredState) render();
}

function onMouseUp(e) {
  if (dragging) { dragging = null; canvas.style.cursor = 'grab'; render(); }
}

function onRightClick(e) {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const s = getStateAt(x, y);
  if (!s) return;
  contextState = s.id;
  const menu = document.getElementById('ctx-menu');
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  const ctx_accept = document.getElementById('ctx-accept');
  ctx_accept.innerHTML = `<span class="ci">◎</span> ${s.isAccept ? 'Remove Accept' : 'Set as Accept'}`;
  menu.classList.add('visible');
}

function ctxSetStart() {
  states.forEach(s => s.isStart = s.id === contextState);
  logEntry(`Start state set to ${getStateById(contextState)?.name}`, '');
  updateUI(); render();
}
function ctxToggleAccept() {
  const s = getStateById(contextState);
  if (s) { s.isAccept = !s.isAccept; logEntry(`${s.name} accept: ${s.isAccept}`, ''); updateUI(); render(); }
}
function ctxRename() {
  const s = getStateById(contextState);
  if (!s) return;
  const nm = prompt('Rename state:', s.name);
  if (nm && nm.trim() && !states.find(x => x.name === nm.trim() && x.id !== s.id)) {
    s.name = nm.trim(); updateUI(); render();
    logEntry(`State renamed to ${s.name}`, '');
  }
}
function ctxDelete() { removeState(contextState); }

// ============================================================
//  SIMULATION
// ============================================================
function isCurrentState(id) {
  if (!simActive && simStep === 0 && !simDone) return false;
  if (mode === 'DFA') return simCurrent === id;
  if (mode === 'NFA') return Array.isArray(simCurrent) && simCurrent.includes(id);
  return false;
}

function startSim() {
  resetSim(true);
  simInput = document.getElementById('sim-input').value;
  if (simInput === undefined || simInput === null) { logEntry('Enter an input string', 'warn'); return; }
  const startState = states.find(s => s.isStart);
  if (!startState) { logEntry('No start state defined!', 'warn'); return; }

  simActive = true;
  simStep = 0;
  simDone = false;

  if (mode === 'DFA') {
    simCurrent = startState.id;
  } else {
    simCurrent = epsilonClosure([startState.id]);
  }

  if (simInput.length === 0) {
    // Empty string: finalize immediately
    updateTapeDisplay();
    finalizeSim();
    return;
  }

  updateTapeDisplay();
  updateStepInfo(`Start: ${startState.name}`, 0);
  setSimStatus('running', 'SIMULATING...');
  logEntry(`--- Simulation: "${simInput || 'ε'}" ---`, 'step');
  render();
  updateUI();

  const speed = parseInt(document.getElementById('speed-slider').value);
  simAutoTimer = setInterval(() => stepSim(true), 2100 - speed);
}

function stepSim(auto = false) {
  if (!simActive) {
    if (!auto) startSim();
    return;
  }
  if (simDone) { if (!auto) resetSim(); return; }

  if (simStep >= simInput.length) {
    finalizeSim(); return;
  }

  const sym = simInput[simStep];
  activeTransId = null;

  if (mode === 'DFA') {
    const trans = transitions.find(t => t.from === simCurrent && t.sym === sym);
    if (!trans) {
      logEntry(`No δ(${getStateById(simCurrent)?.name}, '${sym}') → REJECTED`, 'fail');
      setSimStatus('rejected', '✕ REJECTED');
      updateStepInfo(`Dead state: no δ(${getStateById(simCurrent)?.name}, ${sym})`, simStep + 1);
      simDone = true; simActive = false;
      clearInterval(simAutoTimer);
      updateTapeDisplay(simStep, true);
      render(); updateUI(); return;
    }
    const fromName = getStateById(simCurrent)?.name;
    activeTransId = trans.id;
    simCurrent = trans.to;
    const toName = getStateById(simCurrent)?.name;
    logEntry(`δ(${fromName}, '${sym}') = ${toName}`, 'step');
    updateStepInfo(`δ(${fromName}, '${sym}') → ${toName}`, simStep + 1);
  } else {
    const prevStates = [...simCurrent];
    let nextStates = [];
    prevStates.forEach(sid => {
      const matching = transitions.filter(t => t.from === sid && t.sym === sym);
      matching.forEach(t => { nextStates.push(t.to); if (!activeTransId) activeTransId = t.id; });
    });
    nextStates = epsilonClosure([...new Set(nextStates)]);
    const fromNames = prevStates.map(id => getStateById(id)?.name).join(', ');
    const toNames = nextStates.map(id => getStateById(id)?.name).join(', ') || '∅';
    logEntry(`δ({${fromNames}}, '${sym}') = {${toNames}}`, 'step');
    updateStepInfo(`{${fromNames}} ×'${sym}'→ {${toNames}}`, simStep + 1);
    simCurrent = nextStates;
    updateNFADisplay();
  }

  const processedIdx = simStep;
  simStep++;
  updateTapeDisplay(processedIdx);

  if (simStep >= simInput.length) finalizeSim();
  render(); updateUI();
}

function finalizeSim() {
  simDone = true;
  simActive = false;
  clearInterval(simAutoTimer);
  activeTransId = null;

  let accepted = false;
  if (mode === 'DFA') {
    const s = getStateById(simCurrent);
    accepted = s && s.isAccept;
  } else {
    accepted = Array.isArray(simCurrent) && simCurrent.some(id => {
      const s = getStateById(id); return s && s.isAccept;
    });
  }

  if (accepted) {
    setSimStatus('accepted', '✓ ACCEPTED');
    logEntry(`"${simInput || 'ε'}" → ACCEPTED ✓`, 'success');
  } else {
    setSimStatus('rejected', '✕ REJECTED');
    logEntry(`"${simInput || 'ε'}" → REJECTED ✕`, 'fail');
  }
  render(); updateUI();
}

function resetSim(keepInput = false) {
  clearInterval(simAutoTimer);
  simActive = false; simStep = 0; simDone = false;
  simCurrent = null; activeTransId = null;
  if (!keepInput) {
    const startState = states.find(s => s.isStart);
    if (mode === 'NFA') simCurrent = startState ? epsilonClosure([startState.id]) : [];
    else simCurrent = startState ? startState.id : null;
  }
  setSimStatus('idle', 'READY');
  document.getElementById('tape-display').innerHTML = '<span style="color:var(--text3);font-size:12px;font-family:var(--font-mono)">Enter a string to simulate...</span>';
  document.getElementById('step-info').innerHTML = '<span style="color:var(--text3);font-size:11px;font-family:var(--font-mono)">Simulation log will appear here...</span>';
  document.getElementById('nfa-active-display').innerHTML = '';
  render(); updateUI();
}

function epsilonClosure(stateIds) {
  const closure = new Set(stateIds);
  const stack = [...stateIds];
  while (stack.length) {
    const id = stack.pop();
    transitions.filter(t => t.from === id && t.sym === 'ε').forEach(t => {
      if (!closure.has(t.to)) { closure.add(t.to); stack.push(t.to); }
    });
  }
  return [...closure];
}

function updateTapeDisplay(current = -1, dead = false) {
  const el = document.getElementById('tape-display');
  if (simInput === '' || simInput === undefined) {
    el.innerHTML = '<span class="tape-cell" style="font-size:11px;width:36px">ε</span>';
    return;
  }
  if (!simInput) { el.innerHTML = '<span style="color:var(--text3);font-size:12px;font-family:var(--font-mono)">Enter a string to simulate...</span>'; return; }
  el.innerHTML = simInput.split('').map((ch, i) => {
    let cls = 'tape-cell';
    if (dead) {
      cls += i <= current ? ' done' : '';
    } else if (i === current && current >= 0) {
      cls += ' current';
    } else if (i < current) {
      cls += ' done';
    }
    return `<span class="${cls}">${ch}</span>`;
  }).join('');
}

function setSimStatus(type, text) {
  const el = document.getElementById('sim-status');
  el.className = `sim-status ${type}`;
  el.textContent = text;
  const badge = document.getElementById('log-bar-step');
  if (type === 'accepted') { badge.textContent = '✓ ACCEPTED'; badge.className = 'log-bar-step step-accept'; }
  else if (type === 'rejected') { badge.textContent = '✕ REJECTED'; badge.className = 'log-bar-step step-reject'; }
  else if (type === 'running') { badge.className = 'log-bar-step step-active'; }
  else { badge.textContent = 'Ready — run a simulation to see steps'; badge.className = 'log-bar-step'; }
}

function updateStepInfo(text, step) {
  document.getElementById('step-info').innerHTML =
    `<span style="color:var(--text3);font-family:var(--font-mono)">Step ${step}:</span> <span style="color:#fff">${text}</span>`;
  const badge = document.getElementById('log-bar-step');
  badge.textContent = `Step ${step}: ${text}`;
  badge.className = 'log-bar-step step-active';
}

function updateNFADisplay() {
  if (mode !== 'NFA') return;
  const el = document.getElementById('nfa-active-display');
  if (!Array.isArray(simCurrent)) { el.innerHTML = ''; return; }
  el.innerHTML = simCurrent.map(id => {
    const s = getStateById(id);
    return s ? `<span class="nfa-state-pill">${s.name}</span>` : '';
  }).join('');
}

// ============================================================
//  LOG
// ============================================================
function logEntry(text, type = '') {
  const el = document.getElementById('log-bar-entries');
  const div = document.createElement('div');
  div.className = `log-bar-entry ${type ? 'log-' + type : ''}`;
  div.innerHTML = `<span class="le-prefix">›</span><span>${text}</span>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 120) el.removeChild(el.firstChild);
}

// ============================================================
//  HELPERS
// ============================================================
function getStateById(id) { return states.find(s => s.id === id); }

// ============================================================
//  PRESETS
// ============================================================
function loadPreset(name) {
  clearAll();
  const isNFA = name === 'nfa01' || name === 'nfaEpsilon';
  setMode(isNFA ? 'NFA' : 'DFA');

  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2;

  if (name === 'even0s') {
    addState('q0', cx - 130, cy);
    addState('q1', cx + 130, cy);
    states[0].isStart = true; states[0].isAccept = true;
    const q0 = states[0].id, q1 = states[1].id;
    transitions.push({ id: ++transIdCounter, from: q0, sym: '0', to: q1 });
    transitions.push({ id: ++transIdCounter, from: q0, sym: '1', to: q0 });
    transitions.push({ id: ++transIdCounter, from: q1, sym: '0', to: q0 });
    transitions.push({ id: ++transIdCounter, from: q1, sym: '1', to: q1 });
    document.getElementById('sim-input').value = '00110';
    logEntry('Preset: DFA — even 0s. Try: 00110 (accept), 010 (reject)', 'step');

  } else if (name === 'endsWith1') {
    addState('q0', cx - 130, cy);
    addState('q1', cx + 130, cy);
    states[0].isStart = true; states[1].isAccept = true;
    const q0 = states[0].id, q1 = states[1].id;
    transitions.push({ id: ++transIdCounter, from: q0, sym: '0', to: q0 });
    transitions.push({ id: ++transIdCounter, from: q0, sym: '1', to: q1 });
    transitions.push({ id: ++transIdCounter, from: q1, sym: '0', to: q0 });
    transitions.push({ id: ++transIdCounter, from: q1, sym: '1', to: q1 });
    document.getElementById('sim-input').value = '10101';
    logEntry('Preset: DFA — ends with 1. Try: 10101 (accept), 10100 (reject)', 'step');

  } else if (name === 'contains01') {
    addState('q0', cx - 210, cy);
    addState('q1', cx, cy);
    addState('q2', cx + 210, cy);
    states[0].isStart = true; states[2].isAccept = true;
    const [q0,q1,q2] = states.map(s => s.id);
    transitions.push({ id: ++transIdCounter, from: q0, sym: '0', to: q1 });
    transitions.push({ id: ++transIdCounter, from: q0, sym: '1', to: q0 });
    transitions.push({ id: ++transIdCounter, from: q1, sym: '0', to: q1 });
    transitions.push({ id: ++transIdCounter, from: q1, sym: '1', to: q2 });
    transitions.push({ id: ++transIdCounter, from: q2, sym: '0', to: q2 });
    transitions.push({ id: ++transIdCounter, from: q2, sym: '1', to: q2 });
    document.getElementById('sim-input').value = '100110';
    logEntry('Preset: DFA — contains "01". Try: 100110 (accept), 111 (reject)', 'step');

  } else if (name === 'nfa01') {
    // NFA: strings ending with 01 — demonstrates multiple edges from same state
    addState('q0', cx - 200, cy);
    addState('q1', cx, cy);
    addState('q2', cx + 200, cy);
    states[0].isStart = true; states[2].isAccept = true;
    const [q0,q1,q2] = states.map(s => s.id);
    // Multiple transitions from q0 on '0' (the nondeterminism!)
    transitions.push({ id: ++transIdCounter, from: q0, sym: '0', to: q0 });  // stay
    transitions.push({ id: ++transIdCounter, from: q0, sym: '1', to: q0 });  // stay
    transitions.push({ id: ++transIdCounter, from: q0, sym: '0', to: q1 });  // also go to q1 on '0'
    transitions.push({ id: ++transIdCounter, from: q1, sym: '1', to: q2 });  // q1->q2 on 1
    document.getElementById('sim-input').value = '10101';
    logEntry('NFA: ends with "01". q0 has TWO transitions on 0 — nondeterminism!', 'step');
    logEntry('Try: 10101 (accept), 11010 (reject)', 'step');

  } else if (name === 'nfaEpsilon') {
    // ε-NFA accepting (a|ab)*b — a rich example with epsilon transitions and multiple edges
    // States: q0(start), q1, q2, q3, q4(accept)
    // Uses: epsilon transitions + multiple edges from same state
    const r = 175;
    addState('q0', cx - r*1.2, cy);
    addState('q1', cx - r*0.3, cy - r*0.6);
    addState('q2', cx + r*0.5, cy - r*0.6);
    addState('q3', cx - r*0.3, cy + r*0.6);
    addState('q4', cx + r*1.0, cy);

    states[0].isStart = true;
    states[4].isAccept = true;

    const [q0,q1,q2,q3,q4] = states.map(s => s.id);

    // Path 1: a → q1 → (ε back to q0 for repetition) or continue
    transitions.push({ id: ++transIdCounter, from: q0, sym: 'a', to: q1 });
    transitions.push({ id: ++transIdCounter, from: q1, sym: 'ε', to: q0 });  // epsilon: can loop back
    transitions.push({ id: ++transIdCounter, from: q1, sym: 'b', to: q2 });  // ab path
    transitions.push({ id: ++transIdCounter, from: q2, sym: 'ε', to: q0 });  // epsilon: can loop back

    // Path 2: directly to q3 to consume final 'b'
    transitions.push({ id: ++transIdCounter, from: q0, sym: 'ε', to: q3 });  // epsilon shortcut
    transitions.push({ id: ++transIdCounter, from: q3, sym: 'b', to: q4 });  // consume final b → accept

    // Additional: q0 also has 'b' path for just "b"
    transitions.push({ id: ++transIdCounter, from: q0, sym: 'b', to: q4 }); // "b" alone accepted

    document.getElementById('sim-input').value = 'ab';
    logEntry('ε-NFA: (a|ab)*b — rich example with epsilon transitions + multiple edges!', 'step');
    logEntry('ε-transitions shown as dashed amber arrows. Try: b, ab, aab, abb, aabb', 'step');
    logEntry('Epsilon closure is auto-computed during simulation.', '');
  }

  updateUI(); render();
}

// ============================================================
//  KICK OFF
// ============================================================
setMode('DFA');
