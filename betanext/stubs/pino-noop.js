module.exports = function noop() {
  return noop;
};

module.exports.write = () => {};
module.exports.flushSync = () => {};
module.exports.end = () => {};

