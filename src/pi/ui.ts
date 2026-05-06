// src/pi/ui.ts
export interface PiUiLike {
  confirm(message: string): Promise<boolean>;
  input(message: string): Promise<string>;
  select(message: string, choices: string[]): Promise<string>;
}

export interface UiAdapter {
  confirm(message: string): Promise<boolean>;
  input(message: string): Promise<string>;
  select(message: string, choices: string[]): Promise<string>;
}

export function wrapUi(ui: PiUiLike): UiAdapter {
  return {
    confirm: (m) => ui.confirm(m),
    input: (m) => ui.input(m),
    select: (m, c) => ui.select(m, c),
  };
}
