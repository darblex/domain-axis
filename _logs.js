const TOKEN = 'ce3665b4-a969-40c1-846f-391806bbbadb';
const SERVICE = 'bb774632-36f4-4672-9182-1a093e9a46fc';
const ENV = 'c7c94a3c-6703-472c-8c52-00db09adc9d1';
const DEPLOY = 'ab53371c-16b3-40d9-ba99-79f71c430743';

async function gql(query, variables = {}) {
  const r = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return r.json();
}

(async () => {
  const logs = await gql(
    'query($deploymentId: String!) { deploymentLogs(deploymentId: $deploymentId, limit: 50) { message timestamp severity } }',
    { deploymentId: DEPLOY }
  );
  if (logs.data?.deploymentLogs) {
    logs.data.deploymentLogs.forEach(l => console.log(l.timestamp, l.severity, l.message));
  } else {
    console.log(JSON.stringify(logs, null, 2));
  }
})();
