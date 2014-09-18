var coveralls = require('gulp-coveralls'),
    gulp = require('gulp'),
    istanbul = require('gulp-istanbul'),
    jscs = require('gulp-jscs'),
    jshint = require('gulp-jshint'),
    mocha = require('gulp-mocha');

gulp.task('lint', function () {
    return gulp.src(['src/**/*.js', 'test/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'))
        .pipe(jscs());
});

gulp.task('test', function (cb) {
    gulp.src('src/**/*.js')
        .pipe(istanbul())
        .on('finish', function () {
            gulp.src('test/**/*.js')
                .pipe(mocha({ reporter: 'dot' }))
                .pipe(istanbul.writeReports())
                .on('end', cb);
        });
});

gulp.task('coveralls', function () {
    gulp.src('coverage/lcov.info')
        .pipe(coveralls());
});


gulp.task('default', ['lint', 'test']);
