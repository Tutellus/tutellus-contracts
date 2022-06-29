const bre = require("hardhat");
const ethers = bre.ethers;

const TUT_ADDR = "0x930f169A87545a8c6a3e7934d42d1582c03e1b35";
const LP_ADDR = "0xfd5447D667eB6960fA326cfa68b7936f52940cA7";
const IDO_ADDR = "0xB4f3b622C0A9Fa8B2efC2C943C455186D31044d1";
const FACTION_MANAGER = "0x661B5AacAA7E8044108515261C0aAB4f27a3BB4a";
const VUTERINS_FACTION = ethers.utils.id('VUTERINS_FACTION')
const NAKAMOTOS_FACTION = ethers.utils.id('NAKAMOTOS_FACTION')
const ALTCOINERS_FACTION = ethers.utils.id('ALTCOINERS_FACTION')
const STAKE_AMOUNT = ethers.utils.parseEther("5000")
const STAKE_LP_AMOUNT = ethers.utils.parseEther("0.00001")
const PREFUND_AMOUNT = ethers.utils.parseEther("1500")

async function main() {
    bre.run("compile");
    const accounts = await ethers.getSigners()
    const signer = accounts[0]
    const Token = await ethers.getContractFactory("Token");
    const TutellusIDO = await ethers.getContractFactory("TutellusIDO");
    const TutellusFactionManager = await ethers.getContractFactory("TutellusFactionManager");

    const myTUT = Token.attach(
        TUT_ADDR
    );
    const myLP = Token.attach(
        LP_ADDR
    );
    const myManager = TutellusFactionManager.attach(
        FACTION_MANAGER
    );
    const myIDO = TutellusIDO.attach(
        IDO_ADDR
    );

    let response
    let faction = await myManager.faction(NAKAMOTOS_FACTION)
    response = await myTUT.connect(signer).mint(signer.address, STAKE_AMOUNT)
    await response.wait()
    response = await myTUT.connect(signer).approve(FACTION_MANAGER, ethers.constants.MaxUint256)
    await response.wait()
    response = await myManager.connect(signer).stake(NAKAMOTOS_FACTION, signer.address, STAKE_AMOUNT)
    await response.wait()

    response = await myLP.connect(signer).approve(FACTION_MANAGER, ethers.constants.MaxUint256)
    await response.wait()
    response = await myManager.connect(signer).stakeLP(NAKAMOTOS_FACTION, signer.address, STAKE_LP_AMOUNT)
    await response.wait()

    const accepted = await myIDO.getAcceptedTermsAndConditions(signer.address)
    if (!accepted) {
        response = await myIDO.acceptTermsAndConditions()
        await response.wait()
    }
    const prefundTokenAddress = await myIDO.prefundToken()
    const prefundToken = Token.attach(prefundTokenAddress)
    response = await prefundToken.approve(myIDO.address, ethers.constants.MaxUint256)
    await response.wait()
    response = await myIDO.prefund(signer.address, PREFUND_AMOUNT)
    await response.wait()

    console.log("Population finished...")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
