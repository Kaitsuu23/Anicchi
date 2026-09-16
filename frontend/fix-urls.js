const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) walk(dirPath, callback);
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) callback(dirPath);
  });
}

walk('src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('http://localhost:3000')) {
    // If the URL is already inside template literals, we can replace it directly
    content = content.replace(/http:\/\/localhost:3000/g, "${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}");
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
});
