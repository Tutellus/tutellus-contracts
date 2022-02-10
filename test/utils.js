const { formatEther, formatUnits } = require("ethers/lib/utils")
const { expect } = require("hardhat")

const etherToNumber = (bn) => {
    return (Number(formatEther(bn.toString())))
}

const unitsToNumber = (bn, units) => {
    return (Number(formatUnits(bn.toString(), units)))
}

const expectEqEth = (bn0, bn1) => {
    expect(
        Number(formatEther(bn0.toString()))
    ).eq(
        Number(formatEther(bn1.toString()))
    )
}

const expectApproxWeiDecimals = (bn0, bn1, decimals) => {
    expect(
        Number(formatEther(bn0.toString()))
    ).approximately(
        Number(formatEther(bn1.toString())),
        10 ** -(18-decimals)
    )
}

module.exports = {
    etherToNumber,
    unitsToNumber,
    expectEqEth,
    expectApproxWeiDecimals
}