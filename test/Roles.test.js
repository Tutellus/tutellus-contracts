const { expect } = require('chai');
const { ethers } = require('hardhat');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { constants } = require('ethers');

const ACPP_ID = ethers.utils.id('ACPP');
const ADMIN_ROLE_PROXY_ID = ethers.utils.id('ADMIN_ROLE_PROXY');
const ROLE_PROXY_ID = ethers.utils.id('ROLE_PROXY');
const ACPP_ADMIN_ROLE = ethers.utils.id('ACPP_ADMIN_ROLE');
const MOCK_ROLE = ethers.utils.id('MOCK_ROLE');

let owner, person, myManager, myACPP, myAdminRoleProxy, myRoleProxy;

describe('AdminRoleProxy', function () {
    before(async () => {
        [owner, person] = await ethers.getSigners();
    })
    beforeEach(async () => {
        // Manager deploy
        const Manager = await ethers.getContractFactory('TutellusManager');
        myManager = await Manager.deploy();
        await myManager.deployTransaction.wait();
        await myManager.initialize();
        // ACPP Mock deploy
        const ACPPMock = await ethers.getContractFactory('ACPPMock');
        const initializeACPPMockCalldata = ACPPMock.interface.encodeFunctionData('initialize', []);
        await myManager.deploy(
            ACPP_ID,
            ACPPMock.bytecode,
            initializeACPPMockCalldata,
        );
        // AdminRoleProxy
        const AdminRoleProxy = await ethers.getContractFactory('AdminRoleProxy');
        const initializeAdminRoleProxyCalldata = AdminRoleProxy.interface.encodeFunctionData('initialize', [
            myManager.address,
            ACPP_ADMIN_ROLE,
        ]);
        await myManager.deploy(
            ADMIN_ROLE_PROXY_ID,
            AdminRoleProxy.bytecode,
            initializeAdminRoleProxyCalldata,
        );
        const [acppAddr, adminRoleProxyAddr] = await Promise.all([
            myManager.get(ACPP_ID),
            myManager.get(ADMIN_ROLE_PROXY_ID),
        ]);
        myACPP = ACPPMock.attach(acppAddr);
        myAdminRoleProxy = AdminRoleProxy.attach(adminRoleProxyAddr);
        // update ACPPMock manager
        await myACPP.updateManager(myAdminRoleProxy.address);
    })
    describe('Call functions with DEFAULT_ADMIN_ROLE', () => {
        it('Can call function if acpp admin role', async () => {
            await myManager.grantRole(ACPP_ADMIN_ROLE, owner.address);
            await myACPP.fn();
            const result = await myACPP.result();
            expect(result).eq(true);
        })
        it('Can not call function if acpp admin role', async () => {
            // await myManager.grantRole(ACPP_ADMIN_ROLE, owner.address);
            await expectRevert(
                myACPP.fn(),
                `AccessControlProxyPausable: account ${owner.address.toLowerCase()} is missing role ${constants.HashZero}`
            )
        })
    })
    describe('Call functions with other roles', () => {
        it('Can call function if role granted', async () => {
            await myManager.grantRole(MOCK_ROLE, owner.address);
            await myACPP.fn2();
            const result = await myACPP.result();
            expect(result).eq(true);
        })
        it('Can not call function if role not granted', async () => {
            await expectRevert(
                myACPP.fn2(),
                `AccessControlProxyPausable: account ${owner.address.toLowerCase()} is missing role ${MOCK_ROLE}`
            )
        })
    })
    describe('Update role', () => {
        it('Can update role if admin role and cannot change it after until role granted', async () => {
            const OTHER_ROLE = ethers.utils.id('OTHER_ROLE');
            await myManager.grantRole(ACPP_ADMIN_ROLE, owner.address);
            await myAdminRoleProxy.updateRole(OTHER_ROLE);

            await expectRevert(
                myAdminRoleProxy.updateRole(ACPP_ADMIN_ROLE),
                `AccessControlProxyPausable: account ${owner.address.toLowerCase()} is missing role ${constants.HashZero}`
            )

            await expectRevert(
                myACPP.fn(),
                `AccessControlProxyPausable: account ${owner.address.toLowerCase()} is missing role ${constants.HashZero}`
            )

            await myManager.grantRole(OTHER_ROLE, owner.address);
            await myACPP.fn();
            const result = await myACPP.result();
            expect(result).eq(true);

        })
    })
})

