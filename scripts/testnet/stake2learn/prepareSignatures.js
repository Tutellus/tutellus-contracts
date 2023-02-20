const { ethers } = require("hardhat");

const FACTORY_ADDRESS = "0x57352b71edfab37055fd0dfa03549cf80593b27d"
const ID = ethers.utils.id("bootcamp01")
const PRICE = ethers.utils.parseEther("6300")
const APR = "3300"
const DEADLINE = parseInt(Date.now() / 1000) + 8640000

async function main() {
    const signer = await ethers.getSigner()
    const signature = await getSignature(ID, PRICE, APR, DEADLINE, signer, FACTORY_ADDRESS)
    const obj = {
        id: ID,
        price: PRICE.toString(),
        apr: APR,
        deadline: DEADLINE.toString(),
        signer: signer.address,
        signature: signature
    }
    console.log(obj)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })

const getSignature = async (id, price, apr, deadline, signer, factoryAddress) => {
    const domain = {
        name: "TUT_S2L",
        version: "1",
        chainId: "5",
        verifyingContract: factoryAddress
    }

    const types = {
        Deposit: [
            { name: "id", type: "bytes32" },
            { name: "price", type: "uint256" },
            { name: "apr", type: "uint256" },
            { name: "deadline", type: "uint256" }
        ]
    }

    const value = {
        id: id,
        price: price,
        apr: apr,
        deadline: deadline,
    }
    return await signer._signTypedData(domain, types, value)
}