import { definitions as graphAdvanced } from './catalog/graph-advanced.mjs';
import { definitions as treeQueries } from './catalog/tree-queries.mjs';
import { definitions as structures } from './catalog/structures.mjs';
import { definitions as numbers } from './catalog/number-theory.mjs';
import { definitions as combinatorics } from './catalog/combinatorics.mjs';
import { definitions as games } from './catalog/games.mjs';
import { definitions as suffixes } from './catalog/suffix-automata.mjs';
import { definitions as strings } from './catalog/string-matching.mjs';
import { definitions as compression } from './catalog/compression.mjs';
import { definitions as graphPaths } from './catalog/graph-paths.mjs';
import { definitions as searchDP } from './catalog/search-dp.mjs';
import { definitions as foundations } from './catalog/foundations.mjs';
import { definitions as sorting } from './catalog/sorting.mjs';
/** Serializable metadata shared by Markdown validation and browser scenarios. */
/** @type {Record<string, import('./core/scenario').Metadata & {family?:string;note?:string;section?:string}>} */
export const visualizationCatalog = {
  ...foundations, ...sorting, ...searchDP, ...graphPaths, ...strings, ...compression, ...suffixes, ...numbers, ...combinatorics, ...games, ...structures, ...graphAdvanced, ...treeQueries,
  'binary-search': {
    id: 'binary-search', title: 'Binary Search', subtitle: 'Tìm biên đầu tiên · O(log n)',
    fields: [{ name: 'array', label: 'Mảng đã sắp xếp', placeholder: '1, 3, 5, 7, 9' }, { name: 'target', label: 'Target', placeholder: '9' }],
    presets: [
      { id: 'found', label: 'Tìm thấy', values: { array: '1, 3, 5, 7, 9, 11, 13, 15', target: '9' } },
      { id: 'duplicates', label: 'Giá trị trùng', values: { array: '1, 2, 2, 2, 5, 8', target: '2' } },
      { id: 'absent', label: 'Không tìm thấy', values: { array: '1, 3, 5, 7, 9', target: '6' } },
      { id: 'empty', label: 'Mảng rỗng', values: { array: '', target: '4' } },
    ],
    fallback: 'Ví dụ: [1, 3, 5, 7, 9], target 7 → lower bound 3.',
  },
};
