const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ===== MongoDB Connection =====
const MONGO_URI = process.env.MONGODB_URI;
let client, db;

async function getDB() {
  if (db) return db;
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  db = client.db('haxec');
  await seedAdmin(db);
  return db;
}

async function seedAdmin(db) {
  const exists = await db.collection('users').findOne({ username_lower: 'judameal' });
  if (!exists) {
    await db.collection('users').insertOne({
      username: 'Judameal',
      username_lower: 'judameal',
      password: hashPassword('admin123'),
      role: 'admin',
      banned: false,
      sessionToken: null,
      sessionDevice: null,
      createdAt: new Date()
    });
  }
}

// ===== Helpers =====
function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ===== Auth Middleware =====
async function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  const db = await getDB();
  const user = await db.collection('users').findOne({ sessionToken: token });
  if (!user || user.banned) return res.status(401).json({ error: 'No autorizado' });
  req.user = user;
  next();
}

async function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admins' });
  next();
}

// ===== AUTH =====
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Datos incompletos' });
    if (username.toLowerCase() === 'judameal') return res.status(400).json({ error: 'Nombre reservado' });
    const db = await getDB();
    const exists = await db.collection('users').findOne({ username_lower: username.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Usuario ya existe' });
    await db.collection('users').insertOne({
      username,
      username_lower: username.toLowerCase(),
      password: hashPassword(password),
      role: 'user',
      banned: false,
      sessionToken: null,
      sessionDevice: null,
      createdAt: new Date()
    });
    res.json({ message: 'Registrado correctamente' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const db = await getDB();
    const user = await db.collection('users').findOne({ username_lower: username.toLowerCase() });
    if (!user || user.password !== hashPassword(password)) return res.status(401).json({ error: 'Credenciales incorrectas' });
    if (user.banned) return res.status(403).json({ error: 'Usuario baneado' });

    // Single device rule for Judameal
    if (user.username_lower === 'judameal' && user.sessionToken && user.sessionDevice && user.sessionDevice !== userAgent) {
      // Force logout previous session - overwrite token
    }

    const token = generateToken();
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { sessionToken: token, sessionDevice: userAgent } }
    );
    res.json({ token, username: user.username, role: user.role, id: user._id.toString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logout', authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    await db.collection('users').updateOne({ _id: req.user._id }, { $set: { sessionToken: null, sessionDevice: null } });
    res.json({ message: 'Sesión cerrada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role, id: req.user._id.toString() });
});

// ===== USERS =====
app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const users = await db.collection('users').find({}).toArray();
    res.json(users.map(u => ({ id: u._id.toString(), username: u.username, role: u.role, banned: u.banned, createdAt: u.createdAt })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.username_lower === 'judameal') return res.status(403).json({ error: 'No se puede modificar a Judameal' });
    await db.collection('users').updateOne({ _id: user._id }, { $set: { role: req.body.role === 'admin' ? 'admin' : 'user' } });
    res.json({ message: 'Rol actualizado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/users/:id/ban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.username_lower === 'judameal') return res.status(403).json({ error: 'No se puede banear a Judameal' });
    const update = { banned: req.body.banned };
    if (req.body.banned) { update.sessionToken = null; update.sessionDevice = null; }
    await db.collection('users').updateOne({ _id: user._id }, { $set: update });
    res.json({ message: 'Estado actualizado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.username_lower === 'judameal') return res.status(403).json({ error: 'No se puede eliminar a Judameal' });
    await db.collection('users').deleteOne({ _id: user._id });
    res.json({ message: 'Usuario eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== TEAMS =====
app.get('/api/teams', authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const teams = await db.collection('teams').find({}).toArray();
    res.json(teams.map(t => ({ ...t, id: t._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/teams', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, logo, coach } = req.body;
    if (!name || !coach) return res.status(400).json({ error: 'Datos incompletos' });
    const db = await getDB();
    const count = await db.collection('teams').countDocuments();
    if (count >= 10) return res.status(400).json({ error: 'Máximo 10 equipos' });
    const exists = await db.collection('teams').findOne({ name_lower: name.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Equipo ya existe' });
    const result = await db.collection('teams').insertOne({ name, name_lower: name.toLowerCase(), logo: logo || '', coach, createdAt: new Date() });
    res.json({ id: result.insertedId.toString(), name, logo, coach });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/teams/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const { name, logo, coach } = req.body;
    if (name) {
      const exists = await db.collection('teams').findOne({ name_lower: name.toLowerCase(), _id: { $ne: new ObjectId(req.params.id) } });
      if (exists) return res.status(400).json({ error: 'Nombre ya existe' });
    }
    const update = {};
    if (name) { update.name = name; update.name_lower = name.toLowerCase(); }
    if (logo !== undefined) update.logo = logo;
    if (coach) update.coach = coach;
    await db.collection('teams').updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
    res.json({ message: 'Equipo actualizado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/teams/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    await db.collection('teams').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Equipo eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== PLAYERS =====
app.get('/api/players', authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const players = await db.collection('players').find({}).toArray();
    res.json(players.map(p => ({ ...p, id: p._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/players', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, dorsal, teamId, position } = req.body;
    if (!name || !dorsal || !teamId || !position) return res.status(400).json({ error: 'Datos incompletos' });
    const validPositions = ['Portero', 'Defensa', 'Mediocampista', 'Delantero'];
    if (!validPositions.includes(position)) return res.status(400).json({ error: 'Posición inválida' });
    const db = await getDB();
    const teamExists = await db.collection('teams').findOne({ _id: new ObjectId(teamId) });
    if (!teamExists) return res.status(400).json({ error: 'Equipo no existe' });
    const result = await db.collection('players').insertOne({
      name, dorsal, teamId, position,
      goals: 0, assists: 0, mvps: 0, cleanSheets: 0,
      yellowCards: 0, redCards: 0, createdAt: new Date()
    });
    res.json({ id: result.insertedId.toString(), name, dorsal, teamId, position, goals: 0, assists: 0, mvps: 0, cleanSheets: 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/players/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const { name, dorsal, teamId, position } = req.body;
    if (teamId) {
      const teamExists = await db.collection('teams').findOne({ _id: new ObjectId(teamId) });
      if (!teamExists) return res.status(400).json({ error: 'Equipo no existe' });
    }
    const update = {};
    if (name) update.name = name;
    if (dorsal) update.dorsal = dorsal;
    if (teamId) update.teamId = teamId;
    if (position) update.position = position;
    await db.collection('players').updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
    res.json({ message: 'Jugador actualizado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/players/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    await db.collection('players').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Jugador eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== LEAGUE =====
function generateSchedule(teams) {
  const n = teams.length;
  const rounds = [];
  const teamIds = teams.map(t => t._id.toString());
  const half = n / 2;
  let arr = [...teamIds];
  const fixed = arr.shift();
  for (let round = 0; round < n - 1; round++) {
    const matches = [];
    matches.push([fixed, arr[0]]);
    for (let i = 1; i < half; i++) matches.push([arr[i], arr[n - 1 - i]]);
    rounds.push({ jornada: round + 1, matches: matches.map(m => ({ home: m[0], away: m[1], played: false })) });
    arr = [arr[arr.length - 1], ...arr.slice(0, arr.length - 1)];
  }
  const returnRounds = rounds.map(r => ({
    jornada: r.jornada + (n - 1),
    matches: r.matches.map(m => ({ home: m.away, away: m.home, played: false }))
  }));
  return [...rounds, ...returnRounds];
}

app.post('/api/league/start', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const teams = await db.collection('teams').find({}).toArray();
    if (teams.length < 10) return res.status(400).json({ error: 'Se necesitan 10 equipos' });
    const config = await db.collection('config').findOne({ key: 'league' });
    if (config?.leagueStarted) return res.status(400).json({ error: 'Liga ya iniciada' });
    const schedule = generateSchedule(teams);
    await db.collection('config').updateOne({ key: 'league' }, { $set: { key: 'league', leagueStarted: true, schedule } }, { upsert: true });
    res.json({ message: 'Liga iniciada', schedule });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/league/schedule', authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const config = await db.collection('config').findOne({ key: 'league' });
    res.json({ schedule: config?.schedule || [], leagueStarted: config?.leagueStarted || false });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/league/standings', authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const teams = await db.collection('teams').find({}).toArray();
    const matches = await db.collection('matches').find({}).toArray();
    const standings = teams.map(team => {
      const tid = team._id.toString();
      const teamMatches = matches.filter(m => m.homeTeamId === tid || m.awayTeamId === tid);
      let W = 0, D = 0, L = 0, GF = 0, GC = 0;
      teamMatches.forEach(m => {
        const isHome = m.homeTeamId === tid;
        const scored = isHome ? m.homeScore : m.awayScore;
        const conceded = isHome ? m.awayScore : m.homeScore;
        GF += scored; GC += conceded;
        if (scored > conceded) W++;
        else if (scored === conceded) D++;
        else L++;
      });
      return { teamId: tid, teamName: team.name, teamLogo: team.logo, PJ: W + D + L, W, D, L, GF, GC, DG: GF - GC, Pts: W * 3 + D };
    });
    standings.sort((a, b) => b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF);
    res.json(standings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/league/reset', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    await db.collection('config').updateOne({ key: 'league' }, { $set: { leagueStarted: false, schedule: [] } }, { upsert: true });
    await db.collection('matches').deleteMany({});
    await db.collection('players').updateMany({}, { $set: { goals: 0, assists: 0, mvps: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 } });
    res.json({ message: 'Liga reiniciada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== MATCHES =====
app.get('/api/matches', authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const matches = await db.collection('matches').find({}).sort({ playedAt: -1 }).toArray();
    res.json(matches.map(m => ({ ...m, id: m._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/matches', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { jornada, homeTeamId, awayTeamId, homeScore, awayScore, scorers, assists, yellowCards, redCards, homeBuses, awayBuses, mvpId, notes, recordingUrl } = req.body;
    const db = await getDB();

    const homeTeam = await db.collection('teams').findOne({ _id: new ObjectId(homeTeamId) });
    const awayTeam = await db.collection('teams').findOne({ _id: new ObjectId(awayTeamId) });
    if (!homeTeam || !awayTeam) return res.status(400).json({ error: 'Equipos inválidos' });

    const existing = await db.collection('matches').findOne({
      jornada,
      $or: [
        { homeTeamId, awayTeamId },
        { homeTeamId: awayTeamId, awayTeamId: homeTeamId }
      ]
    });
    if (existing) return res.status(400).json({ error: 'Partido ya jugado en esta jornada' });

    const result = await db.collection('matches').insertOne({
      jornada, homeTeamId, awayTeamId,
      homeScore: parseInt(homeScore) || 0,
      awayScore: parseInt(awayScore) || 0,
      scorers: scorers || [], assists: assists || [],
      yellowCards: yellowCards || [], redCards: redCards || [],
      homeBuses: homeBuses || 0, awayBuses: awayBuses || 0,
      mvpId: mvpId || null, notes: notes || '', recordingUrl: recordingUrl || '',
      playedAt: new Date()
    });

    // Update player stats
    const bulkOps = [];
    for (const s of (scorers || [])) {
      bulkOps.push({ updateOne: { filter: { _id: new ObjectId(s.playerId) }, update: { $inc: { goals: 1 } } } });
    }
    for (const a of (assists || [])) {
      bulkOps.push({ updateOne: { filter: { _id: new ObjectId(a.playerId) }, update: { $inc: { assists: 1 } } } });
    }
    if (mvpId) bulkOps.push({ updateOne: { filter: { _id: new ObjectId(mvpId) }, update: { $inc: { mvps: 1 } } } });
    for (const pid of (yellowCards || [])) {
      bulkOps.push({ updateOne: { filter: { _id: new ObjectId(pid) }, update: { $inc: { yellowCards: 1 } } } });
    }
    for (const pid of (redCards || [])) {
      bulkOps.push({ updateOne: { filter: { _id: new ObjectId(pid) }, update: { $inc: { redCards: 1 } } } });
    }
    // Clean sheets
    if (parseInt(awayScore) === 0) {
      bulkOps.push({ updateMany: { filter: { teamId: homeTeamId, position: 'Portero' }, update: { $inc: { cleanSheets: 1 } } } });
    }
    if (parseInt(homeScore) === 0) {
      bulkOps.push({ updateMany: { filter: { teamId: awayTeamId, position: 'Portero' }, update: { $inc: { cleanSheets: 1 } } } });
    }
    if (bulkOps.length) await db.collection('players').bulkWrite(bulkOps);

    // Mark schedule played
    await db.collection('config').updateOne(
      { key: 'league', 'schedule.jornada': jornada },
      { $set: { 'schedule.$[j].matches.$[m].played': true } },
      { arrayFilters: [{ 'j.jornada': jornada }, { $or: [{ 'm.home': homeTeamId, 'm.away': awayTeamId }, { 'm.home': awayTeamId, 'm.away': homeTeamId }] }] }
    );

    res.json({ id: result.insertedId.toString(), message: 'Partido registrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/matches/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const match = await db.collection('matches').findOne({ _id: new ObjectId(req.params.id) });
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

    const bulkOps = [];
    for (const s of (match.scorers || [])) bulkOps.push({ updateOne: { filter: { _id: new ObjectId(s.playerId) }, update: { $inc: { goals: -1 } } } });
    for (const a of (match.assists || [])) bulkOps.push({ updateOne: { filter: { _id: new ObjectId(a.playerId) }, update: { $inc: { assists: -1 } } } });
    if (match.mvpId) bulkOps.push({ updateOne: { filter: { _id: new ObjectId(match.mvpId) }, update: { $inc: { mvps: -1 } } } });
    if (bulkOps.length) await db.collection('players').bulkWrite(bulkOps);

    await db.collection('matches').deleteOne({ _id: match._id });
    res.json({ message: 'Partido eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== STATS =====
app.get('/api/stats/teams', authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const teams = await db.collection('teams').find({}).toArray();
    const matches = await db.collection('matches').find({}).toArray();
    const players = await db.collection('players').find({}).toArray();
    const teamStats = teams.map(team => {
      const tid = team._id.toString();
      const teamMatches = matches.filter(m => m.homeTeamId === tid || m.awayTeamId === tid);
      let goals = 0, buses = 0, cleanSheets = 0;
      teamMatches.forEach(m => {
        const isHome = m.homeTeamId === tid;
        goals += isHome ? m.homeScore : m.awayScore;
        buses += isHome ? (m.homeBuses || 0) : (m.awayBuses || 0);
        if ((isHome && m.awayScore === 0) || (!isHome && m.homeScore === 0)) cleanSheets++;
      });
      const teamPlayers = players.filter(p => p.teamId === tid);
      const assists = teamPlayers.reduce((a, p) => a + p.assists, 0);
      const mvps = teamPlayers.reduce((a, p) => a + p.mvps, 0);
      return { teamId: tid, teamName: team.name, teamLogo: team.logo, goals, assists, mvps, buses, cleanSheets };
    });
    res.json(teamStats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== Serve frontend =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HaxEC corriendo en http://localhost:${PORT}`));

module.exports = app;
