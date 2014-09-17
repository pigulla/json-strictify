var gulp = require('gulp'),
    jscs = require('gulp-jscs'),
    jshint = require('gulp-jshint'),
    mocha = require('gulp-mocha');

gulp.task('lint', function () {
    return gulp.src(['src/**/*.js', 'test/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jscs());
});

gulp.task('test', function () {
    return gulp.src('test/**/*.js', { read: false })
        .pipe(mocha());
});


gulp.task('default', ['lint', 'test']);
