import {metadata as m,collect} from './helpers.mjs';
export const definitions=collect([
 m('combinatorics','permutations-count','Đếm chỉnh hợp','combinatorics-inclusion-exclusion','Hoán vị',{n:'5',k:'3'},{k:'0'},'60','1','0≤k≤n≤20; BigInt.'),
 m('combinatorics','combinations-count','Đếm tổ hợp','combinatorics-inclusion-exclusion','Hoán vị',{n:'5',k:'3'},{k:'0'},'10','1','0≤k≤n≤20; BigInt.'),
 m('combinatorics','inclusion-exclusion','Bao hàm–loại trừ','combinatorics-inclusion-exclusion','Bao hàm',{a:'1 2 3',b:'3 4',x:'2 4 5'},{a:'',b:'',x:''},'5','0','Ba tập số nguyên, mỗi tập≤16 phần tử.'),
 m('combinatorics','probability-outcomes','Không gian mẫu hữu hạn','probability-for-algorithms','Hợp',{n:'6',a:'2 4 6'},{a:''},'1/2','0/1','Xúc xắc đều n mặt, 1≤n≤16. Biến cố nhập các mặt.'),
 m('combinatorics','conditional-probability','Xác suất có điều kiện','probability-for-algorithms','điều kiện',{n:'6',a:'2 4 6',b:'4 5 6'},{b:''},'2/3','Không xác định','P(A|B)=(A∩B)/B; B rỗng được báo rõ.'),
 m('combinatorics','expectation','Kỳ vọng qua enumeration','probability-for-algorithms','Kỳ vọng',{n:'6'},{n:'1'},'7/2','1/1','Uniform die n mặt, 1≤n≤16; phân số chính xác.'),
]);
