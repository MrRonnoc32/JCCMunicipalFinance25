"use strict";
// DATA is defined in assets/data.js

/* ---------- helpers ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const short = n => n.replace('Jacksonville/Duval, FL','Jacksonville').replace('Nashville/Davidson, TN','Nashville, TN');
const median = a => { const s=[...a].sort((x,y)=>x-y), m=s.length>>1; return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
const fmt$ = v => (v<0?'−$':'$') + Math.round(Math.abs(v)).toLocaleString('en-US');
const fmtPct = v => v.toFixed(1) + '%';
const fmt1k = v => '$' + v.toFixed(2);
const structText = s => ({pair:'City plus its share of county spending', consolidated:'Consolidated city-county government', independent_city:'Independent city (no county layer)'}[s] || '');
const ordinal = n => n + (['th','st','nd','rd'][((n%100-20)%10)] || ['th','st','nd','rd'][n%100] || 'th');
const isJax = d => d.name.startsWith('Jacksonville');
const PEERS = DATA.peers;
const OX = DATA.oxford;
const BOTH = new Set(['Charlotte, NC','Nashville/Davidson, TN','Austin, TX']);
const FN = ['general_government','public_safety','transportation','human_services','culture_recreation','economic_environment','physical_environment','debt_interest'];
const FN_LABEL = {expenses_ex_ed:'All services', general_government:'General government', public_safety:'Public safety', transportation:'Transportation', human_services:'Human services and health', culture_recreation:'Culture and recreation', economic_environment:'Economic development', physical_environment:'Physical environment', debt_interest:'Interest on debt'};
PEERS.forEach(d => { d.npl_ratio = d.npl_total_pc / d.own_source_rev_pc * 100; FN.forEach(f => d[f+'_sh'] = d[f+'_pc'] / d.expenses_ex_ed_pc * 100); });

/* ---------- tooltip ---------- */
const tip = $('#tip');
function showTip(html, el, ev){
  tip.innerHTML = html; tip.hidden = false;
  const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = ev && ev.clientX ? ev.clientX + 14 : r.left + Math.min(r.width*0.5, 260);
  let y = r.top - th - 8; if (y < 60) y = r.bottom + 8;
  x = Math.min(Math.max(8, x), window.innerWidth - tw - 8);
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
function hideTip(){ tip.hidden = true; }
window.addEventListener('scroll', hideTip, {passive:true});

/* ---------- generic sorted bar chart ---------- */
const ROW = 34;
function BarChart(key, getSpec){
  const host = $(`[data-chart="${key}"]`);
  const sumEl = $(`[data-summary="${key}"]`), footEl = $(`[data-foot="${key}"]`), tblEl = $(`[data-table="${key}"]`);
  host.setAttribute('role','list');
  const overlay = document.createElement('div'); overlay.className='overlay'; overlay.setAttribute('aria-hidden','true');
  const zero = document.createElement('div'); zero.className='zero';
  const med = document.createElement('div'); med.className='median';
  const cap = document.createElement('div'); cap.className='median-cap';
  overlay.append(zero, med, cap); host.append(overlay);
  const rows = new Map();
  function render(){
    const spec = getSpec();   // {rows:[{name,value,jax,tag,struct}], fmt, medLabel, title, unit, foot}
    const data = spec.rows.filter(r => r.value != null && isFinite(r.value)).sort((a,b) => b.value - a.value);
    const vals = data.map(r => r.value), peerVals = data.filter(r=>!r.jax).map(r=>r.value);
    const med_v = median(peerVals);
    const maxV = Math.max(0, ...vals), minV = Math.min(0, ...vals);
    const lo = minV < 0 ? minV - (maxV - minV) * 0.12 : 0, hi = maxV * 1.2;
    const x = v => (v - lo) / (hi - lo) * 100;
    // label column width
    const labw = getComputedStyle(host).getPropertyValue('--labw').trim() || '215px';
    overlay.style.left = labw;
    zero.style.left = x(0) + '%'; zero.style.display = minV < 0 ? '' : 'none';
    med.style.left = x(med_v) + '%'; cap.style.left = x(med_v) + '%';
    cap.textContent = (spec.medLabel || 'Peer median') + ': ' + spec.fmt(med_v);
    host.style.height = data.length * ROW + 'px';
    const seen = new Set();
    data.forEach((r, i) => {
      seen.add(r.name);
      let el = rows.get(r.name);
      if (!el){
        el = document.createElement('div'); el.className = 'brow' + (r.jax ? ' jax' : ''); el.tabIndex = 0; el.setAttribute('role','listitem');
        el.innerHTML = `<div class="blab"></div><div class="track"><div class="bar"></div><div class="bval"></div></div>`;
        el.style.top = i * ROW + 'px';
        host.insertBefore(el, overlay);
        rows.set(r.name, el);
        const on = ev => { el.classList.add('on'); showTip(el._tip, el, ev); };
        const off = () => { el.classList.remove('on'); hideTip(); };
        el.addEventListener('mouseenter', on); el.addEventListener('mousemove', on); el.addEventListener('mouseleave', off);
        el.addEventListener('focus', on); el.addEventListener('blur', off);
      }
      el.hidden = false;
      el.style.top = i * ROW + 'px';
      const lab = el.querySelector('.blab');
      lab.innerHTML = short(r.name) + (r.tag ? `<span class="tag">${r.tag}</span>` : '');
      const bar = el.querySelector('.bar'), bv = el.querySelector('.bval');
      const a = x(Math.min(0, r.value)), b = x(Math.max(0, r.value));
      bar.style.left = a + '%'; bar.style.width = Math.max(b - a, 0.4) + '%';
      bar.classList.toggle('neg', r.value < 0);
      bv.textContent = spec.fmt(r.value);
      if (r.value < 0){ bv.style.left = 'auto'; bv.style.right = (100 - a) + '%'; }
      else { bv.style.right = 'auto'; bv.style.left = b + '%'; }
      const rank = i + 1, diff = r.value - med_v;
      const diffTxt = spec.unit === 'pct' ? `${Math.abs(diff).toFixed(1)} points ${diff>=0?'above':'below'}` : `${spec.fmt(Math.abs(diff))} ${diff>=0?'above':'below'}`;
      el._tip = `<b>${short(r.name)}</b>${spec.fmt(r.value)} ${spec.unitWord||''}<br><span class="m">${ordinal(rank)} highest of ${data.length}. ${diffTxt} the median.</span>${r.struct?`<br><span class="m">${structText(r.struct)}</span>`:''}`;
      el.setAttribute('aria-label', `${short(r.name)}: ${spec.fmt(r.value)}. ${ordinal(rank)} highest of ${data.length}. ${diffTxt} the median.`);
    });
    rows.forEach((el, name) => { if (!seen.has(name)) el.hidden = true; });
    // summary
    const j = data.find(r => r.jax), jr = data.indexOf(j) + 1;
    if (j){
      sumEl.textContent = `${spec.title}: Jacksonville ${spec.fmt(j.value)}, ranked ${ordinal(jr)} of ${data.length}. ${spec.medLabel || 'Peer median'}: ${spec.fmt(med_v)}.`;
    }
    footEl.textContent = spec.foot || ''; footEl.hidden = !spec.foot;
    // table
    tblEl.innerHTML = `<table><caption>${spec.title}</caption><thead><tr><th scope="col">Rank</th><th scope="col">Government</th><th scope="col" class="n">${spec.colHead||'Value'}</th></tr></thead><tbody>` +
      data.map((r,i)=>`<tr class="${r.jax?'jax':''}"><td>${i+1}</td><th scope="row" style="font-weight:inherit">${short(r.name)}${r.tag?` (${r.tag})`:''}</th><td class="n">${spec.fmt(r.value)}</td></tr>`).join('') +
      `<tr><td></td><th scope="row" style="font-weight:600">${spec.medLabel || 'Peer median'}</th><td class="n">${spec.fmt(med_v)}</td></tr></tbody></table>`;
  }
  return {render, host};
}

/* ---------- state + controls ---------- */
function wireSeg(fig, state, onChange){
  $$('.seg', fig).forEach(seg => {
    const k = seg.dataset.key;
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      $$('button', seg).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      state[k] = b.dataset.v; onChange();
    });
  });
}
const adj = (d, v, on) => on ? v / (d.rpp / 100) : v;
const inGroup = (d, g) => d.tier === 'subject' || d.tier === 'core' || (g === 'all' && d.tier === 'extended');

