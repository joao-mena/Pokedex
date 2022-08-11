const { series, parallel, src, dest, watch, lastRun } = require("gulp");
const { sync } = require("glob");
const sass = require("gulp-sass");
const { join, basename } = require("path");
const cleanCSS = require("gulp-clean-css");
const cleanhtml = require("gulp-cleanhtml");
const rename = require("gulp-rename");
const browserSync = require("browser-sync").create();
const babel = require("gulp-babel");
const uglify = require("gulp-uglify");
const sourcemaps = require("gulp-sourcemaps");
require("colors");
sass.compiler = require("node-sass");
const path = join(__dirname, "src");
const fileinclude = require("gulp-file-include");
const concat = require("gulp-concat");
const imagemin = require("gulp-imagemin");
const del = require("del");

const cleanDist = () => del(["dist"]);

const compileSCSS = () =>
  src(sync(join(path, "scss", "**/*.scss")))
    .pipe(sourcemaps.init())
    .pipe(sass().on("error", sass.logError))
    .pipe(sourcemaps.write("."))
    .pipe(dest("dist/css"));

const minifyCSS = () =>
  src(sync(join("dist", "**/!(*.min).css")))
    .pipe(sourcemaps.init())
    .pipe(cleanCSS({ compatibility: "ie8" }))
    .pipe(
      rename(({ dirname, basename }) => ({
        dirname,
        basename: `${basename}.min`,
        extname: ".css",
      })),
    )
    .pipe(sourcemaps.write("."))
    .pipe(dest("dist/css"));

const compileJS = () =>
  src(sync(join(path, "js", "**/*.js")))
    .pipe(sourcemaps.init())
    .pipe(concat("main.js"))
    .pipe(
      babel({
        presets: ["@babel/env"],
      }),
    )
    .pipe(sourcemaps.write("."))
    .pipe(dest("dist/js"));

const minifyJS = () =>
  src(sync(join("dist", "**/*.js")))
    .pipe(concat("main.js"))
    .pipe(uglify())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write("."))
    .pipe(dest("dist/js"));

const pluginJS = () =>
  src([
    "node_modules/jquery/dist/jquery.min.js",
    "node_modules/lazyload/lazyload.min.js",
    "js/plugins/*.js",
  ])
    .pipe(concat("plugins.js"))
    .pipe(dest("dist/js"));

const compileHtml = () =>
  src(sync(join(path, "html", "*.html")))
    .pipe(cleanhtml())
    .pipe(
      fileinclude({
        prefix: "@@",
        basepath: "@file",
      }),
    )
    .on("error", function () {
      notify("HTML include error");
    })
    .pipe(dest("dist"));

const imagesMin = () =>
  src(sync(join(path, "img", "**/*{png, jpg, jpeg}")))
    .pipe(
      imagemin([
        imagemin.gifsicle({ interlaced: true }),
        imagemin.jpegtran({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo({
          plugins: [
            {
              removeViewBox: true,
              collapseGroups: true,
              cleanupIDs: false,
            },
          ],
        }),
      ]),
    )
    .pipe(dest("dist/img"));

const dev = (cb) => {
  browserSync.init({
    server: {
      baseDir: "./dist",
    },
  });
  cb();
};

const realoadBrowser = (cb) => {
  browserSync.reload();
  cb();
};

const watchFiles = (cb) => {
  const jsFiles = sync(join(path, "js", "**/*.js"));
  console.log(`👁️ ${"JavaScript".yellow} files we will watch... 👁️`.bold);
  console.table(jsFiles.map((path) => basename(path)));
  watch(jsFiles, series(compileJS, minifyJS, realoadBrowser));

  const scssFiles = sync(join(path, "scss", "**/*.scss"));
  console.log(`👁️ ${"SCSS".magenta} files we will watch... 👁️`.bold);
  console.table(scssFiles.map((path) => basename(path)));
  watch(scssFiles, series(compileSCSS, minifyCSS, realoadBrowser));

  const htmlFiles = sync(join(path, "html", "**/*.html"));
  console.log(`👁️ ${"HTML".magenta} files we will watch... 👁️`.bold);
  console.table(htmlFiles.map((path) => basename(path)));
  watch(htmlFiles, series(compileHtml, realoadBrowser));

  const imageFiles = sync(join(path, "img", "**/*"));
  console.log(`👁️ ${"IMAGE".magenta} files we will watch... 👁️`.bold);
  console.table(imageFiles.map((path) => basename(path)));
  watch(imageFiles, series(imagesMin, realoadBrowser));
  cb();
};

exports.default = series(
  cleanDist,
  pluginJS,
  parallel(compileJS, imagesMin, compileSCSS),
  parallel(minifyCSS, minifyJS),
  compileHtml,
  watchFiles,
  dev,
);

exports.build = series(
  cleanDist,
  compileHtml,
  compileSCSS,
  compileJS,
  minifyCSS,
  minifyJS,
  imagesMin,
);
