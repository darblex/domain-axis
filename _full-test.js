const BASE = 'https://web-production-057f5.up.railway.app';

async function test(name, url) {
  const start = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
    const d = await r.json();
    const ms = Date.now() - start;
    console.log(`\n✅ ${name} (${ms}ms)`);
    return d;
  } catch(e) {
    console.log(`\n❌ ${name} FAILED: ${e.message}`);
    return null;
  }
}

(async () => {
  console.log('🔍 DOMAIN AXIS — FULL SYSTEM TEST');
  console.log('='.repeat(60));

  // 1. Health
  const h = await test('HEALTH', BASE + '/health');
  console.log('  Status:', h?.status);

  // 2. Availability - taken
  const c1 = await test('CHECK google.com (taken)', BASE + '/api/check?domain=google.com');
  console.log('  Available:', c1?.available, '→', c1?.available === false ? 'CORRECT ✓' : 'WRONG ✗');

  // 3. Availability - free
  const c2 = await test('CHECK zzznotexist999.com (available)', BASE + '/api/check?domain=zzznotexist999.com');
  console.log('  Available:', c2?.available, '→', c2?.available === true ? 'CORRECT ✓' : 'WRONG ✗');

  // 4. Prices .com
  const p1 = await test('PRICES .com (54 registrars)', BASE + '/api/prices?domain=coolstartup.com');
  console.log('  Total:', p1?.total);
  if (p1?.registrars?.length) {
    console.log('  CHEAPEST 5:');
    p1.registrars.slice(0, 5).forEach((r, i) => {
      const renew = r.renewalPrice ? '$' + r.renewalPrice.toFixed(2) : '?';
      console.log(`    ${i+1}. ${r.registrar} — $${r.regPrice.toFixed(2)} (renew: ${renew}) ${r.whoisPrivacyFree ? '🔒FREE' : ''} ${r.promoCode ? '🎁' + r.promoCode : ''}`);
    });
    console.log('  → Best 3yr value:', p1.registrars.reduce((b, r) => (!b || (r.score3y || 999) < b.score3y) ? r : b, null)?.registrar);
  }

  // 5. Prices .io
  const p2 = await test('PRICES .io', BASE + '/api/prices?domain=myapp.io');
  console.log('  Total:', p2?.total);
  if (p2?.registrars?.length > 1) {
    console.log('  TOP 3:');
    p2.registrars.slice(0, 3).forEach((r, i) => console.log(`    ${i+1}. ${r.registrar} — $${r.regPrice.toFixed(2)}`));
  }

  // 6. Prices .dev
  const p3 = await test('PRICES .dev', BASE + '/api/prices?domain=ai.dev');
  console.log('  Total:', p3?.total);
  if (p3?.registrars?.length > 1) {
    console.log('  TOP 3:');
    p3.registrars.slice(0, 3).forEach((r, i) => console.log(`    ${i+1}. ${r.registrar} — $${r.regPrice.toFixed(2)}`));
  }

  // 7. Prices .xyz
  const p4 = await test('PRICES .xyz', BASE + '/api/prices?domain=hello.xyz');
  console.log('  Total:', p4?.total);

  // 8. WHOIS
  const w = await test('WHOIS github.com', BASE + '/api/whois?domain=github.com');
  console.log('  Registrar:', w?.registrar);
  console.log('  Registered:', w?.registration?.split('T')[0]);
  console.log('  Expires:', w?.expiration?.split('T')[0]);
  console.log('  NS:', w?.nameservers?.join(', '));

  // 9. DNS
  const d = await test('DNS github.com', BASE + '/api/dns?domain=github.com');
  if (d?.records) {
    const summary = Object.entries(d.records).filter(([,v]) => v.length > 0).map(([k,v]) => `${k}:${v.length}`).join(' | ');
    console.log('  Records:', summary);
  }

  // 10. SSL
  const s = await test('SSL github.com', BASE + '/api/ssl?domain=github.com');
  console.log('  Certs total:', s?.total);
  if (s?.certificates?.[0]) {
    console.log('  Latest:', s.certificates[0].commonName, '→', s.certificates[0].notAfter);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log(`  Health: ${h ? '✅' : '❌'}`);
  console.log(`  Availability check: ${c1?.available === false && c2?.available === true ? '✅' : '❌'}`);
  console.log(`  Prices .com: ${(p1?.total || 0) > 20 ? '✅' : '⚠️'} (${p1?.total} registrars)`);
  console.log(`  Prices .io: ${(p2?.total || 0) > 5 ? '✅' : '⚠️'} (${p2?.total} registrars)`);
  console.log(`  Prices .dev: ${(p3?.total || 0) > 10 ? '✅' : '⚠️'} (${p3?.total} registrars)`);
  console.log(`  WHOIS: ${w?.registrar ? '✅' : '❌'}`);
  console.log(`  DNS: ${d?.records?.A?.length > 0 ? '✅' : '❌'}`);
  console.log(`  SSL: ${s?.certificates?.length > 0 ? '✅' : '⚠️'}`);
})();
