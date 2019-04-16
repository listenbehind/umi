import { IApi, IWebpackChainConfig } from 'umi-types';
import chalk from 'chalk';

interface IOpts {
  externals: string[];
}

interface IAUTO_EXTERNAL_MAP_ITEM {
  root: string; // global name
  script: string; // js url
  style?: string; // style url
  polyfillUrl?: string;
  polyfillExclude?: string[]; // polyfills
  deps?: string[]; // external 之间的依赖关系
}

interface IAUTO_EXTERNAL_MAP {
  [key: string]: IAUTO_EXTERNAL_MAP_ITEM;
}

const AUTO_EXTERNAL_MAP: IAUTO_EXTERNAL_MAP = {
  react: {
    root: 'React',
    script: 'https://unpkg.com/react@version/umd/react.production.min.js',
    polyfillUrl: 'https://unpkg.com/react@version/umd/react.profiling.min.js',
    polyfillExclude: ['core-js/es6/map', 'core-js/es6/set'],
  },
  'react-dom': {
    root: 'ReactDom',
    script:
      'https://unpkg.com/react-dom@version/umd/react-dom.production.min.js',
  },
  antd: {
    root: 'antd',
    script: 'https://unpkg.com/antd@version/dist/antd.min.js',
    style: 'https://unpkg.com/antd@version/dist/antd.min.css',
  },

  // 手动维护版本号
  moment: {
    root: 'moment',
    script: 'https://unpkg.com/moment@2.24.0/min/moment.min.js',
  },
  jquery: {
    root: 'jQuery',
    script: 'https://unpkg.com/jquery@3.3.1/dist/jquery.min.js',
  },
};

function error(msg: string, name?: string) {
  const err = new Error(chalk.red(msg));
  err.name = name || 'AutoExternalError';
  throw err;
}

function validate(autoExternalKeys, externalConfig: any = {}) {
  // Must be an array
  if (!Array.isArray(autoExternalKeys)) {
    error('Wrong auto externals config');
  }

  autoExternalKeys.forEach((key: string) => {
    const notFound = !!AUTO_EXTERNAL_MAP[key];
    if (!notFound) {
      error(`Not support auto external dependencies: ${key}`);
    }
    if (externalConfig[key]) {
      error(`${key} is is both in external and autoExternals`);
    }
  });
}

function parseVersions(versions: string[]): { [key: string]: string } {
  const res = {};
  versions.forEach(item => {
    const [key, version] = item.replace(/\s.*/, '').split('@');
    res[key] = version;
  });
  return res;
}

function getExternalData(
  key: string,
  version: string,
): {
  key: string;
  root: string;
  scripts: string[];
  styles: string[];
  polyfillExclude: string[];
} {
  const {
    root,
    script,
    polyfillExclude: polyfills,
    polyfillUrl,
    style,
  } = AUTO_EXTERNAL_MAP[key];
  const scripts = [polyfillUrl]
    .concat(script)
    .map(item => item.replace('version', version));
  const styles = [style].map(item => item.replace('version', version));
  return {
    key,
    root,
    scripts,
    styles,
    polyfillExclude: polyfills,
  };
}

export default function(api: IApi, { externals: autoExternalKeys }: IOpts) {
  validate(autoExternalKeys, api.externals);
  const versions = parseVersions(api.applyPlugins('addVersionInfo'));
  const configs = autoExternalKeys.map((key: string) =>
    getExternalData(key, versions[key]),
  );

  // 修改 webpack external 配置
  api.chainWebpackConfig((webpackConfig: IWebpackChainConfig) => {
    webpackConfig.externals(
      configs.map(({ key, root }) => ({
        [key]: root,
      })),
    );
  });

  // 修改 script 标签
  const scripts = configs.reduce((accumulator, current) => {
    return accumulator.concat(current.scripts);
  }, []);
  api.addHTMLScript(() => scripts.map(src => ({ src, crossorigin: true })));

  // 添加 style
  const styles = configs.reduce((accumulator, current) => {
    return accumulator.concat(current.styles);
  }, []);
  api.addHTMLStyle(() => styles.map(src => ({ src, crossorigin: true })));

  // TODO: 传递 exclude
}
