const bre = require("hardhat");
const ethers = bre.ethers;

const TUT_ADDR = "0x0975234abB45394582299bB3a8fC50F1903C1ac2";
const LP_ADDR = "0xA8a6972b6B5399A679d0b60F916F74c07B0D5128";
const IDO_ADDR = "0x0Ed164F13F67468f0CCAa4ce46D73ebad0E4F785";
const FACTION_MANAGER = "0x0A107307A227e229143fC4ABfDeed5871A8208E6";
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