/* Revenue chart */
const revState = {metric:'own_source_rev_pc', group:'core', rpp:'0'};
const REV_LABEL = {own_source_rev_pc:'Own-source revenue per resident', total_taxes_pc:'Local taxes per resident', property_tax_pc:'Property tax per resident', sales_tax_pc:'Sales tax per resident', franchise_utility_tax_pc:'Utility and franchise taxes per resident', charges_for_services_pc:'Charges for services per resident', grants_total_pc:'Grants from other governments per resident', total_revenues_gov_pc:'Total revenue per resident'};
const revChart = BarChart('rev', () => {
  const on = revState.rpp === '1', m = revState.metric;
  const foot = [];
  if (m === 'sales_tax_pc') foot.push('Sales tax labels are not fully comparable. Orlando and Orange County book no sales tax in this line. Tampa includes the state half-cent sales tax shared with local governments; Jacksonville does not.');
  if (m === 'franchise_utility_tax_pc') foot.push('JEA\'s $137.4 million General Fund contribution is a utility transfer, not a tax, so it is not counted in this line.');
  if (on) foot.push('Adjusted figures divide by the 2024 Regional Price Parity for each metro area (100 = U.S. average).');
  return {
    rows: PEERS.filter(d => inGroup(d, revState.group)).map(d => ({name:d.name, value:adj(d, d[m], on), jax:isJax(d), struct:d.structure, tag: d.tier==='extended' ? 'extended' : ''})),
    fmt: fmt$, title: REV_LABEL[m] + (on ? ', adjusted for prices' : ''), colHead:'Dollars per resident',
    medLabel: revState.group === 'core' ? 'Core peer median' : 'All-peer median', foot: foot.join(' ')
  };
});
wireSeg($('#chart-rev'), revState, revChart.render);
$('#rev-metric').addEventListener('change', e => { revState.metric = e.target.value; revChart.render(); });

