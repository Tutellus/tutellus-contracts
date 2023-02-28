const bre = require("hardhat");
const ethers = bre.ethers;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const GRAPH_URL =
    "https://api.thegraph.com/subgraphs/name/tutellus/tutellus";

const ZERO_BN = new ethers.BigNumber.from("0")
const ONE_ETH = ethers.utils.parseEther("1")
// const ACCOUNT = "0x6d2aea076b1e1deb491df73e20546c21f8a3d458";
const ACCOUNT = "0x5acb3043da168b59b775ea28f3942597f45e9543";
const BLOCK = "37520355"

async function main() {
    const position = await getPosition();

    const priceToken = (position.price === null) ? ZERO_BN : new ethers.BigNumber.from(position.price.tokenPriceUSD)
    const priceLp = (position.price === null) ? ZERO_BN : new ethers.BigNumber.from(position.price.lpTokenPriceUSD)
    const balanceToken = (position.holder === null) ? ZERO_BN : new ethers.BigNumber.from(position.holder.balanceTUT)
    const balanceLp = (position.holder === null) ? ZERO_BN : new ethers.BigNumber.from(position.holder.balanceLP)
    const stakedToken = (position.staker === null) ? ZERO_BN : new ethers.BigNumber.from(position.staker.amountTUT)
    const farmedLp = (position.farmer === null) ? ZERO_BN : new ethers.BigNumber.from(position.farmer.amountLP)

    const balanceTokenUsd = balanceToken.mul(priceToken).div(ONE_ETH)
    const balanceLpUsd = balanceLp.mul(priceLp).div(ONE_ETH)
    const stakedTokenUsd = stakedToken.mul(priceToken).div(ONE_ETH)
    const farmedLpUsd = farmedLp.mul(priceLp).div(ONE_ETH)
    const totalUsd = balanceTokenUsd.add(balanceLpUsd).add(stakedTokenUsd).add(farmedLpUsd)

    const result = {
        account: ACCOUNT,
        priceToken: ethers.utils.formatEther(priceToken),
        priceLp: ethers.utils.formatEther(priceLp),
        balanceToken: ethers.utils.formatEther(balanceToken),
        balanceTokenUsd: ethers.utils.formatEther(balanceTokenUsd),
        balanceLp: ethers.utils.formatEther(balanceLp),
        balanceLpUsd: ethers.utils.formatEther(balanceLpUsd),
        stakedToken: ethers.utils.formatEther(stakedToken),
        stakedTokenUsd: ethers.utils.formatEther(stakedTokenUsd),
        farmedLp: ethers.utils.formatEther(farmedLp),
        farmedLpUsd: ethers.utils.formatEther(farmedLpUsd),
        totalUsd: ethers.utils.formatEther(totalUsd)
    }
    console.log(result)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

async function getPosition() {
    let query =
        '{ holder( id: "' + ACCOUNT.toLowerCase() + '" block: {number: ' + BLOCK + '} ) { balanceTUT balanceLP } farmer( id: "' + ACCOUNT.toLowerCase() + '" block: {number: ' + BLOCK + '} ) { amountLP } staker( id: "' + ACCOUNT.toLowerCase() + '" block: {number: ' + BLOCK + '} ) { amountTUT } price( id: "0x0000000000000000000000000000000000000000" block: {number: ' + BLOCK + '} ) { tokenPriceUSD lpTokenPriceUSD } }';
    return await querySubgraph(query);
}

async function querySubgraph(query) {
    let response;
    let responseData;

    try {
        response = await fetch(GRAPH_URL, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: query
            })
        });

        if (response.ok) {
            responseData = await response.json();
            return responseData.data;
        } else {
            return null;
        }
    } catch (error) {
        console.error(error);
    }
}