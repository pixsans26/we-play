module.exports = {
  View: () => null,
  Text: () => null,
  Pressable: () => null,
  Animated: {
    Value: class { setValue() {} },
    timing: () => ({ start: () => {} }),
    spring: () => ({ start: () => {} }),
    loop: () => ({ start: () => {}, stop: () => {} }),
    sequence: () => ({ start: () => {} }),
    View: () => null,
    Text: () => null,
  },
};
