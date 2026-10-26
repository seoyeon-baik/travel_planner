require('./env').loadEnv();
const { createApp } = require('./app');
async function start() {
  const app = createApp();
  try { await app.locals.store.ready; }
  catch { await app.locals.store.close(); throw new Error('Neon 연결에 실패했습니다. DATABASE_URL을 확인해 주세요.'); }
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Blueway: http://localhost:${port}`);
    console.log('데이터베이스: Neon PostgreSQL');
  });
  server.on('error', async () => { await app.locals.store.close(); console.error('서버 실행 실패: 포트 설정을 확인해 주세요.'); process.exitCode = 1; });
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => {
    server.close(async () => { await app.locals.store.close(); process.exit(0); });
  });
}
start().catch(error => { console.error(error.message); process.exitCode = 1; });
