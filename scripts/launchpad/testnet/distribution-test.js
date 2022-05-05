const bre = require("hardhat");
const ethers = bre.ethers;

const NAKAMOTOS_STAKING_ID = ethers.utils.id('NAKAMOTOS_STAKING')
const VUTERINS_STAKING_ID = ethers.utils.id('VUTERINS_STAKING')
const ALTCOINERS_STAKING_ID = ethers.utils.id('ALTCOINERS_STAKING')
const NAKAMOTOS_FARMING_ID = ethers.utils.id('NAKAMOTOS_FARMING')
const VUTERINS_FARMING_ID = ethers.utils.id('VUTERINS_FARMING')
const ALTCOINERS_FARMING_ID = ethers.utils.id('ALTCOINERS_FARMING')
const VUTERINS_FACTION = ethers.utils.id('VUTERINS_FACTION')
const NAKAMOTOS_FACTION = ethers.utils.id('NAKAMOTOS_FACTION')
const ALTCOINERS_FACTION = ethers.utils.id('ALTCOINERS_FACTION')
const IDO_USDT = ethers.utils.id("IDO_USDT");
const ENERGY_AUX_ID = ethers.utils.id('ENERGY_AUX')
const ENERGY_ID = ethers.utils.id('ENERGY')
const ERC20_ID = ethers.utils.id('ERC20')
const FACTION_MANAGER = ethers.utils.id('FACTION_MANAGER')
const FACTION_MANAGER_ROLE = ethers.utils.id('FACTION_MANAGER_ROLE')
const FACTIONS_ADMIN_ROLE = ethers.utils.id('FACTIONS_ADMIN_ROLE')
const ENERGY_MINTER_ROLE = ethers.utils.id('ENERGY_MINTER_ROLE')
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const LAUNCHPAD_IDO_FACTORY = ethers.utils.id("LAUNCHPAD_IDO_FACTORY");
const LAUNCHPAD_REWARDS_ID = ethers.utils.id('LAUNCHPAD_REWARDS')
const NFT_ID = ethers.utils.id('721');
const ADMIN_721_ROLE = ethers.utils.id('ADMIN_721_ROLE')
const AUTH_NFT_SIGNER = ethers.utils.id('AUTH_NFT_SIGNER')

const EVENT1 = ethers.utils.id('ido1')
const myPOAP = {
    id: ethers.utils.id('perpetual'),
    eventId: EVENT1,
    energy: ethers.utils.parseEther('1000'),
    perpetual: true,
    uri: 'uri/perpetual'
}
const myPOAP2 = {
    id: ethers.utils.id('non-perpetual'),
    eventId: EVENT1,
    energy: ethers.utils.parseEther('2000'),
    perpetual: false,
    uri: 'uri/non-perpetual'
}

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

