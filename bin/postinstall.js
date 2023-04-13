/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef*/
require("dotenv").config();

const fs = require("fs");

console.log("postinstall.js", process.env.NODE_ENV);

// eslint-disable-next-line no-undef
const replace = (file, from, to) => {
  const fileData = fs.readFileSync(file, "utf8");
  var result = fileData.replace(from, to);
  fs.writeFileSync(file, result, "utf8");
  console.log("Patch complete! Replaced:", fileData !== result, {
    file,
    from,
    to,
  });
};

replace(
  "node_modules/@loopring-web/loopring-sdk/dist/loopring-sdk.cjs.production.min.js",
  "let Qe;Qe=null!=(We=window)&&We.___OhTrustDebugger___?",
  "let Qe;Qe=false?"
);

if (process.env.NODE_ENV === "production") {
  replace("views/layout.pug", "__CACHEBUSTER__", new Date().getTime());
}
