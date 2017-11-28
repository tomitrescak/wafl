const html = require('js-beautify').html;
const parseStoryName = require('chai-match-snapshot/config').parseStoryName;
const testConfig = require('chai-match-snapshot').config;
const stringify = require('json-stringify-safe');
const raf = require('raf');

function setup({ config, wallaby, snapshotMode, snapshotDir } = {}) {
  config = config || testConfig;

  if (snapshotDir) {
    config.snapshotDir = snapshotDir;
  }

  if (wallaby) {
    setupWallaby(config, wallaby);
  }

  if (snapshotMode) {
    let mode = snapshotMode.toLowerCase();
    if (mode === 'tcp' || mode === 'both') {
      setupTcpClient();
    }
    config.snapshotMode = mode;
  }

  setupSnapshots(config);
  setupSerialiser(config);
  setupJsDom();
  setupEnzyme();
  setupChai();
  setupGlobals(config);
  setupTestExtensions();
  setupPolyFills();
  setupStubs();
  setupStyles();
}

function setupStubs() {
  const { registerNode, setGlobalStubs } = require('proxyrequire');
  const React = require('react');

  registerNode();
  setGlobalStubs({
    'react-router-dom': {
      Link: (props) => React.createElement('a', { href: props.to, className: props.className, onClick: (e) => e.preventDefault() }, props.children)
    }
  });
}

function setupTcpClient() {
  process.env.UPDATE_SNAPSHOTS = 1;

  var net = require('net');
  var JsonSocket = require('json-socket');

  try {
    var port = 9838; //The same port that the server is listening on
    var host = '127.0.0.1';
    var socket = new JsonSocket(new net.Socket()); //Decorate a standard net.Socket with JsonSocket
    socket.connect(port, host);
    socket.on('connect', function() {
      socket.isReady = true;
    });
    global.__socket = socket;
  } catch (ex) {
    console.error('Problem connecting to snapshot TCP server: ' + ex.message);
  }
}

function setupPolyFills() {
  raf.polyfill();
}

function setupSnapshots(config) {
  config.snapshotDir = config.snapshotDir || 'src/tests/snapshots';
  config.snapshotExtension = 'json';
  // console.log(config.snapshotDir);
}

function setupStyles() {
  const typestyle = require('typestyle');
  if (typestyle) {
    typestyle.reinit();
  }
}

function setupJsDom() {
  if (!global.document) {
    require('jsdom-global')();
  }

  window.localStorage = {};

  // const jsdom = require('jsdom').jsdom;

  // global.document = jsdom('');
  // global.window = document.defaultView;
  // global.navigator = {
  //   userAgent: 'node.js'
  // };

  // function copyProps(src, target) {
  //   const props = Object.getOwnPropertyNames(src)
  //     .filter(prop => typeof target[prop] === 'undefined')
  //     .map(prop => Object.getOwnPropertyDescriptor(src, prop));
  //   Object.defineProperties(target, props);
  // }
  // copyProps(document.defaultView, global);

  // const { JSDOM } = require('jsdom');
  // const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
  // const { window } = jsdom;

  // function copyProps(src, target) {
  //   const props = Object.getOwnPropertyNames(src)
  //     .filter(prop => typeof target[prop] === 'undefined')
  //     .map(prop => Object.getOwnPropertyDescriptor(src, prop));
  //   Object.defineProperties(target, props);
  // }

  // global.window = window;
  // global.document = window.document;
  // global.navigator = {
  //   userAgent: 'node.js'
  // };
  // copyProps(window, global);
}

function setupWallaby(config, wallaby) {
  var mocha = wallaby.testFramework;

  mocha.suite.on('pre-require', function(context) {
    const origIt = context.it;
    const origDescribe = context.describe;

    context.describe = function(name, impl) {
      origDescribe(name, () => {
        before(() => {
          config.writeSnapshots = null;
          config.snapshotCalls = null;
        });

        after(() => {
          if (config.writeSnapshots) {
            config.writeSnapshots();
          }
        });

        impl();
      });
    };

    context.config = function() {};

    let currentProps;

    context.storyOf = function(title, props, fn) {
      const names = parseStoryName(title);
      const tags = ' @story' + (props.tags ? ' ' + props.tags : '');

      context.currentProps = props;
      context.describe(names.fileName + tags, () => fn(props));
    };
    context.it = function(name, impl) {
      return origIt.call(this, name, function() {
        try {
          let name = this.test.title;
          let parent = this.test.parent;
          let parents = [];
          while (parent != null) {
            if (parent.title) {
              parents.push(parent.title);
            }
            parent = parent.parent;
          }

          // remove tags
          let topParent = parents.reverse().join('_');

          topParent = topParent.replace(/ @[^_]+/g, '');
          topParent = topParent.replace(/\s/g, '');

          config.currentTask = {
            className: topParent,
            title: name,
            cssClassName: context.currentProps && context.currentProps.cssClassName,
            decorator: context.currentProps && context.currentProps.decorator
          };
          // config.snapshotCalls = null;
          // console.log('!!!!!!!!!!!!!!!!');
          // console.log(TestConfig.currentTask);
          return impl();
        } catch (ex) {
          throw ex;
        }
      });
    };
    context.xit = function() {};
  });
}

