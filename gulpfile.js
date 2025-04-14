const gulp = require("gulp");
const exec = require("gulp-execa");
const { deleteAsync } = require("del");

gulp.task("clean", function() {
  return deleteAsync(["build/**", "!build",], {
    force: true
  });
});

gulp.task("ts",
  gulp.series(
    "clean",
    exec.task("tsc -p src")
  ));

gulp.task("lint", exec.task("eslint src"));

gulp.task("test", exec.task("mocha -r ts-node/register --reporter list --extension js,ts --recursive build/test"));

gulp.task("build", gulp.series("ts"));

gulp.task("default", gulp.series("ts", "lint", "test"));
