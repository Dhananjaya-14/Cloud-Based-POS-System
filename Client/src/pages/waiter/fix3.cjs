const fs = require("fs");
let code = fs.readFileSync("WaiterPos.jsx", "utf8");
code = code.replace(/<\/aside>[\s\r\n]*<\/div>[\s\r\n]*\);[\s\r\n]*};/, "</aside>\n        </div>\n      </div>\n    );\n};");
fs.writeFileSync("WaiterPos.jsx", code);
