import {metadata as m,collect} from './helpers.mjs';
export const definitions=collect([
 m('search-dp','factorial-stack','Call stack factorial','recursion','Call stack',{n:'5'},{n:'0'},'120','1','0≤n≤12.'),
 m('search-dp','fibonacci-calls','Cây gọi Fibonacci','recursion','phân nhánh',{n:'5'},{n:'0'},'5','0','0≤n≤8.'),
 m('search-dp','binary-configurations','Sinh dãy bit','configuration-generation','Dãy bit',{n:'3'},{n:'0'},'8','1','0≤n≤6.'),
 m('search-dp','next-permutation','Hoán vị từ điển tiếp theo','configuration-generation','Hoán vị',{a:'1 2 3'},{a:'3 2 1'},'1, 3, 2','1, 2, 3'),
 m('search-dp','n-queens','N quân hậu và pruning','backtracking','quân hậu',{n:'4'},{n:'2'},'2','0','1≤n≤6; 25.000 công việc; ≤2.048 frame.'),
 m('search-dp','interval-scheduling','Chọn khoảng không giao nhau','greedy','khoảng',{intervals:'1 3\n2 5\n4 6'},{intervals:''},'0, 2',''),
 m('search-dp','greedy-coin-counterexample','Khi đổi tiền greedy sai','greedy','thất bại',{coins:'1 3 4',amount:'6'},{amount:'0'},'greedy=3; optimal=2','greedy=0; optimal=0','Tiền ≤30, tối đa 8 mệnh giá dương.'),
 ...[['stairs-memo','DP top-down có memo'],['stairs-bottom-up','DP bottom-up']].map(([id,title])=>m('search-dp',id,title,'dynamic-programming',id==='stairs-memo'?'Top-down':'leo cầu thang',{n:'5'},{n:'0'},'8','1','0≤n≤20.')),
 m('search-dp','lis-dp','LIS và truy vết','dp-classics','Increasing',{a:'3 1 2 5 4'},{a:''},'3: 1, 2, 5','0: '),
 ...[['knapsack-dp','0/1 Knapsack DP','dp-classics','knapsack'],['knapsack-branch-bound','Knapsack branch and bound','branch-and-bound','knapsack']].map(([id,title,note,section])=>m('search-dp',id,title,note,section,{weights:'3 3 2',values:'8 7 4',capacity:'5'},{capacity:'0'},'12','0','≤10 items; capacity≤30; trọng lượng dương.')),
 m('search-dp','edit-distance','Edit distance','dp-classics','Edit distance',{text:'kitten',pattern:'sitting'},{text:'',pattern:'abc'},'3','3','Tối đa 16 Unicode code points mỗi chuỗi.'),
 m('search-dp','hamilton-certificate','Kiểm tra chứng chỉ Hamilton','complexity-classes','chứng chỉ',{n:'4',edges:'0 1\n1 2\n2 3\n3 0',certificate:'0 1 2 3'},{certificate:'0 1 1 3'},'Hợp lệ','Không hợp lệ','≤8 đỉnh; kiểm tra chu trình đóng.'),
]);
