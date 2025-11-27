#!/usr/bin/env node
/**
 * 版本管理脚本
 * 
 * 使用方法:
 *   node scripts/sync-version.js           # 同步版本到所有文件
 *   node scripts/sync-version.js patch     # 补丁版本 +1 (0.9.2 → 0.9.3)
 *   node scripts/sync-version.js minor     # 次版本 +1 (0.9.2 → 0.10.0)
 *   node scripts/sync-version.js major     # 主版本 +1 (0.9.2 → 1.0.0)
 *   node scripts/sync-version.js 1.0.0     # 直接设置版本号
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const versionFile = path.join(rootDir, 'src', 'version.ts');

// 读取版本号
function getVersion() {
  const content = fs.readFileSync(versionFile, 'utf-8');
  const match = content.match(/VERSION\s*=\s*['"](.+?)['"]/);
  if (!match) {
    throw new Error('无法从 src/version.ts 读取版本号');
  }
  return match[1];
}

// 解析版本号
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`无效的版本号格式: ${version}`);
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
  };
}

// 计算新版本号
function bumpVersion(current, type) {
  const v = parseVersion(current);
  switch (type) {
    case 'major': return `${v.major + 1}.0.0`;
    case 'minor': return `${v.major}.${v.minor + 1}.0`;
    case 'patch': return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      parseVersion(type); // 验证格式
      return type;
  }
}

// 写入新版本到 version.ts
function setVersion(version) {
  let content = fs.readFileSync(versionFile, 'utf-8');
  content = content.replace(/VERSION\s*=\s*['"].+?['"]/, `VERSION = '${version}'`);
  fs.writeFileSync(versionFile, content);
}

// 更新 JSON 文件中的版本
function updateJsonFile(filePath, version) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content);
  const oldVersion = json.version;
  json.version = version;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
  return oldVersion;
}

// 更新 package-lock.json（需要更新根版本和 packages[""] 的版本）
function updatePackageLock(filePath, version) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content);
  const oldVersion = json.version;
  json.version = version;
  if (json.packages && json.packages['']) {
    json.packages[''].version = version;
  }
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
  return oldVersion;
}

// 更新 Cargo.toml 中的版本
function updateCargoToml(filePath, version) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^version\s*=\s*"(.+?)"/m);
  const oldVersion = match ? match[1] : 'unknown';
  content = content.replace(/^version\s*=\s*".+?"/m, `version = "${version}"`);
  fs.writeFileSync(filePath, content);
  return oldVersion;
}

// 更新 Settings.tsx 中的版本显示
function updateSettingsTsx(filePath, version) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否已经使用 VERSION 导入
  if (content.includes("import { VERSION }") || content.includes("import { VERSION,")) {
    console.log('  Settings.tsx 已使用动态版本导入，跳过');
    return null;
  }
  
  // 替换硬编码的版本号
  const versionPattern = /(<p className="text-muted-foreground">)([\d.]+)(<\/p>\s*{\/\* version \*\/}|<\/p>)(\s*<\/div>\s*<div>\s*<p className="font-semibold">\{t\.settings\.techStack\})/;
  
  if (versionPattern.test(content)) {
    const match = content.match(versionPattern);
    const oldVersion = match ? match[2] : 'unknown';
    content = content.replace(versionPattern, `$1{VERSION}$3$4`);
    
    // 添加 VERSION 导入
    if (!content.includes("import { VERSION }")) {
      content = content.replace(
        /^(import .+ from .+;?\n)/m,
        `import { VERSION } from '@/version';\n$1`
      );
    }
    
    fs.writeFileSync(filePath, content);
    return oldVersion;
  }
  
  return null;
}

// 更新 README.md 添加版本徽章
function updateReadme(filePath, version) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否已有版本信息
  const versionBadgePattern = /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-[\d.]+-blue\)/;
  
  if (versionBadgePattern.test(content)) {
    // 更新现有版本徽章
    const match = content.match(/version-([\d.]+)-blue/);
    const oldVersion = match ? match[1] : 'unknown';
    content = content.replace(versionBadgePattern, `![Version](https://img.shields.io/badge/version-${version}-blue)`);
    fs.writeFileSync(filePath, content);
    return oldVersion;
  } else {
    // 在标题后添加版本徽章
    const lines = content.split('\n');
    lines.splice(1, 0, '', `![Version](https://img.shields.io/badge/version-${version}-blue)`);
    fs.writeFileSync(filePath, lines.join('\n'));
    return null;
  }
}

// 主函数
function main() {
  const arg = process.argv[2];
  let version = getVersion();
  
  // 如果有参数，先更新版本号
  if (arg) {
    const newVersion = bumpVersion(version, arg);
    console.log(`📦 版本更新: ${version} → ${newVersion}\n`);
    setVersion(newVersion);
    console.log('✅ 已更新 src/version.ts\n');
    version = newVersion;
  }
  
  console.log('🔄 同步版本信息...\n');
  console.log(`📦 当前版本: ${version}\n`);
  
  const updates = [
    {
      name: 'package.json',
      path: path.join(rootDir, 'package.json'),
      update: updateJsonFile,
    },
    {
      name: 'package-lock.json',
      path: path.join(rootDir, 'package-lock.json'),
      update: updatePackageLock,
    },
    {
      name: 'tauri.conf.json',
      path: path.join(rootDir, 'src-tauri', 'tauri.conf.json'),
      update: updateJsonFile,
    },
    {
      name: 'Cargo.toml',
      path: path.join(rootDir, 'src-tauri', 'Cargo.toml'),
      update: updateCargoToml,
    },
    {
      name: 'Settings.tsx',
      path: path.join(rootDir, 'src', 'pages', 'Settings.tsx'),
      update: updateSettingsTsx,
    },
    {
      name: 'README.md',
      path: path.join(rootDir, 'README.md'),
      update: updateReadme,
    },
  ];
  
  for (const { name, path: filePath, update } of updates) {
    try {
      const oldVersion = update(filePath, version);
      if (oldVersion === null) {
        console.log(`✅ ${name}: 已添加版本 ${version}`);
      } else if (oldVersion === version) {
        console.log(`⏭️  ${name}: 版本已是 ${version}`);
      } else {
        console.log(`✅ ${name}: ${oldVersion} → ${version}`);
      }
    } catch (error) {
      console.error(`❌ ${name}: 更新失败 - ${error.message}`);
    }
  }
  
  console.log('\n✨ 版本同步完成!');
}

main();
