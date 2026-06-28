// ================================================
//  SUPABASE — YA CONFIGURADO CON TUS DATOS
// ================================================
const SUPABASE_URL = 'https://vseltacxhkdrqfqynrmw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZWx0YWN4aGtkcnFmcXlucm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjQ2MTEsImV4cCI6MjA5ODI0MDYxMX0.hK-IbE52QiV-7DNpCAYF0u1TqYsqI09QOz7a26rTA7M';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================================
//  ESTADO
// ================================================
let isAdmin = false;
let semanasData = [];
let currentSemanaId = null;
let isDarkMode = true;

// ================================================
//  PARTÍCULAS
// ================================================
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function makeParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.5 + 0.1,
    };
  }

  for (let i = 0; i < 120; i++) particles.push(makeParticle());

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = isDarkMode ? '224,49,49' : '180,30,30';
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${p.alpha})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ================================================
//  TEMA
// ================================================
function toggleTheme() {
  isDarkMode = !isDarkMode;
  const body = document.getElementById('body');
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');

  if (isDarkMode) {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    icon.textContent = '☀️';
    label.textContent = 'Claro';
  } else {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    icon.textContent = '🌙';
    label.textContent = 'Oscuro';
  }

  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  showToast(isDarkMode ? '🌑 Modo oscuro activado' : '☀️ Modo claro activado');
}

function loadTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    isDarkMode = false;
    document.getElementById('body').classList.remove('dark-mode');
    document.getElementById('body').classList.add('light-mode');
    document.getElementById('themeIcon').textContent = '🌙';
    document.getElementById('themeLabel').textContent = 'Oscuro';
  }
}

// ================================================
//  LOGIN
// ================================================
async function handleLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  const msg = document.getElementById('loginMsg');

  if (!user || !pass) {
    msg.textContent = 'Por favor completa ambos campos.';
    msg.className = 'login-msg error';
    return;
  }

  msg.textContent = 'Verificando...';
  msg.className = 'login-msg';

  const { data, error } = await db.auth.signInWithPassword({
    email: user,
    password: pass
  });

  if (error) {
    msg.textContent = '❌ Credenciales incorrectas.';
    msg.className = 'login-msg error';
    return;
  }

  isAdmin = true;
  msg.textContent = '✅ ¡Acceso concedido!';
  msg.className = 'login-msg success';
  showToast('✅ Panel de administración activado');

  setTimeout(() => {
    document.getElementById('loginCard').style.display = 'none';
    renderAdminControls();
  }, 1000);

  loadSemanas();
}

function renderAdminControls() {
  const navRight = document.querySelector('.nav-right');
  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.style.color = 'var(--red)';
  btn.textContent = '🔓 Salir';
  btn.onclick = async () => {
    await db.auth.signOut();
    isAdmin = false;
    location.reload();
  };
  navRight.appendChild(btn);
}

// ================================================
//  CARGAR SEMANAS
// ================================================
async function loadSemanas() {
  const grid = document.getElementById('weeksGrid');
  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Cargando semanas...</p></div>`;

  const { data, error } = await db.from('semanas').select('*').order('orden');

  if (error) {
    grid.innerHTML = `<div class="loading-state"><p style="color:var(--red)">Error al cargar datos. Revisa tu conexión a Supabase.</p></div>`;
    console.error(error);
    return;
  }

  semanasData = data;
  updateProgress(data);
  renderWeeks(data);
}

function updateProgress(data) {
  const done = data.filter(s => s.completado).length;
  const total = data.length;
  const pct = Math.round((done / total) * 100);
  document.getElementById('progressFraction').textContent = `${done}/${total}`;
  document.getElementById('progressPct').textContent = `${pct}% completado`;
  document.getElementById('progressBar').style.width = `${pct}%`;
}

function renderWeeks(data) {
  const grid = document.getElementById('weeksGrid');
  grid.innerHTML = '';

  data.forEach((semana, i) => {
    const card = document.createElement('div');
    card.className = 'week-card';
    card.style.animationDelay = `${i * 0.05}s`;

    const statusClass = semana.completado ? 'done' : 'pending';
    const statusText = semana.completado ? '✓ Completado' : '○ Pendiente';

    card.innerHTML = `
      <div class="week-card-top">
        <span class="week-badge">Semana ${semana.numero}</span>
        <label class="toggle-wrap" onclick="event.stopPropagation()">
          <input type="checkbox" class="toggle-input" id="toggle-${semana.id}"
            ${semana.completado ? 'checked' : ''}
            ${isAdmin ? '' : 'disabled'}
            onchange="toggleSemana(${semana.id}, this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <h3 class="week-title">Semana ${semana.numero} — ${semana.titulo}</h3>
      <p class="week-desc">${semana.descripcion}</p>
      <div class="week-card-bottom">
        <span class="status-badge ${statusClass}" id="badge-${semana.id}">${statusText}</span>
        <span class="week-files" id="files-count-${semana.id}">📄 cargando...</span>
        <span class="week-link" onclick="openModal(${semana.id})">Ver archivos →</span>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.toggle-wrap') && !e.target.closest('.week-link')) {
        openModal(semana.id);
      }
    });

    grid.appendChild(card);
    loadFileCount(semana.id);
  });
}

