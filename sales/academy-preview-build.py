#!/usr/bin/env python3
"""Build trilingual interactive preview of the Solaris Sales Academy.
Usage: python3 academy-preview-build.py <academy_dir> <out_html>"""
import json, sys, os, glob

base = sys.argv[1] if len(sys.argv) > 1 else "."
out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/solaris-academia-trilingue.html"

ORDER = ["README.md", "00-guia-del-gerente.md", "01-fundamentos.md", "02-producto-y-oferta.md",
         "03-lead-caliente.md", "04-lead-frio.md", "05-descubrimiento.md", "06-la-visita.md",
         "07-objeciones.md", "08-cierre.md", "09-seguimiento-crm.md", "10-certificacion.md",
         "11-crm-solaris.md"]
LANGS = ["es", "en", "he"]

data = {}
for lang in LANGS:
    docs = []
    for f in ORDER:
        p = os.path.join(base, lang, f)
        if not os.path.exists(p):
            docs.append({"file": f, "title": f, "md": "_(pendiente / pending / בתרגום)_"})
            continue
        src = open(p, encoding="utf-8").read()
        title = next((l.lstrip("# ").strip() for l in src.splitlines() if l.startswith("#")), f)
        docs.append({"file": f, "title": title, "md": src})
    data[lang] = docs

