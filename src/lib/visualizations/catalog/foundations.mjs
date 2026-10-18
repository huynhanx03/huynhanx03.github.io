import {metadata as m,collect} from './helpers.mjs';
export const definitions=collect([
 m('foundations','scan-maximum','Quét tìm cực đại','problem-solving','lời giải',{a:'2 9 3 7'},{a:''},'9','Rỗng'),
 ...[['linear-count','Đếm vòng lặp tuyến tính'],['nested-loop-count','Đếm vòng lặp lồng nhau'],['halving-count','Đếm số lần chia đôi'],['dynamic-capacity','Tăng capacity và amortized']].map(([id,title])=>m('foundations',id,title,'complexity',id==='dynamic-capacity'?'Amortized':'Đếm',{n:'6'},{n:'0'},id==='linear-count'?'6':id==='nested-loop-count'?'36':id==='halving-count'?'3':'8','0','0≤n≤12.')),
 m('foundations','stack-contract','Stack và invariant','abstract-data-types','hợp đồng',{ops:'push 3\npush 7\npop'},{ops:'pop'},'3','Rỗng'),
 m('foundations','slice-alias','Slice dùng chung backing array','arrays-and-slices','alias',{a:'1 2 3',target:'9',k:'1'},{a:'',k:'0'},'1, 9, 3','Lỗi chỉ số'),
 m('foundations','two-pointers','Hai con trỏ tìm tổng','arrays-and-slices','Hai con trỏ',{a:'1 2 3 5',target:'7'},{a:'',target:'7'},'1, 3','Không có cặp'),
 m('foundations','prefix-sum','Tổng tiền tố và truy vấn [l,r)','arrays-and-slices','Tổng tiền tố',{a:'2 4 6',query:'1 3'},{a:'',query:'0 0'},'10','0'),
 m('foundations','utf8-bytes-runes','Byte và rune UTF-8','arrays-and-slices','Chuỗi Go',{text:'aé'},{text:''},'3 byte / 2 rune','0 byte / 0 rune'),
 m('foundations','stack-operations','Push / pop stack','stacks-queues-deques','Stack',{ops:'push 3\npush 7\npop'},{ops:'pop'},'3','Rỗng'),
 m('foundations','circular-queue','Queue vòng đệm','stacks-queues-deques','Queue',{capacity:'3',ops:'enqueue 1\nenqueue 2\ndequeue'},{capacity:'1',ops:'dequeue'},'2','Rỗng'),
 m('foundations','monotonic-deque','Sliding maximum bằng deque','stacks-queues-deques','Deque',{a:'1 3 2 5 4',k:'3'},{a:'',k:'1'},'3, 5, 5',''),
 m('foundations','upper-bound','Upper bound','searching','upper_bound',{a:'1 2 2 5',target:'2'},{a:'',target:'2'},'3','0'),
 m('foundations','answer-binary-search','Tìm công suất vận chuyển','searching','đáp án',{a:'3 2 2 4 1 4',days:'3'},{a:'',days:'1'},'6','0'),
]);
