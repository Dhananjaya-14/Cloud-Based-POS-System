const fs = require('fs');
const readline = require('readline');

async function extractFiles() {
  const logPath = 'C:\\Users\\IT ZONE\\.gemini\\antigravity\\brain\\bc33b267-876e-40be-8d13-5992fda6b080\\.system_generated\\logs\\transcript.jsonl';
  
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const toolCalls = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const step = JSON.parse(line);
      if (step.tool_calls && step.tool_calls.length > 0) {
        step.tool_calls.forEach(call => {
          if (call.name === 'multi_replace_file_content' || call.name === 'write_to_file' || call.name === 'replace_file_content' || call.name === 'default_api:multi_replace_file_content' || call.name === 'default_api:write_to_file' || call.name === 'default_api:replace_file_content') {
             // arguments might be strings inside the object
             const args = call.args || call.arguments || {};
             
             let target = args.TargetFile || args.AbsolutePath;
             if (typeof target === 'string' && target.startsWith('"')) {
                 try { target = JSON.parse(target); } catch(e){}
             }
             
             if (target && (target.includes('WasteManagement.jsx') || 
                            target.includes('wasteController.js') ||
                            target.includes('ProductItemsTable.jsx') ||
                            target.includes('ReorderModal.jsx') ||
                            target.includes('purchaseItemController.js') ||
                            target.includes('purchaseOrderController.js'))) {
                toolCalls.push({
                   step: step.step_index,
                   name: call.name,
                   file: target.split('\\').pop(),
                   args: args
                });
             }
          }
        });
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  fs.writeFileSync('C:\\Users\\IT ZONE\\Desktop\\Cloud-Based-POS-System\\Server\\recovered_tools.json', JSON.stringify(toolCalls, null, 2));
  console.log(`Saved ${toolCalls.length} tool calls to recovered_tools.json`);
}

extractFiles().catch(console.error);
