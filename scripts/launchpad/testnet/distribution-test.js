const bre = require("hardhat");
const ethers = bre.ethers;

const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const VUTERINS_FACTION = ethers.utils.id('VUTERINS_FACTION')
const NAKAMOTOS_FACTION = ethers.utils.id('NAKAMOTOS_FACTION')
const ALTCOINERS_FACTION = ethers.utils.id('ALTCOINERS_FACTION')
const IDO_USDT = ethers.utils.id("IDO_USDT");
const ENERGY_AUX_ID = ethers.utils.id('ENERGY_AUX')
const ENERGY_ID = ethers.utils.id('ENERGY')
const FACTION_MANAGER = ethers.utils.id('FACTION_MANAGER')
const FACTION_MANAGER_ROLE = ethers.utils.id('FACTION_MANAGER_ROLE')
const FACTIONS_ADMIN_ROLE = ethers.utils.id('FACTIONS_ADMIN_ROLE')
const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const LAUNCHPAD_IDO_FACTORY = ethers.utils.id("LAUNCHPAD_IDO_FACTORY");
const LAUNCHPAD_REWARDS_ID = ethers.utils.id('LAUNCHPAD_REWARDS')

const FACTIONS = [
    NAKAMOTOS_FACTION,
    VUTERINS_FACTION,
    ALTCOINERS_FACTION
]

const MNEMONICS = [
    'broom text recall ahead cover sniff wolf provide expire wire hover keep', //sokar
    'express eyebrow type fluid light that phone choose search solve lazy fringe', //mcaballero
    'vehicle entry throw calm pistol menu acquire tray car reform hamster process', //victor
    'shell people change apology speak poverty moment first recycle board excuse abstract', //chema
    'input fire discover wild desk wrestle repair sand same begin actress truly', //dani
    'arrive alarm reopen fancy large hedgehog wine ceiling sail want buzz outside', //jordi
    'already wide brown churn dentist accuse spice bean wild bar scrap iron' //guille
]

const PATHS = [
    "m/44'/60'/0'/0/0",
    "m/44'/60'/0'/0/1",
    "m/44'/60'/0'/0/2"
]

const MIN_ETH_AMOUNT = ethers.utils.parseEther('0.01')
const MIN_TUT_AMOUNT = ethers.utils.parseEther('50000')
const MIN_USDT_AMOUNT = ethers.utils.parseEther('50000')

const STAKING_AMOUNTS = [
    [ethers.utils.parseEther("2001"), //mnemonic1-path0
    ethers.utils.parseEther("1601"), //mnemonic1-path1
    ethers.utils.parseEther("701")], //mnemonic1-path2
    [ethers.utils.parseEther("702"), //mnemonic2-path0
    ethers.utils.parseEther("2002"), //mnemonic2-path1
    ethers.utils.parseEther("1602")], //mnemonic2-path2
    [ethers.utils.parseEther("1603"), //mnemonic3-path0
    ethers.utils.parseEther("703"), //mnemonic3-path1
    ethers.utils.parseEther("2003")], //mnemonic3-path2
    [ethers.utils.parseEther("2004"), //mnemonic4-path0
    ethers.utils.parseEther("1604"), //mnemonic4-path1
    ethers.utils.parseEther("704")], //mnemonic4-path2
    [ethers.utils.parseEther("705"), //mnemonic5-path0
    ethers.utils.parseEther("2005"), //mnemonic5-path1
    ethers.utils.parseEther("1605")], //mnemonic5-path2
    [ethers.utils.parseEther("1606"), //mnemonic6-path0
    ethers.utils.parseEther("706"), //mnemonic6-path1
    ethers.utils.parseEther("2006")], //mnemonic6-path2
    [ethers.utils.parseEther("2007"), //mnemonic7-path0
    ethers.utils.parseEther("1607"), //mnemonic7-path1
    ethers.utils.parseEther("707")] //mnemonic7-path2
]