// ================================================
//  TOGGLE SEMANA
// ================================================
async function toggleSemana(id, checked) {
  if (!isAdmin) return;

  const { error } = await db.from('semanas').update({ completado: checked }).eq('id', id);

  if (error) { showToast('❌ Error al actualizar'); return; }

  const sem = semanasData.find(s => s.id === id);
  if (sem) sem.completado = checked;
  updateProgress(semanasData);

  const badge = document.getElementById(`badge-${id}`);
  badge.className = `status-badge ${checked ? 'done' : 'pending'}`;
  badge.textContent = checked ? '✓ Completado' : '○ Pendiente';

  showToast(checked ? '✅ Semana completada' : '⏳ Semana pendiente');
}

// ================================================
//  CONTAR ARCHIVOS
// ================================================
async function loadFileCount(semanaId) {
  const { count } = await db.from('archivos')
    .select('*', { count: 'exact', head: true })
    .eq('semana_id', semanaId);

  const el = document.getElementById(`files-count-${semanaId}`);
  if (el) {
    el.textContent = count > 0 ? `📄 ${count} archivo${count !== 1 ? 's' : ''}` : 'Sin archivos';
  }
}

// ================================================
//  MODAL
// ================================================
async function openModal(semanaId) {
  currentSemanaId = semanaId;
  const semana = semanasData.find(s => s.id === semanaId);
  if (!semana) return;

  document.getElementById('modalBadge').textContent = `Semana ${semana.numero}`;
  document.getElementById('modalTitle').textContent = `Semana ${semana.numero} — ${semana.titulo}`;
  document.getElementById('modalDesc').textContent = semana.descripcion_larga || semana.descripcion;
  document.getElementById('modalFiles').innerHTML = '<div class="loading-state" style="padding:1rem"><div class="spinner"></div></div>';
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  const { data: files, error } = await db.from('archivos').select('*').eq('semana_id', semanaId);
  const container = document.getElementById('modalFiles');

  if (error || !files || files.length === 0) {
    container.innerHTML = `<p class="no-files">Sin archivos por ahora.</p>`;
  } else {
    container.innerHTML = '';
    files.forEach(f => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML = `
        <span class="file-name">📄 ${f.nombre}</span>
        <div class="file-actions">
          <button class="btn-view" onclick="window.open('${f.url}','_blank')">👁 Ver</button>
          <button class="btn-dl" onclick="downloadFile('${f.url}','${f.nombre}')">⬇️ Descargar</button>
        </div>
      `;
      container.appendChild(row);
    });
  }

  if (isAdmin) {
    const uploadEl = document.createElement('div');
    uploadEl.className = 'upload-area admin-visible';
    uploadEl.innerHTML = `
      <input type="file" id="fileUpload" accept=".pdf,.docx,.sql,.txt" style="display:none" onchange="uploadFile(this)"/>
      <button class="btn-login" style="width:auto;padding:8px 20px;font-size:13px" onclick="document.getElementById('fileUpload').click()">
        + Subir archivo
      </button>
      <p>PDF, DOCX, SQL · Max 10MB</p>
    `;
    container.appendChild(uploadEl);
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  currentSemanaId = null;
}

function downloadFile(url, nombre) {
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.target = '_blank';
  a.click();
}

// ================================================
//  SUBIR ARCHIVO
// ================================================
async function uploadFile(input) {
  const file = input.files[0];
  if (!file || !currentSemanaId) return;

  showToast('⏳ Subiendo archivo...');

  const fileName = `semana-${currentSemanaId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await db.storage
    .from('portafolio-archivos')
    .upload(fileName, file);

  if (uploadError) { showToast('❌ Error: ' + uploadError.message); return; }

  const { data: urlData } = db.storage.from('portafolio-archivos').getPublicUrl(fileName);

  const { error: dbError } = await db.from('archivos').insert({
    semana_id: currentSemanaId,
    nombre: file.name,
    url: urlData.publicUrl,
    tipo: file.name.split('.').pop()
  });

  if (dbError) { showToast('❌ Error al registrar'); return; }

  showToast('✅ Archivo subido correctamente');
  loadFileCount(currentSemanaId);
  openModal(currentSemanaId);
}

// ================================================
//  TOAST
// ================================================
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ================================================
//  NAV
// ================================================
function setActiveNav(el) {
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  el.classList.add('active');
}

window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.style.boxShadow = window.scrollY > 30 ? '0 4px 30px rgba(0,0,0,0.3)' : 'none';
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('loginUser').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
  });
});

// ================================================
//  INIT
// ================================================
loadTheme();
loadSemanas();