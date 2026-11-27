
function pad2(n){ n = Math.floor(Number(n) || 0); return (n < 10 ? '0' : '') + n; }
function clampNum(v, d){ const n = Number(v); return Number.isFinite(n) ? n : d; }
function cue(ctx, name, vol){ try { ctx.dispatch({ type: 'audio.cue', cue: name, volume: String(vol) }); } catch (e) {} }
function toastMsg(ctx, msg){ try { if (ctx.ui && ctx.ui.toast) { ctx.ui.toast(msg); return; } } catch (e) {} try { ctx.dispatch({ type: 'toast.show', title: '', message: msg }); } catch (e2) {} }

function fmtTimer(ms){
  ms = Math.max(0, ms);
  var totalSec = Math.ceil(ms / 1000);
  var m = Math.floor(totalSec / 60); var s = totalSec - m * 60;
  return pad2(m) + ':' + pad2(s);
}
function _startTimer(ctx){
  var s = ctx.state || (ctx.state = {});
  var args = ctx.args || {};
  var mins = Number(args.mins);
  if (!mins || mins <= 0) mins = clampNum(s.durationMin, 5);
  s.durationMin = mins;
  var now = Date.now();
  s.endAtMs = now + mins * 60000;
  s.remainingMs = mins * 60000;
  s.running = true;
  cue(ctx, 'soft', 50);
  project(ctx);
}
function _toggleTimer(ctx){
  var s = ctx.state || (ctx.state = {});
  var now = Date.now();
  if (s.running){
    s.remainingMs = Math.max(0, clampNum(s.endAtMs, 0) - now);
    s.running = false; s.endAtMs = 0;
    cue(ctx, 'soft', 45);
  } else if (clampNum(s.remainingMs, 0) > 0){
    s.endAtMs = now + clampNum(s.remainingMs, 0);
    s.running = true;
    cue(ctx, 'soft', 50);
  } else {
    _startTimer(ctx); return;
  }
  project(ctx);
}
function _resetTimer(ctx){
  var s = ctx.state || (ctx.state = {});
  s.running = false;
  s.remainingMs = clampNum(s.durationMin, 5) * 60000;
  s.endAtMs = 0;
  cue(ctx, 'pop', 45);
  project(ctx);
}
export function onInit(ctx){ project(ctx); }
export function onTick(ctx, nowUnixMs){
  var s = ctx.state || (ctx.state = {});
  var now = Number.isFinite(nowUnixMs) ? nowUnixMs : Date.now();
  if (s.running){
    var remaining = Math.max(0, clampNum(s.endAtMs, 0) - now);
    if (remaining <= 0){
      s.running = false; s.remainingMs = 0; s.endAtMs = 0;
      var doneSound = ctx.settings ? ctx.settings.soundOnDone : true;
      if (!(doneSound === false || doneSound === 'false')) cue(ctx, 'bell', 65);
      toastMsg(ctx, ctx.t('doneToast', 'Timer finished'));
    } else {
      s.remainingMs = remaining;
    }
  }
  project(ctx, nowUnixMs);
}
export function onSettingsChange(ctx){ project(ctx); }
export function startTimer(ctx){ _startTimer(ctx); }
export function toggleTimer(ctx){ _toggleTimer(ctx); }
export function resetTimer(ctx){ _resetTimer(ctx); }
export function refresh(ctx){ project(ctx); }
function project(ctx, nowMs){
  var s = ctx.state || (ctx.state = {});
  s.running = !!s.running;
  s.durationMin = clampNum(s.durationMin, 5);
  s.remainingMs = clampNum(s.remainingMs, s.durationMin * 60000);
  s.endAtMs = clampNum(s.endAtMs, 0);
  var now = Number.isFinite(nowMs) ? nowMs : Date.now();
  var remaining = s.remainingMs;
  if (s.running) remaining = Math.max(0, s.endAtMs - now);
  var total = s.durationMin * 60000;
  var c = ctx.computed || (ctx.computed = {});
  c.displayText = fmtTimer(remaining);
  c.pct = total > 0 ? Math.round(remaining / total * 100) : 0;
  c.pctText = c.pct + '%';
  c.running = !!s.running;
  var isFull = remaining >= total;
  c.primaryLabel = s.running ? ctx.t('btnPause', 'Pause') : (isFull ? ctx.t('btnStart', 'Start') : ctx.t('btnResume', 'Resume'));
  c.capsuleSummary = c.displayText;
  c.capsuleBadge = s.running ? '▶' : '⏸';
  c.showReset = s.running || (!isFull) || remaining <= 0;
}
