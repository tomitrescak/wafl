require('./index').setupTestExtensions

function setup({ config, wallaby, snapshotMode } = {}) {
  if (!config) {
    try {
      config = require('chai-match-snapshot').config;
    } catch (ex) {
      config = {};
    }
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
  setupGlobals();
  require('./index').setupTestExtensions();
  setupPolyFills();
  setupStubs();
  setupStyles();
}

function setupStubs() {
  try {
    const { registerNode, setGlobalStubs } = require('proxyrequire');
    const React = require('react');

    registerNode();
    setGlobalStubs({
      'react-router-dom': {
        Link: props =>
          React.createElement(
            'a',
            { href: props.to, className: props.className, onClick: e => e.preventDefault() },
            props.children
          )
      }
    });
  } catch (ex) {}
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
  const raf = require('raf');
  raf.polyfill();
}

function replacer(key, value) {
  if (typeof value === 'string' && value.match(/\d\d:\d\d:\d\d/)) {
    return new Date(value).toDateString();
  }
  if (key === 'fields') {
    return 'fields';
  }
  if (key === 'context') {
    return 'App.Context';
  }
  if (key === 'client') {
    return 'GraphQlClient';
  }
  return value;
}

function setupSnapshots(config) {
  config.onProcessSnapshots = (_taskName, snapshotName, actual, expected) => {
    if (actual) {
      actual = actual.replace(/ style="pointer-events: all;"/g, '');
    }
    if (expected) {
      expected = expected.replace(/ style="pointer-events: all;"/g, '');
    }
    return {
      actual,
      expected
    };
  };
  config.replacer = replacer;
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
}

function setupWallaby(config, wallaby) {
  // const parseStoryName = require('chai-match-snapshot/config').parseStoryName;
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
      // const names = parseStoryName(title);
      const tags = props.tags ? ' ' + props.tags : '';

      context.currentProps = props;
      context.describe(title + tags, () => fn(props));
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
  const html = require('js-beautify').html;
  const stringify = require('json-stringify-safe');

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
  try {
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
            `You are selecting index #${value} in your Dropdown, while only ${
              items.length
            } Dropdown.Items are available`
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
  } catch (ex) {}
}

function setupChai() {
  // setup chai

  try {
    const chai = require('chai');
    const sinonChai = require('sinon-chai');
    // const chaiEnzyme = require('chai-enzyme');
    const chaiSubset = require('chai-subset');
    const chaiAsPromised = require('chai-as-promised');
    const chaiMatchSnapshot = require('chai-match-snapshot').chaiMatchSnapshot;
    // require("mocha-snapshots");

    chai.should();
    chai.use(sinonChai);
    // chai.use(chaiEnzyme());
    chai.use(chaiMatchSnapshot);
    chai.use(chaiSubset);
    chai.use(chaiAsPromised);
  } catch (ex) {}
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

module.exports = {
  setup,
  setupGlobals
};
