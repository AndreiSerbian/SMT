import liveServer from 'live-server';

const params = {
  port: 8080,
  host: "0.0.0.0",
  root: "dist",
  open: false,
  file: "index.html",
  wait: 1000,
  logLevel: 2,
};

liveServer.start(params);
console.log('🚀 Dev server started at http://localhost:8080');
