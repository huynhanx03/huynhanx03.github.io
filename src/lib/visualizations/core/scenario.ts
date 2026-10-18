import type { Scenario } from '../types';
import { createTraceRecorder } from './trace';
import type { LessonScene, Panel } from './scene';
import { createLessonSceneView } from '../views/lesson-scene';
import { mountScenario } from '../player';
export type Values = Record<string, string>;
export interface Metadata {
    id: string;
    title: string;
    subtitle: string;
    fields: {
        name: string;
        label: string;
        placeholder?: string;
        multiline?: boolean;
    }[];
    presets: {
        id: string;
        label: string;
        values: Values;
        expectedOutput?: string;
    }[];
    limits?: string;
    fallback: string;
}
export type Recorder = ReturnType<typeof createTraceRecorder<LessonScene>>;
export type Builder = (values: Values, recorder: Recorder) => {
    output: string;
    summary?: string;
};
export function emit(r: Recorder, panels: Panel[], explanation: string, variables: Record<string, string | number> = {}, label = 'Quan sát') { r.consume(); r.emit({ panels }, explanation, variables, label); }
export function createLessonScenario(meta: Metadata, builder: Builder): Scenario<Values, LessonScene> {
    return { ...meta, parse: v => v, build(v) { const recorder = createTraceRecorder<LessonScene>(); const result = builder(v, recorder); return recorder.finish(result.output, result.summary ?? 'Kết quả được tính từ input hiện hành.'); }, createView: createLessonSceneView };
}
export function mountFamily(id: string, root: HTMLElement, metadata: Record<string, Metadata>, builders: Record<string, Builder>) { if (!metadata[id] || !builders[id])
    throw new Error('Chưa đăng ký scenario.'); return mountScenario(root, createLessonScenario(metadata[id], builders[id])); }
