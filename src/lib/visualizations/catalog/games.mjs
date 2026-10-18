import {metadata as m,collect} from './helpers.mjs';
export const definitions=collect([
 ...[['nim-xor','Nim XOR'],['nim-winning-move','Nước đi thắng Nim']].map(([id,title])=>m('games',id,title,'nim-sprague-grundy','Nim',{a:'3 4 5'},{a:'1 1'},id==='nim-xor'?'2':'0: 3→1',id==='nim-xor'?'0':'Không có nước thắng','≤8 piles, mỗi pile 0–20, normal play.')),
 m('games','grundy-mex','Grundy và mex','nim-sprague-grundy','Grundy',{n:'4',edges:'3 1\n3 2\n2 1\n1 0'},{n:'1',edges:''},'0, 1, 0, 2','0','Đồ thị nước đi DAG ≤12 trạng thái.'),
 ...[['minimax','Minimax'],['alpha-beta','Alpha–beta pruning']].map(([id,title])=>m('games',id,title,'alpha-beta-pruning','Hai cận',{a:'3 5 6 9'},{a:'-3 -5 -6 -9'},'6','-5','Số lá là lũy thừa 2, ≤16 lá; root MAX, luân phiên MIN/MAX.')),
]);
