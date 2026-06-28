// =============================================
//  SUPABASE — CREDENCIALES
// =============================================
const SUPABASE_URL     = 'https://vseltacxhkdrqfqynrmw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZWx0YWN4aGtkcnFmcXlucm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjQ2MTEsImV4cCI6MjA5ODI0MDYxMX0.hK-IbE52QiV-7DNpCAYF0u1TqYsqI09QOz7a26rTA7M';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
//  ESTADO GLOBAL
// =============================================
let isAdmin        = false;
let semanasData    = [];
let currentSemId   = null;
let isDark         = true;

// =============================================
//  PARTÍCULAS DE FONDO
// =============================================
(function () {
  const canvas = document.getElementById('particles-canvas');
  const ctx    = canvas.getContext('2d');
  const parts  = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 130; i++) {
    parts.push({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      r:     Math.random() * 1.6 + 0.3,
      vx:    (Math.random() - 0.5) * 0.18,
      vy:    (Math.random() - 0.5) * 0.18,
      alpha: Math.random() * 0.45 + 0.08,
    });
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rgb = isDark ? '224,49,49' : '160,20,20';
    parts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},${p.alpha})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(loop);
  }
  loop();
})();

// =============================================
//  CAMBIO DE TEMA
// =============================================
function toggleTheme() {
  isDark = !isDark;
  const body  = document.getElementById('body');
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');

  if (isDark) {
    body.classList.replace('light-mode', 'dark-mode');
    icon.textContent  = '☀️';
    label.textContent = 'Claro';
  } else {
    body.classList.replace('dark-mode', 'light-mode');
    icon.textContent  = '🌙';
    label.textContent = 'Oscuro';
  }

  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  showToast(isDark ? '🌑 Modo oscuro activado' : '☀️ Modo claro activado');
}

function applyTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    isDark = false;
    document.getElementById('body').classList.replace('dark-mode', 'light-mode');
    document.getElementById('themeIcon').textContent  = '🌙';
    document.getElementById('themeLabel').textContent = 'Oscuro';
  }
}

// =============================================
//  LOGIN
// =============================================
async function handleLogin() {
  const email = document.getElementById('loginUser').value.trim();
  const pass  = document.getElementById('loginPass').value.trim();
  const msg   = document.getElementById('loginMsg');

  if (!email || !pass) {
    setMsg(msg, 'Completa ambos campos.', 'error');
    return;
  }

  setMsg(msg, 'Verificando...', '');

  const { error } = await db.auth.signInWithPassword({ email, password: pass });

  if (error) {
    setMsg(msg, '❌ Credenciales incorrectas.', 'error');
    return;
  }

  isAdmin = true;
  setMsg(msg, '✅ ¡Acceso concedido!', 'success');
  showToast('✅ Panel de administración activado');

  setTimeout(() => {
    document.getElementById('loginCard').style.display = 'none';
    addLogoutBtn();
    renderWeeks(semanasData); // re-renderizar con toggles habilitados
  }, 900);
}

function setMsg(el, text, cls) {
  el.textContent = text;
  el.className   = cls ? `login-msg ${cls}` : 'login-msg';
}

function addLogoutBtn() {
  const navRight = document.querySelector('.nav-right');
  const btn = document.createElement('button');
  btn.className   = 'theme-toggle';
  btn.style.color = '#e03131';
  btn.textContent = '🔓 Salir';
  btn.onclick     = async () => {
    await db.auth.signOut();
    location.reload();
  };
  navRight.appendChild(btn);
}

// =============================================
//  CARGAR SEMANAS DESDE SUPABASE
// =============================================
async function loadSemanas() {
  const grid = document.getElementById('weeksGrid');
  grid.innerHTML = `
    <div class="loading-box">
      <div class="spinner"></div>
      <p>Cargando semanas...</p>
    </div>`;

  const { data, error } = await db
    .from('semanas')
    .select('*')
    .order('orden');

  if (error) {
    grid.innerHTML = `
      <div class="loading-box">
        <p style="color:var(--red)">⚠️ Error al cargar. Revisa la consola.</p>
      </div>`;
    console.error('Supabase error:', error);
    return;
  }

  semanasData = data;
  updateProgress(data);
  renderWeeks(data);
}

// =============================================
//  BARRA DE PROGRESO
// =============================================
function updateProgress(data) {
  const done  = data.filter(s => s.completado).length;
  const total = data.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('progressFraction').textContent = `${done}/${total}`;
  document.getElementById('progressPct').textContent      = `${pct}% completado`;
  document.getElementById('progressBar').style.width      = `${pct}%`;
}

// =============================================
//  RENDERIZAR TARJETAS
// =============================================
function renderWeeks(data) {
  const grid = document.getElementById('weeksGrid');
  grid.innerHTML = '';

  data.forEach((sem, i) => {
    const card = document.createElement('div');
    card.className = 'week-card';
    card.style.animationDelay = `${i * 0.04}s`;

    const done  = sem.completado;
    const pClass = done ? 'done' : 'pending';
    const pText  = done ? '✓ Completado' : '○ Pendiente';

    card.innerHTML = `
      <div class="card-top">
        <span class="card-week-badge">Semana ${sem.numero}</span>
        <label class="tog-wrap" onclick="event.stopPropagation()">
          <input
            type="checkbox"
            class="tog-input"
            id="tog-${sem.id}"
            ${done   ? 'checked'  : ''}
            ${isAdmin ? ''        : 'disabled'}
            onchange="toggleSemana(${sem.id}, this.checked)"
          />
          <span class="tog-track"></span>
        </label>
      </div>

      <h3 class="card-title">Semana ${sem.numero} — ${sem.titulo}</h3>
      <p  class="card-desc">${sem.descripcion}</p>

      <div class="card-bottom">
        <span class="status-pill ${pClass}" id="pill-${sem.id}">${pText}</span>
        <span class="card-files-count" id="fc-${sem.id}">📄 …</span>
        <span class="card-view-link"   onclick="openModal(${sem.id})">Ver archivos →</span>
      </div>
    `;

    card.addEventListener('click', e => {
      if (!e.target.closest('.tog-wrap') && !e.target.closest('.card-view-link')) {
        openModal(sem.id);
      }
    });

    grid.appendChild(card);
    fetchFileCount(sem.id);
  });
}

