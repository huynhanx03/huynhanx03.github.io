import { spawn } from 'node:child_process';

const child = spawn('pnpm', ['exec', 'pagefind', '--site', 'dist', '--output-subdir', '_pagefind', '--include-characters', 'åáàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ'], {
  stdio: 'inherit',
  shell: false,
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
