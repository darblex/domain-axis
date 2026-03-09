const TOKEN = 'ce3665b4-a969-40c1-846f-391806bbbadb';

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
  const proj = await gql(`mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { id name } }`, 
    { input: { name: 'domain-axis', teamId: 'd3fb77f3-1189-453f-95d0-eb1c65d39c10' } });
  console.log(JSON.stringify(proj, null, 2));
  
  const projectId = proj.data?.projectCreate?.id;
  if (!projectId) { console.error('Failed to create project'); process.exit(1); }
  console.log('Project ID:', projectId);

  // 2. Get default environment
  const envs = await gql(`query($id: String!) { project(id: $id) { environments { edges { node { id name } } } } }`,
    { id: projectId });
  const envId = envs.data?.project?.environments?.edges?.[0]?.node?.id;
  console.log('Environment ID:', envId);

  // 3. Create service from GitHub repo
  console.log('Creating service...');
  const svc = await gql(`mutation($input: ServiceCreateInput!) { serviceCreate(input: $input) { id name } }`,
    { input: { projectId, name: 'domain-axis-web', source: { repo: 'darblex/domain-axis' } } });
  console.log(JSON.stringify(svc, null, 2));
  
  const serviceId = svc.data?.serviceCreate?.id;
  console.log('Service ID:', serviceId);

  // 4. Create service domain
  if (serviceId && envId) {
    console.log('Creating domain...');
    const dom = await gql(`mutation($sId: String!, $eId: String!) { serviceDomainCreate(input: { serviceId: $sId, environmentId: $eId }) { domain } }`,
      { sId: serviceId, eId: envId });
    console.log('Domain:', JSON.stringify(dom, null, 2));
  }

  console.log('\nDone! Check Railway dashboard.');
})();