/* Revenue mix */
const MIX = [
  {k:'property_tax_pc', l:'Property tax', c:'var(--s1)'},
  {k:'sales_tax_pc', l:'Sales tax', c:'var(--s2)'},
  {k:'other_tax', l:'Utility, franchise, and other taxes', c:'var(--s3)'},
  {k:'charges_for_services_pc', l:'Charges for services', c:'var(--s4)'},
  {k:'grants_total_pc', l:'Grants', c:'var(--s5)'},
  {k:'other_rev', l:'Investment earnings and other', c:'var(--s6)'}
];
PEERS.forEach(d => {
  d.other_tax = d.franchise_utility_tax_pc + d.other_taxes_pc;
  const s = d.property_tax_pc + d.sales_tax_pc + d.other_tax + d.charges_for_services_pc + d.grants_total_pc;
  d.other_rev = Math.max(0, d.total_revenues_gov_pc - s);
});
$('#mix-legend').innerHTML = MIX.map(m => `<span><i class="sw" style="background:${m.c}"></i>${m.l}</span>`).join('');
const mixSel = $('#mix-peer');
PEERS.filter(d => !isJax(d)).forEach(d => { const o = document.createElement('option'); o.value = d.name; o.textContent = short(d.name) + (d.tier==='core' ? ' (core peer)' : ' (extended peer)'); mixSel.append(o); });
mixSel.value = 'Tampa, FL';
function renderMix(){
  const jax = PEERS.find(isJax), peer = PEERS.find(d => d.name === mixSel.value);
  const max = Math.max(jax.total_revenues_gov_pc, peer.total_revenues_gov_pc);
  const host = $('#mix');
  [jax, peer].forEach((d, idx) => {
    let row = host.children[idx];
    if (!row){ row = document.createElement('div'); row.className='mix-row'; row.innerHTML = `<div class="blab"></div><div><div class="mix-bar"></div><div class="mix-total"></div></div>`; host.append(row);
      row.querySelector('.mix-bar').innerHTML = MIX.map(()=>`<div class="mix-seg" tabindex="0"></div>`).join(''); }
    row.querySelector('.blab').textContent = short(d.name);
    row.querySelector('.blab').style.fontWeight = idx===0 ? '800' : '400';
    const segs = $$('.mix-seg', row);
    MIX.forEach((m, i) => {
      const v = d[m.k], s = segs[i];
      s.style.width = (v / max * 100) + '%'; s.style.background = m.c;
      const html = `<b>${short(d.name)}: ${m.l}</b>${fmt$(v)} per resident<br><span class="m">${(v/d.total_revenues_gov_pc*100).toFixed(1)}% of its total revenue</span>`;
      s.setAttribute('aria-label', `${short(d.name)}, ${m.l}: ${fmt$(v)} per resident, ${(v/d.total_revenues_gov_pc*100).toFixed(1)}% of total`);
      s.onmouseenter = s.onmousemove = s.onfocus = ev => showTip(html, s, ev);
      s.onmouseleave = s.onblur = hideTip;
    });
    row.querySelector('.mix-total').textContent = `Total: ${fmt$(d.total_revenues_gov_pc)} per resident`;
  });
  $('#mix-summary').textContent = `Jacksonville collects ${fmt$(jax.total_revenues_gov_pc)} per resident in total. ${short(peer.name)} collects ${fmt$(peer.total_revenues_gov_pc)}. Property tax is ${(jax.property_tax_pc/jax.total_revenues_gov_pc*100).toFixed(0)}% of Jacksonville's total and ${(peer.property_tax_pc/peer.total_revenues_gov_pc*100).toFixed(0)}% of ${short(peer.name)}'s.`;
  $('#mix-table').innerHTML = `<table><caption>Revenue per resident by source</caption><thead><tr><th scope="col">Source</th><th scope="col" class="n">${short(jax.name)}</th><th scope="col" class="n">${short(peer.name)}</th></tr></thead><tbody>` +
    MIX.map(m => `<tr><th scope="row" style="font-weight:400">${m.l}</th><td class="n">${fmt$(jax[m.k])}</td><td class="n">${fmt$(peer[m.k])}</td></tr>`).join('') +
    `<tr><th scope="row">Total</th><td class="n"><b>${fmt$(jax.total_revenues_gov_pc)}</b></td><td class="n"><b>${fmt$(peer.total_revenues_gov_pc)}</b></td></tr></tbody></table>`;
}
mixSel.addEventListener('change', renderMix);

