"use strict";

const gulp = require("gulp");
const eslint = require("gulp-eslint");
const mocha = require("gulp-mocha");
const babel = require("gulp-babel");

gulp.task("lint", function lintTask() {
  const sources = [
    "*.js",
    "src/*.js",
    "src/middleware/*.js",
    "test/*.js"
  ];
  return gulp.src(sources)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task("test", gulp.series("lint", function testTask() {
  const tests = [
    "test/*.js"
  ];
  const srcOpts = {
    read: false
  };
  return gulp.src(tests, srcOpts)
    .pipe(mocha({
      reporter: "list"
    }));
}));

gulp.task("transpile", function transpileTask() {
  const sources = [
    "src/*.js",
    "src/middleware/*.js"
  ];
  const srcOpts = {
    base: "src"
  };
  return gulp.src(sources, srcOpts)
    .pipe(babel())
    .pipe(gulp.dest("dist"));
});

gulp.task("default", gulp.series("lint", gulp.series("test", gulp.series("transpile"))));