const FARMING_AMOUNTS = [
    [ethers.utils.parseEther("0.2001"), //mnemonic1-path0
    ethers.utils.parseEther("0.1601"), //mnemonic1-path1
    ethers.utils.parseEther("0.701")], //mnemonic1-path2
    [ethers.utils.parseEther("0.702"), //mnemonic2-path0
    ethers.utils.parseEther("0.2002"), //mnemonic2-path1
    ethers.utils.parseEther("0.1602")], //mnemonic2-path2
    [ethers.utils.parseEther("0.1603"), //mnemonic3-path0
    ethers.utils.parseEther("0.703"), //mnemonic3-path1
    ethers.utils.parseEther("0.2003")], //mnemonic3-path2
    [ethers.utils.parseEther("0.2004"), //mnemonic4-path0
    ethers.utils.parseEther("0.1604"), //mnemonic4-path1
    ethers.utils.parseEther("0.704")], //mnemonic4-path2
    [ethers.utils.parseEther("0.705"), //mnemonic5-path0
    ethers.utils.parseEther("0.2005"), //mnemonic5-path1
    ethers.utils.parseEther("0.1605")], //mnemonic5-path2
    [ethers.utils.parseEther("0.1606"), //mnemonic6-path0
    ethers.utils.parseEther("0.706"), //mnemonic6-path1
    ethers.utils.parseEther("0.2006")], //mnemonic6-path2
    [ethers.utils.parseEther("0.2007"), //mnemonic7-path0
    ethers.utils.parseEther("0.1607"), //mnemonic7-path1
    ethers.utils.parseEther("0.707")] //mnemonic7-path2
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
    const Token = await ethers.getContractFactory("Token");

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
    const energyImp = await TutellusEnergy.deploy()
    await energyImp.deployed()
    const resp4 = await myManager.deployProxyWithImplementation(ENERGY_AUX_ID, energyImp.address, initializeCalldata)
    await resp4.wait()
    const energyAddr = await myManager.get(ENERGY_AUX_ID)
    console.log("eTUT: ", energyAddr)
    const resp5 = await myManager.setId(ENERGY_AUX_ID, ethers.constants.AddressZero)
    const resp6 = await myManager.setId(ENERGY_ID, energyAddr)
    const resp60 = await myManager.setId(ERC20_ID, myTUT.address)
    await resp5.wait()
    await resp6.wait()
    await resp60.wait()

    const myLP = await Token.deploy("Tutellus LP", "TUT-WBTC LP")
    await myLP.deployed()
    await myLP.mint(accounts[0].address, ethers.utils.parseEther('10000000'))

    console.log(
        "LP: ",
        myLP.address
    );

    const RewardsVaultV2 = await ethers.getContractFactory('TutellusRewardsVaultV2')
    const resp30 = await myManager.deploy(LAUNCHPAD_REWARDS_ID, RewardsVaultV2.bytecode, initializeCalldata)
    await resp30.wait()
    const rewardsAddr = await myManager.get(LAUNCHPAD_REWARDS_ID)
    await myTUT.mint(rewardsAddr, ethers.utils.parseEther('50000'))

    console.log(
        "RewardsVaultV2: ",
        rewardsAddr
    );

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
    const initializeCalldataFarming = LaunchpadStaking.interface.encodeFunctionData('initialize', [myLP.address])

    console.log('Deploying Faction Manager Proxy with Implementation...')
    const resp7 = await myManager.deployProxyWithImplementation(FACTION_MANAGER, factionManagerImp, initializeCalldata)

    console.log('Deploying Nakamotos Proxies with Implementation...')
    // NAKAMOTOS
    const resp8 = await myManager.deployProxyWithImplementation(NAKAMOTOS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
    const resp8b = await myManager.deployProxyWithImplementation(NAKAMOTOS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

    console.log('Deploying Vuterins Proxies with Implementation...')
    // VUTERINS
    const resp9 = await myManager.deployProxyWithImplementation(VUTERINS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
    const resp9b = await myManager.deployProxyWithImplementation(VUTERINS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

    console.log('Deploying Altcoiners Proxies with Implementation...')
    // ALTCOINERS
    const resp10 = await myManager.deployProxyWithImplementation(ALTCOINERS_STAKING_ID, launchpadStakingImp, initializeCalldataStaking)
    const resp10b = await myManager.deployProxyWithImplementation(ALTCOINERS_FARMING_ID, launchpadStakingImp, initializeCalldataFarming)

    await Promise.all([
        resp7.wait(),
        resp8.wait(),
        resp9.wait(),
        resp10.wait(),
        resp8b.wait(),
        resp9b.wait(),
        resp10b.wait()
    ])

    console.log('Proxies deployment completed...')

    const contracts = await Promise.all([
        myManager.get(FACTION_MANAGER),
        myManager.get(NAKAMOTOS_STAKING_ID),
        myManager.get(VUTERINS_STAKING_ID),
        myManager.get(ALTCOINERS_STAKING_ID),
        myManager.get(NAKAMOTOS_FARMING_ID),
        myManager.get(VUTERINS_FARMING_ID),
        myManager.get(ALTCOINERS_FARMING_ID),
    ])

    console.log('Deploying Nakamotos Proxies with Implementation...')

    const [factionManager, nakamotosStaking, vuterinsStaking, altcoinersStaking, nakamotosFarming, vuterinsFarming, altcoinersFarming] = contracts

    console.log(
        'FactionManager:', factionManager,
        '\nNakamotosStaking:', nakamotosStaking,
        '\nVuterinsStaking:', vuterinsStaking,
        '\nAltcoinersStaking:', altcoinersStaking,
        '\nNakamotosFarming:', nakamotosFarming,
        '\nVuterinsFarming:', vuterinsFarming,
        '\nAltcoinersFarming:', altcoinersFarming,
    )

    const myFactionManager = FactionManager.attach(factionManager)

    console.log('Granting energy minter roles...')

    const resp11 = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosStaking)
    const resp12 = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsStaking)
    const resp13 = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersStaking)
    const resp110 = await myManager.grantRole(ENERGY_MINTER_ROLE, nakamotosFarming)
    const resp120 = await myManager.grantRole(ENERGY_MINTER_ROLE, vuterinsFarming)
    const resp130 = await myManager.grantRole(ENERGY_MINTER_ROLE, altcoinersFarming)

    console.log('Granting faction manager role...')
    const resp14 = await myManager.grantRole(FACTION_MANAGER_ROLE, factionManager)

    console.log('Granting faction admin role...')
    const resp15 = await myManager.grantRole(FACTIONS_ADMIN_ROLE, accounts[0].address)

    await Promise.all([
        resp11.wait(),
        resp12.wait(),
        resp13.wait(),
        resp110.wait(),
        resp120.wait(),
        resp130.wait(),
        resp14.wait(),
        resp15.wait(),
    ])

    console.log('Roles granted.')
    console.log('Updating factions...')
    const resp16 = await myFactionManager.updateFaction(NAKAMOTOS_FACTION, nakamotosStaking, nakamotosFarming)
    const resp17 = await myFactionManager.updateFaction(VUTERINS_FACTION, vuterinsStaking, vuterinsFarming)
    const resp18 = await myFactionManager.updateFaction(ALTCOINERS_FACTION, altcoinersStaking, altcoinersFarming)

    await Promise.all([
        resp16.wait(),
        resp17.wait(),
        resp18.wait(),
    ])

    console.log('Factions updated...')

    const TutellusIDO = await ethers.getContractFactory("TutellusIDO");

    const myUsdt = await Token.deploy("Tutellus IDO USDT", "TUT-USDT")
    await myUsdt.deployed()
    await myUsdt.mint(accounts[0].address, ethers.utils.parseEther('10000000'))

    console.log(
        "USDT: ",
        myUsdt.address
    );

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
    const idoFactoryImp = await TutellusIDOFactory.deploy()
    await idoFactoryImp.deployed()
    const resp20 = await myManager.deployProxyWithImplementation(
        LAUNCHPAD_IDO_FACTORY,
        idoFactoryImp.address,
        initializeCalldata
    );

    await resp20.wait()

    const idoFactoryAddr = await myManager.get(LAUNCHPAD_IDO_FACTORY);
    const myIdoFactory = TutellusIDOFactory.attach(idoFactoryAddr);
    console.log("IDOFactory: ", idoFactoryAddr)
    const FUNDING_AMOUNT = ethers.utils.parseEther("100000");
    const MIN_PREFUND = ethers.utils.parseEther("1000");
    const START_DATE = parseInt(Date.now()/1000)
    const END_DATE = START_DATE + 1000000
    const idoInitializeCalldata = TutellusIDO.interface.encodeFunctionData(
        "initialize",
        [myManager.address, FUNDING_AMOUNT, MIN_PREFUND, myIdoToken.address, myUsdt.address, START_DATE, END_DATE, 0]
    );
    const resp21 = await myIdoFactory.createProxy(idoInitializeCalldata);
    const receipt = await resp21.wait()
    const myIdo = TutellusIDO.attach(receipt.events[1].args.proxy)

    console.log(
        "IDO: ",
        receipt.events[1].args.proxy
    );

    const Tutellus721 = await ethers.getContractFactory('Tutellus721')
    const nftsImp = await Tutellus721.deploy()
    await nftsImp.deployed()
    const resp40 = await myManager.deployProxyWithImplementation(NFT_ID, nftsImp.address, initializeCalldata)
    await resp40.wait()
    const NFTAddress = await myManager.get(NFT_ID)
    const myNFT = Tutellus721.attach(NFTAddress)

    console.log(
        "POAPs: ",
        NFTAddress
    );

    const resp41 = await myManager.grantRole(ADMIN_721_ROLE, accounts[0].address)
    await resp41.wait()
    const resp410 = await myManager.grantRole(AUTH_NFT_SIGNER, accounts[0].address)
    await resp410.wait()
    const resp42 = await myManager.grantRole(ENERGY_MINTER_ROLE, myNFT.address)
    await resp42.wait()
    const resp43 = await myNFT.createPOAP(
        myPOAP.id,
        myPOAP.eventId,
        myPOAP.uri,
        myPOAP.perpetual,
        myPOAP.energy
    )
    await resp43.wait()
    const resp44 = await myNFT.createPOAP(
        myPOAP2.id,
        myPOAP.eventId,
        myPOAP2.uri,
        myPOAP2.perpetual,
        myPOAP2.energy
    )
    await resp44.wait()

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

            // LP balance
            const lpBalance = await myLP.balanceOf(wallet.address)
            if (lpBalance.lt(FARMING_AMOUNTS[i][j].mul(ethers.BigNumber.from('2')))) {
                const resp230 = await myLP.transfer(wallet.address, FARMING_AMOUNTS[i][j].mul(ethers.BigNumber.from('2')))
                await resp230.wait()
            }

            // Staking

            const walletFaction = await myFactionManager.factionOf(wallet.address)
            const faction = await myFactionManager.faction(FACTIONS[j])

            if ((walletFaction == ethers.constants.HashZero) || (walletFaction == FACTIONS[j])) {
                const resp24 = await myTUT.connect(wallet).approve(myFactionManager.address, ethers.constants.MaxUint256)
                await resp24.wait()
                const resp26 = await myFactionManager.connect(wallet).stake(FACTIONS[j], wallet.address, STAKING_AMOUNTS[i][j])
                await resp26.wait()
            }

            // Farming

            if ((walletFaction == ethers.constants.HashZero) || (walletFaction == FACTIONS[j])) {
                const resp240 = await myLP.connect(wallet).approve(myFactionManager.address, ethers.constants.MaxUint256)
                await resp240.wait()
                const resp260 = await myFactionManager.connect(wallet).stakeLP(FACTIONS[j], wallet.address, FARMING_AMOUNTS[i][j])
                await resp260.wait()
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
                const resp29 = await myIdo.connect(wallet).prefund(wallet.address, PREFUND_AMOUNTS[i][j].sub(prefunded))
                await resp29.wait()
            }

            // Mint POAPs
            if (j == 0 || j == 2) {
                const signature = await sign721(myNFT, myPOAP.id, wallet.address, accounts[0])
                await myNFT.mint(
                    myPOAP.id,
                    wallet.address,
                    signature,
                    accounts[0].address
                )
            }

            if (j == 1 || j == 2) {
                const signature = await sign721(myNFT, myPOAP2.id, wallet.address, accounts[0])
                await myNFT.mint(
                    myPOAP2.id,
                    wallet.address,
                    signature,
                    accounts[0].address
                )
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

const sign721 = (contract, poapId, account, wallet) => {
    const domain = {
        name: 'Tutellus721',
        version: '1',
        chainId: ethers.provider._network.chainId,
        verifyingContract: contract.address
    }

    const types = {
        Mint: [
            { name: 'poapId', type: 'bytes32' },
            { name: 'account', type: 'address' },
        ]
    }

    const value = {
        poapId,
        account
    }

    return wallet._signTypedData(domain, types, value)
}