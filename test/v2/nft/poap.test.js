const { ethers } = require('hardhat')
const { utils } = ethers
const { expect } = require('chai')
const { parseEther } = require('ethers/lib/utils')
const { expectEqEth } = require('../../utils')

let myDeployer
let myManager
let myEnergy
let myNFT
let owner, person, person2

const ENERGY_MINTER_ROLE = utils.id('ENERGY_MINTER_ROLE')
const ADMIN_721_ROLE = utils.id('ADMIN_721_ROLE')
const AUTH_NFT_SIGNER = utils.id('AUTH_NFT_SIGNER')
const ENERGY_ID = utils.id('ENERGY');
const NFT_ID = utils.id('721');

const signPoap = async (contract, poapId, signer, code, limit) => {
    const { address: account } = signer 
    const domain = {
        name: 'TutellusPOAP',
        version: '1',
        chainId: ethers.provider._network.chainId,
        verifyingContract: contract.address
    }

    const types = {
        Mint: [
            { name: 'poapId', type: 'bytes32' },
            { name: 'account', type: 'address' },
            { name: 'code', type: 'bytes32' },
            { name: 'limit', type: 'uint256' }
        ]
    }

    const value = {
        poapId,
        account,
        code,
        limit,
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

describe('POAP', function () {
    before(async () => {
        [owner, person, person2] = await ethers.getSigners()
    })
    beforeEach(async () => {
        const { number } = await ethers.provider.getBlock('latest')

        const Deployer = await ethers.getContractFactory('TutellusDeployer')
        const Manager = await ethers.getContractFactory('TutellusManager')

        myDeployer = await Deployer.deploy(owner.address, number)
        await myDeployer.deployed()

        myManager = await Manager.deploy()
        await myManager.deployed()
        await myManager.initialize()

        const EnergyFactory = await ethers.getContractFactory('TutellusEnergy')
        const POAPFactory = await ethers.getContractFactory('TutellusPOAP')

        EnergyContract = await EnergyFactory.deploy()
        await EnergyContract.deployed()
        POAPContract = await POAPFactory.deploy()
        await POAPContract.deployed()

        let initializeCalldataEnergy = EnergyFactory.interface.encodeFunctionData('initialize', []);
        let initializeCalldataNFT = POAPFactory.interface.encodeFunctionData('initialize', []);

        await myManager.deployProxyWithImplementation(ENERGY_ID, EnergyContract.address, initializeCalldataEnergy)
        await myManager.deployProxyWithImplementation(NFT_ID, POAPContract.address, initializeCalldataNFT)

        const [energy, nft] = await Promise.all([
            myManager.get(ENERGY_ID),
            myManager.get(NFT_ID),
        ])

        myEnergy = EnergyFactory.attach(energy)
        myNFT = POAPFactory.attach(nft)
    })

    describe('Create poap', () => {
        it('Can create a new poap', async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner.address)
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
            await myManager.grantRole(ADMIN_721_ROLE, owner.address)
            await myManager.grantRole(ENERGY_MINTER_ROLE, myNFT.address)
            await myNFT.createPOAP(
                myPOAP.id,
                myPOAP.eventId,
                myPOAP.uri,
                myPOAP.perpetual,
                myPOAP.energy
            )
            await expect(
                myNFT.createPOAP(
                    myPOAP.id,
                    myPOAP.eventId,
                    myPOAP2.uri,
                    myPOAP3.perpetual,
                    myPOAP4.energy
                )
            ).to.be.revertedWith('TutellusPOAP: poap valid')
        })
    })
    describe('Mint', () => {
        beforeEach(async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner.address)
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
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP.id,
                code,
                limit,
                signature,
                signer
            )
            const [ownerOf, uri] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0)
            ]) 
            expect(ownerOf).eq(person.address)
            expect(uri).eq(myPOAP.uri)
        })
        it('Can mint a perpetual token with energy', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP2.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP2.id,
                code,
                limit,
                signature,
                signer
            )
 
            const [ownerOf, uri, energyBalance] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0),
                myEnergy.balanceOf(person.address)
            ])
            expect(ownerOf).eq(person.address)
            expect(uri).eq(myPOAP2.uri)
            expectEqEth(energyBalance, myPOAP2.energy)
        })
        it('Can mint a non-perpetual token without energy', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP3.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP3.id,
                code,
                limit,
                signature,
                signer
            )
 
            const [ownerOf, uri] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0)
            ])
            expect(ownerOf).eq(person.address)
            expect(uri).eq(myPOAP3.uri)
        })
        it('Can mint a non-perpetual token with energy', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP4.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP4.id,
                code,
                limit,
                signature,
                signer
            )
 
            const [ownerOf, uri, eventEnergyBalance] = await Promise.all([
                myNFT.ownerOf(0),
                myNFT.tokenURI(0),
                myEnergy.eventBalanceOf(myPOAP4.eventId, person.address)
            ])
            expect(ownerOf).eq(person.address)
            expect(uri).eq(myPOAP4.uri)
            expectEqEth(eventEnergyBalance, myPOAP4.energy)
        })
        it('Cant mint a token with unauthorized signer', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP.id, person, code, limit)
            await expect(
                myNFT.connect(person).mint(
                    myPOAP.id,
                    code,
                    limit,
                    signature,
                    signer
                )
            ).to.be.revertedWith('TutellusPOAP: invalid signer')
        })
        it('Cant overflow the limit', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP.id,
                code,
                limit,
                signature,
                signer
            )
            await expect(
                myNFT.mint(
                    myPOAP.id,
                    code,
                    limit,
                    signature,
                    signer
                )
            ).to.be.revertedWith('TutellusPOAP: code limit reached')
        })
        it('Cant mint same poap to same wallet', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 2;
            const { signer, signature } = await signPoap(myNFT, myPOAP.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP.id,
                code,
                limit,
                signature,
                signer
            )
            await expect(
                myNFT.connect(person).mint(
                    myPOAP.id,
                    code,
                    limit,
                    signature,
                    signer
                )
            ).to.be.revertedWith('TutellusPOAP: poap already emitted for account')
        })
        it('Cant mint if disabled', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.setValid(myPOAP.id, false);
            await expect(
                myNFT.connect(person).mint(
                    myPOAP.id,
                    code,
                    limit,
                    signature,
                    signer
                )
            ).to.be.revertedWith('TutellusPOAP: poap not valid')
        })
        it('Cant mint a token with an invalid signature', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 2;
            const { signer } = await signPoap(myNFT, myPOAP.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await expect(
                myNFT.connect(person).mint(
                    myPOAP.id,
                    code,
                    limit,
                    ethers.utils.id('invalid'),
                    signer
                )
            ).to.be.revertedWith('TutellusPOAP: invalid signature')
        })
    })
    describe('Burn', () => {
        beforeEach(async () => {
            await myManager.grantRole(ADMIN_721_ROLE, owner.address)
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
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP.id,
                code,
                limit,
                signature,
                signer
            )
            await myNFT.connect(person).burn(0)
            await expect(
                myNFT.ownerOf(0)
            ).to.be.revertedWith('ERC721: invalid token ID')
        })
        it('Can burn a perpetual token with energy', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP2.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP2.id,
                code,
                limit,
                signature,
                signer
            )
            
            await myNFT.connect(person).burn(0)
            await expect(
                myNFT.ownerOf(0)
            ).to.be.revertedWith('ERC721: invalid token ID')

            const [energyBalance] = await Promise.all([
                myEnergy.balanceOf(person.address)
            ])
            
            expectEqEth(energyBalance, 0)
        })
        it('Can burn a non-perpetual token without energy', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP3.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP3.id,
                code,
                limit,
                signature,
                signer
            )
 
            await myNFT.connect(person).burn(0)
            await expect(
                myNFT.ownerOf(0)
            ).to.be.revertedWith('ERC721: invalid token ID')
        })
        it('Can burn a non-perpetual token with energy', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP4.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP4.id,
                code,
                limit,
                signature,
                signer
            )
            await myNFT.connect(person).burn(0)
            await expect(
                myNFT.ownerOf(0)
            ).to.be.revertedWith('ERC721: invalid token ID')
            const [eventEnergyBalance] = await Promise.all([
                myEnergy.eventBalanceOf(myPOAP4.eventId, person.address)
            ])
            expectEqEth(eventEnergyBalance, 0)
        })
        it('Cant burn if not admin, approved, owner', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP4.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP4.id,
                code,
                limit,
                signature,
                signer
            )
            await expect(
                myNFT.connect(person2).burn(0)
            ).to.be.revertedWith('TutellusPOAP: invalid sender')
        })
        it('Can burn if admin', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP4.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP4.id,
                code,
                limit,
                signature,
                signer
            )
            await myManager.grantRole(ADMIN_721_ROLE, person2.address)
            await myNFT.connect(person2).burn(0)
            await expect(
                myNFT.ownerOf(0)
            ).to.be.revertedWith('ERC721: invalid token ID')
            const [eventEnergyBalance] = await Promise.all([
                myEnergy.eventBalanceOf(myPOAP4.id, person.address)
            ])
            expectEqEth(eventEnergyBalance, 0)
        })
        it('Can burn if approved', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP4.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP4.id,
                code,
                limit,
                signature,
                signer
            )
            await myNFT.connect(person).setApprovalForAll(person2.address, true)
            await myNFT.connect(person2).burn(0)
            await expect(
                myNFT.ownerOf(0)
            ).to.be.revertedWith('ERC721: invalid token ID')
            const [eventEnergyBalance] = await Promise.all([
                myEnergy.eventBalanceOf(myPOAP4.id, person.address)
            ])
            expectEqEth(eventEnergyBalance, 0)
        })
        it('Cant transfer tokens', async () => {
            const code = ethers.utils.id('42943892042');
            const limit = 1;
            const { signer, signature } = await signPoap(myNFT, myPOAP4.id, person, code, limit)
            await myManager.grantRole(AUTH_NFT_SIGNER, signer)
            await myNFT.connect(person).mint(
                myPOAP4.id,
                code,
                limit,
                signature,
                signer
            )
            await expect(
                myNFT.connect(person).transferFrom(person.address, owner.address, 0)
            ).to.be.revertedWith('TutellusPOAP: untransferable')
        })
    })

    describe('Solidity', () => {
        // it('Supports interface', async () => {
        //     await myNFT.supportsInterface(0x80ac58cd);
        // })
    })
})