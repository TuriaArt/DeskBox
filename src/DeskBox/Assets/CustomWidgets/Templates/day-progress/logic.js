
function pad2(n){ n = Math.floor(Number(n) || 0); return (n < 10 ? '0' : '') + n; }
function clampNum(v, d){ const n = Number(v); return Number.isFinite(n) ? n : d; }
function cue(ctx, name, vol){ try { ctx.dispatch({ type: 'audio.cue', cue: name, volume: String(vol) }); } catch (e) {} }
function toastMsg(ctx, msg){ try { if (ctx.ui && ctx.ui.toast) { ctx.ui.toast(msg); return; } } catch (e) {} try { ctx.dispatch({ type: 'toast.show', title: '', message: msg }); } catch (e2) {} }

var DAY_MS = 86400000;
function fmtDuration(ms, withSeconds){
  ms = Math.max(0, ms);
  var totalSec = Math.floor(ms / 1000);
  var h = Math.floor(totalSec / 3600); totalSec -= h * 3600;
  var m = Math.floor(totalSec / 60); var s = totalSec - m * 60;
  if (withSeconds) return h + 'h ' + pad2(m) + 'm ' + pad2(s) + 's';
  return h + 'h ' + pad2(m) + 'm';
}
function fmtClock(d){ return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
export function onInit(ctx){ project(ctx); }
export function onTick(ctx){ project(ctx); }
export function onSettingsChange(ctx){ project(ctx); }
export function refresh(ctx){ project(ctx); }
function project(ctx){
  var s = ctx.state || (ctx.state = {});
  var settings = ctx.settings || {};
  var now = new Date();
  var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  var elapsed = now.getTime() - start.getTime();
  var pct = Math.min(100, Math.max(0, elapsed / DAY_MS * 100));
  var withSec = !(settings.showSeconds === false || settings.showSeconds === 'false');
  var remaining = DAY_MS - elapsed;
  var end = new Date(start.getTime() + DAY_MS);
  var c = ctx.computed || (ctx.computed = {});
  var rounded = Math.round(pct * 10) / 10;
  c.pct = rounded;
  c.pctText = rounded + '%';
  c.elapsedText = fmtDuration(elapsed, withSec);
  c.remainingText = fmtDuration(remaining, withSec);
  c.endsAtText = fmtClock(end);
  c.capsuleSummary = c.elapsedText + ' in · ' + c.remainingText + ' left';
  var isBar = String(settings.style || 'ring') === 'bar';
  c.useRing = !isBar;
  c.useBar = isBar;
}
