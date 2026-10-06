import type { Locale } from './config';

export interface Messages {
  languageName: string;
  nav: { home: string; experience: string; projects: string; achievements: string; problemSolving: string; notes: string; primary: string; switchTo: string; theme: string; menu: string };
  home: {
    greeting: string; viewProjects: string; skills: string; competitive: string; problemsTracked: string; rating: string; solved: string; profile: string;
  };
  pages: {
    experience: { title: string; description: string };
    projects: { title: string; description: string; openSource: string; personal: string; empty: string; categoryOpenSource: string; categoryPersonal: string; source: string; live: string; pullRequest: string; viewPullRequests: string; contributionsTo: string; contributionsDescription: string; close: string };
    achievements: { title: string; description: string; certificate: string; award: string };
  };
  notes: {
    title: string; description: string; search: string; filters: string; all: string; noMatches: string; noResults: string;
    notesFilter: string; topicsFilter: string;
    topic: string; steps: string; prerequisites: string; progress: string; completed: string; views: string; viewsUnavailable: string;
    allNotes: string; language: string; minuteRead: string; updated: string; onThisPage: string; series: string; keepExploring: string; related: string; sources: string; references: string; copy: string; copied: string; copyUnavailable: string; switchTo: string;
  };
  problemSolving: {
    title: string; description: string; all: string; any: string; leetcode: string; cses: string; search: string; difficulty: string;
    topic: string; language: string; clear: string; clearSearch: string; searchTopics: string; noMatches: string; problems: string; problem: string; solution: string; solutions: string; resultsOf: string;
    statement: string; submissions: string; solutionCode: string; openProblem: string; back: string;
  };
  notFound: { eyebrow: string; title: string; description: string; home: string };
  seo: { title: string; description: string; homeTitle: string; homeDescription: string; experienceTitle: string; projectsTitle: string; achievementsTitle: string };
  terms: Record<string, string>;
}

const en: Messages = {
  languageName: 'English',
  nav: { home: 'Home', experience: 'Experience', projects: 'Projects', achievements: 'Achievements', problemSolving: 'Problem Solving', notes: 'Notes', primary: 'Primary navigation', switchTo: 'Switch to Vietnamese', theme: 'Toggle color theme', menu: 'Toggle navigation' },
  home: { greeting: 'Hello World', viewProjects: 'View My Projects', skills: 'Skills & Technologies', competitive: 'Competitive Programming', problemsTracked: 'problems solved across platforms', rating: 'rating', solved: 'solved', profile: 'Open profile' },
  pages: { experience: { title: 'Experience', description: 'Building reliable software across teams and systems.' }, projects: { title: 'Projects', description: 'Selected personal projects and open-source work.', openSource: 'Open Source', personal: 'Personal Projects', empty: 'No projects to display yet.', categoryOpenSource: 'Open source', categoryPersonal: 'Personal', source: 'Source', live: 'Live', pullRequest: 'PR', viewPullRequests: 'View pull requests for', contributionsTo: 'Contributions to', contributionsDescription: 'Pull requests I contributed to this project.', close: 'Close' }, achievements: { title: 'Achievements', description: 'Certifications and awards earned through study and competition.', certificate: 'Certificate', award: 'Award' } },
  notes: { title: 'Notes', description: 'Bilingual notes on backend systems and ongoing learning.', search: 'Search notes and topics…', filters: 'Filter notes and topics', all: 'All', noMatches: 'No notes or topics match these filters.', noResults: 'No notes found.', notesFilter: 'Notes', topicsFilter: 'Topics', topic: 'Topic', steps: 'steps', prerequisites: 'Before you start', progress: 'Your progress', completed: 'completed', views: 'views', viewsUnavailable: 'View count is not available yet.', allNotes: 'All notes', language: 'English', minuteRead: 'min read', updated: 'Updated', onThisPage: 'On this page', series: 'Series', keepExploring: 'Keep exploring', related: 'Related notes', sources: 'Sources', references: 'References', copy: 'Copy', copied: 'Copied', copyUnavailable: 'Copy unavailable', switchTo: 'Read in Vietnamese' },
  problemSolving: { title: 'Problem Solving', description: 'Solved problem statements and my solutions across platforms and languages.', all: 'All', any: 'Any', leetcode: 'LeetCode', cses: 'CSES', search: 'Search problems…', clearSearch: 'Clear search', searchTopics: 'Find a topic…', difficulty: 'Difficulty', topic: 'Topic', language: 'Language', clear: 'Clear filters', noMatches: 'No problems match these filters.', problems: 'problems', problem: 'problem', resultsOf: 'of', solution: 'solution', solutions: 'solutions', statement: 'Problem statement', submissions: 'My solutions', solutionCode: 'Solution code', openProblem: 'Open original problem', back: 'All problems' },
  notFound: { eyebrow: '404 / lost in the stack', title: 'This page does not exist.', description: 'The path may have changed. Return home to keep exploring.', home: 'Back home' },
  seo: { title: 'Huỳnh Mai Cao Nhân | Software Engineer', description: 'Backend-focused software engineer specializing in distributed systems, microservices, and high-performance applications.', homeTitle: 'Huỳnh Mai Cao Nhân | Software Engineer', homeDescription: 'Backend-focused software engineer specializing in distributed systems, microservices, and high-performance applications.', experienceTitle: 'Experience | Huỳnh Mai Cao Nhân', projectsTitle: 'Projects | Huỳnh Mai Cao Nhân', achievementsTitle: 'Achievements | Huỳnh Mai Cao Nhân' },
  terms: { note: 'Note', guide: 'Guide', 'interview-question': 'Interview question', reference: 'Reference', link: 'Link', 'project-log': 'Project log', glossary: 'Glossary' },
};

