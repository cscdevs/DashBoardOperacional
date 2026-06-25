import fs from 'fs';
import path from 'path';

function addNoLock(content) {
  return content.replace(/\b(FROM|JOIN)\s+([a-zA-Z0-9_]+)(?:\s+([a-zA-Z0-9_]+))?\b/gi, (match, p1, p2, p3) => {
    const keywords = ['ON', 'WHERE', 'WITH', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'AS', 'PIVOT', 'UNPIVOT'];
    
    if (p3 && keywords.includes(p3.toUpperCase())) {
      return `${p1} ${p2} WITH (NOLOCK) ${p3}`;
    }
    
    if (p3) {
      return `${p1} ${p2} ${p3} WITH (NOLOCK)`;
    }
    
    return `${p1} ${p2} WITH (NOLOCK)`;
  });
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.sql')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Don't re-apply if already there
      if (!content.includes('WITH (NOLOCK)')) {
        const newContent = addNoLock(content);
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Processed: ${fullPath}`);
      } else {
        console.log(`Skipped (already has NOLOCK): ${fullPath}`);
      }
    }
  }
}

const targetDir = 'c:/Users/Desenvolvedor-works/Desktop/DashBoards/server/src/reports';
processDirectory(targetDir);
console.log('All done.');
