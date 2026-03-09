const TOKEN = 'ce3665b4-a969-40c1-846f-391806bbbadb';
const WORKSPACE = 'd3fb77f3-1189-453f-95d0-eb1c65d39c10';

async function gql(query, variables = {}) {
  const r = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return r.json();
}

(async () => {
  // 1. Create project
  console.log('Creating project...');
  const proj = await gql(
    'mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { id name } }',
    { input: { name: 'domain-axis', workspaceId: WORKSPACE } }
  );
  console.log(JSON.stringify(proj, null, 2));
  
  const projectId = proj.data?.projectCreate?.id;
  if (!projectId) { console.error('Failed'); process.exit(1); }
  console.log('Project ID:', projectId);

  // 2. Get environment
  const envs = await gql(
    'query($id: String!) { project(id: $id) { environments { edges { node { id name } } } } }',
    { id: projectId }
  );
  const envId = envs.data?.project?.environments?.edges?.[0]?.node?.id;
  console.log('Env ID:', envId);

  // 3. Create GitHub service
  console.log('Creating service from GitHub...');
  const svc = await gql(
    'mutation($input: ServiceCreateInput!) { serviceCreate(input: $input) { id name } }',
    { input: { projectId, name: 'web', source: { repo: 'darblex/domain-axis' } } }
  );
  console.log(JSON.stringify(svc, null, 2));
  const serviceId = svc.data?.serviceCreate?.id;
  console.log('Service ID:', serviceId);

  // 4. Generate domain
  if (serviceId && envId) {
    const dom = await gql(
      'mutation($serviceId: String!, $environmentId: String!) { serviceDomainCreate(input: { serviceId: $serviceId, environmentId: $environmentId }) { domain } }',
      { serviceId, environmentId: envId }
    );
    console.log('Domain:', JSON.stringify(dom, null, 2));
  }

  console.log('\nDone!');
})();
