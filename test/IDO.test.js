const { ethers } = require('hardhat');
const {
    expectRevert
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const IDO_FACTORY_ID = ethers.utils.id('IDO_FACTORY')
const FUNDING_AMOUNT = ethers.utils.formatEther('10000')
const MIN_PREFUND = ethers.utils.formatEther('100')

let owner, funder
let myDeployer, myFactory, myIDO

describe('IDO', function () {
    beforeEach(async () => {
        [owner, funder] = await ethers.getSigners();

        const TutellusManager = await ethers.getContractFactory('TutellusManager')
        const TutellusIDOFactory = await ethers.getContractFactory('TutellusIDOFactory')
        const TutellusIDO = await ethers.getContractFactory('TutellusIDO')

        myDeployer = await TutellusManager.deploy()
        await myDeployer.deployed()

        const initiallizeCalldata = await TutellusIDOFactory.interface.encodeFunctionData('initialize', [])
        const factoryImp = await TutellusIDOFactory.deploy()
        await factoryImp.deployed()
        await myDeployer.deployProxyWithImplementation(IDO_FACTORY_ID, factoryImp.address, initiallizeCalldata)
        const factoryAddress = await myDeployer.get(IDO_FACTORY_ID)
        myFactory = await ethers.getContractAt('TutellusIDOFactory', factoryAddress)
        const idoCalldata = await TutellusIDO.interface.encodeFunctionData('initialize', [myDeployer.address, FUNDING_AMOUNT, MIN_PREFUND]);
        const response = await myFactory.createProxy()
        const receipt = response.wait()
        console.log(receipt.logs)
        myIDO = receipt.logs[0].proxy
    });

    describe('a', function () {

        it('a', async () => {

        });
    });
})
