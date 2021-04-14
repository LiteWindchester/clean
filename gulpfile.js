let gulp = require('gulp'),
    named = require('vinyl-named'),
    webpack = require('webpack-stream'),
    sass = require('gulp-dart-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    cssnano = require('cssnano'),
    rename = require('gulp-rename'),
    browserSync = require('browser-sync').create(),
    through = require('through2'),
    paths = {
      sass: ['./src/sass/**/*.{scss,sass,css}'],
      css: './src/css',
      js: [
        // 'node_modules/babel-polyfill/dist/polyfill.js',
        './src/js/main.js'
      ],
      html: './src/*.html'
    };
    sass.compiler = require('sass');

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

// SASS/SCSS -> CSS. + autoprefixer + minification
gulp.task('minsass', function(){
  var postCssPlugins = [
    autoprefixer({overrideBrowserslist: ['last 9 version'], grid: "autoplace"}),
    // cssnano()
  ];
  return gulp.src(paths.sass)
    .pipe(sourcemaps.init()) // enable sourcemaps
    .pipe(sass().on('error', sass.logError)) // SASS/SCSS -> CSS
    .pipe(postcss(postCssPlugins)) // autoprefixer + minification
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(paths.css)) // put the result file in the css folder
    .pipe(browserSync.reload({
      stream: true
    }))
});

// Watch file changes
gulp.task('watcher', function() {
  // gulp.watch(paths.sass, gulp.series('minsass', 'deployCss')); 
  // gulp.watch(paths.js, gulp.series('babelifyJS', 'deployJs'));

  browserSync.init({
    notify: false,
    watch: true,
    server: {
      baseDir: './src'
    },
    browser: false
  });

  gulp.watch(paths.sass, gulp.series('minsass')); 
  gulp.watch(paths.js, gulp.series('babelifyJS'));
  // gulp.watch(paths.html).on('change', browserSync.reload);
});

gulp.task('default', gulp.series('minsass', 'babelifyJS', 'watcher'));