function setupSerialiser(config) {
  let originalSerializer = config.serializer;
  let replacer = config.replacer || null;

  config.serializer = obj => {
    if (obj.html) {
      let objectHtml = obj.html();
      if (objectHtml) {
        return html(objectHtml.replace(/ ;/g, ';'), {
          indent_size: 2
        });
      } else {
        return '<div>ERROR: Component does not generate any HTML code!</div>';
      }
    } else {
      return stringify(obj, replacer, 2);
    }
  };
}

function setupJsxControls() {
  const fs = require('fs');
  const origRfs = fs.readFileSync;
  const jsxTransform = require('jsx-controls-loader').loader;

  fs.readFileSync = function(source, encoding) {
    if (source.indexOf('node_modules') == -1 && source.match(/\.tsx$/)) {
      const file = origRfs(source, encoding);
      return jsxTransform(file);
    }
    return origRfs(source, encoding);
  };
}

function setupEnzyme() {
  const Enzyme = require('enzyme');
  const Adapter = require('enzyme-adapter-react-16');

  Enzyme.configure({ adapter: new Adapter() });

  const ShallowWrapper = require('enzyme/build/ShallowWrapper').default;
  const ReactWrapper = require('enzyme/build/ReactWrapper').default;

  ShallowWrapper.prototype.change = function(value) {
    change(this, value);
  };
  ShallowWrapper.prototype.click = function() {
    this.simulate('click');
  };
  ReactWrapper.prototype.change = function(value) {
    change(this, value);
  };
  ReactWrapper.prototype.click = function() {
    this.simulate('click');
  };

  function change(wrapper, value) {
    wrapper.simulate('change', {
      target: {
        value
      }
    });
    // wrapper.node.value = value;
  }
  ShallowWrapper.prototype.select = function(number) {
    select(this, number);
  };
  ReactWrapper.prototype.select = function(number) {
    select(this, number);
  };

  function select(wrapper, value) {
    const Dropdown = require('semantic-ui-react').Dropdown;
    if (wrapper.find(Dropdown.Item).length > 0) {
      let items = wrapper.simulate('click').find(Dropdown.Item);
      if (value > items.length - 1) {
        throw new Error(
          `You are selecting index #${value} in your Dropdown, while only ${items.length} Dropdown.Items are available`
        );
      }
      items.at(value).simulate('click');
    } else {
      wrapper
        .parent()
        .find('Dropdown')
        .find(Dropdown.Item)
        .at(value)
        .simulate('click');
    }
  }
}

function setupChai() {
  // setup chai

  const chai = require('chai');
  const sinonChai = require('sinon-chai');
  // const chaiEnzyme = require('chai-enzyme');
  const chaiSubset = require('chai-subset');
  const chaiAsPromised = require('chai-as-promised');
  const chaiMatchSnapshot = require('chai-match-snapshot').chaiMatchSnapshot;
  // const should = global.FuseBox ? FuseBox.import('fuse-test-runner').should : require('fuse-test-runner').should;

  chai.should();
  chai.use(sinonChai);
  // chai.use(chaiEnzyme());
  chai.use(chaiMatchSnapshot);
  chai.use(chaiSubset);
  chai.use(chaiAsPromised);
}

function setupGlobals() {
  global.localStorage = {
    setItem(key, value) {
      global.localStorage[key] = value;
    },
    getItem(key) {
      return global.localStorage[key];
    },
    removeItem(key) {
      delete global.localStorage[key];
    }
  };

  global.navigator = {
    userAgent: 'node.js'
  };

  global.action = () => {};
  global.monitor = () => {};
  global.cancelAnimationFrame = () => {};

  // setup globals

  try {
    const i18n = require('es2015-i18n-tag');
    if (i18n) {
      global.i18n = i18n.default;
    }
  } catch (ex) {}
}

