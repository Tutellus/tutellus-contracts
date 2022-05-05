const { ethers } = require('hardhat')

const CLIENTS_VAULT_ID = ethers.utils.id('CLIENTS_VAULT')

let owner, person, person2, myClientsVault, myManager

describe.only('ClientsVaultV2', function () {
    before(async () => {
        [owner, person, person2] = await ethers.getSigners();
    })
    beforeEach(async () => {
        const Manager = await ethers.getContractFactory('TutellusManager');
        myManager = await Manager.deploy();
        await myManager.deployTransaction.wait();
        await myManager.initialize();

        const ClientsVaultV2 = await ethers.getContractFactory('TutellusClientsVaultV2');
        const initializeCalldata = ClientsVaultV2.interface.encodeFunctionData('initialize', []);
        await myManager.deploy(
            CLIENTS_VAULT_ID,
            ClientsVaultV2.bytecode,
            initializeCalldata,
        );
        const clientsVaultAddr = await myManager.get(CLIENTS_VAULT_ID);
        myClientsVault = ClientsVaultV2.attach(clientsVaultAddr);
    })

    describe('update', () => {
        it('can update merkleroot', async () => {

        })
    })
})
  