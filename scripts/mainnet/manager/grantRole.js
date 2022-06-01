const bre = require('hardhat');
const ethers = bre.ethers;
const { utils } = ethers;
const { id } = utils;

const ROLE = id('CLIENTS_REWARDS_ADMIN_ROLE');
const ADDRESS = '0xd6e8654DF9C756aFfAe4EF54Fc51Ed874744acB8'

async function main () {
  bre.run('compile');
  const Manager = await ethers.getContractFactory('TutellusManager');
  const myManager = Manager.attach('0x73205567d90A45533879eF39a29920056225eFB2');
  const response = await myManager.grantRole(ROLE, ADDRESS)
  await response.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