function setupTestExtensions({ attachToDocument = false } = {}) {
  const { mount } = require('enzyme');
  let root = document.createElement('div');
  if (attachToDocument) {
    document.documentElement.appendChild(root);
  }
  global.itMountsAnd = function(name, component, test, options = {}) {
    it(name, function() {
      let init = typeof component === 'function' ? component() : component;
      let comp = init.component ? init.component : init;
      let afterMount = init.afterMount;

      const wrapper = init.wrapper ? init.wrapper : mount(comp, { attachTo: options.documentRoot || root });
      let afterMountResult = {};
      if (afterMount) {
        afterMountResult = afterMount(wrapper) || {};
      }
      wrapper.dispose = () => {
        try {
          wrapper.detach();
        } catch (ex) {}
      };

      let isAsync = false;
      try {
        const res = test(init.component || init.component ? Object.assign(init, { wrapper }, afterMountResult) : wrapper);
        isAsync = res instanceof Promise;
        if (isAsync) {
          return new Promise((resolve, reject) => {
            res
              .then(() => {
                wrapper.dispose();
                resolve();
              })
              .catch(error => {
                wrapper.dispose();
                reject(error);
              });
          });
        }
        return res;
      } catch (ex) {
        throw ex;
      } finally {
        if (!isAsync) {
          wrapper.dispose();
        }
      }
    });
  };

  global.itMountsAsyncAnd = function(name, component, test) {
    it(name, async function() {
      let init = typeof component === 'function' ? component() : component;
      let comp = init.component ? init.component : init;
      const wrapper = init.wrapper ? init.wrapper : mount(comp, { attachTo: root });
      try {
        await test(init.component || init.component ? Object.assign(init, { wrapper }) : wrapper);
      } catch (ex) {
        throw ex;
      } finally {
        try {
          wrapper.detach();
        } catch (ex) {}
      }
    });
  };

  global.itMountsContainerAnd = function(name, component, test) {
    it(name, async function() {
      let init = typeof component === 'function' ? component() : component;
      let comp = init.component ? init.component : init;
      const wrapper = init.wrapper ? init.wrapper : mount(comp, { attachTo: root });

      if (!init.client) {
        throw new Error('You need to pass "client: ApolloClient" alongside of "component"');
      }
      await require('apollo-mobx/testing').waitForQueries(init.client);

      // update manually wrapper as Enzyme 3 makes problems
      wrapper.update();

      try {
        await test(init.component || init.component ? Object.assign(init, { wrapper }) : wrapper);
      } catch (ex) {
        throw ex;
      } finally {
        try {
          wrapper.detach();
        } catch (ex) {}
      }
    });
  };
}

function transform(content, name) {
  var classReg = /export\s+class\s+(\w+Test)/g;
  name = name || '.';

  var matches = classReg.exec(content);

  if (matches) {
    content += `
const TestConfig = require('fuse-test-runner').TestConfig;
function getAllFuncs(obj) {
    let props = [];
    do {
        props = props.concat(Object.getOwnPropertyNames(obj).filter(
            w => typeof obj[w] === 'function' && w !== 'constructor' && props.indexOf(w) === -1));
        obj = Object.getPrototypeOf(obj);
    } while (obj.constructor.name !== 'Object');
    return props;
}

function __runTests(test, className) {
  for (let method of getAllFuncs(test)) {
    if (typeof test[method] === 'function' && method.match(/${name}/)) {
      if (method === 'beforeEach' || method === 'afterEach') {
        test[method]();
      } else {
        it(method.trim(), async function () {
          TestConfig.currentTask = {
            className,
            title: method
          }
          TestConfig.snapshotCalls = null;
          await test[method]();
        });
      }
    }
  }
} 
`;
    while (matches) {
      content += `__runTests(new ${matches[1]}(), '${matches[1]}');\n`;
      matches = classReg.exec(content);
    }
  }

  return content;
}

function setupLuis({ startImmediately = true, attachToDocument = false } = {}) {
  setupSerialiser(testConfig);
  setupEnzyme();
  setupChai();
  setupTestExtensions({ attachToDocument });
  setupStubs();
}

module.exports = {
  setup,
  setupGlobals,
  setupLuis,
  transform,
  setupJsxControls
};
