
function pad2(n){ n = Math.floor(Number(n) || 0); return (n < 10 ? '0' : '') + n; }
function clampNum(v, d){ const n = Number(v); return Number.isFinite(n) ? n : d; }
function cue(ctx, name, vol){ try { ctx.dispatch({ type: 'audio.cue', cue: name, volume: String(vol) }); } catch (e) {} }
function toastMsg(ctx, msg){ try { if (ctx.ui && ctx.ui.toast) { ctx.ui.toast(msg); return; } } catch (e) {} try { ctx.dispatch({ type: 'toast.show', title: '', message: msg }); } catch (e2) {} }

function fmtStopwatch(ms){
  ms = Math.max(0, ms);
  var totalSec = Math.floor(ms / 1000);
  var h = Math.floor(totalSec / 3600); totalSec -= h * 3600;
  var m = Math.floor(totalSec / 60); var s = totalSec - m * 60;
  if (h > 0) return h + ':' + pad2(m) + ':' + pad2(s);
  return pad2(m) + ':' + pad2(s);
}
export function onInit(ctx){ project(ctx); }
export function onTick(ctx, nowUnixMs){ project(ctx, nowUnixMs); }
export function onSettingsChange(ctx){ project(ctx); }
function _toggleRun(ctx){
  var s = ctx.state || (ctx.state = {});
  var now = Date.now();
  if (s.running){
    s.baseMs = clampNum(s.baseMs, 0) + (now - clampNum(s.since, 0));
    s.running = false; s.since = 0;
    cue(ctx, 'soft', 45);
  } else {
    s.running = true; s.since = now;
    if (!clampNum(s.lapStartMs, 0)) s.lapStartMs = now;
    cue(ctx, 'soft', 50);
  }
  project(ctx);
}
export function toggleRun(ctx){ _toggleRun(ctx); }
export function lap(ctx){
  var s = ctx.state || (ctx.state = {});
  var now = Date.now();
  if (!s.running) return;
  var cur = now - clampNum(s.lapStartMs, now);
  if (!Array.isArray(s.laps)) s.laps = [];
  s.laps.push(cur);
  s.lapStartMs = now;
  cue(ctx, 'tick', 40);
  project(ctx);
}
export function reset(ctx){
  var s = ctx.state || (ctx.state = {});
  s.running = false; s.baseMs = 0; s.since = 0; s.lapStartMs = 0; s.laps = [];
  cue(ctx, 'pop', 45);
  project(ctx);
}
export function refresh(ctx){ project(ctx); }
function project(ctx, nowMs){
  var s = ctx.state || (ctx.state = {});
  s.running = !!s.running;
  s.baseMs = clampNum(s.baseMs, 0);
  s.since = clampNum(s.since, 0);
  s.lapStartMs = clampNum(s.lapStartMs, 0);
  if (!Array.isArray(s.laps)) s.laps = [];
  var now = Number.isFinite(nowMs) ? nowMs : Date.now();
  var elapsed = s.baseMs + (s.running ? (now - s.since) : 0);
  var curLap = s.running ? (s.since > 0 ? now - s.lapStartMs : 0) : (s.laps.length ? s.laps[s.laps.length - 1] : 0);
  var c = ctx.computed || (ctx.computed = {});
  c.elapsedText = fmtStopwatch(elapsed);
  c.lapText = fmtStopwatch(curLap);
  c.running = !!s.running;
  c.lapCount = s.laps.length;
  c.laps = s.laps.map(function (ms, i){ return { idx: i + 1, timeStr: fmtStopwatch(ms) }; });
  c.showLaps = s.laps.length > 0;
  c.primaryLabel = s.running ? ctx.t('btnPause', 'Pause') : ctx.t('btnStart', 'Start');
  c.capsuleSummary = c.elapsedText;
  c.capsuleBadge = s.laps.length ? (s.laps.length + ' ' + ctx.t('lapsUnit', 'laps')) : (s.running ? ctx.t('running', 'running') : ctx.t('stopped', 'stopped'));
}
