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
    const fallback = 'file:./dev.db';
    process.env.DATABASE_URL = fallback;
    console.log(`DATABASE_URL 未設定，使用預設 SQLite (${fallback}) 產生 Prisma Client。`);
  }

  await run('npx', ['prisma', 'generate']);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
