const TOKEN = 'ce3665b4-a969-40c1-846f-391806bbbadb';
async function gql(query) {
  const r = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return r.json();
}
(async () => {
  const r = await gql('{ __type(name: "ProjectCreateInput") { inputFields { name type { name kind ofType { name } } } } }');
  console.log(JSON.stringify(r, null, 2));
})();
