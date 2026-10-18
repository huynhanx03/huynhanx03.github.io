import {metadata as m,collect} from './helpers.mjs';
export const definitions=collect([
 m('string-matching','prefix-function','Prefix function','string-matching','Prefix',{pattern:'aba'},{pattern:''},'0, 0, 1',''),
 ...[['kmp-search','KMP'],['boyer-moore','Boyer–Moore đầy đủ']].map(([id,title])=>m('string-matching',id,title,'string-matching',id==='kmp-search'?'Prefix':'Boyer',{text:'ababa',pattern:'aba'},{pattern:''},'0, 2','0, 1, 2, 3, 4, 5','UTF-8 bytes, text≤24, pattern≤16; trả byte offsets.')),
 ...[['hash-prefix','Hash tiền tố','Hash đa thức'],['hash-substring','Hash đoạn','công thức đoạn'],['hash-window','Rolling hash và verify','Cửa sổ']].map(([id,title,section])=>m('string-matching',id,title,'rolling-hash',section,{text:'ababa',pattern:'aba',query:'0 3'},{text:'',pattern:'',query:'0 0'},id==='hash-prefix'?'43':id==='hash-substring'?'31':'0, 2',id==='hash-window'?'0':'0','BigInt, base=31, modulus=97; byte offsets, ≤24 byte.')),
 ...[['manacher-odd','Manacher tâm lẻ'],['manacher-even','Manacher tâm chẵn']].map(([id,title])=>m('string-matching',id,title,'manacher','Tâm',{text:'ababa'},{text:''},id==='manacher-odd'?'1, 2, 3, 2, 1':'0, 0, 0, 0, 0','','≤24 Unicode code points.')),
 m('string-matching','z-box','Z function và Z-box','z-function','Z',{text:'ababa'},{text:''},'0, 0, 3, 0, 1',''),
 m('string-matching','z-pattern','Tìm mẫu bằng Z','z-function','Tìm mẫu',{text:'ababa',pattern:'aba'},{pattern:''},'0, 2','0, 1, 2, 3, 4, 5','Unicode code points; text≤24, pattern≤16.'),
]);
