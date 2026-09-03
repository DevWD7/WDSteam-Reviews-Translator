// ==UserScript==
// @name         WDSteam Reviews Translator
// @name:ar      WDSteam مترجم مراجعات
// @namespace    https://github.com/DevWD7
// @version      1.1.1
// @description  Translate Steam reviews and comments instantly, in any language, right inside the page.
// @description:ar ترجمة مراجعات وتعليقات ستيم فوريًا لأي لغة داخل الصفحة.
// @author       Wdox
// @license      MIT
// @match        https://store.steampowered.com/app/*
// @match        https://store.steampowered.com/*/app/*
// @match        https://steamcommunity.com/app/*
// @match        https://steamcommunity.com/id/*/recommended*
// @match        https://steamcommunity.com/profiles/*/recommended*
// @match        https://steamcommunity.com/comment/*
// @connect      translate.googleapis.com
// @connect      clients5.google.com
// @connect      translate.google.com
// @connect      api.mymemory.translated.net
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(async function () {
  'use strict';

  if (window.__wdtSteamTranslatorLoaded) return;
  window.__wdtSteamTranslatorLoaded = true;

  const IS_TOP_FRAME = window.top === window.self;

  const PCACHE_KEY = 'wdt_cache_v2';

  function storageGet(defaults) {
    return new Promise((resolve) => {
      const out = {};
      Object.keys(defaults).forEach((key) => {
        let value;
        try {
          value = GM_getValue(key, defaults[key]);
        } catch (e) {
          value = defaults[key];
        }
        out[key] = value === undefined || value === null || value === '' ? defaults[key] : value;
      });
      resolve(out);
    });
  }

  function storageSet(obj) {
    return new Promise((resolve) => {
      Object.keys(obj).forEach((key) => {
        try {
          GM_setValue(key, obj[key]);
        } catch (e) {}
      });
      resolve();
    });
  }

  function cacheLoad() {
    return new Promise((resolve) => {
      let saved;
      try {
        saved = JSON.parse(GM_getValue(PCACHE_KEY, '[]'));
      } catch (e) {
        saved = [];
      }
      resolve(Array.isArray(saved) ? saved : []);
    });
  }

  function cacheSave(entries) {
    try {
      GM_setValue(PCACHE_KEY, JSON.stringify(entries));
    } catch (e) {}
  }

  function onSettingsChanged() {}

  const HAS_GM_XHR = typeof GM_xmlhttpRequest === 'function';

  function httpRequest(opts) {
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => {
        if (settled) return;
        settled = true;
        resolve(v);
      };
      const timeout = opts.timeout || 20000;

      if (HAS_GM_XHR) {
        try {
          GM_xmlhttpRequest({
            method: opts.method || 'GET',
            url: opts.url,
            data: opts.data,
            headers: opts.headers || {},
            timeout: timeout,
            anonymous: true,
            onload: (r) => done({ status: r.status, text: r.responseText || '' }),
            onerror: () => done({ status: 0, text: '', failure: 'network' }),
            ontimeout: () => done({ status: 0, text: '', failure: 'timeout' }),
            onabort: () => done({ status: 0, text: '', failure: 'abort' }),
          });
          return;
        } catch (e) {}
      }

      try {
        const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
        if (ctrl) {
          setTimeout(() => {
            try {
              ctrl.abort();
            } catch (e) {}
          }, timeout);
        }
        fetch(opts.url, {
          method: opts.method || 'GET',
          body: opts.data,
          headers: opts.headers || {},
          credentials: 'omit',
          signal: ctrl ? ctrl.signal : undefined,
        })
          .then((r) => r.text().then((txt) => done({ status: r.status, text: txt })))
          .catch(() => done({ status: 0, text: '', failure: 'network' }));
      } catch (e) {
        done({ status: 0, text: '', failure: 'network' });
      }
    });
  }

  const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAABQCElEQVR42u29Z5gd1ZUu/K69q+qEzq0MykIIAZIAgcCkFtnGOIxt8Hgcr+Ncx3GYO3PHdwbjCQ5jjz22x3lwToPtccAYG2MQSAIBEkhCCQnl2FLnk6tqr+/H3qfyOd14/n79PC119zlVp6r22iu+612E8IvCH+8k4C4V/1vwHh4YGJDrAGDdOi94gQhrrnvtrFGvOhOeO125bq9SPgsGKQJL8z4fgIyckFkSJEDKZx/EAJNgSYp8BgDBkvRRgCIwAEhpmZN5sYtjlkTks/4MC5CA73uIf7b+OzMTmIlYKRaSAH0NLCQpRSwl4PsAoI/3GCRZEAmhAA+AFX6wOR8pYmYmIn2e5jn1e6zgPT48c70gyUwg4uYzUgo+W5bLzGSeK7NSQgoqkZUbzPV3n9r+mx+OxJdlwMLtMxn33KOi6xT5P/aYoutJicUlACpbKADcfrvAPfdw8z2Xv+xtsyZGTl/jVqvXK6VW+76/WCm/G2AHIDAzKPUxsRWLX27zqpvvD16n+OUHv3Ob9+gTs3mdYodGnwtnyHnWpXJ4XZnPlTKeLzKePbV4BhT7rNSu0+etCaIRIeRBIeXTlu081F3oWv/kuntOBqJ4++0wa5Rxg3cScFf0IokmuYvgjlevXi03b97sAsBFN75uoFYuvbNRq7xY+X6/8j0o5YOVCi6VQIrBoNgNh9cSvCvyU/N1Nu+Ivho9nBIXmDxDcguENxRfgPgyhq9RxlIlt1PsWObgUbYTg9h5k0Ievz1kHt78DBIQQoIEgYhGhJS/zhUK39y18TePaoUwYGHdOr+F9DEA0bxEytjpTS0QefPtBNzjX3rTGy4sl0bvqlcrr3LdBpTngsE+gRgEEREoyrrxyTZDckEoEIZWTyShz1KfQ5PsyMm/KCawWjsld6i+l7QQTn7l4buneKVs3scAK/2ISAohIaSEbdu/yhXy/7Bjw2+24vbbJe45n0NTficBdyU3tqL2z/JOYU6AC6555V9XSxMfcxv1ou/WmUgoEAkKbh1TWqz4zgkv5X++VIgIzJ9wpjaWgKIX2bQ8L2DhgvdwxNBy/Gon0xzI0j5EIGZmZgVACMsmKURN2vbHn9/y4Cci2sBLbPbAV5BJVR/8f+edAuvuUmte/L7uzmnTflItld5Xr5ZtsO8LIQWIBBJbnqbyIKLPkrKdDZri+dIPiSILRi0cGWRfMbU/LzclPbmOba6/5Upmilf6qKzdGW6kiEUgIUBErHxf+b4D0A39sxdevOC8i+4/te53FQwMWDh0KOoXCK0R1hElBCxqI9RlN7xx2sjY4G8atcrlXr3mkhBW4Ak1RTrDwQse2iR7o5UiTN9w+30W3yHUxult7cBFvY2sh51WGJzxHs70TVp/enh3mLImocA8ImLIKdRKzMyeZdm2EPLpXJd9256Nfzie8AsoyweICfaqgVf0lCYqDzRqlUt9z3WFEDYn7F17tZklBK2ik/hjjytyijmErc9AGQuYNAiUeUVIXSu1FLC0Uzl1QY0/l0wvP3PHZws3x01BYJqavqXypLQsy5J7cj2F63Y/+ruTOoo7n6O+gEBSqw0MiNtv/y8xMVG+x61XL/U91yUiO35FoR5vZQLY3BRFFDJlhl6UUuKcsYM5oeBTi0hZu4gi+wuJxxy9TrRdeJA2XRS5r7RY0aQaKlg2isdgHHmCWdELp0wjxw2leRNTeAQRWb7neZ6nltVGq/esfuc7LQwOJh86y9jaDQxIrFvn1fPDn/Bd901eo64Xv10sn9ohocIkQkQE0MIuE1qHIxlLTmkPIdjXZic039LKl6DMxaKMs2aEMzH7m/Y1qO3ypxeYEoJOLdwFiu17ynZnOC6GRCSUUi4JsbBxbLh/5Il19+L2mQI7d3Lq0Ka3uPSym66tV2vrvEbNIyGkCTUyJHmKnn4bRybrKMrwHeJebzJ2T4gTJXQMx3UIJY4LbXnSYNDUPPumoPNkfkerfEA8qsiy9qHNj15tPHPAoQpIXQMze7ads3KF/Euee/L390f9gTAKWLOGVheutsZrJ3+mfG+OyW4IfX7KdBTS6r+V/0uZv1JKZKjtw8tepKj1DwWAphAJ0qSRQnZKiWJZCoopx5YRB2VHC1kmIHiORKnoJvk7tzGesTtgJiasWXXe2m8eWuf4wE4AYBGo/nvu8c94+14P4GLle34QInLccsddkPjv3MKipgSGEcsGIrGcrbz46PkpqVop3PEx20lx4YyHPdxmz1IgoJRKFsRfYUZgerhNOJr8VM5cslCgKENQOLrclJXDzJIAEkr5Pvvq3BPl428D7vEHBgZE1KBiYGBAPn/GfwbKP5+VrwIBoBcSjbf2ztv74ll2jicJnzLiGU5mWNMm5YUmnOLePUXU/WQ1hFbp6bTQg1qWRjIjkCAA4zB1nr7vxH0yFBGRZdsHF/QvOn/duu/UdUJgYEAC4OdH6AYCX8C+z5EE0RSsYXZCLZ5C5VRomB1bZ2UBsnYox/zxoLRmHkD8IcQjecYLMw3xWL158nh0EzqoaBHDxDVeU1tFszDMyXc1dSoHdxn83PT6o9fGEU2UfVOCla+YsehE9eQtAHj16tVWMwyEUP6bwGCOVgOTu5/bC0UyRqaMkIzaZMwpM9yZgghSXKtQSldwmxQrZyZ5qEURiLNVbMIPahVrUGyx0yEex66glehyypGNmwPO2kJaTbBSPrv12usAYHNnpz5s2ZUv7yqPDu1j5c8EK6NIqWWefrJcW2tTYEqqnH7Ik6V3uUVukSIaJe6V86TXneG+T175y3AO4/XLZtWGw9JN5jFZFUeeNNailD5FIjpom3pjMMiyrKHpc+Ys2fyHe8YEANQnRi4mYKau5zZjPs5U8MlFm6wqTqnQC5EFy9rjFNMYoQpskcFrRimEmCNI5g9CEKQQkFKChC5YKmb4voLvefB8H77vQynz+M37hZSQOsU+ieaI7tbIwjFlZAi4bY0injHhSWIpjhqFlomuhCgRs1IMTBsfK68CDKzFZ5xvVJMiXdY1BoVDlUWUuiyetDLHqWXjFrfHqYQIt9UsSaeoeagQBCIBxQqu66Fer8PzXBArSMtC3rGQcxw4eQdCaCFRPsN166jX66g0XLi+D2aCtGw4jgPHcSAFgRWDWbW4Lorl5bNijGQCPiinRBeQ4pHXVJ3XbI2VuV2VfkD1iwA8YgEAK/c8gjRrTEHlOZB0mkwdZi9kZpTP7Y1F80Gmlt8gclKCwwwhCEJI+J6PUqUCt15HPmdh5vRpWDD/XCxcuADz5s/HzJmzMW36NHR0dCBf6NDHMIOg4NaqKJfLmBgfw6mTp3Dk2BEc3H8Az+8/hOOnzqBWb8B2HBQKBUgpoJQKnK6o8maeHItFnNwSlCUmmb7RVDZfPIWUMMSkvUXP85YEGgCMeaGwRJyLSLoqJkuTRECtbOak4VhT8WRU5pBEBxl1LUCo1euoViro6izikguXYc1lq7Fy1UU4e8EidPdOg7Rz8JngeT483wczw9eAP1gG4FHolOiaJXGWIJwvJRxJEPBRHhvGwf37sPXpp/HEU5uxfcceDI9VUCgUUcjnwKy1QpZ2bLdZOCUC3NTRqVC4Vaos7Zwm3XDOTDgxMxSrswIBIKI+s/AUc46oha88hbgwWcxI1/vSUT1zm4dHoYQIY5vL5Qo8t4ali+fjxhtuxxXXDGDhknNhOQVUai6qtRrOjFXAXDamARDNDBvF/Xzfc+EaL0mxMj6EgGUVsPCCy3D+JVfitW+q4siBvdjw6CP43e//iD37DkLaDjo7is2Hmg5duXVinzi6VMmCcnY42V7Isncmp5APDOWrQnAp885/0cPMNMAqkgGMuZAUSCcT/cnx9VRsV0sv3JgAIQQqlQrcRg2rV52P2++4A6svvwq5rj6UKnVUqzUw+9rxEyLh9Idev6mcx0CooTMZ2QcAlK+glM6NFTsK6O7Io14axRMbHsGPf3IPNj+zA3Yuh45iEb7vZzqrUeEPEzmtap78Jz/D1imz4J59IaRkwr1Hd258mRXzPVKI1YR8EcVKkTSJNZjKrXBrSY3ELoC0JFzXxdjoCFaefw7e9OY344prrocrchgbm8DI4BAsqRedYAWLFwBVWYMpLSkgLQkyWoAA+E3nTjF8pQLzQEQwYBtYln5U9UoFJ0ol2LaDy2+4DVetvREb1z2Ib3/7u9i263l0dnXBtqQ+B8Vte2DEMjQdmefbdAr5BTh7cfgst3awOVxHaNBPE9zOGWUKDnKrhLiqCk/UfvfzC5LcDISAeVFKgbGxcfR1FfDuD70HL3v1n8OXRQyOjgKqDCklbLNAzDryIAYsy0K+WIC0bLBSaDTqqFWrKJcn4DYacBsuFCs4tg0nl0Oh2IFisQOWrSvgnueiUW/A9VwNk6KmMEiAfQwPDYOExJrrX4oXXbMWv/zpT/CNb30PoxMl9HR1wlcqVXeM5UEjljbAGxCDOVuvUlsTkIbQpiBlTZsTQTFbLRcrsvCcEepMFU//p4A9A+AaEZgVhoeGcP01V+D9H/wQZi44F6eHRuB7w3ohyNLBJutvx7ZRKBZARJgYH8PO7Xuwd88uHHh+L04eP4bhoSFUyhNo1OvwXL2wlrTg5HPo6OjEtOnTMXvO2ViwZCmWLluO+QsXoa+/H0oxatUqGq4bmCIpdeSkBcHCq9/0TgysXYtPf/pf8cdHN6G3rxeSSGuYBOS96WQTog4QtX1i3ApgklHUzvZDNB6UAp3Y9AGWv+hhgAaU8k3jDsVziJxVFOIpFVH/pC9mSClRq9VAysX73v0OvOp1b8Zw2UOlXILj2EG+X/kKDEaxWEA+l8fQ0BC2b3kKmx5bj907tuPksaOoVisg0h1F0rI0pp4IJCjUGkpB+R48z4My6jtfKGDmrLOw/IIVuOzKq3HJpWvQP3063EYDlUoVRCI4BxHg+QodnZ3oK0j8+Lt34wtf+SaE5SCfc+B5fuwZpmP1LGMx+aN+QVB4/cy0DwDce3TXxpcZAbjiIUCsVcr3CSSZspskOCqpxJm4Hk4VflrV91ovvmVZmCiVMGtaNz7+8Y9h+cVX4sSpM5ACICGCUFEphXw+j1wuh317n8NDD9yP9Q/9AcePHIRSDCeXg5PLQ0grUXDJeq6cKoEo34dbr6Ner0IQ4ay583Hl2htw860vxzlLz4XrNlCuVCGkgDA+he8rgATOnjUdzzz+EP7fP/wjBofH0N3ZAdfzY/iA0AxQZsIoGxxDqfAujWfMECQOTEDTCfzN0Z0bb0sLAJHkqe7qFrj+yRBBrTzk5uKPjY3igmWL8E+f/DQ6p83F8PAwHNsOYFie8mFbFjo7O7Fvz278/L9+hA0PPYDxsTHkCwU4uRxIyDApQxRCqShLPKPoIeNWcbQqBzArNOo11GtVdHV149obbsZrXvdGnLPsPJRKJTQaDQghdXYRQL3hYdbM6Rg/eRAf+tCHsXvfYfT0dMPzPLQstk3Z68+uirTLoEYSZ74QUsIIgASAnhnz3sKghbrlxQBFM66NOGH/Jy/StSmzJt7HDMuSGBkZxWUXX4hPf+4LoEIfxsfH4Dh2rJrR29ODcrmC737zq/iPz/wLdm7bAst2UOzs0g4fCe3pkgCEMDUAYTx6qX8m/bfYzyaNTMHfI+lvIliWjXyhA8r3sGPb03j4gftRLldw3vkr0NXVhUajbtolAGkJlEtlFHqm42W33oxnt27B/kNH0dFRNCElTbrILzygTlYUsmVAkBQg7B0/feSHEgC6Z8x9C4EWMivdE5DZaJmVfM8qOU4CFEAaTsbMsKTEyOgIrrxsFT7xb19ARVmoVSuwLFtLtUn59vT24omN6/Evf/83ePTB38O2HRQ6uwEDX9QLLfU3iaAAZPpYwiRQU0AoUkVq/oz4axQIgzD5CIlCsQjPdfHExnV44rH1mL9wMZYsPRe1WjVsSBWEWrUGynXg5S+5CVu3bMaBw8fQUShAKX5BG6h1cTlthqmNIBDAJIQAaF8gAD0z5r6FgZgGIEpDvydNBFKb16mF2ofe+WPjY7hkxTJ86nNfRNkTcGs1SGlpv1Up5HI52LaNu7/6JXzpX/8JExPj6O7pB4RILLze9cECBosZXWxCytFt5jaIgmRN7HiImDAoZpCQKBY7MHR6EA/e/xuwUrhkzRVQJpfQjBYa9TrYKeK2W27Apo2P4vjgEAp5p60mmCwX0MqktupWimV3hBAAPzd++sgPRauNy9HEQdpP+5PSf1kXJ4VAuVLB/Dkz8M+f+lfUkYNbrwXJGqV8dHZ1olqp4M6/+SB+8M2vIF/oQL7YCZ81eKm54/XCS4S1YYrs4gTIkqLgfAozhUQmURJ5nQgQTZMiASFBwgJIwmcg39EJ23HwzS99Dv/4d38N3/dQyOehlA8iwLIkapUKXKcbn/3sZzCjtwu1ekNnKrOBgS0rjqFXQi2qpFlAc2oZE2gBUJGOvSQEnCfRTTx5papVulgQ4HkeChbhXz75CdhdM1GtlGHZlinTeujq7saJY8fwf973Dmx69GH0TZ+pyRYQ2nUIaXa4jO9+olTole3cJDRDMw9idnvzG0JETEdT6Cyd2JEWevqn46Hf34e/+6t3Y3R0BB0dHToqMJnM0vg4umcvxCc/8XGQ8nQlkniSul92N1GQqWyhBbKAdlnYbAEAQhAnoR6xvER78F9rV6FtSlDn9ssTY/ib//MhzF92EUZHR2BblvbefR+dXV04fHA//vb978Kh/fvQ0z8Dvmrueq3ygagzF5GsANdLKQjaVNwlavFuQlMYyDiYEkShNuidNgM7tm7BRz/0XgwPDaHYtPfGyT19Zggr1lyLD77vLzE+NgYpZBxzmJnySaZ+OJKioUysRPK4GGNEZD0yTAAle5ZecKYnmYti4gQRgk70jI6M4DWvvA1rX/JnODk4CNuyNDLHqP1jRw7jox98D84MnkJndx98pbT6JdK73Xj5sWphUm6jWDlOArI5XQFhbmN1EWiAMFogsCCQ0Qier9Dd1499e3bi7z/yflQqZeRyjsEPMGxL4sjxQbzqdW/Ci6+/GqNj47AsmYLPUaqsyyk0ILeoGFKG2cgQ7tAEIMNqTLnfGy2gy/HqYwjqAEOAUKlUsXj+HLzjvX+FweEJWGYhlfLhODmMjozg43/3YZw+dRLFzm69841nr3d8tqohcCJhngBNMTeBvUH6OETWJuvnnPVEkWxTo6YgGiHwfUZ3Tx/27NiGT/zD3wIMSCkDxLIAY6hUxwc/8hHM6O9Gw/X0qRgZII7MC0Cym6pVtwPHgHcxfSBCAUg9sMm9fmpT0cveQBQDmXj1Ct77/vfDKvbBd+sACEopCCEgBOHTd30UB/Y+Z3Y+QNIKPXwh0rsyeYMtLjoa9cV8BEKqg4WQ8XrCcYxqg8AfERZ8xejpm4YN6/6Ir3/hs+ju6jLAEUAIgWqlgv6zFuM9f/k2lCfGTemaU5iIVk84jfrhlr5bqv1FX3/ECWSmeO55Ev/xBef2KcDTSykwPjaGm2+6DmuuuRHDIyOwTZaPweju7sbdX/sSNm14FN19/fBZgYng+55Wo0qBfQ+sPPO/r/83PEUq+n+Tu8i8zr4H5bnmNRfse0DzfdH3+B6U0t/6b37wevA+ZX5m817fNV4/BYLgK0Zf/3T8/Cffx29/9Qv09PSaUrPOe5w6PYQXv+I1uHz1KkyUyoEQTI6Wzu6hjv2V2tnmEEhuNT0BagvUzC5FIorzy2yij0ic2ZSe56G7o4A3vfUdGK/UIQ2EWymF7p4ePPLQg/jp97+Dnr5+KAVdrnVyKHT3QTp5iCCxQ5GqZljUQZD6DRtFKAZtiLB9caidqGkSqH17WsucFzPq1TIqY0PwFUP31eoUci5fwNe+8BlcsHIVps+ag1qtBiElmBVqSuLtb38btrzvQ5h6dP0/YULi2HpZ7RU7TYpx46gUECVivmb+Vh8lpMDY8Cje9Po7cPai8zB4+jQsy4Jihm3bGBkewje++FkNviAB5fvo7JuBfPd0uJ6LeqOh1Wjg8ccXOnWVTcGjuHPbVMWxWinFU96h/RdBS0sUqRjWxEwPrSDYuSKmz+3F+JmTqJbHtRD4DCdfwNCZ0/jaFz+Hj33y31A3FywFYWRkDCsvfRGuu/ZF+MO6x9Hd3WkKStR2+dOlemQX71p5Z+YhWEalcCb+LnFskraFotJEiR5ViqOKiADX9TCtrxu3vuI1GJ8omRAIYMUodnTgO1//Dxw5eAA9/dPheS46+mbC6ujFxNgImJUO/WIGPW61QhRzRmwaZ3hqATzL2guUhmfGCvkEwAUzw61VUbMsdE2bDQajVp6AEAJKeejq7cf6h/+ARx/6A6698WaMjY7p/gMwyi7jjtf+OdatfxysWqQqEhXCrE5LagMWSUc3ER8ArFoHCtRGlbRN8cbVlRAS5dI4brzxBsyZvwi1alVvUKVQ7Chiz85ncd8vforO7h54vodcsQtWsQeViVGdiJMyxjWSDHMoWWFL6+g4ZpsiRi8aVVB68aPoqKzytQ7bhNnxPsbHR9DRMx1SWiZNLQEiSCnxg299A9VSCZaUYDCEFJiYKGH5Raux+qIVKJdLkCSm7HslkcEtHfIkg5+pWhknkCje2s0JT5omzeskBSx5A77voaOQwy23vgzlas3k0/W5LMvCf33/26jWapC2AwLgdPSgUasG1bX4B3AkpOMwcqEmuCPafBeihZpwMVbhMfp4FXsvEt/BRyvzXkTeB4biCGCOBNj30XAbyHf2BGBSZqDQ0YXndj2LB393Hzq7unTOg/Um8MnGbS97GZTyIm3mbTz5DBDJlAuGSCSC9L+UMuwt25R48pNHvVEhCNVyCatWrsTcxeeiWqmABMFXPgqFInZufwaPrV+Hjq5uKKU0jh8Cvu8FoWO0EYpNvoBSuzsUYF/5QfNGXP1zsIC+4ojzyEgmRhSr0F/IaDlVrBc/IE7jEL3sui6knTNOK7QQgGA7Odz73/egWi4ZcIuOjEoTZVx6+ZWYe9Zs1OuNlllVbuuMUqJruY1KYN0ELNqtYrT1sVklI7yw2LCZ6la+i7U33AQmCeWrQMFIKXHvz+9BvV6H0ITKIPN/HMpq1K1JxOQdK67GzaI2HcKc1Ajg+HsieEci5C3j3hm4eDSaZgB5q0mHyLGGmeaTsS2JnG0HJiSWvWMFZTRC8zO1FujE3j278fjGR9FR7AgQyPV6HcXeabh8zWWoVqtacHhqrKNseAyjaSDOpBmjVH1ZIDNbTElLH6rPFwRN0KvsNhqYOWMaVq2+DOVyGSQEfKXg5PI4duQgnti4HsViJ1R6ncxihc5dpVLDWTP78Xd//UG4jTo8RkQFa+d0fGIMb/tfb8Rlqy/C2NhYuAjG3pdKZSxZcDY++IH3oVYpQXHYut7c1bVKGR/+wHuxYN4clCrVsI/ARCGjo6O4aeAqvOX1d2B4aAggERNaCjKgKpZC1uaA8dDv7gte8w2useb6WPOiKyFFXCtNCUbLiKeKszxCCsPkeDFoCmmfPzUhRCRQq1awYuXF6J42S9fGGfB9H7lcHhsfeRijY2OwnFyCf4BCCDMYJARyFqFgMa68+lqsWHM11lyyCjYp5HM5MADbkpDwcc78s3DV2huwduBaTO/tRN6CUcUCRZvQXbBw7drrcdnVa3HRhefDggvHllAg5GwJCy5WXrgcl15zHa4duBZFR6CYs0FCY//yNmF2fyeuuGYAa64ewNJFc+EI1oUsNIEjCtEtTNCZQobWAtufeRpHDh6A4zhQyocgQrVSxZJl52PmjOlwDfq49Rq0Mg5tQgiO1kQiiSClIoyBLeLPF4rxb6ohQQwoH6suudS0TzFgUr6NWgWbNjwK23YSHnwiB08C9WoZ/+sdb8O1192Act3D0PAo3vGe9wPKx49/+AP8+v4HcdnK8/GBD/4VhOXA9QnLV1yMr3z9Gzj0/F786+e+gFKpjLe96y9x8ZorABIYHy/hw//3o5Dw8dUvfxkPPPQoXnLTdXjr298ORRbGxidw1dobMXDdDXjy8Y344le+iY68g//7t3+DeYvOAZGGhn/6s5/HxPgoPvdvn8fe/QeRc5yYkxgATMxWs+wcRoZP45nNT+Flr74DtVpNa0q3gf7pM3HusmVYv+FxOI6jC2Aty+yt20Cyey91wK/NJIU+ABExTYI+mUwTZGYJCfA8H11dnVhy7nk6A6ZjPziOg4P7n8f+fXuRKxS1MowIQKykoRQs28EPfvAjPPHkZthODpVKBRAOfnvf/XjwDw+it7sLz+54Ft/5zncAaaNer6Hm+Tg5OISvf/NulMsVSCnxzbu/hV2798KHQKVaAaSNn9zz33jsic3o6+/DI49uwE9/9gsIK49yuQrLcrBz1x7cffe3IAWhXC7jq1/9GoaGRsEg1BsuGj7j7m/ejef27kMu54CVHzqXQYIsikQikJTYuuWJsLFUaYg7SOC85efD973Men/o6nFGfyWlcMHZaJwwhyKmot+5LVyhtaAQERqNGubOm4c5c+fBbTQCOJXjONj17FaUy2VIyzb1glbII40WPnn6NB5f/xC6ujpR7OxE0SGsf+Rh+GQByoN0Clj/yDqUxobQ0dWDvr5p2LX1SezetRtOLgfLsnD85CCe3fI4+vt6kS92wW/U8MgfHwibM4XEI398AMQuOrt70N3djaceexQnz4zCkhK5fAE7d+7Ckf270DdtOnr6+jB04gg2bNwAJ5fTi0/RSmO6GsUAcvkintu9G2dOn4a0pCGoYNQbLpYsPUeXiJXKBIpyi30fo9sgSleEMkg/TADIxC0CekbaTeRJhIQiECu30cDiJecgly/A87wIBFth947tENIKETcUT+2FWE191pyTw8WXXoHHH38cX/j0v+DI0eO4aNUKeG4DQtpouC6WL18OK1fEVz7/r/jvH38PF6xYhWnTp+mGD2Z0dHZi5eo1ePCBB/Dvn/o4qpUqVqxcCc/1IISA6/lYfdkajIxN4N/++U5sePhBXHTJauQdCwzA9XycddYczF20FN/55tfx9S/+O/qmz8TSJYtM15CI4+mi6JqIFrAcB0NDZ3DsyCHjB2jeBtfzMPvsuejq7IDne4niEKeEIUmjE+QjmOMpsnT4lvQBmksr/uRCQyRTHolDfcxfuAhKhcUay7ZRKZdw6OAB2E7OZMsiFi0GyDQxt1IodHTg3nvvxbHDB1EqTWDXs8+ge9os5PN5+L4H29IVtr//6w/i6NGjsARh0TnnQlo5+G4DrBRyjoNv/ed/4ujhQ6iUJrBvz27kOnvg5Gz4vo98LocdO3fhqb/+IE6cOI6nNm3E3IVLzGfoSp7PhE/98z/i4P7n4SuFzU9tQt3T+EbVdP6SXfkUsp2CBISwUK/XcPTwIay4+DIoVrBIwm246OnpQ19vL46dHETOyUG1Rm1mklZP5rNFoZ5WeqFbV6Ind0DiX0op2JaF2XPmomH68GAKP6dPnMLw0BBsJxe5gGxEW5jCFThy5CjsXAHTip1ouB4GB4dgOxaYFaSQGBkdh1I+eqfNAgM4euKUKTeHYdrRo8dh5wroL3ZiouZionoalq0bSC0pMHhmCIII02bOga8Ujh47AdtxNDcBAbVaDaVSCV190wEAp04PQ0gL0pJgFeYqmmYgbhoFmEKyrGNHDkUUnyau6Ogoor+/D4ePHgdy+ZhWTlLkcFtzTZMSeKWbQwNyCIqpL6IswsN25RQG+z7y+Tz6pk1Do9EIIN5SCJwePIVypYpiRxfCSoSKq03mWJkXDDg5B2AdOwspICVFsn2sO3vZCnIDjpMLchjN+3TyOZ1+VQqWbZvrCsEVjq3J0XWmkODkcjrjF/D8Ca22zTXajhMUtaJPgpmToHNTQdS/CWnh5PET8FzPtLXrPIS0LfT19RtoeRCxZdJMZTeFJUt2rXezlQ0KjRxMU4s+o6CsgHVD+eguFlHs7DY2TjuAQkgMnR7UbVKpxDcHadZmm3e0CscJ0U/VwSK7Lsj7UySvEC0HGxRSDBZuhCH0mzhIUHFwrSYFzGGGLxNQGyPRoFS2XUiJkeEheJ4L0ayMsg9moKuryziB7egfJm/A4yS5Y8KJs5AqdWZXAHiK9iUqkcrXlb58vqAJGCK668zgYEDagKA+zzFEF0eKPMr3Qqo3blWdM3coRCKZbQY9NcGpQYEpAQs3O5oEZUz1olTmjU2Zm0hTzGjYomWKS81egoxqvREkzXZShuc2QCRj1DT5fD5yaMrHj7XbJhlYObH0SXPNAY9eSBIVrx4QZap3nqIjGPUB8sUiLMdGo+EGf1NKoVQqRVq0KBEvh4UbEgTf99E3bSbOXrg0YPIQTei3oAAM0qSzS3c0G3UcxQJys91MGPrVSJrUCKXibHbiKMKIWRkBFji4dycq5TEIEgZZxAnnOx6WCSHRqNfRqNfhFIqahs4sVS6fj9HCJqeSxeenpCODOGikdXe2hezoYGpgzxaaJQzdWGf5jM1u8tqzUqjXqyY1GkfvIAJgCBaGFXqnzwYzwXN9kJAw4TaiBYTgwXDcVwmhYhpJpFQ4Us9XfmBahGgKhh9/rEEJnVLhndZShEKxiJ6+6SiND0PaMhY2R+E2zeRQU3MopeD5CjbD8BBqsxXTdGgFR4iQRUfp5sz5s5BBzBqV3XzuVhy+zSliqNiyZgxuzMYOho0OQgjDzOnrmzIy7rluAKaIEwhSvC5vLuvk/p2YOXcxpOXoi4/Sr8QI++Pol3DnU4TfIFK7N/15FFXtgelJzDoxlHIcqjidw5AC1YkzOHP8gO5ODhY6q7Ya0UpgCClhGU4hX+nys1IKvue31bBpuBelQDrp91ME0BypBXDS1aMEopfaQcNa8AZEzIBSStvHJoBCGW+dKIUbDBwAo4rZmIFSaRylnU9pla0S+ibVBdKqw4bRsoM1NZI2cSOZxNmJ/gA7D2HZEV9GpbV/pDzNDPMcTPGIQ4BsrV6LgHioFe1DZh5wsjqNvnRSaVBoipA+msBIoQEnQbHq97mNOnzPC3ajjgaAjo7O0PlkjpmAGCqnaatyRQ0BVwrCSmcNY6xLCeuXWn6K4+SatpYoM5gN+wOC6+R4AoYRtqo1TReJDKp4jjWnslIoFouQlg3P8zTxJeu+iGqlMuXIK7uZpDWE3JBfhIkgEfSHUApmxJlORTrKjM0DIwrg1/VaVd+cCbm0EDA6OrviRR9OJ6CSVCiKOcbmgeSxgfGP9s5l3FWi1h6ctcWwhag5o+YQyYyliA6q1s68jIWYzbk+zAxB2rnt6uqCk3MC5hBBBCk0wVUTx8CZ5jVrpiGnqHYzBYPCMoAVJmAi/JBMqdoMtZC3luaAww4Yr1GHcPKAMhha10dXd7epDEZVaVPsImEaaUeRfRednV0QhvItavuZE5okqfibsHRBho+Hs4HBma6vrlMo30Ol1gjUOkdntkRnBzUJVtiHcn0Iy9Kt5E3haYJKWMH3PZx19jzYUsPfLEt3P9XqNYyMjJh2Mm5j/+N5kGR9IIu3OWkUrPiWAV4YtpAzov8QxCGERKVaQ7k0gZ4ZHZrRiwHP9zB95izYthVJyiAcexZyvoNIg0fmzF2EmWcvDBM7FE8bs3EKm8OdKSqJpgInorMKmj8H4FCVRjQZggelFKSUOHH0AE4cOQDLsqMNBMZGE6B8kF+F79bRqFXguj5g5aDMteq2NwkpBXKOBdt2kCt2Ymy8YjSTDidLpRJGRsY0qphbTx9NDsnk5FQ1CtR9xAHmkJA5IgCU6d9Q60QPtXM2jJ0UlkSlPIGR4SHMPHt+UA52XRczZ89BV3cPKrU6pOmiCZk1OV65ZIVcsRuKCW6jZmytkeymhoimjSMuRUj7SpEQTAAU6cNjjhNExQgjtHDZTh62nQudRSMwJATYbwCNKmqlMVQmRuDkcpgzbyHmzl+I6bPmoLunVxfAKhUMnTmDkyeO48SJk6jXKrj/N/fi2KlhXHnllVi2/Dx0dTuojI1gbHQY0hBWJhM/nLH9oiYsMN5TwBQ2o4BwvEGi7z8r9UhtoMrRwU/CLPapE8ewYvXlGiwlBXzPQ2d3H2bMnInnn98PK2+FYVMz9IqYByKB4/t3oH/GHJDU2HtEdiknawbBKFXjwoms8IUjuyv+c9aQCGbGyNCgbulSvhEiAPUSGuNDKI+P4OwFi/Hq1/451lx1DZacuxy9vX0gaesMZhAR+WjUKjhx4hieenwDnnxyM7Y/8xS2Pf0kLlyxCq/6879Aeeg4SqUSit19cb8iM+SmoAM46ZFlsrGr+N8zi0FTmeLHbcvBUTUqcPjgfsOwojF1vmI4uTzmL1iI3bt2o1AsAr5CxigIrbqFRMNt4PihvUEuP9V+iIhqz7pyonT4lgKfcBxAGiXJJIKwc2GYxz64MobxoVPo6+/HG97617j1z16Ls+bOR8MQSY6XKpmWWgiJWWcvwh1vugCvfX0NTz6xGT/8/vew5clNGBufQNEhA5LhxEjYLHpdbtMtkP5jE3vBUKJFORhxWtMML6/12OfE31jH+wf370e9VgsyX03f/4ILV+CB392fQM5Qqi4AAoTlQFpOPPbOKLfGsoqU/cjiupEzgte4T5DqqlE+VHkYo0MncdXADfjQRz+OeYvPwfjYOE4PDmpBFxJCijANbXyQpofuuXWMDFXBRFix+jJ88uKLcd+vfoEf/vAn2H/qBHJOzlyDaDm0KjlcGy1mn3JmHYi4RS0g4t0mTQFNdVpISM1uOw6OHzuKM4Mn0TNtFtxGA4II9Vodyy+4EP29PSjXXdMqlX2LzRt13YZBmopgkWIRQDTcauL9WxHSx2RARcgktf8hjUceby8kgH2o8hBKI6fx+rf+Jd75V/8XnvIxeGoQlmXp3oZmIUtFwbEImkiak0+avY7liQkIKfCqO16HRYsW4WN/97cYHi+jUChoHqGYV5dV+KVJtUDsCWhnMCMR1Mb5y3qdJi1GEizbwfjIEJ5/bheuvmEhxhp1WJYF122gs286zl1+ATZtegJ2Z4fu189izGKGJYBZ8xZCWg6U8iJVPUplMLI7ZyO2njk1xDEIKQ03wNDQkOk+iiaAFLg0hInh03jH+z6Mt7z3IxgaGtIOr7RMWSJsqeNIS4Ay7OX63g0fsYG7N+lvTw6ewYpL1uALX/4y3vfud2O0XEMulwvK0xlpxTBZy1OZlRtNYhElfADOsBdxLGAs9G2blQr5TgiaMGH701tw7Y0vCR0y4x9ccdU12LTp8XhWLtqjQ4DyPMxZuBz9s+bpyVa+Bxg1G+b+Q0dQx9sqpe05WT8wiSgppElQ6cJQrtAJu3gQR/fv0rn9pnapT2D0zEm89k1vw5vf/SEMDp4yjOEi5qwplXYkdXNsCWPjE5g5cwa6uzRVXLVWhTQUs7ZtYWhoCGctPg+f+uxn8N73vE9zDcQwB1ngLmo3NThDDqg5IiKpAcKMWqCm2uH+W+IMwiMVK+TyRWzfthXDZ06j0NGFhutCCIFarYaVF6/GWbPn4PTQGdgmvo51X5vkief5qNdq8L0GpNSM3z68WOdSCCZNxC7NfgRuJoMQoHmICG6zrczE/bXyBGqlsejqgbwaJs4cx8WXXYG3vf9vcPrMGS1oisHQUYmUApalmcxdtxFch1IESzI++U93Ycdzh7Bw4Xycd+5S3HTzTTj//OWYKFfg+76moLcsDA8PY/lFa/CBD7wf//KJT6O7pzfWHzA5MKSVW84pr9hKA7uzh5e0wgWkBSQowgav2Y6DM6dP4dmnn8C1N90WECu7rovevj5cd+NN+O6374bT4+iUse+Fw5OUgpA2Th1+DhNDx0GUdq7aZKpC4YxinjgxbbyZA2iWi32FcrmsQz7jX7ilERSKHXj3Rz4K33T0kql0ahkRKJfL+OIXvoRLV1+M217+CpTKZUjd5wXXV7j0sjXIFzpx7Ohh/PKXv8a6Rzfitltvwatvfw1sy4brucEcgsHBM3jZq+7Axg0bsW79RnR1dbdtEoln/rNyfpzUAqEAhHUYgwqmqYV62dnU5DRN7W8KaeHRh/6Iq6/XZoBNbr1aqeDq627Eb+/9FUqVCqQQYK+BgCmBtEpXLDA2OpKa+ROmjyPpXRMOxjLDnKgtpNLQIoIOErBsJ8jwkV9HafQMXvvmt2PhsgsxMjQEx7EhLQu+76NRb8DJOTh9Zghbt25FMW/hlltfqjWXq1lDG66Ll7/6dtz2SoWJ8THs3rEdP/nJPfjOd76L48eP4/3vfx+IzKgZk1aeqDbwlne8E08+tTk2giZbE2ToaNYTSCijXMSme0VzBU+f+xYiWshaD4qpzQHJnoCZ4uUk7a07loWTx49ixUUXY/acs9Go1yGkvuHevn649Rq2bH4S+XweyjdYASsX8QUIwnLMtw0hbQjLhrRsSMuBsHWYKG0H0rJ12Gg7kWOc8L2WoxM0tqVfM/G9PqcDYVkxw+aWhtFRzOO9f/sxWLZu/rAcB6eOH8WnP/UZPLzuEaxfvwHrN2yE22hgeHQCGzZswMaNj+HXv74PJ44dxcWXXIxKtQrX9+E4eSw+Zykuu2w1xkaG8PD6x1EaG8Way9eg4fmBaarV6pg7bz6OHXoez+7YiUKhEAPAUIwbkTJ9vkyxEEIAmi1coE2zR7tljyNQspzCqOIRIGmh4bp44De/gmPbBiCtsfSVahU33/ZyLJw/H7VaFULaUPUK2K0lum6jaGGOOKmM1lOCo/0FFL4zSoYYBW9oByG8cgLK4yO4/Oq1mD13IarVKhQDvq+7eJRXR7U0isMHD0D4dcyfNwdzZk3D+NgoDu3fB69RgiVUgADSDp2P8bExdHT34z0f+CusXrkc991/Px7fsB6dhk5emWFXtXoDN7/4VjiWxgwwRSa6Jqp+WWXjrDpXtGSk6eKnz30LyMwLSGgAwuQ8gUTtBMZUyVjBtm0cOXQAF11yKWbMmhPM31FKoaOrGz29PXjs0Yd1swgrsGvGsshcivRZJNg6o4scXnSSA7DJ+6srcwH3b/Pn5rEiQifv1eGWR/G6t/5vzJm3EPV6Tdt+30dHZxduvPkW9Pf14pFHNuB1f34H3viWt+GqK6/Ali1PgwB87K67cMmaFxnQKIf0rqZrys4VMPfss7Bxw0acPn0aV7zoRWaTU8CrNGvWTDyxcT1OnxmGbdvm+CnX7lI7M8IW/iMx1WPbTQyanDBEJ1mEtFCv1/HzH38/HAJBxoEqlXD51QMYuOEWjI9PwLJzmimsMgZVHgI3ymC3prWCVwd7Nf3t1sCNGtirJ1rfkmzgpmLnNcCNKtirm2OrYK8GuOZ8Xl2fr1EFvBoa5TH0TZ+BhUvPQ7VaMVByjWnwfYWG62HxOeeiv78Xv3/gQVi2g2ef3Ylnd+zEZZdegmkzZqFarcLzlT7G9CMowwRWLpWwaOl5uPbqK7F9+3YcOnAAvX398H3dRue6LnKFTqxYuQqNej2WqqZkz8EU1TdzBig05ti1rASmkG1TFhwdK/vo7OrBpo3r8fijD2HN1Ws1YbKUUAxUqzW84a3vwNHDB3Fg//PIOTn4JDQpZHU8EamGo1yaiR3Rd7ZB9HJmhVLVxuFXxkMIVwx0koBVGdCGW6ti1qIVKHZ2o1EPQ7vmUY1GA919fbjqqivxs5/9DL/5xU+x+emtyNsWrhlYazqiRZjMMedWKqwm1ms1nD1/ISzbwa9/9UuQICxYtASu64GZ0XA9LDpnaUiUEavacmSe4yTobUbKIxYtGwjQbvYPt/Ub0mNfQ5XKJGDZNr5/99dQK02gYNi0iQisfHT19OKNb/9L2LYDJglh2SArr79lDrAcQNogaQPCChw6SCviH1AEX2oEpTIGVZ0ASRsUHGODpAOSDiAdQOjzBu+xHfjKR/+MWZCWA8/TcwabGqBppyvlCm64+cW48ILz8V8//W8cOHgIb3jD6zBt1lkol8vBMZoaQe/8QqEAJ6eHUT+3Zye+973voW/adKx//Ens3rkDtqM/W09BdzF7zmw4tkzXPiLDKSfdlskeNUTmBVBCP7RC/karxVPhCohldpqt0YUOHDt6FP/55X8PO4PNV71WR3dPL/LFDm0zhQWSEpA2YDUXKFxACEv/TyJbiAlQ1TGoRhmwcvp4YWnuYWmDLPMtI/9LW2MOSH939fTDVwqu58Pz9DQQZVQ5M6GzsxMgoLN3Olxfg0ecfCeEWWjlKyhW8E0ZeWJiAlu2bMHe5/aiVCrj3PMuwKte+QqcPHkS5yych4Ebb8b4RBmGzAx114WT74STy5sUcvbD5imo5CRvQKQ1bPJyIresSWenImJlmMCxkVDKQ6GjE088vh6vHnwz+qbPRL1eBzOjmHNw8vhRjI2cQaGj22CWrUSuW2PnBQy8SvkBaTMHxR3Nw++XR7V/IHOASdsmo4JYKSWKE6BmPcM2+H39OcLwFhEJNFQDTz3yFH77m9/g0IH9uOrKF+HosWP4/Oc/j63btuOWF9+C+fMXwPU83fjZ24Gf/tePcd99v4VjS3zkwx/Eiksuw21/9ioMD5/BOUuXQdp51KoVEDXRSDoHIATpqnm7gswUI7mmHrHSSD+aJJPc3uBzxjjE5JcQEvVqBYvPXYqZM2eiXHMD0RFS4vDBA/CaEQKHyZkYdEwiaMEiVmCSkTKwAKD04vuezieQmRjWnCiSRM1GJJW4CZHRpqlSqcDzTcVQKfhGa9kW8I2v/Ace27gB8+YtwOv/4rW4/uZbcebUCfz8Zz/FxvWPYN1DD+Jd73on1t54C6rVKk6dOoWnt2xBZ0cR1WoVmzc/gwsvuhTVah1veuu70HBdTZphKOQCTWO+o7qXXogZTniNFOUHiJV4IrX0yVoPqbXbn6jDcayYJIjg+gqLzlmKXKEDE5Vh06KlO30O7t8XNEvGfNwgu9cUV6EXS0jdylWvQOQ6AOXBK49pjJ7lBAOlguFR0V6C5m4X0VJ4tBglUC5NGKZyhhJN3jvN+L1wyVL09fZg7Q03YcHCRSiXK5g2cw7e9q53Y/Wazdj2zDOYOecs1Ot1OLkcnn5qE44dPYLly5fj9MgYtjy9BS8ZHER3dw+q1WqAGI7OMgCAiYkJuJ4Hy2AiqE0fwNT2q0JGNTBDrUxSHk4OEuUWONRoXV/DxYBF5yyD66tg6qYQAuMTYzh8YD8s09Yd64dLtFuHlK+afk25VSi3bkwCJRZfRuYMRGWLMlhIOWhOFZaFsZEhuI06FAOk2KSngXqjgetuuAk5W+MARkfHkHNsbc4ArLr4Uqy8aDWkFKjW6igKwpbNW+Ap4MUveQk2bNyA9Y+sw/N7dmLN1QMBP6DisKtZ+QqWZWHo9Gk0alXY3bk4PzNPfSorZQBCRBMUjlZz6agdHi0SW1I2VCkVDhpsXLFYxLyFi9CoNwzzp9JFo5MncGZQkzowZ/seZHIHgiKDI4QECQOilJZefGEF072COULRSWKRukAcZRy0dcK2HZw6fgxjI0OwjS/AJgKwbAcnjhzAP935UezZtQPdPT1ouH4ARnUbDbiunkDuODaGTw9i1+49mNHfgyXLLsCyZcuhWOCZrdugPA++Yni+yRM01b6p3x8+dAC+SswW4qwhOdRSO2RFbsL0AXAmD/IUpWoq2YfouTzXxfTp0zFj9lmoN8JpIZZlYd/ePahUKpDSiqeviTSJAhFc18PE+HhAOinMNBGSFoSV0958bJQcteqRARCfAtNMoDcRQtK2MT42jIPP74Vl23pxmAOf4Nnt23D46DF8+Qufxx9/dx+KQSqXg2KSUgq27WDr05tx6uRxrFi5En39/Thn2XLMnjUL27Ztw4njx2GZ4pLyVZAOZgCe28De3btgWVZAnRht4+TEgLisecNxgUkkgoi4LaBkMoBoNq4QmbaKhG4Xm79gITo6uzExoSnV2TSQPrdrRzDtU5jpXMpnVGtVuG4Dji0xe9ZsnLf8fNRqVWx6/DH4LNDR0QE2cXOszy+SCWSi7PIoh9qMmOK99yaJs/XJx3HplddqVJDOPcF163hu9244kmBJwozp0+CaxQuaew3XcalUxpObNqGjowvPHzqGu+78BzTqVZC0MDYyjO1bt+Lq626E5/tmcog2Qbbj4PjRIzjw/F7k8oWgBT461iY+F4gzQnhu6RlqkiiItuPTOBHOcVsHkSbtVVPKx5KlywKyZJ0IEnDrNRw/chhOThMy1eoNXSco5LDs3CVYseoiLF12PhYsPgddPX0gAm7athk/+cH3sWPnTti5PPK5vGkB5wghRejpM8URDMxpkxdwFRFBKSCfL2Dn9qdx4thx9Pb1arobEqjXXdz00ldgxzNP4uGHH8WBQ4exbOVq0w7vGcGGpsQ9fACHDx9BPidRnRhBeWzIzDLWEcuz27fhymvXhrUoaBBMocPGk4+tx/jYGLp6+/VrghJTT8J7oRcSFQQaIAh60ugPnqLOj8bTnMoZhheglILj2Fi4ZAnq9UYA887l8zh59BD27X0OTBLd3Q5WrFyBlasuxvILV+DseQsg7RzqDRe1Wg2jY+MgAs5beSn+/vyVeOzRh/HA/b/Fnj17wCSQLxQ0115AFZ/dW5eGhkdqQsIAQuwchgZP4uH7f4HXvfXdqNXqkBLwlcLic5Zh4aLFOHL4MH7yw+/BsmzccuttqLse3EYDnucilyfseHYbRscncO3VV+K1b3wLatUqbCeHocET+OIXvoCDhw7hzOBJdPfPMA00euJoaXwMGx5+UO/+FpU34vj4qARCItauF9mIcYYQzmAImZI3mWgbb8cvRkTw3Ab6+vow+6x5cBt1Uw3UoMqh04NYs2YNBm5+CRYuXoq+aTNBQsDzPJSrdfilCoSRfltKgIDx8XGQELjq+ltwxVUD2LltC9Y9/Eds374dIyOjICHhOI7uu5MCMfKY5j9RRhSlTZHrNvT1sYfOrh7MOWsuntu1A0ePHMG0GTNQr9UAAI16BdLO4dWveyPq3/oGfvijH+O55/bg2rU3YMHChXDyBTTqNWx/5hn4vouVl1yKYlcvSFgQQmD+knOxYOEibHpsI3Zs24qBm29Fo16DUozO7m7c9/Mf48Sxo+js6QsjrgxsvqF/jSw7JyalpiIyFSsHRwEhU118eoEhozDdwkvPPRdrb34p6nXtAJLQ3UJzzj4b19zwEsyZuwAQFqrVGuqNOpTvgwTpETMcNfEU0KnWajU0PIW5Cxfj8quuwRVXXIFFCxegkM/DbdRRq5ZRLZdRq9cCWhbXc9FoNMzvNdRrNSjPhW1JzJkzGytWrsIV11yHCy+5Qs8t8glHDh3EylWrgtkAAMHzPHT19GHVJatRL41hy5OPYdOmJ/DouodRcCSWnb8CB/Y9h1kzpuOa626E7/lQyofn+YCQyDs2ShNjWL3mReju1Sam0NGBowefx3e/9kVYdk5nOUnE5x9npL2zaOIoDgTQ5WDmPeNnjvwojQrmbI4gtG0ymFJIoBs9PReLlywNGh+js5k9z8f4xLgZqCQgpQibSYzXLS0LhWIBUkhUKmWDLxRBJ225NKFZtvpm4rqXvALX3XIbJsbHMHxmEIOnTmDwlOYnrJRLqNW0BrIsC8WODkybNg3TZ87GjFmz0TdtJuxcHuVyGYePHkfN0zjB48cO48EHHsCNL74VlXJJ5zSEgNeow84V8Zo3vBVXDQxg69PPYN+eXZp91PVw88tv1xQ0UmrGVCPIfqWCxcsuwDvPvQCOLVGr1mA7OdTrNXz/619CvVZDvqPLdDXHndgmu0rU9kfpZFt1DaV7A5kpsx8uA+zdqvOkTQ9OeD6TPVu8dJkpjOi+PYoANYWRCGXaqIWQyOVycHI5+L6PibFRbN3yJM6cOoWrBq7HjFkzUS6VUK839FwhM/DZ81yMjozoWT2WgznzF2Pe4mUmd8JBPqKJH/SNZ+/7XhC7V8pluI0GujoKmDlzBibGx1GvVfHUY+vh2DauvfFmlCbGdV6AAfbrcEGYffYizJ63BDf5HgCBsbExSNJk0F5zZLyJ7/X9au7Eet2Dk8tBWhLf/vfP4MDze9HR3WuYXEWLnsVWYz6yc3rJ7WoZ1cwc2/3JnnPOTOhwAkvcnrWS4fk+erq7MH/RIriuGxnj1iRzUoZJ1EIul4eTy6HRqOPUiePY/ex2bH9mM57fswNDgyfheR5+/+uf4aaXvgLXXn8zeqdpjn2dTtV09MFDY0atWoXiSqxmIQxHkDLBdSCUIDMpXvsPHeyj0tGBmbNnQwoBS0ps2vgIlPIwcNOtKJcmNF+x+bxytRqkSIWgILWrIp5Ycy2VQRT7hv+g0Wjgu1/5LJ7etAEdPX0mnxAF6rbKsCIWCk4Wwsdo4hgZKT/KwvbFiSBbs1QmrYLB3zfqOGvxIvT2T0OlUjd08p5h3rRh2w6kJVEplbB3zy7seXYrtj+zGYf278X46ChICDi5PPLFLpAQGB46g+9+7Yv43a9/jqvW3oQrrl6LuQsXIZfLoVavw63Xg2QKgt0WbftutmcxlI+QkIH1biVoT9x2upErdEBaNsaHBzEyeASjgyfx8299CUcP7MWtt78JXV1dqJRKcH3XMHyZjLtiw4TKsdmGIQ2hghQ2Ort6cOTQfvz021/BgX3PoaOnX5fDg1Yyim22ycd4xVcp7rhzfHBk6Dxkz+JN7uR2ux2cJv9s3rggQrVaBUirdTY9A0opjI4M4fk9u7Br29PYs2MbThw9jHqtCmnZcPIFdPX0BUydzWyYnSvAyRcwNjqCn//o27j/Vz/F0uUX4uJLX4TzVqzC3HnzkcsXTG5dM3I0a/lNSragm4h02CcN148QEkIA1WoVRw8dxO5nt2LLExtxZP9z8DwPUtrIFYt47MF7cfj53bj5la/D0gsuQjHvoF6vwfUaEX6KOHWsENpvyOXysB0H42MjWPf7H+GR3/0S9XrDqH3TA2nS3ZQJtuW2bSCUqnhGSa0iKz73vCseAom1rNEGMlbdwWTooMk1QFCjB6NeKeMVd/wFXnzbK3Fm6Aye27Edzz7zFA7s3Y3hM4PwPQ92Lg/byesdmZzWFSWWbGoXs4C+56JWLRv+gR7MnbcA8xedg4XnLMNZ8+Zh+vQZKHR0wrEdCKnbsVQwLk6hVq1hfGwMZ86cwcnjh3Ho+b04fGAfThw9jHKpBMuy4eRypgE05PtrVMtQnofFy1di9VXXYf6S89DTNw1SCsMxbNrFjDmAwfoND57A7u2bsXnDOgyeOIZCRxeEbaaNkGFFhfGQuT0+c3ItHAigL6QlGeq+ozsfeykBwNnLLn+YhBhg5fu6aE6TNoVOzhsQNxVNAkYoH41qGb3909CoVTE2OgxBEnY+r0klTfYsFeQakmamcFeFTOIqkHAycHHfddGo1wz5EsNxcujo6ECxswvFYhG5fCHoLWRWqNeqKJdKKE1MoFqtwG00dFOq7cDJ5SGkRDj9PMJtaASbDfGD8j309M/AWfMXY8acuZg2czaKnd263uG7mBgfxekTx3Dy6EGcOnYYlXIZTr4AO1cARwtbFJloFiuqtyzxt1/88B8jAHzv0Z0bX2aZ/DyHGHnKTgZR+9oAZzSXxVKrzZk5AsgVOwMWrK6efnBAwEiR92aMhw9g4fEseLMLCKQCEiayHOTtnGEO1QtUrddRrlQCExDrhyIR9ObZTh5OvmAAppECcZMEKqCdYTBrsCsEIVfsAlihUi5h19ansPPpTQFXgKEC18ykAKS0Yefy6OzpNwM0KTw3RSqXk1T/Jxs4zdnqOHjBwhRDuBcCPQ+pSxBh+0YA2WIAllPQnnFql1PCH8nyTZLklVFGbr0oTaerSfTAJCEtCctJ5tARayKNY+dErCZO0d6D5p+VMovX5CpQkI6E5RQCJy+WW4lA0QDSDmIwulaEhFMxtjNu0/3XHrCTFS+kYOEpZA9T275SYCoTrOLzQ8JoQMRbujlB3tjE7xsSp9h4+HZxbfR44ghhozT5co4/OMo4YzMJKhBbhNgsBSSEUJrm/0BzaXRSfGBU+P5MfwYJDdcmoc5tOjImb+gNOZBatIdPMacboZDkRBmCWkShnNlNGH8olNjl1NLsZLETR71disCUmjId+Zk5c5tEEy0cmZIaU8BZFPVmNCxFNAunuIjS0FkELfiUEuIUCVKKFSRrQA9PqaE3XQ5mFkStseZJorIkI/3krOIUp/PNIp3OGvXeZPPKgHMkWUwRMHhSDK5EiSJ1aooiQnp6juFrKAPwkO0cRwmv9TWI8OoCFjPOeBaUzW+UOHd0q0VXhg1+YSodWpzU/QkT4LYCfLaKOrmNTUoTTrUvFFBk9m2sPYERY/qNyT9zzJbGcImcVJiEKMk/NRlDJ6HJT4W5UXbzmK/AkZJsuqKaVOupBW8KefIDY4tCKYNK0ZJ9skOXMvIzcTMdDo5kxmBC37SYJNyOuJgyI4J4AokRnYHQDHsYcfvMGQxe2VSmEfRuJEGEFs0remBq6GFTtG8wBhSJ4+viSMd4QE6Z90+Re0N8cCRRRFDCyeiUAGfH8jaJZDxHndbmUO3JinIUHytNRPUQEwg60Qx5soYDcstYP+mWUCaKiFMagVOPOrGlUnkvisAdKelHZGAROMY2FIFYc6zDPPFBlJlZD41CCH1OcyVxKlQLqWvTD44pi26TW6KxWrMAtAbqZdG/RkAlJ0IBEGIfKDIgKnFtlAJMJxcgvuSTTRdpFlw4Q3g4JYHxXvhsh3EKdWkGsutmrTQMp33uRBNmlF086wMpCsTkSIolJuvZKF7OYGVNCh1ROlCkLK2ZCHkJBGnZO6ICsM2wYMsUfDRKlpk5uCxZLG63IBQnLQ4QChkgh/auZFxHZpqe1oms6JDSVmYubrej9DNxhnKOmJDkhEBkRI1JTU8tNSxFtB8HfgYQn3EQ15DtvK3geUtNvJkPBcDp6NzOrIYoGJoTJ1bI6O+JZfqS/i1Nkq9K6QrOhpKjxa7gSUZWckoI0jWNTDBodLdxgiAyU+GkZ7NQopAa623g7FxGaGAiUQhFNhbFZwYnBSX5HUZNqWQaG/6Pob6+ru1GAG6X+564fxwk1pOeH+tnkb6FbclxFnrmNOC8dShIoBZBCrdyQJAlHGlBI4pXIaOwseyceBz4mhysHQsauWUEmEh9c+b8hKiTGmgPinvx0da5pMuQjt6Sc1CiPk+UNjapl9kX0mIprfWb/3DPGAYGLLF69X4BALa0fkAUuMhTSAQlfud4JE0pBypjpHmMnp3afBJlqunYkZyERmVxF3FMXVJCOUWPaTVxIxWlUbo7J2XPmyUOSiQhEU5qiApKetG5pf9CGU8Yrcf5kBCCyLZ+DACrSyUSmzdv9gHQrI6Z9zL4oAEMqlZ2hTIePiV59hNjCltLbzyXRRkqjVMhGMeSNs2kH7c1NhkOVepzETMwFPH6YwtGGQa7RZycCoM5ApDJcOqQimsQkEulA9TWGOxMfgZAkRCClTrW2YdfA6DNm2/zdVfCwIB8/PF7qlJa/yGkRWBWBGoJAuWIY5KKTVvs4ay5VpSoI7QTmrSfHsnm8eQhUfZaUUuDE1BdUna0yJxkXIlAzbPcGaa4DqK4T8AJwUyOmo0W2OL+fnxuILVONilp2SRzuf/Y9sADZQwMSOAuzRmPdesUAFHsw1cBPkxSSmZWk5FDZSnYqDOTdFU41duepd7jmiSpMVImnDjx6a2zA0mByo4AErqoBfAxGw0fUb3RjHMbto10+ily/8mWrFRIyMn8aCv3VxEJCVYnurs6vwJAmDVHSLe9erXcuW5dSVryw1LXTFW7jGDTO43bxKgzR1n7KSUU2V59IjPYzufnNElt2lWlZHQ+aUm7mWvnyEIwpX0LZFpdbjlbISsUTKZtU1qBYVLXkQVmzvSmkvg/E3br3W/ZH9667pejWL1aNl+SwWedOAEMDMjRTeue7Z21YCmRuIiVQWyilV1rnSGkjFxBuo41WZUgOwbI3rftBye2qmgSUTDnN8uwZ2Hs0ik2ahPARhhTszQSxSMESuih9Dmp7VqkJZM9aTkWEf/s4LZH/gEDAxYee8xDCNEJh31rtXC7zHf1/m8i2iGkZYHZy7LGjPZNIkmLns0gijR6dAq0pYT0bPPYYEZulyyNz9oOM8TZd5LSKBSP06llzSKuc5qFpFScwMj0fjiVL+EMc0HtM6/MPglpEfG+7t6edwCQWLdWRTR/lGFBg5YwMEh7Nv5qQnbk/kxI6xQJaYHZy5JumsKObV1DyNrIFLN37SZmMtq0p1NWHjx+JLc9u9mBFC5aMnUfh8lPshARzAQn8nzZ2o2zyk+pghC33/k+CSmlJYccO//y7et/M4KBAQLuig5nCjRAqIHWrfMxMGDt3/SHvU4+92Jp2SeEtCxmdlN2rFXuLhrLMrdwgloQGyYQQFm7mdvECm3jsbYCnLaosZxAIsND3Co9lX22Vm5zVB+l/aRsp47bMTboZ+4JaUkh5CnHkS/d+/QfdmFgwMK6dV5SaUfs+53hZxsh2PvkA8/kc/nrpG1vk3bOZmafwSpWpuRsjE5q1yVm9E2B3LTlhK+p+AqTJYsp9sCzVH/W7kUM3JGtrrOi9MkLZHF/g1ok0ScZEqHzN76wHItIPCuENbB388ObzOL7WUFHONwW6+InO3SIMTBgDT324OlzF5z3w6rvz4aQlxCDWPmeqSkTMpEzURRCRhWGMvQ2tSwdZtTe28akk5qiZA2z1fmiCxImYygRTWTPTJuSYxtnu8q8KppUc2n/jZl9IaSU0hYE3O101O/Y//SG44mdn7rgybEe4QmwZNX1r3Q99x9BuFD5Plj5CoAK2ReZYuPmwfEmDqIEJm9yNZ2KiwjpMmVGZS3TN8j6fYpChCmcNw2dmyKFK5AxhnsS0dEPUQEQJKTQZBZqp7Dk/zu09ZH/1m+7XQL3qHaX3S6xGfn5TsLAwwLr1nkLBgbycpze7Ln+u8B8sR5ApprwZ9XMH7SLsF/YzmhxjtTCUUYcMgUz05r58AV+TVWS/jSJixwlABIkKGBDBbBNSPm16U73tzdvvrdiFj4rWEutdStlnHjznQTcxVi92sLmzS4A3HnnneJ7v35krddwX8ZKXc/AMiKRazvrvuWMH2r/ehJBGgucs8bCTu78cStfg6ilyuWpyM0k58oExGZdWwIkG/g1us/RJeI9IPlHssQvL182e90999zjRzS2j9YQz1hec/KyX5arOTAgYh/CTAsuWruAlb+EXe9sBZ4DEgWtDJqJJGV0AzGIDQ0WacdECHMtClBk2is4SuiqO0s1VSpDMOn3MUFE/HEVCEVzhrsCBKDAEIoyJa15jGDSl2toQ0kxIPX7lG+IDFgZpZvRsmOuRzXHmbAMfGyKjCENPo8i436JY/lBFUHMCDPNiqkiBJ0E4TgJse/w9vUHYmujF76pgSljQ2fBTRmtIrkp+E+E22+XGBiw/oe68///+lO/BgYs3H67zPDuKbPMkP6d/j//FFhY1LswOQAAAABJRU5ErkJggg==';

  function logoTag(cls) {
    if (LOGO) return '<img class="' + cls + '" src="' + LOGO + '" alt="">';
    return '<span class="' + cls + ' wdt-logo-fb">WD</span>';
  }

  const LANGUAGES = [
    { code: 'ar', name: 'العربية' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'pt', name: 'Português' },
    { code: 'zh-CN', name: '中文 (简体)' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'it', name: 'Italiano' },
  ];

  const UI_STRINGS = {
    ar: {
      brandSub: 'إعدادات الترجمة',
      uiLangLabel: 'لغة واجهة الإضافة',
      uiLangDesc: 'اختر لغة واجهة الإضافة',
      targetLangLabel: 'اللغة المستهدفة',
      targetLangDesc: 'اختر اللغة التي تريد الترجمة إليها',
      bgLabel: 'الخلفية',
      bgDesc: 'لون خلفية اللوحة',
      textLabel: 'النص',
      textDesc: 'لون نص الترجمة',
      saveBtn: 'حفظ الإعدادات',
      note: 'تطبيق التغييرات فوراً على جميع الأزرار الظاهرة',
      thanks: 'شكراً لاستخدامك',
      rights: '© WDOX 2026 — جميع الحقوق محفوظة',
      gearTitle: 'إعدادات WDSteam Translate',
      closeTitle: 'إغلاق',
      noTransTitle: 'الترجمة غير متوفرة',
      noTransDesc: 'هذه الصفحة لا تحتوي على مراجعات أو تعليقات قابلة للترجمة',
      openSettings: 'فتح الإعدادات',
    },
    en: {
      brandSub: 'Translation Settings',
      uiLangLabel: 'Extension Interface Language',
      uiLangDesc: 'Choose the extension interface language',
      targetLangLabel: 'Target Language',
      targetLangDesc: 'Choose the language you want to translate into',
      bgLabel: 'Background',
      bgDesc: 'Panel background color',
      textLabel: 'Text',
      textDesc: 'Translated text color',
      saveBtn: 'Save Settings',
      note: 'Changes apply instantly to all visible buttons',
      thanks: 'Thanks for using',
      rights: '© WDOX 2026 — All rights reserved',
      gearTitle: 'WDSteam Translate Settings',
      closeTitle: 'Close',
      noTransTitle: 'Translation Not Available',
      noTransDesc: 'This page has no reviews or comments available to translate',
      openSettings: 'Open Settings',
    },
  };

  const DEFAULTS = { lang: 'ar', uiLang: 'en', bgColor: '#1B2838', textColor: '#C7D5E0' };

  const THEME_REV = 2;

  const stored = await storageGet({
    wdt_lang: DEFAULTS.lang,
    wdt_uiLang: DEFAULTS.uiLang,
    wdt_bgColor: DEFAULTS.bgColor,
    wdt_textColor: DEFAULTS.textColor,
    wdt_themeRev: 0,
  });

  const themed = stored.wdt_themeRev === THEME_REV;

  const settings = {
    lang: stored.wdt_lang,
    uiLang: stored.wdt_uiLang,
    bgColor: themed ? stored.wdt_bgColor : DEFAULTS.bgColor,
    textColor: themed ? stored.wdt_textColor : DEFAULTS.textColor,
  };

  const TRANSLATE_WORDS = {
    ar: { translateReview: 'ترجمة المراجعة', translateComment: 'ترجمة', hide: 'إخفاء الترجمة', translating: 'جاري الترجمة...', failed: 'فشلت الترجمة — اضغط للإعادة', noText: 'لا يوجد نص للترجمة', rateLimited: 'تجاوزت حد الطلبات — اضغط للإعادة', netError: 'تعذّر الاتصال — اضغط للإعادة', blocked: 'الخدمة محجوبة — اضغط للإعادة', partial: 'ترجمة جزئية', waiting: 'ازدحام — إعادة المحاولة خلال' },
    en: { translateReview: 'Translate Review', translateComment: 'Translate', hide: 'Hide Translation', translating: 'Translating...', failed: 'Failed — tap to retry', noText: 'Nothing to translate', rateLimited: 'Rate limited — tap to retry', netError: 'No connection — tap to retry', blocked: 'Service blocked — tap to retry', partial: 'Partial translation', waiting: 'Busy — retrying in' },
    fr: { translateReview: "Traduire l'avis", translateComment: 'Traduire', hide: 'Masquer la traduction', translating: 'Traduction...', failed: 'Échec — appuyez pour réessayer', waiting: 'Occupé — nouvel essai dans' },
    es: { translateReview: 'Traducir reseña', translateComment: 'Traducir', hide: 'Ocultar traducción', translating: 'Traduciendo...', failed: 'Error — toca para reintentar', waiting: 'Ocupado — reintento en' },
    de: { translateReview: 'Rezension übersetzen', translateComment: 'Übersetzen', hide: 'Übersetzung ausblenden', translating: 'Übersetze...', failed: 'Fehlgeschlagen — erneut versuchen', waiting: 'Ausgelastet — neuer Versuch in' },
    ru: { translateReview: 'Перевести обзор', translateComment: 'Перевести', hide: 'Скрыть перевод', translating: 'Перевод...', failed: 'Ошибка — нажмите для повтора', waiting: 'Занято — повтор через' },
    tr: { translateReview: 'İncelemeyi çevir', translateComment: 'Çevir', hide: 'Çeviriyi gizle', translating: 'Çevriliyor...', failed: 'Başarısız — tekrar dene', waiting: 'Meşgul — yeniden deneme' },
    pt: { translateReview: 'Traduzir avaliação', translateComment: 'Traduzir', hide: 'Ocultar tradução', translating: 'Traduzindo...', failed: 'Falhou — toque para repetir', waiting: 'Ocupado — repetindo em' },
    'zh-CN': { translateReview: '翻译评测', translateComment: '翻译', hide: '隐藏翻译', translating: '翻译中...', failed: '失败 — 点击重试', waiting: '繁忙 — 重试倒计时' },
    ja: { translateReview: 'レビューを翻訳', translateComment: '翻訳', hide: '翻訳を非表示', translating: '翻訳中...', failed: '失敗 — タップで再試行', waiting: '混雑中 — 再試行まで' },
    ko: { translateReview: '리뷰 번역', translateComment: '번역', hide: '번역 숨기기', translating: '번역 중...', failed: '실패 — 다시 시도', waiting: '혼잡 — 재시도까지' },
    hi: { translateReview: 'समीक्षा अनुवाद करें', translateComment: 'अनुवाद करें', hide: 'अनुवाद छुपाएं', translating: 'अनुवाद हो रहा है...', failed: 'विफल — पुनः प्रयास करें', waiting: 'व्यस्त — पुनः प्रयास' },
    it: { translateReview: 'Traduci recensione', translateComment: 'Traduci', hide: 'Nascondi traduzione', translating: 'Traduzione...', failed: 'Non riuscita — riprova', waiting: 'Occupato — riprova tra' },
  };

  const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];

  function t(key) {
    return (UI_STRINGS[settings.uiLang] || UI_STRINGS.en)[key];
  }

  function tw(key) {
    const pack = TRANSLATE_WORDS[settings.lang] || TRANSLATE_WORDS.en;
    if (pack[key]) return pack[key];
    return TRANSLATE_WORDS.en[key] || key;
  }

  function isRtlTarget() {
    return RTL_LANGS.indexOf(settings.lang) !== -1;
  }

  function saveSettings() {
    return storageSet({
      wdt_lang: settings.lang,
      wdt_uiLang: settings.uiLang,
      wdt_bgColor: settings.bgColor,
      wdt_textColor: settings.textColor,
      wdt_themeRev: THEME_REV,
    });
  }

  if (!themed) saveSettings();

  const ENGINE = {
    concurrency: 1,
    minGap: 700,
    chunkLimit: 1900,
    textLimit: 20000,
    rounds: 4,
    cooldownMs: 60000,
    cacheMax: 600,
    burst: 6,
    refillMs: 1500,
    retryAfterMs: 30000,
  };

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function tErr(kind, detail) {
    const e = new Error(kind + (detail ? ':' + detail : ''));
    e.kind = kind;
    return e;
  }

  function checkHttp(res) {
    if (res.failure === 'timeout') throw tErr('timeout');
    if (res.status === 0) throw tErr('network', res.failure);
    if (res.status === 429) throw tErr('rate', '429');
    if (res.status === 401 || res.status === 403) throw tErr('blocked', String(res.status));
    if (res.status >= 500) throw tErr('server', String(res.status));
    if (res.status < 200 || res.status >= 300) throw tErr('http', String(res.status));
    if (!res.text) throw tErr('empty');
    return res.text;
  }

  function parseGoogle(raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw tErr('blocked', 'bad-json');
    }
    if (data && Array.isArray(data.sentences)) {
      const out = data.sentences
        .map((s) => (s && typeof s.trans === 'string' ? s.trans : ''))
        .join('');
      if (out.trim()) return out;
      throw tErr('empty');
    }
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const out = data[0]
        .map((c) => (Array.isArray(c) && typeof c[0] === 'string' ? c[0] : ''))
        .join('');
      if (out.trim()) return out;
      throw tErr('empty');
    }
    if (Array.isArray(data) && typeof data[0] === 'string') {
      const out = data.filter((x) => typeof x === 'string').join('');
      if (out.trim()) return out;
    }
    throw tErr('empty');
  }

  function googlePost(host, text, lang) {
    const url =
      'https://' +
      host +
      '/translate_a/single?client=gtx&dj=1&sl=auto&dt=t&ie=UTF-8&oe=UTF-8&tl=' +
      encodeURIComponent(lang);
    return httpRequest({
      method: 'POST',
      url: url,
      data: 'q=' + encodeURIComponent(text),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      timeout: 20000,
    }).then((res) => parseGoogle(checkHttp(res)));
  }

  function baseLang(code) {
    return String(code).split('-')[0];
  }

  function guessSource(text) {
    const s = text.slice(0, 400);
    if (/[\u0600-\u06FF]/.test(s)) return 'ar';
    if (/[\u0400-\u04FF]/.test(s)) return 'ru';
    if (/[\u3040-\u30FF]/.test(s)) return 'ja';
    if (/[\uAC00-\uD7AF]/.test(s)) return 'ko';
    if (/[\u4E00-\u9FFF]/.test(s)) return 'zh';
    if (/[\u0590-\u05FF]/.test(s)) return 'he';
    if (/[\u0E00-\u0E7F]/.test(s)) return 'th';
    if (/[\u0370-\u03FF]/.test(s)) return 'el';
    return 'en';
  }

  function hardSplit(text, limit) {
    if (text.length <= limit) return [text];
    const out = [];
    let rest = text;
    while (rest.length > limit) {
      let cut = rest.lastIndexOf(' ', limit);
      if (cut < limit * 0.5) cut = limit;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (rest.trim()) out.push(rest);
    return out;
  }

  async function viaMyMemory(text, lang) {
    const target = baseLang(lang);
    const source = guessSource(text);
    if (source === target) throw tErr('toolong');
    const parts = hardSplit(text, 450);
    const out = [];
    for (let i = 0; i < parts.length; i++) {
      const url =
        'https://api.mymemory.translated.net/get?langpair=' +
        encodeURIComponent(source + '|' + target) +
        '&q=' +
        encodeURIComponent(parts[i]);
      const raw = checkHttp(await httpRequest({ url: url, timeout: 20000 }));
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        throw tErr('blocked', 'bad-json');
      }
      const code = data && Number(data.responseStatus);
      if (code && code !== 200) throw tErr(code === 429 ? 'rate' : 'http', String(code));
      const value = data && data.responseData && data.responseData.translatedText;
      if (!value || !String(value).trim()) throw tErr('empty');
      if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(value)) throw tErr('rate');
      out.push(String(value));
    }
    return out.join(' ');
  }

  const PROVIDERS = [
    { id: 'gtx', call: (txt, lang) => googlePost('translate.googleapis.com', txt, lang) },
    { id: 'clients5', call: (txt, lang) => googlePost('clients5.google.com', txt, lang) },
    { id: 'gweb', call: (txt, lang) => googlePost('translate.google.com', txt, lang) },
    { id: 'mymemory', call: viaMyMemory },
  ];

  const health = Object.create(null);

  function hOf(id) {
    if (!health[id]) health[id] = { until: 0, fails: 0 };
    return health[id];
  }

  function penalize(id, kind) {
    const h = hOf(id);
    h.fails++;
    if (kind === 'rate' || kind === 'blocked') h.until = Date.now() + ENGINE.cooldownMs;
    else h.until = Date.now() + Math.min(20000, 1500 * h.fails);
  }

  function reward(id) {
    const h = hOf(id);
    h.fails = 0;
    h.until = 0;
  }

  function resetHealth() {
    Object.keys(health).forEach((id) => {
      health[id].until = 0;
      health[id].fails = 0;
    });
  }

  let tokens = ENGINE.burst;
  let lastRefill = Date.now();

  function takeToken() {
    const now = Date.now();
    const gained = Math.floor((now - lastRefill) / ENGINE.refillMs);
    if (gained > 0) {
      tokens = Math.min(ENGINE.burst, tokens + gained);
      lastRefill += gained * ENGINE.refillMs;
    }
    if (tokens > 0) {
      tokens--;
      return 0;
    }
    return lastRefill + ENGINE.refillMs - now;
  }

  let inFlight = 0;
  let lastDispatch = 0;
  const waitQueue = [];

  function pump() {
    if (inFlight >= ENGINE.concurrency || waitQueue.length === 0) return;
    const gap = Date.now() - lastDispatch;
    if (gap < ENGINE.minGap) {
      setTimeout(pump, ENGINE.minGap - gap);
      return;
    }
    const wait = takeToken();
    if (wait > 0) {
      setTimeout(pump, wait);
      return;
    }
    const job = waitQueue.shift();
    inFlight++;
    lastDispatch = Date.now();
    job();
  }

  function schedule(fn) {
    return new Promise((resolve, reject) => {
      waitQueue.push(() => {
        let p;
        try {
          p = fn();
        } catch (e) {
          p = Promise.reject(e);
        }
        Promise.resolve(p).then(
          (v) => {
            inFlight--;
            pump();
            resolve(v);
          },
          (e) => {
            inFlight--;
            pump();
            reject(e);
          }
        );
      });
      pump();
    });
  }

  const cache = new Map();
  let persistDirty = false;

  function cacheGet(key) {
    if (!cache.has(key)) return null;
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    return value;
  }

  function cacheSet(key, value) {
    cache.set(key, value);
    if (cache.size > ENGINE.cacheMax) cache.delete(cache.keys().next().value);
    persistDirty = true;
  }

  (await cacheLoad()).forEach((pair) => {
    if (Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string') {
      cache.set(pair[0], pair[1]);
    }
  });

  function flushCache() {
    if (!persistDirty) return;
    persistDirty = false;
    cacheSave(Array.from(cache.entries()).slice(-400));
  }

  setInterval(flushCache, 10000);
  window.addEventListener('pagehide', flushCache);

  async function translateChunk(text, lang) {
    const chunkKey = 'C\u0000' + lang + '\u0000' + text;
    const cached = cacheGet(chunkKey);
    if (cached) return cached;

    let lastKind = 'failed';
    for (let round = 0; round < ENGINE.rounds; round++) {
      const now = Date.now();
      let list = PROVIDERS.filter((p) => hOf(p.id).until <= now);
      if (!list.length) {
        const soonest = Math.min.apply(
          null,
          PROVIDERS.map((p) => hOf(p.id).until)
        );
        await sleep(Math.max(400, Math.min(1500, soonest - now)));
        list = PROVIDERS.slice();
      }
      for (let i = 0; i < list.length; i++) {
        const provider = list[i];
        try {
          const out = await schedule(() => provider.call(text, lang));
          if (out && String(out).trim()) {
            reward(provider.id);
            cacheSet(chunkKey, String(out));
            return String(out);
          }
          lastKind = 'empty';
          penalize(provider.id, 'empty');
        } catch (e) {
          lastKind = (e && e.kind) || 'failed';
          if (lastKind === 'toolong') continue;
          penalize(provider.id, lastKind);
        }
      }
      if (round < ENGINE.rounds - 1) {
        await sleep(600 * Math.pow(2, round) + Math.floor(Math.random() * 400));
      }
    }
    throw tErr(lastKind);
  }

  function splitSmart(text, limit) {
    const out = [];
    let buf = '';
    const flush = () => {
      if (buf.trim()) out.push(buf);
      buf = '';
    };
    text.split('\n').forEach((para) => {
      const candidate = buf ? buf + '\n' + para : para;
      if (candidate.length <= limit) {
        buf = candidate;
        return;
      }
      flush();
      if (para.length <= limit) {
        buf = para;
        return;
      }
      const pieces = para.match(/[^.!?\u06D4\u3002\uFF01\uFF1F]+[.!?\u06D4\u3002\uFF01\uFF1F]*\s*/g) || [para];
      let acc = '';
      pieces.forEach((piece) => {
        if ((acc + piece).length <= limit) {
          acc += piece;
          return;
        }
        if (acc.trim()) out.push(acc);
        if (piece.length <= limit) {
          acc = piece;
        } else {
          hardSplit(piece, limit).forEach((p) => out.push(p));
          acc = '';
        }
      });
      if (acc.trim()) buf = acc;
    });
    flush();
    return out.length ? out : [text];
  }

  const SCRIPT_RE = {
    ar: /[\u0600-\u06FF]/g,
    ru: /[\u0400-\u04FF]/g,
    ja: /[\u3040-\u30FF\u4E00-\u9FFF]/g,
    ko: /[\uAC00-\uD7AF]/g,
    'zh-CN': /[\u4E00-\u9FFF]/g,
    hi: /[\u0900-\u097F]/g,
  };

  function looksLikeTarget(text, lang) {
    const re = SCRIPT_RE[lang];
    if (!re) return false;
    const sample = text.slice(0, 400);
    const total = sample.replace(/\s+/g, '').length;
    if (total < 24) return false;
    const hits = (sample.match(re) || []).length;
    return hits / total > 0.65;
  }

  const pendingJobs = new Map();

  function translateText(rawText, onProgress) {
    const lang = settings.lang;
    const source = (rawText || '').trim();
    if (!source) return Promise.resolve({ ok: false, kind: 'notext' });
    if (looksLikeTarget(source, lang)) return Promise.resolve({ ok: true, text: source });

    const key = lang + '\u0000' + source;
    const hit = cacheGet(key);
    if (hit) return Promise.resolve({ ok: true, text: hit });
    if (pendingJobs.has(key)) return pendingJobs.get(key);

    const task = (async () => {
      const capped =
        source.length > ENGINE.textLimit ? source.slice(0, ENGINE.textLimit) : source;
      const chunks = splitSmart(capped, ENGINE.chunkLimit);
      const out = [];
      let failKind = null;
      for (let i = 0; i < chunks.length; i++) {
        if (onProgress && chunks.length > 1) {
          try {
            onProgress(i + 1, chunks.length);
          } catch (e) {}
        }
        try {
          out.push(await translateChunk(chunks[i], lang));
        } catch (e) {
          failKind = (e && e.kind) || 'failed';
          break;
        }
      }
      pendingJobs.delete(key);
      const joined = out.join('\n').trim();
      if (failKind && !joined) return { ok: false, kind: failKind };
      if (failKind) return { ok: true, text: joined, partial: true };
      if (!joined) return { ok: false, kind: 'empty' };
      cacheSet(key, joined);
      return { ok: true, text: joined };
    })();

    pendingJobs.set(key, task);
    return task;
  }

  function failMessage(kind) {
    if (kind === 'notext') return tw('noText');
    if (kind === 'rate') return tw('rateLimited');
    if (kind === 'network' || kind === 'timeout' || kind === 'server') return tw('netError');
    if (kind === 'blocked') return tw('blocked');
    return tw('failed');
  }

  const ANCHOR_PHRASES = [
    'was this review helpful?',
    'cette évaluation vous a-t-elle été utile ?',
    '¿te ha sido útil esta reseña?',
    'war diese rezension hilfreich?',
    'этот обзор был полезен?',
    'bu inceleme yararlı oldu mu?',
    'esta análise foi útil?',
    '这篇评测是否有价值？',
    '這篇評論值得參考嗎？',
    'このレビューは参考になりましたか？',
    '이 평가가 유용했나요?',
    'questa recensione ti è stata utile?',
    'czy ta recenzja była pomocna?',
    'was deze recensie nuttig?',
  ];

  const REVIEW_BTN_ATTR = 'data-wdt-btn';
  const COMMENT_BTN_ATTR = 'data-wdt-cbtn';
  const SCOPE_ATTR = 'data-wdt-scope';
  const WIDGET_ATTR = 'data-wdt-widget';

  const NOISE_PATTERNS = [
    /^(recommended|not recommended)$/i,
    /hrs?\.? on record/i,
    /hrs?\.? at review time/i,
    /^\d+(\.\d+)?\s*hrs?\b/i,
    /^posted[:\s]/i,
    /^updated[:\s]/i,
    /^(posted|updated)$/i,
    /was this review helpful/i,
    /is this review helpful/i,
    /^(?:yes|no|funny|award|helpful|share|reply|report|delete|edit|cancel|translate)+$/i,
    /people found this review (helpful|funny)/i,
    /^\d[\d,]*\s*(of|\/)\s*\d[\d,]*\s*people/i,
    /^read more$/i,
    /^show (more|less)$/i,
    /^[\d,]+\s*(games?|reviews?)?$/i,
    /^(?:[\d,]+\s*(?:products?|games?|reviews?|comments?|in account)\s*)+$/i,
    /^(games?|reviews?|comments?)$/i,
    /^early access review$/i,
    /^\d+\s+people/i,
    /^\d+$/,
    /^view store page$/i,
    /^view community hub$/i,
    /^find more like this$/i,
    /^\d{1,2}\s+\w+(,\s*\d{4})?\s*@\s*\d{1,2}:\d{2}\s*(am|pm)?$/i,
    /^(yesterday|today)\s*@\s*\d{1,2}:\d{2}\s*(am|pm)?$/i,
    /^(yesterday|today)$/i,
    /^reply$/i,
    /^report$/i,
    /^delete$/i,
    /^edit$/i,
    /^cancel$/i,
    /^save changes$/i,
    /^do you recommend this game\?$/i,
    /^check this box if you received this product for free/i,
    /^\d+\s+products? in account$/i,
    /^product received for free$/i,
    /^product refunded$/i,
    /^most helpful reviews?/i,
    /^recently posted$/i,
    /^recent reviews?\b/i,
    /^all reviews?\b/i,
    /^overall reviews?\b/i,
    /^direct(ly)? from steam\b/i,
    /^steam key\b/i,
    /^key activators?\b/i,
    /^key activation/i,
    /^purchase type/i,
    /^steam purchasers?$/i,
    /^(overwhelmingly|very|mostly)?\s*(positive|negative|mixed)$/i,
    /^review by\b/i,
    /^this review is\b/i,
    /^sign in to\b/i,
    /^log in to\b/i,
    /^view all\b/i,
    /^loading/i,
    /^\d+ (person|people) found/i,
    /^(banned|not enough reviews)/i,
    /^\d+ curators? have reviewed/i,
  ];

  const CARD_SELECTORS =
    '.review_area_content, .review_box, .apphub_Card, .apphub_CardTextContent, ' +
    '.commentthread_comment, .review_area, .review_container, .review_page_content';

  const BODY_SELECTORS =
    '#ReviewText, .review_area_content .review_text, .review_box .content, ' +
    '.apphub_CardTextContent, .commentthread_comment_text, .forum_comment_text, .review_text';

  const CHROME_SELECTORS =
    '.date_posted, .postedDate, .hours, .playTime, .review_award_ctn, .review_award, ' +
    '.review_rate_bar, .rate_bar_scale, .found_helpful, .rating_summary, .ratingSummaryHeader, ' +
    '.review_area_header, .reviewInfo, .gameLogoHolder, .game_info, .persona_name, ' +
    '.miniprofile_hover, .commentthread_author_link, .commentthread_comment_timestamp, ' +
    '.commentthread_comment_actions, .commentthread_comment_options, .commentthread_comment_controls, ' +
    '.commentthread_area, .review_helpful_header, .vote_header, .early_access_review, ' +
    '.user_reviews_header, .review_source, .review_box .title, .review_area_content > .title, .thumb';

  function isNoise(text) {
    return NOISE_PATTERNS.some((re) => re.test(text));
  }

  function isProfileLink(el) {
    return !!el.closest('a[href*="steamcommunity.com/id/"], a[href*="steamcommunity.com/profiles/"]');
  }

  function isSidebarLink(el) {
    return !!el.closest('a[href*="/recommended/morelike/"], a[href*="/App/"], a[href$="/app/"]');
  }

  function isHidden(el) {
    if (el.hidden) return true;
    if (el.id === 'ReviewEdit') return true;
    const inline = el.getAttribute && el.getAttribute('style');
    if (inline && /display\s*:\s*none/i.test(inline)) return true;
    return false;
  }

  const BLOCK_TAGS = new Set(['DIV', 'P', 'UL', 'OL', 'LI', 'SECTION', 'ARTICLE', 'TABLE', 'TR']);
  const SKIP_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEMPLATE',
    'BUTTON',
    'TEXTAREA',
    'INPUT',
    'SELECT',
    'OPTION',
    'IFRAME',
    'FORM',
  ]);

  const BREAK_SELECTOR =
    'div,p,li,tr,section,article,blockquote,header,footer,ul,ol,table,h1,h2,h3,h4,h5,h6';

  const INLINE_TAGS = new Set(['A', 'SPAN', 'B', 'I', 'EM', 'STRONG', 'LABEL', 'SMALL']);

  function hasOwnText(el) {
    return Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()
    );
  }

  function isLabelRow(el) {
    const kids = Array.from(el.children);
    if (kids.length < 2) return false;
    if (hasOwnText(el)) return false;
    return kids.every((k) => INLINE_TAGS.has(k.tagName));
  }

  function textWithBreaks(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    clone.querySelectorAll(BREAK_SELECTOR).forEach((node) => {
      node.insertBefore(document.createTextNode('\n'), node.firstChild);
      node.appendChild(document.createTextNode('\n'));
    });
    clone.querySelectorAll('*').forEach((node) => {
      if (!isLabelRow(node)) return;
      Array.from(node.children).forEach((kid) => {
        node.insertBefore(document.createTextNode('\n'), kid);
        if (kid.nextSibling) node.insertBefore(document.createTextNode('\n'), kid.nextSibling);
        else node.appendChild(document.createTextNode('\n'));
      });
    });
    return clone.textContent;
  }

  function cleanBlockText(rawText) {
    const lines = [];
    rawText.split('\n').forEach((raw) => {
      const line = raw.replace(/\s+/g, ' ').trim();
      if (!line) return;
      if (isNoise(line)) return;
      if (lines.length && lines[lines.length - 1] === line) return;
      lines.push(line);
    });
    return lines.join('\n').trim();
  }

  function stripChrome(clone) {
    clone
      .querySelectorAll(
        'script, style, noscript, template, textarea, select, option, button, iframe, form, svg, ' +
          CHROME_SELECTORS +
          ', [' +
          WIDGET_ATTR +
          ']'
      )
      .forEach((node) => node.remove());
    return clone;
  }

  function findAnchors() {
    const anchors = [];
    const seen = new Set();

    document.querySelectorAll('.review_rate_bar').forEach((el) => {
      if (!seen.has(el)) {
        seen.add(el);
        anchors.push(el);
      }
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue) continue;
      const value = node.nodeValue.trim().toLowerCase();
      if (!value || value.length > 60) continue;
      if (ANCHOR_PHRASES.indexOf(value) === -1) continue;
      const parent = node.parentElement;
      if (parent && !seen.has(parent)) {
        seen.add(parent);
        anchors.push(parent);
      }
    }

    return anchors.filter((el) => !el.closest('[' + SCOPE_ATTR + ']'));
  }

  function anchorCount(el) {
    const bars = el.querySelectorAll('.review_rate_bar').length;
    let phrases = 0;
    const txt = (el.textContent || '').toLowerCase();
    ANCHOR_PHRASES.forEach((phrase) => {
      let idx = txt.indexOf(phrase);
      while (idx !== -1) {
        phrases++;
        idx = txt.indexOf(phrase, idx + phrase.length);
      }
    });
    return Math.max(bars, phrases);
  }

  function findCardRoot(anchor) {
    const known = anchor.closest(CARD_SELECTORS);
    if (known) return known;

    let node = anchor;
    let best = anchor.parentElement || anchor;
    for (let i = 0; i < 10 && node.parentElement; i++) {
      node = node.parentElement;
      if (node.tagName === 'BODY' || node.tagName === 'HTML') break;
      if (anchorCount(node) > 1) break;
      best = node;
      if (node.querySelector(BODY_SELECTORS)) break;
      if (/hrs?\.? on record/i.test(node.textContent)) break;
    }
    return best;
  }

  function findBodyElement(cardRoot) {
    if (cardRoot.matches && cardRoot.matches(BODY_SELECTORS)) return cardRoot;
    const inner = cardRoot.querySelector(BODY_SELECTORS);
    if (inner && anchorCount(inner) === 0) return inner;
    return null;
  }

  function extractDirectText(el) {
    return cleanBlockText(textWithBreaks(stripChrome(el.cloneNode(true))));
  }

  function extractFallbackText(cardRoot, anchor) {
    const parts = [];
    const seen = new Set();

    function pushIfValid(el, text) {
      if (!text || text.length < 3) return;
      if (isProfileLink(el)) return;
      if (isSidebarLink(el)) return;
      const pos = el.compareDocumentPosition(anchor);
      const isBeforeAnchor = !!(pos & Node.DOCUMENT_POSITION_FOLLOWING);
      if (!isBeforeAnchor) return;
      if (!seen.has(text)) {
        seen.add(text);
        parts.push(text);
      }
    }

    function walk(el) {
      if (SKIP_TAGS.has(el.tagName)) return;
      if (isHidden(el)) return;
      if (el.matches && el.matches(CHROME_SELECTORS)) return;
      if (el.hasAttribute && el.hasAttribute(WIDGET_ATTR)) return;
      const children = Array.from(el.children);
      const blockChildren = children.filter((c) => BLOCK_TAGS.has(c.tagName));

      if (blockChildren.length === 0) {
        const text = cleanBlockText(textWithBreaks(el));
        pushIfValid(el, text);
        return;
      }

      children.forEach(walk);
    }
    walk(cardRoot);
    return parts.join('\n');
  }

  function extractReviewText(cardRoot, anchor) {
    const body = findBodyElement(cardRoot);
    if (body) {
      const direct = extractDirectText(body);
      if (direct) return direct;
    }
    return extractFallbackText(cardRoot, anchor);
  }

  const ICONS = {
    translate:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2a8.8 8.8 0 1 0 8.8 8.8"/><path d="M17.4 3.4 21 6.6"/><path d="M21 3.4 17.4 6.6"/><path d="M8.6 15.6 12 7.8l3.4 7.8"/><path d="M9.8 13h4.4"/></svg>',
    globe:
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 4 6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-6-4-9s1.5-6.4 4-9z"/></svg>',
    lang:
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.5h8"/><path d="M7 3.2v2.3"/><path d="M9.6 5.5c0 3.4-2.6 6.5-6.6 8"/><path d="M5.2 9.2c1.4 2.3 3.4 3.8 5.8 4.6"/><path d="M12.6 21l3.9-9.4L20.4 21"/><path d="M14 17.6h5"/></svg>',
    brush:
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.6 3.9 20.1 9.4"/><path d="m6.8 17.2 9.9-9.9 -3.5-3.5 -9.9 9.9"/><path d="M3.3 13.7 6.8 17.2 4.6 20.6 1.9 19z"/><path d="M17.5 12.5c2 2 2.6 4.2 1.6 5.9"/></svg>',
    text:
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.2h9"/><path d="M8.5 6.2V18"/><path d="M14 11h6"/><path d="M17 11v7"/></svg>',
    save:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.8h11L20.2 8v12.2H5z"/><path d="M8.4 3.8v5.1h7V3.8"/><path d="M8 13.4h8v6.8H8z"/></svg>',
    bolt:
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M13.4 2 5 13.4h5.2L9.8 22l8.6-11.6h-5.4z"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.6 4.6 4.6L19 6.6"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chevron:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9.5 6 6 6-6"/></svg>',
    gear:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.5 14.4a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.7h.08A1.7 1.7 0 0 0 10.1 3.14V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.5 9v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.56 1.03z"/></svg>',
  };

  const SOCIAL_ICONS = {
    x: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M18.9 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>',
    discord:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.07.07 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/></svg>',
    github:
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
    coffee:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.4 9.2h12.2v5.1a4.6 4.6 0 0 1-4.6 4.6H9a4.6 4.6 0 0 1-4.6-4.6z"/><path d="M16.6 10.6h1.6a2.4 2.4 0 0 1 0 4.8h-1.6"/><path d="M7.6 3.4v2.4"/><path d="M11 3.4v2.4"/><path d="M14.4 3.4v2.4"/><path d="M3 21h15"/></svg>',
  };

  const SOCIAL_LINKS = [
    { icon: SOCIAL_ICONS.x, url: 'https://x.com/wdox_', title: 'X' },
    { icon: SOCIAL_ICONS.discord, url: 'https://discord.gg/qU3SPcheSG', title: 'Discord' },
    { icon: SOCIAL_ICONS.github, url: 'https://github.com/DevWD7', title: 'GitHub' },
    { icon: SOCIAL_ICONS.coffee, url: 'https://ko-fi.com/wdox_', title: 'Ko-fi' },
  ];

  const CSS =
    '.wdt-btn,.wdt-panel,.wdt-gear,.wdt-out{box-sizing:border-box;font-family:"Segoe UI",Tahoma,Arial,sans-serif;}' +
    '.wdt-panel *,.wdt-btn *{box-sizing:border-box;}' +
    '.wdt-wrap{display:block;width:100%;max-width:100%;}' +
    '.wdt-btn{display:inline-flex!important;align-items:center;gap:9px;padding:6px 16px 6px 6px!important;' +
    'border:1px solid transparent!important;border-radius:999px!important;cursor:pointer;line-height:1;' +
    'background:linear-gradient(#1b2838,#1b2838) padding-box,linear-gradient(95deg,#66c0f4,#417a9b,#1999ff) border-box!important;' +
    'color:#c7d5e0!important;font-size:12.5px!important;font-weight:700;letter-spacing:.2px;' +
    'box-shadow:0 0 14px rgba(102,192,244,.25)!important;transition:box-shadow .18s,transform .18s;}' +
    '.wdt-btn:hover{box-shadow:0 0 24px rgba(102,192,244,.5)!important;transform:translateY(-1px);}' +
    '.wdt-btn:disabled{opacity:.75;cursor:progress;}' +
    '.wdt-btn.wdt-err{background:linear-gradient(#1b2838,#1b2838) padding-box,linear-gradient(95deg,#ff7676,#c2401a) border-box!important;' +
    'box-shadow:0 0 14px rgba(255,118,118,.28)!important;}' +
    '.wdt-btn.wdt-err .wdt-bico{color:#ff9c8a;border-color:rgba(255,118,118,.45);' +
    'background:radial-gradient(circle at 32% 28%,rgba(255,118,118,.32),rgba(27,40,56,.95));}' +
    '.wdt-btn.wdt-wait{background:linear-gradient(#1b2838,#1b2838) padding-box,linear-gradient(95deg,#ffc46b,#c2801a) border-box!important;' +
    'box-shadow:0 0 14px rgba(255,196,107,.25)!important;cursor:wait;}' +
    '.wdt-btn.wdt-wait .wdt-bico{color:#ffc46b;border-color:rgba(255,196,107,.45);' +
    'background:radial-gradient(circle at 32% 28%,rgba(255,196,107,.3),rgba(27,40,56,.95));}' +
    '.wdt-bico{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 auto;' +
    'background:radial-gradient(circle at 32% 28%,rgba(102,192,244,.35),rgba(27,40,56,.95));' +
    'border:1px solid rgba(102,192,244,.4);color:#66c0f4;}' +
    '.wdt-bdiv{width:1px;height:17px;flex:0 0 auto;background:linear-gradient(180deg,transparent,rgba(102,192,244,.9),transparent);}' +
    '.wdt-blbl{white-space:nowrap;}' +
    '.wdt-out{margin-top:9px;padding:12px 14px;display:none;white-space:pre-wrap;width:100%;max-width:100%;' +
    'overflow-wrap:anywhere;word-break:break-word;border-radius:14px;font-size:13px;line-height:1.75;' +
    'border:1px solid rgba(102,192,244,.22);box-shadow:0 8px 24px rgba(0,0,0,.35);}' +
    '.wdt-gear{display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;' +
    'border:1px solid transparent;border-radius:50%;color:#66c0f4;' +
    'background:linear-gradient(#1b2838,#1b2838) padding-box,linear-gradient(135deg,#66c0f4,#417a9b) border-box;' +
    'box-shadow:0 0 16px rgba(102,192,244,.35);transition:transform .18s,box-shadow .18s;}' +
    '.wdt-gear:hover{transform:scale(1.07);box-shadow:0 0 26px rgba(102,192,244,.6);}' +
    '.wdt-gear svg{animation:wdtSpin 5s linear infinite;}' +
    '.wdt-gear:hover svg{animation-duration:1.4s;}' +
    '@keyframes wdtSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}' +
    '.wdt-panel{position:fixed;z-index:2147483647;display:none;width:420px;max-height:86vh;overflow-y:auto;' +
    'background:radial-gradient(120% 90% at 50% 0%,#1b2838 0%,#171a21 60%);color:#c7d5e0;padding:18px;' +
    'border:1px solid rgba(102,192,244,.22);border-radius:22px;' +
    'box-shadow:0 26px 70px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.04);}' +
    '.wdt-panel::-webkit-scrollbar{width:8px}' +
    '.wdt-panel::-webkit-scrollbar-track{background:transparent}' +
    '.wdt-panel::-webkit-scrollbar-thumb{background:rgba(102,192,244,.35);border-radius:8px}' +
    '.wdt-head{display:flex;align-items:center;gap:13px;margin-bottom:16px;}' +
    '.wdt-logo{width:54px;height:54px;border-radius:50%;flex:0 0 auto;display:block;' +
    'box-shadow:0 0 24px rgba(102,192,244,.45),0 0 0 1px rgba(102,192,244,.35);}' +
    '.wdt-htxt{flex:1;min-width:0;}' +
    '.wdt-title{font-size:19px;font-weight:800;color:#fff;line-height:1.15;letter-spacing:.2px;}' +
    '.wdt-title span{background:linear-gradient(90deg,#66c0f4,#1999ff);-webkit-background-clip:text;background-clip:text;' +
    '-webkit-text-fill-color:transparent;color:transparent;}' +
    '.wdt-sub{font-size:12.5px;color:#8f98a0;margin-top:4px;}' +
    '.wdt-x{width:36px;height:36px;flex:0 0 auto;padding:0;border-radius:11px;cursor:pointer;display:flex;' +
    'align-items:center;justify-content:center;color:#c7d5e0;background:rgba(255,255,255,.045);' +
    'border:1px solid rgba(255,255,255,.09);transition:background .15s,color .15s;}' +
    '.wdt-x:hover{background:rgba(102,192,244,.22);color:#fff;}' +
    '.wdt-card{background:#16202d;border:1px solid rgba(255,255,255,.06);border-radius:18px;padding:14px;margin-bottom:11px;}' +
    '.wdt-row{display:flex;align-items:center;gap:11px;}' +
    '.wdt-ico{width:40px;height:40px;flex:0 0 auto;border-radius:12px;display:flex;align-items:center;justify-content:center;' +
    'background:linear-gradient(155deg,rgba(102,192,244,.2),rgba(42,71,94,.55));' +
    'border:1px solid rgba(102,192,244,.3);color:#66c0f4;}' +
    '.wdt-lbl{flex:1;min-width:0;text-align:left;}' +
    '.wdt-lbl b{display:block;font-size:13px;font-weight:700;color:#e6edf3;line-height:1.3;}' +
    '.wdt-lbl i{display:block;font-style:normal;font-size:10.5px;color:#8f98a0;margin-top:3px;line-height:1.4;}' +
    '.wdt-seg{display:flex;flex:0 0 auto;gap:3px;padding:3px;border-radius:13px;background:#10161f;' +
    'border:1px solid rgba(255,255,255,.07);}' +
    '.wdt-seg button{display:flex;align-items:center;gap:6px;border:none;background:transparent;color:#8f98a0;' +
    'font-size:12.5px;font-weight:700;padding:8px 13px;border-radius:10px;cursor:pointer;font-family:inherit;}' +
    '.wdt-seg button.on{background:linear-gradient(95deg,#47bfff,#1a44c2);color:#fff;box-shadow:0 4px 14px rgba(26,68,194,.45);}' +
    '.wdt-seg button.on .wdt-chk{display:flex;}' +
    '.wdt-chk{display:none;width:17px;height:17px;border-radius:50%;background:rgba(255,255,255,.22);' +
    'align-items:center;justify-content:center;color:#fff;}' +
    '.wdt-selwrap{position:relative;flex:0 0 155px;}' +
    '.wdt-sel{width:100%;appearance:none;-webkit-appearance:none;-moz-appearance:none;cursor:pointer;font-family:inherit;' +
    'background:#10161f;color:#c7d5e0;border:1px solid rgba(102,192,244,.3);border-radius:13px;' +
    'padding:11px 34px 11px 13px;font-size:12.5px;outline:none;}' +
    '.wdt-sel:focus{border-color:rgba(102,192,244,.7);}' +
    '.wdt-sel option{background:#10161f;color:#c7d5e0;}' +
    '.wdt-chev{position:absolute;top:50%;right:9px;transform:translateY(-50%);pointer-events:none;' +
    'width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
    'border:1px solid rgba(102,192,244,.35);color:#66c0f4;}' +
    '.wdt-cols{display:flex;align-items:stretch;gap:12px;}' +
    '.wdt-half{flex:1;min-width:0;display:flex;flex-direction:column;}' +
    '.wdt-vline{width:1px;flex:0 0 auto;background:linear-gradient(180deg,transparent,rgba(255,255,255,.1),transparent);}' +
    '.wdt-pick{display:flex;align-items:center;gap:9px;margin-top:auto;padding-top:11px;}' +
    '.wdt-swatch{width:40px;height:40px;flex:0 0 auto;padding:0;cursor:pointer;border-radius:50%;background:transparent;' +
    'appearance:none;-webkit-appearance:none;-moz-appearance:none;border:2px solid rgba(255,255,255,.18);' +
    'box-shadow:0 0 0 3px rgba(102,192,244,.12);}' +
    '.wdt-swatch::-webkit-color-swatch-wrapper{padding:0;}' +
    '.wdt-swatch::-webkit-color-swatch{border:none;border-radius:50%;}' +
    '.wdt-swatch::-moz-color-swatch{border:none;border-radius:50%;}' +
    '.wdt-hex{flex:1;min-width:0;background:#10161f;color:#c7d5e0;font-family:inherit;letter-spacing:.6px;' +
    'border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:10px 11px;font-size:11.5px;outline:none;}' +
    '.wdt-hex:focus{border-color:rgba(102,192,244,.6);}' +
    '.wdt-save{width:100%;height:50px;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:10px;' +
    'border:none;border-radius:15px;cursor:pointer;color:#fff;font-size:14.5px;font-weight:800;font-family:inherit;' +
    'background:linear-gradient(95deg,#47bfff 0%,#1e7cd6 52%,#1a44c2 100%);' +
    'box-shadow:0 10px 26px rgba(26,68,194,.45);transition:filter .15s,transform .15s;}' +
    '.wdt-save:hover{filter:brightness(1.1);transform:translateY(-1px);}' +
    '.wdt-sico{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(255,255,255,.18);color:#fff;flex:0 0 auto;}' +
    '.wdt-note{display:flex;align-items:center;justify-content:center;gap:8px;margin:12px 0 14px;' +
    'font-size:11px;color:#8f98a0;text-align:center;}' +
    '.wdt-nico{width:24px;height:24px;flex:0 0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
    'background:linear-gradient(155deg,rgba(102,192,244,.25),rgba(42,71,94,.6));color:#66c0f4;}' +
    '.wdt-foot{display:flex;align-items:center;gap:12px;}' +
    '.wdt-thanks{flex:1;min-width:0;font-size:11.5px;color:#c7d5e0;line-height:1.5;text-align:left;}' +
    '.wdt-thanks b{font-weight:800;background:linear-gradient(90deg,#66c0f4,#1999ff);-webkit-background-clip:text;' +
    'background-clip:text;-webkit-text-fill-color:transparent;color:transparent;}' +
    '.wdt-social{display:flex;gap:7px;flex:0 0 auto;}' +
    '.wdt-social a{width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center;' +
    'color:#66c0f4;text-decoration:none;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);' +
    'transition:background .15s,color .15s,transform .15s;}' +
    '.wdt-social a:hover{background:linear-gradient(155deg,rgba(102,192,244,.3),rgba(42,71,94,.75));color:#fff;transform:translateY(-2px);}' +
    '.wdt-rights{text-align:center;font-size:10.5px;color:#5c6d7e;padding:4px 0 2px;}' +
    '.wdt-nohead{display:flex;justify-content:flex-end;margin-bottom:-6px;}' +
    '.wdt-noscreen{padding:14px 14px 22px;text-align:center;}' +
    '.wdt-nologo-wrap{position:relative;display:inline-block;margin:0 auto 18px;}' +
    '.wdt-nologo{width:130px;height:130px;border-radius:50%;object-fit:cover;display:block;' +
    'box-shadow:0 0 36px rgba(102,192,244,.5),0 0 0 2px rgba(102,192,244,.55);}' +
    '.wdt-nobadge{position:absolute;bottom:-8px;right:-8px;width:44px;height:44px;border-radius:50%;' +
    'display:flex;align-items:center;justify-content:center;color:#fff;' +
    'background:linear-gradient(135deg,#ff5f6d,#ff9966);' +
    'box-shadow:0 6px 18px rgba(255,95,109,.5),0 0 0 3px #171a21;}' +
    '.wdt-noname{font-size:15px;font-weight:800;color:#e6edf3;margin-bottom:14px;line-height:1.3;' +
    'padding:0 8px;word-break:break-word;}' +
    '.wdt-notitle{font-size:20px;font-weight:800;margin-bottom:8px;letter-spacing:.3px;' +
    'background:linear-gradient(90deg,#ff7676,#ffb347);-webkit-background-clip:text;background-clip:text;' +
    '-webkit-text-fill-color:transparent;color:transparent;}' +
    '.wdt-nodesc{font-size:12.5px;color:#8f98a0;line-height:1.65;margin-bottom:20px;padding:0 10px;}' +
    '.wdt-nosettings{display:inline-flex;align-items:center;gap:9px;padding:11px 20px;cursor:pointer;' +
    'border:1px solid transparent;border-radius:14px;color:#c7d5e0;font-family:inherit;font-size:13px;font-weight:700;' +
    'background:linear-gradient(#1b2838,#1b2838) padding-box,linear-gradient(95deg,#66c0f4,#417a9b,#1999ff) border-box;' +
    'box-shadow:0 0 18px rgba(102,192,244,.3);transition:transform .15s,box-shadow .15s;}' +
    '.wdt-nosettings:hover{transform:translateY(-1px);box-shadow:0 0 26px rgba(102,192,244,.55);}' +
    '.wdt-logo-fb{display:flex;align-items:center;justify-content:center;font-weight:800;letter-spacing:1px;' +
    'color:#66c0f4;background:radial-gradient(circle at 32% 28%,rgba(102,192,244,.35),rgba(27,40,56,.95));}' +
    '.wdt-logo.wdt-logo-fb{font-size:17px;}' +
    '.wdt-nologo.wdt-logo-fb{font-size:38px;}';

  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    const head = document.head || document.documentElement;
    if (!head) return;
    const style = document.createElement('style');
    style.setAttribute('data-wdt-style', '1');
    style.textContent = CSS;
    head.appendChild(style);
    stylesInjected = true;
  }

  const liveWidgets = [];
  let lastRenderedLang = settings.lang;

  function setBtnLabel(btn, text) {
    const label = btn.querySelector('.wdt-blbl');
    if (label) label.textContent = text;
  }

  function styleResultBox(box) {
    const rtl = isRtlTarget();
    box.style.background = settings.bgColor;
    box.style.color = settings.textColor;
    box.style.direction = rtl ? 'rtl' : 'ltr';
    box.style.textAlign = rtl ? 'right' : 'left';
  }

  function buildTranslateWidget(getText, labelKey) {
    injectStyles();

    const wrapper = document.createElement('div');
    wrapper.setAttribute(WIDGET_ATTR, '1');
    wrapper.className = 'wdt-wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wdt-btn';
    btn.innerHTML =
      '<span class="wdt-bico">' +
      ICONS.translate +
      '</span><span class="wdt-bdiv"></span><span class="wdt-blbl"></span>';
    setBtnLabel(btn, tw(labelKey));

    const resultBox = document.createElement('div');
    resultBox.className = 'wdt-out';
    styleResultBox(resultBox);

    let cached = null;
    let state = 'idle';
    let busy = false;
    let token = 0;
    let countdownTimer = null;

    function stopCountdown() {
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }

    function showResult(text) {
      styleResultBox(resultBox);
      resultBox.textContent = text;
      resultBox.style.display = 'block';
      state = 'shown';
      btn.classList.remove('wdt-err', 'wdt-wait');
      setBtnLabel(btn, tw('hide'));
    }

    function invalidate() {
      token++;
      stopCountdown();
      cached = null;
      state = 'idle';
      busy = false;
      btn.disabled = false;
      btn.classList.remove('wdt-err', 'wdt-wait');
      resultBox.textContent = '';
      resultBox.style.display = 'none';
      setBtnLabel(btn, tw(labelKey));
    }

    function startCountdown(my) {
      let left = Math.round(ENGINE.retryAfterMs / 1000);
      state = 'waiting';
      busy = true;
      btn.disabled = true;
      btn.classList.remove('wdt-err');
      btn.classList.add('wdt-wait');
      setBtnLabel(btn, tw('waiting') + ' ' + left + 's');
      stopCountdown();
      countdownTimer = setInterval(() => {
        if (my !== token) {
          stopCountdown();
          return;
        }
        left--;
        if (left > 0) {
          setBtnLabel(btn, tw('waiting') + ' ' + left + 's');
          return;
        }
        stopCountdown();
        resetHealth();
        busy = false;
        state = 'idle';
        btn.disabled = false;
        btn.classList.remove('wdt-wait');
        setBtnLabel(btn, tw(labelKey));
        btn.click();
      }, 1000);
    }

    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (busy) return;

      if (state === 'shown') {
        resultBox.style.display = 'none';
        state = 'idle';
        setBtnLabel(btn, tw(labelKey));
        return;
      }

      if (cached) {
        showResult(cached);
        return;
      }

      if (state === 'failed') resetHealth();

      const my = ++token;
      busy = true;
      state = 'loading';
      btn.disabled = true;
      btn.classList.remove('wdt-err', 'wdt-wait');
      setBtnLabel(btn, tw('translating'));

      let result;
      try {
        result = await translateText(getText(), (done, total) => {
          if (my === token) setBtnLabel(btn, tw('translating') + '  ' + done + '/' + total);
        });
      } catch (e) {
        result = { ok: false, kind: 'failed' };
      }

      if (my !== token) return;

      if (result && result.ok && result.text) {
        busy = false;
        btn.disabled = false;
        cached = result.partial ? null : result.text;
        showResult(result.partial ? result.text + '\n\n[' + tw('partial') + ']' : result.text);
        return;
      }

      if (result && result.kind === 'rate') {
        startCountdown(my);
        return;
      }

      busy = false;
      btn.disabled = false;
      state = 'failed';
      btn.classList.add('wdt-err');
      setBtnLabel(btn, failMessage(result ? result.kind : 'failed'));
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(resultBox);

    liveWidgets.push({
      btn: btn,
      resultBox: resultBox,
      labelKey: labelKey,
      invalidate: invalidate,
      getState: () => state,
    });

    return wrapper;
  }

  function refreshLiveWidgets() {
    const langChanged = lastRenderedLang !== settings.lang;
    lastRenderedLang = settings.lang;
    liveWidgets.forEach((w) => {
      if (langChanged) {
        w.invalidate();
        return;
      }
      const wasVisible = w.resultBox.style.display === 'block';
      styleResultBox(w.resultBox);
      w.resultBox.style.display = wasVisible ? 'block' : 'none';
      const s = w.getState();
      if (s === 'shown') setBtnLabel(w.btn, tw('hide'));
      else if (s === 'idle') setBtnLabel(w.btn, tw(w.labelKey));
    });
  }

  function markScope(el) {
    const scope =
      el.closest('.review_area, .review_box, .apphub_Card, .review_page_content') || el.parentElement;
    if (scope) scope.setAttribute(SCOPE_ATTR, '1');
  }

  function addWidgetAfter(target, labelKey) {
    const widget = buildTranslateWidget(() => extractDirectText(target), labelKey);
    widget.style.marginTop = '10px';
    if (target.parentElement) {
      target.parentElement.insertBefore(widget, target.nextSibling);
    } else {
      target.appendChild(widget);
    }
  }

  function findPermalinkReviews() {
    return Array.from(document.querySelectorAll('#ReviewText, .review_area_content .review_text'));
  }

  function addPermalinkReviewButton(el) {
    if (el.getAttribute(REVIEW_BTN_ATTR)) return;
    el.setAttribute(REVIEW_BTN_ATTR, '1');
    markScope(el);
    addWidgetAfter(el, 'translateReview');
  }

  function findReviewBoxContents() {
    return Array.from(document.querySelectorAll('.review_box .content'));
  }

  function addReviewBoxButton(el) {
    if (el.getAttribute(REVIEW_BTN_ATTR)) return;
    el.setAttribute(REVIEW_BTN_ATTR, '1');
    markScope(el);
    addWidgetAfter(el, 'translateReview');
  }

  function addReviewTranslateButton(anchor) {
    if (anchor.getAttribute(REVIEW_BTN_ATTR)) return;
    if (anchor.closest('[' + SCOPE_ATTR + ']')) return;
    anchor.setAttribute(REVIEW_BTN_ATTR, '1');
    markScope(anchor);

    const cardRoot = findCardRoot(anchor);
    const widget = buildTranslateWidget(() => extractReviewText(cardRoot, anchor), 'translateReview');
    widget.style.marginTop = '8px';
    if (anchor.parentElement) {
      anchor.parentElement.insertBefore(widget, anchor);
    } else {
      anchor.appendChild(widget);
    }
  }

  function extractLegacyCardText(cardEl) {
    const clone = stripChrome(cardEl.cloneNode(true));
    clone
      .querySelectorAll(
        'a[href*="/recommended/morelike/"], a[href*="steamcommunity.com/id/"], a[href*="steamcommunity.com/profiles/"]'
      )
      .forEach((el) => el.remove());
    return cleanBlockText(textWithBreaks(clone));
  }

  function addLegacyCardButton(cardEl) {
    if (cardEl.getAttribute(REVIEW_BTN_ATTR)) return;
    cardEl.setAttribute(REVIEW_BTN_ATTR, '1');

    const widget = buildTranslateWidget(() => extractLegacyCardText(cardEl), 'translateReview');
    widget.style.marginTop = '8px';
    cardEl.appendChild(widget);
  }

  function findLegacyCards() {
    return Array.from(document.querySelectorAll('.apphub_CardTextContent'));
  }

  function findCommentTextElements() {
    return Array.from(
      document.querySelectorAll(
        '.commentthread_comment_text, .commentthread_comment .commenttext, .forum_comment_text'
      )
    );
  }

  function extractCommentText(commentEl) {
    const clone = stripChrome(commentEl.cloneNode(true));
    clone
      .querySelectorAll(
        'img, a[href*="steamcommunity.com/id/"], a[href*="steamcommunity.com/profiles/"]'
      )
      .forEach((el) => el.remove());
    return cleanBlockText(textWithBreaks(clone));
  }

  function addCommentTranslateButton(commentEl) {
    if (commentEl.getAttribute(COMMENT_BTN_ATTR)) return;
    commentEl.setAttribute(COMMENT_BTN_ATTR, '1');

    const widget = buildTranslateWidget(() => extractCommentText(commentEl), 'translateComment');
    widget.style.marginTop = '6px';
    if (commentEl.parentElement) {
      commentEl.parentElement.insertBefore(widget, commentEl.nextSibling);
    } else {
      commentEl.appendChild(widget);
    }
  }

  function scanAndProcess() {
    if (!document.body) return;
    injectStyles();
    ensureSettingsUI();
    findPermalinkReviews().forEach(addPermalinkReviewButton);
    findReviewBoxContents().forEach(addReviewBoxButton);
    findLegacyCards().forEach(addLegacyCardButton);
    findAnchors().forEach(addReviewTranslateButton);
    findCommentTextElements().forEach(addCommentTranslateButton);
  }

  let debounceTimer = null;
  function scheduleScan() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanAndProcess, 400);
  }

  const FIXED_GEAR_CSS = 'position:fixed;bottom:24px;right:20px;width:46px;height:46px;';
  const INLINE_GEAR_CSS =
    'position:static;display:inline-flex;vertical-align:middle;margin-inline-start:12px;width:34px;height:34px;';

  let gearEl = null;
  let panelEl = null;
  let gearMode = 'fixed';

  function isGamePage() {
    return (
      /store\.steampowered\.com\/(?:[a-z-]+\/)?app\//i.test(location.href) ||
      /steamcommunity\.com\/app\//i.test(location.href)
    );
  }

  function getGameName() {
    const nameSelectors = [
      '#appHubAppName',
      '.apphub_AppName',
      '.apphub_AppName_content',
      '.apphub_HomeHeaderContent .apphub_AppName',
    ];
    for (let i = 0; i < nameSelectors.length; i++) {
      const el = document.querySelector(nameSelectors[i]);
      if (el && el.textContent && el.textContent.trim()) return el.textContent.trim();
    }
    return '';
  }

  function socialHTML() {
    return SOCIAL_LINKS.map(
      (i) =>
        '<a href="' +
        i.url +
        '" target="_blank" rel="noopener" title="' +
        i.title +
        '">' +
        i.icon +
        '</a>'
    ).join('');
  }

  function buildSettingsPanel() {
    injectStyles();

    const gear = document.createElement('button');
    gear.type = 'button';
    gear.className = 'wdt-gear';
    gear.innerHTML = ICONS.gear;
    gear.style.cssText = FIXED_GEAR_CSS;

    const panel = document.createElement('div');
    panel.className = 'wdt-panel';

    const pending = { lang: settings.lang, bgColor: settings.bgColor, textColor: settings.textColor };

    function langOptions() {
      return LANGUAGES.map(
        (l) =>
          '<option value="' +
          l.code +
          '"' +
          (l.code === pending.lang ? ' selected' : '') +
          '>' +
          l.name +
          '</option>'
      ).join('');
    }

    function render() {
      const dir = settings.uiLang === 'ar' ? 'rtl' : 'ltr';
      gear.title = t('gearTitle');

      panel.innerHTML =
        '<div class="wdt-head">' +
        logoTag('wdt-logo') +
        '<div class="wdt-htxt">' +
        '<div class="wdt-title">WDSteam <span>Translate</span></div>' +
        '<div class="wdt-sub">' + t('brandSub') + '</div>' +
        '</div>' +
        '<button type="button" class="wdt-x" id="wdt_close" title="' + t('closeTitle') + '">' + ICONS.close + '</button>' +
        '</div>' +

        '<div class="wdt-card"><div class="wdt-row">' +
        '<span class="wdt-ico">' + ICONS.globe + '</span>' +
        '<span class="wdt-lbl"><b>' + t('uiLangLabel') + '</b><i>' + t('uiLangDesc') + '</i></span>' +
        '<span class="wdt-seg">' +
        '<button type="button" id="wdt_ui_en" class="' + (settings.uiLang === 'en' ? 'on' : '') + '">English<span class="wdt-chk">' + ICONS.check + '</span></button>' +
        '<button type="button" id="wdt_ui_ar" class="' + (settings.uiLang === 'ar' ? 'on' : '') + '">العربية<span class="wdt-chk">' + ICONS.check + '</span></button>' +
        '</span></div></div>' +

        '<div class="wdt-card"><div class="wdt-row">' +
        '<span class="wdt-ico">' + ICONS.lang + '</span>' +
        '<span class="wdt-lbl"><b>' + t('targetLangLabel') + '</b><i>' + t('targetLangDesc') + '</i></span>' +
        '<span class="wdt-selwrap"><select class="wdt-sel" id="wdt_lang_select">' + langOptions() + '</select>' +
        '<span class="wdt-chev">' + ICONS.chevron + '</span></span>' +
        '</div></div>' +

        '<div class="wdt-card"><div class="wdt-cols">' +
        '<div class="wdt-half">' +
        '<div class="wdt-row"><span class="wdt-ico">' + ICONS.brush + '</span>' +
        '<span class="wdt-lbl"><b>' + t('bgLabel') + '</b><i>' + t('bgDesc') + '</i></span></div>' +
        '<div class="wdt-pick"><input type="color" class="wdt-swatch" id="wdt_bg_input" value="' + pending.bgColor + '">' +
        '<input type="text" class="wdt-hex" id="wdt_bg_hex" value="' + pending.bgColor.toUpperCase() + '" spellcheck="false"></div>' +
        '</div>' +
        '<div class="wdt-vline"></div>' +
        '<div class="wdt-half">' +
        '<div class="wdt-row"><span class="wdt-ico">' + ICONS.text + '</span>' +
        '<span class="wdt-lbl"><b>' + t('textLabel') + '</b><i>' + t('textDesc') + '</i></span></div>' +
        '<div class="wdt-pick"><input type="color" class="wdt-swatch" id="wdt_text_input" value="' + pending.textColor + '">' +
        '<input type="text" class="wdt-hex" id="wdt_text_hex" value="' + pending.textColor.toUpperCase() + '" spellcheck="false"></div>' +
        '</div>' +
        '</div></div>' +

        '<button type="button" class="wdt-save" id="wdt_save_btn"><span class="wdt-sico">' + ICONS.save + '</span>' + t('saveBtn') + '</button>' +
        '<div class="wdt-note"><span class="wdt-nico">' + ICONS.bolt + '</span><span>' + t('note') + '</span></div>' +

        '<div class="wdt-card wdt-foot">' +
        '<div class="wdt-thanks">' + t('thanks') + ' <b>WDSteam Translate</b></div>' +
        '<div class="wdt-social">' + socialHTML() + '</div>' +
        '</div>' +
        '<div class="wdt-rights">' + t('rights') + '</div>';

      panel.style.direction = 'ltr';
      panel.querySelectorAll('.wdt-lbl, .wdt-thanks, .wdt-sub').forEach((el) => {
        el.style.direction = dir;
      });

      panel.querySelector('#wdt_close').addEventListener('click', () => {
        panel.style.display = 'none';
      });

      panel.querySelector('#wdt_ui_en').addEventListener('click', () => {
        settings.uiLang = 'en';
        render();
      });
      panel.querySelector('#wdt_ui_ar').addEventListener('click', () => {
        settings.uiLang = 'ar';
        render();
      });

      panel.querySelector('#wdt_lang_select').addEventListener('change', (e) => {
        pending.lang = e.target.value;
      });

      const bgInput = panel.querySelector('#wdt_bg_input');
      const bgHex = panel.querySelector('#wdt_bg_hex');
      const textInput = panel.querySelector('#wdt_text_input');
      const textHex = panel.querySelector('#wdt_text_hex');

      function bindColor(picker, hex, key) {
        picker.addEventListener('input', (e) => {
          pending[key] = e.target.value;
          hex.value = e.target.value.toUpperCase();
        });
        hex.addEventListener('input', (e) => {
          let v = e.target.value.trim();
          if (v && v.charAt(0) !== '#') v = '#' + v;
          if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            pending[key] = v;
            picker.value = v;
          }
        });
        hex.addEventListener('blur', () => {
          hex.value = pending[key].toUpperCase();
        });
      }

      bindColor(bgInput, bgHex, 'bgColor');
      bindColor(textInput, textHex, 'textColor');

      panel.querySelector('#wdt_save_btn').addEventListener('click', () => {
        settings.lang = pending.lang;
        settings.bgColor = pending.bgColor;
        settings.textColor = pending.textColor;
        saveSettings();
        refreshLiveWidgets();
        panel.style.display = 'none';
      });
    }

    function renderNoTranslation() {
      const dir = settings.uiLang === 'ar' ? 'rtl' : 'ltr';
      const name = getGameName();
      panel.style.direction = dir;
      panel.innerHTML =
        '<div class="wdt-nohead">' +
        '<button type="button" class="wdt-x" id="wdt_close_no" title="' + t('closeTitle') + '">' + ICONS.close + '</button>' +
        '</div>' +
        '<div class="wdt-noscreen">' +
        '<div class="wdt-nologo-wrap">' +
        logoTag('wdt-nologo') +
        '<span class="wdt-nobadge">' + ICONS.close + '</span>' +
        '</div>' +
        (name ? '<div class="wdt-noname">' + name + '</div>' : '') +
        '<div class="wdt-notitle">' + t('noTransTitle') + '</div>' +
        '<div class="wdt-nodesc">' + t('noTransDesc') + '</div>' +
        '<button type="button" class="wdt-nosettings" id="wdt_open_settings_no">' +
        ICONS.gear + '<span>' + t('openSettings') + '</span></button>' +
        '</div>';

      panel.querySelector('#wdt_close_no').addEventListener('click', () => {
        panel.style.display = 'none';
      });
      panel.querySelector('#wdt_open_settings_no').addEventListener('click', () => {
        render();
      });
    }

    render();

    document.body.appendChild(gear);
    document.body.appendChild(panel);
    gearEl = gear;
    panelEl = panel;

    gear.addEventListener('click', () => {
      if (panel.style.display === 'block') {
        panel.style.display = 'none';
        return;
      }
      if (liveWidgets.length === 0 && isGamePage()) {
        renderNoTranslation();
      } else {
        render();
      }
      const rect = gear.getBoundingClientRect();
      const width = 420;
      const height = Math.min(window.innerHeight * 0.86, 660);
      let left = rect.right - width;
      left = Math.min(Math.max(left, 8), Math.max(8, window.innerWidth - width - 8));
      let top = rect.bottom + 10;
      if (top + height > window.innerHeight - 8) top = window.innerHeight - height - 8;
      panel.style.left = left + 'px';
      panel.style.top = Math.max(top, 8) + 'px';
      panel.style.display = 'block';
    });
  }

  function findFilterHintRow() {
    const byClass = document.querySelector(
      '#reviews_active_filters, .user_reviews_active_filters, #NoReviewsForFilter, #NoReviewsMessage, .no_reviews'
    );
    if (byClass) return byClass;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue) continue;
      const value = node.nodeValue;
      if (/reviews that match the filters above/i.test(value)) return node.parentElement;
      if (/there are no reviews for this product/i.test(value)) return node.parentElement;
      if (/no reviews match the filters/i.test(value)) return node.parentElement;
    }
    return null;
  }

  function placeGear() {
    const row = findFilterHintRow();
    if (row) {
      if (gearMode !== 'inline' || gearEl.parentElement !== row) {
        gearEl.style.cssText = INLINE_GEAR_CSS;
        row.appendChild(gearEl);
        gearMode = 'inline';
      }
    } else if (gearMode !== 'fixed' || !document.body.contains(gearEl)) {
      gearEl.style.cssText = FIXED_GEAR_CSS;
      document.body.appendChild(gearEl);
      gearMode = 'fixed';
    }
  }

  function ensureSettingsUI() {
    if (!gearEl) return;
    placeGear();
    if (panelEl && !document.body.contains(panelEl)) {
      document.body.appendChild(panelEl);
    }
  }

  onSettingsChanged((changed) => {
    let dirty = false;
    if (changed.wdt_lang !== undefined && changed.wdt_lang !== settings.lang) {
      settings.lang = changed.wdt_lang;
      dirty = true;
    }
    if (changed.wdt_uiLang !== undefined && changed.wdt_uiLang !== settings.uiLang) {
      settings.uiLang = changed.wdt_uiLang;
      dirty = true;
    }
    if (changed.wdt_bgColor !== undefined && changed.wdt_bgColor !== settings.bgColor) {
      settings.bgColor = changed.wdt_bgColor;
      dirty = true;
    }
    if (changed.wdt_textColor !== undefined && changed.wdt_textColor !== settings.textColor) {
      settings.textColor = changed.wdt_textColor;
      dirty = true;
    }
    if (dirty) refreshLiveWidgets();
  });

  injectStyles();
  if (IS_TOP_FRAME) buildSettingsPanel();
  scanAndProcess();

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('load', scheduleScan);
})();
