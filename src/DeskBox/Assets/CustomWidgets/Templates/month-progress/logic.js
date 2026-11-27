
function pad2(n){ n = Math.floor(Number(n) || 0); return (n < 10 ? '0' : '') + n; }
function clampNum(v, d){ const n = Number(v); return Number.isFinite(n) ? n : d; }
function cue(ctx, name, vol){ try { ctx.dispatch({ type: 'audio.cue', cue: name, volume: String(vol) }); } catch (e) {} }
function toastMsg(ctx, msg){ try { if (ctx.ui && ctx.ui.toast) { ctx.ui.toast(msg); return; } } catch (e) {} try { ctx.dispatch({ type: 'toast.show', title: '', message: msg }); } catch (e2) {} }

function daysInMonth(y, m){ return new Date(y, m + 1, 0).getDate(); }
export function onInit(ctx){ project(ctx); }
export function onTick(ctx){ project(ctx); }
export function onSettingsChange(ctx){ project(ctx); }
export function refresh(ctx){ project(ctx); }
function project(ctx){
  var s = ctx.state || (ctx.state = {});
  var settings = ctx.settings || {};
  var now = new Date();
  var y = now.getFullYear(); var m = now.getMonth();
  var start = new Date(y, m, 1);
  var end = new Date(y, m + 1, 1);
  var total = end.getTime() - start.getTime();
  var elapsed = now.getTime() - start.getTime();
  var pct = Math.min(100, Math.max(0, elapsed / total * 100));
  var dim = daysInMonth(y, m);
  var dayNum = now.getDate();
  var daysLeft = dim - dayNum;
  var c = ctx.computed || (ctx.computed = {});
  var rounded = Math.round(pct * 10) / 10;
  c.pct = rounded;
  c.pctText = rounded + '%';
  c.dayText = ctx.t('lblDay', 'Day') + ' ' + dayNum + ' / ' + dim;
  c.leftText = daysLeft + ' ' + ctx.t('lblDaysLeft', 'days left');
  c.capsuleSummary = c.dayText + ' · ' + c.leftText;
  c.useRing = String(settings.style || 'ring') !== 'bar';
  c.useBar = !c.useRing;
}
