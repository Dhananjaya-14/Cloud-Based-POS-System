const fs = require("fs");
let code = fs.readFileSync("WaiterPos.jsx", "utf8");
code = code.replace("</aside>\n    </div>\n  );\n};", "</aside>\n        </div>\n      </div>\n    );\n};");
fs.writeFileSync("WaiterPos.jsx", code);
