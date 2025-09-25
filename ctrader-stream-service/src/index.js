const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const protobuf = require('protobufjs');
const path = require('path');
const { getAccessToken } = require('./auth');
const { mapCTraderDealToRawTrade } = require('./mapper');
const { pushTrades } = require('./push');

const PROTO_DIR = path.join(__dirname, '..', 'protos');
const FILES = [
  'OpenApiCommonMessages.proto',
  'OpenApiCommonModelMessages.proto',
  'OpenApiMessages.proto',
  'OpenApiModelMessages.proto',
  'OpenApiService.proto',
];

function loadGrpcService() {
  const def = protoLoader.loadSync(FILES.map(f => path.join(PROTO_DIR, f)), {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
  });
  return grpc.loadPackageDefinition(def);
}

function loadPbRoot() {
  return protobuf.loadSync(FILES.map(f => path.join(PROTO_DIR, f)));
}

// Cherche un type/enum/service par nom exact à partir de la racine (pas de package)
function findType(root, name) {
  const stack = [root];
  while (stack.length) {
    const ns = stack.pop();
    if (ns.nested) {
      for (const [k, v] of Object.entries(ns.nested)) {
        if (k === name) return v; // v: Type/Enum/Service
        stack.push(v);
      }
    }
  }
  throw new Error(`Type not found: ${name}`);
}
function findService(grpcPkg, name) {
  const walk = (o) => {
    for (const [k, v] of Object.entries(o)) {
      if (k === name && typeof v === 'function') return v;
      if (v && typeof v === 'object') {
        const w = walk(v); if (w) return w;
      }
    }
    return null;
  };
  const svc = walk(grpcPkg);
  if (!svc) throw new Error(`Service not found: ${name}`);
  return svc;
}

async function main() {
  const accessToken = await getAccessToken();

  const grpcPkg = loadGrpcService();
  const root = loadPbRoot();

  // === Types/Enums (à la racine) ===
  const ProtoMessage     = findType(root, 'ProtoMessage');           // message envelope
  const ProtoOAPayloadType = findType(root, 'ProtoOAPayloadType');   // enum
  const AppAuthReq       = findType(root, 'ProtoOAApplicationAuthReq');
  const AccountAuthReq   = findType(root, 'ProtoOAAccountAuthReq');
  const DealListReq      = findType(root, 'ProtoOADealListReq');
  const DealListRes      = findType(root, 'ProtoOADealListRes');
  const ExecutionEvent   = findType(root, 'ProtoOAExecutionEvent');
  const ErrorRes         = findType(root, 'ProtoErrorRes');

  const E = ProtoOAPayloadType.values;

  // === Service gRPC (sans package) ===
  const OpenApiService = findService(grpcPkg, 'OpenApiService');
  const client = new OpenApiService('openapi.ctrader.com:5035', grpc.credentials.createSsl());
  const stream = client.Process();

  function send(payloadType, obj, Type) {
    const msg = Type.create(obj);
    const payload = Type.encode(msg).finish();
    const envelope = ProtoMessage.create({
      payloadType,
      clientMsgId: String(Date.now()),
      payload
    });
    // grpc-js accepte un plain object {payloadType, clientMsgId, payload}
    stream.write({
      payloadType: envelope.payloadType,
      clientMsgId: envelope.clientMsgId,
      payload: envelope.payload
    });
  }

  stream.on('data', (res) => {
    try {
      const t = Number(res.payloadType);
      const buf = res.payload;

      if (t === E.PROTO_OA_APPLICATION_AUTH_RES) {
        console.log('Application AUTH OK');
        send(E.PROTO_OA_ACCOUNT_AUTH_REQ, {
          ctidTraderAccountId: Number(process.env.CTRADER_ACCOUNT_ID),
          accessToken
        }, AccountAuthReq);

      } else if (t === E.PROTO_OA_ACCOUNT_AUTH_RES) {
        console.log('Account AUTH OK');
        const now = Date.now();
        const from = now - 30 * 24 * 3600 * 1000;
        send(E.PROTO_OA_DEAL_LIST_REQ, {
          ctidTraderAccountId: Number(process.env.CTRADER_ACCOUNT_ID),
          fromTimestamp: from,
          toTimestamp: now,
          maxRows: 500
        }, DealListReq);

      } else if (t === E.PROTO_OA_DEAL_LIST_RES) {
        const decoded = DealListRes.decode(buf);
        const deals = decoded.deal || [];
        console.log(`DealListRes: ${deals.length} deals (hasMore=${decoded.hasMore})`);
        if (deals.length) {
          pushTrades(deals.map(mapCTraderDealToRawTrade)).catch(e => console.error('pushTrades:', e?.message));
        }

      } else if (t === E.PROTO_OA_EXECUTION_EVENT) {
        const ev = ExecutionEvent.decode(buf);
        if (ev.deal) {
          pushTrades([mapCTraderDealToRawTrade(ev.deal)]).catch(e => console.error('pushTrades:', e?.message));
          console.log('New execution → pushed 1 trade');
        }

      } else if (t === E.PROTO_OA_ERROR_RES) {
        const err = ErrorRes.decode(buf);
        console.error('OA ERROR:', err.errorCode, err.description || '');
      }
    } catch (e) {
      console.error('decode error:', e);
    }
  });

  stream.on('error', (e) => console.error('gRPC stream error', e));
  stream.on('end',   () => console.log('gRPC stream ended'));

  // Kick-off
  send(E.PROTO_OA_APPLICATION_AUTH_REQ, {
    clientId: process.env.CTRADER_APP_ID,
    clientSecret: process.env.CTRADER_APP_SECRET
  }, AppAuthReq);
}

main().catch(console.error);
