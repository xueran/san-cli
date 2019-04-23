/**
 * @file production mode
 * @author wangyongqing <wangyongqing01@baidu.com>
 */

const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const getAssetPath = require('../utils').getAssetPath;

module.exports = (api, options) => {
    api.chainWebpack(webpackConfig => {
        const isProd = api.isProd();

        if (!isProd) {
            return;
        }
        const {assetsDir, sourceMap = true} = options;
        // 是 modern 模式，但不是 modern 打包，那么 js 加上 legacy
        const isLegacyBundle = options.modernMode && !options.modernBuild;
        const filename = getAssetPath(assetsDir, `js/[name]${isLegacyBundle ? '-legacy' : ''}.[chunkhash:8].js`);

        webpackConfig
            .mode('production')
            .devtool('source-map')
            .output.filename(filename)
            .chunkFilename(filename);

        // splitChunks
        webpackConfig.optimization.splitChunks({
            name: true,
            chunks: 'all',
            minSize: 30000,
            minChunks: 1,
            maxAsyncRequests: 5,
            maxInitialRequests: 3,
            automaticNameDelimiter: '.',
            cacheGroups: {
                default: false,
                // 公共css代码抽离
                styles: {
                    name: 'common',
                    test: /\.css$/,
                    chunks: 'all',
                    enforce: true,
                    // 两个以上公用才抽离
                    minChunks: 2,
                    priority: 20
                },
                // 异步模块命名
                asyncVendors: {
                    name: 'async',
                    minChunks: 1,
                    chunks: 'async',
                    priority: 0
                },
                // 三方库模块独立打包
                vendors: {
                    name: 'vendor',
                    test(mod) {
                        return /[\\/]node_modules[\\/]/.test(mod.resource) && mod.type === 'javascript/auto';
                    },
                    minChunks: 1,
                    priority: -10,
                    chunks: 'initial'
                },
                // 公共js代码抽离
                common: {
                    name: 'common',
                    // 只抽取公共依赖模块，保证页面之间公用，并且不经常变化，否则 http cache 不住
                    test(mod) {
                        return /[\\/]node_modules[\\/]/.test(mod.resource) && mod.type === 'javascript/auto';
                    },
                    // 1个以上公用才抽离
                    minChunks: 1,
                    priority: -20,
                    chunks: 'all',
                    reuseExistingChunk: true
                }
            }
        });

        // 压缩
        webpackConfig.optimization.minimizer('css').use(
            new OptimizeCSSAssetsPlugin({
                assetNameRegExp: /\.css$/g,
                cssProcessorOptions: {
                    normalizeUrl: false,
                    discardUnused: false,
                    // 避免 cssnano 重新计算 z-index
                    zindex: false,
                    reduceIdents: false,
                    safe: true,
                    // cssnano 集成了autoprefixer的功能
                    // 会使用到autoprefixer进行无关前缀的清理
                    // 关闭autoprefixer功能
                    // 使用postcss的autoprefixer功能
                    autoprefixer: false,
                    discardComments: {
                        removeAll: true
                    }
                },
                canPrint: true
            })
        );

        webpackConfig.optimization.minimizer('js').use(
            new TerserPlugin({
                extractComments: false,
                sourceMap,
                parallel: true,
                cache: true,
                terserOptions: {
                    comments: false,
                    compress: {
                        unused: true,
                        // 删掉 debugger
                        drop_debugger: true, // eslint-disable-line
                        // 移除 console
                        drop_console: true, // eslint-disable-line
                        // 移除无用的代码
                        dead_code: true // eslint-disable-line
                    },
                    ie8: false,
                    safari10: true,
                    warnings: false,
                    toplevel: true
                }
            })
        );

        // keep module.id stable when vendor modules does not change
        webpackConfig.plugin('hash-module-ids').use(require('webpack/lib/HashedModuleIdsPlugin'), [
            {
                hashDigest: 'hex'
            }
        ]);
    });
};