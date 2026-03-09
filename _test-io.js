// Test .io via Jina
(async () => {
  const r = await fetch('https://r.jina.ai/https://tld-list.com/tld/io', {
    headers: { 'Accept': 'text/html', 'X-Return-Format': 'html' },
    signal: AbortSignal.timeout(30000)
  });
  const html = await r.text();
  console.log('Status:', r.status, 'Length:', html.length);
  console.log('Has table:', html.includes('registrars-table'));
  const matches = html.match(/itemprop="name"/g);
  console.log('Registrar names found:', matches ? matches.length : 0);

  // SSL test  
  const ssl = await fetch('https://crt.sh/?q=google.com&output=json', { signal: AbortSignal.timeout(20000) });
  console.log('\nSSL Status:', ssl.status, 'Content-Type:', ssl.headers.get('content-type'));
  const sslData = await ssl.json();
  console.log('SSL certs:', sslData.length);
})();
