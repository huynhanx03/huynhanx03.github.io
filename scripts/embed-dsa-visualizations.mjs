import {readFile,writeFile} from 'node:fs/promises';
import {visualizationCatalog} from '../src/lib/visualizations/catalog.mjs';
const anchors={
 'eratosthenes':'Sàng Eratosthenes tạo bảng', 'spf-factorization':'Sàng Eratosthenes tạo bảng',
 'trial-factorization':'Với một số', 'miller-rabin':'Với một số', 'pollard-rho':'Với một số',
 'kahn-topo':'Tính `indegree', 'dfs-topo':'DFS cũng tạo topo',
 'tarjan-scc':'Tarjan dùng DFS', 'kosaraju-scc':'Kosaraju là cách khác', 'scc-condensation':'Nếu co mỗi SCC',
 'aho-trie':'Mỗi nút trie', 'aho-failure':'Mỗi nút trie', 'aho-scan':'Khi quét văn bản',
 'extended-euclid':'**Extended Euclid**', 'euclid':'Tính chất `gcd',
 'z-box':'Duy trì',
};
function paragraphs(body,start){const result=[];let offset=0,from=-1,fence=false;const flush=(end)=>{if(from>=0){result.push({start:from,end,text:body.slice(from,end)});from=-1;}};for(const line of body.split('\n')){if(offset<start){offset+=line.length+1;continue;}if(/^\s*```/.test(line)){flush(offset);fence=!fence;}else if(fence){}else if(!line.trim()||/^#{1,6} /.test(line)){flush(offset);}else if(from<0)from=offset;offset+=line.length+1;}flush(body.length);return result;}
const byFile=new Map();for(const meta of Object.values(visualizationCatalog))if(meta.note){const file=`src/content/notes/data-structures-algorithms/${meta.note}_VI.md`;if(!byFile.has(file))byFile.set(file,[]);byFile.get(file).push(meta);}
let inserted=0;
for(const [file,items] of byFile){let body=await readFile(file,'utf8');body=body.replace(/```note-visualization\n([^\n]+)\n```/g,(block,json)=>{try{const config=JSON.parse(json);return visualizationCatalog[config.id]?.note?'':block;}catch{return block;}});const fm=body.indexOf('\n---',4),start=body.indexOf('\n',fm+4)+1;const paras=paragraphs(body,start),headings=[...body.matchAll(/^## .*$/gm)],insertions=new Map();for(const meta of items){
 const explicit=anchors[meta.id];let chosen=explicit?paras.find(p=>p.text.includes(explicit)):undefined;
 if(meta.id==='z-box'&&!chosen)chosen=paras.find(p=>p.text.includes('Z-box'));
 let position;
 if(chosen)position=chosen.end;
 else {const heading=headings.find(h=>meta.section&&h[0].toLocaleLowerCase('vi').includes(meta.section.toLocaleLowerCase('vi')));const sectionStart=heading?heading.index+heading[0].length:start;const sectionEnd=heading?(headings.find(h=>h.index>heading.index)?.index??body.length):(headings[0]?.index??body.length);const relevant=paras.filter(p=>p.start>=sectionStart&&p.end<=sectionEnd);const endMatter=relevant.find(p=>/^\*\*Tự luyện|^\*Đọc thêm|^\*Đối chiếu/.test(p.text));position=endMatter?endMatter.start:sectionEnd;}
 if(!insertions.has(position))insertions.set(position,[]);insertions.get(position).push(`\n\n\`\`\`note-visualization\n${JSON.stringify({id:meta.id,preset:meta.presets[0].id})}\n\`\`\`\n\n`);inserted++;}
 for(const [position,blocks] of [...insertions].sort(([a],[b])=>b-a))body=body.slice(0,position)+blocks.join('')+body.slice(position);await writeFile(file,body);}
console.log(`Đặt ${inserted} visualization sau phần giải thích trong ${byFile.size} notes.`);
let progress='# Tiến độ visualization DSA\n\nDanh sách đã triển khai. Nghiệm thu build/UI và review được ghi trong ledger; số lượng registry không thay thế xác minh từng input.\n\n| ID | Note | Section | Giới hạn | Presets / expected output |\n|---|---|---|---|---|\n';
for(const meta of Object.values(visualizationCatalog))progress+=`| ${meta.id} | ${meta.note??'searching'} | ${meta.section??'lower_bound'} | ${(meta.limits??'32 phần tử').replaceAll('|','/')} | ${meta.presets.map(p=>`${p.id}: ${p.expectedOutput??'theo ví dụ Binary Search hiện có'}`).join('; ').replaceAll('|','/').replaceAll('\n',' ')} |\n`;
await writeFile('planning/dsa-visualization-progress.md',progress);
