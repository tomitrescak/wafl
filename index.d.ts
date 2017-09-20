declare module 'wafl' {
  export function setup(): void;
  export function setupLuis(startImmediately?: boolean): void;
  export function setupEnzyme(): void;
  export function setupGlobals(): void;
  export function setupBddBridge(): void;
  export function setupJsxControls(): void;
}