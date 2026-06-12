const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const authUrl = require('./api/auth-url');
const callback = require('./api/callback');
const sync = require('./api/sync');
const disconnect = require('./api/disconnect');

const app = express();
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/api/auth-url', authUrl);
app.get('/api/callback', callback);
app.get('/api/sync', sync);
app.post('/api/disconnect', disconnect);

app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Smart sync app running on http://localhost:${port}`);
});
