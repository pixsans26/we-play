async function test() {
  const res = await fetch("https://test-we-play-server.fqjdvf.easypanel.host/api/couple/uid/nkt.ni30@gmail.com");
  console.log(res.status);
  const data = await res.text();
  console.log(data);
}
test();