// describe.only('RoleProxy', function () {
//     before(async () => {
//         [owner, person] = await ethers.getSigners();
//     })
//     beforeEach(async () => {
//         // Manager deploy
//         const Manager = await ethers.getContractFactory('TutellusManager');
//         myManager = await Manager.deploy();
//         await myManager.deployTransaction.wait();
//         await myManager.initialize();
//         // ACPP Mock deploy
//         const ACPPMock = await ethers.getContractFactory('ACPPMock');
//         const initializeACPPMockCalldata = ACPPMock.interface.encodeFunctionData('initialize', []);
//         await myManager.deploy(
//             ACPP_ID,
//             ACPPMock.bytecode,
//             initializeACPPMockCalldata,
//         );
//         // AdminRoleProxy
//         const RoleProxy = await ethers.getContractFactory('RoleProxy');
//         const initializeRoleProxyCalldata = RoleProxy.interface.encodeFunctionData('initialize', [
//             myManager.address,
//         ]);
//         await myManager.deploy(
//             ROLE_PROXY_ID,
//             RoleProxy.bytecode,
//             initializeRoleProxyCalldata,
//         );
//         const [acppAddr, RoleProxyAddr] = await Promise.all([
//             myManager.get(ACPP_ID),
//             myManager.get(ROLE_PROXY_ID),
//         ]);
//         myACPP = ACPPMock.attach(acppAddr);
//         myRoleProxy = RoleProxy.attach(RoleProxyAddr);
//         // update ACPPMock manager
//         await myACPP.updateManager(myRoleProxy.address);
//         await myRoleProxy.mapRole(
//             constants.HashZero,
//             ACPP_ADMIN_ROLE,
//         );
//     })
//     describe('Call functions with DEFAULT_ADMIN_ROLE', () => {
//         it('Can call function if acpp admin role', async () => {
//             await myManager.grantRole(ACPP_ADMIN_ROLE, owner.address);
//             await myACPP.fn();
//             const result = await myACPP.result();
//             expect(result).eq(true);
//         })
//         it('Can not call function if acpp admin role', async () => {
//             // await myManager.grantRole(ACPP_ADMIN_ROLE, owner.address);
//             await expectRevert(
//                 myACPP.fn(),
//                 `AccessControlProxyPausable: account ${owner.address.toLowerCase()} is missing role ${constants.HashZero}`
//             )
//         })
//     })
//     describe('Call functions with other roles', () => {
//         it('Can call function if role granted', async () => {
//             await myManager.grantRole(MOCK_ROLE, owner.address);
//             await myACPP.fn2();
//             const result = await myACPP.result();
//             expect(result).eq(true);
//         })
//         it('Can not call function if role not granted', async () => {
//             await expectRevert(
//                 myACPP.fn2(),
//                 `AccessControlProxyPausable: account ${owner.address.toLowerCase()} is missing role ${MOCK_ROLE}`
//             )
//         })
//     })
//     describe('Update role', () => {
//         it('Can update role if admin role and cannot change it after until role granted', async () => {
//             const OTHER_ROLE = ethers.utils.id('OTHER_ROLE');
//             await myManager.grantRole(ACPP_ADMIN_ROLE, owner.address);
//             await myRoleProxy.mapRole(constants.HashZero, OTHER_ROLE);

//             await expectRevert(
//                 myRoleProxy.mapRole(constants.HashZero, ACPP_ADMIN_ROLE),
//                 `AccessControlProxyPausable: account ${owner.address.toLowerCase()} is missing role ${constants.HashZero}`
//             )

//             await expectRevert(
//                 myACPP.fn(),
//                 `AccessControlProxyPausable: account ${owner.address.toLowerCase()} is missing role ${constants.HashZero}`
//             )

//             await myManager.grantRole(OTHER_ROLE, owner.address);
//             await myACPP.fn();
//             const result = await myACPP.result();
//             expect(result).eq(true);

//         })
//     })
// })