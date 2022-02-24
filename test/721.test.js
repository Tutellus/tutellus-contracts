const { artifacts, ethers } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const { expect } = require('hardhat')
// const ether = require('@openzeppelin/test-helpers/src/ether')
const { formatEther, parseEther } = require('ethers/lib/utils')
const { utils, constants } = require('ethers')
const { expectEqEth, expect1WeiApprox, etherToNumber, expectApproxWeiDecimals } = require('./utils')
const Deployer = artifacts.require('TutellusDeployer')
const Token = artifacts.require('TutellusERC20')
const Manager = artifacts.require('TutellusManager')
const RewardsVault = artifacts.require('TutellusRewardsVault')
const HoldersVault = artifacts.require('TutellusHoldersVault')
const TreasuryVault = artifacts.require('TutellusTreasuryVault')
const ACPP = artifacts.require('AccessControlProxyPausable')
const NFT = artifacts.require('Tutellus721')
const Energy = artifacts.require('TutellusEnergy')

let myDeployer
let myToken
let myRewardsVault
let myHoldersVault
let myTreasuryVault
let myManager
let myEnergy
let myNFT
let owner, person, person2

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

const sign721 = async (contract, eventId, account) => {
    const domain = {
        name: 'Tutellus721',
        version: '1',
        chainId: ethers.provider._network.chainId,
        verifyingContract: contract.address
    }

    const types = {
        Mint: [
            { name: 'eventId', type: 'bytes32' },
            { name: 'account', type: 'address' },
        ]
    }

    const value = {
       eventId,
       account
    }

    let myWallet = await new ethers.Wallet.createRandom()

    return {
        signer: myWallet.address,
        signature: await myWallet._signTypedData(domain, types, value)
    }
}

const myEvent = {
    id: utils.id('perpetual'),
    energy: parseEther('0'),
    perpetual: true,
    uri: 'uri/perpetual'
}
const myEvent2 = {
    id: utils.id('perpetual-energy'),
    energy: parseEther('1000'),
    perpetual: true,
    uri: 'uri/perpetual-energy'
}
const myEvent3 = {
    id: utils.id('non-perpetual'),
    energy: parseEther('0'),
    perpetual: false,
    uri: 'uri/non-perpetual'
}
const myEvent4 = {
    id: utils.id('non-perpetual-energy'),
    energy: parseEther('1000'),
    perpetual: false,
    uri: 'uri/non-perpetual-energy'
}

