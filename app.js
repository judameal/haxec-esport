// ===== API =====
const API = '/api';
let token = sessionStorage.getItem('haxec_token') || '';
let currentUser = null;

const api = async (method, path, body) => {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
};

// ===== STATE =====
let allTeams = [], allPlayers = [], allMatches = [], schedule = [], leagueStarted = false;

// ===== INIT =====
async function init() {
  if (!token) { showAuth(); return; }
  try {
    currentUser = await api('GET', '/me');
    showApp();
    await loadAll();
    navigate('home');
  } catch {
    token = ''; sessionStorage.removeItem('haxec_token');
    showAuth();
  }
}

function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('sidebar-username').textContent = currentUser.username;
  document.getElementById('sidebar-role').textContent = currentUser.role === 'admin' ? '⭐ Admin' : 'Usuario';
  document.getElementById('user-avatar').textContent = currentUser.username[0].toUpperCase();
  // Show admin elements
  document.querySelectorAll('.admin-only').forEach(el => {
    if (currentUser.role === 'admin') el.classList.remove('hidden');
  });
}

async function loadAll() {
  [allTeams, allPlayers, allMatches] = await Promise.all([
    api('GET', '/teams'), api('GET', '/players'), api('GET', '/matches')
  ]);
  const leagueData = await api('GET', '/league/schedule');
  schedule = leagueData.schedule;
  leagueStarted = leagueData.leagueStarted;
}

// ===== AUTH =====
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', (i === 0) === (tab === 'login')));
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

async function login() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const data = await api('POST', '/login', { username, password });
    token = data.token;
    sessionStorage.setItem('haxec_token', token);
    currentUser = { username: data.username, role: data.role, id: data.id };
    showApp();
    await loadAll();
    navigate('home');
  } catch (e) { errEl.textContent = e.message; }
}

async function register() {
  const username = document.getElementById('reg-user').value.trim();
  const password = document.getElementById('reg-pass').value;
  const errEl = document.getElementById('reg-error');
  errEl.textContent = '';
  if (!username || !password) { errEl.textContent = 'Completa todos los campos'; return; }
  try {
    await api('POST', '/register', { username, password });
    toast('Registro exitoso. Inicia sesión.', 'success');
    switchTab('login');
    document.getElementById('login-user').value = username;
  } catch (e) { errEl.textContent = e.message; }
}

async function logout() {
  try { await api('POST', '/logout'); } catch {}
  token = ''; sessionStorage.removeItem('haxec_token');
  currentUser = null;
  showAuth();
}

// ===== NAVIGATION =====
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  closeSidebar();
  renderPage(page);
}

async function renderPage(page) {
  await loadAll();
  switch (page) {
    case 'home': renderHome(); break;
    case 'teams': renderTeams(); break;
    case 'players': renderPlayers(); break;
    case 'league': renderLeague(); break;
    case 'matches': renderMatches(); break;
    case 'stats': renderStats(); break;
    case 'reports': renderReports(); break;
    case 'admin': renderAdmin(); break;
  }
}

