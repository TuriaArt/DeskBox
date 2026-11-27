var CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY', 'RUB', 'BYN', 'UAH', 'KZT', 'PLN', 'TRY', 'CAD', 'AUD', 'INR', 'KRW', 'BRL'];
var WATCH = ['USD', 'EUR', 'GBP', 'CNY', 'RUB', 'JPY', 'CHF'];

function pad2(n){ n = Math.floor(Number(n) || 0); return (n < 10 ? '0' : '') + n; }
function isCur(code){ return CURRENCIES.indexOf(code) >= 0; }
function parseAmount(v){
  var s = String(v == null ? '' : v).replace(/[\s\u00a0']/g, '').replace(',', '.');
  if (!s) return NaN;
  var n = Number(s);
  return Number.isFinite(n) ? n : NaN;
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
function fmtNum(n){
  if (!Number.isFinite(n)) return '-';
  var a = Math.abs(n);
  var digits = a >= 1 ? 2 : (a >= 0.01 ? 4 : 6);
  var fixed = a.toFixed(digits);
  var dot = fixed.indexOf('.');
  var intPart = dot >= 0 ? fixed.slice(0, dot) : fixed;
  var frac = dot >= 0 ? fixed.slice(dot + 1) : '';
  if (a < 1) frac = frac.replace(/0+$/, '');
  var body = groupInt(intPart) + (frac ? '.' + frac : '');
  return (n < 0 ? '-' : '') + body;
}
function homeCurrency(ctx){
  var h = ctx.settings ? String(ctx.settings.baseCurrency || '') : '';
  return isCur(h) ? h : 'USD';
}
function rateOf(s, code){
  var rates = (s.rates && typeof s.rates === 'object') ? s.rates : {};
  var r = Number(rates[code]);
  if (Number.isFinite(r) && r > 0) return r;
  if (code && code === s.ratesBase) return 1;
  return NaN;
}

export function onInit(ctx){ project(ctx); }
export function onSettingsChange(ctx){ project(ctx); }
export function onSourceData(ctx, sourceId, raw){
  var s = ctx.state;
  var data = raw;
  if (typeof data === 'string'){
    try { data = JSON.parse(data); } catch (e) { data = null; }
  }
  if (data && typeof data === 'object' && data.rates && typeof data.rates === 'object'){
    var keep = {};
    for (var i = 0; i < CURRENCIES.length; i++){
      var code = CURRENCIES[i];
      var v = Number(data.rates[code]);
      if (Number.isFinite(v) && v > 0) keep[code] = v;
    }
    s.rates = keep;
    s.ratesBase = String(data.base_code || homeCurrency(ctx));
    s.ratesAtMs = Date.now();
  }
  project(ctx);
}
export function onAmountInput(ctx){
  var s = ctx.state;
  var v = ctx.event ? String(ctx.event.value || '') : '';
  if (v !== '') s.amount = v;
  project(ctx);
}
export function recalc(ctx){ project(ctx); }
export function swapCurrencies(ctx){
  var s = ctx.state;
  var from = String(s.fromCur || 'USD');
  s.fromCur = String(s.toCur || 'EUR');
  s.toCur = from;
  project(ctx);
}
function project(ctx){
  var s = ctx.state;
  var c = ctx.computed;
  var home = homeCurrency(ctx);
  s.amount = String(s.amount == null ? '' : s.amount);
  if (!isCur(String(s.fromCur || ''))) s.fromCur = home;
  if (!isCur(String(s.toCur || ''))) s.toCur = home === 'EUR' ? 'USD' : 'EUR';
  if (!s.rates || typeof s.rates !== 'object') s.rates = {};
  s.ratesBase = String(s.ratesBase || '');
  var at = Number(s.ratesAtMs);
  s.ratesAtMs = Number.isFinite(at) && at > 0 ? at : 0;

  var from = s.fromCur;
  var to = s.toCur;
  var rf = rateOf(s, from);
  var rt = rateOf(s, to);
  var hasRates = Number.isFinite(rf) && Number.isFinite(rt);
  var amt = parseAmount(s.amount);
  var result = hasRates && Number.isFinite(amt) ? amt * rt / rf : NaN;

  c.resultText = Number.isFinite(result) ? fmtNum(result) : '-';
  c.rateLine = hasRates ? ('1 ' + from + ' = ' + fmtNum(rt / rf) + ' ' + to) : ctx.t('statusLoading', 'Loading rates...');

  var watch = [];
  var rh = rateOf(s, home);
  for (var i = 0; i < WATCH.length && watch.length < 4; i++){
    var code = WATCH[i];
    if (code === home) continue;
    var rc = rateOf(s, code);
    if (!Number.isFinite(rc) || !Number.isFinite(rh)) continue;
    watch.push({ id: code, left: '1 ' + code, right: fmtNum(rh / rc) + ' ' + home });
  }
  c.watch = watch;

  var status = String(s.sourceStatus || '');
  if (status === 'error') c.statusText = ctx.t('statusError', 'Could not load rates');
  else if (status === 'loading' || s.ratesAtMs <= 0) c.statusText = ctx.t('statusLoading', 'Loading rates...');
  else {
    var d = new Date(s.ratesAtMs);
    c.statusText = ctx.t('lblUpdated', 'Updated') + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  c.capsuleSummary = Number.isFinite(result) ? (fmtNum(amt).replace(/\.00$/, '') + ' ' + from + ' = ' + c.resultText + ' ' + to) : c.rateLine;
  c.capsuleBadge = to;
}
