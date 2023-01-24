const bre = require("hardhat");
const ethers = bre.ethers;
const { utils, constants, Wallet, provider } = ethers;
const { createTx, sendTx } = require("../../../utils/gnosis");

const ID = utils.id("ALTCOINERS_STAKING");
const CONTRACT_NAME = "TutellusLaunchpadStaking";

const SAFE = "0x5ACB3043da168b59b775eA28F3942597F45e9543"

async function main() {
    const Manager = await ethers.getContractFactory("TutellusManager");
    const myManager = Manager.attach("0x73205567d90A45533879eF39a29920056225eFB2");

    const wallet = new Wallet(process.env.PRIVATE_KEY);

    // const Contract = await ethers.getContractFactory(CONTRACT_NAME);
    // const implementation = await Contract.deploy()
    // await implementation.deployed()
    // console.log("Implementation:", implementation.address)

    const implementationAddress = "0x842Ffb038e85FEEF699E81fe64500dAc357D18Cc"

    const initializeCalldata = "0x"
    const data = {
        to: myManager.address,
        data: myManager.interface.encodeFunctionData("upgrade", [
            ID,
            implementationAddress,
            initializeCalldata,
        ]),
        value: 0,
        operation: 0,
    };

    await provider.getBalance(implementationAddress)
    const chainId = provider._network.chainId;
    const txData = await createTx(provider, chainId, SAFE, data, wallet);
    await sendTx(chainId, SAFE, txData);
    console.log("SafeTxHash:", txData.contractTransactionHash)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
