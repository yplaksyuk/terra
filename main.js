const PORT = 8443;

const express = require('express');
const https = require('https');
const fs = require('fs');

const creds = {
	key: fs.readFileSync('selfsigned.key', 'utf8'),
	cert: fs.readFileSync('selfsigned.crt', 'utf8')
};

const app = express();
app.get('/*', express.static(`./docs`));

const server = https.createServer(creds, app);
server.listen(PORT);

console.log(`Server started at https://localhost:${PORT}/`);
