// ==UserScript==
// @name         Afkersi – cennik klanowy
// @namespace    afkersi-cennik
// @version      1.4
// @description  Cena z cennika klanu Afkersi i kolejka klanu w opisie legendy oraz przy łupie. Niczego nie klika za gracza.
// @author       Gwarek
// @match        https://*.margonem.pl/*
// @match        https://polsz6868-droid.github.io/cennik-legend/*
// @exclude      https://www.margonem.pl/*
// @exclude      https://forum.margonem.pl/*
// @icon         https://polsz6868-droid.github.io/cennik-legend/favicon-32.png
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @run-at       document-idle
// @updateURL    https://polsz6868-droid.github.io/cennik-legend/afkersi-cennik.user.js
// @downloadURL  https://polsz6868-droid.github.io/cennik-legend/afkersi-cennik.user.js
// ==/UserScript==

(function () {
  'use strict';

  var API = 'https://script.google.com/macros/s/AKfycbzSRNsUj6ps2-uSCuPPimz_p6-CDQBxsiJOczW7xSfwvjshSzQFCdWuib0oL7ugApkCmg/exec';
  var STRONA = 'https://polsz6868-droid.github.io/cennik-legend/#konto';
  var CO_ILE = 10 * 60 * 1000; // odświeżanie danych co 10 minut

  // ---------- strona klanu: automatyczne połączenie (bez wklejania klucza) ----------
  if (location.hostname === 'polsz6868-droid.github.io') {
    var polacz = function (proba) {
      var ses = null; try { ses = localStorage.getItem('cl_sesja'); } catch (e) {}
      if (!ses) { if (proba < 6) setTimeout(function () { polacz(proba + 1); }, 5000); return; }
      document.documentElement.setAttribute('data-afk-dodatek', GM_getValue('afk.klucz', '') ? 'ok' : 'jest');
      if (GM_getValue('afk.klucz', '') && GM_getValue('afk.kluczDo', 0) > Date.now() + 30 * 864e5) return;
      GM_xmlhttpRequest({
        method: 'POST', url: API, data: JSON.stringify({s: ses, akcja: 'kluczDodatku'}), headers: {'Content-Type': 'text/plain;charset=utf-8'}, timeout: 30000,
        onload: function (r) {
          var j = null; try { j = JSON.parse(r.responseText); } catch (e) {}
          if (!j || !j.ok || !j.klucz) return;
          GM_setValue('afk.klucz', j.klucz); GM_setValue('afk.kluczDo', Date.now() + 180 * 864e5); GM_setValue('afk.czas', 0);
          document.documentElement.setAttribute('data-afk-dodatek', 'ok');
          var t = document.createElement('div');
          t.textContent = '✅ Dodatek Afkersi połączony – możesz wejść do gry';
          t.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;background:#e8c46a;color:#1a1406;font:600 13px Arial,sans-serif;padding:10px 18px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.5)';
          document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4000);
        }
      });
    };
    setTimeout(function () { polacz(0); }, 1500);
    // strona klanu podmienia dokument po wczytaniu – oznaczenie „dodatek jest” odnawiamy przez chwilę
    var n = 0, t2 = setInterval(function () {
      if (++n > 15) clearInterval(t2);
      if (GM_getValue('afk.klucz', '')) document.documentElement.setAttribute('data-afk-dodatek', 'ok');
    }, 2000);
    return;
  }

  var dane = GM_getValue('afk.dane', null);
  var ceny = {}, kolejki = {}, nazwy = [];

  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function cena(c) { return c == null ? 'do ustalenia' : String(Math.round(c * 100) / 100).replace('.', ',') + 'g'; }

  // ---------- styl ----------
  var css = document.createElement('style');
  css.textContent =
    '.afk-line{display:block!important;clear:both!important;float:none!important;position:static!important;width:100%!important;box-sizing:border-box!important;' +
    'margin:8px 0 4px!important;padding:6px 2px 0!important;border-top:1px solid rgba(232,196,106,.22)!important;font:12px/1.45 Arial,sans-serif!important;text-align:left!important;color:#d8d2c0!important}' +
    '.afk-row{display:flex!important;justify-content:space-between!important;align-items:baseline!important;gap:10px!important;margin:0!important}' +
    '.afk-lbl{color:#9a937f!important;font-size:11px!important;font-weight:400!important}' +
    '.afk-val{color:#e8c46a!important;font-weight:700!important;font-size:12px!important}' +
    '.afk-line .afk-q{display:block!important;color:#9fb4ff!important;font-size:11px!important;margin-top:2px!important;text-align:left!important}' +
    '.afk-box{position:fixed;left:14px;bottom:14px;z-index:99999;width:290px;padding:12px 14px;border-radius:12px;background:rgba(16,19,26,.82);backdrop-filter:blur(8px);' +
    'border:1px solid rgba(255,255,255,.08);color:#e6e2d6;font:13px/1.5 Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.45)}' +
    '.afk-box b{color:#e8c46a}.afk-box input{width:100%;box-sizing:border-box;margin:8px 0;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.35);color:#fff;font:12px monospace}' +
    '.afk-box button{cursor:pointer;border:0;border-radius:8px;padding:6px 12px;font:600 12px Arial,sans-serif;background:#e8c46a;color:#1a1406;margin-right:6px}' +
    '.afk-box button.afk-x{background:rgba(255,255,255,.08);color:#cfc9bb}.afk-box a{color:#e8c46a}' +
    '.afk-loot{margin:6px;padding:7px 10px;border-radius:10px;background:rgba(16,19,26,.85);border:1px solid rgba(232,196,106,.25);color:#e6e2d6;font:12px/1.5 Arial,sans-serif}' +
    '.afk-loot b{color:#e8c46a}.afk-loot .afk-q{color:#9fb4ff}.afk-loot{position:relative}.afk-zam{position:absolute;right:8px;top:4px;cursor:pointer;color:#8a8676;font-size:14px}.afk-zam:hover{color:#fff}';
  document.head.appendChild(css);

  // ---------- dane ----------
  function zbuduj() {
    ceny = {}; kolejki = {}; nazwy = [];
    if (!dane) return;
    (dane.ceny || []).forEach(function (x) { var k = norm(x.n); if (!ceny[k]) ceny[k] = x; });
    (dane.kolejki || []).forEach(function (x) { var k = norm(x.n); (kolejki[k] = kolejki[k] || []).push(x); });
    var wszystkie = {};
    Object.keys(ceny).concat(Object.keys(kolejki)).forEach(function (k) { if (k.length > 3) wszystkie[k] = 1; });
    nazwy = Object.keys(wszystkie).sort(function (a, b) { return b.length - a.length; });
  }

  function opisKolejki(lista) {
    return lista.map(function (k) {
      var miejsca = [];
      (k.q || []).forEach(function (m, i) {
        if (!m || !m.length) return;
        miejsca.push((i + 1) + '. ' + m.map(function (n) { return n === '?' ? 'wolne' : n; }).join('/'));
      });
      return (lista.length > 1 ? k.e + ': ' : '') + (miejsca.length ? miejsca.join(' · ') : 'pusta');
    }).join('<br>');
  }

  function linia(k) {
    var c = ceny[k], q = kolejki[k], h = '';
    if (c) h += '<div class="afk-row"><span class="afk-lbl">Cennik Afkersi</span><span class="afk-val">' + esc(cena(c.c)) + '</span></div>';
    if (q) h += '<div class="afk-row"><span class="afk-lbl">Kolejka klanu</span></div><span class="afk-q">' + esc(opisKolejki(q)).replace(/&lt;br&gt;/g, '<br>') + '</span>';
    return h;
  }

  function pobierz(cicho) {
    var klucz = GM_getValue('afk.klucz', '');
    if (!klucz) { if (!cicho) pokazKlucz(); return; }
    GM_xmlhttpRequest({
      method: 'GET',
      url: API + '?format=dodatek&s=' + encodeURIComponent(klucz),
      timeout: 30000,
      onload: function (r) {
        var j = null; try { j = JSON.parse(r.responseText); } catch (e) {}
        if (!j) return;
        if (j.blad) { if (j.blad === 'klucz') pokazKlucz('Klucz wygasł albo jest błędny – pobierz nowy.'); return; }
        dane = j; GM_setValue('afk.dane', j); GM_setValue('afk.czas', Date.now()); zbuduj();
      }
    });
  }

  // ---------- okienko z kluczem ----------
  function pokazKlucz(blad) {
    if (document.querySelector('.afk-box')) return;
    var b = document.createElement('div');
    b.className = 'afk-box';
    b.innerHTML = '<b>Afkersi – cennik klanowy</b><br>' + (blad ? '<span style="color:#ff8a7a">' + esc(blad) + '</span><br>' : '') +
      'Otwórz raz <a href="' + STRONA + '" target="_blank" rel="noopener">stronę klanu</a> (zalogowany) – dodatek połączy się sam. Potem odśwież grę.' +
      '<details style="margin-top:6px"><summary style="cursor:pointer;color:#8a8676;font-size:12px">albo wklej klucz ręcznie</summary><input placeholder="klucz…" autocomplete="off"><button class="afk-ok">Zapisz</button></details>' +
      '<div style="margin-top:8px"><button class="afk-x">Zamknij</button></div>';
    document.body.appendChild(b);
    b.querySelector('.afk-ok').onclick = function () {
      var v = b.querySelector('input').value.trim();
      if (!v) return;
      GM_setValue('afk.klucz', v); b.remove(); pobierz();
    };
    b.querySelector('.afk-x').onclick = function () { b.remove(); };
    b.querySelector('input').addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') b.querySelector('.afk-ok').click(); });
  }
  try { GM_registerMenuCommand('Afkersi: ustaw klucz', function () { pokazKlucz(); }); } catch (e) {}
  try { GM_registerMenuCommand('Afkersi: odśwież cennik', function () { pobierz(); }); } catch (e) {}
  // włączanie/wyłączanie – zapamiętywane
  function wl(k) { return GM_getValue('afk.' + k, true); }
  function przelacz(k, opis) {
    GM_setValue('afk.' + k, !wl(k));
    document.querySelectorAll(k === 'dymek' ? '.afk-line' : '.afk-loot').forEach(function (e) { e.remove(); });
    pokazInfo(opis + ': ' + (wl(k) ? 'włączone' : 'wyłączone'));
  }
  function pokazInfo(t) {
    var b = document.createElement('div'); b.className = 'afk-box'; b.textContent = t; document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 2200);
  }
  try { GM_registerMenuCommand('Afkersi: cena w dymku – wł./wył.', function () { przelacz('dymek', 'Cena w dymku'); }); } catch (e) {}
  try { GM_registerMenuCommand('Afkersi: kolejka przy łupie – wł./wył.', function () { przelacz('lup', 'Kolejka przy łupie'); }); } catch (e) {}

  // ---------- dymek przedmiotu ----------
  function znajdzNazwe(tekst) {
    var t = norm(tekst);
    for (var i = 0; i < nazwy.length; i++) if (t.indexOf(nazwy[i]) >= 0) return nazwy[i];
    return null;
  }

  function dopiszDoDymkow() {
    if (!nazwy.length || !wl('dymek')) return;
    var tipy = document.querySelectorAll('.tip-wrapper, #tip');
    for (var i = 0; i < tipy.length; i++) {
      var tip = tipy[i];
      if (!tip.offsetParent && tip.style.display === 'none') continue;
      var nazwaEl = tip.querySelector('.item-name, .item-head .name, b');
      var zrodlo = nazwaEl ? nazwaEl.textContent : (tip.textContent || '').slice(0, 120);
      var k = znajdzNazwe(zrodlo) || znajdzNazwe((tip.textContent || '').slice(0, 160));
      var stara = tip.querySelector('.afk-line');
      if (!k) { if (stara) stara.remove(); continue; }
      if (stara && stara.getAttribute('data-k') === k) continue;
      if (stara) stara.remove();
      var h = linia(k); if (!h) continue;
      var d = document.createElement('div');
      d.className = 'afk-line'; d.setAttribute('data-k', k); d.innerHTML = h;
      wstaw(tip, d);
    }
  }

  // wstawia nasz wiersz nad „Wartość” – gra trzyma ją przyklejoną do dołu dymka
  function wstaw(tip, d) {
    var cel = tip.querySelector('.content') || tip, w = null;
    var el = cel.querySelectorAll('*');
    for (var i = 0; i < el.length; i++) {
      if (/^\s*Warto/.test(el[i].textContent || '') && el[i].children.length < 4) { w = el[i]; break; }
    }
    if (!w) { cel.appendChild(d); return; }
    // najwyższy przodek „Wartości” w obrębie dymka
    while (w.parentNode && w.parentNode !== cel && w.parentNode !== tip) w = w.parentNode;
    var poz = getComputedStyle(w).position;
    if (poz === 'absolute' || poz === 'fixed') {
      cel.appendChild(d);
      d.style.setProperty('margin-bottom', (w.offsetHeight + 6) + 'px', 'important');
    } else {
      w.parentNode.insertBefore(d, w);
    }
  }

  // ---------- okno łupu (tytan / heros) ----------
  function nazwaPrzedmiotu(el) {
    try {
      var m = /item-id-(\d+)/.exec(el.className || '');
      if (m && window.Engine && Engine.items && Engine.items.getItemById) {
        var it = Engine.items.getItemById(+m[1]);
        if (it) return it.name || (it.d && it.d.name) || '';
      }
    } catch (e) {}
    return el.getAttribute('data-name') || el.getAttribute('tip') || '';
  }

  function przyLupie() {
    var okno = document.querySelector('.loot-window');
    if (!okno || !okno.offsetParent || !wl('lup') || okno.getAttribute('data-afk-zamkniete')) return;
    var wpisy = [], widziane = {};
    var itemy = okno.querySelectorAll('.item');
    for (var i = 0; i < itemy.length; i++) {
      var n = nazwaPrzedmiotu(itemy[i]), k = znajdzNazwe(n);
      if (k && kolejki[k] && !widziane[k]) { widziane[k] = 1; wpisy.push('<b>' + esc(kolejki[k][0].n) + '</b>: <span class="afk-q">' + esc(opisKolejki(kolejki[k])).replace(/&lt;br&gt;/g, '<br>') + '</span>'); }
    }
    var box = okno.querySelector('.afk-loot');
    if (!wpisy.length) { if (box) box.remove(); return; }
    var h = '<span class="afk-zam" title="Zamknij">×</span><b>Kolejka klanu Afkersi</b><br>' + wpisy.join('<br>');
    if (!box) {
      box = document.createElement('div'); box.className = 'afk-loot'; okno.appendChild(box);
      box.addEventListener('click', function (e) { if (e.target.classList.contains('afk-zam')) { okno.setAttribute('data-afk-zamkniete', '1'); box.remove(); } });
    }
    if (box.innerHTML !== h) box.innerHTML = h;
  }

  // ---------- start ----------
  zbuduj();
  var czas = GM_getValue('afk.czas', 0);
  if (!dane || Date.now() - czas > CO_ILE) pobierz(); else if (!GM_getValue('afk.klucz', '')) pokazKlucz();
  setInterval(function () { if (!document.hidden) pobierz(true); }, CO_ILE);
  setInterval(function () { if (!document.hidden) { dopiszDoDymkow(); przyLupie(); } }, 250);
})();
