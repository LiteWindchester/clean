let gulp = require('gulp'),
    circularDependency = require('gulp-circular-dependency'),
    rollup = require('gulp-better-rollup'),
    named = require('vinyl-named'),
    terser = require('gulp-terser'),
    webpack = require('webpack-stream'),
    sass = require('gulp-sass'),
    gutil = require('gulp-util'),
    sourcemaps = require('gulp-sourcemaps'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    cssnano = require('cssnano'),
    babel = require('gulp-babel'),
    rollupBabel = require('rollup-plugin-babel'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    resolve = require('rollup-plugin-node-resolve'),
    commonjs = require('rollup-plugin-commonjs'),
    browserSync = require('browser-sync').create(),
    through = require('through2'),
    rollupPostcss = require('rollup-plugin-postcss'),
    inject = require('@rollup/plugin-inject'),
    paths = {
      sass: ['./src/sass/main.scss'],
      css: './src/css',
      js: [
        // 'node_modules/babel-polyfill/dist/polyfill.js',
        './src/js/main.js'
      ],
      html: './src/wp-content/themes/sante/*.html'
    };
    sass.compiler = require('sass');
    
  // gulp.task('babelifyJS', function() {
  //   return gulp.src(paths.js)
  //     .pipe(sourcemaps.init())
  //     // .pipe(circularDependency())
  //     .pipe(rollup({
  //       plugins: [
  //         rollupBabel({
  //           presets: [['@babel/env', { "useBuiltIns": "usage", "corejs": "3.6" }]],
  //           plugins: ["@babel/plugin-proposal-class-properties"],
  //           sourceMaps: true,
  //           exclude: 'node_modules/**'
  //         }),
  //         resolve(),
  //         commonjs(),
  //         rollupPostcss({
  //           plugins: [
  //             autoprefixer({overrideBrowserslist: ['last 9 version'], grid: "autoplace"}),
  //             cssnano()
  //           ]
  //         }),
  //         inject({
  //           $: 'jquery',
  //           jQuery: 'jquery',
  //           'window.jQuery': 'jquery',
  //           'window.$': 'jquery'
  //         })
  //       ] },
  //       'umd'
  //     ))
  //     // .pipe(terser())
  //     .pipe(rename({ suffix: ".min", extname: '.js' }))
  //     .pipe(sourcemaps.write('./'))
  //     .pipe(gulp.dest('./src/js/'))
  //     .pipe(browserSync.reload({
  //       stream: true
  //     }));
  // });

gulp.task('babelifyJS', function() {
  return gulp.src(paths.js)
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
            moment: 'moment',
            'window.moment': 'moment'
          })
        ]
      }
    }))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(through.obj(function (file, enc, cb) {
      // Dont pipe through any source map files as it will be handled
      // by gulp-sourcemaps
      const isSourceMap = /\.map$/.test(file.path);
      if (!isSourceMap) this.push(file);
      cb();
    }))
    // .pipe(uglify())
    .pipe(rename({ suffix: ".min", extname: '.js' }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./src/js/'))
    .pipe(browserSync.reload({
      stream: true
    }))
});

// Задача для компиляции из SASS в CSS. + автопрефикс + Минификация
gulp.task('minsass', function(){
  var postCssPlugins = [
    autoprefixer({overrideBrowserslist: ['last 9 version'], grid: "autoplace"}),
    cssnano()
  ];
  return gulp.src(paths.sass)
    .pipe(sourcemaps.init()) // говорим, что хотим сурсмапы
    .pipe(sass().on('error', sass.logError)) // превращаем SASS в CSS
    .pipe(postcss(postCssPlugins)) // автопрефикс + минификация
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(paths.css)) // располагаем получившйися файл в папку
    .pipe(browserSync.reload({
      stream: true
    }))
});

// Задача, следящая за изменениями в файле стилей.
gulp.task('watcher', function() { // Если что-то изменилось, запускаем взлом жопы
  // gulp.watch(paths.sass, gulp.series('minsass', 'deployCss')); 
  // gulp.watch(paths.js, gulp.series('babelifyJS', 'deployJs'));

  browserSync.init({
    notify: false,
    watch: true,
    server: {
      baseDir: './src'
    },
    browser: 'chrome'
  });

  gulp.watch(paths.sass, gulp.series('minsass')); 
  gulp.watch(paths.js, gulp.series('babelifyJS'));
  // gulp.watch(paths.html).on('change', browserSync.reload);
});

gulp.task('default', gulp.series('minsass', 'babelifyJS', 'watcher'));
