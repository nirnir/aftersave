// Vercel serverless: forward all /api/* requests to the Express app
const app = require("../server/index.cjs");
module.exports = (req, res) => app(req, res);
