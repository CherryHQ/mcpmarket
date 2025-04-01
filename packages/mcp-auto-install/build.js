import { build } from 'esbuild';

build({
  entryPoints: ['src/index.ts'], // 入口文件
  format: 'esm', // 输出为 ES 模块
  target: 'esnext', // 目标 JavaScript 版本
  sourcemap: true, // 生成源映射文件
  bundle: true, // 启用打包
  platform: 'node', // 指定平台为 Node.js
  outbase: 'src', // 保持源文件目录结构
  logLevel: 'info', // 显示编译信息
  outExtension: { '.js': '.js' },
  outdir: 'dist/lib',
})
  .then(() => console.log('Build succeeded'))
  .catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
