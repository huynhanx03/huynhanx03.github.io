/** Scenario owns the model; the player owns time; the renderer owns the view. */
export interface Frame<State> {
    state: State;
    explanation: string;
    label?: string;
    variables: Record<string, string | number>;
    codeLines?: number[];
}
export interface Trace<State> {
    frames: Frame<State>[];
    output: string;
    summary: string;
}
export interface Scenario<Input, State> {
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
        values: Record<string, string>;
        expectedOutput?: string;
    }[];
    limits?: string;
    parse(values: Record<string, string>): Input;
    build(input: Input): Trace<State>;
    createView(container: HTMLElement): {
        render(frame: Frame<State>, finished: boolean): void;
        destroy?(): void;
    };
    source?: {
        language: string;
        code: string;
    };
}
