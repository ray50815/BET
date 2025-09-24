#!/usr/bin/env node

const { spawn } = require('child_process');

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        const error = new Error(`${command} ${args.join(' ')} exited with code ${code}`);
        error.exitCode = code;
        reject(error);
      }
    });
    child.on('error', reject);
  });
}

async function main() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());

  if (hasDatabaseUrl) {
    console.log('Running prisma migrate deploy...');
    await run('npx', ['prisma', 'migrate', 'deploy'], { env: process.env });
  } else {
    console.warn(
      'DATABASE_URL 未設定，略過 prisma migrate deploy。若要啟用資料庫功能，請設定環境變數後重新部署。'
    );
  }

  const server = spawn('node', ['.next/standalone/server.js'], {
    stdio: 'inherit',
    env: process.env
  });

  server.on('exit', (code, signal) => {
    if (typeof code === 'number') {
      process.exit(code);
    } else if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(0);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(error.exitCode ?? 1);
});
