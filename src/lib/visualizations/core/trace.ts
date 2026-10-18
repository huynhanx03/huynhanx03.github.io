import type { Frame, Trace } from '../types';
export function createTraceRecorder<State>(maxFrames = 2048, maxOperations = 100000) {
    const frames: Frame<State>[] = [];
    let operations = 0;
    return {
        consume(count = 1) { operations += count; if (operations > maxOperations)
            throw new Error('Dữ liệu vượt giới hạn công việc của mô phỏng. Hãy giảm input.'); },
        emit(state: State, explanation: string, variables: Record<string, string | number> = {}, label = 'Quan sát') {
            if (frames.length >= maxFrames)
                throw new Error('Mô phỏng vượt 2.048 bước. Hãy giảm input.');
            frames.push({ state: structuredClone(state), explanation, variables: { ...variables }, label });
        },
        finish(output: string, summary: string): Trace<State> {
            if (!frames.length)
                throw new Error('Kịch bản chưa tạo trạng thái.');
            return { frames, output, summary };
        },
    };
}