describe('721 tokens', function () {
    before(async () => {
        [owner, person, person2] = await web3.eth.getAccounts()
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

        const EnergyFactory = await ethers.getContractFactory('TutellusEnergy')
        const NFTFactory = await ethers.getContractFactory('Tutellus721')

        let initializeCalldataEnergy = EnergyFactory.interface.encodeFunctionData('initialize', []);
        let initializeCalldataNFT = NFTFactory.interface.encodeFunctionData('initialize', []);

        await myManager.deploy(ENERGY_ID, EnergyFactory.bytecode, initializeCalldataEnergy)
        await myManager.deploy(NFT_ID, NFTFactory.bytecode, initializeCalldataNFT)

        const [energy, nft] = await Promise.all([
            myManager.get(ENERGY_ID),
            myManager.get(NFT_ID),
        ])

        myEnergy = await Energy.at(energy)
        myNFT = await NFT.at(nft)
    })

    describe('Create event', () => {
        it('Can create a new event', async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)
            await myManager.grantRole(ENERGY_MINTER_ROLE, myNFT.address)
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
        it('Cant create an event with the same id', async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)
            await myManager.grantRole(ENERGY_MINTER_ROLE, myNFT.address)
            await myNFT.createEvent(
                myEvent.id,
                myEvent.uri,
                myEvent.perpetual,
                myEvent.energy
            )
            await expectRevert(
                myNFT.createEvent(
                    myEvent.id,
                    myEvent2.uri,
                    myEvent3.perpetual,
                    myEvent4.energy
                ),
                'Tutellus721: event valid'
            ) 
        })
    })
    describe('Mint', () => {
        beforeEach(async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)
            await myManager.grantRole(ENERGY_MINTER_ROLE, myNFT.address)
            await myNFT.createEvent(
                myEvent.id,
                myEvent.uri,
                myEvent.perpetual,
                myEvent.energy
            )
            await myNFT.createEvent(
                myEvent2.id,
                myEvent2.uri,
                myEvent2.perpetual,
                myEvent2.energy
            )
            await myNFT.createEvent(
                myEvent3.id,
                myEvent3.uri,
                myEvent3.perpetual,
                myEvent3.energy
            )
            await myNFT.createEvent(
                myEvent4.id,
                myEvent4.uri,
                myEvent4.perpetual,
                myEvent4.energy
            )
        })
        it('Can mint a perpetual token without energy', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent.id,
                person,
                signature,
                signer
            )
            const [ownerOf, uri] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0)
            ]) 
            expect(ownerOf).eq(person)
            expect(uri).eq(myEvent.uri)
        })
        it('Can mint a perpetual token with energy', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent2.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent2.id,
                person,
                signature,
                signer
            )
 
            const [ownerOf, uri, energyBalance] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0),
                myEnergy.balanceOf(person)
            ])
            expect(ownerOf).eq(person)
            expect(uri).eq(myEvent2.uri)
            expectEqEth(energyBalance, myEvent2.energy)
        })
        it('Can mint a non-perpetual token without energy', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent3.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent3.id,
                person,
                signature,
                signer
            )
 
            const [ownerOf, uri] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0)
            ])
            expect(ownerOf).eq(person)
            expect(uri).eq(myEvent3.uri)
        })
        it('Can mint a non-perpetual token with energy', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent4.id,
                person,
                signature,
                signer
            )
 
            const [ownerOf, uri, eventEnergyBalance] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0),
                myEnergy.eventBalanceOf(myEvent4.id, person)
            ])
            expect(ownerOf).eq(person)
            expect(uri).eq(myEvent4.uri)
            expectEqEth(eventEnergyBalance, myEvent4.energy)
        })
        it('Cant mint a token with unauthorized signer', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent.id, person)
            // await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await expectRevert(
                myNFT.mint(
                    myEvent.id,
                    person,
                    signature,
                    signer
                ),
                'Tutellus721: invalid signer'
            ) 
        })
        it('Cant mint the same token twice', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent.id,
                person,
                signature,
                signer
            )
            await expectRevert(
                myNFT.mint(
                    myEvent.id,
                    person,
                    signature,
                    signer
                ),
                'Tutellus721: already signed'
            ) 
        })
        it('Cant mint a token with an invalid signature', async () => {
            const { signature } = await sign721(myNFT, myEvent.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, owner)
            await expectRevert(
                myNFT.mint(
                    myEvent.id,
                    person,
                    signature,
                    owner
                ),
                'Tutellus721: invalid signature'
            ) 
        })
        it('Cant mint an invalid token', async () => {
            const { signer, signature } = await sign721(myNFT, constants.HashZero, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await expectRevert(
                myNFT.mint(
                    constants.HashZero,
                    person,
                    signature,
                    signer
                ),
                'Tutellus721: event not valid'
            ) 
        })
    })
    describe('Burn', () => {
        beforeEach(async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)
            await myManager.grantRole(ENERGY_MINTER_ROLE, myNFT.address)
            await myNFT.createEvent(
                myEvent.id,
                myEvent.uri,
                myEvent.perpetual,
                myEvent.energy
            )
            await myNFT.createEvent(
                myEvent2.id,
                myEvent2.uri,
                myEvent2.perpetual,
                myEvent2.energy
            )
            await myNFT.createEvent(
                myEvent3.id,
                myEvent3.uri,
                myEvent3.perpetual,
                myEvent3.energy
            )
            await myNFT.createEvent(
                myEvent4.id,
                myEvent4.uri,
                myEvent4.perpetual,
                myEvent4.energy
            )
        })
        it('Can burn a perpetual token without energy', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent.id,
                person,
                signature,
                signer
            )
            await myNFT.burn(0, { from: person })
            await expectRevert(
                myNFT.ownerOf(0),
                'ERC721: owner query for nonexistent token'
            ) 
        })
        it('Can burn a perpetual token with energy', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent2.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent2.id,
                person,
                signature,
                signer
            )
            
            await myNFT.burn(0, { from: person })
            await expectRevert(
                myNFT.ownerOf(0),
                'ERC721: owner query for nonexistent token'
            ) 

            const [energyBalance] = await Promise.all([
                myEnergy.balanceOf(person)
            ])
            
            expectEqEth(energyBalance, 0)
        })
        it('Can burn a non-perpetual token without energy', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent3.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent3.id,
                person,
                signature,
                signer
            )
 
            await myNFT.burn(0, { from: person })
            await expectRevert(
                myNFT.ownerOf(0),
                'ERC721: owner query for nonexistent token'
            ) 
        })
        it('Can burn a non-perpetual token with energy', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent4.id,
                person,
                signature,
                signer
            )
            await myNFT.burn(0, { from: person })
            await expectRevert(
                myNFT.ownerOf(0),
                'ERC721: owner query for nonexistent token'
            ) 
            const [eventEnergyBalance] = await Promise.all([
                myEnergy.eventBalanceOf(myEvent4.id, person)
            ])
            expectEqEth(eventEnergyBalance, 0)
        })
        it('Cant burn if not admin, approved, owner', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent4.id,
                person,
                signature,
                signer
            )
            await expectRevert(
                myNFT.burn(0, { from: person2 }),
                'Tutellus721: invalid sender'
            ) 
        })
        it('Can burn if admin', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent4.id,
                person,
                signature,
                signer
            )
            await myManager.grantRole(ADMIN_721_ROLE, person2)
            await myNFT.burn(0, { from: person2 })
            await expectRevert(
                myNFT.ownerOf(0),
                'ERC721: owner query for nonexistent token'
            ) 
            const [eventEnergyBalance] = await Promise.all([
                myEnergy.eventBalanceOf(myEvent4.id, person)
            ])
            expectEqEth(eventEnergyBalance, 0)
        })
        it('Can burn if approved', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent4.id,
                person,
                signature,
                signer
            )
            await myNFT.setApprovalForAll(person2, true, { from: person })
            await myNFT.burn(0, { from: person2 })
            await expectRevert(
                myNFT.ownerOf(0),
                'ERC721: owner query for nonexistent token'
            ) 
            const [eventEnergyBalance] = await Promise.all([
                myEnergy.eventBalanceOf(myEvent4.id, person)
            ])
            expectEqEth(eventEnergyBalance, 0)
        })
        it('Cant transfer tokens', async () => {
            const { signer, signature } = await sign721(myNFT, myEvent4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myEvent4.id,
                person,
                signature,
                signer
            )
            await expectRevert(
                myNFT.transferFrom(person, owner, 0, { from: person }),
                'Tutellus721: untransferable'
            )
        })
    })

    describe('Solidity', () => {
        it('Supports interface', async () => {
            await myNFT.supportsInterface('0x00');
        })
    })
})
  