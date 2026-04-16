const fs = require('fs');
const path = require('path');

// 读取 package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const projectName = packageJson.name;
const version = packageJson.version;

const libDir = path.join(__dirname, 'lib');
const files = fs.readdirSync(libDir).filter(f => f.endsWith('.js') && !f.endsWith('.min.js'));

// 按照依赖顺序排序：utils.js 首先，index.js 最后
files.sort((a, b) => {
  if (a === 'utils.js') return -1;
  if (b === 'utils.js') return 1;
  if (a === 'index.js') return 1;
  if (b === 'index.js') return -1;
  return a.localeCompare(b);
});

// 读取并合并所有文件
let combinedContent = '';

files.forEach(file => {
  const filePath = path.join(libDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 移除 "use strict"; 和 CommonJS 的 exports 部分，只保留一个
  let processedContent = content
    .replace(/^"use strict";\s*/m, '')
    .replace(/Object\.defineProperty\(exports,\s*"__esModule",\s*\{[^}]*\}\);?\s*/g, '')
    .replace(/exports\.(\w+)\s*=\s*(\w+);/g, '');
  
  combinedContent += processedContent + '\n\n';
});

// 添加入口点
combinedContent = '"use strict";\n' + combinedContent;

// 1. 生成不压缩版本（带版本号）
const unminifiedFileName = `${projectName}.${version}.js`;
const unminifiedPath = path.join(libDir, unminifiedFileName);
fs.writeFileSync(unminifiedPath, combinedContent, 'utf8');

// 2. 生成压缩版本（带版本号）
const minifiedFileName = `${projectName}.${version}.min.js`;
const minifiedPath = path.join(libDir, minifiedFileName);
const minified = minifyCode(combinedContent);
fs.writeFileSync(minifiedPath, minified, 'utf8');

// 3. 保留稳定入口 index.js（不带版本号，便于 main 字段指向）
const entryPath = path.join(libDir, 'index.js');
fs.writeFileSync(entryPath, combinedContent, 'utf8');

console.log(`✓ Build completed successfully!`);
console.log(`  - Unminified: ${unminifiedFileName} (${(fs.statSync(unminifiedPath).size / 1024).toFixed(2)} KB)`);
console.log(`  - Minified:   ${minifiedFileName} (${(fs.statSync(minifiedPath).size / 1024).toFixed(2)} KB)`);
console.log(`  - Entry:      index.js (${(fs.statSync(entryPath).size / 1024).toFixed(2)} KB)`);

/**
 * 简单的代码压缩函数
 * 移除注释、空行和不必要的空格
 */
function minifyCode(code) {
  return code
    // 移除块级注释
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 移除行级注释
    .replace(/\/\/.*$/gm, '')
    // 移除多余的空行
    .replace(/^\s*\n/gm, '')
    // 移除行前的空格
    .replace(/^\s+/gm, '')
    // 移除行尾的空格
    .replace(/\s+$/gm, '')
    // 缩减连续空格为单个空格
    .replace(/\s+/g, ' ')
    // 移除某些符号周围的空格
    .replace(/\s*([{}();:,])\s*/g, '$1');
}

