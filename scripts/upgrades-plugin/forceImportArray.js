const { ethers, upgrades } = require("hardhat");

const contracts = [
    {
        name: "TutellusFactionManager",
        address: "0x661B5AacAA7E8044108515261C0aAB4f27a3BB4a"
    },
    {
        name: "TutellusLaunchpadStaking",
        address: "0xEbF4FC554D41c2Aa252A71C50b30a5e6A949A4ca"
    },
    {
        name: "TutellusEnergyMultiplierManager",
        address: "0xb1D2ec1B546a8E71Bb198502c146D283dc16BE92"
    },
    {
        name: "TutellusIDOFactory",
        address: "0x23a6c2E4ac83179364d492Fc5bf5AE391a05B3Cf"
    },
    {
        name: "TutellusRewardsVaultV2",
        address: "0xD451458ca5A4081bdB0dfd96D0d99F974fFAc96E"
    },
    {
        name: "TutellusWhitelist",
        address: "0x7B6e624f144D6fA4792a6FCEc02F33E9E5e3BE27"
    }
]

async function main() {
    for(let i = 0; i < contracts.length; i++) {
        const Factory = await ethers.getContractFactory(contracts[i].name);
        const result = await upgrades.forceImport(contracts[i].address, Factory, { kind: 'uups' })
    }
    
    console.log("Imported")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
