const bre = require('hardhat')
const { utils, constants } = require('ethers')
const { default: gql } = require('graphql-tag')
const { GraphQLClient } = require('graphql-request')

const ENDPOINT = 'https://af08-88-18-39-227.eu.ngrok.io/graphql'
const POAP_ID = '1a94e97b-dfe1-44de-9c9c-3c2623895b00'
const CODE = '123456'

const gqlClient = () => {
  const client = new GraphQLClient(ENDPOINT, {
    credentials: 'same-origin',
  });
  return client;
};

const fetcher = async (query, variables = null) => {
  try {
    const response = await gqlClient().request(query, variables);
    return response;
  } catch (error) {
    console.error('< fetcher - ERROR', error);
  }
};

const query = gql`
  query GetPoapSignature($input: GetPoapSignatureInput!) {
    getPoapSignature(input: $input) {
      __typename
      ...on PoapSignature {
        signature
        signer
        limit
      }
      ...on Error {
        message
      }
    }
  }
`

const getPoapSignature = async (poapId, code, address) => {
  const input = {
    poapId,
    code,
    address,
  }
  const { getPoapSignature } = await fetcher(query, {
    input
  })
  return getPoapSignature
};

async function main () {
  bre.run('compile')
  const myPOAP = await bre.ethers.getContractAt('TutellusPOAP', '0x741D2E86B07AE985fCA680017D996b59fF6EeC83')
  const { address } = await bre.ethers.getSigner()
  const { signature, signer, limit } = await getPoapSignature(POAP_ID, CODE, address)

  console.log('signature', signature)
  console.log('signer', signer)
  console.log('limit', limit)

  const tx = await myPOAP.mint(
    utils.id(POAP_ID),
    utils.id(CODE),
    limit,
    signature,
    signer,
  );
  await tx.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
