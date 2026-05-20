const gulp = require("gulp");
const exec = require("gulp-execa");
const { deleteAsync } = require("del");

gulp.task("clean", function () {
  return deleteAsync([
    "build/**",
    "definitions/**",
  ], {
    force: true
  });
});

gulp.task("ts",
  gulp.series(
    "clean",
    exec.task("tsc -p src")
  ));

gulp.task("spell", exec.task("cspell --no-progress"));

gulp.task("type-coverage", exec.task("type-coverage --detail"));

gulp.task("lint", exec.task("eslint src"));

gulp.task("test", exec.task("tsx --test --test-concurrency=1 --test-reporter=spec src/test/*.ts"));

gulp.task("build", gulp.series("ts"));

gulp.task("default", gulp.series("type-coverage", "spell", "ts", "lint", "test"));
