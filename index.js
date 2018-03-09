function mountView(component, test) {
  const { mount } = require('enzyme');

  let root = document.createElement('div');

  let init = null;
  if (typeof component === 'function') {
    init = component();
  } else if (component[config.createComponent]) {
    init = component[config.createComponent](component);
  } else {
    init = component;
  }

  let comp = init.component ? init.component : init;
  let afterMount = init.afterMount;

  if (init.documentRoot) {
    document.documentElement.appendChild(root);
  }

  const wrapper = init.wrapper ? init.wrapper : mount(comp, { attachTo: root });
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
    const res = test(
      init.component || init.component
        ? Object.assign(init, { wrapper }, afterMountResult)
        : wrapper
    );
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
    if (init.documentRoot) {
      document.documentElement.removeChild(root);
    }
    if (!isAsync) {
      wrapper.dispose();
    }
  }
}

async function mountContainer(component, test) {
  const { mount } = require('enzyme');

  let root = document.createElement('div');
  let init = typeof component === 'function' ? component() : component;
  let comp = init.component ? init.component : init;

  if (init.documentRoot) {
    document.documentElement.appendChild(root);
  }

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
    if (init.documentRoot) {
      document.documentElement.removeChild(root);
    }
    try {
      wrapper.detach();
    } catch (ex) {}
  }
}

function story() {
}

function itMountsAnd (name, component, test) {
  it(name, function() {
    return mountView(component, test);
  });
};

function itMountsContainerAnd (name, component, test) {
  it(name, function() {
    return mountContainer(component, test);
  });
};

function setupTestExtensions({ attachToDocument = false } = {}) {
  global.itMountsAnd = itMountsAnd;
  global.itMountsContainerAnd = itMountsContainerAnd;
  global.mount = mountView;
  global.mountContainer = mountContainer;
}

function setupLuis({
  startImmediately = true,
  attachToDocument = false,
  useChai = true,
  useEnzyme = true,
  useReactRouter = true
} = {}) {
  if (useReactRouter) {
    setupStubs();
  }
}

const config = {
  createComponent: 'mount'
}

module.exports = {
  config,
  setupTestExtensions,
  setupLuis,
  mountContainer,
  mount: mountView,
  itMountsAnd,
  itMountsContainerAnd,
  story,
  it: itMountsAnd
};
