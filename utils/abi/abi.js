const concatAbi = (abi1, abi2) => {
  const abi1Map = abi1.reduce((acc, item) => {
    acc[item.name] = item
    return acc
  }, {})
  const abi2Map = abi2.reduce((acc, item) => {
    acc[item.name] = item
    return acc
  }, {})
  const abiMap = { ...abi1Map, ...abi2Map }
  return Object.values(abiMap)
};

const concatMinimalAbi = (abi1, abi2) => {
  return abi1.concat(abi2);
};

module.exports = {
  concatAbi,
  concatMinimalAbi,
};
