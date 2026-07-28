const fs = require('fs');
const path = require('path');

const data = require('./recovered_tools.json');

const basePath = 'C:\\Users\\IT ZONE\\Desktop\\Cloud-Based-POS-System';
const filePaths = {
  'WasteManagement.jsx': path.join(basePath, 'Client/src/pages/branch-admin/WasteManagement.jsx'),
  'wasteController.js': path.join(basePath, 'Server/controllers/wasteController.js'),
  'purchaseItemController.js': path.join(basePath, 'Server/controllers/purchaseItemController.js'),
  'purchaseOrderController.js': path.join(basePath, 'Server/controllers/purchaseOrderController.js'),
  'ProductItemsTable.jsx': path.join(basePath, 'Client/src/components/branch-admin/ProductItemsTable.jsx'),
  'ReorderModal.jsx': path.join(basePath, 'Client/src/components/branch-admin/ReorderModal.jsx')
};

function normalizeLF(str) {
  if (!str) return str;
  return str.replace(/\r\n/g, '\n');
}

function unescapeJSONString(val) {
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'string') return parsed;
    } catch(e) {}
  }
  return val;
}

// Reset files to their git state first to ensure clean application
const { execSync } = require('child_process');
try {
  execSync('git checkout HEAD -- Server/controllers/wasteController.js Server/controllers/purchaseItemController.js Server/controllers/purchaseOrderController.js Client/src/components/branch-admin/ProductItemsTable.jsx Client/src/components/branch-admin/ReorderModal.jsx', {cwd: basePath});
  // Note: WasteManagement.jsx was deleted in HEAD, so we don't check it out. 
  // Step 81 will recreate it using write_to_file.
} catch(e) {
  console.log('Error checking out files:', e.message);
}

for (const edit of data) {
  const filePath = filePaths[edit.file];
  
  // If it's a replace operation, we need the file to exist
  if (edit.name.includes('replace') && !fs.existsSync(filePath)) {
    console.log(`Skipping step ${edit.step} - File not found: ${filePath}`);
    continue;
  }
  
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  content = normalizeLF(content);

  if (edit.name === 'write_to_file' || edit.name === 'default_api:write_to_file') {
    if (edit.args.Overwrite) {
      let newContent = unescapeJSONString(edit.args.CodeContent);
      fs.writeFileSync(filePath, normalizeLF(newContent), 'utf8');
      console.log(`Step ${edit.step}: Overwrote ${edit.file}`);
    }
  } else if (edit.name === 'replace_file_content' || edit.name === 'default_api:replace_file_content') {
    const target = normalizeLF(unescapeJSONString(edit.args.TargetContent));
    const replacement = normalizeLF(unescapeJSONString(edit.args.ReplacementContent));
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Step ${edit.step}: Replaced content in ${edit.file}`);
    } else {
      console.log(`Step ${edit.step}: Could not find target in ${edit.file}`);
    }
  } else if (edit.name === 'multi_replace_file_content' || edit.name === 'default_api:multi_replace_file_content') {
    const rawChunks = unescapeJSONString(edit.args.ReplacementChunks);
    const chunks = (typeof rawChunks === 'string') ? JSON.parse(rawChunks) : rawChunks || [];
    let success = true;
    for (const chunk of chunks) {
      if (!content.includes(normalizeLF(chunk.TargetContent))) {
        console.log(`Step ${edit.step}: Could not find target in ${edit.file}`);
        success = false;
        break;
      }
    }
    
    if (success) {
      for (const chunk of chunks) {
        const target = normalizeLF(chunk.TargetContent);
        const replacement = normalizeLF(chunk.ReplacementContent);
        if (chunk.AllowMultiple) {
          content = content.split(target).join(replacement);
        } else {
          content = content.replace(target, replacement);
        }
      }
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Step ${edit.step}: Multi-replaced content in ${edit.file}`);
    }
  }
}
