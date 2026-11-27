var TRACK_EXACT = [
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'yclid', 'ysclid', 'twclid', 'ttclid',
  'igshid', 'igsh', 'mc_cid', 'mc_eid', '_hsenc', '_hsmi', 'mkt_tok', 'vero_id', 'vero_conv', 'oly_anon_id',
  'oly_enc_id', 'rb_clickid', 's_cid', 'li_fat_id', 'epik', '_ga', '_gl', 'wt_mc', 'wt_zmc', 'spm', 'scm',
  'ncid', 'sr_share', 'cmpid', '__s', '_openstat', 'ref_src', 'ref_url', 'trk', 'trkcampaign', 'sc_cid',
  'srsltid', 'si_source', 'zanpid', 'irclickid', 'click_id', 'clickid'
];
var TRACK_PREFIX = ['utm_', 'hsa_', 'pk_', 'mtm_', 'ga_', 'pf_rd_', 'pd_rd_', '_branch_'];
var REFERRAL = ['ref', 'referrer', 'share', 'share_source', 'feature', 'si'];

function safeDecode(v){ try { return decodeURIComponent(String(v).replace(/\+/g, ' ')); } catch (e) { return String(v); } }
function wantsReferral(ctx){
  if (!ctx.settings) return true;
  var v = ctx.settings.stripReferral;
  return !(v === false || v === 'false');
}
function isTracker(key, referral){
  if (TRACK_EXACT.indexOf(key) >= 0) return true;
  for (var i = 0; i < TRACK_PREFIX.length; i++){
    if (key.indexOf(TRACK_PREFIX[i]) === 0) return true;
  }
  return referral && REFERRAL.indexOf(key) >= 0;
}
function extractUrl(text){
  var m = /https?:\/\/[^\s<>"']+/i.exec(String(text || ''));
  if (!m) return '';
  var url = m[0];
  while (url.length && '.,;:!?)]}'.indexOf(url.charAt(url.length - 1)) >= 0){
    var last = url.charAt(url.length - 1);
    if (last === ')' && url.split('(').length >= url.split(')').length) break;
    url = url.slice(0, -1);
  }
  return url;
}
function cleanUrl(url, referral){
  var hashIdx = url.indexOf('#');
  var hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
  var rest = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  var q = rest.indexOf('?');
  if (q < 0) return { url: url, removed: [] };
  var base = rest.slice(0, q);
  var parts = rest.slice(q + 1).split('&');
  var kept = [];
  var removed = [];
  for (var i = 0; i < parts.length; i++){
    var part = parts[i];
    if (!part) continue;
    var key = safeDecode(part.split('=')[0]).trim().toLowerCase();
    if (key && isTracker(key, referral)){
      if (removed.indexOf(key) < 0) removed.push(key);
    } else {
      kept.push(part);
    }
  }
  return { url: base + (kept.length ? '?' + kept.join('&') : '') + hash, removed: removed };
}
function hostOf(url){
  var noScheme = url.replace(/^https?:\/\//i, '');
  var host = noScheme.split(/[\/?#]/)[0] || '';
  return host.replace(/^www\./i, '');
}
function shorten(text, max){ return text.length > max ? text.slice(0, max - 1) + '\u2026' : text; }

function analyze(ctx){
  var clip = (ctx.env && ctx.env.clipboard) ? ctx.env.clipboard : null;
  var text = clip && clip.text != null ? String(clip.text) : '';
  var url = extractUrl(text);
  if (!url) return { hasLink: false, url: '', clean: '', removed: [] };
  var res = cleanUrl(url, wantsReferral(ctx));
  return { hasLink: true, url: url, clean: res.url, removed: res.removed };
}

export function onInit(ctx){ project(ctx); }
export function onSettingsChange(ctx){ project(ctx); }
export function copyClean(ctx){
  var s = ctx.state;
  var a = analyze(ctx);
  if (!a.hasLink){
    ctx.ui.toast(ctx.t('emptyTitle', 'No link in clipboard'));
    project(ctx);
    return;
  }
  ctx.ui.copy(a.clean);
  if (a.removed.length > 0){
    var n = Number(s.cleanedCount);
    s.cleanedCount = (Number.isFinite(n) ? n : 0) + 1;
  }
  ctx.ui.toast(ctx.t('statusCopied', 'Clean link copied'));
  project(ctx);
}
function project(ctx){
  var s = ctx.state;
  var c = ctx.computed;
  var n = Number(s.cleanedCount);
  s.cleanedCount = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  var a = analyze(ctx);
  c.hasLink = a.hasLink ? 'true' : 'false';
  c.originalText = a.hasLink ? shorten(a.url, 180) : '';
  c.cleanUrl = a.hasLink ? a.clean : '';
  c.cleanText = a.hasLink ? shorten(a.clean, 240) : '';
  c.hasRemoved = a.removed.length > 0 ? 'true' : 'false';
  c.removedText = a.removed.length ? (ctx.t('lblRemoved', 'Removed') + ': ' + a.removed.join(', ')) : '';
  c.statusBadge = a.removed.length ? ('-' + a.removed.length) : ctx.t('statusClean', 'Already clean');
  c.statusTone = a.removed.length ? 'warning' : 'emerald';
  c.cleanedText = ctx.t('lblCleaned', 'Links cleaned') + ': ' + s.cleanedCount;
  c.capsuleSummary = a.hasLink ? hostOf(a.clean) : ctx.t('emptyTitle', 'No link in clipboard');
  c.capsuleBadge = a.removed.length ? String(a.removed.length) : String(s.cleanedCount);
}
