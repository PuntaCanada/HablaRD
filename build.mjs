import {buildPartners} from './partners.mjs';
import {runInNewContext} from 'node:vm';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const html=readFileSync('public/index.html','utf8');
const langs=['de','es','en','fr','pt'];
const titles=JSON.parse(html.match(/titles=(\[[^\]]+\])/)[1]);
const intros=JSON.parse(html.match(/intro=(\[[^\]]+\])/)[1]);
const origin=process.env.SITE_URL?.replace(/\/$/,'');
if(origin && !/^https:\/\/[a-z0-9.-]+$/i.test(origin)) throw Error('Invalid SITE_URL');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const alternates=langs.map(l=>'<link rel="alternate" hreflang="'+l+'" href="'+(origin||'')+'/'+l+'/">').join('')+'<link rel="alternate" hreflang="x-default" href="'+(origin||'')+'/">';
for(const [i,l] of langs.entries()){
mkdirSync('public/'+l,{recursive:true});
let page=html.replace('<html lang="es">','<html lang="'+l+'">').replace(/<title>.*?<\/title>/,'<title>'+esc(titles[i])+' | HablaRD</title>').replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+esc(intros[i])+'">').replace(/(<h1 id="heading">).*?(<\/h1>)/,'$1'+esc(titles[i])+'$2').replace(/(<p id="intro">).*?(<\/p>)/,'$1'+esc(intros[i])+'$2').replace('</head>',alternates+(origin?'<link rel="canonical" href="'+origin+'/'+l+'/">':'')+'</head>').replace("apply(stored||navigator.language.slice(0,2))","apply('"+l+"')").replace("apply(s.value);","location.href='../'+s.value+'/';");
writeFileSync('public/'+l+'/index.html',page);
}
writeFileSync('public/robots.txt','User-agent: *\nAllow: /\n'+(origin?'Sitemap: '+origin+'/sitemap.xml\n':''));
const sitemapPages=langs.map(l=>'/'+l+'/');

/* Read only trusted, repository-owned data declarations, not browser event code. */
const take=(start,end)=>{const a=html.indexOf(start),z=html.indexOf(end,a);if(a<0||z<0)throw Error('Missing dictionary data: '+start);return html.slice(a,z)};
const declarations=[
 take('const words=','function quiz()'),
 take('const newWords=','function lesson(i)'),
 take('const moreRows=','function more(i)'),
 take('const slang=','const termSlug='),
 take('if(words.length===3){','quiz();progress();lesson(i);')
].join('\n');
const entries=runInNewContext(declarations+"\n;[...slang,...words.map(w=>[w[0],'',w[1][1],'daily',w[1],'',w[2]])]",Object.create(null),{timeout:1000});
const termSlug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const seen=new Set();
const labels=[['Dominikanisches Wörterbuch','Bedeutung','Standardspanisch','Schreibvarianten','Beispiel','Quelle','Sprachgebrauch','Zurück zum Wörterbuch','Umgangssprachlich / Kontext beachten'],['Diccionario dominicano','Significado','Español general','Variantes','Ejemplo','Fuente','Uso','Volver al diccionario','Coloquial / depende del contexto'],['Dominican dictionary','Meaning','General Spanish','Variants','Example','Source','Usage','Back to dictionary','Informal / context matters'],['Dictionnaire dominicain','Sens','Espagnol général','Variantes','Exemple','Source','Usage','Retour au dictionnaire','Familier / selon le contexte'],['Dicionário dominicano','Significado','Espanhol geral','Variantes','Exemplo','Fonte','Uso','Voltar ao dicionário','Coloquial / depende do contexto']];
const usage=[['Chat','Straßensprache','Abwertend / vorsichtig verwenden','Alltag'],['Chat','Calle','Despectivo / usar con cuidado','Cotidiano'],['Chat','Street','Derogatory / use with caution','Everyday'],['Chat','Rue','Péjoratif / prudence','Quotidien'],['Chat','Rua','Pejorativo / cuidado','Cotidiano']];
for(const e of entries){
 const id=termSlug(e[0]);if(!id||seen.has(id)||e[4].length!==5||!/^https:\/\//.test(e[6]))throw Error('Invalid or duplicate dictionary entry: '+e[0]);seen.add(id);
 const path=l=>'/'+l+'/woerterbuch/'+id+'/';
 for(const [i,l] of langs.entries()){
 const t=labels[i],title=e[0]+' – '+e[4][i]+' | HablaRD',url=path(l);
 const alt=langs.map(x=>'<link rel="alternate" hreflang="'+x+'" href="'+(origin||'')+path(x)+'">').join('')+'<link rel="alternate" hreflang="x-default" href="'+(origin||'')+path('es')+'">';
 const field=(k,v)=>v?'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>':'';
 const nav=langs.map(x=>'<a hreflang="'+x+'" href="'+path(x)+'">'+x.toUpperCase()+'</a>').join(' ');
 const page='<!doctype html><html lang="'+l+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><meta name="description" content="'+esc(e[0]+' – '+e[4][i])+'">'+alt+(origin?'<link rel="canonical" href="'+origin+url+'">':'')+'<style>body{font:18px system-ui;background:#f4f6fb;color:#17233b;margin:0}main{max-width:720px;margin:auto;padding:24px}article{background:#fff;padding:24px;border-radius:18px}a{color:#6744a8;overflow-wrap:anywhere}nav{display:flex;gap:16px;flex-wrap:wrap}dt{font-weight:bold;margin-top:16px}dd{margin:4px 0}h1{font-size:clamp(30px,7vw,56px);overflow-wrap:anywhere}a:focus-visible{outline:3px solid #6744a8}</style></head><body><main><a href="/'+l+'/#dictionary">HablaRD · '+esc(t[7])+'</a><nav aria-label="Language">'+nav+'</nav><article><p>'+esc(t[0])+'</p><h1>'+esc(e[0])+'</h1><dl>'+field(t[1],e[4][i])+field(t[2],e[2])+field(t[3],e[1])+field(t[4],e[5])+field(t[6],usage[i][['chat','street','warning','daily'].indexOf(e[3])]||t[8])+'</dl><p><a href="'+esc(e[6])+'">'+esc(t[5])+'</a></p></article></main></body></html>';
 mkdirSync('public'+url,{recursive:true});writeFileSync('public'+url+'index.html',page);sitemapPages.push(url);
 }
}
sitemapPages.push(...buildPartners(origin));
if(origin)writeFileSync('public/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+sitemapPages.map(p=>'<url><loc>'+origin+p+'</loc></url>').join('')+'</urlset>');
