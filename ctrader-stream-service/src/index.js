const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { getAccessToken } = require('./auth');
const { mapCTraderDealToRawTrade } = require('./mapper');
const { pushTrades } = require('./push');

const PROTOS = [
  'OpenApiCommonMessages.proto',
  'OpenApiCommonModelMessages.proto',
  'OpenApiMessages.proto',
  'OpenApiModelMessages.proto',
  'OpenApiService.proto',
];

function loadProto() {
  const def = protoLoader.loadSync(
    PROTOS.map(p => path.join(__dirname, '..', 'protos', p)),
    { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
  );
  return grpc.loadPackageDefinition(def);
}

async function main() {
  const accessToken = await getAccessToken();
  const pkg = loadProto();

  // Espace de noms probable = "openapi"
  const service = pkg.openapi.OpenApiService;
  const client = new service('openapi.ctrader.com:5035', grpc.credentials.createSsl());

  const stream = client.Process();

  // Utilitaires pour sérialiser/désérialiser
  const root = pkg; // via proto-loader, on accède aux types par pkg
  const OA = pkg;   // pour raccourci (les enums/messages sont sur pkg)

  const types = {
    ProtoMessage: pkg.openapi.ProtoMessage || pkg.ProtoMessage,
    // messages OA (trouvés dans tes .proto)
    AppAuthReq: pkg.ProtoOAApplicationAuthReq || pkg.openapi.ProtoOAApplicationAuthReq,
    AccountAuthReq: pkg.ProtoOAAccountAuthReq || pkg.openapi.ProtoOAAccountAuthReq,
    DealListReq: pkg.ProtoOADealListReq || pkg.openapi.ProtoOADealListReq,
  };

  const enums = {
    OAPayloadType: pkg.ProtoOAPayloadType || pkg.openapi.ProtoOAPayloadType,
  };

  function send(payloadTypeEnum, msgObj, MsgCtor) {
    // encode message vers bytes
    const message = MsgCtor.fromObject ? MsgCtor.fromObject(msgObj) : msgObj;
    const payload = MsgCtor.encode ? MsgCtor.encode(message).finish() : MsgCtor.encode(message).finish();
    stream.write({
      payloadType: payloadTypeEnum,
      payload,
      clientMsgId: String(Date.now()),
    });
  }

  stream.on('data', (res) => {
    try {
      // res.payloadType (uint) → switch sur enums
      const t = Number(res.payloadType);

      // On doit décoder selon le type attendu (exemples)
      const PT = enums.OAPayloadType;
      const buf = res.payload;

      if (t === PT.PROTO_OA_APPLICATION_AUTH_RES) {
        console.log('Application AUTH OK');
        // Étape suivante : Auth compte
        const msg = { ctidTraderAccountId: Number(process.env.CTRADER_ACCOUNT_ID), accessToken };
        send(PT.PROTO_OA_ACCOUNT_AUTH_REQ, msg, pkg.ProtoOAAccountAuthReq);
      }
      else if (t === PT.PROTO_OA_ACCOUNT_AUTH_RES) {
        console.log('Account AUTH OK');

        // 1) Récupère l’historique des deals (ex: 30 jours)
        const now = Date.now();
        const from = now - 30 * 24 * 3600 * 1000;

        const dealListReq = {
          ctidTraderAccountId: Number(process.env.CTRADER_ACCOUNT_ID),
          fromTimestamp: from,
          toTimestamp: now,
          maxRows: 500,
        };
        send(PT.PROTO_OA_DEAL_LIST_REQ, dealListReq, pkg.ProtoOADealListReq);

        // 2) Les events live arrivent sous PROTO_OA_EXECUTION_EVENT
      }
      else if (t === PT.PROTO_OA_DEAL_LIST_RES) {
        const decoded = pkg.ProtoOADealListRes.decode(buf);
        const deals = decoded.deal || [];
        console.log(`DealListRes: ${deals.length} deals (hasMore=${decoded.hasMore})`);

        const payload = deals.map(d => mapCTraderDealToRawTrade(d));
        if (payload.length) {
          pushTrades(payload).catch(e => console.error('pushTrades error:', e?.message));
        }

        // Si hasMore, relance une requête avec un range ajusté (optionnel)
      }
      else if (t === PT.PROTO_OA_EXECUTION_EVENT) {
        const ev = pkg.ProtoOAExecutionEvent.decode(buf);
        if (ev.deal) {
          const payload = [mapCTraderDealToRawTrade(ev.deal)];
          pushTrades(payload).catch(e => console.error('pushTrades error:', e?.message));
          console.log('New execution → pushed 1 trade');
        }
      }
      else if (t === PT.PROTO_OA_ERROR_RES) {
        const err = pkg.ProtoErrorRes.decode(buf);
        console.error('OA ERROR:', err.errorCode, err.description || '');
      }
      // ajoute d’autres handlers si besoin (TRADER_RES, RECONCILE_RES, etc.)
    } catch (e) {
      console.error('stream data decode error:', e);
    }
  });

  stream.on('error', (e) => console.error('gRPC stream error', e));
  stream.on('end',   () => console.log('gRPC stream ended'));

  // Démarre la séquence : ApplicationAuth → (réponse) → AccountAuth
  send(enums.OAPayloadType.PROTO_OA_APPLICATION_AUTH_REQ, {
    clientId: process.env.CTRADER_APP_ID,
    clientSecret: process.env.CTRADER_APP_SECRET
  }, pkg.ProtoOAApplicationAuthReq);
}

main().catch(console.error);
