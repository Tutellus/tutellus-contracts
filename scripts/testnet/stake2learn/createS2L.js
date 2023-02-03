const { ethers } = require("hardhat");

const S2L_ID = ethers.utils.id("S2L_FACTORY")
const MANAGER_ADDR = "0x0e75e4D2041287813a693971634400EAe765910C"
const TOKEN = "0x930f169A87545a8c6a3e7934d42d1582c03e1b35"

const COURSE_ID = ethers.utils.id("bootcamp01")
const PRICE = ethers.utils.parseEther("5100")
const MULTIPLIER = ethers.BigNumber.from("1")
const APR = ethers.BigNumber.from("4000")

async function main() {
    const signers = await ethers.getSigners()
    const signer = signers[0]
    const user = signers[1]
    const myManager = await ethers.getContractAt("TutellusManager", MANAGER_ADDR);
    const myToken = await ethers.getContractAt("TutellusERC20", TOKEN);
    const factoryAddress = await myManager.get(S2L_ID)
    const factory = await ethers.getContractAt("TutellusStake2LearnFactory", factoryAddress)

    const tokenAmount = await factory.convertFiat2Token(PRICE)
    const deposit = tokenAmount.mul(MULTIPLIER)
    const deadline = "5393044017"
    const signature = await getSignature(
        COURSE_ID,
        PRICE,
        APR,
        deadline,
        signer,
        factoryAddress
    )

    console.log("Approving...")
    const approval = await myToken.connect(user).approve(factoryAddress, ethers.constants.MaxUint256)
    await approval.wait()

    console.log("Creating S2L...")
    const response = await factory.connect(user).createS2L(
        COURSE_ID,
        deposit,
        PRICE,
        APR,
        deadline,
        signature,
        signer.address
    )
    const receipt = await response.wait()
    console.log("Created: ", receipt.events[receipt.events.length - 1].args.proxy)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })

const getSignature = async (id, price, apr, deadline, signer, verifyingContract) => {
    const domain = {
        name: "TUT_S2L",
        version: "1",
        chainId: ethers.provider._network.chainId,
        verifyingContract: verifyingContract
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