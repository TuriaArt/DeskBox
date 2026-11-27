var META = {
  'bitcoin': ['BTC', 'Bitcoin'],
  'ethereum': ['ETH', 'Ethereum'],
  'solana': ['SOL', 'Solana'],
  'the-open-network': ['TON', 'Toncoin'],
  'binancecoin': ['BNB', 'BNB'],
  'ripple': ['XRP', 'XRP'],
  'dogecoin': ['DOGE', 'Dogecoin'],
  'cardano': ['ADA', 'Cardano'],
  'tether': ['USDT', 'Tether'],
  'tron': ['TRX', 'TRON']
};
var VS_SYMBOL = { usd: '$', eur: '\u20ac', gbp: '\u00a3', rub: '\u20bd', cny: '\u00a5', jpy: '\u00a5' };
var VS_SUFFIX = { rub: true };

function pad2(n){ n = Math.floor(Number(n) || 0); return (n < 10 ? '0' : '') + n; }
function coinIds(ctx){
  var raw = ctx.settings ? String(ctx.settings.coins || '') : '';
  var parts = raw.split(',');
  var out = [];
  for (var i = 0; i < parts.length; i++){
    var id = parts[i].trim().toLowerCase();
    if (id && out.indexOf(id) < 0) out.push(id);
  }
  if (!out.length) out = ['bitcoin', 'ethereum', 'solana', 'the-open-network'];
  return out;
}
function vsCurrency(ctx){
  var v = ctx.settings ? String(ctx.settings.vsCurrency || '').toLowerCase() : '';
  return VS_SYMBOL[v] ? v : 'usd';
}
function groupInt(intPart){
  var out = '';
  var cnt = 0;
  for (var i = intPart.length - 1; i >= 0; i--){
    out = intPart.charAt(i) + out;
    cnt++;
    if (cnt % 3 === 0 && i > 0) out = ',' + out;
  }
  return out;
}
function fmtPrice(n, vs){
  if (!Number.isFinite(n)) return '-';
  var a = Math.abs(n);
  var digits = a >= 1000 ? 0 : (a >= 1 ? 2 : (a >= 0.01 ? 4 : 6));
  var fixed = a.toFixed(digits);
  var dot = fixed.indexOf('.');
  var body = groupInt(dot >= 0 ? fixed.slice(0, dot) : fixed) + (dot >= 0 ? fixed.slice(dot) : '');
  var sym = VS_SYMBOL[vs] || '';
  return VS_SUFFIX[vs] ? (body + ' ' + sym) : (sym + body);
}
function fmtChange(ch){
  if (!Number.isFinite(ch)) return '-';
  var sign = ch > 0 ? '+' : (ch < 0 ? '-' : '');
  return sign + Math.abs(ch).toFixed(2) + '%';
}
function metaOf(id){
  var m = META[id];
  if (m) return m;
  var name = id.charAt(0).toUpperCase() + id.slice(1);
  return [id.slice(0, 4).toUpperCase(), name];
}

export function onInit(ctx){ project(ctx); }
export function onSettingsChange(ctx){ project(ctx); }
export function onSourceData(ctx, sourceId, raw){
  var s = ctx.state;
  var data = raw;
  if (typeof data === 'string'){
    try { data = JSON.parse(data); } catch (e) { data = null; }
  }
  if (data && typeof data === 'object' && !Array.isArray(data)){
    var vs = vsCurrency(ctx);
    var ids = coinIds(ctx);
    var quotes = {};
    var found = 0;
    for (var i = 0; i < ids.length; i++){
      var row = data[ids[i]];
      if (!row || typeof row !== 'object') continue;
      var p = Number(row[vs]);
      var ch = Number(row[vs + '_24h_change']);
      if (!Number.isFinite(p)) continue;
      quotes[ids[i]] = { p: p, ch: Number.isFinite(ch) ? ch : 0 };
      found++;
    }
    if (found > 0){
      s.quotes = quotes;
      s.quotesVs = vs;
      s.quotesAtMs = Date.now();
    }
  }
  project(ctx);
}
function project(ctx){
  var s = ctx.state;
  var c = ctx.computed;
  if (!s.quotes || typeof s.quotes !== 'object') s.quotes = {};
  s.quotesVs = String(s.quotesVs || '');
  var at = Number(s.quotesAtMs);
  s.quotesAtMs = Number.isFinite(at) && at > 0 ? at : 0;

  var vs = vsCurrency(ctx);
  var ids = coinIds(ctx);
  var sameVs = s.quotesVs === vs;
  var coins = [];
  for (var i = 0; i < ids.length; i++){
    var q = sameVs ? s.quotes[ids[i]] : null;
    if (!q) continue;
    var m = metaOf(ids[i]);
    var ch = Number(q.ch);
    coins.push({
      id: ids[i],
      sym: m[0],
      name: m[1],
      price: fmtPrice(Number(q.p), vs),
      change: fmtChange(ch),
      tone: ch > 0 ? 'emerald' : (ch < 0 ? 'danger' : 'subtle')
    });
  }
  c.coins = coins;

  var status = String(s.sourceStatus || '');
  if (status === 'error') c.statusText = ctx.t('statusError', 'Could not load prices');
  else if (status === 'loading' || s.quotesAtMs <= 0 || !sameVs) c.statusText = ctx.t('statusLoading', 'Loading prices...');
  else {
    var d = new Date(s.quotesAtMs);
    c.statusText = ctx.t('lblUpdated', 'Updated') + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ' \u00b7 CoinGecko';
  }
  if (coins.length){
    c.capsuleSummary = coins[0].sym + ' ' + coins[0].price;
    c.capsuleBadge = coins[0].change;
  } else {
    c.capsuleSummary = c.statusText;
    c.capsuleBadge = vs.toUpperCase();
  }
}
