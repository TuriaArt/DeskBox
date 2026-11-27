var UNITS = {
  length: [['mm', 'mm', 0.001], ['cm', 'cm', 0.01], ['m', 'm', 1], ['km', 'km', 1000], ['in', 'in', 0.0254], ['ft', 'ft', 0.3048], ['yd', 'yd', 0.9144], ['mi', 'mi', 1609.344], ['nmi', 'nmi', 1852]],
  mass: [['mg', 'mg', 0.000001], ['g', 'g', 0.001], ['kg', 'kg', 1], ['t', 't', 1000], ['oz', 'oz', 0.028349523125], ['lb', 'lb', 0.45359237], ['st', 'st', 6.35029318]],
  temperature: [['c', '\u00b0C', 0], ['f', '\u00b0F', 0], ['k', 'K', 0]],
  volume: [['ml', 'ml', 0.001], ['l', 'l', 1], ['m3', 'm\u00b3', 1000], ['tsp', 'tsp', 0.00492892159375], ['tbsp', 'tbsp', 0.01478676478125], ['floz', 'fl oz', 0.0295735295625], ['cup', 'cup', 0.2365882365], ['pt', 'pt', 0.473176473], ['gal', 'gal', 3.785411784]],
  speed: [['mps', 'm/s', 1], ['kmh', 'km/h', 0.2777777777777778], ['mph', 'mph', 0.44704], ['kn', 'kn', 0.5144444444444445], ['fps', 'ft/s', 0.3048]],
  data: [['bit', 'bit', 0.125], ['b', 'B', 1], ['kb', 'KB', 1000], ['mb', 'MB', 1000000], ['gb', 'GB', 1000000000], ['tb', 'TB', 1000000000000], ['kib', 'KiB', 1024], ['mib', 'MiB', 1048576], ['gib', 'GiB', 1073741824]]
};
var DEFAULTS = { length: ['m', 'ft'], mass: ['kg', 'lb'], temperature: ['c', 'f'], volume: ['l', 'gal'], speed: ['kmh', 'mph'], data: ['mb', 'mib'] };

function findUnit(cat, id){
  var list = UNITS[cat] || [];
  for (var i = 0; i < list.length; i++){ if (list[i][0] === id) return list[i]; }
  return null;
}
function parseAmount(v){
  var s = String(v == null ? '' : v).replace(/[\s\u00a0']/g, '').replace(',', '.');
  if (!s) return NaN;
  var n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
function toKelvin(v, id){ return id === 'c' ? v + 273.15 : (id === 'f' ? (v - 32) * 5 / 9 + 273.15 : v); }
function fromKelvin(v, id){ return id === 'c' ? v - 273.15 : (id === 'f' ? (v - 273.15) * 9 / 5 + 32 : v); }
function convert(cat, value, fromU, toU){
  if (!Number.isFinite(value) || !fromU || !toU) return NaN;
  if (cat === 'temperature') return fromKelvin(toKelvin(value, fromU[0]), toU[0]);
  return value * fromU[2] / toU[2];
}
function precision(ctx){
  var p = ctx.settings ? Number(ctx.settings.precision) : 4;
  return p === 2 || p === 4 || p === 6 ? p : 4;
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
function fmt(n, digits){
  if (!Number.isFinite(n)) return '-';
  var a = Math.abs(n);
  if (a !== 0 && (a >= 1e15 || a < Math.pow(10, -digits))) return n.toExponential(Math.max(1, digits - 1)).replace('e+', 'e');
  var fixed = a.toFixed(digits);
  var dot = fixed.indexOf('.');
  var intPart = dot >= 0 ? fixed.slice(0, dot) : fixed;
  var frac = dot >= 0 ? fixed.slice(dot + 1).replace(/0+$/, '') : '';
  var body = groupInt(intPart) + (frac ? '.' + frac : '');
  return (n < 0 && body !== '0' ? '-' : '') + body;
}

export function onInit(ctx){ project(ctx); }
export function onSettingsChange(ctx){ project(ctx); }
export function setCategory(ctx){
  var s = ctx.state;
  var v = ctx.event ? String(ctx.event.value || '') : '';
  if (UNITS[v]) s.category = v;
  var cat = UNITS[s.category] ? s.category : 'length';
  s.fromUnit = DEFAULTS[cat][0];
  s.toUnit = DEFAULTS[cat][1];
  project(ctx);
}
export function onAmountInput(ctx){
  var s = ctx.state;
  var v = ctx.event ? String(ctx.event.value || '') : '';
  if (v !== '') s.amount = v;
  project(ctx);
}
export function recalc(ctx){ project(ctx); }
export function swapUnits(ctx){
  var s = ctx.state;
  var f = String(s.fromUnit || '');
  s.fromUnit = String(s.toUnit || '');
  s.toUnit = f;
  project(ctx);
}
export function copyResult(ctx){
  project(ctx);
  var text = String(ctx.computed.resultText || '');
  if (text && text !== '-'){
    ctx.ui.copy(text);
    ctx.ui.toast(ctx.t('toastCopied', 'Result copied'));
  }
}
function project(ctx){
  var s = ctx.state;
  var c = ctx.computed;
  var cat = UNITS[s.category] ? s.category : 'length';
  s.category = cat;
  if (!findUnit(cat, s.fromUnit)) s.fromUnit = DEFAULTS[cat][0];
  if (!findUnit(cat, s.toUnit)) s.toUnit = DEFAULTS[cat][1];
  s.amount = String(s.amount == null ? '' : s.amount);
  var fromU = findUnit(cat, s.fromUnit);
  var toU = findUnit(cat, s.toUnit);
  var digits = precision(ctx);
  var amt = parseAmount(s.amount);
  var result = convert(cat, amt, fromU, toU);
  c.resultText = fmt(result, digits);
  c.formulaText = '1 ' + fromU[1] + ' = ' + fmt(convert(cat, 1, fromU, toU), digits) + ' ' + toU[1];
  c.capsuleSummary = Number.isFinite(result)
    ? (fmt(amt, digits) + ' ' + fromU[1] + ' = ' + c.resultText + ' ' + toU[1])
    : c.formulaText;
  c.capsuleBadge = toU[1];
}
