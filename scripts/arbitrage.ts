import { ethers } from "ethers"
import { Protocols, Routers, dodoV2Pool, factories } from "../constants"
import { ERC20Token } from "../constants/tokens"
import { getPriceInUSDC } from "../utils/getPriceInUSDC"
import flashloan from "../artifacts/contracts/FlashLoan.sol/Flashloan.json"
import { FlashLoanParams } from "../types"
import { findRouterByProtocol } from "../utils/findRouterByProtocol"
import { executeFlashloan } from "./executeFlashloan"

require('dotenv').config();

const MIN_PRICE_DIFF = 10000000; //$10

async function main() {
    // WETH / USDC POOLS
    const checkArbitrage = async () => {

        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

        const sushiQuote = await getPriceInUSDC({
            router: Routers.POLYGON_SUSHISWAP,
            factory: factories.POLYGON_SUSHISWAP,
            tokenAddress: ERC20Token.WETH?.address,
            id: Protocols.SUSHISWAP,
            provider
        })

        const quickQuote = await getPriceInUSDC({
            router: Routers.POLYGON_QUICKSWAP,
            factory: factories.POLYGON_QUICKSWAP,
            tokenAddress: ERC20Token.WETH?.address,
            id: Protocols.QUICKSWAP,
            provider
        })
        // apeswap may not be a recommended option due to it's low liquidity
        const apeQuote = await getPriceInUSDC({
            router: Routers.POLYGON_APESWAP,
            factory: factories.POLYGON_APESWAP,
            tokenAddress: ERC20Token.WETH?.address,
            id: Protocols.APESWAP,
            provider
        })

        const quotes = [sushiQuote, quickQuote, apeQuote]; //factors in these quotes for price difference.

        const min = quotes.reduce((min, obj) => (obj.quote < min.quote) ? obj : min);
        const max = quotes.reduce((max, obj) => (obj.quote > max.quote) ? obj : max);

        const biggestPriceDiff = max.quote - min.quote;

        console.log("Biggest price difference $", ethers.formatUnits(biggestPriceDiff, 6));

        console.log(`Total Liquidity in SUSHISWAP pool is $${ethers.formatUnits(sushiQuote.reserves[0], 6)}`);
        console.log(`Total Liquidity in QUICKSWAP pool is $${ethers.formatUnits(quickQuote.reserves[0], 6)}`);
        console.log(`Total Liquidity in APESWAP pool is $${ethers.formatUnits(apeQuote.reserves[0], 6)}`);

        // SUSHI SWAP FEE = 0.3%
        // QUICK SWAP FEE = 0.3%
        // APE SWAP FEE = 0.3%

        // 0.3% of 0.5 WETH = 0.0015 WETH
        // 0.0015 WETH = $0.0015 * $2000 = $3

       // Price difference must be greater than $6 to be profitable 

        if(biggestPriceDiff >= MIN_PRICE_DIFF){
            // execute arbitrage flashloan
            const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
            const Flashloan = new ethers.Contract(process.env.FLASHLOAN_ADDRESS!, flashloan.abi, provider);

            const params: FlashLoanParams = {
                flashLoanContractAddress: Flashloan.target.toString(),
                flashLoanPool: dodoV2Pool.WETH_ULT,
                loanAmount: ethers.parseEther("0.0005"),
                loanAmountDecimals: 18,
                hops: [
                    {
                        protocol: max.protocol,
                        data: ethers.AbiCoder.defaultAbiCoder().encode(
                            ["address"],
                            [findRouterByProtocol(max.protocol)]
                        ),
                        path: [ERC20Token.WETH?.address, ERC20Token.USDC?.address]
                    },
                    {
                        protocol: min.protocol,
                        data: ethers.AbiCoder.defaultAbiCoder().encode(
                            ["address"],
                            [findRouterByProtocol(min.protocol)]
                        ),
                        path: [ERC20Token.USDC?.address, ERC20Token.WETH?.address]
                    }
                ],
                gasLimit: 3_000_000,
                gasPrice: ethers.parseUnits("300", "gwei"),
                signer: wallet
            }

            executeFlashloan(params);
        }
    }

    try {
        setInterval(checkArbitrage, 5000);
    } catch (error) {
    console.log(error);
    }

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