const PREFUND_AMOUNTS = [
    [ethers.utils.parseEther("4501"), //mnemonic1-path0
    ethers.utils.parseEther("11001"), //mnemonic1-path1
    ethers.utils.parseEther("8001")], //mnemonic1-path2
    [ethers.utils.parseEther("6502"), //mnemonic2-path0
    ethers.utils.parseEther("12002"), //mnemonic2-path1
    ethers.utils.parseEther("3002")], //mnemonic2-path2
    [ethers.utils.parseEther("3003"), //mnemonic3-path0
    ethers.utils.parseEther("4003"), //mnemonic3-path1
    ethers.utils.parseEther("3403")], //mnemonic3-path2
    [ethers.utils.parseEther("4004"), //mnemonic4-path0
    ethers.utils.parseEther("5004"), //mnemonic4-path1
    ethers.utils.parseEther("6004")], //mnemonic4-path2
    [ethers.utils.parseEther("7005"), //mnemonic5-path0
    ethers.utils.parseEther("3005"), //mnemonic5-path1
    ethers.utils.parseEther("4005")], //mnemonic5-path2
    [ethers.utils.parseEther("11006"), //mnemonic6-path0
    ethers.utils.parseEther("10006"), //mnemonic6-path1
    ethers.utils.parseEther("10006")], //mnemonic6-path2
    [ethers.utils.parseEther("4007"), //mnemonic7-path0
    ethers.utils.parseEther("5007"), //mnemonic7-path1
    ethers.utils.parseEther("3007")] //mnemonic7-path2
]

