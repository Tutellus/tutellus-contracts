const { formatUnits } = require("ethers/lib/utils");

const fromBN = (bn, decimals = 0) => {
    return Number(formatUnits(bn.toString(), decimals))
};

const fromEther = (bn) => fromBN(bn, 18);

module.exports = {
    fromBN,
    fromEther
} 