// =============================================
//  TOGGLE DE SEMANA (solo admin)
// =============================================
async function toggleSemana(id, checked) {
  if (!isAdmin) return;

  const { error } = await db
    .from('semanas')
    .update({ completado: checked })
    .eq('id', id);

  if (error) { showToast('❌ Error al actualizar'); return; }

  const sem = semanasData.find(s => s.id === id);
  if (sem) sem.completado = checked;

  updateProgress(semanasData);

  const pill = document.getElementById(`pill-${id}`);
  pill.className   = `status-pill ${checked ? 'done' : 'pending'}`;
  pill.textContent = checked ? '✓ Completado' : '○ Pendiente';

  showToast(checked ? '✅ Semana completada' : '⏳ Marcada como pendiente');
}

// =============================================
//  CONTEO DE ARCHIVOS
// =============================================
async function fetchFileCount(semId) {
  const { count } = await db
    .from('archivos')
    .select('*', { count: 'exact', head: true })
    .eq('semana_id', semId);

  const el = document.getElementById(`fc-${semId}`);
  if (el) {
    el.textContent = count > 0
      ? `📄 ${count} archivo${count !== 1 ? 's' : ''}`
      : 'Sin archivos';
  }
}

// =============================================
//  MODAL
// =============================================
async function openModal(semId) {
  currentSemId = semId;
  const sem = semanasData.find(s => s.id === semId);
  if (!sem) return;

  document.getElementById('modalBadge').textContent = `Semana ${sem.numero}`;
  document.getElementById('modalTitle').textContent  = `Semana ${sem.numero} — ${sem.titulo}`;
  document.getElementById('modalDesc').textContent   = sem.descripcion_larga || sem.descripcion;
  document.getElementById('modalFiles').innerHTML    = `
    <div class="loading-box" style="padding:1.2rem">
      <div class="spinner"></div>
    </div>`;

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  const { data: files, error } = await db
    .from('archivos')
    .select('*')
    .eq('semana_id', semId);

  const container = document.getElementById('modalFiles');

  if (error || !files || files.length === 0) {
    container.innerHTML = `<p class="no-files-msg">Sin archivos por ahora.</p>`;
  } else {
    container.innerHTML = '';
    files.forEach(f => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML = `
        <span class="file-name">📄 ${f.nombre}</span>
        <div class="file-btns">
          <button class="btn-ver" onclick="window.open('${f.url}','_blank')">👁 Ver</button>
          <button class="btn-dl"  onclick="dlFile('${f.url}','${f.nombre}')">⬇️ Descargar</button>
        </div>
      `;
      container.appendChild(row);
    });
  }

  // Zona de subida solo para admin
  if (isAdmin) {
    const zone = document.createElement('div');
    zone.className = 'upload-zone visible';
    zone.innerHTML = `
      <input type="file" id="fileInput" accept=".pdf,.docx,.sql,.txt,.xlsx"
        style="display:none" onchange="uploadFile(this)"/>
      <button class="btn-upload" onclick="document.getElementById('fileInput').click()">
        + Subir archivo
      </button>
      <p>PDF · DOCX · SQL · Max 10 MB</p>
    `;
    container.appendChild(zone);
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  currentSemId = null;
}

function dlFile(url, nombre) {
  const a    = document.createElement('a');
  a.href     = url;
  a.download = nombre;
  a.target   = '_blank';
  a.click();
}

// =============================================
//  SUBIR ARCHIVO A SUPABASE STORAGE
// =============================================
async function uploadFile(input) {
  const file = input.files[0];
  if (!file || !currentSemId) return;

  showToast('⏳ Subiendo archivo...');

  const path = `semana-${currentSemId}/${Date.now()}-${file.name}`;

  const { error: upErr } = await db.storage
    .from('portafolio-archivos')
    .upload(path, file);

  if (upErr) { showToast('❌ ' + upErr.message); return; }

  const { data: urlData } = db.storage
    .from('portafolio-archivos')
    .getPublicUrl(path);

  const { error: dbErr } = await db.from('archivos').insert({
    semana_id: currentSemId,
    nombre:    file.name,
    url:       urlData.publicUrl,
    tipo:      file.name.split('.').pop(),
  });

  if (dbErr) { showToast('❌ Error al registrar archivo'); return; }

  showToast('✅ Archivo subido');
  fetchFileCount(currentSemId);
  openModal(currentSemId);
}

// =============================================
//  TOAST
// =============================================
function showToast(msg, ms = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}

// =============================================
//  NAV ACTIVO
// =============================================
function setActiveNav(el) {
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  el.classList.add('active');
}

window.addEventListener('scroll', () => {
  document.getElementById('navbar').style.boxShadow =
    window.scrollY > 20 ? '0 4px 32px rgba(0,0,0,0.35)' : 'none';
});

// =============================================
//  TECLAS RÁPIDAS
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginUser').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
  });
  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
});

// =============================================
//  ARRANQUE
// =============================================
applyTheme();
loadSemanas();