html = """<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solaris Panama — Sales Academy</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
:root{--bg:#0d1117;--panel:#161b22;--border:#2d333b;--txt:#e6edf3;--muted:#8b949e;--accent:#f0b429;--ok:#2ea043;--bad:#f85149}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--txt);display:flex;min-height:100vh}
nav{width:290px;min-width:290px;background:var(--panel);border-right:1px solid var(--border);padding:16px;position:sticky;top:0;height:100vh;overflow-y:auto}
nav h1{font-size:16px;color:var(--accent);margin:4px 0 10px}
.langs{display:flex;gap:6px;margin-bottom:14px}
.langs button{flex:1;padding:7px 0;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-size:13px}
.langs button.active{background:var(--accent);color:#000;font-weight:700;border-color:var(--accent)}
nav a{display:block;padding:8px 10px;border-radius:8px;color:var(--muted);text-decoration:none;font-size:13.5px;margin-bottom:2px}
nav a.active,nav a:hover{background:#21262d;color:var(--txt)}
main{flex:1;padding:32px 48px;max-width:920px}
main h1{color:var(--accent)}main h2{border-bottom:1px solid var(--border);padding-bottom:6px}
table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid var(--border);padding:8px 10px;font-size:14px;text-align:start}
th{background:var(--panel)}code{background:#21262d;padding:2px 6px;border-radius:5px;font-size:13px}
blockquote{border-inline-start:3px solid var(--accent);margin:12px 0;padding:4px 16px;color:var(--muted);background:var(--panel);border-radius:0 8px 8px 0}
pre{background:var(--panel);padding:14px;border-radius:10px;overflow-x:auto}
.verificar{background:#3d2e00;color:#f0b429;padding:1px 6px;border-radius:5px;font-weight:600}
.quiz{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;margin:20px 0}
.quiz h3{margin-top:0;color:var(--accent)}
.q{margin:16px 0;padding-bottom:12px;border-bottom:1px dashed var(--border)}
.q p{font-weight:600;margin:0 0 8px}
.q label{display:block;padding:7px 12px;margin:4px 0;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:14px}
.q label:hover{background:#21262d}
.q label.correct{border-color:var(--ok);background:rgba(46,160,67,.15)}
.q label.wrong{border-color:var(--bad);background:rgba(248,81,73,.12)}
.q .expl{font-size:13px;color:var(--muted);margin-top:6px;display:none}
.gradeBtn{background:var(--accent);color:#000;font-weight:700;border:0;padding:10px 22px;border-radius:10px;cursor:pointer;font-size:15px}
.score{font-size:18px;font-weight:700;margin-inline-start:14px}
.pass{color:var(--ok)}.fail{color:var(--bad)}
@media(max-width:800px){body{flex-direction:column}nav{width:100%;min-width:0;height:auto;position:static}main{padding:18px}}
</style></head><body>
<nav><h1>☀️ Solaris Academy</h1>
<div class="langs"><button data-l="es">🇵🇦 ES</button><button data-l="en">🇺🇸 EN</button><button data-l="he">🇮🇱 עב</button></div>
<div id="links"></div></nav>
<main id="content"></main>
<script>
const DATA=__DATA__;
const T={es:{grade:"Calificar",score:"Puntaje",pass:"✅ APROBADO",fail:"❌ Repasar el módulo (mínimo 80%)",quiz:"📝 Quiz — seleccione y califique"},
         en:{grade:"Grade quiz",score:"Score",pass:"✅ PASSED",fail:"❌ Review the module (80% required)",quiz:"📝 Quiz — select answers and grade"},
         he:{grade:"בדוק אותי",score:"ציון",pass:"✅ עבר",fail:"❌ לחזור על המודול (נדרש 80%)",quiz:"📝 מבחן — סמן תשובות ובדוק"}};
let lang="es",idx=0;
const links=document.getElementById('links'),content=document.getElementById('content');

function parseQuiz(md){
  const m=md.split(/^## 📝 Quiz.*$/m); if(m.length<2)return null;
  const sec=m[1];
  const qs=[];const qre=/\\*\\*(\\d+)\\.\\*\\*\\s*([^\\n]+)\\n((?:\\s*-\\s*[a-d]\\).*\\n?)+)/g;let x;
  while((x=qre.exec(sec))){const opts=[...x[3].matchAll(/-\\s*([a-d])\\)\\s*(.+)/g)].map(o=>({k:o[1],t:o[2].trim()}));
    qs.push({n:+x[1],q:x[2].replace(/\\*\\*/g,'').trim(),opts});}
  const ans={};const are=/\\|\\s*(\\d+)\\s*\\|\\s*\\*\\*([a-d])\\*\\*\\s*\\|\\s*([^|]*)/g;
  while((x=are.exec(sec))){ans[+x[1]]={k:x[2],e:x[3].trim()};}
  if(!qs.length||!Object.keys(ans).length)return null;
  return {before:m[0],qs:qs.filter(q=>ans[q.n]),ans};
}
function renderQuiz(pq){
  const t=T[lang];let h='<div class="quiz"><h3>'+t.quiz+'</h3>';
  pq.qs.forEach(q=>{h+='<div class="q" data-n="'+q.n+'"><p>'+q.n+'. '+q.q+'</p>';
    q.opts.forEach(o=>{h+='<label><input type="radio" name="q'+q.n+'" value="'+o.k+'"> '+o.k+') '+o.t+'</label>';});
    h+='<div class="expl"></div></div>';});
  h+='<button class="gradeBtn" onclick="grade(this)">'+t.grade+'</button><span class="score"></span></div>';
  return h;
}
window.grade=function(btn){
  const t=T[lang],quiz=btn.closest('.quiz'),pq=quiz._pq;let ok=0,total=0;
  quiz.querySelectorAll('.q').forEach(qd=>{const n=+qd.dataset.n,a=pq.ans[n];if(!a)return;total++;
    const sel=qd.querySelector('input:checked');
    qd.querySelectorAll('label').forEach(l=>{const v=l.querySelector('input').value;
      l.classList.remove('correct','wrong');
      if(v===a.k)l.classList.add('correct');
      else if(sel&&sel===l.querySelector('input'))l.classList.add('wrong');});
    if(sel&&sel.value===a.k)ok++;
    const ex=qd.querySelector('.expl');ex.style.display='block';ex.textContent='→ '+a.k+') '+a.e;});
  const pct=Math.round(100*ok/total),el=quiz.querySelector('.score');
  el.textContent=t.score+': '+ok+'/'+total+' ('+pct+'%) — '+(pct>=80?t.pass:t.fail);
  el.className='score '+(pct>=80?'pass':'fail');
};
function show(i){idx=i;const d=DATA[lang][i];const pq=parseQuiz(d.md);
  let html=marked.parse(pq?pq.before:d.md);
  html=html.replaceAll(/\\[(VERIFICAR CON GERENTE|PENDIENTE — DEFINIR|להשלמה)\\]/g,'<span class="verificar">⚠ $1</span>');
  content.innerHTML=html;
  if(pq){const div=document.createElement('div');div.innerHTML=renderQuiz(pq);
    const qel=div.firstChild;qel._pq=pq;content.appendChild(qel);}
  content.dir=(lang==='he')?'rtl':'ltr';
  document.querySelectorAll('nav a').forEach((a,j)=>a.classList.toggle('active',i===j));
  window.scrollTo(0,0);}
function buildNav(){links.innerHTML='';DATA[lang].forEach((d,i)=>{const a=document.createElement('a');
  a.textContent=d.title.length>42?d.title.slice(0,42)+'…':d.title;a.href='#';
  a.onclick=e=>{e.preventDefault();show(i);};links.appendChild(a);});}
document.querySelectorAll('.langs button').forEach(b=>{b.onclick=()=>{lang=b.dataset.l;
  document.querySelectorAll('.langs button').forEach(x=>x.classList.toggle('active',x===b));
  buildNav();show(Math.min(idx,DATA[lang].length-1));};});
document.querySelector('.langs button').classList.add('active');
buildNav();show(0);
</script></body></html>"""
html = html.replace("__DATA__", json.dumps(data, ensure_ascii=False))
open(out, "w", encoding="utf-8").write(html)
print(out, f"({os.path.getsize(out)//1024} KB)")
