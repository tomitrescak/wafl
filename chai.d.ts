interface IConfig {
  [index: string]: any;
  component: JSX.Element;
  story: string;
  folder: string;
  info: string;
}

declare function config(obj: IConfig);

declare namespace Chai {
  interface Assertion {
    matchSnapshot(): Assertion;
  }
}