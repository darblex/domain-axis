const TOKEN = 'ce3665b4-a969-40c1-846f-391806bbbadb';
const PROJECT = '355de945-a688-4591-9045-f4e126520d49';
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
  // Check deployments
  const deps = await gql(
    'query($projectId: String!, $serviceId: String!, $environmentId: String!) { deployments(input: { projectId: $projectId, serviceId: $serviceId, environmentId: $environmentId }, first: 3) { edges { node { id status staticUrl } } } }',
    { projectId: PROJECT, serviceId: SERVICE, environmentId: ENV }
  );
  console.log('Deployments:', JSON.stringify(deps, null, 2));

  // Check service instance
  const svc = await gql(
    'query($serviceId: String!, $environmentId: String!) { serviceInstance(serviceId: $serviceId, environmentId: $environmentId) { latestDeployment { id status } domains { serviceDomains { domain } } } }',
    { serviceId: SERVICE, environmentId: ENV }
  );
  console.log('Service:', JSON.stringify(svc, null, 2));
})();
