const { artifacts, ethers } = require('hardhat')
const { latestBlock } = require('@openzeppelin/test-helpers/src/time')
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const { expect } = require('hardhat')
// const ether = require('@openzeppelin/test-helpers/src/ether')
const { formatEther, parseEther } = require('ethers/lib/utils')
const { utils, constants } = require('ethers')
const { expectEqEth, expect1WeiApprox, etherToNumber, expectApproxWeiDecimals } = require('../utils')
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

const sign721 = async (contract, poapId, account) => {
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

    let myWallet = await new ethers.Wallet.createRandom()

    return {
        signer: myWallet.address,
        signature: await myWallet._signTypedData(domain, types, value)
    }
}

const EVENT1 = utils.id('ido1')
const EVENT2 = utils.id('ido2')

const myPOAP = {
    id: utils.id('perpetual'),
    eventId: EVENT1,
    energy: parseEther('0'),
    perpetual: true,
    uri: 'uri/perpetual'
}
const myPOAP2 = {
    id: utils.id('perpetual-energy'),
    eventId: EVENT1,
    energy: parseEther('1000'),
    perpetual: true,
    uri: 'uri/perpetual-energy'
}
const myPOAP3 = {
    id: utils.id('non-perpetual'),
    eventId: EVENT1,
    energy: parseEther('0'),
    perpetual: false,
    uri: 'uri/non-perpetual'
}
const myPOAP4 = {
    id: utils.id('non-perpetual-energy'),
    eventId: EVENT2,
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

    describe('Create poap', () => {
        it('Can create a new poap', async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)
            await myManager.grantRole(ENERGY_MINTER_ROLE, myNFT.address)
            await myNFT.createPOAP(
                myPOAP.id,
                myPOAP.eventId,
                myPOAP.uri,
                myPOAP.perpetual,
                myPOAP.energy
            )
            
            const {
                uri,
                valid,
                perpetual,
                energy
            } = await myNFT.poaps(myPOAP.id)

            expect(uri).eq(myPOAP.uri)
            expect(perpetual).eq(myPOAP.perpetual)
            expect(valid).eq(true)
            expectEqEth(energy, myPOAP.energy)

        })
        it('Cant create an poap with the same id', async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)
            await myManager.grantRole(ENERGY_MINTER_ROLE, myNFT.address)
            await myNFT.createPOAP(
                myPOAP.id,
                myPOAP.eventId,
                myPOAP.uri,
                myPOAP.perpetual,
                myPOAP.energy
            )
            await expectRevert(
                myNFT.createPOAP(
                    myPOAP.id,
                    myPOAP.eventId,
                    myPOAP2.uri,
                    myPOAP3.perpetual,
                    myPOAP4.energy
                ),
                'Tutellus721: poap valid'
            ) 
        })
    })
    describe('Mint', () => {
        beforeEach(async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)
            await myManager.grantRole(ENERGY_MINTER_ROLE, myNFT.address)
            await myNFT.createPOAP(
                myPOAP.id,
                myPOAP.eventId,
                myPOAP.uri,
                myPOAP.perpetual,
                myPOAP.energy
            )
            await myNFT.createPOAP(
                myPOAP2.id,
                myPOAP2.eventId,
                myPOAP2.uri,
                myPOAP2.perpetual,
                myPOAP2.energy
            )
            await myNFT.createPOAP(
                myPOAP3.id,
                myPOAP3.eventId,
                myPOAP3.uri,
                myPOAP3.perpetual,
                myPOAP3.energy
            )
            await myNFT.createPOAP(
                myPOAP4.id,
                myPOAP4.eventId,
                myPOAP4.uri,
                myPOAP4.perpetual,
                myPOAP4.energy
            )
        })
        it('Can mint a perpetual token without energy', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP.id,
                person,
                signature,
                signer
            )
            const [ownerOf, uri] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0)
            ]) 
            expect(ownerOf).eq(person)
            expect(uri).eq(myPOAP.uri)
        })
        it('Can mint a perpetual token with energy', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP2.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP2.id,
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
            expect(uri).eq(myPOAP2.uri)
            expectEqEth(energyBalance, myPOAP2.energy)
        })
        it('Can mint a non-perpetual token without energy', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP3.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP3.id,
                person,
                signature,
                signer
            )
 
            const [ownerOf, uri] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0)
            ])
            expect(ownerOf).eq(person)
            expect(uri).eq(myPOAP3.uri)
        })
        it('Can mint a non-perpetual token with energy', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP4.id,
                person,
                signature,
                signer
            )
 
            const [ownerOf, uri, eventEnergyBalance] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0),
                myEnergy.eventBalanceOf(myPOAP4.eventId, person)
            ])
            expect(ownerOf).eq(person)
            expect(uri).eq(myPOAP4.uri)
            expectEqEth(eventEnergyBalance, myPOAP4.energy)
        })
        it('Cant mint a token with unauthorized signer', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP.id, person)
            // await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await expectRevert(
                myNFT.mint(
                    myPOAP.id,
                    person,
                    signature,
                    signer
                ),
                'Tutellus721: invalid signer'
            ) 
        })
        it('Cant mint the same token twice', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP.id,
                person,
                signature,
                signer
            )
            await expectRevert(
                myNFT.mint(
                    myPOAP.id,
                    person,
                    signature,
                    signer
                ),
                'Tutellus721: already signed'
            ) 
        })
        it('Cant mint if disabled', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.setValid(myPOAP.id, false);
            await expectRevert(
                myNFT.mint(
                    myPOAP.id,
                    person,
                    signature,
                    signer
                ),
                'Tutellus721: poap not valid'
            ) 
        })
        it('Cant mint a token with an invalid signature', async () => {
            const { signature } = await sign721(myNFT, myPOAP.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, owner)
            await expectRevert(
                myNFT.mint(
                    myPOAP.id,
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
                'Tutellus721: poap not valid'
            ) 
        })
    })
    describe('Burn', () => {
        beforeEach(async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner)
            await myManager.grantRole(ENERGY_MINTER_ROLE, myNFT.address)
            await myNFT.createPOAP(
                myPOAP.id,
                myPOAP.eventId,
                myPOAP.uri,
                myPOAP.perpetual,
                myPOAP.energy
            )
            await myNFT.createPOAP(
                myPOAP2.id,
                myPOAP2.eventId,
                myPOAP2.uri,
                myPOAP2.perpetual,
                myPOAP2.energy
            )
            await myNFT.createPOAP(
                myPOAP3.id,
                myPOAP3.eventId,
                myPOAP3.uri,
                myPOAP3.perpetual,
                myPOAP3.energy
            )
            await myNFT.createPOAP(
                myPOAP4.id,
                myPOAP4.eventId,
                myPOAP4.uri,
                myPOAP4.perpetual,
                myPOAP4.energy
            )
        })
        it('Can burn a perpetual token without energy', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP.id,
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
            const { signer, signature } = await sign721(myNFT, myPOAP2.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP2.id,
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
            const { signer, signature } = await sign721(myNFT, myPOAP3.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP3.id,
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
            const { signer, signature } = await sign721(myNFT, myPOAP4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP4.id,
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
                myEnergy.eventBalanceOf(myPOAP4.eventId, person)
            ])
            expectEqEth(eventEnergyBalance, 0)
        })
        it('Cant burn if not admin, approved, owner', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP4.id,
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
            const { signer, signature } = await sign721(myNFT, myPOAP4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP4.id,
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
                myEnergy.eventBalanceOf(myPOAP4.id, person)
            ])
            expectEqEth(eventEnergyBalance, 0)
        })
        it('Can burn if approved', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP4.id,
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
                myEnergy.eventBalanceOf(myPOAP4.id, person)
            ])
            expectEqEth(eventEnergyBalance, 0)
        })
        it('Cant transfer tokens', async () => {
            const { signer, signature } = await sign721(myNFT, myPOAP4.id, person)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.mint(
                myPOAP4.id,
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
  