const vi: Messages = {
  languageName: 'Tiếng Việt',
  nav: { home: 'Trang chủ', experience: 'Kinh nghiệm', projects: 'Dự án', achievements: 'Thành tựu', problemSolving: 'Luyện giải thuật', notes: 'Ghi chú', primary: 'Điều hướng chính', switchTo: 'Chuyển sang tiếng Anh', theme: 'Đổi giao diện sáng tối', menu: 'Mở điều hướng' },
  home: { greeting: 'Hello World', viewProjects: 'Xem dự án', skills: 'Kỹ năng & công nghệ', competitive: 'Lập trình thi đấu', problemsTracked: 'bài đã giải trên các nền tảng', rating: 'xếp hạng', solved: 'đã giải', profile: 'Mở hồ sơ' },
  pages: { experience: { title: 'Kinh nghiệm', description: 'Xây dựng phần mềm tin cậy qua nhiều vai trò và hệ thống.' }, projects: { title: 'Dự án', description: 'Dự án cá nhân tiêu biểu và đóng góp mã nguồn mở.', openSource: 'Mã nguồn mở', personal: 'Dự án cá nhân', empty: 'Chưa có dự án để hiển thị.', categoryOpenSource: 'Mã nguồn mở', categoryPersonal: 'Cá nhân', source: 'Mã nguồn', live: 'Chạy thử', pullRequest: 'PR', viewPullRequests: 'Xem pull request của', contributionsTo: 'Đóng góp cho', contributionsDescription: 'Danh sách pull request tôi đã đóng góp cho dự án này.', close: 'Đóng' }, achievements: { title: 'Thành tựu', description: 'Chứng chỉ và giải thưởng từ học tập, nghiên cứu và thi đấu.', certificate: 'Chứng chỉ', award: 'Giải thưởng' } },
  notes: { title: 'Ghi chú', description: 'Ghi chú song ngữ về backend, hệ thống và kiến thức đang học.', search: 'Tìm ghi chú và chủ đề…', filters: 'Lọc ghi chú và chủ đề', all: 'Tất cả', noMatches: 'Không tìm thấy ghi chú hoặc chủ đề phù hợp.', noResults: 'Không tìm thấy ghi chú.', notesFilter: 'Ghi chú', topicsFilter: 'Chủ đề', topic: 'Chủ đề', steps: 'bài', prerequisites: 'Trước khi bắt đầu', progress: 'Tiến độ của bạn', completed: 'đã hoàn thành', views: 'lượt xem', viewsUnavailable: 'Chưa có dữ liệu lượt xem.', allNotes: 'Tất cả ghi chú', language: 'Tiếng Việt', minuteRead: 'phút đọc', updated: 'Cập nhật', onThisPage: 'Trong bài này', series: 'Series', keepExploring: 'Đọc tiếp', related: 'Ghi chú liên quan', sources: 'Nguồn', references: 'Tài liệu tham khảo', copy: 'Sao chép', copied: 'Đã chép', copyUnavailable: 'Không thể sao chép', switchTo: 'Đọc bằng tiếng Anh' },
  problemSolving: { title: 'Problem Solving', description: 'Tra cứu đề bài đã giải cùng lời giải của tôi trên các nền tảng.', all: 'Tất cả', any: 'Bất kỳ', leetcode: 'LeetCode', cses: 'CSES', search: 'Tìm bài toán…', clearSearch: 'Xóa tìm kiếm', searchTopics: 'Tìm chủ đề…', difficulty: 'Độ khó', topic: 'Chủ đề', language: 'Ngôn ngữ', clear: 'Xóa bộ lọc', noMatches: 'Không tìm thấy bài phù hợp.', problems: 'bài toán', problem: 'bài toán', resultsOf: 'trên', solution: 'lời giải', solutions: 'lời giải', statement: 'Đề bài', submissions: 'Lời giải của tôi', solutionCode: 'Mã lời giải', openProblem: 'Mở đề gốc', back: 'Tất cả bài toán' },
  notFound: { eyebrow: '404 / lạc trong stack', title: 'Trang này không tồn tại.', description: 'Đường dẫn có thể đã thay đổi. Quay lại trang chủ để tiếp tục khám phá.', home: 'Về trang chủ' },
  seo: { title: 'Huỳnh Mai Cao Nhân | Kỹ sư phần mềm', description: 'Kỹ sư phần mềm tập trung vào backend, hệ thống phân tán, microservices và các ứng dụng hiệu năng cao.', homeTitle: 'Huỳnh Mai Cao Nhân | Kỹ sư phần mềm', homeDescription: 'Kỹ sư phần mềm tập trung vào backend, hệ thống phân tán, microservices và các ứng dụng hiệu năng cao.', experienceTitle: 'Kinh nghiệm | Huỳnh Mai Cao Nhân', projectsTitle: 'Dự án | Huỳnh Mai Cao Nhân', achievementsTitle: 'Thành tựu | Huỳnh Mai Cao Nhân' },
  terms: { note: 'Ghi chú', guide: 'Hướng dẫn', 'interview-question': 'Câu hỏi phỏng vấn', reference: 'Tham khảo', link: 'Liên kết', 'project-log': 'Nhật ký dự án', glossary: 'Thuật ngữ' },
};

export const messages: Record<Locale, Messages> = { en, vi };
export function getMessages(locale: Locale): Messages { return messages[locale]; }
export function termLabel(locale: Locale, term: string): string { return messages[locale].terms[term] ?? term; }
