const TOKEN = 'ce3665b4-a969-40c1-846f-391806bbbadb';
const SERVICE = 'bb774632-36f4-4672-9182-1a093e9a46fc';
const ENV = 'c7c94a3c-6703-472c-8c52-00db09adc9d1';

async function gql(query, variables = {}) {
  const r = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return r.json();
}

(async () => {
  // 1. Connect GitHub repo to service
  console.log('Connecting repo...');
  const connect = await gql(
    'mutation($serviceId: String!, $input: ServiceConnectInput!) { serviceConnect(id: $serviceId, input: $input) { id source { repo } } }',
    { serviceId: SERVICE, input: { repo: 'darblex/domain-axis', branch: 'master' } }
  );
  console.log('Connect:', JSON.stringify(connect, null, 2));

  // 2. Redeploy
  console.log('Triggering deploy...');
  const deploy = await gql(
    'mutation($serviceId: String!, $environmentId: String!) { serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId) }',
    { serviceId: SERVICE, environmentId: ENV }
  );
  console.log('Deploy:', JSON.stringify(deploy, null, 2));
})();
