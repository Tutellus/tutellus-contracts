const { artifacts, ethers } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const { expect } = require('hardhat')
// const ether = require('@openzeppelin/test-helpers/src/ether')
const { formatEther, parseEther } = require('ethers/lib/utils')
const { utils } = require('ethers')
const { expectEqEth, expect1WeiApprox, etherToNumber, expectApproxWeiDecimals } = require('./utils')
const Deployer = artifacts.require('TutellusDeployer')
const Token = artifacts.require('TutellusERC20')
const Manager = artifacts.require('TutellusManager')
const RewardsVault = artifacts.require('TutellusRewardsVault')
const HoldersVault = artifacts.require('TutellusHoldersVault')
const TreasuryVault = artifacts.require('TutellusTreasuryVault')
const ACPP = artifacts.require('AccessControlProxyPausable')

let myDeployer
let myToken
let myRewardsVault
let myHoldersVault
let myTreasuryVault
let myManager
let myEnergy
let myNFT
let owner, person

const ENERGY_MINTER_ROLE = utils.id('ENERGY_MINTER_ROLE')
const ENERGY_MANAGER_ROLE = utils.id('ENERGY_MANAGER_ROLE')
const ADMIN_721_ROLE = utils.id('ADMIN_721_ROLE')
const AUTH_NFT_SIGNER = utils.id('AUTH_NFT_SIGNER')
const ENERGY_ID = utils.id('ENERGY');
const NFT_ID = utils.id('721');
const ONE_ETHER = parseEther('1')
const TWO_ETHER = parseEther('2')
const SIX_ETHER = parseEther('6')
const RAY = parseEther('1000000000')

const SECONDS = 1
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60

const getAddresses = async () => {
const addresses = await Promise.all([
    myDeployer.token(),
    myDeployer.rolemanager(),
    myDeployer.rewardsVault(),
    myDeployer.clientsVault(),
    myDeployer.holdersVault(),
    myDeployer.treasuryVault()
])
return addresses
}

const setInstances = async (addresses) => {
    [myToken, myRewardsVault, myHoldersVault, myTreasuryVault] = await Promise.all([
        Token.at(addresses[0]),
        RewardsVault.at(addresses[2]),
        HoldersVault.at(addresses[4]),
        TreasuryVault.at(addresses[5]),
    ])
}

const myEvent = {
    id: utils.id('quedada-1-madrid'),
    energy: parseEther('0'),
    perpetual: true,
    uri: 'uri/quedada-1-madrid'
}

describe.only('721 tokens', function () {
    before(async () => {
        [owner, person] = await web3.eth.getAccounts()
    })
    beforeEach(async () => {
        const previous = await latestBlock()
        myDeployer = await Deployer.new(owner, previous)
        const addresses = await getAddresses()
        await setInstances(addresses)

        const ids = {   
            ERC20: myToken.address,
            REWARDS_VAULT: myRewardsVault.address,
            HOLDERS_VAULT: myHoldersVault.address,
            TREASURY_VAULT: myTreasuryVault.address
        }
        myManager = await Manager.new()
        await myManager.initialize()

        const keys = Object.keys(ids)

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            const addr = ids[key]
            const myContract = await ACPP.at(addr)

            await myManager.setId(utils.id(key), addr)
            await myContract.updateManager(myManager.address)
        }

        const Energy = await ethers.getContractFactory('TutellusEnergy')
        const NFT = await ethers.getContractFactory('Tutellus721')

        let initializeCalldataEnergy = Energy.interface.encodeFunctionData('initialize', []);
        let initializeCalldataNFT = NFT.interface.encodeFunctionData('initialize', []);

        await myManager.deploy(ENERGY_ID, Energy.bytecode, initializeCalldataEnergy)
        await myManager.deploy(NFT_ID, NFT.bytecode, initializeCalldataNFT)

        const [energy, nft] = await Promise.all([
            myManager.get(ENERGY_ID),
            myManager.get(NFT_ID),
        ])

        myEnergy = Energy.attach(energy)
        myNFT = NFT.attach(nft)
    })

    describe('Create event', () => {
        it('Can create a new event', async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)
            await myNFT.createEvent(
                myEvent.id,
                myEvent.uri,
                myEvent.perpetual,
                myEvent.energy
            )
            
            const {
                uri,
                valid,
                perpetual,
                energy
            } = await myNFT.events(myEvent.id)

            expect(uri).eq(myEvent.uri)
            expect(perpetual).eq(myEvent.perpetual)
            expect(valid).eq(true)
            expectEqEth(energy, myEvent.energy)

        })
    })
    describe('Mint', () => {
        beforeEach(async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)
            await myNFT.createEvent(
                myEvent.id,
                myEvent.uri,
                myEvent.perpetual,
                myEvent.energy
            )
        })
        it('Can mint a new token', async () => {
            const domain = {
                name: 'Tutellus721',
                version: '1',
                chainId: ethers.provider._network.chainId,
                verifyingContract: myNFT.address
            }

            const types = {
                Mint: [
                    { name: 'eventId', type: 'bytes32' },
                    { name: 'account', type: 'address' },
                ]
            }

            const value = {
               eventId: myEvent.id,
               account: person,
            }

            let myWallet = await new hre.ethers.Wallet.createRandom()
            const signer = myWallet.address
            const signature = await myWallet._signTypedData(domain, types, value)
            
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent.id,
                person,
                signature,
                signer
            )
            const ownership = await myNFT.ownerOf(0)
            expect(ownership).eq(person)
        })
    })
})
  