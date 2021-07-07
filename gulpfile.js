let { task, series, src, dest, watch, parallel } = require('gulp'),
    nunjucks = require('gulp-nunjucks'),
    ftp = require( 'vinyl-ftp' ),
    gutil = require( 'gulp-util' ),
    uglify = require('gulp-uglify-es').default,
    named = require('vinyl-named'),
    webpack = require('webpack-stream'),
    sass = require('gulp-dart-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    cleanCSS = require('gulp-clean-css'),
    rename = require('gulp-rename'),
    browserSync = require('browser-sync').create(),
    through = require('through2'),
    paths = {
      sass: ['./src/sass/**/*.{scss,sass,css}'],
      css: './src/css',
      cssFiles: ['./src/css/**/*.css'],
      js: [
        // 'node_modules/babel-polyfill/dist/polyfill.js',
        './src/js/main.js'
      ],
      njk: './src/templates/*.njk'
    };
    sass.compiler = require('sass');

const { ftpConfig, ftpDir } = require('./config.js')

function babelifyJS (done) {
  src(paths.js)
    .pipe(named())
    .pipe(webpack({
      config: {
        mode: 'development',
        devtool: 'source-map',
        module: {
          rules: [
            {
              test: /\.js$/,
              exclude: /node_modules/,
              loader: {
                loader: "babel-loader",
                options: {
                  presets: [['@babel/env', { "useBuiltIns": "usage", "corejs": "3.6" }]],
                  plugins: ["@babel/plugin-proposal-class-properties"]
                }
              },
            },
            {
              test: /\.(css|sass|scss)$/,
              use: ["style-loader", "css-loader", "sass-loader"],
            }
          ]
        },
        plugins: [
          new webpack.webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
            'window.$': 'jquery',
          //   moment: 'moment',
          //   'window.moment': 'moment'
          })
        ]
      }
    }))
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(through.obj(function(file, enc, cb) {
      // Dont pipe through any source map files as it will be handled
      // by gulp-sourcemaps
      const isSourceMap = /\.map$/.test(file.path)
      if (!isSourceMap) this.push(file)
      cb()
    }))
    .pipe(uglify())
    .pipe(rename({ suffix: ".min", extname: '.js' }))
    .pipe(sourcemaps.write('./'))
    .pipe(dest('./src/js/'))
    .pipe(browserSync.reload({
      stream: true
    }))
  done()
}
task('babelifyJS', babelifyJS)

// SASS/SCSS -> CSS. + autoprefixer + minification
function compileSass(done) {
  let postCssPlugins = [
    autoprefixer({overrideBrowserslist: ['last 9 version']}),
  ];
  src(paths.sass)
      .pipe(sourcemaps.init()) // enable sourcemaps
      .pipe(sass().on('error', sass.logError)) // SASS/SCSS -> CSS
      .pipe(postcss(postCssPlugins)) // autoprefixer + minification
      .pipe(sourcemaps.write('./'))
      .pipe(dest(paths.css)) // put the result file in the css folder

      .pipe(cleanCSS())
      .pipe(rename({ basename: 'main', suffix: ".min", extname: '.css' }))
      .pipe(dest(paths.css)) // put the minified file in the css folder

      .pipe(browserSync.reload({
        stream: true
      }))
  done()
}
task('compileSass', compileSass)

// Nunjucks -> HTML
function nunjucksCompile(done) {
  src(paths.njk)
      // .pipe(nunjucksRender({
      //   // path: ['src/templates/'] // String or Array
      // }))
      .pipe(nunjucks.compile())
      .pipe(dest('src'))
      .pipe(browserSync.reload({
        stream: true
      }))
  done()
}
task('nunjucksCompile', nunjucksCompile)

function upload(done) {
  const connection = ftp.create({
    ...ftpConfig,
    parallel: 10,
    log:      gutil.log
  })

  const globs = [
    'src/**',
  ]

  src(globs).pipe(connection.dest(ftpDir))
  done()
}
task('upload', upload)

// Watch file changes
function watcher() {
  // watch(paths.sass, series('minsass', 'deployCss'));
  // watch(paths.js, series('babelifyJS', 'deployJs'));

  browserSync.init({
    notify: false,
    watch: true,
    server: {
      baseDir: './src'
    },
    open: false
  });

  watch(paths.sass, series('compileSass'));
  watch(paths.js, series('babelifyJS'));
  watch(['./src/templates/**/*.njk'], series('nunjucksCompile'));
  // watch(paths.html).on('change', browserSync.reload);
}
task('watcher', watcher)

exports.dev = series(parallel('compileSass', 'babelifyJS', 'nunjucksCompile'), 'watcher')
exports.prod = parallel('compileSass', 'babelifyJS', 'nunjucksCompile')
exports.deploy = series(parallel('compileSass', 'babelifyJS', 'nunjucksCompile'), upload)
