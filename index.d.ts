/// <reference types="react" />
/// <reference types="enzyme" />

type LuisProps = {
  startImmediately?: boolean;
  attachToDocument?: boolean;
}

export declare function setupLuis(options?: LuisProps): void;
export declare function setupTestExtensions();

import { ReactElement } from "react";
import { ReactWrapper } from 'enzyme';

// export class ReactWrapper<P = {}, M = {}> {}

// declare module 'enzyme' {
//   interface ReactWrapper {
//     change(value: string): void;
//     select(value: number): void;
//     click(): void;
//   }
// }

declare module 'enzyme' {
  interface ReactWrapper {
    change(value: string): void;
    select(value: number): void;
    click(): void;
  }
}

declare global {
  // declare function xit(name: string, implementation: () => void): void;
  // declare function it(name: string, implementation: () => void): void;
  // declare function describe(name: string, implementation: () => void): void;
  declare function storyOf<T extends StoryConfig>(name: string, config: T, implementation?: (params: T) => void): void;
  // declare function xdescribe(name: string, implementation: () => void): void;
  // declare function before(implementation: () => void): void;
  // declare function beforeAll(implementation: () => void): void;
  // declare function beforeEach(implementation: () => void): void;
  // declare function after(implementation: () => void): void;
  // declare function afterEach(implementation: () => void): void;
  // declare function afterAll(implementation: () => void): void;

  declare interface StoryConfig {
    [index: string]: any;
    component?: JSX.Element;
    info?: string;
    cssClassName?: string;
    componentWithData?(...props: any[]): JSX.Element | {
      [index: string]: any;
      component: JSX.Element;
      documentRoot?: HTMLElement;
      afterMount?(wrapper: ReactWrapper): void;
    }
  }

  type FunctionInitialiser<P> = () => ReactElement<P>;
  type Wrapped<P, W> = W & { component: ReactElement<P> };
  type Wrapper<P, S, W> = W & { wrapper: ReactWrapper<P, S> };
  type AdvancedFunctionInitialiser<P, W> = () => Wrapped<P, W>;

  declare function itMountsAnd<P, S, W>(
    name: string,
    component: AdvancedFunctionInitialiser<P, W>,
    test: (data: Wrapper<P, S, W>) => void
  ): void;

  declare function itMountsAnd<P>(
    name: string,
    component: FunctionInitialiser<P>,
    test: (wrapper: ReactWrapper<P, any>) => void
  ): void;

  declare function itMountsContainerAnd<P, S>(
    name: string,
    component: FunctionInitialiser<P>,
    test: (wrapper: ReactWrapper<P, S>) => void
  ): void;

  declare function itMountsContainerAnd<P, S, W>(
    name: string,
    component: AdvancedFunctionInitialiser<P, W>,
    test: (data: Wrapper<P, S, W>) => void
  ): void;
  
  declare type MatchOptions = {
    serializer?: (source: string) => string;
  };
  declare namespace Chai {
    interface Assertion {
      matchSnapshot(name?: string, options?: MatchOptions): Assertion
    }
  }
}

export function story(props: StoryConfig): void;

export function mount<P, S, W>(
  component: AdvancedFunctionInitialiser<P, W>,
  test: (data: Wrapper<P, S, W>) => void
): void;

export function mountContainer<P, S, W>(
  component: AdvancedFunctionInitialiser<P, W>,
  test: (data: Wrapper<P, S, W>) => void
): void;

export function itMountsAnd<P, S, W>(
  name: string,
  component: AdvancedFunctionInitialiser<P, W>,
  test: (data: Wrapper<P, S, W>) => void
): void;

export function itMountsAnd<P>(
  name: string,
  component: FunctionInitialiser<P>,
  test: (wrapper: ReactWrapper<P, any>) => void
): void;

export function itMountsAnd<P>(
  name: string,
  component: P,
  test: (wrapper: Wrapper<P, {}, {}>) => void
): void;

export function itMountsContainerAnd<P, S>(
  name: string,
  component: FunctionInitialiser<P>,
  test: (wrapper: ReactWrapper<P, S>) => void
): void;

export function itMountsContainerAnd<P, S, W>(
  name: string,
  component: AdvancedFunctionInitialiser<P, W>,
  test: (data: Wrapper<P, S, W>) => void
): void;

export const it = itMountsAnd;

