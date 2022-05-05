const bre = require("hardhat");
const ethers = bre.ethers;

const TUT_ADDR = "0x0E06483c44364596e3112390b1105Bb248bc5BCD";
const FACTION_MANAGER = "0xE65D1fC537a241Cc4BB453DA64E1A69FEa4996d9";
const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const PREFUND_AMOUNTS = [
    ethers.utils.parseEther("1500"),
    ethers.utils.parseEther("1600"),
    ethers.utils.parseEther("1700"),
    ethers.utils.parseEther("1800"),
    ethers.utils.parseEther("1900"),
    ethers.utils.parseEther("2000"),
    ethers.utils.parseEther("200"),
    ethers.utils.parseEther("300"),
    ethers.utils.parseEther("400"),
]

async function main() {
    bre.run("compile");
    const accounts = await ethers.getSigners()
    const TutellusERC20 = await ethers.getContractFactory("TutellusERC20");
    const TutellusFactionManager = await ethers.getContractFactory("TutellusFactionManager");

    const myTUT = TutellusERC20.attach(
        TUT_ADDR
    );
    const myManager = TutellusFactionManager.attach(
        FACTION_MANAGER
    );

    let response
    let faction = await myManager.faction(NAKAMOTOS_STAKING_ID)
    for (let i = 0; i < 3; i++) {
        response = await accounts[0].sendTransaction({
            to: accounts[i].address,
            value: ethers.utils.parseEther('1')
        })
        await response.wait()
        response = await myTUT.connect(accounts[i]).approve(faction.stakingContract, ethers.constants.MaxUint256)
        await response.wait()
        response = await myTUT.connect(accounts[0]).transfer(accounts[i].address, PREFUND_AMOUNTS[i])
        await response.wait()
        response = await myManager.connect(accounts[i]).stake(NAKAMOTOS_STAKING_ID, accounts[i].address, PREFUND_AMOUNTS[i])
        await response.wait()
    }

    faction = await myManager.faction(VUTERINS_STAKING_ID)
    for (let i = 3; i < 6; i++) {
        response = await accounts[0].sendTransaction({
            to: accounts[i].address,
            value: ethers.utils.parseEther('1')
        })
        await response.wait()
        response = await myTUT.connect(accounts[i]).approve(faction.stakingContract, ethers.constants.MaxUint256)
        await response.wait()
        response = await myTUT.connect(accounts[0]).transfer(accounts[i].address, PREFUND_AMOUNTS[i])
        await response.wait()
        response = await myManager.connect(accounts[i]).stake(VUTERINS_STAKING_ID, accounts[i].address, PREFUND_AMOUNTS[i])
        await response.wait()
    }

    faction = await myManager.faction(ALTCOINERS_STAKING_ID)
    for (let i = 6; i < 9; i++) {
        response = await accounts[0].sendTransaction({
            to: accounts[i].address,
            value: ethers.utils.parseEther('1')
        })
        await response.wait()
        response = await myTUT.connect(accounts[i]).approve(faction.stakingContract, ethers.constants.MaxUint256)
        await response.wait()
        response = await myTUT.connect(accounts[0]).transfer(accounts[i].address, PREFUND_AMOUNTS[i])
        await response.wait()
        response = await myManager.connect(accounts[i]).stake(ALTCOINERS_STAKING_ID, accounts[i].address, PREFUND_AMOUNTS[i])
        await response.wait()
    }

    console.log("Population finished...")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
