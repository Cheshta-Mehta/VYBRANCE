// Copies ../hackfinal.html -> www/index.html (UNCHANGED) and appends one <script> tag for the native bridge.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const src = path.join(root, "..", "hackfinal.html");
if (!fs.existsSync(src)) { console.error("hackfinal.html not found next to android-app/"); process.exit(1); }
let html = fs.readFileSync(src, "utf8");
const i = html.lastIndexOf("</body>");
if (i < 0) { console.error("no </body> in hackfinal.html"); process.exit(1); }
html = html.slice(0, i) + "<script src=\"native-bridge.js\"></script>" + html.slice(i);
fs.mkdirSync(path.join(root, "www"), { recursive: true });
fs.writeFileSync(path.join(root, "www", "index.html"), html);
fs.copyFileSync(path.join(root, "native", "native-bridge.js"), path.join(root, "www", "native-bridge.js"));
console.log("www/ ready (" + Math.round(html.length / 1024) + " KB)");
