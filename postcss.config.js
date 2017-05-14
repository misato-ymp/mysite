module.exports = {
  plugins: [
    require('postcss-import')({}),
    require('postcss-cssnext')({}),
    require('autoprefixer')({
      browsers: ['IE 9', 'IE 10', 'IE 11', 'last 2 versions']
    }),
  ]
};