#!/usr/bin/env node

const { spawn } = require('child_process');

async function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env: process.env });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

async function main() {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
    const fallback = 'postgresql://postgres:postgres@localhost:5432/bet?schema=public';
    process.env.DATABASE_URL = fallback;
    console.warn(
      `DATABASE_URL 未設定，暫時使用本機 PostgreSQL 範例連線字串 (${fallback}) 產生 Prisma Client。\n` +
        '請於正式環境設定正確的資料庫連線資訊。'
    );
  }

  await run('npx', ['prisma', 'generate']);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
