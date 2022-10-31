const bre = require('hardhat');
const ethers = bre.ethers;
const { utils } = ethers;
const { id } = utils;

const ROLE = "0x5a422ad2976e7798e7b69a1e99e3c9f846792ccccfe43a967d0b86f044b27e9e" // id('AUTH_POAP_SIGNER');
const ADDRESS = '0x65b084c289b846b03cf686e7e314e12a690b314b'

async function main () {
  await bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x73205567d90A45533879eF39a29920056225eFB2');
  const data = myManager.interface.encodeFunctionData('grantRole', [
    ROLE,
    ADDRESS,
  ])
  console.log('Granting role data:', data)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
