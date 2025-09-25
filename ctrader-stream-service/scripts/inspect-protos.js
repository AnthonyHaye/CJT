// scripts/inspect-protos.js
const path = require('path');
const protobuf = require('protobufjs');

(async () => {
  const root = protobuf.loadSync([
    path.join(__dirname, '../protos/OpenApiCommonMessages.proto'),
    path.join(__dirname, '../protos/OpenApiCommonModelMessages.proto'),
    path.join(__dirname, '../protos/OpenApiMessages.proto'),
    path.join(__dirname, '../protos/OpenApiModelMessages.proto'),
  ]);
  function list(ns, prefix='') {
    if (!ns.nested) return;
    for (const [k, v] of Object.entries(ns.nested)) {
      const fq = prefix ? `${prefix}.${k}` : k;
      const kind = v.fields ? 'TYPE' : (v.values ? 'ENUM' : 'NS');
      console.log(kind.padEnd(5), fq);
      list(v, fq);
    }
  }
  list(root);
})();
