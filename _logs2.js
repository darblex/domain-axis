const RAILWAY_TOKEN = 'ce3665b4-a969-40c1-846f-391806bbbadb';
const DEPLOY_ID = '323d3192-4396-4d88-a924-8ca7bf23806e';

async function getLogs() {
  const query = `query { deploymentLogs(deploymentId: "${DEPLOY_ID}", limit: 80) { message severity timestamp } }`;
  
  const resp = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RAILWAY_TOKEN}` },
    body: JSON.stringify({ query })
  });
  const data = await resp.json();
  if (data.data?.deploymentLogs) {
    data.data.deploymentLogs.slice(-30).forEach(l => {
      console.log(`[${l.severity}] ${l.message.slice(0,200)}`);
    });
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

getLogs();
