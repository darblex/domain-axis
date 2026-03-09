// Set GROQ_API_KEY on Railway
const RAILWAY_TOKEN = 'ce3665b4-a969-40c1-846f-391806bbbadb';
const SERVICE_ID = 'bb774632-36f4-4672-9182-1a093e9a46fc';
const ENV_ID = 'c7c94a3c-6703-472c-8c52-00db09adc9d1';

// Darblex needs to provide Groq key. For now let's deploy without it — trending works without Groq
// AI suggest will gracefully show "GROQ_API_KEY not configured" 

async function setVar(name, value) {
  const query = `mutation { variableUpsert(input: { projectId: "355de945-a688-4591-9045-f4e126520d49", environmentId: "${ENV_ID}", serviceId: "${SERVICE_ID}", name: "${name}", value: "${value}" }) }`;
  
  const resp = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RAILWAY_TOKEN}` },
    body: JSON.stringify({ query })
  });
  console.log(name, '→', await resp.json());
}

// We'll set this once Darblex provides a Groq key
// setVar('GROQ_API_KEY', 'gsk_...');
console.log('Ready to set GROQ_API_KEY. Get free key at https://console.groq.com/keys');
