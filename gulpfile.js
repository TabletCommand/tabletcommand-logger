const gulp = require("gulp");
const shell = require("gulp-shell");
const mocha = require("gulp-mocha");
const del = require("del");
const copy = require("gulp-copy");

gulp.task("clean", function() {
  return del("build/**", {
    force: true
  });
});

gulp.task("copy", function() {
  return gulp
    .src("src/views/*")
    .pipe(copy("build"));
});

gulp.task("ts",
  gulp.series(
    "clean",
    gulp.parallel(shell.task("tsc -p ./src"), "copy")
  ));

gulp.task("tslint", gulp.series(shell.task("eslint ./src")));
gulp.task("lint", gulp.series("tslint"));

gulp.task("test", gulp.series(gulp.parallel("tslint", "ts"), function runTests() {
  const tests = [
    "build/test/**/*.js"
  ];
  const srcOpts = {
    read: false
  };
  return gulp.src(tests, srcOpts)
    .pipe(mocha({
      reporter: "list"
    }));
}));

gulp.task("build", gulp.series("ts"));

gulp.task("watch", gulp.series("clean", shell.task("tsc -p ./src --watch")));

gulp.task("default", gulp.series("test"));
