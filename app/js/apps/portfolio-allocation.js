import {SECTORS,shade,priceStale,portfolioSnapshot,moneyBridge,viewSettings,DEFAULT_TARGETS,validateTargets,reviewQueue} from '../features/portfolio/model.js';
import {cockpit,holdingsTable,logo,money,percent,appURL} from '../features/portfolio/views.js';
import {COMPANY_CATALOG,companyIdentity,companyLogoURL,companySector,canonicalSymbol} from '../core/company-catalog.js';
import { load, save, flushStorage } from "../core/storage.js";
import { SITE } from "../core/app-shell.js";
import { flush, num, esc } from "../core/ui.js";
import { getResearch, researchIcon } from "../core/research-store.js";
import { portfolioCoverage, needsReview } from "../core/research-model.js";

// Portfolio — พอร์ตส่วนตัว (ROADMAP 4.1)
// กติกาสองข้อที่คุมดีไซน์ทั้งไฟล์:
//   1. โค้ดอยู่บน repo สาธารณะ ข้อมูลไม่ใช่ → ในไฟล์นี้มีแค่ catalog (ชื่อ/กลุ่ม/บทความ)
//      ตัวเลขพอร์ตทุกตัวมาจากที่ PP กรอกเอง เก็บในเครื่องนี้เท่านั้น — จงใจไม่อยู่ใน SYNC_KEYS
//      (พอร์ตจริงไม่ขึ้น cloud แม้จะเป็น secret gist ก็ตาม ต่างจาก health/money)
//   2. ราคาไม่เดาเอง — ไม่มี API ไม่มี estimate; PP กรอกราคา แล้วแอปเตือนเมื่อราคาเก่ากว่า 1 trading day
//      (กติกาเดียวกับ pipeline วิเคราะห์: MoS ที่คำนวณบนราคาค้าง = ผิดแบบเงียบๆ)

const KEY = "pf.holdings";

// Company identity, assets and groups are shared across workspaces.
const CATALOG = COMPANY_CATALOG;
const meta = tk => companyIdentity(tk) ? [companyIdentity(tk)[0],companyIdentity(tk)[1],companySector(tk),Boolean(companyLogoURL(tk))] : null;

const usd2 = (n) => `$${num(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const val = (h) => (h.shares ?? 0) * (h.price ?? 0);
const article = tk => companyIdentity(tk)&&!['V','BRK-B'].includes(canonicalSymbol(tk)) ? `${SITE}articles/deep-dive-${canonicalSymbol(tk).toLowerCase()}.html` : null;

const isStale = priceStale;

const ICO = {
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5"/><path d="M8.5 7.5h6M8.5 11h4"/></svg>`,
};

// โลโก้จากเว็บ (origin เดียวกัน) — ตัวที่โลโก้เป็น wordmark ยาวๆ ใส่ในไทล์สี่เหลี่ยมแล้วอ่านไม่ออก
// เลยใช้ตัวย่อบนพื้นสีประจำกลุ่มแทน; ถ้ารูปโหลดไม่ขึ้น (ออฟไลน์) ก็ตกมาที่ตัวย่อเหมือนกัน
function logoHTML(tk,sec,rank) { return logo(canonicalSymbol(tk),shade(sec,rank)); }

