const { ethers } = require('hardhat');
const {
    ether,
    expectRevert,
    expectEvent,
    time
} = require('@openzeppelin/test-helpers')

let owner1, owner2, user1, user2, did1, did2

describe('DIDStack', function () {
    beforeEach(async () => {
        [owner1, owner2, user1, user2] = await ethers.getSigners()
        const TutellusDIDFactory = await ethers.getContractFactory('TutellusDIDFactory');
        const TutellusDID = await ethers.getContractFactory('TutellusDID');

        const factory = await TutellusDIDFactory.deploy();
        let initiallizeCalldata = TutellusDID.interface.encodeFunctionData('initialize', [user1.address]);
        const response1 = await factory.createProxy(initiallizeCalldata);
        let initiallizeCalldata2 = TutellusDID.interface.encodeFunctionData('initialize', [user2.address]);
        const response2 = await factory.createProxy(initiallizeCalldata2);

        let receipt = await response1.wait();
        let events = receipt.events;
        let event = events.find(log => log.event === 'NewDID');
        did1 = TutellusDID.attach(event.args['proxy']);

        receipt = await response2.wait();
        events = receipt.events;
        event = events.find(log => log.event === 'NewDID');
        did2 = TutellusDID.attach(event.args['proxy']);
    });

    it('Checks version v0.0.1', async () => {
        let version1 = await did1.version();
        let version2 = await did2.version();

        expect(version1).to.equal("v0.0.1");
        expect(version2).to.equal("v0.0.1");
    })
})