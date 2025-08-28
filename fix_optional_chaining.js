#!/usr/bin/env node
/**
 * Script to fix Babel v6 compatibility issues in HTML files with inline Babel scripts
 * Fixes:
 * - Optional chaining operators (`?.`) with equivalent conditional checks
 * - React Fragment shorthand syntax (`<>`) with explicit <React.Fragment>
 */

const fs = require('fs');
const path = require('path');

function fixOptionalChaining(content) {
  // Pattern 1: wsRef.current?.readyState
  // Replace: obj?.prop with (obj && obj.prop)
  content = content.replace(
    /wsRef\.current\?\.readyState/g,
    '(wsRef.current && wsRef.current.readyState)'
  );

  // Pattern 2: item.target?.x and item.target?.z  
  // Replace: obj?.prop with (obj && obj.prop)
  content = content.replace(
    /item\.target\?\.([xz])/g,
    '(item.target && item.target.$1)'
  );

  // Generic pattern for other potential optional chaining cases
  // This is more aggressive and handles: object?.property
  content = content.replace(
    /(\w+(?:\.\w+)*)\?\.(\w+)/g,
    '($1 && $1.$2)'
  );

  return content;
}

function fixReactFragments(content) {
  // Replace React Fragment shorthand <> with <React.Fragment>
  content = content.replace(/<>/g, '<React.Fragment>');
  content = content.replace(/<\/>/g, '</React.Fragment>');
  
  return content;
}

function processFile(filePath) {
  try {
    console.log(`Processing ${filePath}...`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    let fixedContent = fixOptionalChaining(content);
    fixedContent = fixReactFragments(fixedContent);
    
    // Count changes made
    const originalOptionalChaining = (content.match(/\?\./g) || []).length;
    const fixedOptionalChaining = (fixedContent.match(/\?\./g) || []).length;
    const optionalChainingChanges = originalOptionalChaining - fixedOptionalChaining;
    
    const originalFragments = (content.match(/<\/?>/g) || []).length;
    const fixedFragments = (fixedContent.match(/<\/?>/g) || []).length;
    const fragmentChanges = originalFragments - fixedFragments;
    
    const totalChanges = optionalChainingChanges + fragmentChanges;
    
    if (totalChanges > 0) {
      // Create backup
      const backupPath = filePath + '.backup';
      fs.writeFileSync(backupPath, content);
      console.log(`Backup created: ${backupPath}`);
      
      // Write fixed content
      fs.writeFileSync(filePath, fixedContent);
      
      if (optionalChainingChanges > 0) {
        console.log(`✅ Fixed ${optionalChainingChanges} optional chaining operator(s)`);
        console.log('- wsRef.current?.readyState → (wsRef.current && wsRef.current.readyState)');
        console.log('- item.target?.x → (item.target && item.target.x)');
        console.log('- item.target?.z → (item.target && item.target.z)');
      }
      
      if (fragmentChanges > 0) {
        console.log(`✅ Fixed ${fragmentChanges} React Fragment syntax issue(s)`);
        console.log('- <> → <React.Fragment>');
        console.log('- </> → </React.Fragment>');
      }
      
    } else {
      console.log('✅ No Babel v6 compatibility issues found to fix');
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node fix_optional_chaining.js <html-file>');
  console.log('Example: node fix_optional_chaining.js single_file_version_v5.html');
  process.exit(1);
}

const filePath = path.resolve(args[0]);

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

if (!filePath.endsWith('.html')) {
  console.error('❌ Please provide an HTML file');
  process.exit(1);
}

console.log('🔧 Babel v6 Compatibility Fixer');
console.log('=' .repeat(50));

processFile(filePath);

console.log('=' .repeat(50));
console.log('✨ Done! Your file should now be compatible with Babel standalone v6');