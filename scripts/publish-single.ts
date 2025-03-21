import { execSync } from 'node:child_process';
const packageName = process.argv[2]; // 获取命令行参数

if (!packageName) {
  console.error('Please provide a package name');
  process.exit(1);
}

const command = `pnpm --filter ${packageName} exec changeset publish`;
execSync(command, { stdio: 'inherit' });
