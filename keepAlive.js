import http from 'node:http';

const PORT = 8080;

export function keepAlive() {
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Bot is running!');
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, '0.0.0.0', () => {});
  server.on('error', () => {});
}