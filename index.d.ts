type LuisProps = {
  startImmediately?: boolean;
  attachToDocument?: boolean;
}

declare module 'wafl' {
  export function setup(): void;
  export function setupLuis(options: LuisProps): void;
  export function setupEnzyme(): void;
  export function setupGlobals(): void;
  export function setupBddBridge(): void;
  export function setupJsxControls(): void;
}