export default {
  id: 'portfolio', name: 'Portfolio', icon: '🥧', defaultSize: {w:1180,h:820},
  mount(body, {onOpenHealth,onOpenThesis,getCompanies=()=>[]} = {}) {
    body.classList.add('app-pane','app-pf','pc-cockpit');
    let view=viewSettings(load('pf.cockpit.view.v1',{})),research=[],researchError='',message='';
    let snapshot,bridge,pendingRefresh=false;
    const read=()=>load(KEY,[]);
    const write=hs=>save(KEY,hs);
    const persistHoldings=async (hs,host)=>{
      write(hs);
      if(await flushStorage())return true;
      let error=host.querySelector('[data-save-error]');
      if(!error){error=document.createElement('p');error.dataset.saveError='';error.className='pc-form-error';error.setAttribute('role','alert');host.querySelector('.sheet-card').append(error);}
      error.textContent='Save could not be confirmed. Keep this dialog open and retry.';return false;
    };
    const refreshModel=()=>{
      snapshot=portfolioSnapshot(read(),load('pf.targets.v1',DEFAULT_TARGETS),getCompanies());
      bridge=moneyBridge(load('money.entries',[]));
    };
    const render=()=>{
      refreshModel();
      body.innerHTML=cockpit(snapshot,bridge,view,{research,researchError,message});
      renderResearch(read());
    };
    const persistView=()=>save('pf.cockpit.view.v1',view);
    const filter=(key,value)=>{view[key]=view[key]===value?(key==='sector'?'all':''):value;persistView();render();};
    async function refreshResearch(retry=false) {
      try {const data=await getResearch({retry});research=data.companies;researchError='';}
      catch {researchError='Research checks unavailable.';}
      if(body.isConnected){if(body.querySelector('dialog[open]'))pendingRefresh=true;else render();}
    }
    function openTargets() {
      const targets=snapshot.targets;
      const field=(group,key,label)=>`<label class="pf-f"><span>${esc(label)} (%)</span><input type="number" min="0" max="100" step="any" data-target-group="${group}" data-target-key="${esc(key)}" value="${targets[group][key]??''}" placeholder="No target"></label>`;
      const {host,close}=sheet(`<div class="sheet-h"><span>Allocation settings</span><button class="sheet-x" aria-label="Close">✕</button></div><p class="sheet-p">Targets are percentages of all holdings, excluding cash. Blank means no target; 0% is an explicit target. Each group can total up to 100%.</p><form class="pc-target-form"><h3>Holding targets</h3><div class="pc-target-inputs">${[...new Set([...snapshot.rows.map(r=>r.tk),...Object.keys(targets.holdings)])].map(tk=>field('holdings',tk,tk)).join('')||'<p>Add a holding to set its target.</p>'}</div><h3>Sector targets</h3><div class="pc-target-inputs">${Object.entries(SECTORS).map(([sec,v])=>field('sectors',sec,v.label)).join('')}</div><h3>Review thresholds</h3><div class="pc-target-inputs">${[['tolerance','On-target tolerance (pp)'],['top3','Top 3 alert above (%)'],['top5','Top 5 alert above (%)']].map(([key,label])=>`<label class="pf-f"><span>${label}</span><input name="${key}" type="number" min="0" max="100" step="any" value="${targets[key]}" required></label>`).join('')}</div><p role="alert" class="pc-form-error"></p><button class="qa-submit" type="submit">Save allocation settings</button></form>`);
      host.querySelector('form').addEventListener('submit',async e=>{
        e.preventDefault();const next={holdings:{},sectors:{},updatedAt:new Date().toISOString()};
        for(const input of host.querySelectorAll('[data-target-group]'))if(input.value!=='')next[input.dataset.targetGroup][input.dataset.targetKey]=Number(input.value);
        for(const key of ['tolerance','top3','top5'])next[key]=Number(e.target.elements[key].value);
        try {save('pf.targets.v1',validateTargets(next));if(!await flushStorage())throw new Error('Save could not be confirmed. Keep this dialog open and retry.');message='Allocation settings saved on this device.';close();render();}
        catch(error){host.querySelector('.pc-form-error').textContent=error.message;}
      });
    }
    body.addEventListener('error',e=>{if(e.target.matches('[data-pc-logo]'))e.target.remove();},true);
    body.addEventListener('input',e=>{
      if(e.target.dataset.pcView!=='query')return;
      view.query=e.target.value;persistView();
      body.querySelector('.pc-table-content').innerHTML=holdingsTable(snapshot,view);
    });
    body.addEventListener('change',e=>{
      const key=e.target.dataset.pcView;if(!key)return;
      view[key]=e.target.value;persistView();render();body.querySelector(`[data-pc-view="${key}"]`)?.focus();
    });
    body.addEventListener('keydown',e=>{
      if(e.target.matches('.pf-arc')&&['Enter',' '].includes(e.key)){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
    });
    body.addEventListener('click',e=>{
      if(e.target.closest('.pf-sheet,.pf-research,.pf-thesis-entry'))return;
      const t=e.target.closest('button,a,.pf-arc');
      if(t?.matches('.pf-add,[data-pc-add]'))openHolding(null);
      else if(t?.matches('.pf-asof'))openPrices();
      else if(t?.hasAttribute('data-pc-targets'))openTargets();
      else if(t?.dataset.pcGroup){view.group=t.dataset.pcGroup;persistView();render();}
      else if(t?.dataset.pcSector)filter('sector',t.dataset.pcSector);
      else if(t?.dataset.pcHolding)filter('holding',t.dataset.pcHolding);
      else if(t?.hasAttribute('data-pc-reset')){view={...view,query:'',sector:'all',thesis:'all',holding:''};persistView();render();}
      else if(t?.hasAttribute('data-pc-retry'))refreshResearch(true);
      else if(t?.hasAttribute('data-pc-review')){
        const q=reviewQueue(snapshot,bridge,research)[Number(t.dataset.pcReview)];
        if(q.action==='holding')openHolding(read().find(h=>canonicalSymbol(h.tk)===q.symbol));
        if(q.action==='thesis')onOpenThesis?.(q.symbol);
        if(q.action==='research')document.dispatchEvent(new CustomEvent('pp-research',{detail:{ticker:q.symbol}}));
        if(q.action==='sector')filter('sector',q.sector);
        if(q.action==='targets')openTargets();
        if(q.action==='money')location.href=appURL('money');
      } else if(e.target.closest('.pf-row') && (!t || t.hasAttribute('data-pc-open'))){
        const tk=e.target.closest('.pf-row').dataset.tk;openHolding(read().find(h=>canonicalSymbol(h.tk)===tk));
      }
    });
    function renderResearch(holdings) {
      if(onOpenHealth){
        const entry=document.createElement('button');entry.className='pf-thesis-entry';
        entry.setAttribute('aria-label','Open Portfolio Health and Living Thesis');
        entry.innerHTML=`${researchIcon('activity')}<span><b>Portfolio Health</b><small>Living Thesis · Review the businesses behind your holdings</small></span>${researchIcon('arrow-up-right')}`;
        entry.addEventListener('click',onOpenHealth);body.querySelector('.pc-visual-grid').before(entry);
      }
      const coverage=portfolioCoverage(holdings,research);
      const section=document.createElement('section');section.className='pf-research';
      const due=research.filter(c=>coverage.tickers.includes(c.ticker)&&needsReview(c)).length;
      section.innerHTML=`<div class="pf-research-head"><h3>Research coverage</h3><button class="pf-research-open">Research ↗</button></div><p>${researchError||(!research.length?'Loading snapshots…':coverage.count?`${coverage.covered} of ${coverage.count} holdings have library snapshots${coverage.percent===null||!snapshot.compatible?'':` · ${coverage.percent.toFixed(1)}% by entered value`}. ${due} snapshots due for review. ${coverage.unpriced?'Unpriced holdings: weight coverage unavailable.':''} Not a live thesis assessment.`:'Library snapshots available. No holdings added to your portfolio.')}</p><div class="pf-research-links"></div>`;
      section.querySelector('.pf-research-open').addEventListener('click',()=>document.dispatchEvent(new CustomEvent('pp-research')));
      for(const ticker of coverage.count?coverage.tickers:research.map(c=>c.ticker)){
        const b=document.createElement('button');b.textContent=ticker+' ↗';b.setAttribute('aria-label',`Research ${ticker}`);
        b.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('pp-research',{detail:{ticker}})));section.querySelector('.pf-research-links').append(b);
      }
      body.querySelector('.pf-foot').before(section);
    }

    // ---- ชีตกลาง ----
    function sheet(inner, {onClose}={}) {
      const trigger=document.activeElement;
      const host=document.createElement('dialog');host.className='pf-sheet pc-dialog';
      host.innerHTML=`<div class="sheet-card">${inner}</div>`;body.append(host);
      host.setAttribute('aria-label',host.querySelector('.sheet-h span')?.textContent||'Portfolio details');
      const close=()=>host.close();
      host.addEventListener('close',()=>{host.remove();if(pendingRefresh&&body.isConnected){pendingRefresh=false;render();}onClose?.();(trigger?.isConnected?trigger:body.querySelector('.pf-add'))?.focus({preventScroll:true});},{once:true});
      host.addEventListener('click',e=>{if(e.target===host)close();});
      host.querySelector('.sheet-x')?.addEventListener('click',close);
      host.showModal();return {host,close};
    }

    // ---- เพิ่ม / แก้ / ลบ หุ้นหนึ่งตัว ----
    function openHolding(existing, presetTk = "") {
      const h = existing ?? null;
      const tk0 = h?.tk ?? presetTk;
      const m0 = meta(tk0);

      const stat = () => {
        if(!h)return '';
        const r=snapshot.rows.find(r=>r.h===h || r.tk===canonicalSymbol(h.tk));
        return `<div class="pc-stock-detail"><div class="pc-detail-identity">${logo(r.tk,r.color)}<div><span class="pc-kicker">STOCK DETAIL · YOUR HOLDING</span><h2>${esc(r.name)}</h2><p>${esc(r.tk)} · ${SECTORS[r.sec].label}</p></div></div><div class="pf-stat"><div><b>${percent(r.weight)}</b><small>portfolio weight</small></div><div><b>${money(r.value,r.currency)}</b><small>entered value</small></div><div><b>${money(r.gain,r.currency)}</b><small>unrealized gain</small></div></div><p class="pc-note">Source: your entered holding · price ${r.priceAt?new Date(r.priceAt).toISOString().slice(0,10):'date unavailable'}${r.stale?' · stale':''}</p><p class="pc-note">Thesis: ${esc(r.thesis)} · ${r.company?.holding.lastUpdated||'Evidence date unavailable'}</p><nav class="pc-detail-links" aria-label="Stock workspaces"><button type="button" data-stock-thesis>Living Thesis ↗</button><a href="${appURL('research',r.tk)}">Research ↗</a><a href="${appURL('smart-money',r.tk)}">Smart Money ↗</a></nav><h3>Edit holding</h3></div>`;
      };

      const art = tk0 ? article(tk0) : null;
      const { host, close } = sheet(`
        <div class="sheet-h">
          <span>${h ? `${esc(h.tk)} · ${esc(meta(h.tk)?.[0] ?? "Holding")}` : "Add a holding"}</span>
          <button class="sheet-x" aria-label="Close">✕</button>
        </div>
        ${stat()}
        <form class="qa-form pf-form">
          <label class="pf-f">
            <span>Ticker</span>
            <input name="tk" list="pf-tks" value="${esc(tk0)}" placeholder="SNPS" autocomplete="off"
              spellcheck="false" ${h ? "readonly" : ""} required>
          </label>
          <datalist id="pf-tks">${Object.keys(CATALOG).map((t) => `<option value="${t}">`).join("")}</datalist>
          <div class="pf-known">${m0 ? `${esc(m0[0])} · ${SECTORS[m0[2]].label}` : ""}</div>
          <label class="pf-f pf-f-sec${m0 ? " hidden" : ""}">
            <span>Sector</span>
            <select name="sec">
              ${Object.entries(SECTORS)
                .map(([k, s]) => `<option value="${k}"${(h?.sec ?? "other") === k ? " selected" : ""}>${s.label}</option>`)
                .join("")}
            </select>
          </label>
          <div class="pf-f2">
            <label class="pf-f"><span>Shares</span>
              <input name="shares" type="number" inputmode="decimal" step="any" min="0" value="${h?.shares ?? ""}" placeholder="0" required></label>
            <label class="pf-f"><span>Avg cost / share</span>
              <input name="cost" type="number" inputmode="decimal" step="any" min="0" value="${h?.cost ?? ""}" placeholder="0.00" required></label>
          </div>
          <label class="pf-f"><span>Price now — the one you looked up</span>
            <input name="price" type="number" inputmode="decimal" step="any" min="0" value="${h?.price ?? ""}" placeholder="0.00" required></label>
          <button class="qa-submit" type="submit">${h ? "Save changes" : "Add to portfolio"}</button>
        </form>
        ${art ? `<a class="pf-read" href="${art}" data-art="${tk0}">${ICO.book}<b>Read the deep-dive</b><span>›</span></a>` : ""}
        ${h ? `<button class="pf-del">Remove from portfolio</button>` : ""}
      `);

      host.querySelector('[data-stock-thesis]')?.addEventListener('click',()=>{close();onOpenThesis?.(canonicalSymbol(tk0));});
      const form = host.querySelector("form");
      const known = host.querySelector(".pf-known");
      const secField = host.querySelector(".pf-f-sec");

      // พิมพ์ ticker ที่เว็บผ่าแล้ว → ชื่อกับกลุ่มมาเอง ไม่ต้องเลือก
      form.tk.addEventListener("input", () => {
        const tk = form.tk.value.trim().toUpperCase();
        const m = meta(tk);
        known.textContent = m ? `${m[0]} · ${SECTORS[m[2]].label}` : "";
        secField.classList.toggle("hidden", !!m);
      });

      host.querySelector("[data-art]")?.addEventListener("click", (e) => {
        e.preventDefault();
        const tk = e.currentTarget.dataset.art;
        close();
        document.dispatchEvent(
          new CustomEvent("pp-open-web", { detail: { url: article(tk), title: `${tk} · deep-dive` } })
        );
      });

      // ลบ = สองจังหวะ ไม่มี dialog ให้กดพลาด
      const del = host.querySelector(".pf-del");
      let armed = false;
      del?.addEventListener("click", async () => {
        if (!armed) {
          armed = true;
          del.classList.add("armed");
          del.textContent = `Tap again to remove ${h.tk}`;
          return;
        }
        if(!await persistHoldings(read().filter((x) => h.id!=null?x.id!==h.id:x.tk!==h.tk),host))return;
        close();
        render();
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        // ticker เข้า innerHTML/attribute หลายจุด — รับเฉพาะอักขระที่ ticker จริงมีได้
        const tk = canonicalSymbol(form.tk.value.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, ""));
        const shares = parseFloat(form.shares.value);
        const cost = parseFloat(form.cost.value);
        const price = parseFloat(form.price.value);
        if (!tk || ![shares, cost, price].every((n) => Number.isFinite(n) && n >= 0)) return;

        const all = structuredClone(read());
        const sec = h?.sec ?? meta(tk)?.[2] ?? form.sec.value;
        if (h) {
          const hit = all.find((x) => h.id!=null?x.id===h.id:x.tk===h.tk);
          Object.assign(hit, { shares, cost, sec, ...(price !== h.price ? { price, priceAt: Date.now() } : { price }) });
        } else {
          const dup = all.find((x) => canonicalSymbol(x.tk) === tk);
          if (dup) {
            Object.assign(dup, { shares, cost, price, priceAt: Date.now() });
          } else {
            all.push({ id: Date.now(), tk, sec, shares, cost, price, priceAt: Date.now() });
          }
        }
        if(!await persistHoldings(all,host))return;
        close();
        render();
      });

      if (!h) form.tk.focus();
    }

    // ---- อัปเดตราคาทั้งพอร์ตในชีตเดียว (ยาวสุด 20 ตัว พิมพ์รวดเดียวจบ) ----
    function openPrices() {
      const all = read();
      if (!all.length) return;
      const sorted = [...all].sort((a, b) => val(b) - val(a));

      const { host, close } = sheet(`
        <div class="sheet-h"><span>Update prices</span><button class="sheet-x" aria-label="Close">✕</button></div>
        <p class="sheet-p">Prices come from you — the app has no feed and never estimates.
          Type the last close you looked up; anything you leave alone keeps its old stamp.</p>
        <form class="pf-prices">
          ${sorted
            .map((h) => {
              const sec = h.sec ?? meta(h.tk)?.[2] ?? "other";
              return `<label class="pf-price-row${isStale(h) ? " stale" : ""}">
                ${logoHTML(h.tk, sec, 0)}
                <span class="pf-price-t"><b>${esc(h.tk)}</b><small>${
                  h.priceAt ? `was ${usd2(h.price)}` : "no price yet"
                }</small></span>
                <input name="p_${esc(h.id??h.tk)}" type="number" inputmode="decimal" step="any" min="0"
                  value="${h.price ?? ""}" aria-label="${esc(h.tk)} price">
              </label>`;
            })
            .join("")}
          <button class="qa-submit" type="submit">Save prices</button>
        </form>
      `);

      const priceForm = host.querySelector("form");
      // จำว่าช่องไหนถูกแตะจริง — "แตะ" (แม้พิมพ์เลขเดิมเพื่อยืนยัน) = ไปดูราคามาแล้ว stamp ใหม่ได้
      // ช่องที่ไม่ได้แตะต้องคง stamp เดิมตามที่ copy สัญญา ไม่ใช่ถูกประทับว่า current ฟรีๆ แค่กด Save
      priceForm.addEventListener("input", (e) => {
        if (e.target.name?.startsWith("p_")) e.target.dataset.dirty = "1";
      });
      priceForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const cur = structuredClone(read());
        for (const h of cur) {
          const input = e.target.elements[`p_${h.id??h.tk}`];
          if (!input?.dataset.dirty) continue;
          const v = parseFloat(input.value);
          if (!Number.isFinite(v) || v < 0) continue;
          h.price = v;
          h.priceAt = Date.now();
        }
        if(!await persistHoldings(cur,host))return;
        close();
        render();
      });
    }

    flush(body);
    render();
    refreshResearch();
    return {refresh(){if(body.querySelector('dialog[open]'))pendingRefresh=true;else render();}};
  },
};
