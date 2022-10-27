const bre = require('hardhat');
const ethers = bre.ethers;
const { utils } = ethers;
const { id } = utils;

const ROLE = id('AUTH_POAP_SIGNER');
const ADDRESS = '0x44eEdBEE931A5dc22a5f4Ad441679FD5C0e38D38'

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x73205567d90A45533879eF39a29920056225eFB2');
  // const response = await myManager.grantRole(ROLE, ADDRESS)
  // await response.wait()
  const data = myManager.interface.encodeFunctionData('grantRole', [
    ROLE,
    ADDRESS,
  ])
  console.log(data)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
