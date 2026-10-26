const express = require('express');
const path = require('node:path');

const categories = ['숙박', '교통', '식비', '쇼핑', '관광', '기타'];
function fail(message) { const error = new Error(message); error.status = 400; throw error; }
function text(value, label, max, optional = false) {
  if (optional && value == null) return '';
  if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max) fail(`${label}을(를) 올바르게 입력해 주세요.`);
  return value.trim();
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') fail('날짜를 확인해 주세요.');
  const parsed = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) fail('날짜를 확인해 주세요.');
  return value;
}
function amount(value = 0) {
  if (value === '') value = 0;
  if (!Number.isSafeInteger(value) || value < 0) fail('금액은 0 이상의 정수여야 해요.');
  return value;
}
function normalize(body, id) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('여행 정보를 확인해 주세요.');
  const startDate = date(body.startDate), endDate = date(body.endDate);
  if (endDate < startDate) fail('종료일은 시작일과 같거나 이후여야 해요.');
  const length = (Date.parse(endDate) - Date.parse(startDate)) / 86400000 + 1;
  // A bounded range also keeps date-tab rendering responsive.
  if (length > 366) fail('여행 기간은 최대 366일로 입력해 주세요.');
  const seen = new Set();
  function entries(list, schedule) {
    if (!Array.isArray(list) || list.length > 5000) fail('일정 또는 비용 목록을 확인해 주세요.');
    return list.map(a => {
      if (!a || typeof a !== 'object') fail('일정 또는 비용 정보를 확인해 주세요.');
      const entryId = a.id == null && !schedule ? 'expense-' + require('node:crypto').randomUUID() : text(a.id, '항목 ID', 100);
      if (!/^[a-zA-Z0-9-]+$/.test(entryId) || seen.has(entryId)) fail('항목 ID가 잘못되었거나 중복되었어요.');
      seen.add(entryId);
      if (!categories.includes(a.category)) fail('비용 카테고리를 확인해 주세요.');
      const result = { id: entryId, name: text(a.name, '항목명', 100), category: a.category, cost: amount(a.cost) };
      if (schedule) {
        result.date = date(a.date);
        if (result.date < startDate || result.date > endDate) fail('여행 기간 밖에 일정이 있어요. 일정 날짜를 먼저 수정해 주세요.');
        if (typeof a.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time)) fail('시작 시간을 확인해 주세요.');
        Object.assign(result, { time: a.time, place: text(a.place, '장소', 200, true), memo: text(a.memo, '메모', 1000, true), icon: '✦' });
      }
      return result;
    });
  }
  const schedules = entries(body.schedules ?? [], true), extraExpenses = entries(body.extraExpenses ?? [], false);
  const spent = [...schedules, ...extraExpenses].reduce((sum,a) => sum + a.cost, 0);
  if (!Number.isSafeInteger(spent)) fail('비용 합계가 처리 가능한 범위를 초과했어요.');
  return { id, name: text(body.name, '여행명', 100), place: text(body.place, '여행지', 100), startDate, endDate, budget: amount(body.budget), schedules, extraExpenses, spent,
    date: startDate.replaceAll('-','.') + ' — ' + endDate.replaceAll('-','.'), days: length === 1 ? '당일치기' : `${length-1}박 ${length}일` };
}
function createApp(options = {}) {
  const app = express();
  const connectionString = options.databaseUrl ?? process.env.DATABASE_URL;
  if (!options.store && !connectionString) throw new Error('DATABASE_URL을 설정해 주세요.');
  const store = options.store ?? require('./postgres-store').createPostgresStore(connectionString);
  app.locals.store = store;
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', (req,res,next) => { res.set('Cache-Control','no-store'); next(); });
  app.get('/api/health', async (req,res) => (await store.ping(), res.json({ status: 'ok', storage: 'postgres' })));
  app.get('/api/trips', async (req,res) => res.json(await store.all()));
  app.get('/api/trips/:id', async (req,res) => {
    const trip = await store.get(req.params.id);
    if (!trip) return res.status(404).json({ error: '여행을 찾을 수 없어요.' });
    res.json(trip);
  });
  app.post('/api/trips', async (req,res) => {
    const id = req.body?.id ?? 'trip-' + require('node:crypto').randomUUID();
    if (typeof id !== 'string' || !/^trip-[a-z0-9-]+$/.test(id)) fail('여행 ID를 확인해 주세요.');
    if (await store.get(id)) return res.status(409).json({ error: '이미 존재하는 여행이에요.' });
    const trip = normalize(req.body, id); await store.save(trip);
    res.status(201).json(trip);
  });
  app.put('/api/trips/:id', async (req,res) => {
    if (!(await store.get(req.params.id))) return res.status(404).json({ error: '여행을 찾을 수 없어요.' });
    const trip = normalize(req.body, req.params.id); await store.save(trip); res.json(trip);
  });
  app.delete('/api/trips/:id', async (req,res) => {
    if (!(await store.get(req.params.id))) return res.status(404).json({ error: '여행을 찾을 수 없어요.' });
    await store.delete(req.params.id); res.sendStatus(204);
  });
  app.use('/api', async (req,res) => res.status(404).json({ error: '존재하지 않는 API예요.' }));
  const root = path.resolve(__dirname, '..');
  app.get('/', async (req,res) => res.sendFile(path.join(root,'index.html')));
  app.get('/index.html', async (req,res) => res.sendFile(path.join(root,'index.html')));
  app.use('/css', express.static(path.join(root,'css')));
  app.use('/js', express.static(path.join(root,'js')));
  app.use(async (req,res) => res.status(404).send('페이지를 찾을 수 없어요.'));
  app.use((error,req,res,next) => {
    const status = error.status || 500;
    res.status(status).json({ error: status === 500 ? '서버 오류가 발생했어요.' : error.type === 'entity.parse.failed' ? 'JSON 형식을 확인해 주세요.' : error.message });
  });
  return app;
}
module.exports = { createApp, normalize };
