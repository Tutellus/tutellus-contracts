const { expectRevert } = require('@openzeppelin/test-helpers');
const { constants } = require('ethers');
const { parseEther } = require('ethers/lib/utils')
const { ethers } = require('hardhat');
const { getBalanceTree } = require('../../utils/balanceTree');

const ERC20_ID = ethers.utils.id('ERC20');
const CLIENTS_VAULT_ID = ethers.utils.id('CLIENTS_VAULT')
const CLIENTS_REWARDS_ADMIN_ROLE = ethers.utils.id('CLIENTS_REWARDS_ADMIN_ROLE');
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE');

const CAP = parseEther('200000000');
const OWNER_AMOUNT = parseEther('10');
const PERSON_AMOUNT = parseEther('20');
const PERSON2_AMOUNT = parseEther('30');
const TOTAL_AMOUNT = OWNER_AMOUNT.add(PERSON_AMOUNT).add(PERSON2_AMOUNT);

let owner, person, person2, json, tree, myClientsVault, myManager, myToken,
ownerClaim, personClaim, person2Claim;

describe('ClientsVaultV2', function () {
    before(async () => {
        [owner, person, person2] = await ethers.getSigners();
        json = {};
        json[owner.address] = OWNER_AMOUNT.toString();
        json[person.address] = PERSON_AMOUNT.toString();
        json[person2.address] = PERSON2_AMOUNT.toString();
        tree = getBalanceTree(json).toJSON();
        ownerClaim = tree.claims[owner.address];
        personClaim = tree.claims[person.address];
        person2Claim = tree.claims[person2.address];
    })
    beforeEach(async () => {
        // Manager deploy
        const Manager = await ethers.getContractFactory('TutellusManager');
        myManager = await Manager.deploy();
        await myManager.deployTransaction.wait();
        await myManager.initialize();

        // Clients deploy
        const ClientsVaultV2 = await ethers.getContractFactory('TutellusClientsVaultV2');
        const initializeCalldata = ClientsVaultV2.interface.encodeFunctionData('initialize', []);
        await myManager.deploy(
            CLIENTS_VAULT_ID,
            ClientsVaultV2.bytecode,
            initializeCalldata,
        );
        const clientsVaultAddr = await myManager.get(CLIENTS_VAULT_ID);
        myClientsVault = ClientsVaultV2.attach(clientsVaultAddr);

        // Token deploy
        const Token = await ethers.getContractFactory('TutellusERC20');
        myToken = await Token.deploy(
            'Tutellus token',
            'TUT',
            parseEther('200000000'),
            myManager.address,
        );
        await myManager.setId(ERC20_ID, myToken.address);
        await myManager.grantRole(MINTER_ROLE, owner.address)
        await myToken.mint(myClientsVault.address, TOTAL_AMOUNT);
    })

    describe('update', () => {
        it('can update merkleroot if rewards admin role', async () => {
            await myManager.grantRole(CLIENTS_REWARDS_ADMIN_ROLE, owner.address);
            await myClientsVault.updateMerkleRoot(tree.merkleRoot, 'uri');
            const [
                ownerLeft,
                personLeft,
                person2Left,
            ] = await Promise.all([
                myClientsVault.leftToClaim(
                    ownerClaim.index,
                    owner.address,
                    ownerClaim.amount,
                    ownerClaim.proof,
                ),
                myClientsVault.leftToClaim(
                    personClaim.index,
                    person.address,
                    personClaim.amount,
                    personClaim.proof,
                ),
                myClientsVault.leftToClaim(
                    person2Claim.index,
                    person2.address,
                    person2Claim.amount,
                    person2Claim.proof,
                ),
            ]);
            expect(ownerLeft.eq(OWNER_AMOUNT)).eq(true);
            expect(personLeft.eq(PERSON_AMOUNT)).eq(true);
            expect(person2Left.eq(PERSON2_AMOUNT)).eq(true);
        })
        it('can not update merkleroot if not rewards admin role', async () => {
            await expectRevert(
                myClientsVault.updateMerkleRoot(tree.merkleRoot, 'uri'),
                `AccessControlProxyPausable: account ${owner.address.toLowerCase()} is missing role ${CLIENTS_REWARDS_ADMIN_ROLE.toLowerCase()}`
            );
        })
    })
    describe('claim', () => {
        let ownerLeft1, personLeft1, person2Left1;
        beforeEach(async () => {
            await myManager.grantRole(CLIENTS_REWARDS_ADMIN_ROLE, owner.address);
            await myClientsVault.updateMerkleRoot(tree.merkleRoot, 'uri');
            [   ownerLeft1,
                personLeft1,
                person2Left1,
            ] = await Promise.all([
                myClientsVault.leftToClaim(
                    ownerClaim.index,
                    owner.address,
                    ownerClaim.amount,
                    ownerClaim.proof,
                ),
                myClientsVault.leftToClaim(
                    personClaim.index,
                    person.address,
                    personClaim.amount,
                    personClaim.proof,
                ),
                myClientsVault.leftToClaim(
                    person2Claim.index,
                    person2.address,
                    person2Claim.amount,
                    person2Claim.proof,
                ),
            ]);
        })
        it('can claim correct amounts', async () => {

            await myClientsVault.claim(
                ownerClaim.index,
                owner.address,
                ownerClaim.amount,
                ownerClaim.proof,
            );

            await myClientsVault.claim(
                personClaim.index,
                person.address,
                personClaim.amount,
                personClaim.proof,
            );

            await myClientsVault.claim(
                person2Claim.index,
                person2.address,
                person2Claim.amount,
                person2Claim.proof,
            );

            const [
                ownerLeft2,
                personLeft2,
                person2Left2,
                ownerBalance,
                personBalance,
                person2Balance,
            ] = await Promise.all([
                myClientsVault.leftToClaim(
                    ownerClaim.index,
                    owner.address,
                    ownerClaim.amount,
                    ownerClaim.proof,
                ),
                myClientsVault.leftToClaim(
                    personClaim.index,
                    person.address,
                    personClaim.amount,
                    personClaim.proof,
                ),
                myClientsVault.leftToClaim(
                    person2Claim.index,
                    person2.address,
                    person2Claim.amount,
                    person2Claim.proof,
                ),
                myToken.balanceOf(owner.address),
                myToken.balanceOf(person.address),
                myToken.balanceOf(person2.address),
            ]);

            expect(ownerLeft1.eq(OWNER_AMOUNT)).eq(true);
            expect(personLeft1.eq(PERSON_AMOUNT)).eq(true);
            expect(person2Left1.eq(PERSON2_AMOUNT)).eq(true);
            expect(ownerLeft1.eq(ownerBalance)).eq(true);
            expect(personLeft1.eq(personBalance)).eq(true);
            expect(person2Left1.eq(person2Balance)).eq(true);
            expect(ownerLeft2.eq(constants.Zero)).eq(true);
            expect(personLeft2.eq(constants.Zero)).eq(true);
            expect(person2Left2.eq(constants.Zero)).eq(true);
        })
        it('can claim and not reclaim correct amounts', async () => {

            await myClientsVault.claim(
                ownerClaim.index,
                owner.address,
                ownerClaim.amount,
                ownerClaim.proof,
            );

            await expectRevert(
                myClientsVault.claim(
                    ownerClaim.index,
                    owner.address,
                    ownerClaim.amount,
                    ownerClaim.proof,
                ),
                'TutellusClientsVault: Nothing to claim.'
            );
        })
        it('can claim and reclaim after merkleroot update', async () => {

            await myClientsVault.claim(
                ownerClaim.index,
                owner.address,
                ownerClaim.amount,
                ownerClaim.proof,
            );

            const newJson = json;
            newJson[owner.address] = OWNER_AMOUNT.add(PERSON_AMOUNT).toString();
            const newTree = getBalanceTree(newJson).toJSON();
            const newOwnerClaim = newTree.claims[owner.address];

            // check invalid proof
            await expectRevert(
                myClientsVault.claim(
                    newOwnerClaim.index,
                    owner.address,
                    newOwnerClaim.amount,
                    newOwnerClaim.proof,
                ),
                'TutellusClientsVault: Invalid proof.',
            );

            // update
            await myClientsVault.updateMerkleRoot(newTree.merkleRoot, 'uri');
            
            const [ ownerLeft2, balance2 ] = await Promise.all([
                myClientsVault.leftToClaim(
                    newOwnerClaim.index,
                    owner.address,
                    newOwnerClaim.amount,
                    newOwnerClaim.proof,
                ),
                myToken.balanceOf(owner.address),
            ]);

            await myClientsVault.claim(
                newOwnerClaim.index,
                owner.address,
                newOwnerClaim.amount,
                newOwnerClaim.proof,
            );
            
            const [ ownerLeft3, balance3 ] = await Promise.all([
                myClientsVault.leftToClaim(
                    newOwnerClaim.index,
                    owner.address,
                    newOwnerClaim.amount,
                    newOwnerClaim.proof,
                ),
                myToken.balanceOf(owner.address),
            ]);

            expect(ownerLeft2.eq(PERSON_AMOUNT)).eq(true);
            expect(balance2.eq(OWNER_AMOUNT)).eq(true);
            expect(ownerLeft3.eq(constants.Zero)).eq(true);
            expect(balance3.eq(OWNER_AMOUNT.add(PERSON_AMOUNT))).eq(true);

        })
    })
})
  