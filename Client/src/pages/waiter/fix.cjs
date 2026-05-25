const fs = require("fs");
let code = fs.readFileSync("WaiterPos.jsx", "utf8");

// Change loader color
code = code.replace("border-t-[#EE4B2B]", "border-t-[#55C24A]");

// Replace the return block layout.
const newLayout = `
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans text-slate-800">
        {/* Top Header */}
        <header className="border-b border-black/5 bg-gradient-to-r from-[#094f96] via-[#0c87b1] to-[#50c164] text-white shadow-[0_10px_30px_rgba(2,8,23,0.15)] flex-none">
          <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white text-[#0A5BAE] shadow-sm">
                <FaStore className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-[15px] font-semibold tracking-wide">Hotel POS</div>
                <div className="text-[11px] text-white/80">Point of Sale System</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/15 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0A5BAE]">
                  <FaUserCircle className="h-5 w-5" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-[11px] font-semibold leading-none text-left">
                    {user?.f_name || "Waiter"} {user?.l_name || ""}
                  </div>
                  <div className="mt-0.5 text-[11px] text-left text-white/80">Waiter • {branchName}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-black/20 bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
              >
                <FaSignOutAlt className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content Area */}
          <main className="flex flex-1 flex-col overflow-hidden">
`;

// Find where "return (" is for the main render and replace until "<main"
let regex = /return \(\s*<div className="flex h-screen overflow-hidden[^>]*>[\s\S]*?<main className="flex flex-1 flex-col overflow-hidden">/g;
code = code.replace(regex, newLayout);

// Close the extra flex-1 div at the very bottom
code = code.replace("</aside>\n    </div>\n  );\n};", "</aside>\n        </div>\n      </div>\n    );\n};");

// Change button colors and text colors
code = code.replace(/#EE4B2B/g, "#0A5BAE"); // Change orange to blue
code = code.replace(/#d94125/g, "#094f96"); // Change dark orange to dark blue
code = code.replace(/text-orange-500/g, "text-blue-500");
code = code.replace(/bg-orange-100/g, "bg-blue-100");
code = code.replace(/text-red-500/g, "text-red-500"); // leave red trash alone
code = code.replace(/focus:ring-orange-/g, "focus:ring-blue-");

fs.writeFileSync("WaiterPos.jsx", code);

