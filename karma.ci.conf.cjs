module.exports = (config) => {
  config.set({
    browsers: ['ChromeCIHeadless'],
    frameworks: ['jasmine'],
    customLaunchers: {
      ChromeCIHeadless: {
        base: 'ChromeHeadless',
        flags: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'],
      },
    },
  });
};