/* Spending chart */
const spState = {metric:'expenses_ex_ed', measure:'pc', group:'core', rpp:'0'};
const shBtn = $('#chart-sp [data-key="measure"] [data-v="sh"]');
const rppBtns = $$('#chart-sp [data-key="rpp"] button');
const spChart = BarChart('sp', () => {
  const m = spState.metric;
  const sh = spState.measure === 'sh' && m !== 'expenses_ex_ed';
  const on = !sh && spState.rpp === '1';
  const field = m + (sh ? '_sh' : '_pc');
  const foot = [];
  if (m === 'transportation') foot.push('Tampa and Tucson are understated here because their street costs sit in other service lines.');
  if (m !== 'expenses_ex_ed' && m !== 'debt_interest') foot.push('Jacksonville\'s 2025 split between services shifted about $300 million from 2024. See the caution above.');
  if (on) foot.push('Adjusted figures divide by the 2024 Regional Price Parity for each metro area (100 = U.S. average).');
  return {
    rows: PEERS.filter(d => inGroup(d, spState.group)).map(d => ({name:d.name, value: sh ? d[field] : adj(d, d[field], on), jax:isJax(d), struct:d.structure, tag: d.tier==='extended' ? 'extended' : ''})),
    fmt: sh ? fmtPct : fmt$, unit: sh ? 'pct' : 'usd', unitWord: sh ? 'of spending' : 'per resident', colHead: sh ? 'Share of spending' : 'Dollars per resident',
    title: FN_LABEL[m] + (sh ? ', share of spending' : ', dollars per resident') + (on ? ', adjusted for prices' : ''),
    medLabel: spState.group === 'core' ? 'Core peer median' : 'All-peer median', foot: foot.join(' ')
  };
});
function syncSp(){
  const isTotal = spState.metric === 'expenses_ex_ed';
  shBtn.disabled = isTotal;
  if (isTotal && spState.measure === 'sh'){ spState.measure = 'pc'; $$('#chart-sp [data-key="measure"] button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v==='pc'?'true':'false')); }
  rppBtns.forEach(b => b.disabled = spState.measure === 'sh');
  spChart.render();
}
wireSeg($('#chart-sp'), spState, syncSp);
$('#sp-metric').addEventListener('change', e => { spState.metric = e.target.value; syncSp(); });

/* Sankey: FY2025 ACFR statement of activities, governmental activities (whole dollars) */
const FLOW = {
  pop: 1079044,
  sources: [
    {id:'prop', l:'Property tax', v:1144190000, c:'var(--s1)'},
    {id:'sales', l:'Sales tax', v:333422000, c:'var(--s2)'},
    {id:'otax', l:'Utility, franchise, and other taxes', short:'Other taxes', v:195396000 + 6919000, c:'var(--s3)'},
    {id:'chg', l:'Charges for services', short:'Fees', v:258286000, c:'var(--s4)'},
    {id:'grant', l:'Grants and state revenue sharing', short:'Grants', v:51784000 + 135484000 + 246108000, c:'var(--s5)'},
    {id:'oth', l:'Investment earnings and other', short:'Other revenue', v:92029000 + 202800000, c:'var(--s6)'}
  ],
  uses: [
    {id:'ps', l:'Public safety', v:1059848000, jax:true},
    {id:'gg', l:'General government', short:'General govt.', v:421584000},
    {id:'hs', l:'Human services and health', short:'Human services', v:290531000},
    {id:'tr', l:'Transportation', v:171425000},
    {id:'ee', l:'Economic development', short:'Economic devel.', v:105793000},
    {id:'pe', l:'Physical environment', short:'Physical env.', v:66021000},
    {id:'cr', l:'Culture and recreation', short:'Culture and rec.', v:60021000},
    {id:'di', l:'Interest on debt', v:52623000},
    {id:'sur', l:'Revenue above 2025 expenses', short:'Above expenses', v:0, surplus:true}
  ]
};
FLOW.revTotal = FLOW.sources.reduce((s,d)=>s+d.v,0);           // 2,666,418,000
FLOW.expTotal = FLOW.uses.reduce((s,d)=>s+d.v,0);              // 2,227,846,000
FLOW.uses.find(d=>d.surplus).v = FLOW.revTotal - FLOW.expTotal; // 438,572,000
const flowState = {unit:'total'};
function flowFmt(v){
  if (flowState.unit === 'pc') return fmt$(v / FLOW.pop);
  if (flowState.unit === 'sh') return (v / FLOW.revTotal * 100).toFixed(1) + '%';
  return v >= 1e9 ? '$' + (v/1e9).toFixed(2) + 'B' : '$' + Math.round(v/1e6).toLocaleString('en-US') + 'M';
}
function flowWords(v){
  if (flowState.unit === 'pc') return fmt$(v / FLOW.pop) + ' per resident';
  if (flowState.unit === 'sh') return (v / FLOW.revTotal * 100).toFixed(1) + '% of all revenue';
  return v >= 1e9 ? '$' + (v/1e9).toFixed(2) + ' billion' : '$' + (v/1e6).toFixed(1) + ' million';
}
function renderSankey(){
  const host = $('#sankey');
  const W = Math.max(320, host.clientWidth), narrow = W < 640; host.classList.toggle('narrow', narrow);
  const labW = narrow ? 104 : 250, nodeW = narrow ? 12 : 16, poolW = narrow ? 30 : 44;
  const H = narrow ? 720 : 620, gapR = narrow ? 22 : 16;
  const nR = FLOW.uses.length, nL = FLOW.sources.length;
  const k = (H - gapR * (nR - 1)) / FLOW.revTotal;
  const gapL = (H - FLOW.revTotal * k) / (nL - 1);
  const xL = labW, xR = W - labW - nodeW, xP = (xL + nodeW + xR) / 2 - poolW / 2;
  const poolTop = 0, poolH = FLOW.revTotal * k;
  const NS = 'http://www.w3.org/2000/svg';
  let svg = host.querySelector('svg');
  if (!svg){ svg = document.createElementNS(NS,'svg'); svg.setAttribute('role','img'); host.append(svg); }
  svg.setAttribute('viewBox', `0 0 ${W} ${H + 4}`);
  svg.setAttribute('aria-label', `Flow diagram. ${FLOW.sources.length} revenue sources totaling ${flowWords(FLOW.revTotal)} flow into one pot, then out to ${FLOW.uses.length - 1} services totaling ${flowWords(FLOW.expTotal)}, plus ${flowWords(FLOW.revTotal - FLOW.expTotal)} above expenses. Public safety is the largest use at ${flowWords(FLOW.uses[0].v)}. A full table follows the chart.`);
  const ribbon = (x0, y0, h0, x1, y1, h1) => { const m = (x0 + x1) / 2; return `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1} L${x1},${y1+h1} C${m},${y1+h1} ${m},${y0+h0} ${x0},${y0+h0} Z`; };
  const label = (x, y, anchor, d, strong) => {
    const name = narrow && d.short ? d.short : d.l;
    if (narrow) return `<text class="sk-lab${strong?' strong':''}" x="${x}" y="${y-3}" text-anchor="${anchor}">${name}<tspan class="v" x="${x}" dy="15">${flowFmt(d.v)}</tspan></text>`;
    return `<text class="sk-lab${strong?' strong':''}" x="${x}" y="${y+4.5}" text-anchor="${anchor}">${name}  <tspan class="v">${flowFmt(d.v)}</tspan></text>`;
  };
  let links = '', nodes = '', labs = '', hits = '';
  // left side
  let y = 0, py = poolTop;
  FLOW.sources.forEach(d => {
    const h = d.v * k;
    links += `<path class="sk-link" data-n="${d.id}" fill="${d.c}" d="${ribbon(xL+nodeW, y, h, xP, py, h)}"/>`;
    nodes += `<rect class="sk-node" data-n="${d.id}" x="${xL}" y="${y}" width="${nodeW}" height="${Math.max(h,1)}" rx="2" fill="${d.c}"/>`;
    labs += label(xL - 8, y + h/2, 'end', d, false);
    hits += `<rect class="sk-hit" tabindex="0" data-n="${d.id}" x="0" y="${y - 3}" width="${xP}" height="${h + 6}" aria-label="${d.l}: ${flowWords(d.v)}, ${(d.v/FLOW.revTotal*100).toFixed(1)}% of revenue"/>`;
    d._y = y; d._h = h; y += h + gapL; py += h;
  });
  // pool
  nodes += `<rect class="sk-node pool" data-n="pool" x="${xP}" y="${poolTop}" width="${poolW}" height="${poolH}" rx="3" fill="var(--deep)"/>`;
  nodes += `<text class="sk-pool-lab" transform="translate(${xP + poolW/2 + 4},${poolTop + poolH/2}) rotate(-90)" text-anchor="middle">ONE SHARED POT · ${flowFmt(FLOW.revTotal)}</text>`;
  // right side
  y = 0; py = poolTop;
  FLOW.uses.forEach(d => {
    const h = d.v * k;
    const fill = d.surplus ? 'var(--panel-2)' : d.jax ? 'var(--jax)' : 'var(--peer)';
    links += `<path class="sk-link" data-n="${d.id}" fill="${fill}" d="${ribbon(xP + poolW, py, h, xR, y, h)}"${d.surplus?' stroke="var(--peer)" stroke-dasharray="4 3" stroke-width="1"':''}/>`;
    nodes += `<rect class="sk-node" data-n="${d.id}" x="${xR}" y="${y}" width="${nodeW}" height="${Math.max(h,1)}" rx="2" fill="${d.surplus ? 'var(--bg)' : fill}"${d.surplus?' stroke="var(--peer)" stroke-dasharray="4 3"':''}/>`;
    labs += label(xR + nodeW + 8, y + h/2, 'start', d, d.jax);
    const share = d.surplus ? 'not spent on 2025 services' : (d.v/FLOW.expTotal*100).toFixed(1) + '% of spending';
    hits += `<rect class="sk-hit" tabindex="0" data-n="${d.id}" x="${xP + poolW}" y="${y - 3}" width="${W - xP - poolW}" height="${h + 6}" aria-label="${d.l}: ${flowWords(d.v)}, ${share}"/>`;
    d._share = share; y += h + gapR; py += h;
  });
  svg.innerHTML = `<g>${links}</g><g>${nodes}</g><g>${labs}</g><g>${hits}</g>`;
  const all = [...FLOW.sources, ...FLOW.uses];
  $$('.sk-hit', svg).forEach(r => {
    const d = all.find(x => x.id === r.dataset.n);
    const isSrc = FLOW.sources.includes(d);
    const html = `<b>${d.l}</b>${flowWords(d.v)}<br><span class="m">${isSrc ? (d.v/FLOW.revTotal*100).toFixed(1) + '% of all revenue' : d._share}</span>${d.surplus ? '<br><span class="m">Accrual basis. Adds to net position; not the same as unspent cash.</span>' : ''}`;
    const on = ev => { svg.classList.add('dim'); $$(`[data-n="${d.id}"]`, svg).forEach(e => e.classList.add('hl')); $('.pool', svg).classList.add('hl'); showTip(html, r, ev); };
    const off = () => { svg.classList.remove('dim'); $$('.hl', svg).forEach(e => e.classList.remove('hl')); hideTip(); };
    r.addEventListener('mouseenter', on); r.addEventListener('mousemove', on); r.addEventListener('mouseleave', off);
    r.addEventListener('focus', on); r.addEventListener('blur', off);
  });
  const ps = FLOW.uses[0];
  $('#flow-summary').textContent = `Jacksonville's governmental activities took in ${flowWords(FLOW.revTotal)} in fiscal year 2025 and spent ${flowWords(FLOW.expTotal)}. Property tax was the largest source, at ${flowWords(FLOW.sources[0].v)}. Public safety was the largest use, at ${flowWords(ps.v)} (${(ps.v/FLOW.expTotal*100).toFixed(1)}% of spending).`;
  const head = flowState.unit === 'pc' ? 'Per resident' : flowState.unit === 'sh' ? 'Share of revenue' : 'Dollars';
  $('#flow-table').innerHTML = `<table><caption>Jacksonville governmental activities, fiscal year 2025</caption><thead><tr><th scope="col">Revenue source</th><th scope="col" class="n">${head}</th></tr></thead><tbody>` +
    FLOW.sources.map(d => `<tr><th scope="row" style="font-weight:400">${d.l}</th><td class="n">${flowFmt(d.v)}</td></tr>`).join('') +
    `<tr><th scope="row">Total revenue</th><td class="n"><b>${flowFmt(FLOW.revTotal)}</b></td></tr></tbody></table>` +
    `<table style="margin-top:16px"><thead><tr><th scope="col">Use</th><th scope="col" class="n">${head}</th></tr></thead><tbody>` +
    FLOW.uses.map(d => `<tr class="${d.jax?'jax':''}"><th scope="row" style="font-weight:inherit">${d.l}</th><td class="n">${flowFmt(d.v)}</td></tr>`).join('') +
    `<tr><th scope="row">Total</th><td class="n"><b>${flowFmt(FLOW.revTotal)}</b></td></tr></tbody></table>`;
}
wireSeg($('#chart-flow'), flowState, renderSankey);

/* Gap chart */
function renderGap(){
  const core = PEERS.filter(d => d.tier === 'core'), jax = PEERS.find(isJax);
  const rows = FN.map(f => { const m = median(core.map(d => d[f+'_sh'])); return {f, j:jax[f+'_sh'], m, d:jax[f+'_sh'] - m}; }).sort((a,b)=>b.d-a.d);
  const lim = Math.max(...rows.map(r => Math.abs(r.d))) * 1.75;
  const x = v => 50 + v / lim * 50;
  $('#gap').innerHTML = rows.map(r => {
    const up = r.d >= 0, a = up ? 50 : x(r.d), w = Math.abs(x(r.d) - 50);
    const txt = (up?'+':'−') + Math.abs(r.d).toFixed(1) + ' pts';
    const label = `${FN_LABEL[r.f]}: Jacksonville ${r.j.toFixed(1)}%, core median ${r.m.toFixed(1)}%, ${up?'above':'below'} by ${Math.abs(r.d).toFixed(1)} points`;
    return `<div class="grow" tabindex="0" role="img" aria-label="${label}" data-tip="<b>${FN_LABEL[r.f]}</b>Jacksonville: ${r.j.toFixed(1)}% of spending<br><span class='m'>Core peer median: ${r.m.toFixed(1)}%</span>"><div class="blab">${FN_LABEL[r.f]}</div><div class="gtrack"><div class="gmid" style="left:50%"></div><div class="gbar ${up?'up':'down'}" style="left:${a}%;width:${w}%"></div><div class="gval" style="${up?`left:${x(r.d)}%`:`right:${100-x(r.d)}%`}">${txt}</div></div></div>`;
  }).join('');
  $$('#gap .grow').forEach(g => { const h = g.dataset.tip; g.onmouseenter = g.onmousemove = g.onfocus = ev => showTip(h, g, ev); g.onmouseleave = g.onblur = hideTip; });
  $('#gap-table').innerHTML = `<table><caption>Share of spending by service</caption><thead><tr><th scope="col">Service</th><th scope="col" class="n">Jacksonville</th><th scope="col" class="n">Core peer median</th><th scope="col" class="n">Difference (points)</th></tr></thead><tbody>` +
    rows.map(r => `<tr><th scope="row" style="font-weight:400">${FN_LABEL[r.f]}</th><td class="n">${r.j.toFixed(1)}%</td><td class="n">${r.m.toFixed(1)}%</td><td class="n">${(r.d>=0?'+':'−')+Math.abs(r.d).toFixed(1)}</td></tr>`).join('') + '</tbody></table>';
}

/* Pension chart */
const penState = {metric:'npl_total_pc', group:'core'};
const PEN_LABEL = {npl_total_pc:'Pension debt per resident', npl_ratio:'Pension debt as a share of a year\'s own revenue', ltd_governmental_pc:'Long-term debt per resident', debt_service_gf_pc:'Yearly debt payments per resident', np_pc:'Net position per resident'};
const PEN_FOOT = {
  npl_total_pc:'Net pension liability for all plans on each government\'s books, divided by residents.',
  npl_ratio:'Net pension liability divided by own-source revenue (money the government raises itself).',
  ltd_governmental_pc:'Long-term debt of governmental activities, mostly bonds. Jacksonville sits close to the median.',
  debt_service_gf_pc:'Principal and interest paid on debt in fiscal year 2025.',
  np_pc:'Total net position: what a government owns minus what it owes, at book value. A negative number means it owes more than it owns.'
};
const penChart = BarChart('pen', () => {
  const m = penState.metric, pct = m === 'npl_ratio';
  return {
    rows: PEERS.filter(d => inGroup(d, penState.group)).map(d => ({name:d.name, value:d[m], jax:isJax(d), struct:d.structure, tag: d.tier==='extended' ? 'extended' : ''})),
    fmt: pct ? (v => Math.round(v) + '%') : fmt$, unit: pct ? 'pct' : 'usd', unitWord: pct ? 'of own revenue' : 'per resident', colHead: pct ? 'Percent of own revenue' : 'Dollars per resident',
    title: PEN_LABEL[m], medLabel: penState.group === 'core' ? 'Core peer median' : 'All-peer median', foot: PEN_FOOT[m]
  };
});
wireSeg($('#chart-pen'), penState, penChart.render);
$('#pen-metric').addEventListener('change', e => { penState.metric = e.target.value; penChart.render(); });

/* Top-tier chart */
const ttState = {metric:'expenses_ex_ed_pc', rpp:'0'};
const ttRpp = $$('#chart-tt [data-key="rpp"] button');
const TT_LABEL = {expenses_ex_ed_pc:'Total spending per resident', exp_per_1k:'Spending per $1,000 of residents\' income', public_safety_pc:'Public safety per resident', general_government_pc:'General government per resident', transportation_pc:'Transportation per resident', human_services_pc:'Human services and health per resident', culture_recreation_pc:'Culture and recreation per resident', total_taxes_pc:'Local taxes per resident'};
const ttChart = BarChart('tt', () => {
  const m = ttState.metric, inc = m === 'exp_per_1k', on = !inc && ttState.rpp === '1';
  const foot = [];
  if (inc) foot.push('Income is per capita personal income from each ACFR\'s statistical section where available. Some cities use a county or metro figure instead (Jacksonville uses Duval County; San Jose uses Santa Clara County). Prices do not apply to this measure because income and spending are in the same local dollars.');
  if (m === 'human_services_pc') foot.push('San Francisco runs public health and hospital services that most cities leave to counties or the state.');
  if (on) foot.push('Adjusted figures divide by the 2024 Regional Price Parity for each metro area (100 = U.S. average).');
  return {
    rows: OX.map(d => ({name:d.name, value: adj(d, d[m], on), jax:isJax(d), struct:d.structure, tag: BOTH.has(d.name) ? 'also a peer' : ''})),
    fmt: inc ? fmt1k : fmt$, unitWord: inc ? 'per $1,000 of income' : 'per resident', colHead: inc ? 'Dollars per $1,000 of income' : 'Dollars per resident',
    title: TT_LABEL[m] + (on ? ', adjusted for prices' : ''), medLabel:'Median of the 14 cities', foot: foot.join(' ')
  };
});
function syncTt(){ ttRpp.forEach(b => b.disabled = ttState.metric === 'exp_per_1k'); ttChart.render(); }
wireSeg($('#chart-tt'), ttState, syncTt);
$('#tt-metric').addEventListener('change', e => { ttState.metric = e.target.value; syncTt(); });

/* ---------- flow chart connectors ---------- */
function drawLinks(){
  const svg = $('#links'), flow = $('#flow');
  if (getComputedStyle(svg).display === 'none') return;
  const fr = flow.getBoundingClientRect();
  const box = id => { const r = $('#'+id).getBoundingClientRect(); return {l:r.left-fr.left, r:r.right-fr.left, t:r.top-fr.top, b:r.bottom-fr.top, cx:(r.left+r.right)/2-fr.left, cy:(r.top+r.bottom)/2-fr.top}; };
  const down = (a, b, opts={}) => { const A = box(a), B = box(b); const ax = opts.ax ?? A.cx, bx = opts.bx ?? B.cx; const my = (A.b + B.t) / 2; return `<path d="M${ax},${A.b} V${my} H${bx} V${B.t-2}" marker-end="url(#arrow)"${opts.dash?' class="dashed"':''}/>`; };
  const across = (a, b) => { const A = box(a), B = box(b); return `<path d="M${A.r},${A.cy} H${B.l-2}" marker-end="url(#arrow)"/>`; };
  const H3 = box('n-h3'), C2 = box('n-c2');
  let p = '';
  p += down('n-root','n-h1') + down('n-root','n-h2') + down('n-root','n-h3');
  p += down('n-h1','n-c1') + down('n-h2','n-c2', {bx: C2.cx - 20}) + down('n-h3','n-c2', {bx: C2.cx + 20});
  p += across('n-c1','n-c2') + across('n-c2','n-c3');
  p += down('n-c2','n-aside', {dash:true});
  svg.innerHTML = svg.querySelector('defs').outerHTML + p;
}
window.addEventListener('resize', () => { drawLinks(); renderSankey(); revChart.render(); spChart.render(); penChart.render(); ttChart.render(); });

/* ---------- nav highlight + progress ---------- */
const navLinks = $$('.topnav [data-nav]');
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting){ navLinks.forEach(a => a.setAttribute('aria-current', a.dataset.nav === e.target.id ? 'true' : 'false')); } });
}, {rootMargin:'-45% 0px -50% 0px'});
['revenue','spending','pensions','toptier','sources'].forEach(id => io.observe(document.getElementById(id)));
window.addEventListener('scroll', () => { const h = document.documentElement; $('#progress').style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%'; }, {passive:true});

/* ---------- boot ---------- */
revChart.render(); renderMix(); renderSankey(); syncSp(); renderGap(); penChart.render(); syncTt();
drawLinks();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLinks);
