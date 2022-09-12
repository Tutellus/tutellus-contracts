const { expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { constants } = require('ethers');
const { ethers } = require('hardhat');
const { getWhitelistTree } = require('../../utils/whitelistTree');

const WHITELIST_ADMIN_ROLE = ethers.utils.id('WHITELIST_ADMIN_ROLE');
const WHITELIST_ID = ethers.utils.id('WHITELIST');
const URI = 'uri';

let owner, person, person2, whitelist, tree, myWhitelist, myManager

describe('Whitelist', function () {
    before(async () => {
        [owner, person, person2] = await ethers.getSigners();
        whitelist = [owner.address, person.address];
        tree = getWhitelistTree(whitelist).toJSON();
    })
    beforeEach(async () => {
        // Manager deploy
        const Manager = await ethers.getContractFactory('TutellusManager');
        myManager = await Manager.deploy();
        await myManager.deployTransaction.wait();
        await myManager.initialize();

        // Whitelist deploy
        const Whitelist = await ethers.getContractFactory('TutellusWhitelist');
        const initializeCalldata = Whitelist.interface.encodeFunctionData('initialize', []);
        await myManager.deploy(
            WHITELIST_ID,
            Whitelist.bytecode,
            initializeCalldata,
        );
        const whitelistAddr = await myManager.get(WHITELIST_ID);
        myWhitelist = Whitelist.attach(whitelistAddr);
    })

    describe('update', () => {
        it('can update merkleroot if whitelist admin role', async () => {
            await myManager.grantRole(WHITELIST_ADMIN_ROLE, owner.address);
            await myWhitelist.updateMerkleRoot(tree.merkleRoot, URI);
            const [merkleRoot, uri] = await Promise.all([
                myWhitelist.merkleRoot(),
                myWhitelist.uri(),
            ]);

            expect(merkleRoot).not.eq(constants.HashZero);
            expect(merkleRoot).eq(tree.merkleRoot);
            expect(uri).eq(URI);
        })
        it('can not update merkleroot if not whitelist admin role', async () => {
            // await myManager.grantRole(WHITELIST_ADMIN_ROLE, owner.address);
            await expectRevert(
                myWhitelist.updateMerkleRoot(tree.merkleRoot, URI),
                `AccessControlProxyPausable: account ${owner.address.toLowerCase()} is missing role ${WHITELIST_ADMIN_ROLE.toLowerCase()}`
            );
        })
    })
    describe('add', () => {
        beforeEach(async () => {
            await myManager.grantRole(WHITELIST_ADMIN_ROLE, owner.address);
            await myWhitelist.updateMerkleRoot(tree.merkleRoot, URI);
        })
        it('can add whitelisted users', async () => {
            const personClaim = tree.claims[person.address];
            await myWhitelist.add(
                personClaim.index,
                person.address,
                personClaim.proof,
            );
            const isWhitelisted = await myWhitelist.whitelisted(person.address);
            expect(isWhitelisted).eq(true);

            // check adding twice
            await expectRevert(
                myWhitelist.add(
                    personClaim.index,
                    person.address,
                    personClaim.proof,
                ),
                'TutellusWhitelist: account already whitelisted'
            );
        })
        it('can not add unwhitelisted users', async () => {
            const personClaim = tree.claims[person.address];
            await expectRevert(
                myWhitelist.add(
                    personClaim.index,
                    person2.address,
                    personClaim.proof,
                ),
                'TutellusWhitelist: invalid proof'
            );
            const isWhitelisted = await myWhitelist.whitelisted(person2.address);
            expect(isWhitelisted).eq(false);
        })
    })
    describe('addFromRole', () => {
        beforeEach(async () => {
            await myManager.grantRole(WHITELIST_ADMIN_ROLE, owner.address);
        })
        it('can addFromRole', async () => {
            const personClaim = tree.claims[person.address];
            await myWhitelist.addFromRole(
                person.address,
            );
            const isWhitelisted = await myWhitelist.whitelisted(person.address);
            expect(isWhitelisted).eq(true);

            // check adding twice
            await expectRevert(
                myWhitelist.addFromRole(
                    person.address,
                ),
                'TutellusWhitelist: account already whitelisted'
            );
        })
        it('only role can addFromRole', async () => {
            await expectRevert(
                myWhitelist.connect(person).addFromRole(person.address),
                `AccessControlProxyPausable: account ${person.address.toLowerCase()} is missing role ${WHITELIST_ADMIN_ROLE.toLowerCase()}`
            );
        })
    })
    describe('remove', () => {
        beforeEach(async () => {
            await myManager.grantRole(WHITELIST_ADMIN_ROLE, owner.address);
            await myWhitelist.updateMerkleRoot(tree.merkleRoot, URI);
            const personClaim = tree.claims[person.address];
            await myWhitelist.add(
                personClaim.index,
                person.address,
                personClaim.proof,
            );
        })
        it('can remove whitelisted users', async () => {
            const isWhitelisted = await myWhitelist.whitelisted(person.address);
            await myWhitelist.remove(person.address);
            const isWhitelisted2 = await myWhitelist.whitelisted(person.address);
            expect(isWhitelisted).eq(true);
            expect(isWhitelisted2).eq(false);
        })
    })
    describe('active', () => {
        beforeEach(async () => {
            await myManager.grantRole(WHITELIST_ADMIN_ROLE, owner.address);
            await myWhitelist.updateMerkleRoot(tree.merkleRoot, URI);
            const personClaim = tree.claims[person.address];
            await myWhitelist.add(
                personClaim.index,
                person.address,
                personClaim.proof,
            );
        })
        it('can enable and disable whitelist', async () => {
            const [
                isPersonWhitelisted1,
                isPerson2Whitelisted1,
                active1,
            ] = await Promise.all([
                myWhitelist.whitelisted(person.address),
                myWhitelist.whitelisted(person2.address),
                myWhitelist.active(),
            ]);
            await myWhitelist.toggleActive();
            const [
                isPersonWhitelisted2,
                isPerson2Whitelisted2,
                active2,
            ] = await Promise.all([
                myWhitelist.whitelisted(person.address),
                myWhitelist.whitelisted(person2.address),
                myWhitelist.active(),
            ]);
            expect(isPersonWhitelisted1).eq(true);
            expect(isPerson2Whitelisted1).eq(false);
            expect(active1).eq(true);
            expect(isPersonWhitelisted2).eq(true);
            expect(isPerson2Whitelisted2).eq(true);
            expect(active2).eq(false);
        })    
    })
})  
  