async function main() {
    bre.run("compile");
    const accounts = await ethers.getSigners()

    // Deploy stuff
    const TutellusManager = await ethers.getContractFactory("TutellusManager");
    const TutellusERC20 = await ethers.getContractFactory("TutellusERC20");
    const TutellusEnergy = await ethers.getContractFactory("TutellusEnergy");
    const LaunchpadStaking = await ethers.getContractFactory('TutellusLaunchpadStaking')
    const FactionManager = await ethers.getContractFactory('TutellusFactionManager')

    const myManager = await TutellusManager.deploy()
    await myManager.deployed()
    const resp1 = await myManager.initialize()
    await resp1.wait()
    console.log("Manager: ", myManager.address)
    const myTUT = await TutellusERC20.deploy("Tutellus token", "TUT", ethers.utils.parseEther('200000000'), myManager.address)
    await myTUT.deployed()
    const resp2 = await myManager.grantRole(MINTER_ROLE, accounts[0].address)
    await resp2.wait()
    const resp3 = await myTUT.mint(accounts[0].address, ethers.utils.parseEther('100000000'))
    await resp3.wait()
    console.log("TUT: ", myTUT.address)
    const initializeCalldata = FactionManager.interface.encodeFunctionData('initialize', [])
    const resp4 = await myManager.deploy(ENERGY_AUX_ID, TutellusEnergy.bytecode, initializeCalldata)
    await resp4.wait()
    const energyAddr = await myManager.get(ENERGY_AUX_ID)
    console.log("eTUT: ", energyAddr)
    const resp5 = await myManager.setId(ENERGY_AUX_ID, ethers.constants.AddressZero)
    const resp6 = await myManager.setId(ENERGY_ID, energyAddr)
    await resp5.wait()
    await resp6.wait()

    const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
    const resp30 = await myManager.deploy(LAUNCHPAD_REWARDS_ID, RewardsVaultV2.bytecode, initializeCalldata)
    await resp30.wait()
    const rewardsAddr = await myManager.get(LAUNCHPAD_REWARDS_ID)
    await myTUT.mint(rewardsAddr, ethers.utils.parseEther('50000'))

    console.log('Deploying Launchpad Staking Implementation...')
    const myLaunchpadStakingImp = await LaunchpadStaking.deploy()
    console.log('Deploying Faction Manager Implementation...')
    const myFactionManagerImp = await FactionManager.deploy()
    await myFactionManagerImp.deployed()

    console.log('Extracting addresses...')
    const launchpadStakingImp = myLaunchpadStakingImp.address
    const factionManagerImp = myFactionManagerImp.address

    console.log('Creating initialization calldata...')
    const initializeCalldataStaking = LaunchpadStaking.interface.encodeFunctionData('initialize', [myTUT.address])

    console.log('Deploying Faction Manager Proxy with Implementation...')
    const resp7 = await myManager.deployProxyWithImplementation(FACTION_MANAGER, factionManagerImp, initializeCalldata)

    console.log('Deploying Nakamotos Proxies with Implementation...')
    // NAKAMOTOS
    const resp8 = await myManager.deployProxyWithImplementation(NAKAMOTOS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)

    console.log('Deploying Vuterins Proxies with Implementation...')
    // VUTERINS
    const resp9 = await myManager.deployProxyWithImplementation(VUTERINS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)

    console.log('Deploying Altcoiners Proxies with Implementation...')
    // ALTCOINERS
    const resp10 = await myManager.deployProxyWithImplementation(ALTCOINERS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)

    await Promise.all([
        resp7.wait(),
        resp8.wait(),
        resp9.wait(),
        resp10.wait()
    ])

    console.log('Proxies deployment completed...')

    const contracts = await Promise.all([
        myManager.get(FACTION_MANAGER),
        myManager.get(NAKAMOTOS_STAKING_ID),
        myManager.get(VUTERINS_STAKING_ID),
        myManager.get(ALTCOINERS_STAKING_ID),
    ])

    console.log('Deploying Nakamotos Proxies with Implementation...')

    const [factionManager, nakamotosStaking, vuterinsStaking, altcoinersStaking] = contracts

    console.log(
        'FactionManager:', factionManager,
        '\nNakamotosStaking:', nakamotosStaking,
        '\nVuterinsStaking:', vuterinsStaking,
        '\nAltcoinersStaking:', altcoinersStaking,
    )

    const myFactionManager = FactionManager.attach(factionManager)

    console.log('Granting energy minter roles...')

    const resp11 = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
    const resp12 = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
    const resp13 = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersStaking)

    console.log('Granting faction manager role...')
    const resp14 = await myManager.grantRole(FACTION_MANAGER_ROLE, factionManager)

    console.log('Granting faction admin role...')
    const resp15 = await myManager.grantRole(FACTIONS_ADMIN_ROLE, accounts[0].address)

    await Promise.all([
        resp11.wait(),
        resp12.wait(),
        resp13.wait(),
        resp14.wait(),
        resp15.wait(),
    ])

    console.log('Roles granted.')
    console.log('Updating factions...')
    const resp16 = await myFactionManager.updateFaction(NAKAMOTOS_FACTION, nakamotosStaking, ethers.constants.AddressZero)
    const resp17 = await myFactionManager.updateFaction(VUTERINS_FACTION, vuterinsStaking, ethers.constants.AddressZero)
    const resp18 = await myFactionManager.updateFaction(ALTCOINERS_FACTION, altcoinersStaking, ethers.constants.AddressZero)

    await Promise.all([
        resp16.wait(),
        resp17.wait(),
        resp18.wait(),
    ])

    console.log('Factions updated...')

    const TutellusIDO = await ethers.getContractFactory("TutellusIDO");
    const Token = await ethers.getContractFactory("Token");

    const myUsdt = await Token.deploy("Tutellus IDO USDT", "TUT-USDT")
    await myUsdt.deployed()
    await myUsdt.mint(accounts[0].address, ethers.utils.parseEther('10000000'))
    const myIdoToken = await Token.deploy("Tutellus IDO 1", "IDO1")
    await myIdoToken.deployed()

    const resp19 = await myManager.setId(
        IDO_USDT,
        myUsdt.address
    );
    await resp19.wait()

    const TutellusIDOFactory = await ethers.getContractFactory(
        "TutellusIDOFactory"
    );
    const resp20 = await myManager.deploy(
        LAUNCHPAD_IDO_FACTORY,
        TutellusIDOFactory.bytecode,
        initializeCalldata
    );

    await resp20.wait()

    const idoFactoryAddr = await myManager.get(LAUNCHPAD_IDO_FACTORY);
    const myIdoFactory = TutellusIDOFactory.attach(idoFactoryAddr);
    console.log("IDOFactory: ", idoFactoryAddr)
    const FUNDING_AMOUNT = ethers.utils.parseEther("100000");
    const MIN_PREFUND = ethers.utils.parseEther("1000");
    const idoInitializeCalldata = TutellusIDO.interface.encodeFunctionData(
        "initialize",
        [myManager.address, FUNDING_AMOUNT, MIN_PREFUND, myIdoToken.address, myUsdt.address]
    );
    const resp21 = await myIdoFactory.createProxy(idoInitializeCalldata);
    const receipt = await resp21.wait()
    const myIdo = TutellusIDO.attach(receipt.events[1].args.proxy)

    console.log(
        "IDO: ",
        receipt.events[1].args.proxy
    );

    for (let i = 0; i < MNEMONICS.length; i++) {
        for (let j = 0; j < PATHS.length; j++) {
            const wallet = ethers.Wallet.fromMnemonic(MNEMONICS[i], PATHS[j]).connect(ethers.provider)

            // ETH balance
            const ethBalance = await ethers.provider.getBalance(wallet.address)
            if (ethBalance.lt(MIN_ETH_AMOUNT)) {
                const resp22 = await accounts[0].sendTransaction({
                    to: wallet.address,
                    value: MIN_ETH_AMOUNT.sub(ethBalance)
                })
                await resp22.wait()
            }

            // const myTUT = await ethers.getContractAt('TutellusERC20', '0x63C642064e4cf93614b1549BA277986acCe5210e')
            // const myFactionManager = await ethers.getContractAt('TutellusFactionManager', '0x8713e5e61310b1917da556c45DA7534B8B9028d4')
            // TUT balance
            const tutBalance = await myTUT.balanceOf(wallet.address)
            if (tutBalance.lt(STAKING_AMOUNTS[i][j].mul(ethers.BigNumber.from('2')))) {
                const resp23 = await myTUT.transfer(wallet.address, STAKING_AMOUNTS[i][j].mul(ethers.BigNumber.from('2')))
                await resp23.wait()
            }

            // Staking

            const walletFaction = await myFactionManager.factionOf(wallet.address)
            const faction = await myFactionManager.faction(FACTIONS[j])

            if ((walletFaction == ethers.constants.HashZero) || (walletFaction == FACTIONS[j])) {
                const resp24 = await myTUT.connect(wallet).approve(faction.stakingContract, ethers.constants.MaxUint256)
                await resp24.wait()
                const resp26 = await myFactionManager.connect(wallet).stake(FACTIONS[j], wallet.address, STAKING_AMOUNTS[i][j])
                await resp26.wait()
            }

            // Prefund IDO
            // const myManager = await ethers.getContractAt('TutellusManager', '0x12d4Ba2CBE39d0237d57612599992d9Ab05CaD8c')
            // const usdtAddress = await myManager.get(IDO_USDT)
            // const myUsdt = await ethers.getContractAt('Token', usdtAddress)
            // const myIdo = await ethers.getContractAt('TutellusIDO', '0x4A57165b6Fc8D2fdaC74dE5EDC7CF55dbf174d8b')
            const usdtBalance = await myUsdt.balanceOf(wallet.address)
            const prefunded = await myIdo.getPrefunded(wallet.address)
            if (usdtBalance.lt(PREFUND_AMOUNTS[i][j].sub(prefunded).sub(usdtBalance))) {
                const resp27 = await myUsdt.connect(wallet).approve(myIdo.address, ethers.constants.MaxUint256)
                await resp27.wait()
                const resp28 = await myUsdt.transfer(wallet.address, PREFUND_AMOUNTS[i][j].sub(prefunded).sub(usdtBalance))
                await resp28.wait()
            }

            if (prefunded.lt(PREFUND_AMOUNTS[i][j])) {
                const resp29 = await myIdo.connect(wallet).prefund(PREFUND_AMOUNTS[i][j].sub(prefunded))
                await resp29.wait()
            }
        }

        console.log("Iteration ", i)
    }

    console.log("Population finished...")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
