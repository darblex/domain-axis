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
  // Get workspaces/teams
  const me = await gql(`query { me { id email teams { edges { node { id name } } } } }`);
  console.log('Me:', JSON.stringify(me, null, 2));

  // Also try getting projects directly
  const projs = await gql(`query { me { projects { edges { node { id name } } } } }`);
  console.log('Projects:', JSON.stringify(projs, null, 2));
})();