// ===== HOME =====
function renderHome() {
  // Stats
  const totalGoals = allPlayers.reduce((a, p) => a + p.goals, 0);
  document.getElementById('home-stats').innerHTML = `
    <div class="stat-card"><div class="stat-val">${allTeams.length}</div><div class="stat-label">Equipos</div></div>
    <div class="stat-card"><div class="stat-val">${allPlayers.length}</div><div class="stat-label">Jugadores</div></div>
    <div class="stat-card"><div class="stat-val">${allMatches.length}</div><div class="stat-label">Partidos</div></div>
    <div class="stat-card"><div class="stat-val">${totalGoals}</div><div class="stat-label">Goles</div></div>
  `;
  // Top scorers
  const top = [...allPlayers].sort((a, b) => b.goals - a.goals).slice(0, 5);
  document.getElementById('home-scorers').innerHTML = top.length ? top.map((p, i) => `
    <div class="top-item">
      <span class="top-rank">${i + 1}</span>
      <span class="top-name">${p.name}<br><small style="color:var(--text2)">${teamName(p.teamId)}</small></span>
      <span class="top-val">${p.goals} ⚽</span>
    </div>
  `).join('') : '<p class="empty-msg" style="color:var(--text3);font-size:13px;">Sin datos aún</p>';

  // Upcoming matches
  const pending = schedule.flatMap(j => j.matches.filter(m => !m.played).map(m => ({ ...m, jornada: j.jornada }))).slice(0, 5);
  document.getElementById('home-fixtures').innerHTML = pending.length ? pending.map(m => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:13px;">
      <span style="font-weight:600">${teamName(m.home)}</span>
      <span style="color:var(--text3);font-size:11px;">J${m.jornada}</span>
      <span style="font-weight:600">${teamName(m.away)}</span>
    </div>
  `).join('') : '<p style="color:var(--text3);font-size:13px;text-align:center;padding:12px;">Sin partidos pendientes</p>';

  // Standings
  renderStandingsTable('home-standings');
}

async function renderStandingsTable(containerId) {
  try {
    const standings = await api('GET', '/league/standings');
    const el = document.getElementById(containerId);
    if (!standings.length) { el.innerHTML = '<p class="empty-msg">Liga no iniciada</p>'; return; }
    el.innerHTML = `<table class="standings">
      <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead>
      <tbody>${standings.map((s, i) => `
        <tr>
          <td><span class="rank-badge rank-${i < 3 ? i + 1 : 'other'}">${i + 1}</span></td>
          <td><div class="team-name-cell">${teamLogoSmall(s.teamId)}${s.teamName}</div></td>
          <td>${s.PJ}</td><td>${s.W}</td><td>${s.D}</td><td>${s.L}</td>
          <td>${s.GF}</td><td>${s.GC}</td><td>${s.DG > 0 ? '+' : ''}${s.DG}</td>
          <td class="pts">${s.Pts}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch { document.getElementById(containerId).innerHTML = '<p class="empty-msg">Error cargando tabla</p>'; }
}

// ===== TEAMS =====
function renderTeams() {
  const grid = document.getElementById('teams-grid');
  if (!allTeams.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏟️</div><div class="empty-msg">No hay equipos registrados</div></div>';
    return;
  }
  grid.innerHTML = allTeams.map(t => `
    <div class="team-card" onclick="viewTeam('${t.id}')">
      <div class="team-logo">${t.logo ? `<img src="${t.logo}" onerror="this.parentElement.textContent='⚽'" />` : '⚽'}</div>
      <div class="team-name">${t.name}</div>
      <div class="team-coach">DT: ${t.coach}</div>
      ${currentUser.role === 'admin' ? `
        <div class="team-admin-actions" onclick="event.stopPropagation()">
          <button class="btn-edit" onclick="openTeamModal('${t.id}')">✏️</button>
          <button class="btn-del" onclick="deleteTeam('${t.id}')">🗑️</button>
        </div>` : ''}
    </div>
  `).join('');
  grid.classList.remove('hidden');
  document.getElementById('team-detail').classList.add('hidden');
}

function viewTeam(teamId) {
  const team = allTeams.find(t => t.id === teamId);
  if (!team) return;
  const players = allPlayers.filter(p => p.teamId === teamId);
  document.getElementById('teams-grid').classList.add('hidden');
  const det = document.getElementById('team-detail');
  det.classList.remove('hidden');
  document.getElementById('team-detail-content').innerHTML = `
    <div class="team-detail-header">
      <div class="team-detail-logo">${team.logo ? `<img src="${team.logo}" onerror="this.textContent='⚽'" />` : '⚽'}</div>
      <div class="team-detail-info">
        <h2>${team.name}</h2>
        <p>Director Técnico: <strong>${team.coach}</strong></p>
        <p style="color:var(--text2);margin-top:4px">${players.length} jugadores</p>
      </div>
    </div>
    <div class="card">
      <h3>Plantilla</h3>
      ${players.length ? `
        <table class="players-table">
          <thead><tr><th>#</th><th>Nombre</th><th>Posición</th><th>Goles</th><th>Asist.</th><th>MVPs</th></tr></thead>
          <tbody>${players.map(p => `
            <tr onclick="viewPlayer('${p.id}')">
              <td style="font-family:'Orbitron',monospace;color:var(--accent)">${p.dorsal}</td>
              <td>${p.name}</td>
              <td><span class="position-badge pos-${p.position}">${p.position}</span></td>
              <td>${p.goals}</td><td>${p.assists}</td><td>${p.mvps}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<p class="empty-msg">Sin jugadores</p>'}
    </div>
  `;
}

function closeTeamDetail() {
  document.getElementById('team-detail').classList.add('hidden');
  document.getElementById('teams-grid').classList.remove('hidden');
}

function openTeamModal(editId = null) {
  document.getElementById('team-edit-id').value = editId || '';
  document.getElementById('team-modal-title').textContent = editId ? 'Editar Equipo' : 'Añadir Equipo';
  if (editId) {
    const t = allTeams.find(t => t.id === editId);
    document.getElementById('team-name').value = t.name;
    document.getElementById('team-logo').value = t.logo || '';
    document.getElementById('team-coach').value = t.coach;
  } else {
    document.getElementById('team-name').value = '';
    document.getElementById('team-logo').value = '';
    document.getElementById('team-coach').value = '';
  }
  document.getElementById('team-error').textContent = '';
  openModal('team-modal');
}

async function saveTeam() {
  const id = document.getElementById('team-edit-id').value;
  const body = {
    name: document.getElementById('team-name').value.trim(),
    logo: document.getElementById('team-logo').value.trim(),
    coach: document.getElementById('team-coach').value.trim()
  };
  try {
    if (id) await api('PUT', `/teams/${id}`, body);
    else await api('POST', '/teams', body);
    closeAllModals();
    await loadAll();
    renderTeams();
    toast(id ? 'Equipo actualizado' : 'Equipo creado', 'success');
  } catch (e) { document.getElementById('team-error').textContent = e.message; }
}

async function deleteTeam(id) {
  if (!confirm('¿Eliminar este equipo?')) return;
  try {
    await api('DELETE', `/teams/${id}`);
    await loadAll(); renderTeams();
    toast('Equipo eliminado', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// ===== PLAYERS =====
function renderPlayers(filtered = null) {
  const list = filtered || allPlayers;
  const el = document.getElementById('players-list');
  document.getElementById('player-detail').classList.add('hidden');
  el.classList.remove('hidden');
  if (!list.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">👤</div><div class="empty-msg">No hay jugadores registrados</div></div>';
    return;
  }
  el.innerHTML = `<table class="players-table">
    <thead><tr><th>#</th><th>Nombre</th><th>Equipo</th><th>Posición</th><th>Goles</th><th>Asist.</th><th>MVPs</th><th>VS</th>${currentUser.role === 'admin' ? '<th></th>' : ''}</tr></thead>
    <tbody>${list.map(p => `
      <tr>
        <td style="font-family:'Orbitron',monospace;color:var(--accent)">${p.dorsal}</td>
        <td onclick="viewPlayer('${p.id}')" style="cursor:pointer;font-weight:600">${p.name}</td>
        <td>${teamName(p.teamId)}</td>
        <td><span class="position-badge pos-${p.position}">${p.position}</span></td>
        <td>${p.goals}</td><td>${p.assists}</td><td>${p.mvps}</td>
        <td>${p.position === 'Portero' ? p.cleanSheets : '-'}</td>
        ${currentUser.role === 'admin' ? `<td><button class="btn-edit" onclick="openPlayerModal('${p.id}')">✏️</button> <button class="btn-del" onclick="deletePlayer('${p.id}')">🗑️</button></td>` : ''}
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function filterPlayers() {
  const q = document.getElementById('player-search').value.toLowerCase();
  const filtered = allPlayers.filter(p => p.name.toLowerCase().includes(q) || teamName(p.teamId).toLowerCase().includes(q));
  renderPlayers(filtered);
}

function viewPlayer(pid) {
  const p = allPlayers.find(pl => pl.id === pid);
  if (!p) return;
  document.getElementById('players-list').classList.add('hidden');
  const det = document.getElementById('player-detail');
  det.classList.remove('hidden');
  document.getElementById('player-detail-content').innerHTML = `
    <div class="player-detail-header card">
      <div class="player-number">${p.dorsal}</div>
      <div>
        <h2 style="font-size:22px">${p.name}</h2>
        <p style="color:var(--text2)">${teamName(p.teamId)}</p>
        <span class="position-badge pos-${p.position}" style="margin-top:8px;display:inline-block">${p.position}</span>
      </div>
    </div>
    <div class="card">
      <h3>Estadísticas</h3>
      <div class="player-stats-grid">
        <div class="pstat"><div class="pstat-val">${p.goals}</div><div class="pstat-label">⚽ Goles</div></div>
        <div class="pstat"><div class="pstat-val">${p.assists}</div><div class="pstat-label">🅰️ Asist.</div></div>
        <div class="pstat"><div class="pstat-val">${p.mvps}</div><div class="pstat-label">⭐ MVPs</div></div>
        <div class="pstat"><div class="pstat-val">${p.cleanSheets}</div><div class="pstat-label">🧤 Vallas</div></div>
        <div class="pstat"><div class="pstat-val" style="color:var(--gold)">${p.yellowCards}</div><div class="pstat-label">🟨 Amarillas</div></div>
        <div class="pstat"><div class="pstat-val" style="color:var(--accent2)">${p.redCards}</div><div class="pstat-label">🟥 Rojas</div></div>
      </div>
    </div>
  `;
}

function closePlayerDetail() {
  document.getElementById('player-detail').classList.add('hidden');
  document.getElementById('players-list').classList.remove('hidden');
}

function openPlayerModal(editId = null) {
  document.getElementById('player-edit-id').value = editId || '';
  document.getElementById('player-modal-title').textContent = editId ? 'Editar Jugador' : 'Añadir Jugador';
  const teamSel = document.getElementById('player-team');
  teamSel.innerHTML = '<option value="">Seleccionar equipo...</option>' + allTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  if (editId) {
    const p = allPlayers.find(p => p.id === editId);
    document.getElementById('player-name').value = p.name;
    document.getElementById('player-dorsal').value = p.dorsal;
    teamSel.value = p.teamId;
    document.getElementById('player-position').value = p.position;
  } else {
    document.getElementById('player-name').value = '';
    document.getElementById('player-dorsal').value = '';
    teamSel.value = '';
    document.getElementById('player-position').value = '';
  }
  document.getElementById('player-error').textContent = '';
  openModal('player-modal');
}

async function savePlayer() {
  const id = document.getElementById('player-edit-id').value;
  const body = {
    name: document.getElementById('player-name').value.trim(),
    dorsal: document.getElementById('player-dorsal').value,
    teamId: document.getElementById('player-team').value,
    position: document.getElementById('player-position').value
  };
  if (!body.teamId) { document.getElementById('player-error').textContent = 'Selecciona un equipo'; return; }
  try {
    if (id) await api('PUT', `/players/${id}`, body);
    else await api('POST', '/players', body);
    closeAllModals(); await loadAll(); renderPlayers();
    toast(id ? 'Jugador actualizado' : 'Jugador creado', 'success');
  } catch (e) { document.getElementById('player-error').textContent = e.message; }
}

async function deletePlayer(id) {
  if (!confirm('¿Eliminar este jugador?')) return;
  try { await api('DELETE', `/players/${id}`); await loadAll(); renderPlayers(); toast('Jugador eliminado', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}

// ===== LEAGUE =====
function renderLeague() {
  const startBtn = document.getElementById('start-league-btn');
  const resetBtn = document.getElementById('reset-league-btn');
  if (currentUser.role === 'admin') {
    startBtn.style.display = leagueStarted ? 'none' : '';
    resetBtn.style.display = leagueStarted ? '' : 'none';
    startBtn.disabled = allTeams.length < 10;
    startBtn.title = allTeams.length < 10 ? `Necesitas ${10 - allTeams.length} equipos más` : '';
  }
  renderStandingsTable('standings-table');
  renderSchedule();
}

function switchLeagueTab(tab) {
  document.querySelectorAll('.ltab').forEach((b, i) => b.classList.toggle('active', (i === 0) === (tab === 'standings')));
  document.getElementById('league-standings-tab').classList.toggle('hidden', tab !== 'standings');
  document.getElementById('league-schedule-tab').classList.toggle('hidden', tab !== 'schedule');
}

function renderSchedule() {
  const el = document.getElementById('schedule-grid');
  if (!schedule.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-msg">La liga no ha iniciado</div></div>'; return; }
  el.innerHTML = schedule.map(j => `
    <div class="jornada-block">
      <div class="jornada-title">JORNADA ${j.jornada}</div>
      ${j.matches.map(m => `
        <div class="schedule-match ${m.played ? 'played' : ''}">
          <span class="schedule-team">${teamName(m.home)}</span>
          <span class="schedule-vs">${m.played ? '✓' : 'VS'}</span>
          <span class="schedule-team away">${teamName(m.away)}</span>
        </div>`).join('')}
    </div>`).join('');
}

async function startLeague() {
  if (allTeams.length < 10) { toast('Necesitas 10 equipos para iniciar la liga', 'error'); return; }
  if (!confirm('¿Iniciar la liga? Se generará el calendario automáticamente.')) return;
  try {
    await api('POST', '/league/start');
    await loadAll(); renderLeague();
    toast('¡Liga iniciada! Calendario generado.', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function resetLeague() {
  if (!confirm('¿Reiniciar la liga? Se perderán todos los partidos y estadísticas.')) return;
  try {
    await api('POST', '/league/reset');
    await loadAll(); renderLeague();
    toast('Liga reiniciada', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// ===== MATCHES =====
function renderMatches() {
  const el = document.getElementById('matches-list');
  if (!allMatches.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🎮</div><div class="empty-msg">No hay partidos registrados</div></div>';
    return;
  }
  const sorted = [...allMatches].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
  el.innerHTML = sorted.map(m => renderMatchCard(m)).join('');
}

function renderMatchCard(m) {
  const home = allTeams.find(t => t.id === m.homeTeamId);
  const away = allTeams.find(t => t.id === m.awayTeamId);
  const goalEvents = (m.scorers || []).map(s => `<span class="event-tag event-goal">⚽ ${playerName(s.playerId)}${s.minute ? " '" + s.minute : ''}</span>`).join('');
  const assistEvents = (m.assists || []).map(a => `<span class="event-tag event-assist">🅰️ ${playerName(a.playerId)}</span>`).join('');
  const yellowEvents = (m.yellowCards || []).map(pid => `<span class="event-tag event-yellow">🟨 ${playerName(pid)}</span>`).join('');
  const redEvents = (m.redCards || []).map(pid => `<span class="event-tag event-red">🟥 ${playerName(pid)}</span>`).join('');
  const mvpEvent = m.mvpId ? `<span class="event-tag event-mvp">⭐ MVP: ${playerName(m.mvpId)}</span>` : '';
  return `
    <div class="match-card">
      <div class="match-header">
        <span class="match-jornada-label">Jornada ${m.jornada}</span>
        <div style="display:flex;gap:8px;align-items:center">
          ${m.recordingUrl ? `<a href="${m.recordingUrl}" target="_blank" style="color:var(--accent);font-size:12px">🎥 Ver</a>` : ''}
          ${currentUser.role === 'admin' ? `<button class="match-delete-btn" onclick="deleteMatch('${m.id}')">🗑️</button>` : ''}
        </div>
      </div>
      <div class="match-score-row">
        <span class="match-team-name home">${home?.name || 'Equipo'}</span>
        <span class="match-score">${m.homeScore} - ${m.awayScore}</span>
        <span class="match-team-name away">${away?.name || 'Equipo'}</span>
      </div>
      <div class="match-events">${goalEvents}${assistEvents}${yellowEvents}${redEvents}${mvpEvent}</div>
      ${m.notes ? `<div class="match-notes-text">📝 ${m.notes}</div>` : ''}
    </div>`;
}

function openMatchModal() {
  if (!leagueStarted) { toast('Inicia la liga primero', 'error'); return; }
  // Populate jornada
  const jornadaSel = document.getElementById('match-jornada');
  jornadaSel.innerHTML = schedule.map(j => `<option value="${j.jornada}">Jornada ${j.jornada}</option>`).join('');
  // Populate teams
  const homeSel = document.getElementById('match-home');
  const awaySel = document.getElementById('match-away');
  const teamOpts = '<option value="">Seleccionar...</option>' + allTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  homeSel.innerHTML = teamOpts;
  awaySel.innerHTML = teamOpts;
  // Reset MVP
  document.getElementById('match-mvp').innerHTML = '<option value="">Sin MVP</option>';
  // Clear dynamic fields
  document.getElementById('scorers-container').innerHTML = '';
  document.getElementById('assists-container').innerHTML = '';
  document.getElementById('yellow-cards-container').innerHTML = '';
  document.getElementById('red-cards-container').innerHTML = '';
  document.getElementById('match-home-score').value = '0';
  document.getElementById('match-away-score').value = '0';
  document.getElementById('match-home-buses').value = '0';
  document.getElementById('match-away-buses').value = '0';
  document.getElementById('match-notes').value = '';
  document.getElementById('match-recording').value = '';
  document.getElementById('match-error').textContent = '';
  openModal('match-modal');
}

function updateMatchPlayers() {
  const homeId = document.getElementById('match-home').value;
  const awayId = document.getElementById('match-away').value;
  const players = allPlayers.filter(p => p.teamId === homeId || p.teamId === awayId);
  const opts = '<option value="">Jugador...</option>' + players.map(p => `<option value="${p.id}">[${teamName(p.teamId)}] ${p.name}</option>`).join('');
  // Update all player selects
  document.querySelectorAll('.player-select').forEach(s => { const v = s.value; s.innerHTML = opts; s.value = v; });
  document.getElementById('match-mvp').innerHTML = '<option value="">Sin MVP</option>' + players.map(p => `<option value="${p.id}">${p.name} (${teamName(p.teamId)})</option>`).join('');
}

function addPlayerRow(containerId, withMinute = false) {
  const homeId = document.getElementById('match-home').value;
  const awayId = document.getElementById('match-away').value;
  const players = allPlayers.filter(p => p.teamId === homeId || p.teamId === awayId);
  const opts = '<option value="">Jugador...</option>' + players.map(p => `<option value="${p.id}">[${teamName(p.teamId)}] ${p.name}</option>`).join('');
  const row = document.createElement('div');
  row.className = 'event-row';
  row.innerHTML = `<select class="player-select">${opts}</select>${withMinute ? `<input type="number" placeholder="Min" min="1" max="120" style="width:70px" />` : ''}<button class="btn-remove-event" onclick="this.parentElement.remove()">✕</button>`;
  document.getElementById(containerId).appendChild(row);
}

function addScorer() { addPlayerRow('scorers-container', true); }
function addAssist() { addPlayerRow('assists-container', false); }
function addYellowCard() { addPlayerRow('yellow-cards-container', false); }
function addRedCard() { addPlayerRow('red-cards-container', false); }

async function saveMatch() {
  const jornada = parseInt(document.getElementById('match-jornada').value);
  const homeTeamId = document.getElementById('match-home').value;
  const awayTeamId = document.getElementById('match-away').value;
  const errEl = document.getElementById('match-error');
  errEl.textContent = '';

  if (!homeTeamId || !awayTeamId) { errEl.textContent = 'Selecciona ambos equipos'; return; }
  if (homeTeamId === awayTeamId) { errEl.textContent = 'El equipo local y visitante no pueden ser el mismo'; return; }

  const scorers = [...document.getElementById('scorers-container').querySelectorAll('.event-row')].map(row => {
    const sel = row.querySelector('select'); const min = row.querySelector('input[type=number]');
    return sel.value ? { playerId: sel.value, minute: min ? parseInt(min.value) || null : null } : null;
  }).filter(Boolean);

  const assists = [...document.getElementById('assists-container').querySelectorAll('.event-row')].map(row => {
    const sel = row.querySelector('select'); return sel.value ? { playerId: sel.value } : null;
  }).filter(Boolean);

  const yellowCards = [...document.getElementById('yellow-cards-container').querySelectorAll('.event-row')].map(row => {
    const sel = row.querySelector('select'); return sel.value || null;
  }).filter(Boolean);

  const redCards = [...document.getElementById('red-cards-container').querySelectorAll('.event-row')].map(row => {
    const sel = row.querySelector('select'); return sel.value || null;
  }).filter(Boolean);

  const body = {
    jornada, homeTeamId, awayTeamId,
    homeScore: parseInt(document.getElementById('match-home-score').value) || 0,
    awayScore: parseInt(document.getElementById('match-away-score').value) || 0,
    scorers, assists, yellowCards, redCards,
    homeBuses: parseInt(document.getElementById('match-home-buses').value) || 0,
    awayBuses: parseInt(document.getElementById('match-away-buses').value) || 0,
    mvpId: document.getElementById('match-mvp').value || null,
    notes: document.getElementById('match-notes').value.trim(),
    recordingUrl: document.getElementById('match-recording').value.trim()
  };

  try {
    await api('POST', '/matches', body);
    closeAllModals(); await loadAll(); renderMatches();
    toast('Partido registrado', 'success');
  } catch (e) { errEl.textContent = e.message; }
}

async function deleteMatch(id) {
  if (!confirm('¿Eliminar este partido y revertir estadísticas?')) return;
  try { await api('DELETE', `/matches/${id}`); await loadAll(); renderMatches(); toast('Partido eliminado', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}

// ===== STATS =====
async function renderStats() {
  renderPlayerStats();
  renderTeamStats();
}

function switchStatTab(tab) {
  document.querySelectorAll('.stab').forEach((b, i) => b.classList.toggle('active', (i === 0) === (tab === 'players')));
  document.getElementById('stats-players-tab').classList.toggle('hidden', tab !== 'players');
  document.getElementById('stats-teams-tab').classList.toggle('hidden', tab !== 'teams');
}

function renderPlayerStats() {
  const categories = [
    { key: 'goals', label: '⚽ Top Goleadores' },
    { key: 'assists', label: '🅰️ Top Asistencias' },
    { key: 'mvps', label: '⭐ Top MVPs' },
    { key: 'cleanSheets', label: '🧤 Top Vallas Invictas' }
  ];
  document.getElementById('player-stats-content').innerHTML = categories.map(cat => {
    const top = [...allPlayers].sort((a, b) => b[cat.key] - a[cat.key]).slice(0, 8).filter(p => p[cat.key] > 0);
    return `<div class="stat-cat">
      <div class="stat-cat-header">${cat.label}</div>
      ${top.length ? top.map((p, i) => `
        <div class="stat-row">
          <span class="stat-pos">${i + 1}</span>
          <span class="stat-name">${p.name}<br><span class="stat-team-sm">${teamName(p.teamId)}</span></span>
          <span class="stat-val-sm">${p[cat.key]}</span>
        </div>`).join('') : '<div style="padding:16px;color:var(--text3);text-align:center;font-size:13px">Sin datos</div>'}
    </div>`;
  }).join('');
}

async function renderTeamStats() {
  try {
    const teamStats = await api('GET', '/stats/teams');
    const categories = [
      { key: 'goals', label: '⚽ Más Goles' },
      { key: 'assists', label: '🅰️ Más Asistencias' },
      { key: 'mvps', label: '⭐ Más MVPs' },
      { key: 'buses', label: '🚌 Más Buses' },
      { key: 'cleanSheets', label: '🧤 Más Vallas Invictas' }
    ];
    document.getElementById('team-stats-content').innerHTML = categories.map(cat => {
      const top = [...teamStats].sort((a, b) => b[cat.key] - a[cat.key]).slice(0, 8);
      return `<div class="stat-cat">
        <div class="stat-cat-header">${cat.label}</div>
        ${top.map((t, i) => `
          <div class="stat-row">
            <span class="stat-pos">${i + 1}</span>
            <span class="stat-name">${t.teamName}</span>
            <span class="stat-val-sm">${t[cat.key]}</span>
          </div>`).join('')}
      </div>`;
    }).join('');
  } catch {}
}

// ===== REPORTS =====
function renderReports() {
  const el = document.getElementById('reports-list');
  if (!allMatches.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-msg">Sin partidos registrados</div></div>'; return; }
  const sorted = [...allMatches].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
  el.innerHTML = sorted.map(m => {
    const home = allTeams.find(t => t.id === m.homeTeamId);
    const away = allTeams.find(t => t.id === m.awayTeamId);
    const date = new Date(m.playedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    return `
    <div class="report-card">
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:11px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Jornada ${m.jornada} · ${date}</div>
          <div style="font-family:'Orbitron',monospace;font-size:16px;font-weight:700">${home?.name || '?'} <span style="color:var(--accent)">${m.homeScore} - ${m.awayScore}</span> ${away?.name || '?'}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${m.recordingUrl ? `<a href="${m.recordingUrl}" target="_blank" class="btn-edit">🎥 Ver Grabación</a>` : ''}
          <button class="btn-edit" onclick="downloadReport('${m.id}')">⬇️ Descargar</button>
        </div>
      </div>
      ${(m.scorers?.length || m.assists?.length || m.mvpId) ? `
      <div class="match-events" style="margin-top:12px">
        ${(m.scorers || []).map(s => `<span class="event-tag event-goal">⚽ ${playerName(s.playerId)}${s.minute ? " '" + s.minute : ''}</span>`).join('')}
        ${(m.assists || []).map(a => `<span class="event-tag event-assist">🅰️ ${playerName(a.playerId)}</span>`).join('')}
        ${m.mvpId ? `<span class="event-tag event-mvp">⭐ MVP: ${playerName(m.mvpId)}</span>` : ''}
        ${(m.yellowCards || []).map(pid => `<span class="event-tag event-yellow">🟨 ${playerName(pid)}</span>`).join('')}
        ${(m.redCards || []).map(pid => `<span class="event-tag event-red">🟥 ${playerName(pid)}</span>`).join('')}
      </div>` : ''}
      ${m.notes ? `<div class="match-notes-text">📝 ${m.notes}</div>` : ''}
    </div>`;
  }).join('');
}

function downloadReport(matchId) {
  const m = allMatches.find(m => m.id === matchId);
  if (!m) return;
  const home = allTeams.find(t => t.id === m.homeTeamId);
  const away = allTeams.find(t => t.id === m.awayTeamId);
  const date = new Date(m.playedAt).toLocaleDateString('es-ES');
  let txt = `HaxEC eSport - Informe de Partido\n`;
  txt += `=================================\n`;
  txt += `Jornada: ${m.jornada}\nFecha: ${date}\n\n`;
  txt += `${home?.name || '?'} ${m.homeScore} - ${m.awayScore} ${away?.name || '?'}\n\n`;
  if (m.scorers?.length) txt += `Goles:\n${m.scorers.map(s => `  - ${playerName(s.playerId)}${s.minute ? " '" + s.minute : ''}`).join('\n')}\n\n`;
  if (m.assists?.length) txt += `Asistencias:\n${m.assists.map(a => `  - ${playerName(a.playerId)}`).join('\n')}\n\n`;
  if (m.mvpId) txt += `MVP: ${playerName(m.mvpId)}\n\n`;
  if (m.notes) txt += `Notas: ${m.notes}\n\n`;
  if (m.recordingUrl) txt += `Grabación: ${m.recordingUrl}\n`;
  txt += `\n© Todos los derechos reservados - Hecho por Judameal`;
  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `partido_j${m.jornada}_${home?.name || 'equipo'}_vs_${away?.name || 'equipo'}.txt`;
  a.click(); URL.revokeObjectURL(url);
}

// ===== ADMIN =====
async function renderAdmin() {
  if (currentUser.role !== 'admin') return;
  try {
    const users = await api('GET', '/users');
    const el = document.getElementById('admin-users-list');
    el.innerHTML = `<table class="users-table">
      <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${users.map(u => `
        <tr>
          <td style="font-weight:600">${u.username}</td>
          <td><span class="role-badge role-${u.role}">${u.role === 'admin' ? '⭐ Admin' : 'Usuario'}</span></td>
          <td>${u.banned ? '<span class="ban-badge">🚫 Baneado</span>' : '<span style="color:var(--green);font-size:12px">✓ Activo</span>'}</td>
          <td>
            ${u.username.toLowerCase() !== 'judameal' ? `
            <div class="admin-actions">
              ${u.role !== 'admin' ? `<button class="btn-sm" style="background:rgba(255,215,0,0.15);color:var(--gold)" onclick="setRole('${u.id}','admin')">⭐ Admin</button>` : ''}
              ${u.role === 'admin' ? `<button class="btn-sm" style="background:rgba(0,212,255,0.1);color:var(--accent)" onclick="setRole('${u.id}','user')">👤 User</button>` : ''}
              ${!u.banned ? `<button class="btn-sm" style="background:rgba(255,165,0,0.15);color:orange" onclick="setBan('${u.id}',true)">🚫 Banear</button>` : `<button class="btn-sm" style="background:rgba(0,255,136,0.1);color:var(--green)" onclick="setBan('${u.id}',false)">✓ Desbanear</button>`}
              <button class="btn-sm" style="background:rgba(255,77,109,0.15);color:var(--accent2)" onclick="deleteUser('${u.id}')">🗑️ Eliminar</button>
            </div>` : '<span style="color:var(--text3);font-size:12px">Protegido</span>'}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch (e) { toast(e.message, 'error'); }
}

async function setRole(id, role) {
  try { await api('PATCH', `/users/${id}/role`, { role }); renderAdmin(); toast('Rol actualizado', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}
async function setBan(id, banned) {
  try { await api('PATCH', `/users/${id}/ban`, { banned }); renderAdmin(); toast(banned ? 'Usuario baneado' : 'Usuario desbaneado', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}
async function deleteUser(id) {
  if (!confirm('¿Eliminar esta cuenta permanentemente?')) return;
  try { await api('DELETE', `/users/${id}`); renderAdmin(); toast('Usuario eliminado', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}

// ===== HELPERS =====
function teamName(id) { return allTeams.find(t => t.id === id)?.name || 'Sin equipo'; }
function playerName(id) { return allPlayers.find(p => p.id === id)?.name || 'Desconocido'; }
function teamLogoSmall(id) {
  const t = allTeams.find(t => t.id === id);
  if (!t || !t.logo) return '';
  return `<img src="${t.logo}" class="mini-logo" onerror="this.remove()" />`;
}

function openModal(id) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
}

function closeAllModals() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = 'toast hidden', 3000);
}

// Start
init();
